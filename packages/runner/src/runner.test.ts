import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import type { Browser, Page } from 'playwright';
import { describe, expect, it, vi } from 'vitest';
import type { Config } from './types.js';
import { Runner, screenshotFilename } from './runner.js';

function imageBuffer(): Buffer {
  const image = new PNG({ width: 1, height: 1 });
  image.data.set([0, 0, 0, 255]);
  return PNG.sync.write(image);
}

function testRunner(directory: string, options: { navigationError?: Error } = {}) {
  const closePage = vi.fn();
  const closeBrowser = vi.fn();
  const page = {
    addStyleTag: vi.fn(),
    goto: options.navigationError
      ? vi.fn(async () => { throw options.navigationError; })
      : vi.fn(),
    evaluate: vi.fn(),
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
    disableAnimations: false,
    outputDir: join(directory, 'output'),
    baselineDir: join(directory, 'baseline'),
  };

  return {
    runner: new Runner(config, { launchBrowser: async () => browser }),
    config,
    closePage,
    closeBrowser,
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
    const { runner, closePage, closeBrowser } = testRunner(directory, {
      navigationError: new Error('connection refused'),
    });

    const results = await runner.runChecks();

    expect(results.results[0]).toMatchObject({
      status: 'error',
      passed: false,
      errorMessage: 'connection refused',
    });
    expect(closePage).toHaveBeenCalledOnce();
    expect(closeBrowser).toHaveBeenCalledOnce();
  });
});
