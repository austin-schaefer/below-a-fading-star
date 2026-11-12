# Brief v9-M4: three special tracks

**Goal.** Three places get a piece of their own that plays once a visit, after a visitor has stood there a little: the Great Span (the giant bridge: height, wind, a long way down; slow, wide intervals, bells far apart), the keep (Carcanet Keep: the oldest, plainest, most hymn-like; organ and choir, the nearest thing here to a chorale, still sparse), and the sun's gates (the saddle between the Thrones, facing the dying sun: the one piece allowed to be a little grand and then to give up; it may end unresolved on A).

Read first: `AGENTS.md`, the `wilderness`, `sound-design` and `music` skills, `briefs/v9/index.md`, `src/audio/music/score.js`, and all six tracks in `src/audio/music/tracks/` (yours must differ from each: the tool's pair-distance gate checks it).

**Build** `src/audio/music/tracks/span.js`, `keep.js`, `gates.js`. In D, 90–180 s, every gate of `node tools/music-score.mjs all` passing for every track and pair, and at seeds 1–10. Each has a motif no other track uses. Leads use rubato and uneven durs. Patch names: pad, organ, flute, choir, bell. If the format lacks something you need (the chorale may want a second written voice: `notes` and `follow` exist), add it to `score.js` additively with a header line and a self-test case, keeping every existing track's event list identical (print the counts before and after).

**Not yours:** patches, player, director, glue, render tool, `tools/audio-*.mjs`. Plain Node; no browser, no server.

**Done when.** `node tools/music-score.mjs all` and `node tools/music-score-selftest.mjs` pass. Report each track's character in a line, the tool's header line, and the first 40 s of each roll pasted as text.

Finish and report as the `wilderness` skill's Hand-back says, under 300 words.
