# Audio survey (before → after)

Rendered 2026-11-16T18:33:03.400Z from `http://localhost:8167` at q=low, commit f00cc42+dirty src, by `tools/audio-survey.mjs`; baseline `shots/wip/audio/survey-before`. 9 poses, 20 s each, post-limiter tap, volume 100.
A cell marked `!` is outside its band; `!!` is outside a gated band (the survey fails). `–` is no value (no seam; fewer than two onsets for gap_min).
`onsets_pm` and the gaps leave out the walker's own steps (the cue log's).

| pose | lufs_i | lufs_s_max | lra | peak_dbfs | crest_db | centroid_hz | sharp_db | rough | hf_db | clicks | seam_s | repeat_s | onsets_pm | gap_max_s | gap_min_s | silence_pct |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| moor-stand | -30.7 | -28.2 | 8.7 ! | -16.5 | 16.1 ! | 358 | -15.2 | 0.001 | -52 | 0 | – | – | 0 | 20 | – | 0 |
| leerie-gutter | -31.8 ! | -28 | 9.1 | -7 | 26.4 ! | 243 ! | -16.6 | 0.134 | -57.3 | 0 | – | – | 33 ! | 7.1 ! | 0.12 ! | 0 |
| demesne-gutter | -31.2 ! | -28 | 7.6 | -15.5 | 17.3 | 251 ! | -17 | 0.023 | -60.1 | 0 | – | – | 27 ! | 5.2 ! | 0.1 ! | 0 |
| house-court | -33.8 | -30.7 | 9.1 | -18.2 | 17.5 | 327 | -16.7 | 0.001 | -49.1 | 72 ! | 0.384 ! | – | 30 | 10.5 | 0.09 | 0 |
| lappet-causeway | -28.8 → -28.4 | -24.8 → -24.6 | 11.4 → 10.3 | -14.8 → -13.7 | 16 → 16.7 | 375 → 360 | -14 → -14.3 | 0.031 → 0.037 | -48.8 → -48.9 | 0 → 0 | – → – | – → – | 0 → 9 | 20 → 10.2 | – ! → 0.23 ! | 0 → 0 |
| lappet-quarrels | -28.1 → -27.2 | -24.1 → -23.7 | 11.4 → 8.5 | -13.7 → -13.2 | 16.4 → 16.1 | 385 → 333 | -13.7 → -14.7 | 0.033 → 0.021 | -48.4 → -49.4 | 0 → 0 | – → – | – → – | 0 → 9 | 20 → 10.2 | – ! → 0.2 ! | 0 → 0 |
| lappet-rungs | -29.6 → -28.8 | -25.6 → -24.7 | 11.3 → 11.8 | -15.3 → -12.1 | 16.3 → 18.8 | 366 → 367 | -14.2 → -15.4 | 0.037 → 0.024 | -49 → -49.8 | 1 !! → 0 | – → – | – → – | 3 → 6 | 11.8 → 11.5 | – ! → 2.19 | 0 → 0 |
| lappet-lees | -29.6 → -28.2 | -25.6 → -25 | 11.3 → 7.9 | -15.3 → -14.3 | 16.2 → 15.7 | 369 → 375 | -14.2 → -15.4 | 0.025 → 0.021 | -49.1 → -50.3 | 0 → 0 | – → – | – → – | 0 → 0 | 20 → 20 | – ! → – ! | 0 → 0 |
| lappet-pennyworth | -29.5 → -29.4 | -25.6 → -25.5 | 11.3 → 10.9 | -15.4 → -15.1 | 16.1 → 16.3 | 364 → 364 | -14.3 → -14.4 | 0.034 → 0.034 | -48.9 → -48.3 | 0 → 0 | – → – | – → – | 15 ! → 15 | 10.5 → 9 | 0.2 ! → 0.09 ! | 0 → 0 |

**Gated failures:** none.

## Poses

