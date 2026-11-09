# Audio survey

Rendered 2026-11-09T12:20:26.408Z from `http://localhost:8160` at q=low, commit 22d0ff0, by `tools/audio-survey.mjs`. 12 poses, 20 s each, post-limiter tap, volume 100.
A cell marked `!` is outside its band; `!!` is outside a gated band (the survey fails). `–` is no value (no seam; fewer than two onsets for gap_min).
`onsets_pm` and the gaps leave out the walker's own steps (the cue log's).

| pose | lufs_i | lufs_s_max | lra | peak_dbfs | crest_db | centroid_hz | sharp_db | rough | hf_db | clicks | seam_s | repeat_s | onsets_pm | gap_max_s | gap_min_s | silence_pct |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| moor-stand | -27.4 ! | -25.9 | 2.4 | -13.8 | 15.1 ! | 298 ! | -19.2 | 0.015 | -33 | 0 | – | 7 ! | 0 | 20 | – | 0 |
| moor-walk | -27.3 | -25.8 | 2.3 ! | -14.6 | 14.2 | 316 ! | -17.8 | 0.02 | -31.6 | 0 | – | – | 15 ! | 13.6 !! | 0.13 ! | 0 |
| wood-stand | -32.4 | -31.2 | 1.7 ! | -18.2 | 14.2 ! | 187 ! | -18.6 | 0.069 | -36.7 | 0 | – | 7 ! | 0 | 20 | – | 0 |
| fen-edge | -30.2 ! | -28.8 | 2.2 ! | -17.1 | 13.9 | 242 ! | -18.5 | 0.034 | -34.4 | 0 | – | 7 ! | 3 | 11.8 | – ! | 0 |
| tarn | -27.1 | -25.7 | 2.2 ! | -14.4 | 14.2 | 307 ! | -19.2 | 0.018 | -33 | 0 | – | 7 ! | 0 ! | 20 | – ! | 0 |
| canyon-rim | -27.4 | -25.8 | 2.4 ! | -14.8 | 14.1 | 297 ! | -19.1 | 0.019 | -32.9 | 0 | – | 7 ! | 0 ! | 20 | – ! | 0 |
| sunken-court | -27.4 | -25.8 | 2.5 ! | -14.5 | 14.3 | 304 ! | -18.4 | 0.017 | -32.3 | 0 | – | 7 ! | 3 | 11.7 ! | – ! | 0 |
| lattice | -25.6 | -24.5 | 1.8 ! | -13.1 | 14.3 | 360 ! | -21.3 | 0.059 | -34.4 | 0 | – | 4.5 ! | 3 | 11.7 ! | – ! | 0 |
| moor-gutter | -24.4 | -22.8 | 3.9 ! | -10.4 | 11.8 ! | 122 ! | -15.6 | 0.347 !! | -42.9 | 0 | – | 7 ! | 0 ! | 20 | – ! | 0 |
| leerie-gutter | -24.3 | -22.8 | 3.9 ! | -10.4 | 11.8 ! | 123 ! | -15.4 | 0.344 !! | -42.5 | 0 | – | – | 3 | 11.8 ! | – ! | 0 |
| moor-hurry | -27.4 | -25.8 | 2.4 ! | -13.8 | 15.1 | 310 ! | -18.2 | 0.017 | -32 | 0 | – | – | 9 | 16.2 | 0.14 ! | 0 |
| demesne-gutter | -24.1 | -22.6 | 3.5 ! | -10.1 | 12 | 138 ! | -15.1 | 0.292 !! | -40.6 | 0 | – | 7 ! | 21 ! | 10.5 ! | 0.45 | 0 |

**Gated failures:** moor-walk (gap_max_s); moor-gutter (rough); leerie-gutter (rough); demesne-gutter (rough).

## Poses

