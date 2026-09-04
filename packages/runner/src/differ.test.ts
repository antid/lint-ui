import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import { VisualDiffer } from './differ.js';

function png(path: string, width: number, height: number, rgba: number[]): void {
  const image = new PNG({ width, height });
  for (let offset = 0; offset < image.data.length; offset += 4) image.data.set(rgba, offset);
  writeFileSync(path, PNG.sync.write(image));
}

describe('VisualDiffer', () => {
  it('reports identical images as a zero-percent match', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'lint-ui-diff-'));
    const baseline = join(directory, 'baseline.png');
    const current = join(directory, 'current.png');
    png(baseline, 2, 2, [0, 0, 0, 255]);
    png(current, 2, 2, [0, 0, 0, 255]);

    const result = await new VisualDiffer().compare(baseline, current);

    expect(result).toMatchObject({ dimensionsMatch: true, diffPixels: 0, diffPercentage: 0, diffImage: null });
  });

  it('returns a visual failure result when dimensions differ', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'lint-ui-diff-'));
    const baseline = join(directory, 'baseline.png');
    const current = join(directory, 'current.png');
    png(baseline, 2, 2, [0, 0, 0, 255]);
    png(current, 3, 2, [0, 0, 0, 255]);

    const result = await new VisualDiffer().compare(baseline, current);

    expect(result.dimensionsMatch).toBe(false);
    expect(result.diffPercentage).toBe(100);
    expect(result.reason).toContain('baseline 2x2, current 3x2');
  });

  it('uses the configured pixel sensitivity', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'lint-ui-diff-'));
    const baseline = join(directory, 'baseline.png');
    const current = join(directory, 'current.png');
    png(baseline, 1, 1, [0, 0, 0, 255]);
    png(current, 1, 1, [20, 20, 20, 255]);

    const sensitive = await new VisualDiffer().compare(baseline, current, 0);
    const tolerant = await new VisualDiffer().compare(baseline, current, 1);

    expect(sensitive.diffPixels).toBe(1);
    expect(tolerant.diffPixels).toBe(0);
  });
});
