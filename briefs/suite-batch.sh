#!/bin/zsh
cd /Users/user/dev/fading-planet/.claude/worktrees/wilderness-deploy/prototypes/wilderness
export SHOT_ANGLE=metal
B=http://localhost:8123
run() { echo "=== $1"; shift; nice -n 10 node "$@"; echo "exit $?"; }
run dressing tools/dressing-test.mjs $B
run paths tools/paths-test.mjs $B
run regions tools/regions-test.mjs $B
run walk tools/walk-test.mjs "$B/?q=low"
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
run artifact tools/build-artifact.mjs
echo "=== DONE"
