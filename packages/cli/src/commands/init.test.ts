import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ConfigLoader } from '../config/loader.js';
import { DEFAULT_CONFIG_FILENAME, initializeConfig } from './init.js';

describe('initializeConfig', () => {
  it('creates a valid lint-ui.yml', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'lint-ui-init-'));

    const result = initializeConfig(directory);

    expect(result).toEqual({
      created: true,
      path: join(directory, DEFAULT_CONFIG_FILENAME),
    });
    expect(existsSync(result.path)).toBe(true);
    await expect(ConfigLoader.load(result.path)).resolves.toBeDefined();
  });

  it('does not overwrite an existing configuration', () => {
    const directory = mkdtempSync(join(tmpdir(), 'lint-ui-init-'));
    const configPath = join(directory, DEFAULT_CONFIG_FILENAME);
    writeFileSync(configPath, 'existing configuration');

    const result = initializeConfig(directory);

    expect(result.created).toBe(false);
    expect(readFileSync(configPath, 'utf-8')).toBe('existing configuration');
  });
});
