# v13 L2, the height core: report (2026-11-14, 23:46 PST; round two 2026-11-15, 00:50)

**Target:** seconds to "Go out", cold, low 1x (brief: 8.1 s to 6.0 s or under), with the terrain bake's and the builds' height time halved and every height bit-identical.
**Baseline** (`SHOT_ANGLE=metal nice -n 10 node tools/load-probe.mjs http://localhost:8163 --q=<q> --runs=3 [--throttle=4]`, the base tree `39e1e25` served from a scratch copy on 8163, interleaved with the result on the same port, the owner's Mac, load average 3 to 6, other agents' browsers beside): low cold **11.06 s** [9.65–11.09], medium 14.09 s [12.39–15.80], low at 4x CPU (phone stand-in) 32.14 s [31.90–32.31]. (Slower than P0's 8.1 s: the machine tonight; the pairs ran minutes apart.)
**Result**, same command, same port, a minute later: low cold **6.08 s** [5.96–6.77] (−45%), medium **8.69 s** [8.14–9.12] (−38%), low 4x **20.22 s** [19.99–20.28] (−37%). Spreads 13%, 11%, 1%; every gain is several times its spread.

| median ms (cold) | low before / after | medium before / after | low 4x before / after |
|---|---|---|---|
| READY | 11060 / 6084 | 14094 / 8685 | 32138 / 20222 |
| terrain bake (the longest stall) | 2657 / 1431 | 4705 / 2527 | 8517 / 4971 |
| module builds, serial sum | 6589 / 3630 | 7352 / 5129 | 21104 / 13094 |
| longest stall | 2718 / 1480 | 4839 / 2639 | 8689 / 5136 |
| requests | 287 / 299 | | |

The bake is 46% faster on low, the builds 45%. Tables: `shots/wip/v13-L2-probe.txt` (and the `-before-*`/`-after-*` JSON).

**Machine-independent numbers.** `node tools/height-check.mjs bench` (node, the low bake's 103,041 vertices): heightAt 5.65 to 2.74 µs a call; inside the bowl (r < 300, where the builds sample) 4.04 to 1.19 µs; on the wall 6.70 to 2.96 µs. `--profile` on low (`shots/wip/v13-L2-profile-low.txt`, against P2's `v13-P2-low.txt`): heightAt inclusive 42% of the load's CPU to 37.3% of a load a third as long (12.9 s to 2.0 s of profiled CPU); the builds' heightAt 4235 ms to 1244 ms for the same 736,928 calls (5.7 to 1.7 µs a call); noise2 calls in the whole load 74.5M to 41.7M; the bake's 399,267 heightAt calls unchanged (the same samples, cheaper).

## What changed
- `tools/height-check.mjs` (new, node only): heightAt (exact and coarse), WALL_SAMPLE, slopeAt, normalAt, biomeAt, regionAt, waterLevelAt, causewayDistance, riverAt at 849,729 fixed points and every attribute of both bakes, compared by their bits against a recording made before any change; `pure` mode imports the heightfield with three refused and no location/document/window; `bench`; `--params`; `--quick`.
- Exact speed-ups (part 1): noise2's gradients from flat typed tables; heightAt skips the landmarks', tarn's, fen's (a warped2: ten noise2) and orchard's blocks where their smoothsteps are certainly 0 (squared test with a margin, never for h = ±0), the road bed's distance bounded at 8 m; glacierMask exits north of z −200; regions: tight boxes for the regions' own blend and the weights by index; the massifs: no spur push inside r 352, spurs out of reach skipped before their noise (|noise2| ≤ 0.998, measured; bounded at 1.1), a couloir family's empty sector before its wander, zero-weighted noise skipped, holdOf once; biome's wood and crystal blotches only in reach; the bake's moss only below y 2; slopeAt without a Vector3; the leads' siteCost; the Outwash's channel noise once a point, not 174 times.
- Worker-ready (part 4): `src/height/field.js` (heightAt and its queries, out of terrain.js, which keeps the bake and material and re-exports), `src/height/regions.js` (shapes, weights, regionsHeight, the coarse pass), `src/v4/regions/height/<key>.js` (each region's height hook, imported back and re-exported by its module), `src/v4/ranges.js` (the far ranges' meshes and buildMountains; mountains.js is now pure; main.js one line), `src/height/params.js` (mountains, cols, ridge read once; a worker takes the page's query as its `name`). routes.js imports from src/height/.
- `tools/load-profile.mjs`: its call counter rewrites src/height/field.js (it would have counted nothing after the split).
- `?bakeslope=mesh` (part 3, off): see below.

## Checks
- Round one's check (849,729 points, hashes, a recording made in this worktree): all PASS; replaced by round two's audit below.
- terrain-probe fingerprint, base vs after, low and medium: max |dh| 0, every attribute max |d| 0.
- Render pairs at `tools/views-perf.json`, low (`shots/wip/l2-base-a-*`, `l2-base-b-*`, `l2-after-*`; `v13-L2-pairs.txt`): base-a vs after within base-a vs base-b at every station (spawn 1/0, causeway 0/0, tarn 189/180, fen 18/14, wood 14/14, sun 3/3, lattice 43/27, wrongcolour 1306/1304, taverna 15 vs noise 35091, herd 2 vs 844 px).
- Whole suite (`tools/suite.sh 8163`, after merging origin/next): 35 of 36 ok (music 207, settings 73, paths 76, regions 56, rocks 32, walk 13, edges 103, heights 102, mountains 4, audio 101, loading 8, perf 28, touch 43, acts 152, treelod 71, record 16/16, the rest ok); `releases` fails only on "HEAD is not next" and "commits not on origin/next", as on any branch. After round two's params change: `ONLY=walk,mountains,heights,loading` 4 of 4 ok.

## Round two: the audit (2026-11-15, 00:31 to 00:44)
The recording is now made by the tip's tool in a worktree at the base, `56ccff9` (`git merge-base HEAD origin/next`), and checked at the tip `fff2031`:
```
git worktree add /tmp/bafs-l2-base 56ccff9 && cp tools/height-check.mjs /tmp/bafs-l2-base/tools/
node /tmp/bafs-l2-base/tools/height-check.mjs record /tmp/hc-base.bin [--params=mountains=v4|cols=low|ridge=0]
node tools/height-check.mjs check /tmp/hc-base.bin [--params=...]; node tools/height-check.mjs pure /tmp/hc-base.bin [--params=...]
```
Every recording's header says `56ccff9 (src/ clean)`. Raw values (58 per point) compared as 64-bit patterns at 1,427,272 points (1,427,181 for mountains=v4), both bakes' attributes as 32-bit: **all PASS, for the default and all three variants, check and pure; 160 PASS lines, no FAIL** (`shots/wip/v13-L2-audit.txt`). New samples sit on every skip's edge (the blocks' reach and beyond()'s own radius, both boxes of every region, r 284 and 352, z −200, the bed's 7.5 and 8 m, the Span, the icefall, a denser wall past r 315), and regionAt is checked with the air's blend into a caller's object. |noise2| < 1.1 asserted (largest of 2M samples 0.9978). Nothing differed, so no code changed for it. `src/height/params.js` is explicit: on the page from the URL; off it only from `globalThis.FP_HEIGHT_PARAMS` (else the import throws); `HEIGHT_PARAMS_KEY` is the cache key's string.

## The slope question (part 3), for the orchestrator
`?bakeslope=mesh` takes the biome's slope from the mesh a cell either side instead of slopeAt's four heightAt at 0.6 m. Not identical, so it is **off**. Node bake: low 1.28 to 0.74 s (−0.53 s), medium 2.85 to 1.55 s (−1.3 s); the browser would save about as much again at 4x. height-check against the recording: low colour 34,377 of 309,123 values differ (4,819 by over 1/255, max 0.44), aIce 1,552, aRock 6,631, aGlac 100; medium colour 73,560 of 694,083 (7,565 over 1/255). Render pairs (after vs mesh): low lattice 20,341 px (3.1%, noise 27: the moraine's ice and crystal ground move), wrongcolour 12,690 (1.9%, noise ~1,300), tarn 75; medium all within noise but tarn 517. Visible on low: a different look, so the brief's rule keeps it off.

## Not done, and why
- **The memo (part 2):** after the speed-ups the builds' heightAt is 1.24 s on low and 20.7% of its calls repeat a point: at most ~0.25 s, against a cache that must track three side channels (WALL_SAMPLE, the coarse pass, the leads being built). Not built.
- **What is left before a Worker can run the bake:** heightAt, slopeAt, biomeWith, riverSection, WALL_SAMPLE and the leads all import in a worker now (`height-check pure`). Left on the main side: the colour loop's THREE.Color (constants are sRGB to linear; lerp/multiplyScalar are plain arithmetic), `regionsGround` (the eight regions' ground hooks, still in their three-importing modules), `placesGround` (v8/places.js), PlaneGeometry's float32 positions and computeVertexNormals. A worker must call `prepareMap()` itself (the leads, ~0.4 s, computed again unless sent) and `setRegionsCoarse(cell)` for its bake; its WALL_SAMPLE is its own. The cheapest split for L3: the worker computes heights, WALL_SAMPLE and the per-vertex slope and biome; the main thread colours.
- Still slow on low (serial): vegetation 583 ms, structures 353, plinths 340, galleries 319 (95% heightAt, 61% repeats), rocks 296: the builders that are not height are L5's.

## Defaults taken
- The base for "before" is `39e1e25` served from a scratch archive on my port, interleaved, not P0's earlier numbers (machine state differs).
- `|noise2| < 1` is measured (0.99789 after hill-climbing), not proved; the bounds use 1.1.
- A region module whose `height` is not its `v4/regions/height/` file throws at load (silently ignoring a hook would be worse).
