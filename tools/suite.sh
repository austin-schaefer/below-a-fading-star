#!/bin/zsh
# The release gate: every test, in sequence, one browser at a time.
#
#   tools/suite.sh [port]     default 8123, the working branch's server
#
# Serves this checkout on the port if nothing is listening there (and stops that server afterwards).
# Prints each test's output, then one line per test with its seconds, a total, and the slowest five. Exits 0 only if every test passed.
# A new test earns a `run` line here.

cd "$(dirname "$0")/.."
PORT="${1:-8123}"
B="http://localhost:$PORT"
# the browser draws on Metal unless SHOT_ANGLE says otherwise (tools/launch.mjs): SHOT_ANGLE=swiftshader tools/suite.sh is the software run

started=""
if [ -z "$(lsof -ti:"$PORT")" ]; then
  nohup nice -n 10 tools/serve.sh "$PORT" > "/tmp/serve-$PORT.log" 2>&1 &
  started=1
  for i in {1..40}; do curl -s -o /dev/null "$B/" && break; sleep 0.5; done
fi

# The port must serve this checkout: another project's server on it answers 200 and every test then loads the wrong
# site (v17.1's first gate ran 40 minutes against the owner's other project on 8123 and failed 38 tests).
if ! curl -s "$B/tools/suite.sh" | cmp -s - tools/suite.sh; then
  echo "FAIL port $PORT does not serve this checkout ($(pwd)): something else is listening there. Pick a free port: tools/suite.sh <port>"
  exit 2
fi

typeset -a names codes passes secs
t_all=$SECONDS
log="$(mktemp)"
# ONLY=settings,strata tools/suite.sh runs just those lines, with the gate's own arguments: the way to rerun what a
# small fix touches, and to try a `run` line when you add it (v9 added one with the wrong URL and found out 25 min later)
run() {
  local name="$1"; shift
  if [ -n "$ONLY" ] && [[ ",$ONLY," != *",$name,"* ]]; then return; fi
  echo "=== $name"
  local t0=$SECONDS
  nice -n 10 node "$@" 2>&1 | tee "$log"
  codes+=("${pipestatus[1]}")
  names+=("$name")
  passes+=("$(grep -c '^PASS' "$log")")
  secs+=($((SECONDS - t0)))
}

if [ -z "$ONLY" ] || [[ ",$ONLY," == *",releases,"* ]]; then echo "=== releases"; tools/release-check.sh | tee "$log"; codes+=("${pipestatus[1]}"); names+=("releases"); passes+=("$(grep -c '^PASS' "$log")"); secs+=(0); fi
if [ -z "$ONLY" ] || [[ ",$ONLY," == *",wip,"* ]]; then echo "=== wip"; tools/wip-check.sh | tee "$log"; codes+=("${pipestatus[1]}"); names+=("wip"); passes+=("$(grep -c '^PASS' "$log")"); secs+=(0); fi # the render inbox within its budget: over it, dispatch the curator (tools/curate-shots.md)
run music tools/music-score.mjs all
run music-selftest tools/music-score-selftest.mjs
run music-render tools/music-render.mjs all
run music-director tools/music-director-sim.mjs
run music-live tools/music-test.mjs $B
run sketches tools/sketch-render.mjs all
run listen tools/listen-test.mjs $B
run settings tools/settings-test.mjs "$B/?q=low&shadows=0&bloom=0"
run dressing tools/dressing-test.mjs $B
run threads tools/threads-test.mjs $B
run paths tools/paths-test.mjs $B
run roads tools/roads-test.mjs $B
run village-plan tools/village-plan-test.mjs
run outline tools/outline-test.mjs # v16-L2: the edge (src/height/outline.js) and Lees Tarn on it, in node
run twk tools/twk-test.mjs $B
run regions tools/regions-test.mjs $B
run contrast tools/contrast-survey.mjs $B
run strata tools/strata-test.mjs $B
run village tools/village-test.mjs $B # v15-V1: the houses' makers at five seeds (closed, in their footprints, colliders and floors that agree) and the row's cost
run ways tools/ways-test.mjs $B # v15-W1: every village way's mouth clear, its landings 1.2 m, no two doubling each other, no dead end
run livery tools/livery-test.mjs $B
run house tools/house-test.mjs $B
run rocks tools/rocks-test.mjs $B
run walk tools/walk-test.mjs "$B/?q=low"
run hop tools/hop-test.mjs $B
run edges tools/edges-test.mjs $B
run heights tools/heights-test.mjs $B
run shore tools/shore-walk-test.mjs $B medium # v17 #1712: what is in shadow does not depend on where the shadow box sits, and 12 steps at three shores do not jump (about 3 min)
run seams tools/seams-test.mjs $B # v15-W5: the floor under the walker against the ground drawn, the village and a 30 m skirt on a 0.25 m grid (seams, floors off the drawing, colliders nothing draws), a ratchet (about 2 min)
run geometry tools/geometry-test.mjs $B # v15-H1 (#64): what flickers, floats or shows its back in every walkable place (about 30 s)
run lift tools/lift-test.mjs $B
run mountains tools/mountains-test.mjs $B
run audio tools/audio-test.mjs "$B/?q=low&only=audio"
run loading tools/loading-test.mjs "$B/?q=low"
run perf tools/perf-test.mjs "$B/?q=low&perf=1&bench=6"
run study tools/study-test.mjs "$B" # v17.1-Q3 (#77): every figure and creature on study.html, the recipes at their seeds
run stilters tools/stilters-test.mjs $B v18-F4-stilters none # v18-F4: the stilters move only unseen (desktop and phone), the ring after a gutter, the eyes shut when looked at (about 4 min)
run grass tools/grass-flicker-test.mjs low $B
run touch tools/touch-test.mjs "$B/?q=low"
run gamepad tools/gamepad-test.mjs $B # v17.1 (#72): a faked pad goes out, walks, looks, hops, hurries, acts and works the panel; no pad, no polling
run acts tools/acts-test.mjs $B
run gutter tools/gutter-test.mjs $B
run treelod tools/tree-lod-test.mjs $B
run stair tools/stair-test.mjs "$B/?q=low"
run pan tools/pan-test.mjs "$B/?q=medium&perf=1"
run record tools/record-test.mjs "$B/?q=medium&record=6&pos=-190,165"
run sw tools/sw-test.mjs $((PORT + 1000)) # v13-L1: the service worker on a site of its own, served on the port 1000 up (about 25 s)
run artifact tools/build-artifact.mjs > /dev/null

[ -n "$started" ] && lsof -ti:"$PORT" | xargs kill 2>/dev/null
rm -f "$log"

echo "=== SUMMARY"
failed=0
for i in {1..${#names}}; do
  if [ "${codes[$i]}" = 0 ]; then echo "ok    ${names[$i]} (${passes[$i]} PASS lines, ${secs[$i]} s)"
  else echo "FAIL  ${names[$i]} (exit ${codes[$i]}, ${secs[$i]} s)"; failed=$((failed + 1)); fi
done
echo "=== ${#names} tests, $failed failed, $(( (SECONDS - t_all) / 60 )) min $(( (SECONDS - t_all) % 60 )) s"
# the slowest five: where a shorter suite is to be found
echo "=== slowest: $(for i in {1..${#names}}; do echo "${secs[$i]} ${names[$i]}"; done | sort -rn | head -5 | awk '{printf "%s %ss  ", $2, $1}')"
[ "$failed" = 0 ]
