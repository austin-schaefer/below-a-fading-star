# v17.1 Q3, the study page (#77): report

Branch `issue-1753-study`. Owner's view: `http://localhost:8123/study.html` (`?sheet=creatures`, `?sheet=recipes`, `?light=sun`; L switches the light, drag turns, wheel zooms).

## What changed

- `study.html`, `src/study/` (main, ctx, registry, recipes): a dev page, not linked from the walk. Each subject is built by its own module's builder against a flat stand-in ctx (one per subject, its looker at its own camera or far off), at its own place on the map, and drawn in its own cell by its own camera with the others hidden. Two lights: a neutral key that turns with each camera, and the walk's v4 sun rig (its colour, strength, direction, sky, ground and ambient).
- 45 figure and creature modules export `study` (62 subjects: 29 figures, 33 creatures). 6 recipe modules export `studyRecipes` (21 recipes, shown at six seeds under one framing a row).
- Refactors with the walk's drawing unchanged: `v15/people/index.js` builds through `makeFolk` and `animate` (so each villager can stand alone); the stonechats (`high-ling.js`) and grouse (`outwash.js`) lifted into functions of their own (same rng draws, same order); `trees.js`'s colours into `treeColours(P)`. Every other module only gained an export at its foot (dynamic imports in it, so the walk fetches nothing new).
- `tools/study-shots.mjs`: one command renders every sheet, one load a sheet (a counting load first so parts come out even): neutral at t, at t+0.4 s, and the sun.
- `tools/study-test.mjs` (`run study` in the suite).
- Docs: `visual-art` Working, `autonomous-run/critic.md` 3b, `world-code/runtime.md` (### v17.1), `modules.md` row.

## The issue's Done when

1. The page exists and is not linked from the walk: met (the test checks no import of `src/study/` and no link to `study.html` from anything the walk loads).
2. Every figure and creature module registers itself, and a test fails when a new one does not: met, with a declared definition of "exists": every `.js` directly in the registry's FIGURE_DIRS (fauna, uncanny, v7 walkers/workers/still/small/canyon/glyphs, v15 people, v2 inhabitants, v8 twk/threads/house, v4 regions), its FIGURE_FILES, and any file under src/ importing a body-making name from a rig kit. 90 found; each is registered or in NOT_FIGURES with its reason. Not on the page yet, said so there: the sphere's Noonwright and the Lantern Halt's sleeper (each part of its place's build), the Thrones (150 m colossi), the plinths' feet, the noon-road's carriers (vessels).
3. Recipes that take an rng shown at six seeds: met for trees (6 kinds and the fallen trunk), the Sleeper's medlar, plants (6), stones, crystal shards, the Lappet's five house makers.
4. One command renders the sheets into `shots/wip/`: met.
5. `visual-art`'s render loop and the critic's brief say to use it: met.
6. First sheets read cold and written up as next briefs: met (below).

## Tests

- `ONLY=study,loading,perf tools/suite.sh 8163`, after merging origin/next: study 13 PASS, loading 28 PASS, perf 29 PASS, 0 failed. The walk's first load fetches nothing new.
- Because of the refactors: `ONLY=regions,village,twk,house,threads`: 56, 690, 35, 20, 25 PASS, 0 failed.

## Frames, in order

`shots/wip/v17.1-Q3-sheet-figures-{1,2}-{neutral-a,neutral-b,sun}.png`, `v17.1-Q3-sheet2-creatures-{1,2,3}-{neutral-a,neutral-b,sun}.png` (the deodand fixed: it hid from a near looker), `v17.1-Q3-sheet-recipes-{1..5}-neutral.png`, `v17.1-Q3-page-desktop.png`, `v17.1-Q3-page-phone.png` (390 by 844). The `-first` and `v17.1-Q3-sheet-creatures-*` set is superseded.

## What the blind readers saw (three sonnet helpers, cold)

They read the page as "a QA contact sheet" and "a triage board". Proposed next briefs:

