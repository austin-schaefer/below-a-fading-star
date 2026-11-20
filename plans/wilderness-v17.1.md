# v17.1: easier to get around, and better tools for making it

A point release the owner asked for by number (in session, 2026-11-19): "bundle up a mini-milestone of QoL fixes: #70 #72 #77 #23, maybe #18 as a follow-on to that first batch of work", "pursue until shipped".

## What was chosen, and why

The owner's word; nothing was chosen. How each issue is taken is the orchestrator's call:

- **#70, the teleport menu** becomes a drawn map of the valley a visitor can read without knowing a name: fewer stands, each a mark on the map with what it is in plain words.
- **#72, a controller**: the walk and its panels work on a gamepad.
- **#77, the study page**: as the issue's "Done when" says. Harness; a visitor sees nothing.
- **#23, music v2** is taken as its own issue says it must be: the owner's ears first. This release builds round one only: three or four contrasting sketches on a listening page off the walk, with a test of sampled instruments against the oscillators. Music in the walk stays off by default and experimental. Composing the rest waits for the owner's "this direction" (Waiting on the owner, below). The orchestrator's reading: "pursue until shipped" ships the round the owner can answer, not nine tracks nobody has heard (v9's mistake, and `orchestrator`'s "one before nine").
- **#18, the forest** is not in this release. It is the next milestone (v18), opened once v17.1 is live, on the owner's "follow-on".

## What a visitor should notice

1. The gear's panel shows a map of the valley; they pick a place by where it is and what it looks like, not from a wall of names.
2. With a controller plugged in, they walk, look, hop, hurry, do an act and work the panel without touching the keyboard.

## Done when

