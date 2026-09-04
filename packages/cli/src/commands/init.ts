import { Command } from '@oclif/core';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigLoader } from '../config/loader.js';

export const DEFAULT_CONFIG_FILENAME = 'lint-ui.yml';

export function initializeConfig(directory: string): { created: boolean; path: string } {
  const configPath = path.resolve(directory, DEFAULT_CONFIG_FILENAME);

  if (fs.existsSync(configPath)) {
    return { created: false, path: configPath };
  }

  fs.writeFileSync(configPath, ConfigLoader.getDefaultConfig(), 'utf-8');
  return { created: true, path: configPath };
}

export default class Init extends Command {
  static description = 'Initialize Lint UI configuration';

  static examples = [
    '<%= config.bin %> <%= command.id %>',
  ];

  async run(): Promise<void> {
    const result = initializeConfig(process.cwd());

    if (!result.created) {
      this.log('⚠️  lint-ui.yml already exists. Skipping.');
      return;
    }

    this.log('✅ Created lint-ui.yml');
    this.log('\nNext steps:');
    this.log('1. Update baseUrl in lint-ui.yml');
    this.log('2. Add your routes');
    this.log('3. Run: lint-ui record');
  }
}
