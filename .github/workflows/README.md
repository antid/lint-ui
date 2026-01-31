# Lint UI GitHub Actions Workflow

This workflow runs Lint UI checks on every pull request and push to main.

## Features

- ✅ Automatically builds and tests your app
- 📸 Compares screenshots against baseline
- 💾 Caches baseline screenshots for faster runs
- 📊 Posts results as PR comments
- 🎯 Uploads artifacts for investigation

## Setup

1. Copy this workflow to your repository:
   ```bash
   mkdir -p .github/workflows
   cp .github/workflows/lint-ui.yml .github/workflows/
   ```

2. Update the workflow to match your project structure:
   - Update build commands if you're not using Vite
   - Update the server port if different from 4173
   - Update working directories to match your setup

3. Commit and push:
   ```bash
   git add .github/workflows/lint-ui.yml
   git commit -m "Add Lint UI workflow"
   git push
   ```

## How It Works

1. **On PR/Push**: Workflow triggers
2. **Install**: Installs dependencies and Playwright
3. **Build**: Builds your app
4. **Start Server**: Starts preview server
5. **Download Baseline**: Gets cached baseline screenshots
6. **Run Tests**: Executes Lint UI checks
7. **Upload Results**: Saves artifacts
8. **Comment PR**: Posts results to PR
9. **Cache Baseline**: Updates baseline on main branch

## Viewing Results

- **PR Comments**: See summary in PR comments
- **Artifacts**: Download full results from Actions tab
- **Diff Images**: View visual differences in artifacts

## Customization

### Change test routes
Edit `lint-ui.yml` in your project root

### Adjust thresholds
Modify `thresholds` in `lint-ui.yml`

### Add authentication
Configure `auth` section in `lint-ui.yml`

### Test only changed routes
Add `--changed-only` flag to run command
