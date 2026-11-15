# Brief v13 L4: the heavy builders, kept

Worktree and port: set at dispatch (after L3 is merged). Read `briefs/v13/_common.md` first. Model: strong.

## Goal

A second visit should feel like opening a door already unlocked. After L2, L5 and L3 a repeat visit on low reaches "Go out" in about 3.5 s where it was 7.7 s; the provisional target is 40% of the start, about 3.1 s, and what stands between is the builders that compute the same arrays on every visit. L3 built the store (`src/v13/kept.js`, `ctx.kept(key, compute)`; read `briefs/v13/reports/issue-1306-bake-kept.md` and `world-code/runtime.md`) and converted rocks as the model (315 ms computed, 45 ms from the store). Convert the rest that pay.

L3's estimates of what is computed, not built (serial, low, 1x): vegetation 456 ms (placement and cover; `coverAt`'s tint keeps state from the previous call, so keep its outputs, do not re-call it), galleries 274 (95% `heightAt`), plinths 180 (the feet's field), structures 281 (geometry: keeping attribute arrays, larger records), thrones 179, region-adust 149. Together perhaps 0.9 s on low and 3.5 s with a 4x throttle, on a repeat only.

1. **Measure first**: each candidate's serial build, split into compute and construct (`node tools/load-probe.mjs <base> --q=low --profile`, `?serial=1`), on low and medium. Convert in order of what a repeat saves; stop when the next one saves under about 40 ms on low.
2. **Each conversion is proven identical twice**: `node tools/build-check.mjs <base> --against=<recording on origin/next>` on a cold load (the compute path still gives the same module) and with `--repeat` (the kept path gives the same module), low and medium. A module whose random stream, clearances, colliders, walkables or registrations happen inside the compute must replay those side effects from the kept record or keep them outside it: L3's review checked that rocks draws no rng after `place()`; check the same for each of yours and say so.
3. **The store's size is a cost**: print each record's bytes; say the total per tier; if it passes about 40 MB, keep the cheaper representation (quantised where it is still bit-identical after the round trip, or only the expensive half). A put never blocks "Go out" and never hitches the first seconds of the walk: check with the bench (`?bench=20&perf=1`) on a first visit that the hitch log is still empty while the records are written.
4. **A first visit must not get slower**: the cold probe before and after, three runs. Writing records costs something; if a cold load loses more than about 100 ms on low, write them after ready, in idle time.

## Target, in a visitor's terms

A repeat visit to "Go out" on low at or under 3.1 s on the machine and method the baseline used (`tools/load-probe.mjs --q=low --runs=3`, the repeat column; base and after back to back), medium in proportion; a first visit no slower.

## Not yours

The store's keying and safety (L3's; if you find a hole, say so and fix it small). `sw.js`. The height path.

## Done when

- The table: per module, compute and construct ms before, repeat ms after, record bytes.
- `build-check` identical cold and `--repeat`, low and medium, for every converted module.
- The probe's table, base and after, low and medium, 1x; low at 4x.
- The whole suite on your port, with counts (the builders are many modules).