1. **Map (#70):** the panel's places are a drawn map with at most about sixteen stands, each with a plain description; it works with mouse, touch (390 by 844) and keys; `settings` green with rows for it; a blind reader shown the panel says what it is and picks a place without help.
2. **Controller (#72):** standard-mapping gamepads walk, look, hop, hurry, act, open and work the panel and start the walk from the title; nothing changes for a visitor without one (no per-frame cost when none is connected beyond one check); a test drives the walk through a faked gamepad; the title or panel says which button does what.
3. **Study page (#77):** the issue's Done when, line by line.
4. **Music round one (#23):** a page off the walk (`listen.html`, not linked from it) that plays three or four contrasting 30-second sketches, each composed note by note with a theme, each said in a plain line; the sampled-instrument test reported with its licence and size; the gates as tripwires only; music in the walk unchanged.
5. The whole suite green on `next`; nothing slower on the low tier.

## How it is built

Four briefs at once, `briefs/v17.1/`. A point release: the suite, a cold read of each diff, a blind read of what a visitor sees; no critic, no curator (`orchestrator`, "A small release goes faster").

## Status

**2026-11-19, 23:58 PST. The gate is green; releasing.**

- **The first whole run was void.** Ports 8123 and 8160 are held by servers of the owner's other project, so 38 tests loaded another site and failed in under a second each. Those servers were left alone. `next` is served on **8171** for this session (not 8123). `tools/suite.sh` now refuses a port that does not serve its own checkout, and the `orchestrator` and `wilderness` skills say to check whose server a port is.
- **The second whole run, on 8171, on everything that ships:** 49 tests, 48 green, 46 min 46 s. Red: `shore` (tarn-north at medium, a worst step of 3.79 against 3.00), **rerun alone: 6 passed, 0 failed**; nothing in v17.1 touches water, light or shadow, and it was red beside nothing else. Taken as load. After the run only `tools/suite.sh` (the preflight) and docs changed; `ONLY=releases` rerun green.
- **Done when, line by line.** 1 the map: met (sixteen marks, mouse, touch, keys, pad; `settings` 103; the blind reader named it and picked a place, and called the chart murky). 2 the controller: met by the test with a faked pad; **not met in the hand** (no real controller was used). 3 the study page: the issue's lines met; four figures deferred. 4 music round one: met; unheard. 5 the suite: as above.
- No critic, no curator (a point release); each diff was read cold by an opus reviewer, and the reviews found what the tests could not: the two-pad and resting-trigger bugs, and the service worker failing `listen.html` for returning visitors.

**2026-11-19, 22:28 PST. All four merged; the gate is running on `next`.**

- **Q2 the controller** (opus, two rounds; `briefs/v17.1/reports/issue-1752-gamepad.md`): `src/gamepad.js`, fetched on the first `gamepadconnected`, polling only while a pad is connected; `controls.js` takes a pad vector and hurry; `main.js` one line (a pad's start skips pointer lock). The cold review's two blockers fixed in round two: two pads both holding a button fired it every frame; a non-standard pad's trigger resting at -1 read as a full right stick. `gamepad` 39. **Weak:** never held in a hand (a faked pad only); whether a pad press starts the sound outside headless Chromium is unverified.
- **Q1 the map** (opus, two rounds; `issue-1751-map.md`): `src/v17_1/map.js`, drawn from height, water and cover on the panel's first open in 12 ms slices; sixteen marks; `focusNext`, `activate`, `back`, `focused`, `mapReady` on the panel's api, which the pad drives. Stand checks still run on every `PLACES` entry. `settings` 103. **Weak:** the chart is dark and soft, the glacier a pale blob, some glyphs need their line; the panel's own first open has a 117 ms task under 6x throttling (not the map's).
- **Q3 the study page** (opus, two rounds; `issue-1753-study.md`): `study.html`, `src/study/`, 45 modules registering 62 subjects, 21 recipes at six seeds; `tools/study-shots.mjs`, `study` in the suite. Local only (the Netlify build does not copy it). Leaves are about 1.5% bright in their own colours, so the neutral light lifts each cell and says by how much. `DEFERRED` (four figures not on the page) can only shrink. **Its first reading, for the next briefs:** worst figures the woman in the tarn, the dead-letter clerk, the burner, the child on the Leads; most rigs are frozen between frames 0.4 s apart (they want an idle layer); birds, bats and the eel are flat black shapes; the crystal shard, the carrier house, the fallen trunk, the Sleeper's medlar, bracken and the undercroft look like one thing six times. In `plans/IDEAS.md`.
- **Q4 music sketches** (fable, two rounds; `issue-1754-music-sketches.md`): `listen.html` (published: `netlify.toml` copies it), four sketches (the moor, Carcanet Keep, the gardens, the dry country), an oscillator-against-samples pair; `src/audio/music/sampler.js`; 56 CC0 notes from VSCO-2-CE, 1.06 MB, `vendor/samples/LICENCES.md`. The walk's music is untouched. The cold review's blocker fixed: the walk's service worker controlled `listen.html` and failed its every file for anyone who had opened the walk before; `sw.js` now passes a page that is not the walk's to the plain network (`sw` has the row). The dry country rewritten (7/8 on A) because it shared a head, a peak and a close with the moor. **Nobody has heard any of it.**
- **The gate:** the whole suite on `next` (shared code changed: `controls.js`, `main.js`, `sw.js`). Result below when it is in.

### Waiting on the owner

- **#23, which direction.** Listen at `/listen.html` (live once v17.1 is) and say which of the four to take further, which not at all, and what to change in the best one. Nothing more of the music is built until then.
- **#72: a real controller.** Plug one in and say what feels wrong (look speed, which button does what).

**2026-11-19, 21:16 PST. Opened.** v17 is live (802b280); `next` is two harness and doc commits ahead. Issues #70, #72, #77, #23 are `in-progress`, `v17.1`. In flight: Q1 the map (`issue-1751-map`, 8161, opus), Q2 the controller (`issue-1752-gamepad`, 8162, opus), Q3 the study page (`issue-1753-study`, 8163, opus), Q4 music sketches (`issue-1754-music-sketches`, 8164, fable: a problem v9 did not crack). `issue-1527-edges` (W3) stays paused, its worktree kept. Next: check and merge each as it reports, the suite on `next`, release v17.1, then open v18 (the forest, #18).
