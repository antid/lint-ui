import { Command, Flags } from '@oclif/core';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigLoader } from '../config/loader.js';

export default class Approve extends Command {
  static description = 'Approve current screenshots as new baselines';

  static examples = [
    '<%= config.bin %> <%= command.id %>',
  ];

  static flags = {
    config: Flags.string({
      char: 'c',
      description: 'Path to config file',
      default: 'lint-ui.yml',
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(Approve);

    try {
      const config = await ConfigLoader.load(flags.config);
      const currentDir = path.resolve(config.outputDir, 'current');
      const baselineDir = path.resolve(config.baselineDir);

      if (!fs.existsSync(currentDir)) {
        this.error('No current screenshots found. Run "lint-ui run" first.');
      }

      this.log('📝 Approving current screenshots as new baselines...\n');

      // Copy current to baseline
      fs.cpSync(currentDir, baselineDir, { recursive: true });

      this.log('✅ Baselines updated successfully');
      this.log(`📁 Location: ${baselineDir}`);
    } catch (error) {
      this.error(`Failed to approve baselines: ${error}`);
    }
  }
}
