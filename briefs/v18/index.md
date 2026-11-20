# v18: dispatch

The story: `stories/the-graffer.md`. The coordinates: `src/v18/plan.js`. The rules: `_common.md`.

| Brief | Branch | Port | Model | Owns |
|---|---|---|---|---|
| F1 the reach and the spurs | `issue-1801-reach` | 8181 | opus | the wood's extent, trees, tracks, claims, foxfire |
| F2 the Florilegium | `issue-1802-glasshouse` | 8182 | fable | the glasshouse, the likenesses, its light, the grate's opening |
| F3 the Lower Beds | `issue-1803-beds` | 8183 | opus | the door, the vault, the way under, the chamber |
| F4 who lives in the wood | `issue-1804-inhabitants` | 8184 | opus | the stilters, the eyes, the moths |
| F5 the wood heard (after the four) | `issue-1805-sound` | 8185 | sonnet | emitters, the survey's poses |

Seams: F1 claims the three sites and brings a spur to each doorstep. F2 says where the grate is and exports `buildLikeness`; F3 builds under it. F4 builds against coordinates until F1 and F2 merge. Merge order: F1 first (the ground), then F2, F3, F4 as they come, each merging `next` and rerunning its tests; then one suite on `next`; then F5, the map's marks and the names (the orchestrator), the critic, the curator, the gate.
