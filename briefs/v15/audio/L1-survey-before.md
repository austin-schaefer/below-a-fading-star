# Audio survey

Rendered 2026-11-16T17:48:42.670Z from `http://localhost:8167` at q=low, commit 92633df+dirty src, by `tools/audio-survey.mjs`. 5 poses, 20 s each, post-limiter tap, volume 100.
A cell marked `!` is outside its band; `!!` is outside a gated band (the survey fails). `–` is no value (no seam; fewer than two onsets for gap_min).
`onsets_pm` and the gaps leave out the walker's own steps (the cue log's).

| pose | lufs_i | lufs_s_max | lra | peak_dbfs | crest_db | centroid_hz | sharp_db | rough | hf_db | clicks | seam_s | repeat_s | onsets_pm | gap_max_s | gap_min_s | silence_pct |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| lappet-causeway | -28.8 | -24.8 | 11.4 | -14.8 | 16 | 375 | -14 | 0.031 | -48.8 | 0 | – | – | 0 | 20 | – ! | 0 |
| lappet-quarrels | -28.1 | -24.1 | 11.4 | -13.7 | 16.4 | 385 | -13.7 | 0.033 | -48.4 | 0 | – | – | 0 | 20 | – ! | 0 |
| lappet-rungs | -29.6 | -25.6 | 11.3 | -15.3 | 16.3 | 366 | -14.2 | 0.037 | -49 | 1 !! | – | – | 3 | 11.8 | – ! | 0 |
| lappet-lees | -29.6 | -25.6 | 11.3 | -15.3 | 16.2 | 369 | -14.2 | 0.025 | -49.1 | 0 | – | – | 0 | 20 | – ! | 0 |
| lappet-pennyworth | -29.5 | -25.6 | 11.3 | -15.4 | 16.1 | 364 | -14.3 | 0.034 | -48.9 | 0 | – | – | 15 ! | 10.5 | 0.2 ! | 0 |

**Gated failures:** lappet-rungs (clicks).

## Poses

- **lappet-causeway**: The Lappet (v15): the causeway on the High Rung above the Rungs' roofs, looking along it to the corner (the control: the valley's bed, the village below). `http://localhost:8167/?q=low&pos=63.79,-15.13&yaw=-1.951` {"y":14}; events {"cue":69,"voice":18}
- **lappet-quarrels**: The Lappet's Quarrels (v15): the crown by the Saint's Rest, facing the Smoking Saint (v15-L1: the kiln's draw and tick, a chisel far off). `http://localhost:8167/?q=low&pos=66.73,-3.62&yaw=-1.930` {"y":18}; events {"cue":69,"voice":18}
- **lappet-rungs**: The Lappet's Rungs (v15): the Low Rung's lane by the dyers' yard, facing the Tenter (v15-L1: cloth on its poles, the vats' drip). `http://localhost:8167/?q=low&pos=98.63,-3.92&yaw=2.994` {"y":6}; events {"cue":69,"voice":19}
- **lappet-lees**: The Lappet's Lees (v15): the main square west of the Fountain of Noon, facing it (v15-L1: stored daylight, the spout and the gutter). `http://localhost:8167/?q=low&pos=68.77,-38.34&yaw=-1.681` {"y":3.1}; events {"cue":66,"voice":15}
- **lappet-pennyworth**: The Lappet's Pennyworth (v15): the Thumbway by the stalls, facing the salt-weigher and the well (v15-L1: the market's small noises, the beans' poles, the house's court through the south door). `http://localhost:8167/?q=low&pos=99.50,-27.60&yaw=-1.904` {"y":-0.8}; events {"cue":73,"voice":31}

## Bands

(g) = gated.

| pose | lufs_i | lufs_s_max | lra | peak_dbfs | crest_db | centroid_hz | sharp_db | rough | hf_db | clicks | seam_s | repeat_s | onsets_pm | gap_max_s | gap_min_s | silence_pct |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| lappet-causeway | -38…-26 | ≤ -18 (g) | 2…14 | ≤ -6 | 10…24 | 150…1200 | ≤ -12 (g) | ≤ 0.25 (g) | ≤ -16 | ≤ 0 (g) | none | none | ≤ 14 |  | ≥ 0.3 | ≤ 0 |
| lappet-quarrels | -38…-26 | ≤ -18 (g) | 2…14 | ≤ -6 | 10…24 | 150…1200 | ≤ -12 (g) | ≤ 0.25 (g) | ≤ -16 | ≤ 0 (g) | none | none | ≤ 14 |  | ≥ 0.3 | ≤ 0 |
| lappet-rungs | -38…-26 | ≤ -18 (g) | 2…14 | ≤ -6 | 10…24 | 150…1200 | ≤ -12 (g) | ≤ 0.25 (g) | ≤ -16 | ≤ 0 (g) | none | none | ≤ 14 |  | ≥ 0.3 | ≤ 0 |
| lappet-lees | -38…-26 | ≤ -18 (g) | 2…14 | ≤ -6 | 10…24 | 150…1200 | ≤ -12 (g) | ≤ 0.25 (g) | ≤ -16 | ≤ 0 (g) | none | none | ≤ 14 |  | ≥ 0.3 | ≤ 0 |
| lappet-pennyworth | -38…-26 | ≤ -18 (g) | 2…14 | ≤ -6 | 10…24 | 150…1200 | ≤ -12 (g) | ≤ 0.25 (g) | ≤ -16 | ≤ 0 (g) | none | none | ≤ 14 |  | ≥ 0.3 | ≤ 0 |

