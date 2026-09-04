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
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height,
            };
          }
        }
        return null;
      });

      issues.push({
        ruleId: 'horizontal-overflow',
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
        bounds: overflowingElement
          ? {
              x: overflowingElement.x,
              y: overflowingElement.y,
              width: overflowingElement.width,
              height: overflowingElement.height,
            }
          : undefined,
      });
    }

    return issues;
  }

  async checkTextClipping(page: Page): Promise<LayoutIssue[]> {
    const issues: LayoutIssue[] = [];

    const clippedElements = (await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      const clipped: Array<{ tag: string; class: string; id: string }> = [];

      for (const el of elements) {
        const htmlEl = el as HTMLElement;

        // Document structure is not content: a scrolled page always has a
        // taller root than viewport, which is navigation, not clipping.
        if (htmlEl.tagName === 'HTML' || htmlEl.tagName === 'HEAD' || htmlEl.tagName === 'BODY') {
          continue;
        }

        const style = window.getComputedStyle(htmlEl);

        // Content that is allowed to overflow vertically is still visible, not
        // clipped. A taller scrollHeight only establishes clipping when the
        // element actually constrains vertical overflow.
        const verticallyScrollable =
          (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
          htmlEl.scrollHeight > htmlEl.clientHeight;
        if (style.overflowY === 'visible' || verticallyScrollable) {
          continue;
        }
        if (style.textOverflow === 'ellipsis') {
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
    })) ?? [];

    for (const el of clippedElements) {
      issues.push({
        ruleId: 'clipped-text',
        type: 'clipping',
        message: `Text clipping detected in ${el.tag}${el.class ? `.${el.class.split(' ')[0]}` : ''}`,
        severity: 'warning',
        element: `${el.tag}${el.id ? `#${el.id}` : ''}${el.class ? `.${el.class.split(' ')[0]}` : ''}`,
      });
    }

    return issues;
  }

  // Not wired into checkAll: below-the-fold buttons are reachable by
  // scrolling, and this check cannot distinguish them from truly stranded
  // controls. Kept for a future refinement, not part of v1.
  async checkOffscreenElements(page: Page): Promise<LayoutIssue[]> {
    const issues: LayoutIssue[] = [];

    const offscreenElements = (await page.evaluate(() => {
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
    })) ?? [];

    for (const el of offscreenElements) {
      issues.push({
        ruleId: 'offscreen-element',
        type: 'offscreen',
        message: `Important element (${el.tag}) is off-screen: "${el.text}"`,
        severity: 'warning',
      });
    }

    return issues;
  }

  async checkOutOfBounds(page: Page): Promise<LayoutIssue[]> {
    const issues: LayoutIssue[] = [];

    const outOfBounds = (await page.evaluate(() => {
      const found: Array<{
        selector: string;
        x: number;
        y: number;
        width: number;
        height: number;
      }> = [];

      const isClippedByAncestor = (element: HTMLElement) => {
        const elementRect = element.getBoundingClientRect();
        let ancestor = element.parentElement;

        while (ancestor) {
          const style = window.getComputedStyle(ancestor);
          const horizontallyScrollable =
            style.overflowX === 'auto' && ancestor.scrollWidth > ancestor.clientWidth;
          const clipsHorizontally =
            style.overflowX === 'hidden' ||
            style.overflowX === 'clip' ||
            style.overflowX === 'scroll' ||
            horizontallyScrollable;

          if (clipsHorizontally) {
            const ancestorRect = ancestor.getBoundingClientRect();
            if (elementRect.left < ancestorRect.left || elementRect.right > ancestorRect.right) {
              return true;
            }
          }

          ancestor = ancestor.parentElement;
        }

        return false;
      };

      for (const el of Array.from(document.querySelectorAll('body *'))) {
        const htmlEl = el as HTMLElement;
        const style = window.getComputedStyle(htmlEl);

        // Hidden elements and intentionally off-canvas chrome (fixed/sticky
        // drawers, tooltips) are not defects.
        if (style.display === 'none' || style.visibility === 'hidden') {
          continue;
        }
        if (style.position === 'fixed' || style.position === 'sticky') {
          continue;
        }

        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
          continue;
        }

        // Children deliberately clipped by a carousel, scroll container, or
        // overflow-hidden visual shell are not horizontally stranded content.
        if (isClippedByAncestor(htmlEl)) {
          continue;
        }

        // Horizontal only: below-the-fold content is normal page flow.
        if (rect.left < 0 || rect.right > window.innerWidth) {
          const firstClass =
            typeof htmlEl.className === 'string' ? htmlEl.className.split(' ')[0] : '';
          found.push({
            selector: `${htmlEl.tagName}${htmlEl.id ? `#${htmlEl.id}` : ''}${
              firstClass ? `.${firstClass}` : ''
            }`,
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          });
        }
      }

      return found;
    })) ?? [];

    for (const el of outOfBounds) {
      issues.push({
        ruleId: 'horizontal-out-of-bounds',
        type: 'offscreen',
        message: `Element ${el.selector} extends beyond the horizontal viewport`,
        severity: 'error',
        element: el.selector,
        bounds: { x: el.x, y: el.y, width: el.width, height: el.height },
      });
    }

    return issues;
  }

  async checkAll(page: Page): Promise<LayoutIssue[]> {
    const [overflowIssues, clippingIssues, outOfBoundsIssues] = await Promise.all([
      this.checkOverflow(page),
      this.checkTextClipping(page),
      this.checkOutOfBounds(page),
    ]);

    return [...overflowIssues, ...clippingIssues, ...outOfBoundsIssues];
  }
}
