import { z } from 'zod';
import type {
  Breakpoint as RunnerBreakpoint,
  Config as RunnerConfig,
  Route as RunnerRoute,
} from '@lint-ui/runner';

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
  pixelThreshold: z.number().min(0).max(1).default(0.1),
  maxDiffPercentage: z.number().min(0).max(100).default(0.1),
});

export const AccessibilitySchema = z.object({
  enabled: z.boolean().default(true),
  failImpacts: z
    .array(z.enum(['minor', 'moderate', 'serious', 'critical']))
    .default(['critical', 'serious']),
  excludeRules: z.array(z.string().min(1)).default([]),
  excludeSelectors: z.array(z.string().min(1)).default([]),
}).strict();

export const AuthSchema = z.object({
  type: z.enum(['cookie', 'localStorage', 'header']).optional(),
  value: z.record(z.string()).optional(),
});

export const CaptureSchema = z.object({
  navigationTimeoutMs: z.number().int().positive().default(30000),
  readinessTimeoutMs: z.number().int().positive().default(10000),
  imageTimeoutMs: z.number().int().positive().default(10000),
  maskSelectors: z.array(z.string().min(1)).default([]),
}).strict();

const unsupportedOption = (name: string) =>
  z.any().refine(() => false, `${name} is planned but not supported yet`).optional();

export const ConfigSchema = z.object({
  baseUrl: z.string().url(),
  routes: z.array(RouteSchema).min(1),
  breakpoints: z.array(BreakpointSchema).min(1).default([
    { name: 'mobile', width: 375, height: 812 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1280, height: 800 },
    { name: 'large', width: 1440, height: 900 },
  ]),
  variants: unsupportedOption('variants'),
  thresholds: ThresholdSchema.default({}),
  capture: CaptureSchema.default({}),
  accessibility: AccessibilitySchema.default({}),
  rules: unsupportedOption('rules'),
  auth: unsupportedOption('auth'),
  ignoreSelectors: unsupportedOption('ignoreSelectors'),
  readySelector: z.string().optional(),
  disableAnimations: z.boolean().default(true),
  outputDir: z.string().default('.lint-ui'),
  baselineDir: z.string().default('.ui-baseline'),
}).strict().superRefine((config, context) => {
  const duplicateRoute = config.routes.find(
    (route, index) => config.routes.findIndex(candidate => candidate.path === route.path) !== index,
  );
  if (duplicateRoute) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['routes'],
      message: `Duplicate route path: ${duplicateRoute.path}`,
    });
  }

  const duplicateBreakpoint = config.breakpoints.find(
    (breakpoint, index) =>
      config.breakpoints.findIndex(candidate => candidate.name === breakpoint.name) !== index,
  );
  if (duplicateBreakpoint) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['breakpoints'],
      message: `Duplicate breakpoint name: ${duplicateBreakpoint.name}`,
    });
  }
});

export type Config = RunnerConfig;
export type Breakpoint = RunnerBreakpoint;
export type Route = RunnerRoute;
