# Lint UI Dogfood and Evidence Log

This is the source record for product decisions and future portfolio evidence. Add an
entry during each meaningful use session; do not wait until the end of the project.

## Metrics

Update these totals as evidence accumulates.

| Metric | Current |
| --- | ---: |
| Real projects integrated | 1 |
| UI work sessions observed | 1 |
| Runs completed | 9 |
| True positives | 4 |
| False positives | 3 |
| False negatives | 0 |
| Execution errors | 0 |
| Real defects prevented | 1 |

## Evidence classification

- **True positive:** Lint UI reports a real, relevant defect or unintended change.
- **False positive:** Lint UI reports a problem that should not require action.
- **False negative:** a relevant defect exists but Lint UI does not report it.
- **Execution error:** the intended checks do not complete.
- **Workflow friction:** the result is correct, but setup or review is unnecessarily hard.
- **Product insight:** usage changes our understanding of the problem or priority.

## Session template

Copy this section for each session.

### YYYY-MM-DD — Short session name

- Project and branch:
- Product change being tested:
- Lint UI version/commit:
- Routes and viewports:
- Run duration:
- Result:
- Classification:
- What Lint UI showed:
- What manual inspection showed:
- Action taken in the application:
- Action taken in Lint UI:
- Evidence paths or links:
- Portfolio relevance:

### 2026-09-04 — Antid Portfolio v9 initial integration

- Project and branch: `antid-website-v9`, `antid/new-concept` (React 18 + Vite).
- Product change being tested: initial responsive baseline for the Mercury portfolio.
- Lint UI version/commit: local `docs-plan-reconciliation` worktree, after M4.
- Routes and viewports: `/` and `/case-studies/codiga` at 375×812, 768×1024,
  and 1440×900 (six cases).
- Run duration: baseline recording 8.5 s; first run 10.8 s; five repeat runs about
  10 s each.
- Result: all six baselines recorded. The first run had four passing cases and two
  homepage failures. Four repeats reproduced that result with no visual diffs; the
  fifth added a tablet case-study visual diff of 0.108% and semantic findings.
  After the Lint UI rule refinement and an application accessibility repair, one
  six-case run passed; the first subsequent repeat again flaked on the mobile
  case study at 0.24% and exposed the same case-study accessibility findings.
- Classification: four true positives, three false-positive rule patterns, and a
  repeatability failure.
- What Lint UI showed: axe found `scrollable-region-focusable` on the homepage's
  horizontally scrollable client-logo row. It also reported 20 clipped-text
  warnings and 45 horizontal-out-of-bounds errors across the two failing
  viewports, concentrated in that intentionally clipped, horizontally scrollable
  logo carousel and its descendants.
- What manual inspection showed: the logo row is intentionally horizontally
  scrollable below 850 px but cannot receive keyboard focus, so the axe finding is
  actionable. The row's clipped descendants are intentional, making the two
  layout-rule patterns noise rather than product defects. The case-study page also
  lacks a `main` landmark and has two serious color-contrast violations; these are
  actionable. The unchanged 0.108% visual diff means its baseline is not yet
  stable enough for CI.
- Action taken in the application: made the horizontally scrollable logo row
  keyboard-focusable and named it; the reproducible scrollable-region finding
  cleared. No exclusions were added. Case-study landmark and contrast repairs
  remain pending because they are intermittent in the current capture state.
- Action taken in Lint UI: refined the clipping rule to require constrained
  vertical overflow and made the out-of-bounds rule ignore descendants clipped
  by intentional horizontal scroll/clip containers. Browser fixtures cover both
  guards, and the follow-up real-project run cleared all 65 carousel findings.
  Investigate why animation disabling/readiness still permits case-study visual
  diffs before promoting this configuration to CI.
- Evidence paths or links: `antid-website-v9/lint-ui.yml`; local
  `.lint-ui/report.json` and `.lint-ui/report.html` in that project.
- Portfolio relevance: first real-project use found an accessibility defect and a
  concrete rule-noise boundary, validating the dogfooding loop.

## Decision log

Record decisions that affect the product contract.

| Date | Decision | Evidence | Consequence |
| --- | --- | --- | --- |
| 2026-09-04 | Position v1 as a local-first UI quality gate, not only a screenshot differ. | Repository audit found working visual comparison plus disconnected layout and accessibility modules. | v1 must join visual, layout, and accessibility results through one trustworthy result model. |
| 2026-09-04 | Keep v1 intentionally narrow. | Configuration and documentation currently advertise several behaviors that execution ignores. | Unimplemented variants, changed-route analysis, hosted review, and design-token enforcement remain explicit non-goals. |
| 2026-09-04 | Defer authenticated flows past v1. | V1_SPEC listed storage-state login as supported while configuration rejects `auth` as unimplemented. | Supported scope is public pages only; storage-state login is an explicit non-goal until a milestone schedules it. |
| 2026-09-04 | Keep the v1 layout set to overflow, out-of-bounds, and clipping. | Broader heuristics (overlap, target size, breakpoint visibility) have no fixtures, thresholds, or noise evidence. | Overlap, minimum-target-size, and breakpoint-visibility heuristics are explicit non-goals for v1. |
| 2026-09-04 | Exclude below-fold flagging from the offscreen check scope. | Wiring all layout checks into the runner flagged reachable below-fold buttons as offscreen warnings on mobile. | checkOffscreenElements stays unwired; v1 ships overflow, out-of-bounds, and clipping only. |

