#!/usr/bin/env bash
# The wip budget: shots/wip is an inbox for the curator, not an archive.
#
#   tools/wip-check.sh          exits 1 when the inbox is over its budget (a line of the gate)
#   tools/wip-check.sh --warn   the same report, always exits 0 (tools/worktree.sh rm prints it)
#
# Counts shots/wip in every worktree of this repository together. Over budget means either
#   more than WIP_MAX_MB megabytes in all (default 1000), or
#   any file older than WIP_MAX_DAYS days (default 4): a merge to main went by and nobody curated.
# The cure is the curator (tools/curate-shots.md), which ends with the curated part of the inbox empty.
# The budget is the owner's (2026-11-18: 26 GB of raw PNGs here had filled his disk); curate, don't raise it.

set -uo pipefail

max_mb="${WIP_MAX_MB:-1000}"
max_days="${WIP_MAX_DAYS:-4}"
warn=0; [ "${1:-}" = "--warn" ] && warn=1

total_kb=0; old=0; report=""
while IFS= read -r wt; do
  d="$wt/shots/wip"
  [ -d "$d" ] || continue
  kb="$(du -sk "$d" | cut -f1)"
  n="$(find "$d" -type f ! -name README.md -mtime +"$max_days" | wc -l | tr -d ' ')"
  total_kb=$((total_kb + kb)); old=$((old + n))
  [ "$kb" -gt 1024 ] || [ "$n" -gt 0 ] && report+="  $((kb / 1024)) MB, $n file(s) older than $max_days days: $d"$'\n'
done < <(git worktree list --porcelain | sed -n 's/^worktree //p')

total_mb=$((total_kb / 1024))
printf '%s' "$report"
bad=0
if [ "$total_mb" -gt "$max_mb" ]; then echo "FAIL wip size: $total_mb MB in shots/wip, the budget is $max_mb MB"; bad=1
else echo "PASS wip size: $total_mb MB of $max_mb MB"; fi
if [ "$old" -gt 0 ]; then echo "FAIL wip age: $old file(s) older than $max_days days were never curated"; bad=1
else echo "PASS wip age: nothing older than $max_days days"; fi
[ "$bad" = 1 ] && echo "Dispatch the curator now (tools/curate-shots.md): keepers to shots/ as WebP, the rest of what it looked at deleted."
[ "$warn" = 1 ] && exit 0
exit "$bad"
