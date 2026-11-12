# Brief v10-A0: the first act

Read first: `AGENTS.md`; the `wilderness` and `world-code` skills; `plans/wilderness-v10.md` (all of it, it is short); `briefs/v10/index.md`; `stories/the-lantern-halt.md`; the `sound-design` skill before you make the cue; the `visual-art` and `storytelling` skills if they help.

## Where things stand

The walk has no interaction: a visitor walks, looks and hops. The owner saw a charcoal tally of travellers on a test building and said: "perhaps this is the seed of the first interaction. come close to tallies, you are offered a chance to press a button and add a tally." This brief builds that, and builds it as the first of several: three more agents will add acts after you, each from its own module, using what you make. So you are building two things: the one act, finished and good; and the small shared thing every later act stands on.

## Goal

A visitor walks up to the foot of the Lantern Halt (`src/v9/waystation.js`, at about (-63, 1) beside the causeway). The slab already carries rows of chalk strokes: everyone who slept in the lantern chalked one. When the visitor is within a few metres and facing them, an offer rises, small and late: a mark and two or three words at the bottom of the view, in the title card's lettering (`src/hud.js`), with a soft sound. They press `E` or click (pointer captured) on a desktop, or tap the offer on a phone. A new stroke is drawn on the stone where the last row ends: drawn, over half a second or so, with the scrape of chalk, a little whiter than the weathered ones. The offer goes. When they reload the page, or come back next week, their stroke is there among the others. One stroke a visit (a visit is a page load); a returning visitor may add another, and the rows grow.

The existing tallies are, by their maker's own word, "small and dim" from the foot. Make the tally wall something that reads from the road as writing on the stone and from two metres as a count of people: this is the place the milestone starts, and the first picture in its release note.

## The shared part

Yours to design; these are the fixed points (the milestone doc's "Calls made"):

- One module owns the offer, the input, the memory and the offer's cue for every act. A place's module registers an act through `ctx` with little code: an id, a position, a reach, a facing test, the words, a `do`, and how often it may be done (once ever, once a visit, freely). Write the contract into `world-code` (`SKILL.md` or `modules.md`, where a later agent adding an act will meet it) with the tally as its example.
- Only the nearest act is offered, only up close and facing it, never from far off. Nothing on screen otherwise.
- Desktop: `E`, and a click while the pointer is captured. Touch: the offer is the button, clear of the stick, the hop ring and the look-drag (`tools/touch-test.mjs` must still pass, and add rows for the offer).
- Memory in `localStorage` under one key beside the settings' (see `src/settings.js` for how settings persist); read at load, so marks are in the world before the visitor arrives; tolerant of storage being unavailable. A quiet row in the settings menu clears the marks ("Forget my marks", or better words in the menu's voice).
- A `?acts=0` switch like every module's, in `runtime.md`.
- Cheap: no per-frame cost worth measuring away from any act; no new point light; nothing built per frame.

## The test

`tools/acts-test.mjs`, in the manner of the other tests under `tools/` (read two before writing), with a `run acts` line in `tools/suite.sh`: the act is not offered at 30 m; is offered at the foot, facing the wall; is not offered facing away; doing it adds the stroke (assert on state the module exposes, and take a render); after a reload the stroke is there and the count is one more than the wall's own; a second press in the same visit does nothing; clearing in settings removes it; on a touch context the offer can be tapped. Try the line with `ONLY=acts tools/suite.sh <port>` the moment you add it.

## Shared files

Another agent (T1) is changing how `src/controls.js` treats the edges of pits right now. Keep your edits there, and in `src/main.js` and `src/world.js`, to a few lines; put new code in new files (`src/v10/`).

## Pace rules that bind you

One headless browser at a time; `nice -n 10` and `SHOT_ANGLE=metal` in front of every `node tools/...` call; no `--trace`. Your port is **8161**. Your worktree is `.claude/worktrees/issue-1000-acts`; work only there, and `git merge origin/next` before you start (the worktree is cut from `main`).

## Done when

- Renders in `shots/wip/`, each looked at by you: `acts-halt-road.png` (the wall from the causeway), `acts-halt-offer.png` (the offer up, desktop), `acts-halt-stroke.png` (after the act, your stroke telling from the rest), `acts-halt-reload.png` (after a reload), `acts-halt-phone.png` (a phone-sized viewport with the offer and the touch controls), `acts-settings.png` (the row in the menu).
- `acts-test`, `touch-test`, `settings-test`, `walk-test`, `hop-test`, `strata-test`, `loading-test`, `perf-test`, `audio-test` and `build-artifact` pass on your port; say the counts. If the cue goes through `ctx.audio.cue`, the `sound-design` skill's gates for a new cue.
- `stories/the-lantern-halt.md` is true to what is built (beat 3, the Log).
- The contract is in `world-code`, and `modules.md` and `runtime.md` have their rows.

Finish as the `world-code` skill's Hand-back says. Report in under 250 words: what changed, the exact commands and counts, the render paths, the exact URL (position, yaw, pitch) where the owner can stand to try it, the contract in five lines, anything surprising, any default you took, and what you would tell the next agent adding an act.
