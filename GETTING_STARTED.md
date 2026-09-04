# Getting Started with Lint UI

Welcome to Lint UI! This guide will help you set up and run your first visual regression tests.

## Prerequisites

- Node.js 20+
- pnpm 8+
- Playwright Chromium browser (see below)

## Installation

The project is already set up as a monorepo. Install dependencies:

```bash
pnpm install
```

Install the browser Lint UI drives (one-time per machine; browsers are shared
across projects in the OS cache):

```bash
pnpm --filter @lint-ui/runner exec playwright install chromium
```

Verify the installation:

```bash
pnpm --filter @lint-ui/runner exec playwright install --dry-run chromium
```

Build all packages:

```bash
pnpm build
```

## Quick Start

### 1. Start the Example App

```bash
cd examples/react-vite
pnpm dev
```

The app will start at http://localhost:4173

### 2. Record Baseline Screenshots

In a new terminal, from the `examples/react-vite` directory:

```bash
pnpm --filter @lint-ui/cli dev record
```

This captures baseline screenshots for all routes and breakpoints.

### 3. Run Lint UI Checks

```bash
pnpm --filter @lint-ui/cli dev run
```

This compares current screenshots against baselines and reports any differences.

## CLI Commands

All commands should be run from the `examples/react-vite` directory:

### `init` - Create configuration

```bash
pnpm --filter @lint-ui/cli dev init
```

Creates a `lint-ui.yml` config file (already exists in the example).

### `record` - Record baselines

```bash
pnpm --filter @lint-ui/cli dev record
```

Captures and saves baseline screenshots.

### `run` - Run checks

```bash
pnpm --filter @lint-ui/cli dev run
```

Runs visual regression and compliance checks.

### `approve` - Approve changes

```bash
pnpm --filter @lint-ui/cli dev approve
```

Approves current screenshots as new baselines.

## Configuration

Edit `lint-ui.yml` in the example directory:

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
```

## What Gets Checked

### Visual Regression
- Screenshot comparison across breakpoints
- Configurable pixel sensitivity and maximum changed-pixel percentage
- Diff images generated for failures

### Layout Checks

- Horizontal overflow and out-of-bounds elements fail the case
- Clipped text is reported as a warning

### Accessibility Checks

- axe-core runs on every case; critical and serious impacts fail the case
- Tune with the `accessibility` block (`enabled`, `failImpacts`,
  `excludeRules`, `excludeSelectors`)

## Output Structure

```
.ui-baseline/        # Baseline screenshots
.lint-ui/
  current/           # Current run screenshots
  diff/              # Diff images
  temp/              # Temporary files
```

## Using in CI

A GitHub Actions workflow is provided in `.github/workflows/lint-ui.yml`.

Key features:
- Runs on pull requests to `main` and pushes to `main`
- Caches baseline screenshots
- Attempts to post results as PR comments when the workflow token permits it
- Uploads artifacts for investigation

## Next Steps

1. **Customize Routes**: Edit `lint-ui.yml` to test your app's routes
2. **Add Breakpoints**: Define custom viewport sizes
3. **Integrate CI**: Adapt the workflow to your repository

## Development

### Package Structure

- `packages/cli` - oclif CLI interface
- `packages/runner` - Playwright automation
- `packages/rules` - Validation rules
- `packages/reporter` - Report generation
- `examples/react-vite` - Demo React app

### Building Packages

```bash
# Build all packages
pnpm build

# Build specific package
pnpm --filter @lint-ui/cli build

# Watch mode
pnpm --filter @lint-ui/cli dev
```

### Testing Changes

1. Make changes to package code
2. Rebuild: `pnpm build`
3. Run from example: `pnpm --filter @lint-ui/cli dev run`

## Troubleshooting

### "Config file not found"
Make sure you're in the `examples/react-vite` directory or specify `--config path/to/lint-ui.yml`

### "No baseline screenshots found"
Run `pnpm --filter @lint-ui/cli dev record` first

### Server not responding
Ensure the dev server is running at the configured `baseUrl`

### All tests failing
Check that `baseUrl` in config matches your running server

### Browser errors (`Executable doesn't exist`, `Target crashed`)
The Playwright Chromium binary is missing or incompatible. Reinstall it:

```bash
pnpm --filter @lint-ui/runner exec playwright install chromium
```

If you installed the CLI outside this monorepo, install the browser through the
CLI's own dependency tree so the versions always match (browsers live in the
shared OS cache, so this is one-time per machine):

```bash
# npm / yarn (hoisted binaries)
npx playwright install chromium

# pnpm (strict binaries resolve via the CLI package)
pnpm --package=@lint-ui/cli dlx playwright install chromium
```

## Tips

- Use `readySelector` to wait for data loading
- Set `disableAnimations: true` for consistent screenshots

## Support

- 📖 [Full Documentation](README.md)
- 🐛 [Report Issues](https://github.com/yourusername/lint-ui/issues)
- 💬 [Discussions](https://github.com/yourusername/lint-ui/discussions)
