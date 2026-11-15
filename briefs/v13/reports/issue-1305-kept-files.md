# v13 L1, the files, kept: report (2026-11-15, round two)

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
- Proven at runtime before it answers anything: a hidden frame on `/__fp-probe` must say hello from the client its navigation's `resultingClientId` named; otherwise the page unregisters it, flagged off until a new commit. At most one automatic reload a page (`?fp-swr`, removed at once); a second refusal unregisters it the same way. No stamp on `commit.json`: it deletes its caches and unregisters (the kill switch).

## Tried to break it (`tools/sw-test.mjs`: Chromium 43 checks, Firefox 40, WebKit 40)

Deploy mid-load on a module (refused, one reload, whole); deploy between `commit.json` and the page (the page's stamp binds it); two tabs on two commits (each whole; the older kept while open, dropped after; a later import in the older tab that would be the newer release reloads it); a file identical in both releases revalidated by a 304 without a stamp (re-asked, not mistaken); offline (server gone: last release whole); a file cut off mid-body and a 500 (not kept, next load whole); a Worker's own imports (bound to its page); the browser stopping the worker (bindings survive in the meta cache); bindings deleted (refused and reloaded, not passed through); a host that stops stamping (caches dropped, worker steps aside); `?sw=0` (no worker, no cache); localhost without `?sw=1` (nothing registers). Round two added: two tabs on one commit through a stopped worker (the bindings were overwritten: fixed by reading the meta before every write); the breaker tripping and coming back on a new commit; `stamp304` on and off; `commit.json` past its 3 s timeout and answered as HTML; a first-visit fill reading an older page; a `sw.js` that removes itself; one cache entry for the page whatever its query; the modulepreload list against the static graph. Firefox and WebKit found one more: an unregistered worker still running for an open page wrote its meta back (fixed: the page tells each worker before unregistering it, and a redundant worker writes nothing). WebKit's worker does not share the page's HTTP cache, so its first-visit fill downloads the files again after ready (still filed by their own stamps). Round one's bugs: one page with two refused files reloaded twice and tripped its own breaker; `?sw=0` left the meta cache behind (a late write). It cannot protect a visitor who has no worker yet: their first visit, or anyone's first visit after the release that ships it, loads as today, and a deploy in that second can still mix.

## The first visit's small things (fast4g, 3 runs, `shots/wip/v13-L1-probe-2.txt`)

- `modulepreload` of `main.js`, three and `terrain.js` (the import map moves into `<head>` first): first module 1925 → 1829 ms. Kept.
- The world modules' imports before the terrain bake: cold ready 10567 without, 10644 with; imports+modules 5732 vs 5767. No gain: reverted, `src/main.js` untouched.
- The fonts stylesheet off the critical path: first paint 232 → 108 ms, ready unchanged, but the title paints in Georgia and reflows on the swap (h1 moves 29 px, a paragraph gains a line, the kicker loses its small capitals: `shots/wip/v13-L1-font-{fallback,alegreya}.png`). Reverted: it would look different on every first visit.
- A bundle: not built. The repeat's whole network share was 0.93 s under fast4g and the worker removes it; a cold visit's static graph is 1.9 s under fast4g locally (raw bytes, no compression, which Netlify's brotli cuts to about a third).

## Commands and counts

- Whole suite, before round two, after `git merge origin/next` (`tools/suite.sh 8165`): 37 tests, 36 ok, `releases` failing only because the branch is not `next`. sw 31, settings 73, loading 8, perf 28, touch 43, walk 13, pan 1, record ok, artifact ok, audio 101, acts 152, heights 102, edges 103 (every line in `shots/wip/v13-L1-suite-all.txt`).
- After round two (only `index.html`'s inert-on-localhost registration script, `sw.js` and the test tools changed): `ONLY=loading,settings,perf,touch,artifact,sw,walk tools/suite.sh 8165`: 7 tests, 0 failed (settings 73, walk 13, loading 8, perf 28, touch 43, sw 43, artifact ok).
- `SHOT_ANGLE=metal FP_BROWSER=<engine> nice -n 10 node tools/sw-test.mjs 8166`: chromium 43 passed 0 failed (26.6 s), firefox 40/0 (25.2 s), webkit 40/0 (24.4 s).
- The real built site with the round-two worker, one fast4g run after the merge with `next`: repeat 1 request, 0.3 KB, 296 files from the worker, ready 4.78 s (cold 8.96 s; `next`'s L2/L5 work made the compute faster).

Render pairs at `tools/views-perf.json`'s ten stations, low and medium, HEAD against this branch (`tools/pair-diff.mjs`): 0 to 0.23% changed, all moving water and reeds; HEAD against itself at the two largest was 0.41% and 0.24%, so nothing differs. `tools/terrain-probe.mjs --diff`: every max |d| 0.

## Defaults taken

No `clients.claim`; a 304 is assumed not to carry the stamp; the fonts are not cached by the worker; `?sw=0` is sticky in that browser until `?sw=1`; a page the worker sent round reloads once (`?fp-swr`); a second refusal turns the worker off in that browser until `commit.json` names another commit; the suite runs `sw` on its port + 1000 (about 25 s added to the wall time: the 3 s timeout case and two 3 s waits for a replaced tab to leave the back-forward cache). For L3: a Worker is bound through `resultingClientId` on its script's fetch; a browser without `resultingClientId` gets no worker behaviour at all.

## Round three (2026-11-15)

- **No other tab can mix when the worker stops** (the breaker, `?sw=0`, the stamp removed): a stop now refuses new navigations only; a page already bound keeps its own release, each later file checked against its stamp, and one from another release sends it round to a reload the unregistered worker no longer controls. sw-test: a second tab through a trip, and a tab after `?sw=0` in another plus a deploy (refused, reloaded whole, never mixed).
- **No permanent no-op worker:** a controlled page asks the worker for its proof and proves it (or takes it away). In Firefox an unproven worker does not control the page, so the first-visit path proves it; both are tested.
- **The probe also proves a page's own fetch carries its clientId** (`/__fp-probe-sub`).
- **The first return after a deploy**, measured on the built site with `tools/sw-site.mjs --latency=60 --kbps=9000` (shaped at the server: load-probe's `--net` throttles only the page, not the worker's own fetches) and `load-probe --between` restamping every file, 3 runs, median: no worker 6.25 s, 296 requests, 75 KB; worker with stamped 304s 6.26 s, 297 requests, 82 KB; worker with stampless 304s 11.15 s, 593 requests, 5.0 MB, now 8.20 s, 301 requests, 4.9 MB (once a release shows a stampless 304, the rest of its files are fetched whole with `cache: 'reload'`). Local bytes are uncompressed; Netlify's brotli makes them about a third. So if Netlify's 304s carry no stamp (DEPLOY.md's check 3), each visitor's first return after a release costs about a cold load's network (about 1.85 MB live), and every other return costs one request. The fix for that case would be a build-time content manifest that lets the worker trust a revalidated file; not built.
- Nits: the open cache is kept per release; a stamp that disagrees with `commit.json`'s body means the network for that visit, not the kill switch; a put under way when the worker stops is followed by a second delete; the `commit.json` timeout is 1.5 s.
- **Dedicated module Workers (for L3's bake):** a Worker is bound to its page's release through its script's `resultingClientId`; Chromium, Firefox and WebKit all give one (2 bound, 0 fallbacks in each run). Where an engine gives none, the Worker's files come from the network, kept nowhere, only if stamped with the newest release the worker knows. For the first visit, the Worker posts its resource list to the page, which adds it to `window.__fp_fill_extra`. sw-test: a Worker importing two files on a first visit (kept), a controlled repeat (commit.json only) and across a commit (all new).
- `sw-test`: Chromium 50, Firefox 47, WebKit 47, all passing (25 to 27 s). `ONLY=sw,loading,settings,artifact tools/suite.sh 8165`: 4 tests, 0 failed (settings 73, loading 8, sw 50).
