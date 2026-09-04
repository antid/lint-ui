import type { Page } from 'playwright';
import type { AccessibilityViolation } from './types.js';

export interface AxeRunOptions {
  // CSS selectors for subtrees axe must skip (intentional exclusions).
  excludeSelectors?: string[];
}

export class AccessibilityValidator {
  // axeScriptPath is injectable so tests can point at a known axe build
  // without relying on module resolution inside the test runner. When
  // omitted, the bundled axe-core dependency is resolved. This file must
  // stay free of import.meta so the CJS build keeps compiling.
  constructor(private axeScriptPath?: string) {}

  async runAxe(page: Page, options: AxeRunOptions = {}): Promise<AccessibilityViolation[]> {
    const scriptPath = this.axeScriptPath ?? require.resolve('axe-core/axe.min.js');
    await page.addScriptTag({ path: scriptPath });

    const exclude = (options.excludeSelectors ?? []).map(selector => [selector]);
    const results = await page.evaluate(async (excludeContext: string[][]) => {
      // @ts-ignore - axe is injected into the page at runtime
      const axeResults = await axe.run({ exclude: excludeContext });
      return axeResults.violations.map((violation: any) => ({
        id: violation.id,
        impact: violation.impact,
        description: violation.description,
        help: violation.help,
        helpUrl: violation.helpUrl,
        nodes: violation.nodes.length,
        selectors: [...new Set(violation.nodes.flatMap((node: any) => node.target))],
      }));
    }, exclude);

    return results;
  }
}
