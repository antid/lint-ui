import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import type { Browser, Page } from 'playwright';
import { describe, expect, it, vi } from 'vitest';
import { LayoutValidator, AccessibilityValidator, type LayoutIssue, type AccessibilityViolation } from '@lint-ui/rules';
import type { Config } from './types.js';
import { Runner, screenshotFilename } from './runner.js';

function imageBuffer(): Buffer {
  const image = new PNG({ width: 1, height: 1 });
  image.data.set([0, 0, 0, 255]);
  return PNG.sync.write(image);
}

function timeoutError(message: string): Error {
  const error = new Error(message);
  error.name = 'TimeoutError';
  return error;
}

function testRunner(
  directory: string,
  options: { navigationError?: Error; transientNavigationErrorOnce?: Error } = {},
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
    waitForFunction: vi.fn(),
    locator: vi.fn(selector => ({ selector })),
    screenshot: vi.fn(({ path }: { path: string }) => writeFileSync(path, imageBuffer())),
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
});
