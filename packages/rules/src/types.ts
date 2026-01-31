export interface LayoutIssue {
  type: 'overflow' | 'clipping' | 'overlap' | 'offscreen';
  message: string;
  severity: 'error' | 'warning';
  element?: string;
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