## Baseline repository audit — 2026-09-04

Starting evidence before v1 engineering:

- Screenshot capture and pixel comparison are implemented.
- Layout and axe-core validators exist but are not invoked by the runner.
- Thresholds, variants, authentication, rule toggles, and ignored selectors are parsed
  but do not affect execution.
- `--changed-only` is exposed but unused.
- The configured maximum difference is ignored in favor of hard-coded values.
- Missing baselines currently pass silently.
- The reporter is printed but not written to the path expected by CI.
- `lint-ui init` writes `ui-guard.yml` while reporting `lint-ui.yml`.
- Package test scripts explicitly report that no tests exist.

This audit is the comparison point for the final case study; preserve it even after
the defects are fixed.

## Engineering evidence — M0 foundation

### 2026-09-04 — Replace claims with verified contracts

- Branch: `m0-engineering-foundation`
- Starting condition: no automated tests; advertised options were silently ignored;
  `init` created the wrong filename; quality failures could be caught and converted
  into execution errors by the CLI.
- Change: added configuration and initialization tests, rejected planned options,
  centralized public result/configuration types, defined exit semantics, and made CI
  run tests and type checking.
- Verification: 13 automated tests pass and all workspace packages type-check/build.
- Product insight: an honest, narrow feature set is more valuable than accepting
  configuration that gives users false confidence.
- Portfolio relevance: demonstrates turning a proof of concept into an explicit,
  test-backed product contract before expanding functionality.

### 2026-09-04 — First real-browser visual regression acceptance test

- Project and branch: bundled React/Vite example on `m1-trustworthy-visual-regression`.
- Product change being tested: configurable comparison and explicit result contract.
- Routes and viewports: 4 routes across mobile, tablet, desktop, and large (16 cases).
- Result: baseline recording succeeded; an unchanged build passed 16/16; a deliberate
  white-to-black background change failed 16/16 with diffs from 77.13% to 88.98%;
  the CLI exited with status 1.
- Classification: true positives and product acceptance evidence.
- What Lint UI showed: route/viewport-specific percentages, changed-pixel counts,
  diff image paths, summary totals, and a persisted JSON report.
- Action taken: restored the deliberate application change after verification.
- Product insight: a subtle off-white background experiment fell below pixelmatch's
  configured sensitivity even though raw PNG hashes changed, confirming why pixel
  sensitivity and maximum changed area must be separate, documented controls.
- Portfolio relevance: provides reproducible evidence of both the success and failure
  paths against a real browser rather than mocked-only validation.

### 2026-09-04 — axe-core catches real defects in the demo app

- Project and branch: bundled React/Vite example on `m3-axe`.
- Product change being tested: wiring axe-core into `lint-ui run` with critical/serious fail policy.
- Routes and viewports: 4 routes across mobile, tablet, desktop, and large (16 cases).
- Run duration: full gate (record + run) a few minutes locally.
- Result: first run failed with `color-contrast` (serious) on brand text, buttons,
  and a pricing badge, plus `heading-order` (moderate) from skipped heading levels.
- Classification: true positives.
- What Lint UI showed: rule ID, impact, description, node count, and an example
  selector per violation, per route and viewport.
- What manual inspection showed: `#3b82f6`/`#8b5cf6`/`#10b981` fail 4.5:1 on white;
  Dashboard and Pricing jumped from `h1` to `h3`.
- Action taken in the application: darkened primary/secondary/success palette
  variables and corrected headings to `h2`.
- Action taken in Lint UI: refined the clipping check (ellipsis skip, document
  structure skip after a scrolled-page false positive) and left the noisy
  below-fold offscreen check unwired.
- Evidence paths or links: PR for the M3 axe slice; local `report.json` showed
  16/16 passing with zero findings after the fixes.
- Portfolio relevance: first case of the tool finding genuine defects in its own
  demo target before any external dogfooding.

### 2026-09-04 — Self-test: lint-ui checks its own HTML report

- Project and branch: `report.html` from a local gate run, served over HTTP on `m-report-selfcheck`.
- Product change being tested: the M4 report template (CSS grid, placeholder blocks, no landmarks).
- Routes and viewports: the report page at mobile 375px and desktop 1280px.
- Result: axe reported `color-contrast` (serious, placeholder gray on gray),
  `landmark-one-main` and `region` (both moderate, content outside any landmark);
  the layout check found horizontal overflow at 375px from grid blowout.
- Classification: true positives.
- Action taken in Lint UI: darkened placeholder text, wrapped content in `<main>`,
  added `minmax(0, 1fr)` columns with single-column stacking under 600px.
- Verification: re-ran the same checks after the fix — zero violations and zero
  overflow at both viewports; unit suite and golden snapshot updated.
- Portfolio relevance: closes the loop — the quality gate now passes its own checks.
