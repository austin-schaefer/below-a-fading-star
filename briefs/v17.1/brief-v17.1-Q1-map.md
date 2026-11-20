Brief: v17.1 Q1, the map (#70)
Worktree: `.claude/worktrees/issue-1751-map`, branch `issue-1751-map`, port 8161. Model: opus. Work only there. `briefs/v17.1/_common.md` first; load `visual-art` for the look.

Goal. The owner: "Teleport menu is overwhelming, and also inscrutable if you don't know place names. Not sure how to solve it. A map, perhaps? And probably fewer total teleportable locations." Today the gear's panel lists every named place under small headings (`src/settings.js`, `PLACES`). Make it a map: the valley drawn from above in the piece's own hand (an old, worn chart, ember and slate, not a game's minimap and not a UI kit: the real shapes of the ground, water, wood, wall and ice, taken from the height and biome functions or baked once into a small image or SVG, whichever is cheaper to load), with a mark for each stand and "you are here". A visitor who knows no name picks by where a thing is and what it looks like: hovering, focusing or tapping a mark says what it is in one plain line ("a drowned tunnel under the mere"), with its name second; a second tap or a click goes there. Cut the stands to about sixteen at most, the ones a visitor would want: decide which, and say which you cut and why. The cut places stay in `LANDMARKS` and keep their cards; only the panel's list shrinks. The plain lines are descriptions, not quotations; write them in the repository's voice, short.

It must work with a mouse, on touch at 390 by 844 (marks big enough for a thumb; the map may pan or the marks may spread), and from the keyboard (arrows or tab between marks, Enter to go), because Q2 will drive the same focus from a gamepad: expose focus movement as functions on the panel's api (`focusNext(dx, dy)`, `activate()`, or what you find cleaner) and tell the orchestrator their names in your first push so Q2 can call them.

Read: `src/settings.js`, `tools/settings-test.mjs`, `world.js`'s `LANDMARKS`, `SITES`, `REGION_CARDS`; issue #52's rule in `orchestrator` (the teleport list stays short).

Done when: the plan's Done when 1; `ONLY=settings,touch,loading` green with new rows (every mark's stand is still checked as before: in view, nothing shutting it within 3 m); frames of the panel at desktop and phone size, open, a mark focused, after going; the blind read; nothing fetched or built for the map until the panel first opens.

What the owner can see: `http://localhost:8123/`, the gear.

Finish and report as `_common.md` says.
