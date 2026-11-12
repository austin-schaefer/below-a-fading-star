#!/bin/sh
# Stop hook (.claude/settings.json), the relay's other half: tools/relay.sh explains the whole.
# Runs at the end of every turn. Does nothing unless the session was started by tools/relay.sh (BAFS_RELAY=1) and
# the orchestrator has left .claude/relay-next. Then it records that it fired and ends this Claude Code process,
# so the relay's loop starts a fresh session.
[ "$BAFS_RELAY" = "1" ] || exit 0
dir="${CLAUDE_PROJECT_DIR:-.}"
[ -e "$dir/.claude/relay-next" ] || exit 0
mv "$dir/.claude/relay-next" "$dir/.claude/relay-fired"
# find the Claude Code process among this hook's ancestors (the hook runs under a shell it spawned)
pid=$PPID
for i in 1 2 3 4 5 6; do
  name="$(ps -o comm= -p "$pid" 2>/dev/null)"
  case "$name" in *claude*|*node*) break ;; esac
  next="$(ps -o ppid= -p "$pid" 2>/dev/null | tr -d ' ')"
  [ -n "$next" ] && [ "$next" != "1" ] || break
  pid=$next
done
( sleep 1; kill -TERM "$pid" 2>/dev/null ) >/dev/null 2>&1 &
exit 0
