# Getting Started with Lint UI

Welcome to Lint UI! This guide will help you set up and run your first visual regression tests.

## Prerequisites

- Node.js 20+
- pnpm 8+

## Installation

The project is already set up as a monorepo. Install dependencies:

```bash
pnpm install
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

rules:
  checkOverflow: true
  checkClipping: true
  checkAccessibility: true
```

## What Gets Checked

### Visual Regression
- Screenshot comparison across breakpoints
- Configurable pixel diff threshold
- Diff images generated for failures

### Layout Validation
- **Horizontal Overflow**: Detects elements extending beyond viewport
- **Text Clipping**: Finds text that's cut off
- **Offscreen Elements**: Identifies important elements outside viewport

### Accessibility
- Built-in axe-core integration
- WCAG compliance checks
- Color contrast validation
- Missing ARIA labels

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
- Runs on PRs and main branch
- Caches baseline screenshots
- Posts results as PR comments
- Uploads artifacts for investigation

## Next Steps

1. **Customize Routes**: Edit `lint-ui.yml` to test your app's routes
2. **Add Breakpoints**: Define custom viewport sizes
3. **Configure Rules**: Enable/disable specific checks
4. **Set Thresholds**: Adjust sensitivity for visual diffs
5. **Integrate CI**: Copy the workflow to your repository

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

## Tips

- Use `readySelector` to wait for data loading
- Add `ignoreSelectors` for dynamic content (timestamps, ads)
- Set `disableAnimations: true` for consistent screenshots
- Use `--changed-only` flag to speed up CI runs (coming soon)

## Support

- 📖 [Full Documentation](README.md)
- 🐛 [Report Issues](https://github.com/yourusername/lint-ui/issues)
- 💬 [Discussions](https://github.com/yourusername/lint-ui/discussions)
