import { Command, Flags } from '@oclif/core';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigLoader } from '../config/loader.js';
import { screenshotFilename, type Config, type RunResults } from '@lint-ui/runner';

export function approveCurrent(config: Config): string[] {
  const currentDir = path.resolve(config.outputDir, 'current');
  const reportPath = path.resolve(config.outputDir, 'report.json');
  const baselineDir = path.resolve(config.baselineDir);

  if (!fs.existsSync(reportPath)) {
    throw new Error('No completed run found. Run "lint-ui run" first.');
  }

  const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8')) as RunResults;
  const expectedCases = config.routes.flatMap(route =>
    config.breakpoints.map(breakpoint => ({
      key: `${route.path}\0${breakpoint.name}`,
      filename: screenshotFilename(route.path, breakpoint.name),
    })),
  );
  const reportedCases = new Set(
    report.results.map(result => `${result.route}\0${result.breakpoint}`),
  );

  if (
    report.results.length !== expectedCases.length ||
    expectedCases.some(testCase => !reportedCases.has(testCase.key))
  ) {
    throw new Error('The latest run does not match the current route and breakpoint configuration.');
  }

  const sources = expectedCases.map(testCase => ({
    source: path.join(currentDir, testCase.filename),
    target: path.join(baselineDir, testCase.filename),
  }));
  const missing = sources.find(file => !fs.existsSync(file.source));
  if (missing) {
    throw new Error(`Current screenshot is missing: ${missing.source}`);
  }

  fs.mkdirSync(baselineDir, { recursive: true });
  for (const file of sources) fs.copyFileSync(file.source, file.target);
  return sources.map(file => file.target);
}

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
      this.log('📝 Approving current screenshots as new baselines...\n');
      const approved = approveCurrent(config);

      this.log('✅ Baselines updated successfully');
      for (const approvedPath of approved) this.log(`  ${approvedPath}`);
    } catch (error) {
      this.error(`Failed to approve baselines: ${error}`);
    }
  }
}
