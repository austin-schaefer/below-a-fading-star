Brief: v17.1 Q2, a controller (#72)
Worktree: `.claude/worktrees/issue-1752-gamepad`, branch `issue-1752-gamepad`, port 8162. Model: opus. Work only there. `briefs/v17.1/_common.md` first.

Goal. The owner's issue is its title: "Add controller support". A visitor with a standard gamepad (the Gamepad API's `standard` mapping: an Xbox, PlayStation or Switch Pro pad) takes the whole walk without touching anything else: left stick walks (analogue: a light push is a slow walk), right stick looks (with a dead zone, a gentle response curve and a sensitivity that feels like the mouse's), a face button hops, a trigger or stick click hurries, a face button does an act where one is offered, Start opens the gear's panel, and in the panel the d-pad or left stick moves between controls and a face button activates, B closes. The title's "Go out" starts from the pad too (a button press is a user gesture in Chromium; check that audio starts). Non-standard mappings: do the sensible minimum (axes 0 to 3, buttons 0 to 3) and say so.

The first time a pad is used, the hints a visitor sees (the title's line about controls, an act's offer that says `E`) say the pad's button instead, and go back when the keyboard or mouse is used. Keep it quiet: no glyph art, a letter in the existing type.

Build it as its own module (`src/gamepad.js` or under `src/v17_1/`) that feeds the same intents `src/controls.js` already takes from keys and touch; touch `controls.js` as little as the seam allows and say what you changed. No per-frame cost with no pad connected beyond one cheap check (`gamepadconnected` arms the polling). Q1 is rebuilding the panel's places as a map and will expose focus functions on the panel's api; until its names reach you, drive the panel through DOM focus (`focus()` on the next focusable, `click()` on the focused), which will keep working whatever Q1 builds if Q1's marks are focusable. Do not edit `src/settings.js` beyond a line or two.

Read: `src/controls.js` (how keys, the mouse and touch become movement, look, hop, hurry and an act), `src/v10/` for the act's offer, `src/startup.js` for the title, `src/settings.js`'s api, `tools/touch-test.mjs` and `tools/walk-test.mjs` as models for a test.

Done when: the plan's Done when 2; a new test (`tools/gamepad-test.mjs`, a `run gamepad` line in the suite) that fakes `navigator.getGamepads` and the connect event and shows: the walker moves and turns by the sticks in proportion, hops, hurries, does an act, the panel opens, focus moves, a place is gone to, the panel closes, and with no pad nothing polls; `ONLY=gamepad,walk,touch,settings,loading,perf` green; frames of the hint changing.

What the owner can do: plug a controller in at `http://localhost:8123/` and press a button.

Finish and report as `_common.md` says.
