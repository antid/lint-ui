import { chromium, type Browser } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import type { Config, ScreenshotResult, TestResult, RunResults, Route } from './types.js';
import { VisualDiffer } from './differ.js';

export class Runner {
  private browser: Browser | null = null;
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  async recordBaselines(): Promise<void> {
    await this.ensureBrowser();
    
    const baselineDir = path.resolve(this.config.baselineDir);
    if (!fs.existsSync(baselineDir)) {
      fs.mkdirSync(baselineDir, { recursive: true });
    }

    for (const route of this.config.routes) {
      for (const breakpoint of this.config.breakpoints) {
        const screenshot = await this.captureScreenshot(route, breakpoint);
        
        const filename = this.getScreenshotFilename(route.path, breakpoint.name);
        const targetPath = path.join(baselineDir, filename);
        
        fs.copyFileSync(screenshot.path, targetPath);
        
        console.log(`✓ ${route.path} @ ${breakpoint.name}`);
      }
    }

    await this.closeBrowser();
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

    for (const route of this.config.routes) {
      for (const breakpoint of this.config.breakpoints) {
        const screenshot = await this.captureScreenshot(route, breakpoint);
        
        const filename = this.getScreenshotFilename(route.path, breakpoint.name);
        const currentPath = path.join(currentDir, filename);
        const baselinePath = path.join(this.config.baselineDir, filename);
        
        fs.copyFileSync(screenshot.path, currentPath);

        const result: TestResult = {
          route: route.path,
          breakpoint: breakpoint.name,
          passed: true,
          layoutIssues: [],
          accessibilityViolations: [],
        };

        // Visual diff
        if (fs.existsSync(baselinePath)) {
          const differ = new VisualDiffer();
          const diffResult = await differ.compare(baselinePath, currentPath);
          
          if (diffResult.diffPercentage > 0.1) { // 10% threshold
            result.passed = false;
            result.visualDiff = {
              diffPixels: diffResult.diffPixels,
              diffPercentage: diffResult.diffPercentage,
              diffImagePath: path.join(diffDir, filename),
            };

            if (diffResult.diffImage) {
              fs.writeFileSync(result.visualDiff.diffImagePath, diffResult.diffImage);
            }
          }
        }

        results.push(result);
        
        const status = result.passed ? '✓' : '✗';
        console.log(`${status} ${route.path} @ ${breakpoint.name}`);
      }
    }

    await this.closeBrowser();

    const failed = results.filter(r => !r.passed).length;

    return {
      timestamp: Date.now(),
      hasFailures: failed > 0,
      results,
      summary: {
        total: results.length,
        passed: results.length - failed,
        failed,
      },
    };
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

      const filename = this.getScreenshotFilename(route.path, breakpoint.name);
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

  private getScreenshotFilename(routePath: string, breakpointName: string): string {
    const sanitized = routePath.replace(/\//g, '_').replace(/^_/, '') || 'index';
    return `${sanitized}-${breakpointName}.png`;
  }

  private async ensureBrowser(): Promise<void> {
    if (!this.browser) {
      this.browser = await chromium.launch({ headless: true });
    }
  }

  private async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
