# v10, something to do: design and briefs

The milestone doc is `plans/wilderness-v10.md`; its "Calls made" are the design's fixed points. This file is the dispatch plan.

## The design, in short

An **act** is one small thing a visitor can do at one place. A world module registers it; one shared module owns the offer, the input, the memory and the sound of every act, so the tenth act is ten lines in its own module and not a tenth interface.

- **Registered by the place's own module**, through `ctx` (the shape is A0's to settle and write into `world-code`): an id, a position, a reach of a few metres, a facing test, two or three words for the offer, what happens when it is done, and whether it can be done once, once a visit, or again and again.
- **The offer**: only up close and facing the thing; a small mark and a few words at the bottom of the view in the title card's lettering, a soft cue; `E` or a click on a desktop, a tap on the offer on a phone. One offer at a time, the nearest.
- **Memory**: `localStorage`, one key beside the settings', read at load so a mark made yesterday is in the world before the visitor reaches it. A row in the settings menu clears it.
- **Rare**: five to seven on the map at release.

## Briefs

| Brief | Scope | Model | Order |
|---|---|---|---|
| **A0** (`brief-v10-A0-acts.md`) | the acts module, the offer, input on desktop and touch, the memory, the settings row, the tally at the Lantern Halt, `tools/acts-test.mjs` in the gate, the `world-code` contract | strong | first |
| **T1** (`brief-v10-T1-edges.md`) | #15: walk to the lip of pits and chasms | mid | beside A0 |
| **A1** | #9, payoffs at central things: the mother crystal at the heart of the Lattice; the door at the bottom of the stair (the Hypogeum); one more of the agent's finding. Each: an act, and something that happens only because of it | strong | after A0 is judged |
| **A2** | story acts, from `stories/`: pour for the missing diner at the Collation (the twelfth chair); a turn for the slipper's mate; a turn for Salt for news (leave salt, and find what the Twk-men left for it on a later visit) | mid | after A0, beside A1 |
| **A3** | something to ring: the great bell of `issue-932-waystation-b`, rehomed away from the causeway where a visitor would walk 200 m to it, rung by hand, heard across the map and answered | strong | after A0, beside A1; first to be cut if the milestone runs long |

A1 to A3 are coarse on purpose: write them after A0 lands, from what its judging taught.

## What the owner can see as each lands

- A0: `http://localhost:8123/?pos=-63,6&yaw=0` or thereabouts (the Halt's foot; A0's report gives the exact pose): the offer, the stroke, and the stroke again after a reload.
- T1: the poses its report names at each lip, looking down.

## Risks

An interface on a piece that had none: the offer is small, late and in the world's own lettering, and it is judged by a fresh agent who is not told what it is. A phone's thumb already has a stick, a hop ring and look-drag: the offer sits clear of all three, and `touch-test` still passes. Acts nobody finds: each sits at a place the roads or a story already lead to. Marks lost when a browser clears storage: said plainly in the release note if it matters.
