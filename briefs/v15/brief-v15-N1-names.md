# Brief v15-N1: names, the map, and the village's cost near on low

Worktree `.claude/worktrees/issue-1525-names`, branch `issue-1525-names`, port 8168. Work only there. Read `briefs/v15/_common.md` first. Helpers that read images run on `haiku` or `sonnet`.

## Goal

1. **Names in one voice.** Six agents named things: the Lappet, the Strake, the Quarrels, the Rungs (the Leads, the Gullet, the Tenter, the Slype, the Squint, the Cantle, the Pier Stair, the Short Stair), the Lees (the fountain of noon, the Wanting Arch, the Lagan, the Ullage, the Welt, the Tare, the Rebate), the Pennyworth (the Thumbway, the Hitch, the Slip, the Grudge, the Spilt Measure, the Skirts, the Leave, the Afterdoor), the Smoking Saint. Read `stories/README.md` on the valley's voice and `AGENTS.md` on names; keep what is good, rename what is weak, twee or doubled, drop `[Proposed]`, and make code, plan titles, story files, docs and tests agree (one commit per rename; grep is your friend).
2. **Told to the visitor the way the walk tells things:** title cards on arriving (how other places do it: `src/v8/places.js`, the HUD's names at the end of a way up, `tools/settings-test.mjs` "names:"), a name for each way up that `ctx.ascents` registers, and places on the settings map (the village's quarters, the fountain, the saint, the south door) with stands that face their thing with nothing within 3 m of the eye (`settings-test` checks it; it hard-codes the place count: update it). Few cards: a quarter, not every lane.
3. **The village near, on low.** Standing in the square, the Rungs' middle or the Pennyworth, low draws about 318k triangles and 24 to 26 calls against a 250k budget (`briefs/v15/reports/issue-1522-far.md`). Measure it per module (`?perf=1`, `tools/heights-cost.mjs --modules`), then bring it under: thin each quarter's low tier where a phone cannot see the difference (props gated on quality as the Pomegranate House did, 76k to 56.5k; fewer segments on round things; route-side detail kept), and hide what cannot be seen from where the walker stands only if it is simple and has no pop. Say the numbers before and after at the three stands and on `perf`'s own stations. Keep edits to each quarter's file in its own commit.

Merge `origin/next` first (brief W1 moved some ways).

## Done when

A table of every name (kept, changed, why in five words); cards and map places rendered; `ONLY=settings,village,village-plan,ways,geometry,heights,perf,loading,regions,walk tools/suite.sh 8168` green; the low-tier cost table. Report `briefs/v15/reports/issue-1525-names.md`; hand back in under 250 words.
