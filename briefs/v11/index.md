# v11, the mountains: design and briefs

The milestone doc is `plans/wilderness-v11.md`. This file is the dispatch plan. `_common.md` goes to every agent.

## Where things are (from a read of the code, 2026-11-12)

- **The near wall is the terrain mesh** (`src/terrain.js`, 480 segments over 1000 m, 320 on low; about 340k of its 460k triangles are wall). `applyMassifs` in `src/v4/mountains.js` shapes it: the crest is a spline by bearing plus crowns for the named peaks; the face is a scree apron, a rock band and a rounded shoulder, with gullies, corries, buttresses and noise.
- **The ledges are in the geometry**: `mountains.js`, the block after the face profile (ledges every 13 to 17 m from `MASSIFS`, tilted 4 to 7 degrees, mixed at 60 %, `pow(t,4)` treads).
- **And outlined three more times**: the curvature bake in `terrain.js` (hollows to -72 %, crests to +45 %), the shader's ledge lines (treads at 1.6x, a dark band under, anti-aliased by screen derivative so they never fade with distance, snow on high treads), and three stacked height bands (near strata, `bed`, `hard`). Nothing in the shading runs down the slope. Bump detail stops at 60 m.
- **The far rings** are `buildRing` in `mountains.js`: 900x30 cells (540x18 on low), colours baked per vertex and paled.
- **Haze** on the walls: `src/atmosphere.js` and `src/v4/kit/fog.js`, in steps by distance from the centre.
- **The terrain material is shared**: the Vigilant, the Thrones and the regions' ground skins compile it too, and the Annals frieze and the Occultation's shadow are injected into it.
- **Hung on the wall**, all following the ground by code, all to be looked at after any change: Hawser (`faceAt`), Annals (`faceAt`, a band at y 110 to 130), Galleries (own face search on `heightAt`), Lamps (mesh heights; wants slope over 50 degrees), Vigilant (crest near 72 degrees), Gradine, Thrones (`seats`), Long Figure (terrain triangles), the Battlemented Ridge, the fall's wall, the Span's abutments. Saved views: `tools/views-v5-mountains*.json`, `-mountains-c-hung.json`, `-galleries.json`, `-lamps*.json`, `-ridge.json`.
- **No test is about the mountains.** `walk`, `paths`, `roads`, `edges`, `perf`, `contrast-survey` catch side effects.

## Briefs

| Brief | Scope | Owns | Model |
|---|---|---|---|
| **M1** the rock | the faces of the near wall: the ledges and bands out, erosion in; rock that holds up at 400 m | `terrain.js` (the wall's bake and shader), the face-relief part of `applyMassifs` | strong |
| **M2** the form | the massifs' outlines and shoulders; the far ranges as real ranges; the wall receding in the cold light | the crest spline and crowns, `buildRing`, the haze on walls | strong |
| **M3** #6 | the Lamps moved off the Galleries' massif to where they matter; both given an outline that is not a rectangle | `src/v5/lamps.js`, `src/v5/galleries.js` | mid |
| **M4** fitting | whatever hung thing M1 and M2 disturbed; a test that would have caught the ruled lines | written after M1 and M2 are merged | then |

Merge order: M1, then M2 (merges `next` first), then M3 (re-rendered on the new wall).

## What the owner can see as each lands

`http://localhost:8123/?pos=0,0` and turn round; `?pos=250,5&yaw=1.57` (the High Ling, looking west at the wall and the two squares); `?pos=60,-230&yaw=3.14` (the foreland, looking back across the bowl).

## Risks

Three agents in two shared files: each is told what the others own. A wall that moves under eleven hung things: M1 and M2 hold `faceAt` and `crestAt` within a few metres at the hung bearings and M4 fits the rest. Natural reading as bland: the brief asks for structure (drainage, ribs, fans), not for smoothing. The shared material changing the regions' ground: M1 confines its changes to the wall (by radius or slope) and renders the bowl's ground before and after.
