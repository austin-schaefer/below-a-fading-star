# Brief v14-B3: names for the new places, and the Pomegranate House (#52, #42)

Worktree `.claude/worktrees/issue-1403-names-house`, branch `issue-1403-names-house`, port 8164. Work only there. Read `briefs/v14/_common.md` first and do what it says (with `visual-art` and `storytelling`).

**#52 "New areas lack names"**: "Many of the new areas like the floating station, the glacier top, etc lack names (and lore quotations). Let's get names on them, then comment in this issue with a list so I can source appropriate quotations."

- Walk every place a visitor can stand since v10 (the icefall's steps and top, the deck on the low lattice at the Diffident Stair's head, the lift's stations and the walked gallery, the Span's three crossings and the camp, the high passes, and anything else `src/v12/`, `src/v10/` and the settings map show) and list which have a place card (`src/world.js` LANDMARKS, `card: true`) and which have none or only a description.
- Name each unnamed one in the valley's voice (`stories/README.md`, the names already on the map: the Hypogeum, the Collation, the Lantern Halt, the Galleries of Durance, the Bletting: a worn learned word or a plain thing with a history, never generic fantasy). Give each a card with the name and **no quotation**: the owner sources the quotations themselves. If the card code cannot show a name without a line, make it able to.
- Put the list in your report as a table: name, where (x, z, y), one line on what a visitor sees there. The orchestrator posts it on the issue; do not comment on the issue yourself.
- `tools/settings-test.mjs` hard-codes the place count, and another brief (D0) adds one place: say your count.

**#42 "Pom House interior is a little bare, still reads as a ruin"**: "Also lights may need to be toned down, they verge on xmas lights". (`src/v8/house.js` and beside it; `stories/the-slippers-mate.md`: a sleeper lives here.) v12's critic said the same of its colours: "fairy-light and fairground". Someone lives in this house: it should read as kept and lived in from the gate and from inside (what does a person who sleeps here own, mend, cook on, sit at?), with fewer, warmer, steadier lights that have a visible source. Before and after renders from the gate, the court and inside, on low and high, at dusk as the walk always is. Not the first idea; nothing new or clean.

Done when: every walkable place since v10 has a name on a card; the table is in the report; the house reads as lived in to someone who has not read this brief (say what a stranger would call it from the after render alone); `ONLY=settings,house,regions,perf,loading,livery tools/suite.sh 8164` passes with counts.
