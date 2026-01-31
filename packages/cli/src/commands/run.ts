import { Command, Flags } from '@oclif/core';
import { ConfigLoader } from '../config/loader.js';
import { Runner } from '@lint-ui/runner';
import { Reporter } from '@lint-ui/reporter';

export default class Run extends Command {
  static description = 'Run Lint UI checks';

  static examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --config custom.yml',
    '<%= config.bin %> <%= command.id %> --changed-only',
  ];

  static flags = {
    config: Flags.string({
      char: 'c',
      description: 'Path to config file',
      default: 'lint-ui.yml',
    }),
    'changed-only': Flags.boolean({
      description: 'Only test changed routes',
      default: false,
    }),
    base: Flags.string({
      description: 'Base branch for comparison',
      default: 'origin/main',
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(Run);

    this.log('🔍 Running Lint UI checks...\n');

    try {
      const config = await ConfigLoader.load(flags.config);
      const runner = new Runner(config);

      const results = await runner.runChecks();

      const reporter = new Reporter();
      const report = reporter.generateMarkdown(results);

      this.log('\n' + report);

      if (results.hasFailures) {
        this.error('❌ Lint UI checks failed', { exit: 1 });
      } else {
        this.log('\n✅ All checks passed');
      }
    } catch (error) {
      this.error(`Failed to run checks: ${error}`);
    }
  }
}
