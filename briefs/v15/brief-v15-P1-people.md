# Brief v15-P1: who lives here (people and stories)

Worktree `.claude/worktrees/issue-1523-people`, branch `issue-1523-people`, port 8166. Work only there. Read `briefs/v15/_common.md` first; load `visual-art` (its figures reference) and `storytelling`; read `stories/README.md` and the quarters' own story files and `ctx.<quarter>.places` lists (each quarter left bare places for you: the Lees 14, the Pennyworth 26). Helpers that read images run on `haiku` or `sonnet`.

## Goal

The village is built and empty: readers said "nobody is selling", guessed "dyers" from cots and washing. Put its people in it, few and particular, in the walk's own way of making figures (the workers of `src/v7/workers/`, the sleeper, the Leerie, `src/v8/livery`: read how they are built, lit and kept cheap, and how the Long Sleeper and the Taker are stories, not props).

- **Six to nine figures, each a person doing one thing that tells a story when you stand and look:** not a crowd, not shopkeepers behind every counter. Find them in what the quarters built: who stokes the saint and what they think of burning him; a mason who cannot copy a moulding; a dyer at the Tenter; whoever keeps the fountain of noon and takes its light home in a jug; the letter-keeper of the Lagan and the letters nobody collects; the news-seller; someone who lives in the wreck; a child or an animal on the Leads; one person who is leaving. Each connects to something already in the valley's library (the Leerie's lamp oil, the Pomegranate House, the keep, the Noonwrights' stored daylight): `storytelling` says how; write or extend a story file for each, plain ones are fine.
- **Small motion** where the kit allows it cheaply (a head that turns to the walker within 6 m, a hand, a stoker's rake), no walking cycles.
- **Not the first idea**, and Vance's register: particular, dry, a little absurd, never quaint.
- Place them on the ways as they stand after brief W1 (merge `origin/next` first); nothing in a stair's mouth or a walked line (`tools/ways-test.mjs` must stay green).
- Budget on low: the village is already over its triangle budget near (318k of 250k): all your figures together under 12k triangles on low, one draw call if the kit allows, no point lights; push every mesh onto `ctx.lappet.farHidden`.

## Done when

Each figure rendered from where a visitor first sees it and at 3 m, in normal light and a gutter, and on low at a phone's size; a cold helper says of each frame who this is and what they are doing, and you report its words. `ONLY=village,ways,geometry,walk,edges,heights,strata,livery,perf tools/suite.sh 8166` green. Story files and `stories/README.md` updated. Report `briefs/v15/reports/issue-1523-people.md`; hand back in under 250 words.
