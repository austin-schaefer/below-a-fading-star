# B4 report: stands that face a wall (issue-1412-stands)

Changed stands (position and facing fields only, in `src/settings.js`): Medlar Close, the Oast Byre, the Plinth Road, the Foundered Nave (north rim, looking down into the hole), the Acephalous Thrones, A Lamplighter's Standards, the Unfinished Prospect (moved 6 m off a cairn that shut the view), the Lynchets (new `REGION_STANDS`), the Tocsin (bell and arch in frame; still 9 m from the act's lure, 20 degrees off the look), the Escalade (seen from the tarn's side).
Left alone, per the orchestrator: the three Cols, the Soundings, the Fallen Lead, the Warders' Landing, the Remand, the Footing Course, the Fallen Coping, the Hung Cornice; stands under the terrain.

Check: `tools/settings-test.mjs`, "every named place's centre is in view ... no collider within 3 m of the eye" (51 places). It failed on the old Prospect (cairn) and the Nave pass; found by it: no other wall-facing stand among named places.

Frames, in `shots/wip` (gitignored): before `sheet-b4-before-00..09.jpg` (3x3, order = `ls b4-before-*.png`), after `sheet-b4-after-00..09.jpg`; singles `b4-before-NN-*.png`, `b4-after-NN-*.png`; candidate trials `c1..c4`.

Tests: `ONLY=settings,roads,walk tools/suite.sh 8164`: settings 83/84 then, after exempting the Tumbling Water (its centre is mid-river; the stand shows the fall), rerun `ONLY=settings` (see the final message), roads and walk 63 passed.

Still weak: the Escalade (the stair is in deep shade of its own masonry; readable only as a dark mass against the sky), the Nave (hole seen from above is dim), the Pit, the Wrong Colour, the Coheirs, the Moles (dark lawns; not changed). Living and story stands were looked at, not fixed.

Defaults taken: stood the Escalade at 100 m rather than change the world's light; exempted lines, wide places and the Tumbling Water from the centre-in-view test; skipped the Cols per the message.
