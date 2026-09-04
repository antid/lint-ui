import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser } from 'playwright';
import { LayoutValidator } from './layout-validator.js';

// Real-browser coverage for the layout rules. Opt-in because it needs a
// Chromium binary: CI sets LINT_UI_BROWSER_TESTS=1 after installing browsers,
// local runs enable it with `LINT_UI_BROWSER_TESTS=1 pnpm test`.
const fixturesDir = join(process.cwd(), 'packages', 'rules', 'fixtures');

describe.runIf(process.env.LINT_UI_BROWSER_TESTS === '1')('layout fixtures', () => {
  let browser: Browser | null = null;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
  });

  afterAll(async () => {
    await browser?.close();
    browser = null;
  });

  async function ruleIdsFor(fixture: string): Promise<string[]> {
    if (!browser) {
      throw new Error('Browser did not start');
    }
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    try {
      await page.goto(pathToFileURL(join(fixturesDir, fixture)).href);
      const issues = await new LayoutValidator().checkAll(page);
      return issues.map(issue => issue.ruleId);
    } finally {
      await page.close();
    }
  }

  it.each([
    'overflow-pass.html',
    'clipping-pass.html',
    'visible-overflow-pass.html',
    'out-of-bounds-pass.html',
    'intentional-horizontal-scroll-pass.html',
  ])(
    'reports no findings on clean fixture %s',
    async fixture => {
      await expect(ruleIdsFor(fixture)).resolves.toEqual([]);
    },
  );

  it.each([
    ['overflow-fail.html', 'horizontal-overflow'],
    ['clipping-fail.html', 'clipped-text'],
    ['out-of-bounds-fail.html', 'horizontal-out-of-bounds'],
  ])('detects %s in failing fixture %s', async (fixture, ruleId) => {
    await expect(ruleIdsFor(fixture)).resolves.toContain(ruleId);
  });
});
