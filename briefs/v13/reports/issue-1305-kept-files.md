# v13 L1, the files, kept: report (2026-11-15)

**Target:** a repeat visit makes at most 2 requests and under 5 KB, its network share near nothing; a first visit's time to the title card and to the first module no worse, better under `--net=fast4g`.

**Baseline** (HEAD `8a52c8e`, built by `netlify.toml`'s command into a copy, served by `tools/sw-site.mjs` with Netlify's headers; `SHOT_ANGLE=metal nice -n 10 node tools/load-probe.mjs http://localhost:<port> --q=low --runs=3 --serial=0 [--net=fast4g] [--params=sw=1]`, the owner's Mac, load average about 3, median [range]):

| | cold ready | repeat ready | repeat: static graph to first module | repeat: over the wire |
|---|---|---|---|---|
| before, plain | 8974 [8388–9019] | 8200 [8021–8553] | 55 | 284 requests (283 304s), 72 KB |
| before, fast4g | 10622 [10592–10730] | 9186 [9144–9340] | 1011 [1004–1034] | 284 requests, 72 KB |
| after, plain | 8950 [8870–8983] | 8368 [8246–8410] | 43 | **1 request (commit.json), 0.3 KB** |
| after, fast4g | 10644 [10630–10659] | **8260 [8195–8340]** | **40 [39–41]** | **1 request, 0.3 KB** |

The live site gets this at release; P0's live baseline was 287 requests and 1.85 MB cold, 281 revalidations and about 1.0 s of 8.0 s on a repeat.

**Result:** a repeat under fast4g is 0.93 s sooner (9.19 → 8.26 s, spreads 2%): its network share is gone (the static graph 1011 → 40 ms), and what is left is compute. Plain (no latency) gains nothing, as it should. A cold load is unchanged; the first module 96 ms sooner under fast4g with `modulepreload` (1925 → 1829, spreads 1%).

## How the worker decides

- Every navigation asks `commit.json` (no-store, 3 s): same commit as a cache holding the page → the page and every file from that cache; another → the network, into a new cache; no answer → the newest cache.
- Netlify's build stamps every response with `X-Fp-Commit` (`_site/_headers`); a response is kept only under the commit its own stamp names.
- Each page (and a Worker it starts) is bound to its page's commit; a file whose stamp is another commit is re-asked past the HTTP cache, then refused, and the page reloads into the new release whole. An unknown page (bindings lost) is refused too, never passed through.
- First visits are not controlled (no claim); after ready the page hands the worker its resource-timing list and the worker reads each file back from the HTTP cache (`force-cache`, what the page got, with its stamp).

## Tried to break it (`tools/sw-test.mjs`, 31 checks)

Deploy mid-load on a module (refused, one reload, whole); deploy between `commit.json` and the page (the page's stamp binds it); two tabs on two commits (each whole; the older kept while open, dropped after; a later import in the older tab that would be the newer release reloads it); a file identical in both releases revalidated by a 304 without a stamp (re-asked, not mistaken); offline (server gone: last release whole); a file cut off mid-body and a 500 (not kept, next load whole); a Worker's own imports (bound to its page); the browser stopping the worker (bindings survive in the meta cache); bindings deleted (refused and reloaded, not passed through); a host that stops stamping (caches dropped, worker steps aside); `?sw=0` (no worker, no cache); localhost without `?sw=1` (nothing registers). Two bugs it found and that are fixed: one page with two refused files reloaded twice and tripped its own breaker; `?sw=0` left the meta cache behind (a late write). It cannot protect a visitor who has no worker yet: their first visit, or anyone's first visit after the release that ships it, loads as today, and a deploy in that second can still mix.

## The first visit's small things (fast4g, 3 runs, `shots/wip/v13-L1-probe-2.txt`)

- `modulepreload` of `main.js`, three and `terrain.js` (the import map moves into `<head>` first): first module 1925 → 1829 ms. Kept.
- The world modules' imports before the terrain bake: cold ready 10567 without, 10644 with; imports+modules 5732 vs 5767. No gain: reverted, `src/main.js` untouched.
- The fonts stylesheet off the critical path: first paint 232 → 108 ms, ready unchanged, but the title paints in Georgia and reflows on the swap (h1 moves 29 px, a paragraph gains a line, the kicker loses its small capitals: `shots/wip/v13-L1-font-{fallback,alegreya}.png`). Reverted: it would look different on every first visit.
- A bundle: not built. The repeat's whole network share was 0.93 s under fast4g and the worker removes it; a cold visit's static graph is 1.9 s under fast4g locally (raw bytes, no compression, which Netlify's brotli cuts to about a third).

## Commands and counts

SUITE_COUNTS

Render pairs at `tools/views-perf.json`'s ten stations, low and medium, HEAD against this branch (`tools/pair-diff.mjs`): 0 to 0.23% changed, all moving water and reeds; HEAD against itself at the two largest was 0.41% and 0.24%, so nothing differs. `tools/terrain-probe.mjs --diff`: every max |d| 0.

## Defaults taken

No `clients.claim`; a 304 is assumed not to carry the stamp; the fonts are not cached by the worker; `?sw=0` is sticky in that browser until `?sw=1`; a refused reload refused again before ready, or a fourth in a minute, turns the worker off for the session; the suite runs `sw` on its port + 1000 (about 13 s added to the wall time). For L3: a Worker is bound through `resultingClientId` on its script's fetch; a browser without `resultingClientId` gets no worker behaviour at all.
