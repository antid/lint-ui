import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import type { Browser, Page } from 'playwright';
import { describe, expect, it, vi } from 'vitest';
import { LayoutValidator, AccessibilityValidator, type LayoutIssue, type AccessibilityViolation } from '@lint-ui/rules';
import type { Config } from './types.js';
import { Runner, screenshotFilename } from './runner.js';

function imageBuffer(rgba: number[] = [0, 0, 0, 255], width = 1, height = 1): Buffer {
  const image = new PNG({ width, height });
  for (let offset = 0; offset < image.data.length; offset += 4) {
    image.data.set(rgba, offset);
  }
  return PNG.sync.write(image);
}

function imageWithPixel(
  width: number,
  height: number,
  x: number,
  y: number,
  rgba: number[],
): Buffer {
  const image = new PNG({ width, height });
  for (let py = 0; py < height; py += 1) {
    for (let px = 0; px < width; px += 1) {
      image.data.set(px === x && py === y ? rgba : [0, 0, 0, 255], (py * width + px) * 4);
    }
  }
  return PNG.sync.write(image);
}

function timeoutError(message: string): Error {
  const error = new Error(message);
  error.name = 'TimeoutError';
  return error;
}

function testRunner(
  directory: string,
  options: {
    navigationError?: Error;
    transientNavigationErrorOnce?: Error;
    screenshotImage?: Buffer;
  } = {},
) {
  const closePage = vi.fn();
  const closeBrowser = vi.fn();
  const goto = vi.fn(async () => {});
  if (options.navigationError) {
    goto.mockRejectedValue(options.navigationError);
  } else if (options.transientNavigationErrorOnce) {
    goto.mockRejectedValueOnce(options.transientNavigationErrorOnce);
  }
  const page = {
    addStyleTag: vi.fn(),
    addInitScript: vi.fn(),
    emulateMedia: vi.fn(),
    goto,
    evaluate: vi.fn(),
    waitForSelector: vi.fn(),
    waitForFunction: vi.fn(),
    locator: vi.fn(selector => ({ selector })),
    screenshot: vi.fn(({ path }: { path: string }) =>
      writeFileSync(path, options.screenshotImage ?? imageBuffer()),
    ),
    close: closePage,
  } as unknown as Page;
  const browser = {
    newPage: vi.fn(async () => page),
    close: closeBrowser,
  } as unknown as Browser;
  const config: Config = {
    baseUrl: 'http://localhost:4173',
    routes: [{ path: '/' }],
    breakpoints: [{ name: 'mobile', width: 375, height: 812 }],
    thresholds: { pixelThreshold: 0.1, maxDiffPercentage: 0.1 },
    capture: {
      navigationTimeoutMs: 30000,
      readinessTimeoutMs: 10000,
      imageTimeoutMs: 10000,
      maskSelectors: [],
    },
    accessibility: {
      enabled: false,
      failImpacts: ['critical', 'serious'],
      excludeRules: [],
      excludeSelectors: [],
    },
    disableAnimations: false,
    outputDir: join(directory, 'output'),
    baselineDir: join(directory, 'baseline'),
  };

  return {
    runner: new Runner(config, { launchBrowser: async () => browser }),
    config,
    closePage,
    closeBrowser,
    page,
  };
}

