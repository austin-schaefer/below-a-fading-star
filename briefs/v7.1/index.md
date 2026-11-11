# v7.1: Austin's notes on the living

Austin walked v7 on prod (2026-11-08 evening) and sent this list. It is the whole of v7.1, four agents at once, one release PR. His words, verbatim, are the spec; the briefs below say how.

- "not sure i see the 'indistinct' at all"
- "not sure i can find the repetend; might be too subtle?"
- "i found gnats but they are VERY subtle"
- "erratic glyph also VERY subtle"
- "there's a weird blurry / swimmy effect at end of that salt floor stuff in motion" (his screenshot: `austin-salt-floor-shimmer.webp`)
- "similarly a lot of water looks very janky"
- "cut all the pawns, they are too much random noise" (the v4 kit's measure figures)
- "really like bather but no need to have her vanish / break into rocks until REALLY close"
- "deer ignore all collision"
- "link boy seems to think there are paths thru some of the piers of the giant bridge..."
- "i have tweaked/finalized quotes in the place-copy" (applied on the working branch before dispatch)
- "i wouldn't mind a few more named places for me to find quotes for" (eight region cards offered in his draft file; applied when he fills them)
- "teleporting disables debug menu. also the teleport options on pause menu seem like a random subset. also have pause menu show coords."
- "just a general note i think a lot of the color / embellishments are slightly too subtle esp on the creature / fauna / flora side. don't go crazy but just a bit of visibility would help them to not simply be missed"
- "the keening noise when the sun gutters is far too abrasive"
- Earlier the same evening: "prod performance seems capped at like 10 fps for me now??" while playing actively; it cleared on its own. The only 10 in the code is the idle cap (`IDLE_FPS` in `src/main.js`), which trusts blur/focus events.

| Brief | Worktree / port | Model | What |
|---|---|---|---|
| `brief-v7.1-01-legible.md` | `v7.1-legible` / 8160 | Opus | the Indistinct, the Repetend, the Simulacrum's gnats, the erratic glyph made to read; the Bather stays a woman until really close |
| `brief-v7.1-02-world.md` | `v7.1-world` / 8161 | Opus | the pawns cut everywhere; the deer respect colliders; the Link-Boy keeps to the lead and never crosses a pier |
| `brief-v7.1-03-visual.md` | `v7.1-visual` / 8162 | Opus | the salt floor's swimmy edge; the water surveyed in motion and fixed; a v6.7 vs v7 comparison |
| `brief-v7.1-04-ui.md` | `v7.1-ui` / 8163 | Sonnet | settings: coords, the full teleport list with the living, teleport keeps the debug panel; the idle cap hardened; the gutter's keening softened |
| `brief-v7.1-05-visibility.md` | `v7.1-visibility` / first free port | Opus | a bit more visibility for the creatures, the fauna and the flora: colour and embellishment lifted, not redesigned; dispatched when a slot frees |

Shared files: `src/main.js` (04 only), `src/hud.js` (04), `src/settings.js` (04), `src/debug.js` (04), `src/v4/kit/scale.js` and its 11 call sites (02), `src/fauna/grazers.js` (02), `src/v7/walkers/linkboy.js` (02), `src/v7/small/*` and `src/v7/glyphs/erratic.js` and `src/v7/canyon*` (01), water and region shaders (03). `plans/wilderness-v5.md`: each agent appends a short "v7.1" note under the figure's section rather than a new heading; keep-both merges. `RELEASES.md` is the orchestrator's.
