#!/bin/zsh
# One fresh Claude Code process per milestone, so each milestone starts with an empty context.
#
#   tools/run-milestones.sh [-n count] [-- <extra claude flags>]     default count 2
#
# Run it from the main checkout in your own terminal and leave it. Each round starts `claude -p` with the
# autonomous-run skill and one instruction: ship the current milestone (or choose and ship the next), then end.
# When the process exits, the script checks that `main` moved (a release happened) and starts the next round.
# It stops after `count` releases (Netlify bills by the build: DEPLOY.md allows three merges to `main` a day), when
# a round ends without a release (so a stuck run cannot spin), or when a file named STOP exists in the repo root.
#
# Untested as of 2026-11-11: written from Claude Code's docs (headless mode, `claude -p`), not from a run. Two
# things to check on the first use: that a headless process waits for its background subagents before exiting,
# and which permission flags an unattended run needs on this machine; pass those after `--`.

cd "$(dirname "$0")/.."
count=2
while [ $# -gt 0 ]; do
  case "$1" in
    -n) count="$2"; shift 2 ;;
    --) shift; break ;;
    *) echo "usage: tools/run-milestones.sh [-n count] [-- <extra claude flags>]" >&2; exit 1 ;;
  esac
done

prompt='/autonomous-run You were started by tools/run-milestones.sh with an empty context. Work the current milestone to its release on main (if none is open, choose the next one and ship it). Wait for your background agents instead of ending the turn while any is running. When the release is merged and the Status, RELEASES.md and README line are written and pushed, end: the script starts a fresh process for the next milestone.'

for round in $(seq 1 "$count"); do
  [ -e STOP ] && { echo "STOP file present; stopping before round $round"; exit 0; }
  git fetch -q origin main
  before="$(git rev-parse origin/main)"
  echo "=== round $round of $count, $(date), main at ${before:0:7}"
  claude -p "$prompt" "$@" | tee "/tmp/run-milestones-round-$round.log"
  git fetch -q origin main
  after="$(git rev-parse origin/main)"
  if [ "$before" = "$after" ]; then
    echo "=== round $round ended without a release (main still ${after:0:7}); stopping. Read the current milestone's Status."
    exit 1
  fi
  echo "=== round $round released: main ${before:0:7} -> ${after:0:7}"
done
