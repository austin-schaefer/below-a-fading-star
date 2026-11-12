# Brief v9-M2: the director, the bus, the setting, `?music=`

**Goal.** Music arrives unannounced a minute or two into the walk, lasts two or three minutes, and is then gone for a long while; it never starts in a gutter and it steps back when the sun dims. The owner can hear any track at once with `?music=<track>`.

Read first: `AGENTS.md`, the `wilderness`, `sound-design` and `music` skills, `plans/wilderness-v9.md`, `briefs/v9/index.md` (the design: `director.js`, the bus, the simulator, the pools and specials), `src/audio/music/score.js`, `src/audio/graph.js`, `src/audio/bed.js` (`f.swellSm`), `src/sky.js` (`ctx.sky.flicker.next`), the settings menu's code, `ctx.regions.regionAt`.

**Build.**
1. `src/audio/music/director.js`: a pure state machine, no Web Audio and no DOM: `step(dt, { weights, place, swellSm, gutterIn, moving })` → actions (`{ start: track }`, `{ stop }`, `{ duck: gain }`). First track 60–150 s in; silences 4–9 minutes (lognormal); the setting "Music: off / rare / default / frequent" scales them; pools by region as the index lists (only `moor` has a track today: a pool with no track yet falls back to silence, not to moor, except that the first piece of a visit is moor's); specials (the Span, the keep, the sun's gates) after 15 s in the place, once a visit, as hooks with no tracks yet; never start with a gutter due inside the track's first 20 s; seeded, deterministic.
2. `tools/music-director-sim.mjs`: ten simulated hours of a walker's regions and gutters through `director.js`, in Node, text. Gates: silent ≥ 70% of the time, no start in a gutter, every pool with a track reached, the setting's four values ordered. A `run` line in `tools/suite.sh`.
3. The bus: `musicBus` → `master` in `src/audio/graph.js`, with a send straight into the stone room's convolver (no fourth convolver), ducked by `swellSm` (to silence in about 1.5 s in a gutter, back on its tail). A few lines there, no more.
4. The glue, `src/audio/music/index.js`: on the live walk, each frame feeds the director and turns its actions into calls on M1's player (`play(events, { ac, dest, at })`, `stop(fade)`, `fadeTo(gain, s)`; M1 is building `patches.js` and `player.js` beside you and commits the interface at the top of `player.js` early: fetch its branch `issue-901-music-sound` to read it, and until it lands code against that interface with a stub so your tests run). Music uses the audio context already started on "Go out".
5. The setting in the settings menu (default "default"), persisted like the others; `?music=<track>` plays that track 3 s after the walk begins, `?music=0` is off; the debug panel lists the tracks.
6. `modules.md` / `runtime.md`: a row and the URL param. The `music` skill: how the director decides.

**Not yours:** `patches.js`, `player.js`, `tools/music-render.mjs`, new tracks. `tools/audio-*.mjs` are being changed by M5.

**Done when.** The simulator's gates pass; with the stub player, a headless walk shows the director starting moor between 60 and 150 s (a test may speed the clock) and not during a gutter; `audio-test` still 73/73 (the bus must not change the existing mix when no music plays); `walk-test`, `perf-test`, `loading-test`, `grass-flicker-test`, `touch-test`, `build-artifact` pass; no per-frame allocation in the glue.

Finish and report as the `wilderness` skill's Hand-back says, under 200 words, with the simulator's text output.
