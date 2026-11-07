# Deploying the wilderness prototype to Netlify

A brief for a local agent. The prototype is a static site: one `index.html`, ES modules under `src/`, a vendored Three.js under `vendor/`. No build step, no dependencies, no environment variables, no serverless functions.

## What to deploy

- Repository: `austin-schaefer/fading-planet`, branch `claude/intelligent-mendel-ca020e` (until it is merged to `main`; then `main`).
- Site root: `prototypes/wilderness/`. Serve that folder as-is; `index.html` is the entry.
- Exclude from the deploy: `prototypes/wilderness/shots/` (about 300 MB of PNG renders, part of the repo's record, not of the site) and `prototypes/wilderness/dist/` (artifact build output, gitignored).
- Everything else in the folder must ship: `src/**`, `vendor/**`, `index.html`. The page loads Three.js from `./vendor/three/` through an import map in `index.html`; nothing is fetched from a CDN. The only external request is Google Fonts (Alegreya), which degrades to a serif fallback if blocked.

`netlify.toml` at the repository root already carries the settings:

```toml
[build]
  base = "prototypes/wilderness"
  publish = "."
  command = "rm -rf shots dist"
```

`base` makes Netlify treat the prototype folder as the project, `publish = "."` is relative to `base`, and the command deletes the two excluded folders from the build's checkout before upload. Leave the dashboard's build command and publish directory blank so the file wins.

## Steps (CLI route, matching Austin's other Netlify repos)

Crib the auth and site-linking from one of the other locally deployed Netlify repos: they will show whether `netlify login` (browser) or a `NETLIFY_AUTH_TOKEN` is in use, and the team slug.

1. From the repository root: `netlify init` (or `netlify link` if a site should already exist). Pick the team, create a new site, name it something like `below-a-fading-star`. When asked for build command and publish directory, accept the values from `netlify.toml`, or leave blank.
2. Confirm the branch: Site configuration → Build & deploy → Branches and deploy contexts. Production branch `claude/intelligent-mendel-ca020e` for now, or `main` after merge. Enable deploy previews for other branches if wanted; nothing in the site needs them.
3. Deploy: pushing the branch deploys automatically once linked. For a one-off manual deploy without the GitHub link: `cd prototypes/wilderness && netlify deploy --prod --dir=.` after removing or moving `shots/` out of the way, because a manual deploy uploads the directory as given and ignores the build command.
4. Open the deployed URL. Expected: the dark title card "Below a Fading Star", the line "the moor is loading…" fading out after a few seconds, then "Go out" enters the scene. Add `?debug=1` to the URL for a landmark teleport panel. Any load error prints in orange at the top-left of the page.

## Checks after the first deploy

- `curl -sI https://<site>.netlify.app/vendor/three/three.module.js | head -1` returns 200 with a JavaScript content type (Netlify sets it from the extension; no headers file is needed).
- The deploy log shows `rm -rf shots dist` ran and the upload is under 5 MB, roughly 70 files.
- On a phone: a thin ring bottom-left is the thumbstick, drag anywhere else to look. On desktop the page asks for pointer lock on "Go out"; Esc pauses.

## Not needed

No `_redirects`, no `_headers`, no functions, no environment variables, no Node version pin (the build command is a shell one-liner). If the Netlify UI insists on a Node version, any works.

## Optional

- A custom domain goes on under Domain management; nothing in the page is origin-dependent.
- If deploy size matters later, `tools/build-artifact.mjs` writes a `dist/` with every import rewritten to relative paths and no import map; it is for the claude.ai artifact host, but it also serves fine from any static host.
