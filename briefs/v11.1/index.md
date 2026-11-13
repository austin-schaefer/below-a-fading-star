# v11.1, the mountains' weak spots: briefs

A point release (`orchestrator`, "A small release goes faster"): no critic, no curator; the whole suite (shared code), a cold read of each diff, a blind read of the renders. The owner, 2026-11-12: "awesome! please chase the "weaker than meant" things as a further refinement for a v11.1". The list is `plans/wilderness-v11.md`, Status, "Shipped weaker than meant". `briefs/v11/_common.md` goes to every agent, with this file.

| Brief | Scope | Owns | Port | Model |
|---|---|---|---|---|
| **W1** the wall close up, and the sunward faces | the near wall at 100 m and closer; the southern massifs toward the sun | `src/terrain.js` (the wall's bake and shader block) | 8161 | strong |
| **W2** the north-east wall and the Horn | the one flat face under the Ridge, the Gradine and the Vigilant; the Horn's finger | `src/v4/mountains.js` (`applyMassifs`, the crest and crowns) | 8162 | strong |
| **W3** the Lamps near to | windows that read as lit rooms inside 150 m; the ledge string | `src/v5/lamps.js` | 8163 | mid |
| **W4** poses and the bell | Go-to poses for the Cutting, the Tumbling Water, the Unfinished Prospect; the glow on the Span's wall at the bell | the Go-to table, the bell's sprites | 8164 | mid |
| **R** a cold review | M4, F1 and F2 as merged (`422aa43`, the merges of `issue-1105-moire` and `issue-1106-critic-fixes`) | read-only | none | mid |

Shared ground: W1 owns the wall's shading, W2 its shape. W2 keeps `faceAt` and `crestAt` within a few metres at the hung bearings (Gradine 54 to 59, Vigilant 72, Ridge 21 to 57, Hawser 342 to 346) or refits what moves and says so. If an outline moves, the picture boxes in `tools/mountains-test.mjs` move with it. Every agent renders `tools/views-v11-mountains.json` before and after.

Merge order: W3 and W4 as they come; W1, then W2 after merging `next`. Then `tools/suite.sh 8123` in full.

Not in v11.1: the yellow sparks against other lights (v10's, its own piece of work); the 930 working frames (clearing them was denied; the owner's to say).