- **moor-stand**: Open moor west of the causeway, standing (the harness's first render pose). `http://localhost:8167/?q=low&pos=-60,20&yaw=1.9`; events {"cue":65,"voice":10}
- **leerie-gutter**: The Leerie's row of standards, a gutter 1 s in. `http://localhost:8167/?q=low&pos=118,-8&yaw=-2.596` {"gutter":true}; events {"cue":80,"voice":61,"gutter":1}; gutter 1.0–15.0 s (floor at 2.4 s)
- **demesne-gutter**: The Demesne by the peafowl's blocks, from the causeway, a gutter 1 s in (they cry at every gutter). `http://localhost:8167/?q=low&pos=85,-3&yaw=0.785` {"gutter":true}; events {"cue":79,"voice":35,"gutter":1}; gutter 1.0–14.8 s (floor at 2.4 s)
- **house-court**: The Pomegranate House's court inside the gate, facing the fountain and the musician, standing, 30 s (v8-05: talk in bouts with rests, a laugh at the end of some, the oud in halting phrases, a cup set down, the lamps' glass; the wind drops in the walled court. clicks not gated: 27 weak seam-period detections at -73 dBFS are here with ?house=0 too, source not found). `http://localhost:8167/?q=low&pos=95,-54&yaw=3.1416`; events {"cue":111,"voice":49}; seams 0.384 s, 0.3181 s, 0.3731 s
- **lappet-causeway**: The Lappet (v15): the causeway on the High Rung above the Rungs' roofs, looking along it to the corner (the control: the valley's bed, the village below). `http://localhost:8167/?q=low&pos=63.79,-15.13&yaw=-1.951` {"y":14}; events {"cue":70,"voice":24}
- **lappet-quarrels**: The Lappet's Quarrels (v15): the crown by the Saint's Rest, facing the Smoking Saint (v15-L1: the kiln's draw and tick, a chisel far off). `http://localhost:8167/?q=low&pos=66.73,-3.62&yaw=-1.930` {"y":18}; events {"cue":71,"voice":27}
- **lappet-rungs**: The Lappet's Rungs (v15): the Low Rung's lane by the dyers' yard, facing the Tenter (v15-L1: cloth on its poles, the vats' drip). `http://localhost:8167/?q=low&pos=98.63,-3.92&yaw=2.994` {"y":6}; events {"cue":73,"voice":39}
- **lappet-lees**: The Lappet's Lees (v15): the main square west of the Fountain of Noon, facing it (v15-L1: stored daylight, the spout and the gutter). `http://localhost:8167/?q=low&pos=68.77,-38.34&yaw=-1.681` {"y":3.1}; events {"cue":67,"voice":21}
- **lappet-pennyworth**: The Lappet's Pennyworth (v15): the Thumbway by the stalls, facing the salt-weigher and the well (v15-L1: the market's small noises, the beans' poles, the house's court through the south door). `http://localhost:8167/?q=low&pos=99.50,-27.60&yaw=-1.904` {"y":-0.8}; events {"voice":32,"cue":75}

## Bands

(g) = gated.

| pose | lufs_i | lufs_s_max | lra | peak_dbfs | crest_db | centroid_hz | sharp_db | rough | hf_db | clicks | seam_s | repeat_s | onsets_pm | gap_max_s | gap_min_s | silence_pct |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| moor-stand | -36…-30 | ≤ -24 (g) | 2…6 | ≤ -12 | 10…14 | 300…900 | ≤ -14 (g) | ≤ 0.15 | ≤ -20 | ≤ 0 (g) | none (g) | none | 0…3 | ≥ 19 (g) |  | ≤ 0 |
| leerie-gutter | -28…-24 | ≤ -14 (g) | 6…14 | ≤ -3 | 12…20 | 400…1200 | ≤ -10 (g) | ≤ 0.25 (g) | ≤ -16 | ≤ 0 (g) | none | none | 2…12 | ≥ 15 | ≥ 0.3 | ≤ 0 |
| demesne-gutter | -28…-24 | ≤ -14 (g) | 6…14 | ≤ -3 | 12…20 | 400…1200 | ≤ -10 (g) | ≤ 0.25 (g) | ≤ -16 | ≤ 0 (g) | none | none | 2…12 | ≥ 15 | ≥ 0.3 | ≤ 0 |
| house-court | -38…-28 | ≤ -14 (g) | 3…14 | ≤ -3 | 12…24 | 250…1200 | ≤ -10 (g) | ≤ 0.25 (g) | ≤ -16 | ≤ 0 | none | none | 6…70 | ≥ 2 |  | ≤ 0 |
| lappet-causeway | -38…-26 | ≤ -18 (g) | 2…14 | ≤ -6 | 10…24 | 150…1200 | ≤ -12 (g) | ≤ 0.25 (g) | ≤ -16 | ≤ 0 (g) | none | none | ≤ 14 |  | ≥ 0.3 | ≤ 0 |
| lappet-quarrels | -38…-26 | ≤ -18 (g) | 2…14 | ≤ -6 | 10…24 | 150…1200 | ≤ -12 (g) | ≤ 0.25 (g) | ≤ -16 | ≤ 0 (g) | none | none | ≤ 14 |  | ≥ 0.3 | ≤ 0 |
| lappet-rungs | -38…-26 | ≤ -18 (g) | 2…14 | ≤ -6 | 10…24 | 150…1200 | ≤ -12 (g) | ≤ 0.25 (g) | ≤ -16 | ≤ 0 (g) | none | none | ≤ 14 |  | ≥ 0.3 | ≤ 0 |
| lappet-lees | -38…-26 | ≤ -18 (g) | 2…14 | ≤ -6 | 10…24 | 150…1200 | ≤ -12 (g) | ≤ 0.25 (g) | ≤ -16 | ≤ 0 (g) | none | none | ≤ 14 |  | ≥ 0.3 | ≤ 0 |
| lappet-pennyworth | -38…-26 | ≤ -18 (g) | 2…14 | ≤ -6 | 10…24 | 150…1200 | ≤ -12 (g) | ≤ 0.25 (g) | ≤ -16 | ≤ 0 (g) | none | none | ≤ 26 |  | ≥ 0.3 | ≤ 0 |

