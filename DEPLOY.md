# Deploying to Netlify

Below a Fading Star is a static site: one `index.html`, ES modules under `src/`, a vendored Three.js under `vendor/`. No build step, no dependencies, no environment variables, no serverless functions.

## The site

- Netlify site `below-a-fading-star` (team `austin-schaefer`): https://below-a-fading-star.netlify.app.
- Linked to GitHub `austin-schaefer/below-a-fading-star` through the Netlify GitHub App. No base directory (Build & deploy → Build settings): the site is the repository root. Production branch: `main`.
- Production builds only. Branch deploys and PR deploy previews are off (Build & deploy → Continuous deployment: `allowed_branches = [main]`, `skip_prs = true`, set 2026-11-08 after one day of agent work ran 100 builds, 71 of them branch deploys of the working branch, and used half the month's build minutes). To look at a branch, serve it locally (`tools/serve.sh`) or build the single-file artifact (`tools/build-artifact.mjs`). To re-enable a branch deploy for a demo, add the branch under Branches and deploy contexts and remove it afterwards.
- To deploy, push to `main`. Pushes that touch only docs, briefs, tools, tests or `shots/` skip the build: `netlify.toml`'s `ignore` command builds only when `index.html`, `src/`, `vendor/`, `netlify.toml` or the icons changed since the last built commit.
- Build minutes: Netlify bills each build by the started minute, so the count of builds matters more than their length (these take about 11 s). Batch merges to `main`; one release PR per batch of fixes, not one build per commit.
- Not indexed: `netlify.toml` sends `X-Robots-Tag: noindex, nofollow` on every path, and `index.html` carries a robots meta tag.

## What ships

- Site root: the repository root, served as-is; `index.html` is the entry.
- Excluded: `shots/` (the curated WebP renders, part of the repo's record, not of the site) and `dist/` (artifact build output, gitignored).
- The page loads Three.js from `./vendor/three/` through an import map in `index.html`; nothing is fetched from a CDN. The only external request is Google Fonts (Alegreya), which degrades to a serif fallback if blocked.

`netlify.toml` at the repository root carries the build settings and the noindex header. `publish = "."` is the root, and the build command deletes the two excluded folders from the build's checkout before upload. The dashboard's build command, publish directory and base directory stay blank so the file wins.

## Manual deploy (CLI)

A manual deploy uploads the directory as given and ignores the build command and the `netlify.toml` headers, so stage a copy and run the CLI from it:

```sh
S=$(mktemp -d)/site
rsync -a --exclude shots --exclude dist --exclude .git --exclude node_modules ./ "$S/"
printf '/*\n  X-Robots-Tag: noindex, nofollow\n' > "$S/_headers"
cd "$S" && netlify deploy --prod --no-build --dir . --site below-a-fading-star
```

## Checks after a deploy

- `curl -sI https://below-a-fading-star.netlify.app/vendor/three/three.module.js` returns 200 with `content-type: application/javascript`.
- `curl -sI https://below-a-fading-star.netlify.app/ | grep -i x-robots-tag` shows `noindex, nofollow`.
- The upload is under 5 MB, about 90 files; `/shots/…` returns 404.
- The page shows the dark title card "Below a Fading Star", the line "the moor is loading…" fades out after a few seconds, then "Go out" enters the scene. `?debug=1` adds a landmark teleport panel. Any load error prints in orange at the top-left.
- On a phone: a thin ring bottom-right is the thumbstick, drag anywhere else to look. On desktop the page asks for pointer lock on "Go out"; Esc pauses.

## Optional

- A custom domain goes on under Domain management; nothing in the page is origin-dependent.
- If deploy size matters later, `tools/build-artifact.mjs` writes a `dist/` with every import rewritten to relative paths and no import map; it is for the claude.ai artifact host, but it also serves fine from any static host.
