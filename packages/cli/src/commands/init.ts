import { Command } from '@oclif/core';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigLoader } from '../config/loader.js';

export default class Init extends Command {
  static description = 'Initialize Lint UI configuration';

  static examples = [
    '<%= config.bin %> <%= command.id %>',
  ];

  async run(): Promise<void> {
    const configPath = path.resolve(process.cwd(), 'ui-guard.yml');

    if (fs.existsSync(configPath)) {
      this.log('⚠️  lint-ui.yml already exists. Skipping.');
      return;
    }

    const defaultConfig = ConfigLoader.getDefaultConfig();
    fs.writeFileSync(configPath, defaultConfig, 'utf-8');

    this.log('✅ Created lint-ui.yml');
    this.log('\nNext steps:');
    this.log('1. Update baseUrl in lint-ui.yml');
    this.log('2. Add your routes');
    this.log('3. Run: lint-ui record');
  }
}
