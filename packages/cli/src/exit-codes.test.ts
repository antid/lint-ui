import { describe, expect, it } from 'vitest';
import type { RunResults } from '@lint-ui/runner';
import { EXIT_QUALITY_FAILURE, EXIT_SUCCESS, exitCodeForResults } from './exit-codes.js';

function results(hasFailures: boolean): RunResults {
  return {
    timestamp: 0,
    hasFailures,
    results: [],
    summary: { total: 0, passed: 0, failed: 0 },
  };
}

describe('exitCodeForResults', () => {
  it('returns zero for a successful quality run', () => {
    expect(exitCodeForResults(results(false))).toBe(EXIT_SUCCESS);
  });

  it('returns one for detected quality failures', () => {
    expect(exitCodeForResults(results(true))).toBe(EXIT_QUALITY_FAILURE);
  });
});
