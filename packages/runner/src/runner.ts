import { chromium, type Browser } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'node:crypto';
import type { Config, ScreenshotResult, TestResult, RunResults, Route } from './types.js';
import { VisualDiffer } from './differ.js';

export class Runner {
  private browser: Browser | null = null;
  private config: Config;
  private launchBrowser: () => Promise<Browser>;
  private createDiffer: () => VisualDiffer;

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
          const screenshot = await this.captureScreenshot(route, breakpoint);
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
            const screenshot = await this.captureScreenshot(route, breakpoint);
            fs.copyFileSync(screenshot.path, currentPath);

            const result: TestResult = {
              route: route.path,
              breakpoint: breakpoint.name,
              status: 'passed',
              passed: true,
              layoutIssues: [],
              accessibilityViolations: [],
            };

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
        await page.addStyleTag({
          content: `
            *, *::before, *::after {
              animation-duration: 0s !important;
              animation-delay: 0s !important;
              transition-duration: 0s !important;
              transition-delay: 0s !important;
            }
          `,
        });
      }

      const url = `${this.config.baseUrl}${route.path}`;
      await page.goto(url, { waitUntil: 'networkidle' });

      // Wait for ready signal if configured
      if (this.config.readySelector) {
        await page.waitForSelector(this.config.readySelector, { timeout: 10000 });
      }

      // Wait for fonts to load
      await page.evaluate(() => document.fonts.ready);

      // Additional wait for route-specific selector
      if (route.waitFor) {
        if (route.waitFor === 'networkidle') {
          // Already waited for networkidle
        } else {
          await page.waitForSelector(route.waitFor, { timeout: 10000 });
        }
      }

      const filename = screenshotFilename(route.path, breakpoint.name);
      const screenshotPath = path.join(this.config.outputDir, 'temp', filename);
      
      if (!fs.existsSync(path.dirname(screenshotPath))) {
        fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
      }

      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
      });

      return {
        route: route.path,
        breakpoint: breakpoint.name,
        path: screenshotPath,
        timestamp: Date.now(),
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
