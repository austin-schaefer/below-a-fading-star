# Brief: v11.1 W2, the north-east wall and the Horn

Goal: the north-east wall (bearings about 20 to 100) is still one flat face under the Battlemented Ridge, the Gradine and the Vigilant: from the bowl it is a plane with things stuck on it. Give it the form the other massifs got in v11: buttresses and a recess or two, a spur, a break in the plane that makes the three hung things sit on features (the Gradine climbing a rib or a gully, the Vigilant on a shoulder) and not on a board. And the Horn (south-east massif, about 150) reads as a finger: make it a peak with a base, shoulders and a lean, still the tallest and still plainly "the Horn".

Read: `plans/wilderness-v11.md` Status, `briefs/v11/brief-v11-M2-form.md`, `plans/wilderness-mountains-study.md` (what hangs where), `visual-art` and `land.md`.
Files: `src/v4/mountains.js` (`applyMassifs`, crest spline, crowns, `MASSIFS`). Nothing inside the walk limit may change (M2's probe: `tools/terrain-probe.mjs`; show zero change inside it).
Hung things follow the ground by code, and each must be looked at after: the Ridge, the Gradine, the Vigilant, the Hawser, the Annals band, the Long Figure (103: `dressing` test), the fall's wall and the Span's east abutment near the Horn. Refit what you disturb.
Done when: before/after of `tools/views-v11-mountains.json` plus views of each hung thing; the picture boxes in `tools/mountains-test.mjs` moved if an outline moved; `ONLY=mountains,dressing,walk,paths,roads,edges,regions,settings tools/suite.sh <port>` green.
Others: W1 owns the wall's shading in `src/terrain.js`; stay out of that file.
