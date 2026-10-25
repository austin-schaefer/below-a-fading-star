#!/usr/bin/env bash
# Point git at the repo's hooks. Idempotent. Claude Code runs it on every
# session start (.claude/settings.json); run it by hand after a fresh clone.
# core.hooksPath is stored in the shared repo config, so worktrees inherit it.

set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

if [ "$(git config --get core.hooksPath || true)" != "tools/hooks" ]; then
  git config core.hooksPath tools/hooks
fi
