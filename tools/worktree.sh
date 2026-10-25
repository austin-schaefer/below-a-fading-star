#!/usr/bin/env bash
# One worktree per issue.
#
#   tools/worktree.sh new <issue> <slug>   .claude/worktrees/issue-<n>-<slug>, branch issue-<n>-<slug> from origin/main
#   tools/worktree.sh rm <issue>           remove that worktree; delete the branch if it's merged
#   tools/worktree.sh list
#
# Works from the main checkout or from inside another worktree.

set -euo pipefail

main_root="$(cd "$(git rev-parse --git-common-dir)/.." && pwd)"
wt_root="$main_root/.claude/worktrees"

usage() { sed -n '2,8p' "$0"; exit 1; }

case "${1:-}" in
  new)
    n="${2:-}"; slug="${3:-}"
    [ -n "$n" ] && [ -n "$slug" ] || usage
    name="issue-$n-$slug"
    dir="$wt_root/$name"
    [ -e "$dir" ] && { echo "exists: $dir" >&2; exit 1; }
    mkdir -p "$wt_root"
    git -C "$main_root" fetch -q origin main
    git -C "$main_root" worktree add -q -b "$name" "$dir" origin/main
    if [ -f "$dir/wiki/package.json" ] && [ ! -d "$dir/wiki/node_modules" ]; then
      (cd "$dir/wiki" && npm ci --silent)
    fi
    echo "$dir"
    ;;
  rm)
    n="${2:-}"; [ -n "$n" ] || usage
    matches=("$wt_root"/issue-"$n"-*)
    [ -d "${matches[0]}" ] || { echo "no worktree for issue $n" >&2; exit 1; }
    dir="${matches[0]}"; name="$(basename "$dir")"
    git -C "$main_root" worktree remove "$dir"
    git -C "$main_root" branch -d "$name" 2>/dev/null || echo "branch $name kept (not merged)"
    echo "removed $name"
    ;;
  list)
    git -C "$main_root" worktree list
    ;;
  *) usage ;;
esac
