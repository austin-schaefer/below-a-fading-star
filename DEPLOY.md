# Deploying the wilderness prototype to Netlify

The prototype is a static site: one `index.html`, ES modules under `src/`, a vendored Three.js under `vendor/`. No build step, no dependencies, no environment variables, no serverless functions.

## The site

- Netlify site `below-a-fading-star` (team `austin-schaefer`): https://below-a-fading-star.netlify.app
- Linked to GitHub `austin-schaefer/fading-planet` through the Netlify GitHub App. Production branch: `claude/intelligent-mendel-ca020e` (switch to `main` after merge, under Site configuration → Build & deploy → Branches and deploy contexts).
- To deploy, push to the production branch, from a local checkout or from a Claude Code on the web session. Netlify builds and publishes on every push. Pushes that don't touch `prototypes/wilderness/` skip the build.
- Not indexed: `netlify.toml` sends `X-Robots-Tag: noindex, nofollow` on every path, and `index.html` carries a robots meta tag.

## What ships

- Site root: `prototypes/wilderness/`, served as-is; `index.html` is the entry.
- Excluded: `shots/` (about 300 MB of PNG renders, part of the repo's record, not of the site) and `dist/` (artifact build output, gitignored).
- The page loads Three.js from `./vendor/three/` through an import map in `index.html`; nothing is fetched from a CDN. The only external request is Google Fonts (Alegreya), which degrades to a serif fallback if blocked.

`netlify.toml` at the repository root carries the settings:

```toml
[build]
  base = "prototypes/wilderness"
  publish = "."
  command = "rm -rf shots dist"
```

`base` makes Netlify treat the prototype folder as the project, `publish = "."` is relative to `base`, and the command deletes the two excluded folders from the build's checkout before upload. The dashboard's build command and publish directory stay blank so the file wins.

## Manual deploy (CLI)

A manual deploy uploads the directory as given and ignores the build command and `netlify.toml` headers, so stage a copy and run the CLI outside the repository (inside it, the CLI reads `netlify.toml` and fails on `base`):

```sh
S=$(mktemp -d)/site
rsync -a --exclude shots --exclude dist prototypes/wilderness/ "$S/"
printf '/*\n  X-Robots-Tag: noindex, nofollow\n' > "$S/_headers"
cd "$S" && netlify deploy --prod --no-build --dir . --site below-a-fading-star
```

## Checks after a deploy

- `curl -sI https://below-a-fading-star.netlify.app/vendor/three/three.module.js` returns 200 with `content-type: application/javascript`.
- `curl -sI https://below-a-fading-star.netlify.app/ | grep -i x-robots-tag` shows `noindex, nofollow`.
- The upload is under 5 MB, about 90 files; `/shots/…` returns 404.
- The page shows the dark title card "Below a Fading Star", the line "the moor is loading…" fades out after a few seconds, then "Go out" enters the scene. `?debug=1` adds a landmark teleport panel. Any load error prints in orange at the top-left.
- On a phone: a thin ring bottom-left is the thumbstick, drag anywhere else to look. On desktop the page asks for pointer lock on "Go out"; Esc pauses.

## Optional

- A custom domain goes on under Domain management; nothing in the page is origin-dependent.
- If deploy size matters later, `tools/build-artifact.mjs` writes a `dist/` with every import rewritten to relative paths and no import map; it is for the claude.ai artifact host, but it also serves fine from any static host.
