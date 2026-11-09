You are the v7 settings agent for "Below a Fading Star", a Three.js r170 first-person walk in `prototypes/wilderness/` of the Fading Planet repo (static site, no build step, ES modules). Austin, the designer, asked in the v6 release chat (2026-11-08 ~14:20 PST): "please add a settings menu to the next iteration. settings should have volume slider, mute, quality, and a teleport button. also the mouse capture option." You build that menu. It is UI only: no world module, no draw calls, no per-frame work while closed. You run beside `v7-prep`, which adds one comment line to `src/main.js` and edits `src/world.js`, `src/shadows.js`, `wilderness-v5.md` and `runtime.md`; keep your `src/main.js` and `runtime.md` edits minimal and do not touch `src/world.js` or `src/shadows.js`.

Worktree: /Users/user/dev/fading-planet/.claude/worktrees/v7-settings on branch `v7-settings` (`git fetch origin && git merge origin/claude/intelligent-mendel-ca020e` first thing). Work only there, port 8161.

Read first:
- `AGENTS.md`; `.agents/skills/wilderness/SKILL.md`, `runtime.md`, `modules.md`; `briefs/v7/index.md` (the paragraph "Austin, 2026-11-08 ~14:20 PST" and this brief's row); `briefs/v6/brief-v6-02-finish.md` for the format.
- `index.html` (the HUD's CSS: `#mute`, `#dbg-btn`, `#stick`, `#jump`), `src/controls.js` (pointer lock, `setDragLook`, `release`, `placeAt`, the touch look path), `src/audio.js` (`setMuted`, the `mute` gain, `wireMuteButton`), `src/tier.js` (`?q=`, `chooseTier`), `src/hud.js` (the paused card and the `lock` event), `src/debug.js` (its teleport), `src/world.js` (`LANDMARKS`, `SITES`, `SPAWN`, `SUN`), `tools/touch-test.mjs`.

What to build: an in-world settings panel, not the debug panel.

Open calls, with the decided defaults
| Call | Default |
|---|---|
| Where it opens | A small gear button in the top-right corner beside the speaker (#mute) button, on desktop and touch alike, always visible (also under the title card), styled like the existing HUD (hairline circle, bone colour). It sits left of the speaker and, when the debug button shows, left of that. It never overlaps the stick or the hop ring (those are bottom right). |
| Opening and closing | The gear opens the panel and releases pointer lock. The gear, a Close button, or Escape (when the panel is open) closes it. Closing never re-locks: the player clicks the view again, as now. On desktop, Escape while locked releases the lock as the browser does; the panel does not open on that. |
| Volume | A slider 0-100 on a new output gain (`audio.vol`, after the mute gain; the intro ramp on the master gain is left alone). 100 is today's level. Gain follows a squared taper (`(v/100)^2`) so the slider is even to the ear. Remembered in `localStorage` (`fp-volume`). |
| Mute | A toggle on the existing `audio.setMuted`, so the speaker button and the toggle always show one state (`audiochange` on `ctx.events`). The slider value survives it. |
| Quality | Three buttons, low / medium / high, the tiers `?q=` sets; the current tier (`ctx.quality`) is marked. Applies on reload: the choice goes to `?q=<tier>` and carries the player's `pos`, `yaw` and `pitch` as URL params, so they come back where they stood. |
| Teleport | Spawn plus nine named places. Names are the docs' [Proposed] placeholders, read from `LANDMARKS` / `SITES`: Carcanet Keep, The Armiger's Tower, The Sunken Court, The Arcature, The Lattice, The Gradine, the moss light in the Deodand Wood, the Great Span (west gate), Lees Tarn. Stand points are those the v4/v5/v6 docs and `tools/sites-v4.json` use for renders (the causeway at (-40, 22) for the keep, the Arcature's centre, the Lattice's south edge (40, -215), the Gradine's foot, the moss light, the Span's west deck); each faces the thing or, for the court, the sun. Teleporting calls `controls.placeAt` (ground height from `terrain.heightAt`, colliders and the walk limit respected), sets yaw and pitch, closes the panel and fires no cue. The list is Austin's to trim. |
| Mouse capture | A two-way choice: capture on click (pointer lock, as now) or drag to look (no capture). It calls `controls.setDragLook`, which the title card's "mouse trouble" link already uses, and so shares its remembered `fp-draglook` and its label. Hidden on a touch-only device, where there is no mouse. |
| Persistence | Volume, mute and capture mode in `localStorage`; quality in the URL. Every storage read and write is in try/catch. |
| Touch | The panel is finger-sized (rows 44 px or taller) and scrolls inside itself; its scrim stops taps reaching the canvas, so the stick and look never see them. |

Budget: no world module, no draw calls, no per-frame work with the panel closed (no `registerUpdate`, no rAF). New code in `src/settings.js`, loaded by one dynamic import line in `src/main.js` so a fault there cannot stop the world loading. `index.html` gets the gear, the panel markup and its CSS. `src/audio.js` (`vol`, `setVolume`, `audiochange`) is the only other file with more than a line of change.

Tests (`tools/settings-test.mjs`, Playwright, in the style of `tools/touch-test.mjs`; desktop viewport, then a touch context): the gear is visible and clear of the stick and hop ring; the panel opens and closes (gear, Close, Escape); the slider changes `audio.vol`'s gain (and 0 silences it); mute silences and restores with the slider kept; teleport lands within 1 m of the stand point, faces the thing and closes the panel; the capture toggle switches `player.dragLook`; quality writes `?q=<tier>` with `pos` and `yaw`; arrow keys inside the panel do not walk. Existing suites keep their counts.

Rules (binding): never touch `design/`; never `--no-verify`; no game content invented (names and places from the docs and `world.js`); no quality setting lowered as a fix; comments and docs in the present tense; never delete a render.

Docs: a "Settings" paragraph in `runtime.md`, a controls line in `README.md`, the module row in `modules.md`.

Hand-back (under 150 words): what changed, the exact test commands with pass counts, the paths of `shots/wip/settings-01-desktop.png` and `settings-01-touch.png`, and any default taken beyond these.
