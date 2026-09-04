import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ConfigLoader } from './loader.js';

function temporaryDirectory(): string {
  return mkdtempSync(join(tmpdir(), 'lint-ui-config-'));
}

describe('ConfigLoader', () => {
  it('loads a minimal configuration and applies defaults', async () => {
    const directory = temporaryDirectory();
    const configPath = join(directory, 'lint-ui.yml');
    writeFileSync(configPath, 'baseUrl: http://localhost:4173\nroutes:\n  - path: /\n');

    const config = await ConfigLoader.load(configPath);

    expect(config.breakpoints).toHaveLength(4);
    expect(config.disableAnimations).toBe(true);
    expect(config.outputDir).toBe(join(directory, '.lint-ui'));
  });

  it('reports a missing configuration file', async () => {
    const missingPath = join(temporaryDirectory(), 'missing.yml');

    await expect(ConfigLoader.load(missingPath)).rejects.toThrow(
      `Config file not found: ${missingPath}`,
    );
  });

  it('rejects invalid configuration', async () => {
    const configPath = join(temporaryDirectory(), 'lint-ui.yml');
    writeFileSync(configPath, 'baseUrl: not-a-url\nroutes: []\n');

    await expect(ConfigLoader.load(configPath)).rejects.toThrow('Invalid configuration');
  });

  it.each(['variants', 'rules', 'auth', 'ignoreSelectors'])(
    'rejects planned option %s instead of silently ignoring it',
    async option => {
      const configPath = join(temporaryDirectory(), 'lint-ui.yml');
      const values: Record<string, string> = {
        variants: '  theme: [dark]',
        rules: '  checkOverflow: true',
        auth: '  type: header\n  value:\n    Authorization: token',
        ignoreSelectors: '  - .timestamp',
      };
      writeFileSync(
        configPath,
        `baseUrl: http://localhost:4173\nroutes:\n  - path: /\n${option}:\n${values[option]}\n`,
      );

      await expect(ConfigLoader.load(configPath)).rejects.toThrow(
        `${option} is planned but not supported yet`,
      );
    },
  );

  it('resolves output paths relative to the configuration file', async () => {
    const directory = temporaryDirectory();
    const configPath = join(directory, 'lint-ui.yml');
    writeFileSync(configPath, 'baseUrl: http://localhost:4173\nroutes:\n  - path: /\n');

    const config = await ConfigLoader.load(configPath);

    expect(config.outputDir).toBe(join(directory, '.lint-ui'));
    expect(config.baselineDir).toBe(join(directory, '.ui-baseline'));
  });

  it('loads explicit visual thresholds', async () => {
    const configPath = join(temporaryDirectory(), 'lint-ui.yml');
    writeFileSync(
      configPath,
      'baseUrl: http://localhost:4173\nroutes:\n  - path: /\nthresholds:\n  pixelThreshold: 0.2\n  maxDiffPercentage: 2\n',
    );

    const config = await ConfigLoader.load(configPath);

    expect(config.thresholds).toEqual({ pixelThreshold: 0.2, maxDiffPercentage: 2 });
  });

  it('loads capture controls and applies their defaults', async () => {
    const configPath = join(temporaryDirectory(), 'lint-ui.yml');
    writeFileSync(
      configPath,
      'baseUrl: http://localhost:4173\nroutes:\n  - path: /\ncapture:\n  navigationTimeoutMs: 5000\n  maskSelectors: [.timestamp]\n',
    );

    const config = await ConfigLoader.load(configPath);

    expect(config.capture).toEqual({
      navigationTimeoutMs: 5000,
      readinessTimeoutMs: 10000,
      imageTimeoutMs: 10000,
      maskSelectors: ['.timestamp'],
    });
  });

  it('loads accessibility policy and applies its defaults', async () => {
    const configPath = join(temporaryDirectory(), 'lint-ui.yml');
    writeFileSync(
      configPath,
      'baseUrl: http://localhost:4173\nroutes:\n  - path: /\naccessibility:\n  failImpacts: [critical]\n  excludeRules: [color-contrast]\n',
    );

    const config = await ConfigLoader.load(configPath);

    expect(config.accessibility).toEqual({
      enabled: true,
      failImpacts: ['critical'],
      excludeRules: ['color-contrast'],
      excludeSelectors: [],
    });
  });

  it('rejects duplicate routes and breakpoints', async () => {
    const configPath = join(temporaryDirectory(), 'lint-ui.yml');
    writeFileSync(
      configPath,
      'baseUrl: http://localhost:4173\nroutes:\n  - path: /\n  - path: /\nbreakpoints:\n  - name: mobile\n    width: 375\n  - name: mobile\n    width: 400\n',
    );

    await expect(ConfigLoader.load(configPath)).rejects.toThrow('Duplicate route path');
    await expect(ConfigLoader.load(configPath)).rejects.toThrow('Duplicate breakpoint name');
  });

  it('rejects unknown options', async () => {
    const configPath = join(temporaryDirectory(), 'lint-ui.yml');
    writeFileSync(
      configPath,
      'baseUrl: http://localhost:4173\nroutes:\n  - path: /\nunknownOption: true\n',
    );

    await expect(ConfigLoader.load(configPath)).rejects.toThrow('Unrecognized key');
  });
});
