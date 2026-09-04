import { existsSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { screenshotFilename, type Config, type RunResults } from '@lint-ui/runner';
import { approveCurrent } from './approve.js';

function setup(): { config: Config; filename: string } {
  const directory = mkdtempSync(join(tmpdir(), 'lint-ui-approve-'));
  const config: Config = {
    baseUrl: 'http://localhost:4173',
    routes: [{ path: '/' }],
    breakpoints: [{ name: 'mobile', width: 375 }],
    thresholds: { pixelThreshold: 0.1, maxDiffPercentage: 0.1 },
    capture: {
      navigationTimeoutMs: 30000,
      readinessTimeoutMs: 10000,
      imageTimeoutMs: 10000,
      maskSelectors: [],
    },
    disableAnimations: true,
    outputDir: join(directory, 'output'),
    baselineDir: join(directory, 'baseline'),
  };
  return { config, filename: screenshotFilename('/', 'mobile') };
}

describe('approveCurrent', () => {
  it('approves only screenshots from a completed matching run', () => {
    const { config, filename } = setup();
    mkdirSync(join(config.outputDir, 'current'), { recursive: true });
    writeFileSync(join(config.outputDir, 'current', filename), 'screenshot');
    const report: RunResults = {
      timestamp: 0,
      hasFailures: true,
      results: [{ route: '/', breakpoint: 'mobile', status: 'failed', passed: false }],
      summary: { total: 1, passed: 0, failed: 1 },
    };
    writeFileSync(join(config.outputDir, 'report.json'), JSON.stringify(report));

    const approved = approveCurrent(config);

    expect(approved).toEqual([join(config.baselineDir, filename)]);
    expect(existsSync(join(config.baselineDir, filename))).toBe(true);
  });

  it('refuses approval without a completed run', () => {
    const { config } = setup();

    expect(() => approveCurrent(config)).toThrow('No completed run found');
  });

  it('refuses a run that does not match the current matrix', () => {
    const { config } = setup();
    mkdirSync(config.outputDir, { recursive: true });
    const report: RunResults = {
      timestamp: 0,
      hasFailures: false,
      results: [],
      summary: { total: 0, passed: 0, failed: 0 },
    };
    writeFileSync(join(config.outputDir, 'report.json'), JSON.stringify(report));

    expect(() => approveCurrent(config)).toThrow('does not match');
  });
});
