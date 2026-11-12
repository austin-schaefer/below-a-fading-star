# Wilderness v9: the music

Austin, 2026-11-11 (issue #2, "Environmental music"): "v7.2 added a leveled-up soundscape, but our sounds are all environmental cues: they're the literal sound of things in the environment. Let's create subtle music to heighten mood and immersion. The music should be ambient, low-key. Think dungeon synth, not high fantasy. Music shouldn't be omnipresent, either: take inspiration from Minecraft, where music shows up intermittently and is punctuated by significant periods of pure environmental sound. Ideally, we have music tracks for each bioregion, plus perhaps a couple special music tracks for the most notable locations like the big bridge, the gates that frame the setting sun, the keep. Just as 7.2 created an agent harness for sound, this release should also research and integrate an agent harness for music. One caution: the sound harness seems to be slow and expensive to run. So let's not repro that system too literally. (In fact, we might want to change that sound harness as well.)"

**v9 comes after v8.** Austin, 2026-11-11, in session: "let's treat music as a v9 after the CCC v8 :)". Until v8 (`plans/wilderness-v8.md`) is released, v8 is the current milestone even though this file has the higher number: a cold session works v8 and dispatches nothing from here. Briefs and the design, ready for then: `briefs/v9/index.md`.

## Status

**2026-11-11, 19:03 PST. Nine tracks merged; M2 back and held for M1; five new issues triaged.** M3 (wood, wet, cold, garden, dry) and M4 (span, keep, gates) are merged: `node tools/music-score.mjs all` prints 207 PASS, 0 FAIL (nine tracks, 19 gates each, 36 pair distances; the closest pair is keep/moor at 0.28). M2 (director, simulator, bus, setting, `?music=`, `tools/music-test.mjs`) reported done on `issue-902-music-director` (sim 14/14, music-test 15/15, audio 73/73) and is **not merged yet**: its glue imports M1's `player.js`, so it merges after M1, and then needs (a) the eight new tracks added to its `catalog.js`, (b) its one settings-test failure ("teleport: the whole map", 65/66) checked against `next`, (c) a cold review. The owner filed #15 to #19 at about 19:00: #17 (footsteps a hair too loud), #19 (wood light shafts from nowhere) and #16 (clear the white figure of rocks and plants) ride along with v9 as brief T1; #18 (the wood) is planned as v11 and #15 (walk to the edge of pits) joins #4 in v12; `plans/ROADMAP.md` has the order. The owner asked to be sent example tracks as soon as they exist: give the WAV paths from `shots/wip/music-*.wav` and the `?music=<track>` URL on 8123 when M1 lands. The owner lifted the collaborators-only limit for a test at 18:56 and it was restored at about 18:59 (the upload failure was a file over GitHub's size limit).

Known flaw to fix after M1 merges: `score.js` applies a walk's rubato after its roughness check, so a jittered onset can land rough against a held chord (the keep track sets rubato 0 to avoid it).

In flight: M1 (opus, `issue-901-music-sound`, 8162), M5 (sonnet, `issue-905-sound-harness`, 8165), T1 the owner's three tweaks (opus, `issue-910-owner-tweaks`, 8166, `briefs/v9/brief-v9-T1-owner-tweaks.md`).

**2026-11-11, 18:39 PST. M0 merged; M1, M2 and M3 out beside M5.** M0 (the score) merged at about 18:37 after the orchestrator ran its tools (`music-score moor` 19/19, self-test 60/60) and a cold review found no blockers: `src/audio/music/score.js` (`compose(track, seed)`; generators drone, loop, walk, follow, notes), `tracks/moor.js`, `tools/music-score.mjs`, the `music` skill. Notes carried into the next briefs: events carry `voice`, not `patch`; drones are held 30 s and more; moor's lead lands every onset on the beat and its last 30 s are pad alone (M3 is told to do better). In flight (four implementation agents, the limit):

| Brief | Model | Branch / worktree | Port |
|---|---|---|---|
| M1 patches, player, `tools/music-render.mjs` (`brief-v9-M1-sound.md`) | opus | `issue-901-music-sound` | 8162 |
| M2 director, simulator, bus, setting, `?music=` (`brief-v9-M2-director.md`) | sonnet | `issue-902-music-director` | 8163 |
| M3 five region tracks: wood, wet, cold, garden, dry (`brief-v9-M3-tracks.md`; started before M1 lands because tracks are data judged by text) | sonnet | `issue-903-music-tracks` | none |
| M5 the sound harness made cheaper | sonnet | `issue-905-sound-harness` | 8165 |

Next: merge each after a look and a cold review; M2 after M1 (it calls the player); then render every track (`music-render all --wav`), M4 (three special tracks), the gate, the critic, WAVs and `?music=` to the owner, release.

**Opened 2026-11-11, 18:27 PST**, on `next` (equal to `main` at the v8 release, `5514e71`, plus this entry). v8 shipped at 18:24 and the owner's word was "once you ship this milestone, go ahead and pick up the next one", so v9 opens in the same session. In flight, each in its own worktree under `.claude/worktrees/`, pushing a branch and no PR:

| Brief | Model | Branch / worktree | Port |
|---|---|---|---|
| M0 the score, the text harness, the moor track, the `music` skill (`briefs/v9/brief-v9-M0-score.md`) | opus | `issue-900-music-score` | 8161 if it serves |
| M5 the sound harness made cheaper (briefed in the dispatch prompt from the index's M5 row: spectrograms off by default with a text band table, one page for all poses, `--poses=`, the skill updated, no gate loosened) | sonnet | `issue-905-sound-harness` | 8165 |

Next: when M0 reports, look at its piano roll and gates, cold review, merge; then write and dispatch M1 (patches, player, render) and M2 (director, simulator, bus, setting, `?music=`) side by side from what M0 defined; then M3 and M4. Before release the owner gets a WAV of every track and `?music=<track>`; that is a "Done when", and the release leans rare. The owner's standing words from the v8 session still hold and are listed in `plans/wilderness-v8.md` (the 17:08 entry).

**Planned, not started (2026-11-11, 14:08 PST).** A research and design agent read the sound code and harness and searched for how programs compose without hearing; its findings are the design in `briefs/v9/index.md`, and the first brief (M0: the score format, the text harness, one reference track, the `music` skill) is written. Nothing is dispatched and nothing will be until v8's release is on `main`. Then: M0 alone first, because every later brief builds on its score format.

## What a visitor should notice

A minute or two into the walk, with nothing announcing it, a slow piece begins under the wind: a few voices, old and plain, in the key the bells and the gutter already share. It lasts two or three minutes and ends. Then, for a long while, only the land. Somewhere else, later, a different piece that belongs to that ground. On the Span, in the keep's court and between the colossi at the sun's gates, a piece that plays there and nowhere else, once a visit. When the sun gutters the music gets out of its way. A visitor who dislikes it can turn it down or off.

## Done when

- A track for each of six region pools and three special places, each passing the score gates and the one audio check.
- The director's ten simulated hours show silence at least 70% of the time, no start during a gutter, every pool reached.
- The owner has a WAV of every track and a URL that plays any of them at once (`?music=<track>`), before the release.
- An agent can change a track and know whether it still passes in seconds, reading text, with no browser.
- The sound harness's full gate is cheaper by a stated, measured amount, and the `sound-design` skill says so.
- `tools/suite.sh` green.
