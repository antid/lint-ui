# Lint UI

> **Codename: lint-ui**  
> Visual regression testing for modern web applications

Lint UI is a local-first CLI for recording responsive page screenshots, comparing
them with approved baselines, and checking layout and accessibility in the same
run — with a self-contained HTML report for every failure.

## Features

- 🎯 **Visual Regression Testing** - Screenshot diffs across multiple breakpoints
- 📐 **Layout Checks** - Failing overflow and out-of-bounds detection, plus
  clipped-text warnings, all with selectors and bounds
- ♿ **Accessibility Checks** - axe-core violations with impact-level failure policy
- 📱 **Responsive Coverage** - Capture configured routes at multiple viewport sizes
- 🧾 **Diff Evidence** - Generate current and pixel-diff images for failures
- 📄 **Self-contained HTML report** - Filter by status, route, viewport, and
  category, with remediation guidance for every finding
- ✅ **Baseline Workflow** - Record and approve intentional visual changes
- 🚀 **CI Example** - Run the current visual checks in GitHub Actions

## Quick Start

```bash
# Install dependencies
pnpm install

# Install the Playwright browser (one-time per machine)
pnpm --filter @lint-ui/runner exec playwright install chromium

# Build all packages
pnpm build

# Run unit tests
pnpm test

# Start example app
cd examples/react-vite
pnpm dev

# In another terminal, record baselines
pnpm --filter @lint-ui/cli dev record

# Run checks
pnpm --filter @lint-ui/cli dev run
```

## Project Structure

```
lint-ui/
├── packages/
│   ├── cli/          # Command-line interface (oclif)
│   ├── runner/       # Playwright browser automation
│   ├── rules/        # Validation rules (a11y + layout)
│   └── reporter/     # Report generation
├── examples/
│   └── react-vite/   # Demo React/Vite app
├── .github/
│   └── workflows/    # CI/CD templates
└── lint-ui.schema.json  # Config validation schema
```

## CLI Commands

All commands use the `lint-ui` binary:

- `lint-ui init` - Create configuration file
- `lint-ui record` - Record baseline screenshots
- `lint-ui run` - Run visual regression and compliance checks
- `lint-ui approve` - Approve current screenshots as new baselines

## Configuration

Create a `lint-ui.yml` file:

```yaml
baseUrl: http://localhost:4173

routes:
  - path: /
    name: home
  - path: /dashboard
    name: dashboard

breakpoints:
  - name: mobile
    width: 375
    height: 812
  - name: desktop
    width: 1280
    height: 800

thresholds:
  pixelThreshold: 0.1
  maxDiffPercentage: 0.1

capture:
  navigationTimeoutMs: 30000
  readinessTimeoutMs: 10000
  imageTimeoutMs: 10000
  maskSelectors: []

accessibility:
  enabled: true
  failImpacts: [critical, serious]
  excludeRules: []
  excludeSelectors: []

disableAnimations: true
readySelector: '[data-ui-ready="true"]'
outputDir: .lint-ui
baselineDir: .ui-baseline
```

## What Gets Tested

### Visual Regression
- Pixel-perfect screenshot comparison
- Configurable pixel sensitivity and maximum changed-pixel percentage
- Multiple breakpoints (mobile, tablet, desktop, large)

Layout checks run as part of `lint-ui run`: horizontal overflow and horizontal
out-of-bounds elements fail the case; clipped text is reported as a warning.
Accessibility checks (axe-core, failing on critical and serious impacts by
default) also run as part of `lint-ui run` and can be tuned per project.
See [the v1 specification](V1_SPEC.md) and
[implementation plan](IMPLEMENTATION_PLAN.md) for their acceptance criteria.

## CI/CD Integration

GitHub Actions workflow included at `.github/workflows/lint-ui.yml`:

- Runs on pull requests to `main` and pushes to `main`
- Restores shared baseline screenshots (records them on first run)
- Attempts to post results as PR comments when the workflow token permits it
- Verifies stability with five consecutive runs
- Smoke-tests an external install outside the monorepo
- Uploads the HTML report, diff images, and logs as artifacts
- Runs build, lint, and unit tests on Ubuntu, macOS, and Windows

## Development

```bash
# Install dependencies
pnpm install

# Install the Playwright browser (one-time per machine)
pnpm --filter @lint-ui/runner exec playwright install chromium

# Build all packages
pnpm build

# Build specific package
pnpm --filter @lint-ui/cli build

# Run in watch mode
pnpm dev

# Run unit tests (set LINT_UI_BROWSER_TESTS=1 to include real-browser tests)
pnpm test

# Lint all packages
pnpm lint
```

## Documentation

- [Getting Started Guide](GETTING_STARTED.md) - Detailed setup instructions
- [GitHub Actions Setup](.github/workflows/README.md) - CI/CD configuration
- [Schema Reference](lint-ui.schema.json) - Configuration options

## Use Cases

✅ AI-generated UI from Cursor or other tools  
✅ Figma-to-code conversions  
✅ Multi-breakpoint testing  
✅ Component library regression testing

## License

MIT