describe('screenshotFilename', () => {
  it('produces a safe deterministic filename', () => {
    expect(screenshotFilename('/Account Settings', 'Mobile / Small')).toMatch(
      /^account-settings--mobile-small--[a-f0-9]{8}\.png$/,
    );
    expect(screenshotFilename('/Account Settings', 'Mobile / Small')).toBe(
      screenshotFilename('/Account Settings', 'Mobile / Small'),
    );
  });

  it('does not collide when different paths have the same slug', () => {
    expect(screenshotFilename('/a/b', 'mobile')).not.toBe(screenshotFilename('/a-b', 'mobile'));
  });

  it('fails explicitly on a missing baseline and writes report.json', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'lint-ui-runner-'));
    const { runner, config, closePage, closeBrowser } = testRunner(directory);

    const results = await runner.runChecks();

    expect(results.results[0]).toMatchObject({ status: 'missing-baseline', passed: false });
    expect(results.hasFailures).toBe(true);
    expect(existsSync(join(config.outputDir, 'report.json'))).toBe(true);
    expect(JSON.parse(readFileSync(join(config.outputDir, 'report.json'), 'utf-8'))).toEqual(results);
    expect(closePage).toHaveBeenCalledOnce();
    expect(closeBrowser).toHaveBeenCalledOnce();
  });

  it('passes when the current capture matches its baseline', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'lint-ui-runner-'));
    const { runner, config } = testRunner(directory);
    const filename = screenshotFilename('/', 'mobile');
    writeFileSync(join(directory, filename), imageBuffer());
    const { mkdirSync, copyFileSync } = await import('node:fs');
    mkdirSync(config.baselineDir, { recursive: true });
    copyFileSync(join(directory, filename), join(config.baselineDir, filename));

    const results = await runner.runChecks();

    expect(results.results[0]).toMatchObject({ status: 'passed', passed: true });
    expect(results.hasFailures).toBe(false);
  });

  it('records navigation errors and still closes browser resources', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'lint-ui-runner-'));
    const { runner, closePage, closeBrowser, page } = testRunner(directory, {
      navigationError: new Error('connection refused'),
    });

    const results = await runner.runChecks();

    expect(results.results[0]).toMatchObject({
      status: 'error',
      passed: false,
      errorMessage: 'connection refused',
    });
    expect(page.goto).toHaveBeenCalledTimes(1);
    expect(closePage).toHaveBeenCalledOnce();
    expect(closeBrowser).toHaveBeenCalledOnce();
  });

  it('retries a transient navigation timeout once and then succeeds', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'lint-ui-runner-'));
    const { runner, config, page } = testRunner(directory, {
      transientNavigationErrorOnce: timeoutError('Navigation timeout of 1234ms exceeded'),
    });
    const filename = screenshotFilename('/', 'mobile');
    const { mkdirSync } = await import('node:fs');
    mkdirSync(config.baselineDir, { recursive: true });
    writeFileSync(join(config.baselineDir, filename), imageBuffer());

    const results = await runner.runChecks();

    expect(results.results[0]).toMatchObject({ status: 'passed', passed: true });
    expect(page.goto).toHaveBeenCalledTimes(2);
  });

  it('fails after one retry when timeouts persist', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'lint-ui-runner-'));
    const { runner, page } = testRunner(directory, {
      navigationError: timeoutError('Navigation timeout of 1234ms exceeded'),
    });

    const results = await runner.runChecks();

    expect(results.results[0]).toMatchObject({ status: 'error', passed: false });
    expect(page.goto).toHaveBeenCalledTimes(2);
  });

  it('fails the case when horizontal overflow is detected', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'lint-ui-runner-'));
    const { runner, config } = testRunner(directory);
    const overflow: LayoutIssue = {
      ruleId: 'horizontal-overflow',
      type: 'overflow',
      message: 'Horizontal overflow detected in DIV.wide',
      severity: 'error',
      element: 'DIV.wide',
      bounds: { x: 0, y: 0, width: 2000, height: 600 },
    };
    const spy = vi
      .spyOn(LayoutValidator.prototype, 'checkOverflow')
      .mockResolvedValue([overflow]);
    try {
      const filename = screenshotFilename('/', 'mobile');
      const { mkdirSync } = await import('node:fs');
      mkdirSync(config.baselineDir, { recursive: true });
      writeFileSync(join(config.baselineDir, filename), imageBuffer());

      const results = await runner.runChecks();

      expect(results.results[0]).toMatchObject({ status: 'failed', passed: false });
      expect(results.results[0].layoutIssues).toMatchObject([
        { ruleId: 'horizontal-overflow', severity: 'error' },
      ]);
      expect(results.results[0]).not.toHaveProperty('visualDiff');
    } finally {
      spy.mockRestore();
    }
  });

  it('fails the case when a violation hits the impact policy', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'lint-ui-runner-'));
    const { runner, config } = testRunner(directory);
    config.accessibility.enabled = true;
    config.accessibility.excludeSelectors = ['.ad'];
    const violation: AccessibilityViolation = {
      id: 'color-contrast',
      impact: 'serious',
      description: 'Elements must meet minimum color contrast ratio thresholds',
      help: 'Elements must have sufficient color contrast',
      helpUrl: 'https://dequeuniversity.com/rules/axe/4.8/color-contrast',
      nodes: 2,
      selectors: ['.button'],
    };
    const spy = vi
      .spyOn(AccessibilityValidator.prototype, 'runAxe')
      .mockResolvedValue([violation]);
    try {
      const filename = screenshotFilename('/', 'mobile');
      const { mkdirSync } = await import('node:fs');
      mkdirSync(config.baselineDir, { recursive: true });
      writeFileSync(join(config.baselineDir, filename), imageBuffer());

      const results = await runner.runChecks();

      expect(results.results[0]).toMatchObject({ status: 'failed', passed: false });
      expect(results.results[0].accessibilityViolations).toHaveLength(1);
      expect(results.results[0]).not.toHaveProperty('visualDiff');
      expect(spy).toHaveBeenCalledWith(expect.anything(), { excludeSelectors: ['.ad'] });
    } finally {
      spy.mockRestore();
    }
  });

  it('suppresses excluded rules with evidence instead of failing', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'lint-ui-runner-'));
    const { runner, config } = testRunner(directory);
    config.accessibility.enabled = true;
    config.accessibility.excludeRules = ['color-contrast'];
    const violation: AccessibilityViolation = {
      id: 'color-contrast',
      impact: 'critical',
      description: 'Elements must meet minimum color contrast ratio thresholds',
      help: 'Elements must have sufficient color contrast',
      helpUrl: 'https://dequeuniversity.com/rules/axe/4.8/color-contrast',
      nodes: 1,
      selectors: ['.nav-brand'],
    };
    const spy = vi
      .spyOn(AccessibilityValidator.prototype, 'runAxe')
      .mockResolvedValue([violation]);
    try {
      const filename = screenshotFilename('/', 'mobile');
      const { mkdirSync } = await import('node:fs');
      mkdirSync(config.baselineDir, { recursive: true });
      writeFileSync(join(config.baselineDir, filename), imageBuffer());

      const results = await runner.runChecks();

      expect(results.results[0]).toMatchObject({ status: 'passed', passed: true });
      expect(results.results[0].accessibilityViolations).toEqual([]);
      expect(results.results[0].exclusionsApplied).toEqual({ rules: ['color-contrast'], selectors: [] });
    } finally {
      spy.mockRestore();
    }
  });

  it('reports violations outside the impact policy without failing', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'lint-ui-runner-'));
    const { runner, config } = testRunner(directory);
    config.accessibility.enabled = true;
    const violation: AccessibilityViolation = {
      id: 'heading-order',
      impact: 'moderate',
      description: 'Heading levels should only increase by one',
      help: 'Headings must be ordered',
      helpUrl: 'https://dequeuniversity.com/rules/axe/4.8/heading-order',
      nodes: 1,
      selectors: ['.card > h3'],
    };
    const spy = vi
      .spyOn(AccessibilityValidator.prototype, 'runAxe')
      .mockResolvedValue([violation]);
    try {
      const filename = screenshotFilename('/', 'mobile');
      const { mkdirSync } = await import('node:fs');
      mkdirSync(config.baselineDir, { recursive: true });
      writeFileSync(join(config.baselineDir, filename), imageBuffer());

      const results = await runner.runChecks();

      expect(results.results[0]).toMatchObject({ status: 'passed', passed: true });
      expect(results.results[0].accessibilityViolations).toHaveLength(1);
    } finally {
      spy.mockRestore();
    }
  });

  it('applies deterministic capture controls and configured timeouts', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'lint-ui-runner-'));
    const fixture = testRunner(directory);
    fixture.config.disableAnimations = true;
    fixture.config.capture = {
      navigationTimeoutMs: 1234,
      readinessTimeoutMs: 2345,
      imageTimeoutMs: 3456,
      maskSelectors: ['.timestamp'],
    };

    await fixture.runner.runChecks();

    expect(fixture.page.emulateMedia).toHaveBeenCalledWith({ reducedMotion: 'reduce' });
    expect(fixture.page.addInitScript).toHaveBeenCalledOnce();
    expect(fixture.page.goto).toHaveBeenCalledWith('http://localhost:4173/', {
      waitUntil: 'networkidle',
      timeout: 1234,
    });
    expect(fixture.page.waitForFunction).toHaveBeenCalledWith(
      expect.any(Function),
      undefined,
      { timeout: 3456 },
    );
    expect(fixture.page.locator).toHaveBeenCalledWith('.timestamp');
    expect(fixture.page.screenshot).toHaveBeenCalledWith(
      expect.objectContaining({ animations: 'disabled', mask: [{ selector: '.timestamp' }] }),
    );
  });

  it('finishes active Web Animations before validation and capture', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'lint-ui-runner-'));
    const fixture = testRunner(directory);
    fixture.config.disableAnimations = true;
    const finish = vi.fn();
    const originalDocument = globalThis.document;
    const originalRequestAnimationFrame = globalThis.requestAnimationFrame;

    fixture.page.evaluate = vi.fn(async callback => {
      if (callback.toString().includes('document.getAnimations')) {
        Object.defineProperty(globalThis, 'document', {
          configurable: true,
          value: {
            getAnimations: () => [
              { playState: 'running', finish },
              { playState: 'finished', finish: vi.fn() },
            ],
          },
        });
        Object.defineProperty(globalThis, 'requestAnimationFrame', {
          configurable: true,
          value: (frame: FrameRequestCallback) => {
            frame(0);
            return 0;
          },
        });
        try {
          await callback();
        } finally {
          Object.defineProperty(globalThis, 'document', {
            configurable: true,
            value: originalDocument,
          });
          Object.defineProperty(globalThis, 'requestAnimationFrame', {
            configurable: true,
            value: originalRequestAnimationFrame,
          });
        }
      }
    }) as unknown as Page['evaluate'];

    await fixture.runner.runChecks();

    expect(finish).toHaveBeenCalledOnce();
  });

  it('fails when the visual change exceeds the configured maximum', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'lint-ui-runner-'));
    const { runner, config } = testRunner(directory);
    const filename = screenshotFilename('/', 'mobile');
    const { mkdirSync } = await import('node:fs');
    mkdirSync(config.baselineDir, { recursive: true });
    writeFileSync(join(config.baselineDir, filename), imageBuffer([255, 255, 255, 255]));

    const results = await runner.runChecks();

    expect(results.results[0]).toMatchObject({ status: 'failed', passed: false });
    expect(results.results[0].visualDiff).toMatchObject({ diffPercentage: 100 });
    expect(existsSync(join(config.outputDir, 'diff', filename))).toBe(true);
  });

  it('passes when the visual change stays within the configured maximum', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'lint-ui-runner-'));
    const current = imageWithPixel(2, 2, 0, 0, [255, 255, 255, 255]);
    const { runner, config } = testRunner(directory, { screenshotImage: current });
    config.thresholds.maxDiffPercentage = 30;
    const filename = screenshotFilename('/', 'mobile');
    const { mkdirSync } = await import('node:fs');
    mkdirSync(config.baselineDir, { recursive: true });
    writeFileSync(join(config.baselineDir, filename), imageBuffer([0, 0, 0, 255], 2, 2));

    const passing = await runner.runChecks();

    expect(passing.results[0]).toMatchObject({ status: 'passed', passed: true });
    expect(passing.results[0]).not.toHaveProperty('visualDiff');

    config.thresholds.maxDiffPercentage = 24;
    const failing = await runner.runChecks();

    expect(failing.results[0]).toMatchObject({ status: 'failed', passed: false });
    expect(failing.results[0].visualDiff).toMatchObject({ diffPercentage: 25 });
  });

  it('waits for the ready selector and route selector with the readiness timeout', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'lint-ui-runner-'));
    const { runner, config, page } = testRunner(directory);
    config.readySelector = '[data-ui-ready="true"]';
    config.routes = [{ path: '/', waitFor: '.loaded' }];
    config.capture.readinessTimeoutMs = 2345;
    const filename = screenshotFilename('/', 'mobile');
    const { mkdirSync } = await import('node:fs');
    mkdirSync(config.baselineDir, { recursive: true });
    writeFileSync(join(config.baselineDir, filename), imageBuffer());

    await runner.runChecks();

    expect(page.waitForSelector).toHaveBeenCalledWith('[data-ui-ready="true"]', {
      timeout: 2345,
    });
    expect(page.waitForSelector).toHaveBeenCalledWith('.loaded', { timeout: 2345 });
  });

  it('skips selector waits for networkidle routes without a ready selector', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'lint-ui-runner-'));
    const { runner, config, page } = testRunner(directory);
    config.routes = [{ path: '/', waitFor: 'networkidle' }];
    const filename = screenshotFilename('/', 'mobile');
    const { mkdirSync } = await import('node:fs');
    mkdirSync(config.baselineDir, { recursive: true });
    writeFileSync(join(config.baselineDir, filename), imageBuffer());

    await runner.runChecks();

    expect(page.waitForSelector).not.toHaveBeenCalled();
  });
});
