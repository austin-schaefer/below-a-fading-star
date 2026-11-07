# Wilderness v2 placement plan

Every v2 item and every creature gets a named site, so nothing roams featureless ground and meeting something tells you where you are. Map: `shots/plan-v2-placement-map.png` (render it again with `node tools/map.mjs <out.png> [sites.json]`). Coordinates are metres, x east, z south. The sun hangs low in the west-south-west (azimuth 160°). Names are [Proposed]; the `LANDMARKS` entries for the new sites are already in `src/world.js`, so agents must not edit that file.

## Stage A, landed

| Item | Site | Notes |
|---|---|---|
| The Tumbling Water (river) | fall lip (214,266) y 23.5 → pool (208,258) → canyon → mouth (134,211) into the fen | 95 m of canyon 9–13 m deep, shingle banks swapping sides, wading at s≈40 and s≈67. Still reaches at s≈25–35 (y 0.5–1.0) and the slow mouth reach. |
| T The Speculum | (208,258) r 10, y 3.5 | Reflects a young sun and blue sky; never the player. |
| Trigon Span deck | ramps foot at (−32,188) and (−161,243); deck y 15.3; gap over the ground at (−96,215) | Walkable; parapet colliders open only at the gap. |
| Controls, debug | | Teleport panel lists every landmark, including the new sites below. |
| R Parhelion City, E the Vigilant | sky agent, in flight | Vigilant on a wall that is not the south-east (fall) or the west (sun). |

## Stage C sites

| Item | Site | Next door | Why here |
|---|---|---|---|
| A Heliotrope Sward | (−45,45) r 26, the keep hill's west flank just south of the causeway | spawn 55 m east; Z 40 m north-west; Lees Tarn 70 m south-west | The only gentle slope in the region that faces the sun (aspect 0.28). First thing you see walking out, and you will witness the closing when the sun gutters. |
| AB The Menology | (−15,255) r 24, the south moor | Trigon Span 85 m west; fen's west rim 60 m north-east | The emptiest quarter near a path; becomes its own point of interest. Lizards live here. |
| L The Hypogeum | (226,−112) r 12 | The Leaning Yard 30 m west; Medlar Close 100 m west | Tomb beside the graveyard makes a cluster you can see from the orchard. |
| N The Gradine | base (282,−172), steps climbing the east wall north-east of the Yard | Hypogeum 80 m south-west | A wall face in view from the Yard and the Hypogeum; the first step above head height. |
| Q The Cutting | (190,246) r 8, the outer bank of the canyon's first bend | the Speculum 20 m east; the river below | The canyon already exposes strata; the slump reveals the made ones. |
| V The Wrong Colour | eddy at (171,242) r 5, a side basin off the still reach (y≈0.6, flow 1.9 m/s mid-stream) | the Tumbling Water's centre; Q 20 m upstream | A quiet pool between two rapids. The agent may carve the basin 3–4 m into the bank in a marked block of `terrain.js`. |
| G The Salt-Pedlars | along the river from (183,243) to the mouth (134,211), and over the slow water | V, Q, the fen's edge | Dragonfly riders need slow water to hover over. |
| H The Wimpled Guest | the taverna's well, (95,−45) | Medlar Close | As briefed. |
| I The Sable Galley | Lees Tarn, crossing (−90,110) r 58 | the woman in the tarn; the Span | As briefed. |
| Z The Carillon Flags | the causeway at (−65,12), a 12 m stretch | the Sward 40 m south-east; spawn 75 m east | On the first walk out. |

## Creatures tied to landmarks (the more-life pass)

| Creature | Lives at | Change |
|---|---|---|
| Man in the cloak of eyes | The Wayside Shrine (−108,−128) | Moves from (−86,−48) to stand 6 m from the shrine, facing the sun. |
| The slinker | edges of the Sunken Court, the Lattice, the Deodand Wood | Lurks only within 90 m of one of those; still flees when looked at. |
| The traveller and wagon | the causeway, gate to tower | Unchanged. Pauses a moment at the Carillon Flags. |
| Woman in the tarn | Lees Tarn | Unchanged; the galley passes behind her. |
| Deodand | the Wood and the Byre | Unchanged. |
| Biomesh | the Lattice, the causeway, the Sunken Court | 2.5× the chips; colonies send visible runners and new tiles appear at the edge every few seconds. |
| Grazers | Medlar Close and the moor south of the keep | Herd centres pinned to those. |
| Crows | Carcanet Keep | Unchanged; rooks added at the Leaning Yard. |
| New: lizards | the Menology | Inhabitants agent. |
| New: Salt-Pedlars | the Tumbling Water | River agent. |
| New: moths | the taverna's lamps | Life agent. |
| New: bats | out of the Armiger's Tower at every gutter | Life agent. |
| New: a stilted wading thing | the slow reach and the fen's edge; never there when you look back | Life agent. |
| New: beetles on the bronze door | the Hypogeum | Life agent, once the door exists (reads LANDMARKS.hypogeum). |

## Stage C agents and file ownership

| Agent | Items | Owns |
|---|---|---|
| Flora | A; thin the "black ovals" (fleshy leaves on steep wet ground); grey reeds within 8 m of V | `src/v2/flora.js`, `src/vegetation/**` |
| Ruins | N, Q, L, Z | `src/v2/ruins.js`, `src/structures/**` |
| Inhabitants | H, I, AB (menhirs and lizards) | `src/v2/inhabitants.js` only |
| River life | G, V, the fall's rumble zone | `src/v2/riverlife.js`, `src/water/**`, a marked eddy block in `src/terrain.js` |
| Life | the creature table above | `src/fauna/**` |
| Audio, afterwards | every cue the five agents list | `src/audio/**`, `src/audio.js` |

Nobody edits `src/world.js`, `src/main.js`, `src/controls.js`, `src/hud.js` or `index.html` in stage C. Audio cues are called through `ctx.audio?.cue?.(name, pos)` and listed in each hand-back for the audio pass.
