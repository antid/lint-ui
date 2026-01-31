import { Command, Flags } from '@oclif/core';
import { ConfigLoader } from '../config/loader.js';
import { Runner } from '@lint-ui/runner';
import * as path from 'path';

export default class Record extends Command {
  static description = 'Record baseline screenshots';

  static examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --config custom.yml',
  ];

  static flags = {
    config: Flags.string({
      char: 'c',
      description: 'Path to config file',
      default: 'lint-ui.yml',
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(Record);

    this.log('📸 Recording baseline screenshots...\n');

    try {
      const config = await ConfigLoader.load(flags.config);
      const runner = new Runner(config);

      await runner.recordBaselines();

      this.log('\n✅ Baselines recorded successfully');
      this.log(`📁 Saved to: ${path.resolve(config.baselineDir)}`);
    } catch (error) {
      this.error(`Failed to record baselines: ${error}`);
    }
  }
}
