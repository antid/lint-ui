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
    expect(config.outputDir).toBe('.lint-ui');
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

  it.each(['variants', 'thresholds', 'rules', 'auth', 'ignoreSelectors'])(
    'rejects planned option %s instead of silently ignoring it',
    async option => {
      const configPath = join(temporaryDirectory(), 'lint-ui.yml');
      const values: Record<string, string> = {
        variants: '  theme: [dark]',
        thresholds: '  pixelDiffThreshold: 0.2',
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

  it('rejects unknown options', async () => {
    const configPath = join(temporaryDirectory(), 'lint-ui.yml');
    writeFileSync(
      configPath,
      'baseUrl: http://localhost:4173\nroutes:\n  - path: /\nunknownOption: true\n',
    );

    await expect(ConfigLoader.load(configPath)).rejects.toThrow('Unrecognized key');
  });
});
