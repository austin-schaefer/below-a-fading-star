# v8, one world: the briefs

Written 2026-11-11 from Austin's issue #1 and his two notes in session (`plans/wilderness-v8.md`), a 24-view walk, and two read-only audits of the code at `b941334`. Read `plans/wilderness-v8.md` first: the three strata, the sign, what a visitor should notice.

## The bible (binding on every v8 brief)

**Diversity with coherence.** Three builders, three hands. Never blend them into one style; make each more itself, and show how each used the last.

| Stratum | Hand | Material | What is theirs today |
|---|---|---|---|
| **Elder work** | cyclopean blocks 2 m and up, triangles, no ornament but the etch, nothing at human scale | `ctx.kit.masonry`, the Span's etch (`src/v4/span/etch.js`) | the Span, Plinth Road, Thrones, Hawser, Annals, Galleries' wall |
| **Heliarchy** | coursed ashlar, round arches, columns, bronze, glyphs, formal and symmetrical; everything faces the sun | grey-violet stone, verdigris bronze, ember glass | keep, tower, Sunken Court, Arcature, Hypogeum, Gradine, Cutting, Menology, Speculum, causeway, the lamps and standards, the Cardinal Stones' setting, shrine, Leaning Yard |
| **Late folk** | small, crooked, cheerful: lime plaster, horseshoe and ogee arches, pierced screens, coloured tile and glass, painted timber, awnings, patched cloth | warm plaster (cream, rose, saffron), turquoise and pomegranate-red tile, lamp glass in four colours | Pomegranate House, Oast Byre, Medlar Close's walls, the Lynchets' walls and gate, Kept Fire, Collation |

**Each uses the last.** Spolia: Elder blocks in Heliarch footings; Heliarch drums, capitals and bronze in Late walls and furniture. Late things lean on, hang from and are propped against older ones.

**The sign: the sun in the saddle.** A disc sitting in a V notch (the spawn view). Proportions: notch half-angle about 35°, the disc's diameter 0.6 of the notch's width at the disc's centre, the disc's lower third below the notch's shoulders. Elder: the bare notch cut giant-size, the disc absent or a socket. Heliarch: a carved roundel in a notched head, exact, with a bronze or ember-glass disc. Late: painted, tiled or sewn, the notch often rounded into a crescent, the disc a pomegranate. Same sign, never the same rendering; each brief makes its own in its stratum's hand.

**The living.** Heliarch officers (Leerie, Thurifer, Link-Boy, Taker of Altitudes, Stylite, Sexton; the Accrescent and the Long Sleeper were officers once): an ember stole (`#c8501e`, worn and faded) and the formal sign. Late folk (Coheirs, Salt-Pedlars, Wimpled Guest, the house's people): patched colour, the sign painted or sewn wrong. **Twk-men** (Vance's: thumb-high men on dragonflies who trade news for salt) are nobody's and mock both.

**Tone.** Vance is funny: pompous, venal, absurd, exact. Dark things get their punch from something light nearby. A v8 thing may be comic or pretty; it may not be cartoon. Things are still old and were once rich.

**Add, move, tweak.** The owner encourages it. Move a place when a road or a story wants it elsewhere; say so in the commit and update `src/world.js`, the settings teleports and any test that pins the position.

## Story threads (each has two ends in different places, each end within 15 m of a road)

1. **The traveller on the Span** (the owner's): boots side by side, a folded cloak and a rucksack on the deck at the broken bay; far below, what is left of him; his hat somewhere a hat would blow to.
2. **The twelfth chair.** The Collation is laid for twelve; one chair is gone from the table. It stands at the head of the grave the Sexton is digging, with the place setting on it.
3. **The slipper's mate.** One brocade slipper lies on the causeway (v5). Its mate, and whoever lost both, end at the Pomegranate House.
4. **The gold from the court.** Tesserae are picked out of the Sunken Court's floor; one already lies on a mole heap (v7). The trail ends in a hoard somewhere small and guilty.
5. **The painter.** The Unfinished Prospect's easel (v5) is the last of several; worse attempts stand abandoned at earlier viewpoints along the road to it, and the painter is found having given up.
6. **Salt for news.** The Salt-Pedlars' road from the Saltings to the house, a split sack, Twk-men at the spill.

Briefs 04 and 08 build these; an implementer may improve a thread's props but keeps its two places.

## Batches

Batch 1 (foundations, in parallel):
- **01 roads** (`brief-v8-01-roads.md`): the network joined up, tracks you can see, gnomons, the graph test.
- **02 ground** (`brief-v8-02-ground.md`): cover, ground colour and light that differ by place; the survey.
- **03 strata** (`brief-v8-03-strata.md`): the three hands' kit, the sign in three renderings, spolia, the off-hand buildings rebuilt.
- **04 threads** (`brief-v8-04-threads.md`): threads 1, 2 and 4.

Batch 2 (coarse until batch 1 is in):
- **05 the Pomegranate House**, lit, merry and audible; thread 3 ends here.
- **06 liveries**: the stole and the sign on the officers, patched colour on the Late folk, and one visible dealing between the two.
- **07 Twk-men**, and thread 6.
- **08 threads 5 and whatever batch 1 showed was missing**; places moved to their roads.

Then the gate, the critic, the curator, the release.

## Shared files

`src/main.js`, `src/world.js`, `.agents/skills/wilderness/modules.md` and `runtime.md`: a line or two each, new code in new files under `src/v8/`. 01 owns `src/v4/paths*` and the path clearance; 02 owns the regions' `cover`, `ground` and `air` hooks, `src/vegetation/` density, `src/post.js` and `src/v4/tinctures.js`; 03 owns `src/structures*`, `src/v2/ruins.js` and `src/v8/strata*`; 04 owns `src/v8/threads*`. If you need a change in another brief's file, make it one marked line (`// v8-0n:`) and name it in your report.
