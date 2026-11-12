#!/bin/zsh
# The relay: one ordinary, interactive Claude Code session per milestone, in this terminal.
#
#   tools/relay.sh [prompt]        default prompt: "/loop 30m /autonomous-run"
#
# Run it from the main checkout instead of typing `claude`. It starts a normal session with the prompt already
# entered; you can watch it, type into it and interrupt it as usual. When the orchestrator has shipped a milestone
# and written everything down, it leaves a marker (.claude/relay-next); the Stop hook (tools/hooks/relay-stop.sh)
# sees the marker at the end of that turn and ends the session; this loop then starts a fresh session, which reads
# the repository and picks up the next milestone with an empty context.
#
# It stops when you quit a session yourself (no marker: the loop does not restart), or when a file named STOP
# exists in the repo root. Sessions started any other way are never touched: the hook does nothing unless this
# script's BAFS_RELAY is in the environment.
#
# Untested as of 2026-11-11 (it cannot be tried from inside the session it would end). First use: see the
# autonomous-run skill, "After a release: start clean".

cd "$(dirname "$0")/.."
prompt="${1:-/loop 30m /autonomous-run}"
export BAFS_RELAY=1
round=0
while :; do
  [ -e STOP ] && { echo "relay: STOP file present; not starting a session"; break; }
  rm -f .claude/relay-next .claude/relay-fired
  round=$((round + 1))
  echo "relay: session $round, $(date)"
  claude "$prompt"
  if [ ! -e .claude/relay-fired ]; then
    echo "relay: the session ended without the orchestrator's marker (you quit, or it crashed); stopping. Run tools/relay.sh again to resume."
    break
  fi
  echo "relay: a milestone shipped; starting a fresh session in 5 s (Ctrl-C to stop)"
  sleep 5
done
