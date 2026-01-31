import { z } from 'zod';

export const BreakpointSchema = z.object({
  name: z.string(),
  width: z.number().positive(),
  height: z.number().positive().optional(),
});

export const RouteSchema = z.object({
  path: z.string(),
  name: z.string().optional(),
  waitFor: z.string().optional(), // CSS selector or 'networkidle'
});

export const VariantSchema = z.object({
  theme: z.array(z.string()).optional(),
  locale: z.array(z.string()).optional(),
  userRole: z.array(z.string()).optional(),
});

export const ThresholdSchema = z.object({
  pixelDiffThreshold: z.number().min(0).max(1).default(0.1),
  layoutShiftThreshold: z.number().default(0.1),
});

export const RulesSchema = z.object({
  checkOverflow: z.boolean().default(true),
  checkClipping: z.boolean().default(true),
  checkAccessibility: z.boolean().default(true),
  checkContrast: z.boolean().default(true),
});

export const AuthSchema = z.object({
  type: z.enum(['cookie', 'localStorage', 'header']).optional(),
  value: z.record(z.string()).optional(),
});

export const ConfigSchema = z.object({
  baseUrl: z.string().url(),
  routes: z.array(RouteSchema),
  breakpoints: z.array(BreakpointSchema).default([
    { name: 'mobile', width: 375, height: 812 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1280, height: 800 },
    { name: 'large', width: 1440, height: 900 },
  ]),
  variants: VariantSchema.optional(),
  thresholds: ThresholdSchema.default({}),
  rules: RulesSchema.default({}),
  auth: AuthSchema.optional(),
  ignoreSelectors: z.array(z.string()).optional(),
  readySelector: z.string().optional(),
  disableAnimations: z.boolean().default(true),
  outputDir: z.string().default('.lint-ui'),
  baselineDir: z.string().default('.ui-baseline'),
});

export type Config = z.infer<typeof ConfigSchema>;
export type Breakpoint = z.infer<typeof BreakpointSchema>;
export type Route = z.infer<typeof RouteSchema>;
