import { Command, Flags } from '@oclif/core';
import { ConfigLoader } from '../config/loader.js';
import { Runner } from '@lint-ui/runner';
import { Reporter } from '@lint-ui/reporter';
import type { RunResults } from '@lint-ui/runner';
import { EXIT_EXECUTION_ERROR, EXIT_QUALITY_FAILURE } from '../exit-codes.js';

export default class Run extends Command {
  static description = 'Run Lint UI checks';

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
    const { flags } = await this.parse(Run);

    this.log('🔍 Running Lint UI checks...\n');

    let results: RunResults;

    try {
      const config = await ConfigLoader.load(flags.config);
      const runner = new Runner(config);

      results = await runner.runChecks();

      const reporter = new Reporter();
      const report = reporter.generateMarkdown(results);

      this.log('\n' + report);

    } catch (error) {
      this.error(`Failed to run checks: ${error}`, { exit: EXIT_EXECUTION_ERROR });
    }

    if (results.hasFailures) {
      this.error('❌ Lint UI checks failed', { exit: EXIT_QUALITY_FAILURE });
    }

    this.log('\n✅ All checks passed');
  }
}
