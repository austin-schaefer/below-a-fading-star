#!/usr/bin/env bash
# One worktree per issue.
#
#   tools/worktree.sh new <issue> <slug>   .claude/worktrees/issue-<n>-<slug>, branch issue-<n>-<slug> from origin/main
#   tools/worktree.sh rm <issue>           move its shots/wip files into the deploy worktree's, remove it; delete the branch if it's merged
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
    echo "$dir"
    ;;
  rm)
    n="${2:-}"; [ -n "$n" ] || usage
    matches=("$wt_root"/issue-"$n"-*)
    [ -d "${matches[0]}" ] || { echo "no worktree for issue $n" >&2; exit 1; }
    dir="${matches[0]}"; name="$(basename "$dir")"
    # Ignored files die with the worktree: rescue the wip renders into the deploy worktree first.
    wip=shots/wip
    moved=0
    if [ -d "$dir/$wip" ] && [ -n "$(find "$dir/$wip" -type f -print -quit)" ]; then
      deploy="$wt_root/deploy"
      [ -d "$deploy" ] || { echo "refusing: $deploy is missing, so $name's wip renders have nowhere to go" >&2; exit 1; }
      mkdir -p "$deploy/$wip"
      while IFS= read -r -d '' f; do
        rel="${f#"$dir/$wip/"}"
        mkdir -p "$deploy/$wip/$(dirname "$rel")"
        [ -e "$deploy/$wip/$rel" ] || { mv "$f" "$deploy/$wip/$rel" && moved=$((moved + 1)); }
      done < <(find "$dir/$wip" -type f -print0)
      echo "moved $moved wip file(s) into $deploy/$wip"
    fi
    git -C "$main_root" worktree remove "$dir"
    git -C "$main_root" branch -d "$name" 2>/dev/null || echo "branch $name kept (not merged)"
    echo "removed $name"
    ;;
  list)
    git -C "$main_root" worktree list
    ;;
  *) usage ;;
esac
