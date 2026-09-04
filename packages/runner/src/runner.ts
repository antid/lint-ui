import { chromium, type Browser } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'node:crypto';
import type { Config, ScreenshotResult, TestResult, RunResults, Route } from './types.js';
import { VisualDiffer } from './differ.js';
import { AccessibilityValidator, LayoutValidator } from '@lint-ui/rules';

// Total capture attempts per route/viewport case: one try plus one retry.
// Deliberately not configurable: retries exist only to absorb known transient
// slowness (navigation/readiness timeouts), never to mask real failures.
const MAX_CAPTURE_ATTEMPTS = 2;

function isTransientCaptureError(error: unknown): boolean {
  // Playwright marks navigation, selector, and function timeouts with this
  // name. Anything else (connection refused, invalid selector, crashed
  // browser) is deterministic or needs a live browser, so it fails fast.
  return error instanceof Error && error.name === 'TimeoutError';
}

export class Runner {
  private browser: Browser | null = null;
  private config: Config;
  private launchBrowser: () => Promise<Browser>;
  private createDiffer: () => VisualDiffer;
  private layoutValidator = new LayoutValidator();
  private accessibilityValidator = new AccessibilityValidator();

  constructor(
    config: Config,
    dependencies: {
      launchBrowser?: () => Promise<Browser>;
      createDiffer?: () => VisualDiffer;
    } = {},
  ) {
    this.config = config;
    this.launchBrowser = dependencies.launchBrowser ?? (() => chromium.launch({ headless: true }));
    this.createDiffer = dependencies.createDiffer ?? (() => new VisualDiffer());
  }

  async recordBaselines(): Promise<void> {
    await this.ensureBrowser();

    try {
      fs.mkdirSync(this.config.baselineDir, { recursive: true });

      for (const route of this.config.routes) {
        for (const breakpoint of this.config.breakpoints) {
          const screenshot = await this.captureWithRetry(route, breakpoint);
          const filename = screenshotFilename(route.path, breakpoint.name);
          fs.copyFileSync(screenshot.path, path.join(this.config.baselineDir, filename));
          console.log(`✓ ${route.path} @ ${breakpoint.name}`);
        }
      }
    } finally {
      await this.closeBrowser();
    }
  }

