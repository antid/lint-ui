# Lint UI

> **Codename: lint-ui**  
> Visual regression and UI compliance testing for modern web applications

Catch layout breaks, accessibility issues, and design system violations before they reach production. Perfect for AI-generated or human-crafted UIs from Figma mockups.

## Features

- 🎯 **Visual Regression Testing** - Screenshot diffs across multiple breakpoints
- ♿ **Accessibility Checks** - Built-in axe-core integration for WCAG compliance
- 📐 **Layout Validation** - Detect overflow, clipping, and layout breaks
- 🎨 **Design System Rules** - Enforce your design tokens and UI contracts
- 🚀 **CI-Ready** - GitHub Actions integration out of the box
- ⚡ **Fast** - Intelligent testing of only affected routes
- 🤖 **AI-Friendly** - Works seamlessly with AI-generated UI code

## Quick Start

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

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

rules:
  checkOverflow: true
  checkClipping: true
  checkAccessibility: true
  checkContrast: true

disableAnimations: true
readySelector: '[data-ui-ready="true"]'
outputDir: .lint-ui
baselineDir: .ui-baseline
```

## What Gets Tested

### Visual Regression
- Pixel-perfect screenshot comparison
- Configurable diff thresholds
- Multiple breakpoints (mobile, tablet, desktop, large)

### Layout Validation
- Horizontal overflow detection
- Text clipping detection
- Off-screen element detection

### Accessibility
- WCAG compliance via axe-core
- Color contrast validation
- Missing ARIA labels
- Tab order issues

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
```

## Documentation

- [Getting Started Guide](GETTING_STARTED.md) - Detailed setup instructions
- [GitHub Actions Setup](.github/workflows/README.md) - CI/CD configuration
- [Schema Reference](lint-ui.schema.json) - Configuration options

## Use Cases

✅ AI-generated UI from Cursor or other tools  
✅ Figma-to-code conversions  
✅ Design system enforcement  
✅ Multi-breakpoint testing  
✅ Accessibility compliance  
✅ Component library regression testing

## License

MIT
