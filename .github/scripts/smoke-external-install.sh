#!/usr/bin/env bash
# External-install smoke test (M6): proves the built CLI works outside the
# monorepo. Deploys @lint-ui/cli with production dependencies to a temp dir,
# then runs init/record/run from a scratch project against the example app
# already serving on :4173. Must run from the repository root.
set -euo pipefail

SMOKE_DIR="${SMOKE_DIR:-$(mktemp -d)}"
PROJECT_DIR="$SMOKE_DIR/project"
mkdir -p "$PROJECT_DIR"

pnpm --filter @lint-ui/cli deploy "$SMOKE_DIR/cli" --prod

cd "$PROJECT_DIR"
node "$SMOKE_DIR/cli/bin/run.js" init
node "$SMOKE_DIR/cli/bin/run.js" record
node "$SMOKE_DIR/cli/bin/run.js" run

echo "External-install smoke test passed."