  async runChecks(): Promise<RunResults> {
    await this.ensureBrowser();

    const currentDir = path.join(this.config.outputDir, 'current');
    const diffDir = path.join(this.config.outputDir, 'diff');

    // Ensure directories exist
    [currentDir, diffDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    const results: TestResult[] = [];

    try {
      for (const route of this.config.routes) {
        for (const breakpoint of this.config.breakpoints) {
          const filename = screenshotFilename(route.path, breakpoint.name);
          const currentPath = path.join(currentDir, filename);
          const baselinePath = path.join(this.config.baselineDir, filename);

          try {
            const screenshot = await this.captureWithRetry(route, breakpoint);
            fs.copyFileSync(screenshot.path, currentPath);

            const excludedRules = new Set(this.config.accessibility.excludeRules);
            const accessibilityViolations = screenshot.accessibilityViolations.filter(
              violation => !excludedRules.has(violation.id),
            );
            const suppressedRules = [
              ...new Set(
                screenshot.accessibilityViolations
                  .filter(violation => excludedRules.has(violation.id))
                  .map(violation => violation.id),
              ),
            ];

            const result: TestResult = {
              route: route.path,
              breakpoint: breakpoint.name,
              status: 'passed',
              passed: true,
              layoutIssues: screenshot.layoutIssues,
              accessibilityViolations,
            };

            if (
              this.config.accessibility.enabled &&
              (suppressedRules.length > 0 ||
                this.config.accessibility.excludeSelectors.length > 0)
            ) {
              result.exclusionsApplied = {
                rules: suppressedRules,
                selectors: [...this.config.accessibility.excludeSelectors],
              };
            }

            if (!fs.existsSync(baselinePath)) {
              result.status = 'missing-baseline';
              result.passed = false;
            } else {
              const differ = this.createDiffer();
              const diffResult = await differ.compare(
                baselinePath,
                currentPath,
                this.config.thresholds.pixelThreshold,
              );

              if (
                !diffResult.dimensionsMatch ||
                diffResult.diffPercentage > this.config.thresholds.maxDiffPercentage
              ) {
                result.status = 'failed';
                result.passed = false;
                result.visualDiff = {
                  diffPixels: diffResult.diffPixels,
                  diffPercentage: diffResult.diffPercentage,
                  diffImagePath: path.join(diffDir, filename),
                  reason: diffResult.reason,
                };

                if (diffResult.diffImage) {
                  fs.writeFileSync(result.visualDiff.diffImagePath, diffResult.diffImage);
                }
              }
            }

            // Layout errors fail the case even when visual comparison passes or
            // could not run; warnings are reported without failing.
            const layoutErrors = (result.layoutIssues ?? []).filter(
              issue => issue.severity === 'error',
            );
            if (layoutErrors.length > 0) {
              result.status = 'failed';
              result.passed = false;
            }

            // Accessibility failures follow the configured impact policy.
            const failingViolations = (result.accessibilityViolations ?? []).filter(
              violation => this.config.accessibility.failImpacts.includes(violation.impact),
            );
            if (this.config.accessibility.enabled && failingViolations.length > 0) {
              result.status = 'failed';
              result.passed = false;
            }

            results.push(result);
          } catch (error) {
            results.push({
              route: route.path,
              breakpoint: breakpoint.name,
              status: 'error',
              passed: false,
              errorMessage: error instanceof Error ? error.message : String(error),
              layoutIssues: [],
              accessibilityViolations: [],
            });
          }

          const result = results[results.length - 1];
          console.log(`${result.passed ? '✓' : '✗'} ${route.path} @ ${breakpoint.name}`);
        }
      }
    } finally {
      await this.closeBrowser();
    }

    const failed = results.filter(r => !r.passed).length;

    const runResults: RunResults = {
      timestamp: Date.now(),
      hasFailures: failed > 0,
      results,
      summary: {
        total: results.length,
        passed: results.length - failed,
        failed,
      },
    };

    fs.mkdirSync(this.config.outputDir, { recursive: true });
    fs.writeFileSync(
      path.join(this.config.outputDir, 'report.json'),
      JSON.stringify(runResults, null, 2),
    );

    return runResults;
  }

  private async captureWithRetry(
    route: Route,
    breakpoint: { name: string; width: number; height?: number }
  ): Promise<ScreenshotResult> {
    for (let attempt = 1; ; attempt += 1) {
      try {
        return await this.captureScreenshot(route, breakpoint);
      } catch (error) {
        if (!isTransientCaptureError(error) || attempt >= MAX_CAPTURE_ATTEMPTS) {
          throw error;
        }
      }
    }
  }

  private async captureScreenshot(
    route: Route,
    breakpoint: { name: string; width: number; height?: number }
  ): Promise<ScreenshotResult> {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const page = await this.browser.newPage({
      viewport: {
        width: breakpoint.width,
        height: breakpoint.height || 900,
      },
    });

    try {
      // Disable animations if configured
      if (this.config.disableAnimations) {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.addInitScript({
          content: `(() => {
            const style = document.createElement('style');
            style.dataset.lintUi = 'disable-motion';
            style.textContent = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}';
            const install = () => document.documentElement?.appendChild(style);
            install();
            if (!style.isConnected) document.addEventListener('DOMContentLoaded', install, { once: true });
          })();`,
        });
      }

      const url = `${this.config.baseUrl}${route.path}`;
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: this.config.capture.navigationTimeoutMs,
      });

      // Wait for ready signal if configured
      if (this.config.readySelector) {
        await page.waitForSelector(this.config.readySelector, {
          timeout: this.config.capture.readinessTimeoutMs,
        });
      }

      // Wait for fonts to load
      await page.evaluate(() => document.fonts.ready);

      await page.waitForFunction(
        () => Array.from(document.images).every(image => image.complete),
        undefined,
        { timeout: this.config.capture.imageTimeoutMs },
      );

      // Additional wait for route-specific selector
      if (route.waitFor) {
        if (route.waitFor === 'networkidle') {
          // Already waited for networkidle
        } else {
          await page.waitForSelector(route.waitFor, {
            timeout: this.config.capture.readinessTimeoutMs,
          });
        }
      }

      // Layout validation shares this page session so findings describe the
      // exact state that was screenshotted.
      const layoutIssues = await this.layoutValidator.checkAll(page);

      // Accessibility validation shares this page session too. Selector
      // exclusions are applied inside axe; rule exclusions are applied by
      // the caller so they can be recorded as evidence.
      const accessibilityViolations = this.config.accessibility.enabled
        ? await this.accessibilityValidator.runAxe(page, {
            excludeSelectors: this.config.accessibility.excludeSelectors,
          })
        : [];

      const filename = screenshotFilename(route.path, breakpoint.name);
      const screenshotPath = path.join(this.config.outputDir, 'temp', filename);
      
      if (!fs.existsSync(path.dirname(screenshotPath))) {
        fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
      }

      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
        animations: 'disabled',
        mask: this.config.capture.maskSelectors.map(selector => page.locator(selector)),
      });

      return {
        route: route.path,
        breakpoint: breakpoint.name,
        path: screenshotPath,
        timestamp: Date.now(),
        layoutIssues,
        accessibilityViolations,
      };
    } finally {
      await page.close();
    }
  }

  private async ensureBrowser(): Promise<void> {
    if (!this.browser) {
      this.browser = await this.launchBrowser();
    }
  }

  private async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

export function screenshotFilename(routePath: string, breakpointName: string): string {
  const sanitize = (value: string, fallback: string) =>
    value
      .normalize('NFKD')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || fallback;

  const route = sanitize(routePath, 'index');
  const breakpoint = sanitize(breakpointName, 'viewport');
  const identity = createHash('sha256')
    .update(`${routePath}\0${breakpointName}`)
    .digest('hex')
    .slice(0, 8);
  return `${route}--${breakpoint}--${identity}.png`;
}
