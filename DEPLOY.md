# Deploying to Netlify

Below a Fading Star is a static site: one `index.html`, ES modules under `src/`, a vendored Three.js under `vendor/`, and a service worker, `sw.js`. No build step beyond a copy, no dependencies, no environment variables, no serverless functions.

## The site

- Netlify site `below-a-fading-star` (team `austin-schaefer`): https://below-a-fading-star.netlify.app.
- Linked to GitHub `austin-schaefer/below-a-fading-star` through the Netlify GitHub App. No base directory (Build & deploy → Build settings): the site is the repository root. Production branch: `main`.
- Production builds only. Branch deploys and PR deploy previews are off (Build & deploy → Continuous deployment: `allowed_branches = [main]`, `skip_prs = true`, set 2026-11-08 after one day of agent work ran 100 builds, 71 of them branch deploys of the working branch, and used half the month's build minutes). To look at a branch, serve it locally (`tools/serve.sh`) or build the single-file artifact (`tools/build-artifact.mjs`). To re-enable a branch deploy for a demo, add the branch under Branches and deploy contexts and remove it afterwards.
- To deploy, push to `main`. Pushes that touch only docs, briefs, tools, tests or `shots/` skip the build: `netlify.toml`'s `ignore` command builds only when `index.html`, `sw.js`, `src/`, `vendor/`, `netlify.toml` or the icons changed since the last built commit.
- Build minutes: Netlify bills each build by the started minute, so the count of builds matters more than their length (these take about 11 s). Batch merges to `main`; one release PR per batch of fixes, not one build per commit.
- Not indexed: `netlify.toml` sends `X-Robots-Tag: noindex, nofollow` on every path, and `index.html` carries a robots meta tag.
- HTTPS only; Netlify provisions the certificate.

## What ships

- Only what the page loads: `index.html`, `sw.js`, `src/`, `vendor/`, the two icons, a generated `commit.json` (`{"commit":"<short hash>"}`) and a generated `_headers` that stamps every response with the same hash (`X-Fp-Commit`). The build command in `netlify.toml` copies them into `_site/` (gitignored) and publishes that. Docs, briefs, tools, skills and `shots/` never reach the CDN.
- The page loads Three.js from `./vendor/three/` through an import map in `index.html`; nothing is fetched from a CDN. The only external request is Google Fonts (Alegreya), which degrades to a serif fallback if blocked.
- No environment variables, no secrets, no functions, no forms. Keep it that way: the repository is public and so is every build log.
- Headers on every path (`netlify.toml`): `X-Robots-Tag: noindex, nofollow`, `X-Content-Type-Options: nosniff`, a `Referrer-Policy` and a `Permissions-Policy` that turns off camera, microphone, geolocation, payment and USB; `X-Fp-Commit` from the build's `_headers`; `Cache-Control: no-cache` on `/sw.js` and `/commit.json`, so both are asked again on every visit.

The dashboard's build command, publish directory and base directory stay blank so the file wins.

## The service worker

`sw.js` (v13-L1) makes a repeat visit fetch almost nothing: one request, `commit.json`, where a visit without it revalidates all of about 290 files. It never serves a mix of two releases, which would break an ES-module site. `sw.js`'s header comment is the full account; `node tools/sw-test.mjs` is its proof (in the suite as `sw`; `FP_BROWSER=firefox|webkit` runs it in those engines).

- **Keyed by the commit.** One cache per commit. Every navigation asks the network for `commit.json` (no-store, 3 s): the same commit as a cache means the page and its files come from that cache with no request; another commit means the page and its files come from the network into a new cache, and the old one is dropped once no open tab uses it; no answer (offline, slower than 3 s) means the newest cache as it is. A file is kept only under the commit its own `X-Fp-Commit` names, and a page is bound to its page's commit: a file from another release (a deploy landing mid-load) is refused and the page reloads into the new release whole.
- **Where it runs.** `index.html` registers it only when `commit.json` answers with a matching stamp (so on Netlify), after a first visit's load; that first visit is not controlled and loads exactly as without it. The worker then proves on a hidden frame that this browser names the pages its navigations make (the probe); until it has, it answers nothing, and if it cannot, the page unregisters it. Then the first visit hands it the list of what it fetched. Never on localhost unless `?sw=1` (`tools/serve.sh` has no `commit.json`, so every other test runs with no worker), never in `tools/build-artifact.mjs`'s copy.
- **How a release replaces it.** Nothing to do: the next navigation after a deploy sees the new commit. A changed `sw.js` installs on a later navigation (the browser rechecks it, `no-cache`) and takes over at once (`skipWaiting`); its caches are named `fp1-<commit>`, and a worker with a new prefix drops the old ones.
- **At most one automatic reload.** A page the worker sent round reloads once (marked `?fp-swr=1`, removed from the address at once). If that page is refused too, the worker is unregistered, its caches deleted, `localStorage['fp-sw']` set to `fail:<commit live then>`, and the page goes once more to the plain network (`?fp-swr=2`, which never reloads). It is not registered again in that browser until `commit.json` names another commit. A failed probe sets the same flag.
- **The first visit after a deploy** is not protected if the visitor has no worker yet (their very first visit, or anyone's first visit after the release that ships it): a deploy landing in the second or so while the page loads can still mix, as before the worker.
- **Turning it off.** For one browser: `?sw=0` unregisters it, deletes its caches and keeps it off until `?sw=1`. For everyone at once, the kill switch: **remove the `X-Fp-Commit` line from the build's `_headers`** (`netlify.toml`'s command). On the next navigation every worker finds `commit.json` unstamped, deletes its caches and unregisters itself, and `index.html` registers nothing without the stamp (both in `tools/sw-test.mjs`). To take the code out as well, ship an `index.html` without the `sw-register` script and this `sw.js`, which removes itself and its caches on its first update:

  ```js
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => /^fp\d*-/.test(k)).map((k) => caches.delete(k)))).then(() => self.registration.unregister())));
  ```

- **What could not be checked before it is live**, and the three commands to run after the release that carries it (all read-only):
  1. `curl -sI https://below-a-fading-star.netlify.app/ | grep -iE 'x-robots-tag|x-fp-commit'` must show both `X-Robots-Tag: noindex, nofollow` (netlify.toml) and `X-Fp-Commit: <the deployed short hash>` (the build's `_headers`): Netlify merges the two. If the stamp is missing the worker behaves as not installed (it never registers, and one already installed removes itself); if `X-Robots-Tag` is missing, `_headers` replaced netlify.toml's rules and must be fixed.
  2. `curl -sI https://below-a-fading-star.netlify.app/src/main.js | grep -iE 'x-fp-commit|cache-control'` must show the same hash as `curl -s https://below-a-fading-star.netlify.app/commit.json`: the stamp and the bytes come from one deploy. Run it again within a minute of a later deploy: the hash must flip on `commit.json` and `main.js` together.
  3. `E=$(curl -sI https://below-a-fading-star.netlify.app/src/main.js | grep -i '^etag' | cut -d' ' -f2 | tr -d '\r'); curl -sI -H "If-None-Match: $E" https://below-a-fading-star.netlify.app/src/main.js | grep -iE '^HTTP|x-fp-commit'` shows a 304, with or without the stamp: either works (without it, the worker asks past the HTTP cache once more), so this only says which path visitors take.
  And `curl -sI https://below-a-fading-star.netlify.app/sw.js | grep -i cache-control` shows `no-cache`. A repeat load: `node tools/load-probe.mjs https://below-a-fading-star.netlify.app --runs=3` shows "over the wire" near 1 request on the repeat.

## Limits

The site is on Netlify's free plan, and a run of agents can spend a month's allowance in a day if nothing stops it.

- **Builds.** Each build is billed as a started minute. Three guards: the `ignore` command skips every push that doesn't change what the site serves; branch deploys and PR previews are off; and releases are batched, **at most six merges to `main` in a day**. A fix for a broken live site is the exception.
- **PR previews stay off** for a second reason: the repository is public, and a preview would build and publish a stranger's fork.
- **Bandwidth.** The published site is a few megabytes. Assets are generated in code (`DataTexture`, `CanvasTexture`, synthesised sound); a milestone that adds large binary assets needs a reason and a size in its release note.
- **GitHub.** `main` and `next` are protected from force-pushes and deletion, and `main` takes changes only through pull requests. Secret scanning and push protection are on. The pre-commit hook keeps images over 1.25 MB and PNG renders out of history; a repository that grows by gigabytes can't be shrunk without rewriting it.

## Manual deploy (CLI)

A manual deploy uploads the directory as given and ignores the build command and the `netlify.toml` headers, so build the folder and add the headers by hand:

```sh
rm -rf _site && mkdir _site && cp -R index.html sw.js src vendor favicon-32.png apple-touch-icon.png _site/
printf '{"commit":"%s"}' "$(git rev-parse --short HEAD)" > _site/commit.json
printf '/*\n  X-Robots-Tag: noindex, nofollow\n  X-Content-Type-Options: nosniff\n  X-Fp-Commit: %s\n/sw.js\n  Cache-Control: no-cache\n/commit.json\n  Cache-Control: no-cache\n' "$(git rev-parse --short HEAD)" > _site/_headers
netlify deploy --prod --no-build --dir _site --site below-a-fading-star
```

## Checks after a deploy

- `curl -sI https://below-a-fading-star.netlify.app/vendor/three/three.module.js` returns 200 with `content-type: application/javascript`.
- `curl -sI https://below-a-fading-star.netlify.app/ | grep -i x-robots-tag` shows `noindex, nofollow`.
- `/shots/`, `/tools/`, `/AGENTS.md` and `/.agents/skills/README.md` do not serve repository files (`curl -s https://below-a-fading-star.netlify.app/AGENTS.md | head -c 80` shows the page's HTML or a 404, never the markdown).
- The page shows the dark title card "Below a Fading Star", the line "the moor is loading…" fades out after a few seconds, then "Go out" enters the scene. `?debug=1` adds a landmark teleport panel. Any load error prints in orange at the top-left.
- On a phone: a thin ring bottom-right is the thumbstick, drag anywhere else to look. On desktop the page asks for pointer lock on "Go out"; Esc pauses.

## Optional

- A custom domain goes on under Domain management; nothing in the page is origin-dependent.
- If deploy size matters later, `tools/build-artifact.mjs` writes a `dist/` with every import rewritten to relative paths and no import map; it is for the claude.ai artifact host, but it also serves fine from any static host.
