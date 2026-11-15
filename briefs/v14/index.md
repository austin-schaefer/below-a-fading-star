# v14, the Depths: dispatch plan

The milestone doc is `plans/wilderness-v14.md`. Briefs are written in full only for the next batch. Shared rules: `_common.md`. Reports: `reports/`.

## Batch 1 (out 2026-11-15)

| Brief | Owns | Shared files it may touch |
|---|---|---|
| **D0** the first descent | `src/v14/` (new), `src/v5/nave*` | a line or two each in `src/main.js` (MODULES), `src/world.js`, `src/settings.js`, `src/audio/graph.js`, `bed.js`, `steps.js`, `src/post.js`, `tools/settings-test.mjs`, `tools/edges-test.mjs` |
| **B1** the acts' faults (#38 #39 #40 #43 #46) | `src/v10/`, the pause and settings panels (`src/hud.js`, `src/settings.js` panel code) | `src/controls.js` only for Escape |
| **B2** the heights' faults (#41 #47 #48 #49 #50 #51) | `src/v12/`, `src/v4/paths/`, the Lattice's bridge, lamps and chains wherever they live | none expected |
| **B3** names and the Pomegranate House (#52 #42) | `src/v8/house*`, place cards | `src/world.js` LANDMARKS and `src/settings.js`'s place list (D0 adds one line to each: keep yours apart from the Nave's) |

## Batch 2 (out 2026-11-15; briefs D1, D2, B4 beside this file)

- **D1 the passage and the Pit:** from the Nave under the ground to the Pit's floor (155 m as the crow flies; it need not be straight), the disc of sky, the wind from below, a way up and out. Reuses whatever D0 built for dark, sound and sealing.
- **D2 what is found down there:** a chamber on the way, something that belongs to someone already in the valley (the Reckoner's "Two floors, or one?", the tesserae, the Sexton's other forty graves, the Hawser's chain that goes into the ground: `stories/`), one act with something that happens next, and its story file.
- **D3, if D0 shows the need:** the way down seen from the road; lights to steer by.
- Whatever batch 1's bug briefs hand back unfixed.

## Then

The critic, the curator and the gate together (`orchestrator`, "Releasing to `main`"); the release.
