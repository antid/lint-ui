import type { Page } from 'playwright';
import type { LayoutIssue } from './types.js';

export class LayoutValidator {
  async checkOverflow(page: Page): Promise<LayoutIssue[]> {
    const issues: LayoutIssue[] = [];

    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    if (hasHorizontalOverflow) {
      const overflowingElement = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('*'));
        for (const el of elements) {
          const rect = el.getBoundingClientRect();
          if (rect.right > window.innerWidth) {
            return {
              tag: el.tagName,
              class: el.className,
              id: el.id,
            };
          }
        }
        return null;
      });

      issues.push({
        type: 'overflow',
        message: `Horizontal overflow detected${
          overflowingElement
            ? ` in ${overflowingElement.tag}${
                overflowingElement.class ? `.${overflowingElement.class}` : ''
              }`
            : ''
        }`,
        severity: 'error',
        element: overflowingElement
          ? `${overflowingElement.tag}${overflowingElement.id ? `#${overflowingElement.id}` : ''}${
              overflowingElement.class ? `.${overflowingElement.class.split(' ')[0]}` : ''
            }`
          : undefined,
      });
    }

    return issues;
  }

  async checkTextClipping(page: Page): Promise<LayoutIssue[]> {
    const issues: LayoutIssue[] = [];

    const clippedElements = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      const clipped: Array<{ tag: string; class: string; id: string }> = [];

      for (const el of elements) {
        const htmlEl = el as HTMLElement;
        
        // Skip elements that are intentionally scrollable
        const overflow = window.getComputedStyle(htmlEl).overflow;
        if (overflow === 'scroll' || overflow === 'auto') {
          continue;
        }

        if (htmlEl.scrollHeight > htmlEl.clientHeight + 5) {
          // 5px tolerance
          clipped.push({
            tag: htmlEl.tagName,
            class: htmlEl.className,
            id: htmlEl.id,
          });
        }
      }

      return clipped;
    });

    for (const el of clippedElements) {
      issues.push({
        type: 'clipping',
        message: `Text clipping detected in ${el.tag}${el.class ? `.${el.class.split(' ')[0]}` : ''}`,
        severity: 'warning',
        element: `${el.tag}${el.id ? `#${el.id}` : ''}${el.class ? `.${el.class.split(' ')[0]}` : ''}`,
      });
    }

    return issues;
  }

  async checkOffscreenElements(page: Page): Promise<LayoutIssue[]> {
    const issues: LayoutIssue[] = [];

    const offscreenElements = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('button, a, input, [role="button"]'));
      const offscreen: Array<{ tag: string; text: string }> = [];

      for (const el of elements) {
        const rect = el.getBoundingClientRect();
        if (
          rect.bottom < 0 ||
          rect.right < 0 ||
          rect.top > window.innerHeight ||
          rect.left > window.innerWidth
        ) {
          const htmlEl = el as HTMLElement;
          const isHidden = window.getComputedStyle(htmlEl).display === 'none';
          if (!isHidden) {
            offscreen.push({
              tag: htmlEl.tagName,
              text: htmlEl.textContent?.slice(0, 50) || '',
            });
          }
        }
      }

      return offscreen;
    });

    for (const el of offscreenElements) {
      issues.push({
        type: 'offscreen',
        message: `Important element (${el.tag}) is off-screen: "${el.text}"`,
        severity: 'warning',
      });
    }

    return issues;
  }

  async checkAll(page: Page): Promise<LayoutIssue[]> {
    const [overflowIssues, clippingIssues, offscreenIssues] = await Promise.all([
      this.checkOverflow(page),
      this.checkTextClipping(page),
      this.checkOffscreenElements(page),
    ]);

    return [...overflowIssues, ...clippingIssues, ...offscreenIssues];
  }
}
