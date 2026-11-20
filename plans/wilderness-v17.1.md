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

**2026-11-19, 21:16 PST. Opened.** v17 is live (802b280); `next` is two harness and doc commits ahead. Issues #70, #72, #77, #23 are `in-progress`, `v17.1`. In flight: Q1 the map (`issue-1751-map`, 8161, opus), Q2 the controller (`issue-1752-gamepad`, 8162, opus), Q3 the study page (`issue-1753-study`, 8163, opus), Q4 music sketches (`issue-1754-music-sketches`, 8164, fable: a problem v9 did not crack). `issue-1527-edges` (W3) stays paused, its worktree kept. Next: check and merge each as it reports, the suite on `next`, release v17.1, then open v18 (the forest, #18).
