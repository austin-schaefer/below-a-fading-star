# Wilderness v8: one world

Austin, 2026-11-11 (issue #1, "Milestone 8: Consistency, Coherence, and Conscious Contrast"): "Right now, the world has lots of individually cool things, but they all feel very disconnected. So the goal this time is to create more of a sense of layered, textured, inter-related depth: architectural cues that reoccur; paths and routes thru the landscape that lead you naturally to the cool things we've made; contrast, too: almost all areas of the world have similar dark palette, similarly dense vegetation, similarly somber tone (no cuteness or humor to give the dark things punch); characters who seem connected, or at least that come from the same culture; stories that start one place and end another: a joke-y example would be a cloak and rucksack on the tall bridge, a splayed body below. [...] So the goal after this release is a textured, deep, inter-related world."

v8 adds few new places. It decides who built this country, in what order, and how each people used what the last one left, and makes everything already here say so. Diversity stays; the relationships are what is new.

Austin, 2026-11-11, in session: "feel free (be encouraged!) to add new things and move things around and tweak them." So a brief may move a place to where a road or a story wants it, rebuild one that is off its stratum's hand, and add new places and figures where the map has a gap. The statement "adds few new places" above is a starting point, not a limit. Briefs and the dispatch plan: `briefs/v8/index.md`. The walk that opened it (24 views from the spawn outward and the map) is in `shots/wip/m8-walk-*.png`, `m8-map-00-base.png`.

## Status

**Opened 2026-11-11, 13:46 PST**, on `next` (equal to `main` at `b941334` when opened). The orchestrator read issue #1, walked the map in 24 renders at medium and agreed with every word of it: from any stand point the frame is violet-dark with knee-high grass to the horizon; the leads P1–P17 are short, faint and joined to nothing; the Pomegranate House is plain boxes and a cylinder beside the keep's coursed stone; nine figures in nine costumes; three story props (the Slipper, the Collation, the Prospect) that end where they start. Two read-only audits (architecture and figures; paths, density and palette) are feeding the briefs. The gate was run on `next` before any v8 work as the baseline (its result is in the next entry).

**2026-11-11, batch 1 dispatched (13:55 PST).** Both audits are in and folded into `briefs/v8/index.md` (the bible: the three strata, the sign's proportions, the six story threads, the shared-file ownership). Findings that changed the plan: the code already has two stone systems that nearly match the strata (`ctx.kit.masonry` for the cyclopean, the v3 stone with its hexagons for the Heliarchy), the Pomegranate House has the right arches in the wrong grey, no figure has any emblem, and the Salt-Pedlars are already Twk-men that nobody sees. In flight, four opus agents, each in its own worktree under `.claude/worktrees/` on its own port, pushing a branch and no PR:

| Brief | Branch / worktree | Port |
|---|---|---|
| 01 roads (network joined, visible tracks, gnomons, `roads-test`) | `issue-801-roads` | 8161 |
| 02 ground (cover, ground colour and grade by place, `contrast-survey`) | `issue-802-ground` | 8162 |
| 03 strata (`ctx.strata`, the sign in three hands, spolia, the house re-skinned, `strata-test`) | `issue-803-strata` | 8163 |
| 04 threads (the traveller on the Span, the twelfth chair, the court's gold, `threads-test`) | `issue-804-threads` | 8164 |

Next: as each reports, look at its renders, run its tests, have a second agent review the diff cold, merge into `next` (expect conflicts between 01 and 02 round `wornAt` and the plants' density, and between 03 and 04 in `court.js`), run `tools/suite.sh` once for the batch. Then write batch 2's briefs in detail (05 the Pomegranate House lit and peopled, 06 liveries, 07 Twk-men, 08 the painter's thread and whatever batch 1 shows is missing) and dispatch. The baseline gate on `next` before v8 was still running when this was written: `/tmp/suite-m8-baseline.log`. The owner's two untracked files in the main checkout (`briefs/loading-copy.md`, `briefs/place-copy.md`, templates identical in body to `briefs/copy/`) are left alone.

## What a visitor should notice

- **Three hands, one country.** Austin, 2026-11-11, in session: "careful about one culture btw: the goal is still diversity, but with coherence. i like that the architecture today has both cyclopean bridges and arabesque tavernas." So the differences stay and are sharpened into three **strata** [Proposed names], each with its own hand, and the coherence is in how each treats the one before it:
  - **the Elder work** (cyclopean, not built for human feet: the Span, the Plinth Road, the Thrones, the Hawser, the Annals). Huge, plain, triangular, unexplained.
  - **the Heliarchy** (coursed stone, round arches, bronze: the keep, the tower, the Sunken Court, the Arcature, the Hypogeum, the Gradine, the causeway, the lamps). A civil order that tended the failing sun and built on and out of the Elder work.
  - **the Late folk** (arabesque, plaster, tile, coloured glass, timber and cloth: the Pomegranate House, the orchard walls, the byre, the Lynchets). The people still here, living small and cheerfully in the ruins of both.
- **Each stratum uses the last.** Later builders reuse earlier stone (a cyclopean block as a tavern's corner, a Heliarch column drum as a gatepost, a bronze door as a table), build against it and misread it. A visitor who sees a triangle-etched block in a plaster wall has been told a history without a word.
- **One sign, in three hands.** The first view is the sun sinking into the saddle between two peaks: a disc in a notch. The Elder work has it as a bare giant notch; the Heliarchy carved it as a formal roundel over doors and on waystones; the Late folk paint it, tile it, sew it and get it slightly wrong. Same sign, never the same rendering.
- **The living belong to somebody.** The figures already here sort into two liveries rather than one: the Heliarchy's last officers, each still doing one duty of the light (the Leerie, the Thurifer, the Link-Boy, the Taker of Altitudes, the Stylite, the Sexton), in ember stoles and the formal sign; and the Late folk (the Coheirs, the Salt-Pedlars, the Wimpled Guest, the house's people), in patched colour. The two visibly deal with each other.
- **Roads that go somewhere.** From the spawn a visitor can see where to walk. Worn tracks, pale against the turf, run from the causeway to every named place and join each other, and along them stand **gnomons**: leaning waystones with the sign on top, each in sight of the last, throwing long shadows away from the sun.
- **Places that differ.** Cropped pale turf where the grazers keep it; bare red clay; white salt; rank orchard grass over the head; the wood dark. And one place that is warm, lit and silly: the Pomegranate House, hung with coloured lamps, with music and somebody laughing inside.
- **Something small and funny.** Twk-men [Vance's own]: thumb-high riders on dragonflies who come to look at you at the waystones and squabble over spilt salt.
- **Stories with two ends.** Things found in one place that are answered in another, along the roads that join them (the threads are listed in `briefs/v8/index.md`): the traveller who left his cloak and pack on the Span; the twelfth chair missing from the Collation; the slipper's mate; the gold picked out of the Sunken Court's floor.

## Done when

- A cold critic, asked what connects the places, names the sign, the roads and at least two distinct builders without being told.
- From the spawn, every landmark in `LANDMARKS` with a footprint is reachable along a visible track with a gnomon in sight at every point of it (a test walks the graph).
- At least four regions measure apart from the moor in ground brightness, hue or cover height in a survey committed with the milestone, and the Pomegranate House is the brightest, warmest frame on the map.
- Each story thread has both ends built, each end on or within 15 m of a track.
- `tools/suite.sh` green; the walk no slower on the low tier than v7.2 (`perf-test`, bench numbers in the release note).
