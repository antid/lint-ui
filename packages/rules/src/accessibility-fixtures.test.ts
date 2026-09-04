import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser } from 'playwright';
import { AccessibilityValidator } from './accessibility-validator.js';
import type { AccessibilityViolation } from './types.js';

const fixturesDir = join(process.cwd(), 'packages', 'rules', 'fixtures');
const axeScriptPath = join(
  process.cwd(),
  'packages',
  'rules',
  'node_modules',
  'axe-core',
  'axe.min.js',
);

// Same opt-in gate as the layout fixture tests: CI sets
// LINT_UI_BROWSER_TESTS=1 after installing browsers.
describe.runIf(process.env.LINT_UI_BROWSER_TESTS === '1')('accessibility fixtures', () => {
  let browser: Browser | null = null;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
  });

  afterAll(async () => {
    await browser?.close();
    browser = null;
  });

  async function violationsFor(
    fixture: string,
    excludeSelectors: string[] = [],
  ): Promise<AccessibilityViolation[]> {
    if (!browser) {
      throw new Error('Browser did not start');
    }
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    try {
      await page.goto(pathToFileURL(join(fixturesDir, fixture)).href);
      return await new AccessibilityValidator(axeScriptPath).runAxe(page, {
        excludeSelectors,
      });
    } finally {
      await page.close();
    }
  }

  it('reports no violations on the clean fixture', async () => {
    await expect(violationsFor('a11y-pass.html')).resolves.toEqual([]);
  });

  it('detects critical violations in the failing fixture', async () => {
    const violations = await violationsFor('a11y-fail.html');
    const byId = new Map(violations.map(violation => [violation.id, violation]));

    expect([...byId.keys()]).toEqual(expect.arrayContaining(['image-alt', 'button-name']));
    for (const violation of byId.values()) {
      expect(violation.impact).toBe('critical');
      expect(violation.helpUrl).toContain('dequeuniversity.com');
      expect(violation.selectors.length).toBeGreaterThan(0);
    }
  });

  it('honors selector exclusions', async () => {
    const violations = await violationsFor('a11y-fail.html', ['img']);
    const ids = violations.map(violation => violation.id);

    expect(ids).not.toContain('image-alt');
    expect(ids).toContain('button-name');
  });
});
