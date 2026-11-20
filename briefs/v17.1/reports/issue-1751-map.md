# v17.1 Q1, the map (#70): report

**The panel's focus api** (`ctx.settings`, also `window.__fp.settings`), for Q2's gamepad:

- `focusNext(dx, dy)`: moves focus in the open panel by direction (dx, dy in -1..1). On a mark it moves among the marks by where they are drawn; elsewhere (or off the map's edge) to the nearest control that way; on a focused slider dx steps the value by a twentieth. A focused mark shows its plain line under the map. Returns true when something moved.
- `activate()`: does the focused thing (a mark: go there at once; a button: click it). Returns true when something happened.
- `back()`: shuts the panel. `focused()`: the focused control or null. `mapReady()`: loads and draws the map (a promise of it); `marks`: the sixteen (empty until the first open).

## What changed

- `src/v17_1/map.js` (new): `MARKS` (sixteen stands, each a name in `PLACES`, a plain line and a glyph) and `buildMap`. The chart is drawn on the panel's first open from the terrain's height, water and cover (231 samples a side, the cover at every other one): hillshade lit from the sun's side, 8 m contours in ember, shores in slate, the wood stippled, ice hatched, the paths dotted, the old causeway and the Span drawn, the sun on the west margin, grain and burnt edges, a north needle. About 0.6 s, in 24 ms slices (no long task), and the slices wait while the panel is shut. The marks are 44 px buttons with a small glyph each, pushed apart to 48 px where they crowd, with a line back to the true spot; "you are here" moves with the 4 Hz position tick.
- `src/settings.js`: the list of buttons is gone; the map is imported on the first open; `teleport` takes a name too; the focus api above. `PLACES` is whole (the debug panel, the tools, the ground's clearings, `settings.places`).
- `index.html`: the panel is two columns at 860 by 520 and up (the map on the right, sticky), one column below that with the map first; the map's CSS.
- Outside what I own, a line or two each: `tools/cards-walk.mjs` goes to a place by `settings.teleport(name)` (it clicked the old buttons); `tools/loading-test.mjs` one row (the map not fetched or built by a load); `.agents/skills/wilderness/SKILL.md` one sentence.

## Which sixteen, and the cut

On the map: Carcanet Keep, the Lantern Halt, the Pomegranate House, Circumbambulate Pool, the Cardinal Stones, the Armiger's Tower, the Arcature, the Lattice, the Collation, the Hypogeum, the Foundered Nave, the Pit, the Tocsin, the Tumbling Water, the Swallow, Corpse-Candle Fen. Spread over the valley, the five act places among them, and the owner's favourites (the Span, seen from its bell; the Pomegranate House; the Arcature).

Cut (still in `LANDMARKS` with their cards, still in `PLACES`): the tops of the ways up (the Bitter End, the Hanging Croft, Final Refuge, Titan's Causeway, the Long Wait, Shaky Splice, the Cyclopean Stairs, Lonely Staircase): the climb is the thing, and the map should not skip it; the rooms under the moor (the Noon Road, the Laid Sun, the Nadir, the Meridian Garth): found by going down from the Nave, the Pit and the Swallow, which are on it; the seventeen living (they wander and are met); the eight story ends (found by following the story); and the small places beside a mark (the Wayside Shrine, the Smoking Saint, the Fountain of Noon, the Sunken Court, the Leaning Yard, the Gradine, the Unfinished Prospect, the Speculum, the Cutting, the Wrong Colour, the Kept Fire, the Hawser, the Plinth Road, the Menology, Rest in Starlight, the Oast Byre, Medlar Close, the Galleries, the Thrones, the Lamplighter's Standards, the Heliotrope Sward, the Escarpment Lamps, the Deodand Wood, the regions' cards, Spawn).

## Tests

`ONLY=settings,touch,loading tools/suite.sh 8161`: settings 100 PASS, loading 29 PASS, touch 45 PASS, 0 failed (on the build with the Fountain and the Court; after swapping in the Pomegranate House and the Arcature and redrawing the Hypogeum's glyph, `ONLY=settings` again: 100 PASS). New rows in settings: the map neither fetched nor built before the first open; fetched and drawn on it; sixteen marks each a stand in `PLACES`; plain lines; the whole list kept; hover says line then name; "you are here"; arrows and Enter; the focus api; on the phone 44 px marks inside the chart, none over another, a first tap says, a second goes, or tap and "Go there". Every mark's stand gets the old checks (within 1 m, on the ground, facing, in view, nothing within 3 m or 2 m, no roof). In loading: the map not fetched by a load. A fix on the way: the chart drawing in the background after an open-and-close slowed frames enough that the W-held row drifted 0.15 m; the slices now wait while the panel is shut.

## Frames, in order

`node tools/map-frames.mjs http://localhost:8161 v17.1-Q1-final` → `shots/wip/v17.1-Q1-final-{open,hover,after,keys,keys-after}-desktop.png`, then `-{open,tap1,after}-phone.png`. (`v17.1-Q1-*` is the same set from before the Hypogeum's glyph changed; the blind reader saw those.)

Blind read (sonnet, frames only): it said a settings panel with an illustrated top-down map, the orange dot as where it stands, and picked the blue crystals ("the one place that looks unlike everything else"), tapping it to see its line and "Go there". It found the chart murky and the ice blurry, several arch glyphs alike (the Hypogeum's is now a stair going down), the falls glyph unreadable, and the title card's text faintly showing through behind the caption (the panel's 0.92 background, not new). It thought the map sat below the settings on the phone; it is above them.

## Still weak

- The chart is soft (231 samples upscaled) and low in contrast by intent; a stranger read it as murky. The glacier is a pale blob.
- Some glyphs need their line: the falls, the ringed pit, the Swallow's arch against the Nave's.
- The marks are pushed apart on a phone with lines back to their spot; the middle (the keep, the Halt, the house) is busy.
- Defaults I took: sixteen marks as listed; the keep's mark goes to its old stand west of the gate, not to Spawn; a gamepad's `activate()` on a mark goes at once, with no second press.