## Spectrum

Octave-band energy in dB (0 = a full-scale sine's power) over slices of the render; swing = loudest slice less quietest, per band; vs before = the whole-render change from the baseline.

### moor-stand

```
band Hz        63    125    250    500     1k     2k     4k     8k    16k
0-5 s       -37.8  -35.9  -37.4  -39.4  -40.9  -42.8  -56.1  -82.3  -95.5
5-10 s      -38.2  -37.5  -38.6  -40.4  -41.5  -43.8  -57.9  -80.2  -92.0
10-15 s     -41.7  -43.9  -45.2  -46.6  -47.9  -52.4  -73.4  -92.3 -100.5
15-20 s     -39.5  -38.5  -39.9  -41.9  -43.1  -45.4  -58.8  -86.5  -99.9
whole       -39.0  -38.1  -39.5  -41.3  -42.6  -44.9  -58.7  -83.4  -95.6
swing         3.9    8.0    7.8    7.2    7.0    9.6   17.3   12.1    8.5
```

### leerie-gutter

```
band Hz        63    125    250    500     1k     2k     4k     8k    16k
0-5 s       -37.6  -37.5  -37.5  -38.1  -39.5  -43.9  -58.9  -83.1 -102.0
5-10 s      -36.6  -42.6  -43.7  -45.4  -45.7  -50.8  -72.9 -100.6 -104.2
10-15 s     -37.0  -47.6  -49.1  -50.5  -51.5  -62.9  -85.1  -97.4 -103.0
15-20 s     -38.4  -38.4  -39.6  -41.8  -42.9  -45.5  -59.4  -87.3 -101.9
whole       -37.4  -40.1  -40.7  -41.9  -43.1  -47.1  -62.1  -87.6 -102.7
swing         1.8   10.1   11.6   12.4   12.0   19.0   26.2   17.5    2.3
```

### demesne-gutter

```
band Hz        63    125    250    500     1k     2k     4k     8k    16k
0-5 s       -37.2  -36.3  -37.8  -40.5  -41.6  -44.3  -59.0  -88.0 -103.2
5-10 s      -36.1  -40.9  -41.7  -40.7  -43.7  -46.4  -67.3  -97.5 -104.1
10-15 s     -36.9  -43.7  -46.0  -49.6  -50.4  -61.0  -82.9 -103.0 -104.4
15-20 s     -37.9  -36.5  -38.0  -39.9  -42.2  -44.9  -58.1  -86.5 -102.2
whole       -37.0  -38.4  -39.8  -41.4  -43.4  -46.3  -61.3  -90.0 -103.4
swing         1.8    7.4    8.2    9.7    8.8   16.7   24.8   16.5    2.2
```

### house-court

```
band Hz        63    125    250    500     1k     2k     4k     8k    16k
0-7.5 s     -40.9  -40.6  -41.0  -41.3  -44.5  -48.1  -61.7  -90.0 -103.1
7.5-15 s    -42.4  -45.5  -46.8  -45.4  -49.0  -53.4  -70.7  -89.6  -97.5
15-22.5 s   -40.7  -40.5  -40.8  -40.3  -44.3  -47.6  -59.0  -79.3  -89.6
22.5-30 s   -41.6  -41.2  -42.3  -41.8  -46.0  -49.3  -60.8  -84.1  -94.5
whole       -41.3  -41.6  -42.2  -41.8  -45.6  -49.1  -61.5  -83.5  -93.8
swing         1.7    5.0    6.0    5.1    4.7    5.8   11.7   10.7   13.5
```

### lappet-causeway

```
band Hz        63    125    250    500     1k     2k     4k     8k    16k
0-5 s       -36.9  -35.6  -36.9  -38.9  -40.3  -42.4  -55.3  -78.9  -91.3
5-10 s      -40.5  -40.3  -42.1  -45.1  -46.2  -50.1  -69.2  -92.5 -101.7
10-15 s     -39.9  -37.4  -39.3  -42.1  -43.4  -46.2  -60.7  -89.9 -104.2
15-20 s     -34.5  -32.4  -33.7  -35.9  -37.4  -39.0  -48.6  -73.0  -86.4
whole       -37.3  -35.5  -37.0  -39.3  -40.7  -42.7  -53.6  -77.9  -91.1
swing         6.0    7.9    8.4    9.2    8.8   11.1   20.6   19.5   17.8
vs before     +0.2    +0.7    +0.5    +0.1    +0.2    +0.0    +0.1    +0.3    +0.4
```

### lappet-quarrels

```
band Hz        63    125    250    500     1k     2k     4k     8k    16k
0-5 s       -36.1  -33.8  -35.4  -38.2  -39.7  -41.5  -53.6  -77.8  -90.5
5-10 s      -39.8  -37.3  -39.5  -44.0  -45.4  -48.8  -67.0  -90.7 -100.7
10-15 s     -38.7  -34.9  -36.9  -42.3  -43.6  -46.3  -61.3  -90.6 -104.3
15-20 s     -33.7  -31.1  -32.4  -35.3  -36.9  -38.3  -47.4  -72.2  -86.1
whole       -36.4  -33.7  -35.3  -38.6  -40.2  -41.9  -52.3  -77.1  -90.7
swing         6.1    6.2    7.1    8.7    8.5   10.5   19.6   18.5   18.2
vs before     +0.6    +1.8    +1.5    +0.2    +0.0    +0.0    +0.0    +0.0    +0.1
```

### lappet-rungs

```
band Hz        63    125    250    500     1k     2k     4k     8k    16k
0-5 s       -37.8  -36.6  -37.6  -35.6  -40.9  -43.3  -56.9  -79.9  -92.1
5-10 s      -41.6  -42.4  -43.7  -45.9  -47.1  -51.3  -71.1  -94.2 -102.4
10-15 s     -40.1  -38.8  -40.4  -42.5  -43.5  -47.0  -62.4  -90.7 -104.0
15-20 s     -35.0  -33.3  -34.6  -32.0  -37.7  -39.6  -50.0  -74.1  -87.2
whole       -37.9  -36.6  -37.9  -36.1  -41.0  -43.4  -55.0  -79.0  -91.9
swing         6.6    9.1    9.1   13.9    9.4   11.7   21.1   20.1   16.8
vs before     +0.1    +0.4    +0.4    +4.1    +0.6    +0.2    +0.1    +0.3    +0.2
```

### lappet-lees

```
band Hz        63    125    250    500     1k     2k     4k     8k    16k
0-5 s       -35.6  -34.2  -36.6  -39.1  -38.7  -43.0  -56.3  -79.5  -92.0
5-10 s      -40.2  -39.6  -42.2  -43.0  -42.4  -49.8  -67.0  -88.7 -101.0
10-15 s     -39.5  -39.1  -41.2  -40.0  -41.1  -47.8  -63.8  -89.6 -103.8
15-20 s     -34.6  -32.6  -34.4  -35.9  -37.0  -39.8  -50.0  -74.3  -87.7
whole       -36.8  -35.4  -37.4  -38.7  -39.3  -43.4  -54.9  -79.0  -92.1
swing         5.6    7.0    7.8    7.1    5.4   10.0   17.0   15.3   16.1
vs before     +1.4    +1.6    +0.9    +1.5    +2.3    +0.2    +0.2    +0.3    +0.1
```

### lappet-pennyworth

```
band Hz        63    125    250    500     1k     2k     4k     8k    16k
0-5 s       -38.6  -37.5  -38.8  -40.5  -42.1  -44.4  -58.5  -81.1  -93.0
5-10 s      -42.0  -43.3  -44.9  -46.7  -47.9  -53.0  -74.4  -95.1 -101.4
10-15 s     -38.8  -36.9  -38.4  -40.2  -41.9  -44.2  -56.6  -84.1  -99.5
15-20 s     -35.6  -34.0  -35.1  -36.9  -38.5  -40.1  -50.4  -73.5  -86.1
whole       -38.2  -36.8  -38.1  -39.9  -41.5  -43.6  -55.0  -78.5  -91.1
swing         6.4    9.3    9.8    9.8    9.4   12.9   24.0   21.6   15.3
vs before    -0.2    +0.1    +0.1    +0.2    +0.1    +0.0    +0.1    +0.7    +0.8
```
