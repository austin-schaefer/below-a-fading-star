# Deploying to Netlify

Below a Fading Star is a static site: one `index.html`, ES modules under `src/`, a vendored Three.js under `vendor/`. No build step, no dependencies, no environment variables, no serverless functions.

## The site

- Netlify site `below-a-fading-star` (team `austin-schaefer`): https://below-a-fading-star.netlify.app.
- Linked to GitHub `austin-schaefer/below-a-fading-star` through the Netlify GitHub App. No base directory (Build & deploy → Build settings): the site is the repository root. Production branch: `main`.
- Production builds only. Branch deploys and PR deploy previews are off (Build & deploy → Continuous deployment: `allowed_branches = [main]`, `skip_prs = true`, set 2026-11-08 after one day of agent work ran 100 builds, 71 of them branch deploys of the working branch, and used half the month's build minutes). To look at a branch, serve it locally (`tools/serve.sh`) or build the single-file artifact (`tools/build-artifact.mjs`). To re-enable a branch deploy for a demo, add the branch under Branches and deploy contexts and remove it afterwards.
- To deploy, push to `main`. Pushes that touch only docs, briefs, tools, tests or `shots/` skip the build: `netlify.toml`'s `ignore` command builds only when `index.html`, `src/`, `vendor/`, `netlify.toml` or the icons changed since the last built commit.
- Build minutes: Netlify bills each build by the started minute, so the count of builds matters more than their length (these take about 11 s). Batch merges to `main`; one release PR per batch of fixes, not one build per commit.
- Not indexed: `netlify.toml` sends `X-Robots-Tag: noindex, nofollow` on every path, and `index.html` carries a robots meta tag.
- HTTPS only; Netlify provisions the certificate.

## What ships

- Only what the page loads: `index.html`, `src/`, `vendor/`, the two icons, and a generated `commit.json`. The build command in `netlify.toml` copies them into `_site/` (gitignored) and publishes that. Docs, briefs, tools, skills and `shots/` never reach the CDN.
- The page loads Three.js from `./vendor/three/` through an import map in `index.html`; nothing is fetched from a CDN. The only external request is Google Fonts (Alegreya), which degrades to a serif fallback if blocked.
- No environment variables, no secrets, no functions, no forms. Keep it that way: the repository is public and so is every build log.
- Headers on every path (`netlify.toml`): `X-Robots-Tag: noindex, nofollow`, `X-Content-Type-Options: nosniff`, a `Referrer-Policy` and a `Permissions-Policy` that turns off camera, microphone, geolocation, payment and USB.

The dashboard's build command, publish directory and base directory stay blank so the file wins.

## Limits

The site is on Netlify's free plan, and a run of agents can spend a month's allowance in a day if nothing stops it.

- **Builds.** Each build is billed as a started minute. Three guards: the `ignore` command skips every push that doesn't change what the site serves; branch deploys and PR previews are off; and releases are batched, **at most three merges to `main` in a day**. A fix for a broken live site is the exception.
- **PR previews stay off** for a second reason: the repository is public, and a preview would build and publish a stranger's fork.
- **Bandwidth.** The published site is a few megabytes. Assets are generated in code (`DataTexture`, `CanvasTexture`, synthesised sound); a milestone that adds large binary assets needs a reason and a size in its release note.
- **GitHub.** `main` and `next` are protected from force-pushes and deletion, and `main` takes changes only through pull requests. Secret scanning and push protection are on. The pre-commit hook keeps images over 1.25 MB and PNG renders out of history; a repository that grows by gigabytes can't be shrunk without rewriting it.

## Manual deploy (CLI)

A manual deploy uploads the directory as given and ignores the build command and the `netlify.toml` headers, so build the folder and add the headers by hand:

```sh
rm -rf _site && mkdir _site && cp -R index.html src vendor favicon-32.png apple-touch-icon.png _site/
printf '{"commit":"%s"}' "$(git rev-parse --short HEAD)" > _site/commit.json
printf '/*\n  X-Robots-Tag: noindex, nofollow\n  X-Content-Type-Options: nosniff\n' > _site/_headers
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
