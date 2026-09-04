# Lint UI v1 Specification

## Product statement

Lint UI is a local-first UI quality gate for web applications. It visits configured
routes at configured viewport sizes and reports visual regressions, high-confidence
layout defects, and accessibility violations with enough evidence to locate and fix
the problem.

The primary audience is developers shipping responsive interfaces, particularly in
AI-assisted development workflows where implementation speed can outpace manual UI
quality assurance.

## v1 promise

Given a running web application and a configuration file, a developer can:

1. Record an intentional visual baseline.
2. Run deterministic checks locally or in CI.
3. See which route and viewport failed and why.
4. Inspect baseline, current, and diff images.
5. Approve an intentional visual change.

The command must exit predictably so it can act as a CI quality gate.

## Supported scope

- Node.js 20 or newer.
- Chromium through Playwright.
- Public pages without authentication.
- YAML configuration in `lint-ui.yml`.
- Explicit routes and viewport sizes.
- Full-page screenshots.
- Local files for baselines and run artifacts.
- Terminal, JSON, and self-contained HTML reports.

## Required capabilities

### Configuration

- Discover `lint-ui.yml` in the working directory or accept `--config`.
- Resolve relative paths from the configuration file, not the shell working directory.
- Reject unknown keys and invalid or duplicate route/breakpoint identifiers.
- Document defaults and generate the same valid defaults with `lint-ui init`.
- Support configurable navigation, readiness, and selector timeouts.

### Capture stability

- Disable CSS animations and transitions when configured.
- Wait for page readiness, fonts, and images.
- Mask configured selectors before screenshot capture.
- Close pages and the browser after success or failure.
- Use deterministic, collision-resistant artifact names.

### Visual regression

- Record baseline screenshots for every route/viewport pair.
- Compare current screenshots with baselines using a configured threshold.
- Treat a missing baseline as an explicit result, never an implicit pass.
- Treat changed image dimensions as a visual failure with a useful explanation.
- Store baseline, current, and diff references in the result.

Threshold semantics for v1:

- `pixelThreshold`: pixelmatch sensitivity in the inclusive range 0–1.
- `maxDiffPercentage`: maximum percentage of changed pixels in the inclusive range
  0–100 before the check fails.

### Layout validation

v1 includes only checks that can produce actionable evidence with acceptably low
noise:

- Horizontal document overflow.
- Visible elements extending beyond the horizontal viewport.
- Clipped text where overflow is not intentionally scrollable.

Each finding includes a stable rule ID, severity, selector, message, and element
bounds when available. Layout errors fail the run; warnings are reported but do not
fail it by default.

### Accessibility validation

- Run axe-core when enabled.
- Preserve rule ID, impact, description, help URL, affected selectors, and node count.
- Allow axe rules and selectors to be intentionally excluded.
- Fail on configured impact levels; default to `critical` and `serious`.

### Reporting and process behavior

- Print a concise summary to the terminal.
- Write structured `report.json` and a self-contained `report.html`.
- Keep diagnostic artifacts when a check fails.
- Exit `0` when all required checks pass, `1` for detected quality failures, and `2`
  for configuration or execution errors.
- Never silently convert a navigation, capture, or comparison error into a pass.

### Baseline approval

- `lint-ui approve` copies only artifacts from a completed run.
- Refuse approval if the current run is missing, incomplete, or does not match the
  current configuration matrix.
- Print exactly which baselines were updated.

## Non-goals for v1

- Hosted artifact storage or review dashboard.
- AI-generated code fixes.
- Figma import or pixel-perfect design-file comparison.
- Design-token or component-library enforcement.
- Cross-browser rendering comparison.
- Automatic route discovery or `--changed-only` source analysis.
- Theme, locale, and user-role matrix expansion.
- Authenticated flows (for example Playwright storage-state login).
- Overlap, minimum-target-size, and breakpoint-visibility heuristics.
- Direct pull-request comment management.
- Performance or Core Web Vitals testing.

These options must not appear as functional configuration or CLI features until
implemented.

## Result model

Every route/viewport case has one status:

- `passed`: all enabled required checks passed.
- `failed`: at least one configured quality rule failed.
- `missing-baseline`: visual comparison could not run because no baseline exists.
- `error`: navigation, capture, validation, or comparison did not complete.

A run records tool version, timestamp, sanitized effective configuration, duration,
case results, aggregate totals, and artifact paths. JSON output is the stable
integration contract; terminal and HTML reports are representations of it.

## Acceptance criteria

v1 is ready when all of the following are true:

- A new user can initialize, record, run, inspect, and approve using documented
  commands in a clean fixture project.
- An unchanged fixture produces zero visual failures across five consecutive runs.
- Deliberate visual, overflow, clipping, and accessibility defects are detected by
  automated end-to-end tests.
- Missing baselines, dimension changes, unreachable pages, and invalid configuration
  produce the documented status and exit code.
- Every documented configuration field changes runtime behavior and has a test.
- CI runs linting, type checking, unit tests, and end-to-end tests.
- The tool is dogfooded on at least one real project for ten working sessions.
- Dogfooding records at least one real defect or a documented conclusion explaining
  why no defect was found.
- Installation and first-run instructions have been validated outside this monorepo.

## Product quality principles

- Prefer a small set of trustworthy findings over a large set of noisy heuristics.
- A failure must explain what happened and where to investigate.
- Configuration is a public contract: accepted settings cannot be ignored.
- Missing evidence is an error state, not a pass.
- Dogfood observations and automated fixtures decide priorities, not README claims.
