import * as fs from 'fs';
import type { RunResults, TestResult } from '@lint-ui/runner';

export interface HtmlReportOptions {
  // Reads an image for embedding. Defaults to the filesystem; tests inject
  // a stub so golden tests never touch disk. Return null for a placeholder.
  loadImage?: (absolutePath: string) => Buffer | null;
}

const LAYOUT_GUIDANCE: Record<string, string> = {
  'horizontal-overflow':
    'Constrain the element width (max-width: 100%), allow wrapping, or move it into normal flow.',
  'horizontal-out-of-bounds':
    'Pull the element inside the viewport (adjust offsets or margins), or hide it intentionally.',
  'clipped-text':
    'Give the container more height, allow scrolling, or keep an ellipsis truncation with an accessible name.',
  'offscreen-element':
    'Move the control into reachable page flow, or hide it until it is needed.',
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function defaultLoadImage(absolutePath: string): Buffer | null {
  try {
    return fs.readFileSync(absolutePath);
  } catch {
    return null;
  }
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

        if (test.status === 'missing-baseline') {
          lines.push('**Missing baseline:** Run `lint-ui record` before comparing this case.\n');
        }

        if (test.status === 'error') {
          lines.push(`**Execution error:** ${test.errorMessage ?? 'Unknown error'}\n`);
        }

        if (test.visualDiff) {
          lines.push('**Visual Regression:**');
          lines.push(`- Diff: ${test.visualDiff.diffPercentage.toFixed(2)}%`);
          lines.push(`- Pixels changed: ${test.visualDiff.diffPixels}`);
          if (test.visualDiff.reason) lines.push(`- Reason: ${test.visualDiff.reason}`);
          lines.push(`- Image: \`${test.visualDiff.diffImagePath}\`\n`);
        }

        if (test.layoutIssues && test.layoutIssues.length > 0) {
          lines.push('**Layout Issues:**');
          for (const issue of test.layoutIssues) {
            const emoji = issue.severity === 'error' ? '❌' : '⚠️';
            lines.push(`- ${emoji} [${issue.ruleId}] ${issue.type}: ${issue.message}`);
          }
          lines.push('');
        }

        if (test.accessibilityViolations && test.accessibilityViolations.length > 0) {
          lines.push('**Accessibility Violations:**');
          for (const violation of test.accessibilityViolations) {
            const emoji =
              violation.impact === 'critical' || violation.impact === 'serious' ? '❌' : '⚠️';
            lines.push(`- ${emoji} [${violation.id}] ${violation.description} (${violation.nodes} nodes${violation.selectors[0] ? `, e.g. ${violation.selectors[0]}` : ''})`);
          }
          lines.push('');
        }

        if (
          test.exclusionsApplied &&
          (test.exclusionsApplied.rules.length > 0 || test.exclusionsApplied.selectors.length > 0)
        ) {
          const excluded = [
            ...test.exclusionsApplied.rules.map(rule => `rule ${rule}`),
            ...test.exclusionsApplied.selectors.map(selector => `selector ${selector}`),
          ].join(', ');
          lines.push(`**Exclusions applied:** ${excluded}\n`);
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

  // Brief, CI-friendly terminal output: totals plus one line per failure.
  generateSummary(results: RunResults): string {
    const { total, passed, failed } = results.summary;
    const lines = [`Lint UI: ${passed} passed, ${failed} failed (${total} total)`];

    for (const test of results.results.filter(r => !r.passed)) {
      const reasons: string[] = [];
      if (test.status === 'missing-baseline') {
        reasons.push('missing baseline');
      }
      if (test.status === 'error') {
        reasons.push(`error: ${test.errorMessage ?? 'unknown'}`);
      }
      if (test.visualDiff) {
        reasons.push(
          test.visualDiff.reason ?? `visual ${test.visualDiff.diffPercentage.toFixed(2)}%`,
        );
      }
      for (const issue of test.layoutIssues ?? []) {
        reasons.push(`layout ${issue.ruleId}`);
      }
      for (const violation of test.accessibilityViolations ?? []) {
        reasons.push(`a11y ${violation.id}`);
      }
      lines.push(`  ✗ ${test.route} @ ${test.breakpoint} — ${reasons.join(', ') || test.status}`);
    }

    return lines.join('\n');
  }

  // Self-contained HTML report: inline CSS/JS, images embedded as data URIs.
  generateHtml(results: RunResults, options: HtmlReportOptions = {}): string {
    const loadImage = options.loadImage ?? defaultLoadImage;
    const image = (absolutePath: string | undefined, label: string): string => {
      const bytes = absolutePath ? loadImage(absolutePath) : null;
      if (!bytes) {
        return `<div class="img-missing">${escapeHtml(label)} unavailable</div>`;
      }
      return `<img loading="lazy" alt="${escapeHtml(label)}" src="data:image/png;base64,${bytes.toString('base64')}" />`;
    };

    const statusCounts = new Map<string, number>();
    for (const test of results.results) {
      statusCounts.set(test.status, (statusCounts.get(test.status) ?? 0) + 1);
    }
    const unique = (values: string[]): string[] => [...new Set(values)].sort();
    const routes = unique(results.results.map(test => test.route));
    const viewports = unique(results.results.map(test => test.breakpoint));
    const select = (id: string, label: string, values: string[]): string => `
      <label>${escapeHtml(label)} <select id="${id}" onchange="applyFilters()">
        <option value="all">All</option>
        ${values.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('')}
      </select></label>`;

    const cases = results.results.map(test => this.renderCase(test, image)).join('\n');

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Lint UI Report</title>
<style>
body { font-family: system-ui, sans-serif; margin: 2rem; color: #1f2937; }
.summary { display: flex; gap: 1rem; flex-wrap: wrap; margin: 1rem 0; }
.badge { padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.875rem; }
.passed { background: #d1fae5; } .failed { background: #fee2e2; }
.missing-baseline { background: #fef3c7; } .error { background: #fee2e2; }
.filters { display: flex; gap: 1rem; flex-wrap: wrap; margin: 1rem 0; padding: 1rem; background: #f9fafb; }
.case { border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 1rem; margin-bottom: 1rem; }
.images { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
.images img { width: 100%; border: 1px solid #e5e7eb; }
.img-missing { padding: 2rem; background: #f3f4f6; text-align: center; color: #6b7280; }
.finding { margin: 0.5rem 0; } .guidance { color: #4b5563; font-size: 0.875rem; }
code { background: #f3f4f6; padding: 0 0.25rem; }
</style>
</head>
<body>
<h1>Lint UI Report</h1>
<p>Generated ${escapeHtml(new Date(results.timestamp).toISOString())} — ${results.summary.passed} passed, ${results.summary.failed} failed (${results.summary.total} total).</p>
<div class="summary">
${[...statusCounts.entries()].map(([status, count]) => `<span class="badge ${escapeHtml(status)}">${escapeHtml(status)}: ${count}</span>`).join('\n')}
</div>
<div class="filters">
${select('f-status', 'Status', [...statusCounts.keys()])}
${select('f-route', 'Route', routes)}
${select('f-viewport', 'Viewport', viewports)}
${select('f-category', 'Category', ['visual', 'layout', 'a11y'])}
</div>
${cases}
<script>
function applyFilters() {
  const status = document.getElementById('f-status').value;
  const route = document.getElementById('f-route').value;
  const viewport = document.getElementById('f-viewport').value;
  const category = document.getElementById('f-category').value;
  document.querySelectorAll('.case').forEach(el => {
    const ok = (status === 'all' || el.dataset.status === status)
      && (route === 'all' || el.dataset.route === route)
      && (viewport === 'all' || el.dataset.viewport === viewport)
      && (category === 'all' || el.dataset.cats.split(' ').includes(category));
    el.style.display = ok ? '' : 'none';
  });
}
</script>
</body>
</html>`;
  }

  private renderCase(
    test: TestResult,
    image: (absolutePath: string | undefined, label: string) => string,
  ): string {
    const cats: string[] = [];
    if (test.visualDiff) cats.push('visual');
    if ((test.layoutIssues ?? []).length > 0) cats.push('layout');
    if ((test.accessibilityViolations ?? []).length > 0) cats.push('a11y');

    const parts: string[] = [];
    parts.push(
      `<section class="case" data-status="${escapeHtml(test.status)}" data-route="${escapeHtml(test.route)}" data-viewport="${escapeHtml(test.breakpoint)}" data-cats="${cats.join(' ')}">`,
      `<h2>${escapeHtml(test.route)} @ ${escapeHtml(test.breakpoint)} <span class="badge ${escapeHtml(test.status)}">${escapeHtml(test.status)}</span></h2>`,
    );

    if (test.status === 'missing-baseline') {
      parts.push('<p>Missing baseline: record baselines before comparing this case.</p>');
    }
    if (test.status === 'error') {
      parts.push(`<p>Execution error: ${escapeHtml(test.errorMessage ?? 'Unknown error')}</p>`);
    }
    if (test.visualDiff) {
      parts.push(
        `<p>Visual change: ${test.visualDiff.diffPercentage.toFixed(2)}% (${test.visualDiff.diffPixels} pixels).` +
          (test.visualDiff.reason ? ` ${escapeHtml(test.visualDiff.reason)}` : '') + '</p>',
      );
    }
    if (test.baselinePath ?? test.currentPath ?? test.visualDiff) {
      parts.push(
        `<div class="images"><figure>${image(test.baselinePath, 'Baseline')}<figcaption>Baseline</figcaption></figure>` +
          `<figure>${image(test.currentPath, 'Current')}<figcaption>Current</figcaption></figure>` +
          `<figure>${test.visualDiff ? image(test.visualDiff.diffImagePath, 'Diff') : '<div class="img-missing">No visual change</div>'}<figcaption>Diff</figcaption></figure></div>`,
      );
    }
    for (const issue of test.layoutIssues ?? []) {
      const guidance = LAYOUT_GUIDANCE[issue.ruleId] ?? 'Locate the element with the selector above and verify it renders as intended.';
      const bounds = issue.bounds
        ? ` bounds <code>${issue.bounds.x},${issue.bounds.y} ${issue.bounds.width}x${issue.bounds.height}</code>`
        : '';
      parts.push(
        `<p class="finding">❌ [${escapeHtml(issue.ruleId)}] ${escapeHtml(issue.message)}` +
          (issue.element ? ` at <code>${escapeHtml(issue.element)}</code>${bounds}` : '') +
          `<br /><span class="guidance">${escapeHtml(guidance)}</span></p>`,
      );
    }
    for (const violation of test.accessibilityViolations ?? []) {
      const selectors = violation.selectors.slice(0, 3).map(s => `<code>${escapeHtml(s)}</code>`).join(' ');
      parts.push(
        `<p class="finding">❌ [${escapeHtml(violation.id)}] (${escapeHtml(violation.impact)}) ${escapeHtml(violation.description)} — ${violation.nodes} nodes ${selectors} ` +
          `<a href="${escapeHtml(violation.helpUrl)}">Help</a></p>`,
      );
    }
    if (
      test.exclusionsApplied &&
      (test.exclusionsApplied.rules.length > 0 || test.exclusionsApplied.selectors.length > 0)
    ) {
      parts.push(
        `<p>Exclusions applied: rules [${test.exclusionsApplied.rules.map(escapeHtml).join(', ')}], ` +
          `selectors [${test.exclusionsApplied.selectors.map(escapeHtml).join(', ')}]</p>`,
      );
    }
    parts.push('</section>');
    return parts.join('\n');
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
