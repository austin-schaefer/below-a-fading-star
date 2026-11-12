# Brief v9-M3: five more region tracks

**Goal.** Each kind of country has its own slow piece, recognisably from the same hand as the moor's but not the same piece: a visitor who hears the wood's after the moor's knows they are somewhere else.

Read first: `AGENTS.md`, the `wilderness`, `sound-design` and `music` skills (the `music` skill is your method: write data, run `node tools/music-score.mjs <track> --roll`, read text), `briefs/v9/index.md`, `src/audio/music/score.js` (the format), `src/audio/music/tracks/moor.js` (the reference).

**Build** `src/audio/music/tracks/<name>.js` for the five pools that have no track: `wood` (the Deodand Wood: dark, close, low choir, Phrygian), `wet` (fen, Saltings, Strandline, tarn: sparse, bells over a still pad, long silences inside the piece), `cold` (Lattice, High Ling, Outwash: high, thin, glassy, fifths and fourths, the Lattice hums A4), `garden` (Demesne, Bletting: the nearest to warm, Dorian, an organ, a little courtly, a little wry), `dry` (Adust, Lynchets: a single flute, almost no pad, wide rests). All in D (the key the bells, the stones and the gutter share), 90–180 s, tempos spread across 50–80 BPM, different motifs, different voice sets, loops of different prime-ish periods.

Each passes every gate of `tools/music-score.mjs`; `node tools/music-score.mjs all` passes its pair-distance gate for every pair (the tracks really differ), and each track passes at seeds 1–10 at least. Where the reference is weak, do better: its lead lands every onset on the beat grid (use the walk's `rubato` and uneven `durs`), and its last 30 s are pad alone. If a gate stops a piece that is plainly right, or passes one that is plainly wrong, change the gate in `tools/music-score.mjs`, add the case to `tools/music-score-selftest.mjs`, and say so. If the format lacks something (a generator, a field), add it to `score.js` with a header line and a self-test case; keep moor's output identical (the tool prints its event count: 58 at seed 7).

**Not yours:** patches, player, director, the render tool (M1 and M2 are building them beside you; you need no browser and no server). Patch names you may use: pad, organ, flute, choir, bell.

**Done when.** `node tools/music-score.mjs all` and `node tools/music-score-selftest.mjs` pass; the report gives each track's one-line character, its header line from the tool, and the first 40 s of its roll.

Finish and report as the `wilderness` skill's Hand-back says, under 300 words.
