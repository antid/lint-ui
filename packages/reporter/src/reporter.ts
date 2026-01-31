interface TestResult {
  route: string;
  breakpoint: string;
  passed: boolean;
  visualDiff?: {
    diffPixels: number;
    diffPercentage: number;
    diffImagePath: string;
  };
  layoutIssues?: Array<{
    type: string;
    message: string;
    severity: 'error' | 'warning';
  }>;
  accessibilityViolations?: Array<{
    id: string;
    impact: string;
    description: string;
    nodes: number;
  }>;
}

interface RunResults {
  timestamp: number;
  hasFailures: boolean;
  results: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
}

export class Reporter {
  generateMarkdown(results: RunResults): string {
    const lines: string[] = [];

    lines.push('# Lint UI Report\n');
    lines.push(`**Generated:** ${new Date(results.timestamp).toLocaleString()}\n`);

    // Summary
    lines.push('## Summary\n');
    lines.push(`- **Total Tests:** ${results.summary.total}`);
    lines.push(`- **Passed:** ✅ ${results.summary.passed}`);
    lines.push(`- **Failed:** ❌ ${results.summary.failed}\n`);

    // Failed tests
    const failed = results.results.filter(r => !r.passed);
    if (failed.length > 0) {
      lines.push('## Failed Tests\n');

      for (const test of failed) {
        lines.push(`### ${test.route} @ ${test.breakpoint}\n`);

        if (test.visualDiff) {
          lines.push('**Visual Regression:**');
          lines.push(`- Diff: ${test.visualDiff.diffPercentage.toFixed(2)}%`);
          lines.push(`- Pixels changed: ${test.visualDiff.diffPixels}`);
          lines.push(`- Image: \`${test.visualDiff.diffImagePath}\`\n`);
        }

        if (test.layoutIssues && test.layoutIssues.length > 0) {
          lines.push('**Layout Issues:**');
          for (const issue of test.layoutIssues) {
            const emoji = issue.severity === 'error' ? '❌' : '⚠️';
            lines.push(`- ${emoji} ${issue.type}: ${issue.message}`);
          }
          lines.push('');
        }

        if (test.accessibilityViolations && test.accessibilityViolations.length > 0) {
          lines.push('**Accessibility Violations:**');
          for (const violation of test.accessibilityViolations) {
            const emoji =
              violation.impact === 'critical' || violation.impact === 'serious' ? '❌' : '⚠️';
            lines.push(`- ${emoji} [${violation.id}] ${violation.description} (${violation.nodes} nodes)`);
          }
          lines.push('');
        }
      }
    }

    // Passed tests
    const passed = results.results.filter(r => r.passed);
    if (passed.length > 0) {
      lines.push('## Passed Tests\n');
      for (const test of passed) {
        lines.push(`- ✅ ${test.route} @ ${test.breakpoint}`);
      }
    }

    return lines.join('\n');
  }

  generateJSON(results: RunResults): string {
    return JSON.stringify(results, null, 2);
  }

  generateConsoleOutput(results: RunResults): string {
    const lines: string[] = [];

    lines.push('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('  LINT UI RESULTS');
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    lines.push(`Total:  ${results.summary.total}`);
    lines.push(`Passed: ${results.summary.passed}`);
    lines.push(`Failed: ${results.summary.failed}\n`);

    if (results.hasFailures) {
      lines.push('FAILURES:\n');
      const failed = results.results.filter(r => !r.passed);
      
      for (const test of failed) {
        lines.push(`  ❌ ${test.route} @ ${test.breakpoint}`);
        
        if (test.visualDiff) {
          lines.push(`     Visual diff: ${test.visualDiff.diffPercentage.toFixed(2)}%`);
        }
        
        if (test.layoutIssues) {
          for (const issue of test.layoutIssues) {
            lines.push(`     ${issue.type}: ${issue.message}`);
          }
        }
        
        if (test.accessibilityViolations) {
          for (const violation of test.accessibilityViolations) {
            lines.push(`     a11y: ${violation.id}`);
          }
        }
        
        lines.push('');
      }
    }

    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return lines.join('\n');
  }
}
