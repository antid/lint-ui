# Lint UI Dogfood and Evidence Log

This is the source record for product decisions and future portfolio evidence. Add an
entry during each meaningful use session; do not wait until the end of the project.

## Metrics

Update these totals as evidence accumulates.

| Metric | Current |
| --- | ---: |
| Real projects integrated | 0 |
| UI work sessions observed | 0 |
| Runs completed | 0 |
| True positives | 0 |
| False positives | 0 |
| False negatives | 0 |
| Execution errors | 0 |
| Real defects prevented | 0 |

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

## Decision log

Record decisions that affect the product contract.

| Date | Decision | Evidence | Consequence |
| --- | --- | --- | --- |
| 2026-09-04 | Position v1 as a local-first UI quality gate, not only a screenshot differ. | Repository audit found working visual comparison plus disconnected layout and accessibility modules. | v1 must join visual, layout, and accessibility results through one trustworthy result model. |
| 2026-09-04 | Keep v1 intentionally narrow. | Configuration and documentation currently advertise several behaviors that execution ignores. | Unimplemented variants, changed-route analysis, hosted review, and design-token enforcement remain explicit non-goals. |

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