## Spectrum

Octave-band energy in dB (0 = a full-scale sine's power) over slices of the render; swing = loudest slice less quietest, per band.

### lappet-causeway

```
band Hz        63    125    250    500     1k     2k     4k     8k    16k
0-5 s       -37.0  -35.9  -37.1  -38.8  -40.3  -42.3  -55.1  -78.7  -91.2
5-10 s      -41.4  -41.9  -42.9  -44.9  -46.1  -49.6  -68.3  -91.1 -100.8
10-15 s     -40.3  -39.8  -41.4  -43.4  -44.6  -47.5  -63.5  -93.0 -104.4
15-20 s     -34.6  -32.7  -34.0  -36.1  -37.6  -39.0  -48.7  -73.4  -87.0
whole       -37.5  -36.2  -37.5  -39.4  -40.9  -42.7  -53.7  -78.2  -91.5
swing         6.8    9.2    8.9    8.8    8.5   10.6   19.6   19.6   17.4
```

### lappet-quarrels

```
band Hz        63    125    250    500     1k     2k     4k     8k    16k
0-5 s       -36.4  -35.2  -36.4  -38.1  -39.7  -41.4  -53.5  -77.7  -90.4
5-10 s      -41.0  -41.2  -42.1  -44.2  -45.5  -48.6  -66.9  -90.3 -100.4
10-15 s     -40.0  -39.1  -40.7  -42.8  -43.9  -46.7  -62.1  -91.4 -104.3
15-20 s     -34.0  -32.1  -33.4  -35.4  -36.9  -38.3  -47.4  -72.2  -86.3
whole       -37.0  -35.5  -36.8  -38.8  -40.2  -41.9  -52.3  -77.1  -90.8
swing         7.0    9.1    8.7    8.8    8.6   10.3   19.5   19.2   18.0
```

### lappet-rungs

```
band Hz        63    125    250    500     1k     2k     4k     8k    16k
0-5 s       -37.7  -36.8  -37.9  -39.6  -41.1  -43.1  -56.5  -79.8  -91.9
5-10 s      -41.7  -42.7  -43.8  -45.6  -46.9  -50.7  -70.2  -92.2 -101.3
10-15 s     -40.7  -40.7  -42.3  -44.2  -45.3  -48.4  -64.9  -93.6 -103.7
15-20 s     -35.2  -33.5  -34.8  -36.8  -38.3  -39.8  -50.1  -74.5  -87.7
whole       -38.0  -37.0  -38.3  -40.2  -41.6  -43.6  -55.1  -79.3  -92.1
swing         6.5    9.2    9.0    8.8    8.6   10.9   20.1   19.1   16.0
```

### lappet-lees

```
band Hz        63    125    250    500     1k     2k     4k     8k    16k
0-5 s       -37.9  -36.7  -37.8  -39.5  -41.0  -43.1  -56.6  -79.7  -91.8
5-10 s      -41.4  -42.7  -43.6  -45.7  -46.8  -50.6  -69.9  -92.1 -101.2
10-15 s     -41.3  -40.6  -42.2  -43.8  -45.3  -48.4  -64.9  -94.6 -104.3
15-20 s     -35.2  -33.6  -34.9  -36.9  -38.3  -39.8  -50.1  -74.5  -87.8
whole       -38.2  -37.0  -38.3  -40.2  -41.6  -43.6  -55.1  -79.3  -92.2
swing         6.2    9.1    8.7    8.8    8.5   10.8   19.8   20.1   16.5
```

### lappet-pennyworth

```
band Hz        63    125    250    500     1k     2k     4k     8k    16k
0-5 s       -37.6  -36.7  -37.8  -39.4  -41.0  -43.1  -56.6  -79.8  -91.9
5-10 s      -41.7  -42.7  -43.6  -45.7  -46.9  -50.6  -69.9  -92.0 -101.2
10-15 s     -40.7  -40.3  -41.9  -43.9  -45.3  -48.5  -65.1  -91.6 -100.7
15-20 s     -35.2  -33.5  -34.8  -36.8  -38.2  -39.8  -50.1  -74.3  -87.5
whole       -38.0  -36.9  -38.2  -40.1  -41.6  -43.6  -55.1  -79.2  -91.9
swing         6.5    9.2    8.8    8.9    8.7   10.8   19.8   17.7   13.7
```
