export interface Breakpoint {
  name: string;
  width: number;
  height?: number;
}

export interface Route {
  path: string;
  name?: string;
  waitFor?: string;
}

export interface Config {
  baseUrl: string;
  routes: Route[];
  breakpoints: Breakpoint[];
  readySelector?: string;
  disableAnimations: boolean;
  outputDir: string;
  baselineDir: string;
  ignoreSelectors?: string[];
  thresholds: {
    pixelThreshold: number;
    maxDiffPercentage: number;
  };
  capture: {
    navigationTimeoutMs: number;
    readinessTimeoutMs: number;
    imageTimeoutMs: number;
    maskSelectors: string[];
  };
}

export interface ScreenshotResult {
  route: string;
  breakpoint: string;
  path: string;
  timestamp: number;
}

export interface TestResult {
  route: string;
  breakpoint: string;
  status: 'passed' | 'failed' | 'missing-baseline' | 'error';
  passed: boolean;
  visualDiff?: {
    diffPixels: number;
    diffPercentage: number;
    diffImagePath: string;
    reason?: string;
  };
  errorMessage?: string;
  layoutIssues?: Array<{
    type: string;
    message: string;
    severity: 'error' | 'warning';
  }>;
  accessibilityViolations?: Array<{
    id: string;
    impact: string;
    description: string;
    nodes: number;
  }>;
}

export interface RunResults {
  timestamp: number;
  hasFailures: boolean;
  results: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
}
