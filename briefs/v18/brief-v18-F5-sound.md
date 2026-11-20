Brief: v18 F5, the wood heard
Worktree: `.claude/worktrees/issue-1805-sound`, branch `issue-1805-sound`, port 8185. Model: sonnet. Work only there. `briefs/v18/_common.md` first; load `sound-design` (all of it: the render-measure-look loop, the craft rules, the pacing rules, the palette) before touching anything; the builders' reports in `briefs/v18/reports/`; `stories/the-graffer.md` and `stories/the-patient-wood.md`.

Goal. The Deodand Wood has new things in it and none of them makes a sound. Each find is heard before or as it is seen, and the wood from inside stops being only wind in the canopy. The survey found the owl is hooted from three edge points and never heard inside the wood.

- **The Florilegium** ((-265, 126), `src/v18/florilegium.js`): glass. A thin, high, irregular ticking and ringing as panes cool and moths strike them, heard from about 40 m as something not of the wood; close to, the faint dry rustle of big petals when the heads turn (tie it to the turning if the module exposes it; otherwise to the visitor's movement round the house); the flask's hum, very low. When the sun gutters and the heads all turn west: one soft concerted rustle.
- **The Lower Beds** (door (-249, 172), `src/v18/beds.js`): under the ground the stone room's tail already applies (`below.inside`, `audio/graph.js`; the models are `src/v14/passage-sound.js` and v17's sound for the Garth). A drip in the vault; in the way under, the roots: a slow creak and a wet tick, as of something drinking; in the chamber under the glasshouse, the glass's ticking heard dully through the grate overhead.
- **The stilters** (the grove in the north lobe, `src/v18/stilters.js`): each move sends a `stilter` event on `ctx.events` (read the module for its payload). A step is heard and not seen: a deep creak of green wood and a soft heavy set-down, placed where the stilter is, behind the visitor; never loud, never a jump scare; rare enough to be doubted. At a gutter, when they all move: a few seconds of many such sounds from all round, then nothing. Standing still they are silent, and the grove is a little quieter than the wood (the birds keep away).
- **The spurs and the wood's heart:** the owl heard inside the wood, far off, placed; something small in the litter that stops when the visitor stops. Nothing that loops audibly; pacing as `sound-design` says (events sparse and irregular).

Nothing synthesised harsh (v16's gate failed on roughness); the low tier and phones get the same sounds, fewer voices. Emitters follow the pattern of `src/v15/sound.js` and `src/v17/` sound (a place's emitters started from the module registry; culled by distance). You own audio files under `src/v18/` (`src/v18/sound.js`) and rows in the audio survey and `tools/audio-test.mjs`; touch the audio graph only by a line your report names.

F3 (the Beds) and F4 (the stilters, eyes, moths) merge into `next` while you work: build against their branches' reports and the plan's coordinates, and `git fetch origin && git merge --no-edit origin/next` when I tell you they are in (never check out or merge another agent's branch).

Done when: the plan's Done when 6; `ONLY=audio` green with rows for the new emitters; the audio survey at new poses (the glasshouse at 40 m and at the glass, the vault, the way, the chamber, the grove, the wood's heart) measured as `sound-design` says against the wood's bed today, with the numbers in your report; the stilter's step and the gutter rendered and looked at as spectrograms; a walk from the wood way down the west spur to the glass rendered as audio and looked at.

What the owner can hear: `http://localhost:8171/?pos=-230,127&yaw=1.57`, walking west.

Finish and report as `_common.md` says.
