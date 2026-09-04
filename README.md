# Lint UI

> **Codename: lint-ui**  
> Visual regression testing for modern web applications

Lint UI is an early-stage, local-first CLI for recording responsive page screenshots
and comparing them with approved baselines. Layout and accessibility validation are
planned for v1 but are not connected to the runner yet.

## Features

- 🎯 **Visual Regression Testing** - Screenshot diffs across multiple breakpoints
- 📱 **Responsive Coverage** - Capture configured routes at multiple viewport sizes
- 🧾 **Diff Evidence** - Generate current and pixel-diff images for failures
- ✅ **Baseline Workflow** - Record and approve intentional visual changes
- 🚀 **CI Example** - Run the current visual checks in GitHub Actions

## Quick Start

```bash
# Install dependencies
pnpm install

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

- Runs on every PR
- Caches baseline screenshots
- Posts results as PR comments
- Uploads diff artifacts

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Build specific package
pnpm --filter @lint-ui/cli build

# Run in watch mode
pnpm dev

# Run unit tests
pnpm test
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