- **moor-stand**: Open moor west of the causeway, standing (the harness's first render pose). `http://localhost:8160/?q=low&pos=-60,20&yaw=1.9`; events {"cue":69,"voice":9}
- **moor-walk**: Open moor, walking west-north-west from the same spot at 3.6 m/s. `http://localhost:8160/?q=low&pos=-60,20&yaw=1.9` {"walk":3.6}; events {"cue":69,"step":33,"voice":9}
- **wood-stand**: The Deodand Wood at the moss light (the settings teleport, facing the light). `http://localhost:8160/?q=low&pos=-199,140&yaw=1.571`; events {"cue":63,"voice":9}
- **fen-edge**: Corpse-Candle Fen, its south edge, facing the water. `http://localhost:8160/?q=low&pos=70,92&yaw=3.1416`; events {"cue":54,"voice":1}
- **tarn**: Lees Tarn from the north shore (the settings teleport, facing the tarn). `http://localhost:8160/?q=low&pos=-90,50&yaw=3.1416`; events {"cue":68,"voice":9}
- **canyon-rim**: The canyon rim above the Tumbling Water (v7 canyon render pose). `http://localhost:8160/?q=low&pos=166.5,218.5&yaw=2.43`; events {"cue":58,"voice":3}
- **sunken-court**: The Sunken Court, a stone enclosure (the settings teleport). `http://localhost:8160/?q=low&pos=-40,-165&yaw=0`; events {"cue":73,"voice":1}
- **lattice**: The Lattice from its north foot (the settings teleport, facing the moraine). `http://localhost:8160/?q=low&pos=40,-215&yaw=0`; events {"cue":78,"voice":10}
- **moor-gutter**: Open moor standing, a gutter 1 s in. `http://localhost:8160/?q=low&pos=-60,20&yaw=1.9` {"gutter":true}; events {"cue":83,"gutter":1,"voice":11}; gutter 1.0–15.0 s (floor at 2.4 s)
- **leerie-gutter**: The Leerie's row of standards, a gutter 1 s in. `http://localhost:8160/?q=low&pos=118,-8&yaw=-2.596` {"gutter":true}; events {"cue":71,"voice":48,"gutter":1}; gutter 1.0–15.0 s (floor at 2.4 s)
- **moor-hurry**: Open moor, hurrying (6.6 m/s) from the same spot. `http://localhost:8160/?q=low&pos=-60,20&yaw=1.9` {"walk":6.6}; events {"cue":69,"step":47,"voice":9}
- **demesne-gutter**: The Demesne by the peafowl's blocks, from the causeway, a gutter 1 s in (they cry at every gutter). `http://localhost:8160/?q=low&pos=85,-3&yaw=0.785` {"gutter":true}; events {"cue":72,"gutter":1,"voice":14}; gutter 1.0–15.0 s (floor at 2.4 s)

## Bands

(g) = gated.

| pose | lufs_i | lufs_s_max | lra | peak_dbfs | crest_db | centroid_hz | sharp_db | rough | hf_db | clicks | seam_s | repeat_s | onsets_pm | gap_max_s | gap_min_s | silence_pct |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| moor-stand | -36…-30 | ≤ -24 (g) | 2…6 | ≤ -12 | 10…14 | 300…900 | ≤ -14 (g) | ≤ 0.15 | ≤ -20 | ≤ 0 (g) | none (g) | none | 0…3 | ≥ 19 (g) |  | ≤ 0 |
| moor-walk | -28…-24 | ≤ -14 (g) | 6…14 | ≤ -3 | 12…20 | 400…1200 | ≤ -10 (g) | ≤ 0.25 | ≤ -16 | ≤ 0 (g) | none (g) | none | 2…12 | ≥ 15 (g) | ≥ 0.3 | ≤ 0 |
| wood-stand | -36…-30 | ≤ -24 | 2…6 | ≤ -12 | 10…14 | 300…900 | ≤ -14 | ≤ 0.15 | ≤ -20 | ≤ 0 | none | none | 0…3 | ≥ 19 |  | ≤ 0 |
| fen-edge | -28…-24 | ≤ -14 | 6…14 | ≤ -3 | 12…20 | 400…1200 | ≤ -10 | ≤ 0.25 | ≤ -16 | ≤ 0 | none | none | 2…12 |  | ≥ 0.3 | ≤ 0 |
| tarn | -28…-24 | ≤ -14 | 6…14 | ≤ -3 | 12…20 | 400…1200 | ≤ -10 | ≤ 0.25 | ≤ -16 | ≤ 0 | none | none | 2…12 |  | ≥ 0.3 | ≤ 0 |
| canyon-rim | -28…-24 | ≤ -14 | 6…14 | ≤ -3 | 12…20 | 400…1200 | ≤ -10 | ≤ 0.25 | ≤ -16 | ≤ 0 | none | none | 2…12 |  | ≥ 0.3 | ≤ 0 |
| sunken-court | -28…-24 | ≤ -14 | 6…14 | ≤ -3 | 12…20 | 400…1200 | ≤ -10 | ≤ 0.25 | ≤ -16 | ≤ 0 | none | none | 2…12 | ≥ 15 | ≥ 0.3 | ≤ 0 |
| lattice | -28…-24 | ≤ -14 | 6…14 | ≤ -3 | 12…20 | 400…1200 | ≤ -10 | ≤ 0.25 | ≤ -16 | ≤ 0 | none | none | 2…12 | ≥ 15 | ≥ 0.3 | ≤ 0 |
| moor-gutter | -28…-24 | ≤ -14 (g) | 6…14 | ≤ -3 | 12…20 | 400…1200 | ≤ -10 (g) | ≤ 0.25 (g) | ≤ -16 | ≤ 0 (g) | none (g) | none | 2…12 | ≥ 15 (g) | ≥ 0.3 | ≤ 0 |
| leerie-gutter | -28…-24 | ≤ -14 (g) | 6…14 | ≤ -3 | 12…20 | 400…1200 | ≤ -10 (g) | ≤ 0.25 (g) | ≤ -16 | ≤ 0 (g) | none | none | 2…12 | ≥ 15 | ≥ 0.3 | ≤ 0 |
| moor-hurry | -28…-24 | ≤ -14 (g) | 6…14 | ≤ -3 | 12…20 | 400…1200 | ≤ -10 (g) | ≤ 0.25 | ≤ -16 | ≤ 0 (g) | none (g) | none | 2…12 | ≥ 15 (g) | ≥ 0.3 | ≤ 0 |
| demesne-gutter | -28…-24 | ≤ -14 (g) | 6…14 | ≤ -3 | 12…20 | 400…1200 | ≤ -10 (g) | ≤ 0.25 (g) | ≤ -16 | ≤ 0 (g) | none | none | 2…12 | ≥ 15 | ≥ 0.3 | ≤ 0 |
