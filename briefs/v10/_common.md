# v10 batch 2: what every act brief shares

Read first: `AGENTS.md`; the `wilderness` and `world-code` skills (its "Acts" section is the contract: `ctx.acts.add(def)`; the worked example is the tally, `src/v10/tally.js`, registered from `src/v9/waystation.js`); `plans/wilderness-v10.md`; the `storytelling` and `visual-art` skills; the `sound-design` skill before any sound.

**What an act is here.** The walk asked nothing of a visitor until the tally at the Lantern Halt: come close, face the thing, be offered two or three words, do one small thing, and the world keeps the mark. Yours is one of five more. The owner asked for two things at once: light acts in the tally's spirit (issue #24), and a payoff for reaching a place's central thing (issue #9): "a little implicit storyline there, something cool that you can't see till you get there... Incent exploration by paying it off thru experience."

**What good looks like.**
- The act is small; what answers it is not. Pressing the key is nothing. What the world does because you pressed it is the whole brief: seen or heard from where you stand, strange, in this world's voice and no other game's, and over in seconds, not a cutscene. Not the first idea you have: write down what any game would do there, set it aside, and ask what only this place would do.
- It is remembered. A returning visitor finds the place changed by what they did (`show(n)`), and where the brief says so, changed further.
- No text but the offer's two or three words. No explanation, no reward counter, no quest.
- It is found, not signposted: nothing shows from far off except what the place already shows.
- It works on a phone (the shared module handles the offer; check it) and costs nothing per frame while not being done. No new point light unless your brief says so (`world-code`, the lights budget).

## The owner tried the first act (23:48 PST, 2026-11-11) and it was not good enough

Their words, on the tally as first merged: "uhhh. it didn't seem to work? no animation? the hanging chalk is a meter away from the chalkmark? we're gonna need to do better on legibility". And, about every act: "these things need meaningful actions. like, i ring a great bell: what happens next".

What had been built: a thin stroke that appeared over half a second among 470 others, a metre from the chalk that was supposed to have drawn it, and then nothing. It passed 39 test rows and a review. So, for every act, on top of everything above:

- **The doing is seen.** The thing the visitor uses moves: the chalk leaves its cord, goes to the stone and draws; the beam swings and strikes; the hand's work takes one to three seconds, in the middle of the view, big enough to follow at 1280x720 with the sound off. If a stranger shown three frames (before, during, after) cannot say what was done and by what, it is not built.
- **Cause sits next to effect.** The tool, the mark and the offer are in one place. Nothing happens off to the side of where the visitor is looking.
- **Something happens next.** The act is the first half; the second half is the world doing something because of it, that the visitor did not expect and can follow: something arrives, opens, wakes, comes down, lights along a line, answers from across the map and then comes nearer. It can take a minute. It should give the visitor a next thing to walk to or to do (the contract's `when()` lets one act open another). "A sound plays and a light pulses" is not an answer.
- **Check it moving.** Take frames through the act (the `js` hook of `tools/views.mjs`, or a short Playwright script on your port: before, 0.3 s, 1 s, 2 s, 5 s, 20 s after) and look at them in order, as the owner would.

**Shared files.** Two other agents are adding acts beside you. Put your code in new files under `src/v10/` and register from the place's own module in a few lines. In `tools/acts-test.mjs`, `tools/audio-test.mjs`, `src/v10/sound.js`, `modules.md` and `runtime.md`, add your rows as one small block and leave the rest alone, so the three branches merge cleanly.

**Pace rules that bind you.** One headless browser at a time; `nice -n 10` and `SHOT_ANGLE=metal` in front of every `node tools/...` call; no `--trace`. Work only in your worktree; `git fetch origin && git merge --no-edit origin/next` before you start (the worktree is cut from `main`).

**Done when (every brief).**
- Renders in `shots/wip/`, each looked at by you, named `acts-<place>-<what>.png`: the place from the approach, the offer up, the answer at its height (several frames if it moves), the place on a return visit, and a phone-sized one. Read each picture as a stranger would: if the answer cannot be seen in the frame, it is not built.
- `acts-test` has your rows (offered at it, not from far or from behind, done, remembered after a reload, forgotten on a forget) and passes; `audio-test` has a row for each cue and passes; `touch-test`, `walk-test`, `hop-test`, `perf-test`, `loading-test`, `settings-test` and `build-artifact` pass on your port. Say the counts.
- The story file in `stories/` is true to what is built (a new file from `_template.md` if the act makes a story), and the index row with it.
- `modules.md` and `runtime.md` rows.

Finish as the `world-code` skill's Hand-back says. Report in under 250 words: what a visitor does and what answers, the exact commands and counts, the render paths, the URL (position, yaw, pitch) to stand at, anything surprising, any default you took.
