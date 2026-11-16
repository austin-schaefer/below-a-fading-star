# Brief v14-B1: the acts' faults (#38, #39, #40, #43, #46)

Worktree `.claude/worktrees/issue-1401-acts-faults`, branch `issue-1401-acts-faults`, port 8162. Work only there. Read `briefs/v14/_common.md` first and do what it says. Read `plans/wilderness-v10.md` for what an act is and `briefs/v10/_common.md` for its rules.

The owner walked v10's acts and wrote down what broke. Their words are the whole of each issue (read each: `gh issue view <n> --json title,body`; the screenshots are linked in the bodies, fetch and look at them if you can):

- **#38 "The 'interactable' glow is insanely visible"**: "To the point of being completely immersion breaking". The lure (`src/v10/lure.js`); v12's critic also said it "reads as a pale many-armed creature". An offer still has to be findable (v10 shipped acts nobody could find, which is why the lure exists): make it something that belongs to the world and to the thing offered, quiet at a distance and plain close to. Show it at 30 m, 10 m and 2 m at three acts, against the before frames.
- **#39 "when you 'take the seat', you clip inside the wall"**: the Lantern Halt's seat ride.
- **#40 "Why does a giant ring swell on the ground when you ring the bell?"**: the bell under the Span. The owner is asking what it is, which means it reads as nothing. Either it is a thing in the world with a cause a visitor can see, or it goes; and the owner's earlier note stands: "i ring a great bell: what happens next".
- **#43 "When the hand extends a letter under the door..."**: "The hand fires way before the letter. So they happen at two complete different times." The Hypogeum's door (`src/v10/door.js`; the thing passed is a bronze plate in the story, `stories/the-reckoner-under-the-door.md`).
- **#46 "Escape in-game should open settings, not just the pause menu"**: "... these should likely be combined". One panel: what pause has and what the gear has, opened by Escape and by the gear, on desktop and touch.

Each is reproduced first (keep the before frames), fixed at its cause, and judged moving in a real browser as `_common.md` says: frames at 0.3 s, 1 s, 2 s and 5 s after the key, in order.

Done when: the five are fixed or named as not fixed with why; `ONLY=acts,settings,touch,walk,loading tools/suite.sh 8162` passes with counts, plus checks added to `acts-test`/`settings-test` where a fault can be caught by one (the seat's eye never inside a collider; the hand and plate within a beat of each other; Escape opens the one panel).
