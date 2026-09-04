import { describe, expect, it } from 'vitest';
import type { RunResults } from '@lint-ui/runner';
import { Reporter } from './reporter.js';

const onePixelPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

function results(): RunResults {
  return {
    timestamp: 1725525600000,
    hasFailures: true,
    results: [
      {
        route: '/dashboard',
        breakpoint: 'mobile',
        status: 'failed',
        passed: false,
        baselinePath: '/out/.ui-baseline/dash.png',
        currentPath: '/out/.lint-ui/current/dash.png',
        visualDiff: {
          diffPixels: 120,
          diffPercentage: 12.5,
          diffImagePath: '/out/.lint-ui/diff/dash.png',
        },
        layoutIssues: [
          {
            ruleId: 'horizontal-overflow',
            type: 'overflow',
            message: 'Horizontal overflow detected in DIV.wide',
            severity: 'error',
            element: 'DIV.wide',
            bounds: { x: 0, y: 0, width: 2000, height: 600 },
          },
        ],
        accessibilityViolations: [
          {
            id: 'color-contrast',
            impact: 'serious',
            description: 'Elements must meet minimum contrast',
            help: 'Elements must have sufficient color contrast',
            helpUrl: 'https://dequeuniversity.com/rules/axe/4.8/color-contrast',
            nodes: 2,
            selectors: ['.button'],
          },
        ],
        exclusionsApplied: { rules: ['region'], selectors: [] },
      },
      {
        route: '/',
        breakpoint: 'desktop',
        status: 'passed',
        passed: true,
        baselinePath: '/out/.ui-baseline/home.png',
        currentPath: '/out/.lint-ui/current/home.png',
        layoutIssues: [],
        accessibilityViolations: [],
      },
      {
        route: '/settings',
        breakpoint: 'mobile',
        status: 'error',
        passed: false,
        errorMessage: '<script>alert(1)</script>',
        layoutIssues: [],
        accessibilityViolations: [],
      },
    ],
    summary: { total: 3, passed: 1, failed: 2 },
  };
}

describe('Reporter.generateHtml', () => {
  it('renders cases, findings, filters, and embedded images', () => {
    const html = new Reporter().generateHtml(results(), {
      loadImage: (absolutePath: string) =>
        absolutePath.includes('/diff/') ? null : onePixelPng,
    });

    expect(html).toContain('<title>Lint UI Report</title>');
    expect(html).toContain('/dashboard @ mobile');
    expect(html).toContain('horizontal-overflow');
    expect(html).toContain('Constrain the element width');
    expect(html).toContain('https://dequeuniversity.com/rules/axe/4.8/color-contrast');
    expect(html).toContain('data:image/png;base64,');
    expect(html).toContain('Diff unavailable');
    expect(html).toContain('id="f-status"');
    expect(html).toContain('id="f-category"');
    expect(html).toContain('Exclusions applied');
  });

  it('escapes untrusted content', () => {
    const html = new Reporter().generateHtml(results(), {
      loadImage: () => onePixelPng,
    });

    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('matches the committed golden snapshot', () => {
    const html = new Reporter().generateHtml(results(), {
      loadImage: () => onePixelPng,
    });

    expect(html).toMatchSnapshot();
  });
});

describe('Reporter.generateSummary', () => {
  it('stays to totals plus one line per failure', () => {
    const summary = new Reporter().generateSummary(results());

    expect(summary).toBe(
      [
        'Lint UI: 1 passed, 2 failed (3 total)',
        '  ✗ /dashboard @ mobile — visual 12.50%, layout horizontal-overflow, a11y color-contrast',
        '  ✗ /settings @ mobile — error: <script>alert(1)</script>',
      ].join('\n'),
    );
  });
});
