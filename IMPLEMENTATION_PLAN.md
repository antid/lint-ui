# Lint UI Implementation Plan

This backlog is ordered to deliver verified vertical slices. A milestone is complete
only when its behavior is automated and documented.

## M0 — Establish truth and safety

- [x] Add a test runner and initial unit/CLI test structure.
- [x] Fix `lint-ui init` to create the advertised `lint-ui.yml`.
- [x] Consolidate duplicated configuration and result types around the runner's
      public contracts.
- [x] Remove or mark unimplemented CLI/configuration options.
- [x] Define initial public statuses, failure policy, and process exit codes. (M1
      expands statuses for missing baselines and execution errors.)
- [x] Add repository checks for build, type checking, and tests.
- [x] Align README claims with implemented behavior.

Exit criteria: a clean checkout builds and tests, and documentation no longer claims
that unimplemented behavior works.

## M1 — Trustworthy visual regression slice

- [x] Resolve configured paths relative to the configuration file.
- [x] Add deterministic route/viewport case IDs and safe filenames.
- [x] Split pixel sensitivity from allowed diff percentage.
- [x] Use configured thresholds throughout the runner.
- [x] Model missing baselines and dimension mismatches as explicit results.
- [x] Guarantee page/browser cleanup with `try/finally`.
- [x] Write `report.json` for every completed run.
- [x] Test record, unchanged pass, changed fail, missing baseline, dimension change,
      navigation error, and approval.

Exit criteria: the example application exercises the entire CLI-to-artifact flow in
automated tests with predictable results and exit codes.

## M2 — Stable capture

- [x] Apply animation-disabling CSS at document creation time.
- [x] Wait for fonts and configurable image readiness.
- [x] Implement configurable selector masking.
- [x] Add navigation, readiness, and capture timeouts.
- [x] Add retry policy only for known transient capture failures.
- [x] Run unchanged-page repeatability tests five times.

Exit criteria: the fixture produces no false visual diffs in five consecutive local
and CI runs.

## M3 — Semantic quality rules

- [x] Introduce a shared rule interface and finding schema.
- [x] Integrate horizontal overflow detection.
- [x] Refine and integrate clipped-text detection using dedicated fixtures.
- [x] Add visible horizontal out-of-bounds detection.
- [x] Integrate axe-core with impact-level failure policy.
- [x] Add rule and selector exclusions with evidence in the result.
- [x] Add a fixture page for every passing and failing rule state.

Exit criteria: deliberate defects are detected, clean controls pass, and findings
identify an actionable selector and rule.

## M4 — Review experience

- [x] Produce a self-contained HTML report from the JSON result.
- [x] Show baseline, current, and diff images together.
- [x] Filter results by status, route, viewport, and category.
- [x] Include selectors, bounds, help links, and concise remediation guidance.
- [x] Keep terminal output brief and CI-friendly.
- [x] Add golden/snapshot tests for report generation.

Exit criteria: a developer can locate the source of a seeded failure from the report
without reading raw logs.

## M5 — Dogfood integration

- [ ] Choose the first real application and record its context in `DOGFOOD_LOG.md`.
- [ ] Add representative routes and mobile/tablet/desktop viewports.
- [ ] Establish stable intentional baselines.
- [ ] Run locally during at least ten UI work sessions.
- [ ] Add a non-blocking CI job, then promote it to blocking after stabilization.
- [ ] Classify every finding and record product changes prompted by usage.
- [ ] Track median duration, false positives, and defects detected.

Exit criteria: a real application uses Lint UI as a blocking quality gate with an
acceptable noise level and documented evidence.

## M6 — External usability and release

- [ ] Finalize package/binary naming and verify registry availability.
- [ ] Support installation and execution outside the monorepo.
- [ ] Document Playwright browser installation clearly.
- [ ] Test macOS, Linux, and GitHub Actions.
- [ ] Add release notes and automated package validation.
- [ ] Ask at least one external developer to complete the first-run flow.
- [ ] Publish the first usable prerelease.

Exit criteria: another developer can install the package, complete the core workflow,
and understand failures without help from the author.

## First engineering slice

Start with M0, then implement the smallest M1 path in this order:

1. Add test infrastructure.
2. Define shared configuration/results and exit behavior.
3. Fix `init` and configuration path semantics.
4. Add tests that expose the current threshold, missing-baseline, and cleanup bugs.
5. Fix those bugs.
6. Persist the JSON report.
7. Update documentation to match the verified behavior.

Do not begin HTML reporting or new heuristics until this slice is green.
