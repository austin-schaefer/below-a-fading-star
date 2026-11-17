# v16, the valley floor gets a shape: dispatch plan

The milestone doc is `plans/wilderness-v16.md`. Shared rules: `_common.md`. Reports: `reports/`. Briefs are written in full only for the next batch.

## Batch 1 (out 2026-11-16)

| Brief | Owns | Shared files it may touch |
|---|---|---|
| **S1** the gutter (#78) | `src/sky.js` (the gutter's timing), each region's answer to the flicker | a few lines in many region modules; nothing in `src/height/*`, `src/controls.js` |
| **P1** performance | the walker's collision path, update culling, `src/perf.js`, the tools' browser launch | `src/main.js` (the update loop), `src/controls.js`, `tools/*`; nothing in `src/height/*`, `src/sky.js` |

## Batch 1b (out 2026-11-16, from the survey): the floor

- **L1 the tilt** (`brief-v16-L1-tilt.md`): owns `src/height/floor.js`, the `floor=v15` param, the Outwash hook; in `field.js` one line at :353.
- **L2 the edge and the tarn's shore** (`brief-v16-L2-edge-tarn.md`): owns `src/height/outline.js`, `src/v4/tarn.js`, `waterLevelAt`, the tarn's lines in `field.js` and every reader of its circle.
- **L3 the fen** (not yet written; after L2 pushes the edge): `src/height/fen.js`, the fen's lines in `field.js`, `regions.js`, `saltings.js`, `uFen` in `water/river.js`, and the other ruled outlines the survey lists (the wood, the crystal, the Bletting's straight cut).

## Then

What batch 1 hands back unfixed; W3 (the open edges) against the new floor; the spine's head (v15's Status); the critic, the curator and the gate together; the release.
