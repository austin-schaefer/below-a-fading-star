# Brief v9-M0: the score, the text harness, one track, the skill

**Goal.** After this brief an agent that cannot hear can write a piece of slow, plain, old-sounding music for this walk as a data file, and know in seconds, from text, whether it holds together. Everything later in v9 builds on what you define, so the formats matter more than the amount.

Read first: `AGENTS.md`, the `wilderness` skill, `plans/wilderness-v9.md`, `briefs/v9/index.md` (the design binds you where it is specific and is yours to improve where it is not; say what you changed), `.agents/skills/sound-design/` (all of it: the palette and the craft rules; note what the owner said about that harness's cost), `src/audio/cues-v2.js` ~30–60 (the carillon's scale), `src/audio/bed.js` ~85–110 (the drone).

**Build.**
1. `src/audio/music/score.js`: pure JS, importable by Node and the browser, no Web Audio and no DOM. The track format and `compose(track, seed)` → a sorted event list `{ t, dur, voice, ratio, vel }` (ratio from D3 = 146.83 Hz, just intonation). Phrase generators: drone, loop, walk with a returning motif; add what the reference track needs. Seeded (`mulberry32` or the repo's own rng if it is importable without the world). Document the format at the top of the file, with a complete small example.
2. `src/audio/music/tracks/moor.js`: the reference track, the one a visitor hears first, on the open moor. Dungeon synth, not high fantasy: slow, modal (D Aeolian or Dorian), a pad drone on D and A, a monophonic melody of few notes with long rests, perhaps a second voice in fourths or fifths; old, plain, a little sad, not sweet. 120–180 s.
3. `tools/music-score.mjs <track|all> [--roll] [--json]`: Node only, runs in well under a second. Prints the metrics and gates listed in the index as a compact text table with PASS/FAIL lines, and with `--roll` an ASCII piano roll (time across, pitch down, one character per beat or half-second) that lets a reader see the shape of the piece. Tune the gate bands against your track and against two deliberately bad tracks you write as fixtures (one random-walk noodle, one static drone with nothing happening): the gates must fail both and pass yours. `tools/music-score-selftest.mjs` pins that. Add both to `tools/suite.sh`.
4. `.agents/skills/music/SKILL.md` (then `tools/link-skills.sh`, and a row in `.agents/skills/README.md`): how an agent writes and judges a track here. The situation (it cannot hear; the owner will); what good is (the genre in concrete terms, the key and why, what the world's sounds already occupy, intermittency); the loop with the tools; the gates and what each protects against; what the gates cannot tell you and so what to be conservative about. Under 150 lines. Amend `sound-design`'s `palette.md` by one line pointing at it.

No browser is needed for any of this; do not launch one. No changes outside `src/audio/music/`, `tools/music-*`, `tools/suite.sh` (two lines), the skills. v8's agents are working elsewhere in the tree at the same time.

**Done when** `node tools/music-score.mjs moor --roll` prints a passing table and a roll a reader can follow; the self-test passes; the skill reads cold.

**Report** in under 200 words: the track format in five lines, the gates as tuned with the moor track's numbers, the piano roll's first 40 seconds pasted, what you changed from the index's design, every default you took.
