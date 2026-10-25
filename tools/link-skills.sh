#!/usr/bin/env bash
# Mirror .agents/skills/<name> into .claude/skills/<name> as per-skill symlinks.
# Claude Code reads only .claude/skills; the canonical copy is .agents/skills.
# Idempotent. Commit the symlinks it creates.

set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
mkdir -p .claude/skills

for dir in .agents/skills/*/; do
  name=$(basename "$dir")
  [ -f "$dir/SKILL.md" ] || continue
  ln -sfn "../../.agents/skills/$name" ".claude/skills/$name"
  echo "linked $name"
done

# Drop links whose target is gone.
for link in .claude/skills/*; do
  [ -L "$link" ] && [ ! -e "$link" ] && rm "$link" && echo "removed dangling $(basename "$link")"
done
exit 0