1. **The five worst figures:** the woman in the tarn (reads as a chess pawn in a black star of hair); the dead-letter clerk (column robe, box arms, the letter an unreadable stick); the burner (a ghost with a stick, the rake lost); the child on the Leads (a hunched teal block); the Bather (a holey grey splat on plain ground: her pool and stone shader carry her in the world, so judge her there before rebuilding). The v15 and v8 villagers read as "toy-store dolls" beside the v7 and uncanny figures: one liveries and body pass for them.
2. **Stiffness:** between frames 0.4 s apart only the Sexton, burner, copyist, clerk, painter, Thurifer and sounder move. The Taker, Coheirs, Leerie, host, two at play, musician, dyer, the one leaving, the Guest and the Link-Boy are statues at a glance. Add an idle layer to every rig: breath, weight shift, head.
3. **Creatures as flat black cut-outs:** the bats (keep and gutter), the crows, the eel, the wing and the deodand have no interior form. In the sun every dark figure and creature loses its silhouette. Give them a rim or a sheen, and a membrane or feather break-up.
4. **Recipes that look like one thing six times:** the crystal shard (one lump), the carrier house, the fallen trunk, the Sleeper's medlar, bracken, heather, the fleshy plant, and the undercroft (trim only). Vary scale and plan, not trim. Range that works: stones, elder houses (the leaning slab is the sheets' one awe), late and new houses, and the medlar tree kind.
5. **Polygons do not buy quality:** the Sexton at 137k triangles (his graves' turf) reads no better than the 1.4k villagers.

## Still weak, and defaults taken

- Framing is from a height given in each registration: some cells crop (the lone trees, the Galley, the traveller on the Span, the dyer's pole). The Scriveners read as empty: the shoal sits under the stand-in water's floor. The Toadstone's patch casts a cross smear. Moths are specks by design.
- Stand-ins carry some subjects: a wall for the Repetend, a tor for the Stylite, gorse for the stonechats, erratics for the grouse, blocks for the peafowl, a door for the beetles, boxes for the house's four. They are plain on purpose, and the grouse's erratic and the sleeper's table dwarf their subjects.
- Defaults: sheets of up to 16 subjects or 5 recipes; t = 2.5 s; the sun picture uses the walk's rig but not its post grade; plants on a plain material (no wind or tint shader).

## Round two

- **Foliage under the neutral light:** the leaves are near-black by reflectance (`treeColours`: #1a2214 is about 1.5 % linear). It is the material, not a missing light or uniform: the walk's grade carries them. The study now lifts each cell under the neutral light. The exposure rises by 0.18 over the subject's measured mean albedo, at most x10, the ground is dimmed by as much, and the label says "lifted xN". The sun is never lifted, and no walk material changed. The trees now read in colour and form (`v17.1-Q3-r2-recipes-1-neutral.png`). The crows and the Galley stay black even at x10.
- **The excuses split:** `DEFERRED` (the sphere's Noonwright, the waystation's sleeper and its seat, the Thrones) and `DEFERRED_MAX` 4. The test fails if the list grows, or if a file is both deferred and excused. None was cheap to register: each figure is built inside its place's build.
- **Detection widened:** `Mesher`, `Painter`, `paintedMaterial`, the still kit, `import * as` and `import()` of any kit now count. 91 files are found (`livery/props.js` is newly excused). `runtime.md` says what the test still cannot see: three's own geometry, a new kit, a re-export.
- **Framing:** each camera fits the subject's measured bounds. Stand-in props (`userData.studyProp`) never count, and the camera falls back to the registered height for shader rigs and fliers. The leaning trees are centred on their own bounds. The Scriveners are framed on the shoal itself (it was 9 m off). The sleeper's table, the grouse's erratics and the Adust's slab are smaller. Still weak: the dyer's pole crops at its top.
- **Docs:** `study.html` is local only (the Netlify build copies `index.html`, `sw.js`, `src`, `vendor` and the icons), said in `runtime.md`, `visual-art` and the critic.
- **Tests:** `ONLY=study,loading,perf,village,regions` gives study 15, loading 28, perf 29, village 690 and regions 56 PASS, 0 failed.
- **Frames:** `shots/wip/v17.1-Q3-r2-recipes-{1..5}-neutral.png` and `v17.1-Q3-r2-figures-{1,2}-{neutral-a,neutral-b,sun}.png`.
