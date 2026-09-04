export interface ElementBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutIssue {
  ruleId: string;
  type: 'overflow' | 'clipping' | 'overlap' | 'offscreen';
  message: string;
  severity: 'error' | 'warning';
  // Actionable selector identifying the offending element, when available.
  element?: string;
  bounds?: ElementBounds;
}

export interface AccessibilityViolation {
  id: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  description: string;
  help: string;
  helpUrl: string;
  nodes: number;
}

export interface RuleResult {
  layoutIssues: LayoutIssue[];
  accessibilityViolations: AccessibilityViolation[];
}
