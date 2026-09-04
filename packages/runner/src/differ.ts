import * as fs from 'fs';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

export interface DiffResult {
  diffPixels: number;
  diffPercentage: number;
  diffImage: Buffer | null;
  dimensionsMatch: boolean;
  reason?: string;
}

export class VisualDiffer {
  async compare(
    baselinePath: string,
    currentPath: string,
    pixelThreshold = 0.1,
  ): Promise<DiffResult> {
    const baseline = PNG.sync.read(fs.readFileSync(baselinePath));
    const current = PNG.sync.read(fs.readFileSync(currentPath));

    const { width, height } = baseline;

    // Ensure dimensions match
    if (current.width !== width || current.height !== height) {
      return {
        diffPixels: Math.max(width * height, current.width * current.height),
        diffPercentage: 100,
        diffImage: null,
        dimensionsMatch: false,
        reason: `Image dimensions differ: baseline ${width}x${height}, current ${current.width}x${current.height}`,
      };
    }

    const diff = new PNG({ width, height });

    const diffPixels = pixelmatch(
      baseline.data,
      current.data,
      diff.data,
      width,
      height,
      {
        threshold: pixelThreshold,
        includeAA: false,
      }
    );

    const totalPixels = width * height;
    const diffPercentage = (diffPixels / totalPixels) * 100;

    return {
      diffPixels,
      diffPercentage,
      diffImage: diffPixels > 0 ? PNG.sync.write(diff) : null,
      dimensionsMatch: true,
    };
  }
}
