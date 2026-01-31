import type { Page } from 'playwright';
import type { AccessibilityViolation } from './types.js';

export class AccessibilityValidator {
  async runAxe(page: Page): Promise<AccessibilityViolation[]> {
    // Inject axe-core into the page
    await page.addScriptTag({
      path: require.resolve('axe-core/axe.min.js'),
    });

    // Run axe-core
    const results = await page.evaluate(async () => {
      // @ts-ignore - axe is injected globally
      const axeResults = await axe.run();
      return axeResults.violations.map((violation: any) => ({
        id: violation.id,
        impact: violation.impact,
        description: violation.description,
        help: violation.help,
        helpUrl: violation.helpUrl,
        nodes: violation.nodes.length,
      }));
    });

    return results;
  }

  async checkColorContrast(_page: Page): Promise<AccessibilityViolation[]> {
    // This is already included in axe-core, but we can add custom checks here
    return [];
  }

  async checkAll(page: Page): Promise<AccessibilityViolation[]> {
    const [axeViolations, contrastIssues] = await Promise.all([
      this.runAxe(page),
      this.checkColorContrast(page),
    ]);

    return [...axeViolations, ...contrastIssues];
  }
}
