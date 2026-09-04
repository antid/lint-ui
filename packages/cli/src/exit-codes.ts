import type { RunResults } from '@lint-ui/runner';

export const EXIT_SUCCESS = 0;
export const EXIT_QUALITY_FAILURE = 1;
export const EXIT_EXECUTION_ERROR = 2;

export function exitCodeForResults(results: RunResults): number {
  return results.hasFailures ? EXIT_QUALITY_FAILURE : EXIT_SUCCESS;
}
