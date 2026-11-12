#!/bin/zsh
# The release gate: every test, in sequence, one browser at a time.
#
#   tools/suite.sh [port]     default 8123, the working branch's server
#
# Serves this checkout on the port if nothing is listening there (and stops that server afterwards).
# Prints each test's output, then one line per test and a total. Exits 0 only if every test passed.
# A new test earns a `run` line here.

cd "$(dirname "$0")/.."
PORT="${1:-8123}"
B="http://localhost:$PORT"
export SHOT_ANGLE=metal

started=""
if [ -z "$(lsof -ti:"$PORT")" ]; then
  nohup nice -n 10 tools/serve.sh "$PORT" > "/tmp/serve-$PORT.log" 2>&1 &
  started=1
  for i in {1..40}; do curl -s -o /dev/null "$B/" && break; sleep 0.5; done
fi

typeset -a names codes passes
log="$(mktemp)"
run() {
  local name="$1"; shift
  echo "=== $name"
  nice -n 10 node "$@" 2>&1 | tee "$log"
  codes+=("${pipestatus[1]}")
  names+=("$name")
  passes+=("$(grep -c '^PASS' "$log")")
}

echo "=== releases"; tools/release-check.sh | tee "$log"; codes+=("${pipestatus[1]}"); names+=("releases"); passes+=("$(grep -c '^PASS' "$log")")
run music tools/music-score.mjs all
run music-selftest tools/music-score-selftest.mjs
run music-render tools/music-render.mjs all
run dressing tools/dressing-test.mjs $B
run threads tools/threads-test.mjs $B
run paths tools/paths-test.mjs $B
run roads tools/roads-test.mjs $B
run twk tools/twk-test.mjs $B
run regions tools/regions-test.mjs $B
run contrast tools/contrast-survey.mjs $B
run strata tools/strata-test.mjs $B
run livery tools/livery-test.mjs $B
run house tools/house-test.mjs $B
run rocks tools/rocks-test.mjs $B
run walk tools/walk-test.mjs "$B/?q=low"
run hop tools/hop-test.mjs $B
run audio tools/audio-test.mjs "$B/?q=low&only=audio"
run loading tools/loading-test.mjs "$B/?q=low"
run perf tools/perf-test.mjs "$B/?q=low&perf=1&bench=6"
run grass tools/grass-flicker-test.mjs low $B
run touch tools/touch-test.mjs "$B/?q=low"
run gutter tools/gutter-test.mjs $B
run treelod tools/tree-lod-test.mjs $B
run stair tools/stair-test.mjs "$B/?q=low"
run pan tools/pan-test.mjs "$B/?q=medium&perf=1"
run record tools/record-test.mjs "$B/?q=medium&record=6&pos=-190,165"
run artifact tools/build-artifact.mjs > /dev/null

[ -n "$started" ] && lsof -ti:"$PORT" | xargs kill 2>/dev/null
rm -f "$log"

echo "=== SUMMARY"
failed=0
for i in {1..${#names}}; do
  if [ "${codes[$i]}" = 0 ]; then echo "ok    ${names[$i]} (${passes[$i]} PASS lines)"
  else echo "FAIL  ${names[$i]} (exit ${codes[$i]})"; failed=$((failed + 1)); fi
done
echo "=== ${#names} tests, $failed failed"
[ "$failed" = 0 ]
