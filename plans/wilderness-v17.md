# v17: The water goes under

Opened 2026-11-17, 05:10 PST, by the orchestrator's planner on the same autonomous run as v16. The owner's words at the start of the run: "Pick a new milestone (or two?) off the backlog ... A shipped major milestone (or two, if time allows!)". v16 went live at 04:57 PST; this is the second.

## What was chosen, and why

**The owner's #74**, the second of their four notes on the land, in their words: "Extending the water features; perhaps ultimately the series of waterways descend down into an ancient underground aqueduct with a plastisteel tube leading through the water into an ancient chamber." And: "A large (30 meter?) plastisteel sphere, partly above ground, partly in mountain wall, partly in ground. In its center is <x>; if pastel tubes have started to be implemented anywhere else, they connect to this too."

It is next because v16 made the low west and south it needs (the floor falls that way, the tarn and the fen have shores), and because it is depth on the side of the valley a visitor has least reason to walk to: the low ground south of the Span, under the Escarpment Lamps, has nothing in it today but the Menology and the Sexton's graves.

**In this milestone:** the waterways, the way under, the tube and the chamber, whole. **The sphere** is in as the last brief (S1), on a site the survey found and with its centre decided, and goes out only once the water's first stretch has been judged and a slot is free; if the day runs out it is the first thing left, named in Status, and its story file is ready for the next milestone. It is the most visible thing in #74 (a pale ball at the wall's foot, seen from the spawn), which is why it is not dropped outright, and the one most likely to fight the strongest frame on the map, which is why it does not go first.

**Left for later, whatever happens:** walking inside the sphere; the clear tube up to the sky (#56) and dressing the lattices in the Noonwrights' hand; a door from the chamber to the Laid Sun (#62's hub); a line of tubes built across the moor between the sphere and the chamber (this milestone points them at each other and no more).

**Passed over for now:** #75 (the ice and the Lattice spread), #33 (the wall from its foot), #18 the forest, #62 the underground hub, #56 the sky, #30 the way out, #72 a controller, #23 music, #70 the teleport menu, #22 traffic counting, #77; and W3 (the open edges at the pits, `issue-1527-edges`, paused since v15), which wants a quiet floor and gets one after this.

## The survey (2026-11-17, numbers from `heightAt` in node; `briefs/v17/index.md` has the method)

- **Where the low ground is.** The valley's lowest dry ground is a trough along the south foot, 30 to 40 m north of where the slope to the south wall begins: two hollows, the west one centred about (-87, 283) with its floor at -10, the east one about (0, 280) at -9, parted by a low swell at x -50..-35 (-5 to -6). North of it the ground is -2 to -5 under the Span; south of it the apron rises 1 m in 1.4 (z 300: -4, z 310: +3, z 320: +11, z 330: +17 at x -90) to the wall proper beyond r 395. A second low (-8 to -10) lies in the Deodand Wood at (-240, 100), inside the wood and too near the Span's west block to use.
- **The levels.** Lees Tarn (Circumbambulate Pool) -4.6 (its bed -12 to -13); Corpse-Candle Fen -2.45; the river (the Tumbling Water) falls from 3.5 at the Speculum to -2.45 where it meets the fen at s 95; the floor's three pools 1.6 (kettle), 5.6 (kettle-west), 5.6 (strand-pond), all on the high ground north-west, no part of this.
- **Where water can go.** From the tarn's south bay (its shallows end at z 200; the lip at (-83, 200) stands at -3.1) south through the Span's fallen bay (between piers -120 and -70, x -113..-77, where four pieces of the fallen crown lie at (-108, 224), (-94, 211), (-83, 230), (-84, 213)) and down to the west hollow: from -4.6 to about -6.8 over 85 m. From the fen's south-west pools (about (12, 228)) south past the Menology's east side to the trough: from -2.45 to -6.8 over about 60 m, and on west along the trough's floor 60 m to the west hollow. The trough holds still water up to about -5.5 before it would spill north; -6.8 fills the west hollow over about 55 by 35 m.
- **Where it goes under.** The apron south of the west hollow, at about (-95, 312): ground +7.5, 14 m over the water, r 326 (inside the walk limit at r 348, with room for a forecourt). The chamber behind it fits under the apron at about (-50, 325) with its floor near -30 and 6 to 10 m of ground over a 40 m dome.
- **What it crosses.** The tarn's brook crosses no lead (P15 runs at x -36..-52, P16 and P34 stop at the bay); it runs 20 m west of the dead traveller on the slope (his body at (-63.5, 242.5), his hat at (-49.5, 247.5): `stories/the-traveller-on-the-span.md`). The fen's leat crosses the junction of P14 and P38 at (9, 252) and passes 27 to 31 m east and south of the Menology's spiral (centre (-15, 255), its stones out to about 17 m). The Sexton's graves (block x 40..70, z 264..284) and P48 stay east of it. No protected box of `height/floor.js` and no claim in `src/claims.js` lies in the box x -125..25, z 195..335 except the leads; the Span's west block (x -270..-195) is clear.
- **Under the ground today.** All of it is east: the Foundered Nave's hall (255, 40), the Noon Road on its water, the Wellward Way (121 m from the Nave's south door to the Pit's floor, with the Laid Sun at (223.6, 123), 28 m down), the Pit and the Nadir. The pattern a new place follows is the under kit (`src/v14/under.js`; `world-code/runtime.md`, "Under the ground"): sealed rooms of their own meshes facing in, a below-volume per stretch, one held stacked floor, an opening only while the eye can see it, terrain triangles made degenerate where the ground is opened (never `heightAt`). The Noonwrights' tube walked inside is `src/v15/ways/tube.js` (the Lappet's daylight main: a length of `ctx.strata.parts.noon.tube` on a stair, planks inside, a held floor) and the Wellward Way's first 26 m (`src/v14/passage/plan.js`, the Line).
- **The sphere's site.** The ground the owner means, the west wall's foot between the Galleries of Durance and the Acephalous Thrones, at about (-322, 22): ground 13 at the centre, 2 at x -300, 24 at x -340, so a 30 m sphere centred at y 8 to 10 stands about half above the ground, its lower third in it and its west quarter in the rising foot of the wall; r 323. Nothing is placed there (the Taker of Altitudes is 70 m east, P50 and P31 end 40 m and 90 m north). But it is not empty to the eye: from the spawn it lies 22 degrees right of the sun, under the Galleries' gantry and beside the right-hand Throne (`shots/wip/v17-survey-sphere-spawn.png` in the deploy worktree after this worktree is removed), in the frame the whole walk is composed round. The other candidate, the north-west foot at about (-228, -232) (empty moor, ground -1 to 21, off the spawn's frame by 60 degrees), keeps that frame clean but is north, not west. S1 takes the west site and is judged against the spawn's frame; if it competes with the sun, it moves north-west and says so.

## What a visitor should notice

- From the Span's deck, and from the Lonely Staircase's top, water now leaves the tarn and the fen and runs south: a brook out of the tarn's south bay down among the fallen pieces of the Span's crown, a straight stone leat out of the fen stepping down over weirs, both into a long dark mere at the foot of the south slope, under the Escarpment Lamps.
- At the mere's south end the water runs into a cut in the slope and goes under it through a great old portal: a sound before a sight.
- Beside the fall, the end of a glass tube comes up out of the water. Walk into it and down: the water closes over it and is all round you, moving, with the aqueduct's stone dim through it and the glass clear (the only length of the Noonwrights' glass not clouded, because no sun has touched it).
- It comes up into a round hall under the mountain where it is noon: white light falling from the crown of the dome, true colours for the first time in the walk, green growing in it. The green is a circle, and round it the garden is dead in rings, oldest outermost: the light has been shrinking. Someone still waters it.
- If S1 lands: on the west wall's foot, under the Galleries, a pale glass ball the size of a house half sunk in the ground and the mountain, lit from inside, with someone sat at a wheel at its centre.

## Done when

1. **The fixed views** (`tools/views-v17-water.json`, 23 views: the chain from the air, the high stands, the walker's way along it, the sphere's site) rendered on `next` before the first merge and after the last; a blind reader shown the after frames names running water, a mere, and a place where the water goes into the ground, unprompted.
2. **One before nine:** the brook out of the tarn (W1) is built first, end to end, and judged moving by a blind reader (frames in order, at walking pace, along it and across it, medium and low) before the leat (W2) is built on the same kit. The owner on water: "a lot of water looks very janky": every stretch, still and running, is judged in frames taken in order, never a still.
3. **Water holds:** the `outline` test has rows for each new body (no dry cell below its level beside a wet one; the brook's and the leat's levels fall only downstream; the mere holds at its lip all round); `heightAt` over the valley no slower than v16's by more than 2% (`tools/height-speed.mjs --base=origin/main --sets=valley`, twice), every new term behind one box test.
4. **Under the ground:** the Swallow, the aqueduct, the tube and the chamber are walked on the keys from the mere's shore to the chamber's floor and back with no input but the keys (`tools/step-frames.mjs` and a `*-walk.mjs` like `passage-walk.mjs`); `edges`, `geometry`, `heights` and `under-geometry` green over them; the seal holds (draw calls in the chamber on low no more than the Laid Sun's).
5. **The chamber reads:** a blind reader shown three frames from its floor says something close to "a garden under the ground lit like daylight, dying from the edges"; the light breathes, never flickers; its frames on a phone (390 by 844, low) are not blown out.
6. **Nothing placed is lost:** `threads`, `seams`, `geometry`, `roads`, `paths`, `outline`, `regions`, `rocks`, `dressing`, `strata` green on `next`, and `tools/walkers-test.mjs` (not in the suite) no worse than v16's 19/20 (the v16 lesson: the ground moved under a shrine and nobody's brief named the test that found it). The leads that cross water cross it on slabs or a bridge a walker can stand on.
7. **Names:** three to five names a visitor meets, on the owner's list (`briefs/v17/reports/v17-names-for-the-owner.md`), every `line` empty until the owner gives one.
8. **The whole suite green on `next`;** a cold critic's blocking findings fixed; the release note in a visitor's place names, the README's line and picture.

## How it is built

`briefs/v17/index.md`. One plan file, `src/v17/plan.js` (three-free, no imports beyond `world.js`), is the only place a coordinate or a level of this milestone lives; W1 writes it in its first push from the numbers in the index, and every later brief reads it and adds its own rows. New code goes in `src/v17/`. The story the chamber and the sphere carry: `stories/the-meridian-garth.md` (the garden, built here) and `stories/the-man-at-the-wheel.md` (the sphere, written; built by S1 if it lands).

## Status

**2026-11-17, 06:59 PST. U3 merged: the Garth's light is better and still short of "noon"; no fourth round.** Three rounds, three readers: "a hazy dying-sun afternoon", "moonlight or starlight", and now from inside the light "soft, diffuse and fairly even ... a hazy late afternoon, or an artificially lit greenhouse", from the door "cold, dim, violet-grey gloom ... a dim, overcast interior". What is on `next`: light `#fff8ec`, short dappled shadows with a blue fill, leaves lit from above, orange fruit that does not glow, a paler soil, the shaft about seven times fainter, the lens a blown disc; `edges`, `geometry`, `gutter`, `heights` green; the phone frame not blown out. The orchestrator's eye: from inside it is a daylit garden with true colours, which is the point; from the door the fainter shaft has cost the view its drama, and the dark hall round it keeps saying dusk. **Decided:** it ships as it is unless the critic blocks on it; said in the note's known issues if a visitor would feel it. In flight: S1 (`issue-1705-sphere`, 8165, opus), A1 (`issue-1707-sound`, 8167, sonnet), W1b (`issue-1709-brook-look`, 8169, opus).

**2026-11-17, 06:41 PST. The Swallow, the aqueduct and the tube are on `next`.**

- **U1 merged** (opus, 83 min; `briefs/v17/reports/issue-1702-swallow.md`): a pale portal face in the hillside at z 311 that reads from the mere's north shore; the fall over the sill into a drowned hall; from a quay into the tube's broken lip, a plank stair down as the pool closes over the glass, about 50 m of drowned conduit (caustics, bubbles, silt, weed) to the Garth's door. `tools/swallow-walk.mjs` passes there and back on the keys (medium and low); `walk` 13, `edges` 214, `heights` 205; draw calls on low 135 to 174. Blind readers: "a long underwater tube", "a flooded, green-lit tunnel". The orchestrator's look at its sheet: the portal and the tube both read.
- **Red on `next` now, for a baselines agent once the builders are in:** `geometry` in `v17-swallow` (44 coplanar faces in `water-v17-still` and 5 buried pebbles from W1's side, 3 backs of U1's) and one buried stone at `span-east-stairs` (229, 166); `seams` ghost 230 against 226 in the village box. The `geometry` place is sealed only to 26 m short of the door. **Still weak:** the pool's underside near the head; the head is dark at low; U1's last fixes were not re-read by a blind reader.
- In flight (four):

| Brief | Branch / worktree | Port | Model |
|---|---|---|---|
| S1 the sphere (90 minutes at most) | `issue-1705-sphere` | 8165 | opus |
| A1 the water heard (`src/v17/sound.js`) | `issue-1707-sound` | 8167 | sonnet |
| U3 the Garth's light reads as noon | `issue-1708-garth-light` | 8168 | opus |
| W1b the brook's ribbon reads as running water | `issue-1709-brook-look` | 8169 | opus |

Next: W2 (the leat) when W1b's ribbon reads; then N1 (crossings, dressing, names) and a baselines agent; the batch's suite; the critic.

**2026-11-17, 06:40 PST. W1's ground and kit are on `next`; the brook's quick water does not read yet.**

- **W1 merged** (opus, 82 min; `briefs/v17/reports/issue-1701-brook.md`): `src/v17/plan.js`, `stream.js` (a stream on a line, a still body on an edge), `bodies.js` (behind one box test in `field.js`), `water.js` (every stream one ribbon). The brook rerouted through the 3 m gap between crown pieces 1 and 4, a pool at (-92, 241), two steps into the mere; the mere at -6.8 with a bar at x -80 for the pegs' survey line; the Swallow's cut ends square at z 311.5 (U1's ask). `rocks.js` and vegetation decide on the water as it was before v17, so nothing else moved. On its branch: `outline` 70/0 and twelve more green, `walkers` 19/20 (P12, as `main`), `canyon` 13/13, `height-speed` valley 1.00 to 1.02 (one 1.13 beside a suite).
- **One before nine, the verdict:** the pools, the mere and the crossing read as water; **the runs between read as "orange flakes, not water"** (its reader; the orchestrator agrees from the sheets), with a ruled bright line at one step's lip. Merged for the ground the others stand on; **W2 (the leat) does not start** until the ribbon reads.
- In flight (four):

| Brief | Branch / worktree | Port | Model |
|---|---|---|---|
| U1 the Swallow, the aqueduct and the tube | `issue-1702-swallow` | 8162 | opus |
| S1 the sphere (90 minutes at most) | `issue-1705-sphere` | 8165 | opus |
| U3 the Garth's light reads as noon | `issue-1708-garth-light` | 8168 | opus |
| W1b the brook's ribbon reads as running water (a dark glassy body, long streaks, white only where it breaks; a blind reader says stream twice running) | `issue-1709-brook-look` | 8169 | opus |

**2026-11-17, 06:35 PST. The Garth is on `next`; its light is not right yet; the sphere and a light fix dispatched.**

- **U2 merged** after its second round (opus, 77 min in all). From the door the rings now read as stages (green, yellowing, straw, grey sticks, swept soil) with tide lines, and the dome is lit over the garden: the structure is right. **The light is not:** round one read "a hazy dying-sun afternoon", round two (the orchestrator asked for blue-white, wrongly) reads "moonlight or starlight ... it suggests night", with glowing white fruit. Its `height-speed` rerun: valley 1.055, fen 1.019 against v16 with no change in the height path on that branch (so W1's plan.js merge or noise; to be measured on `next` when W1 is in).
- In flight (four, the limit):

| Brief | Branch / worktree | Port | Model |
|---|---|---|---|
| W1 the brook and the mere | `issue-1701-brook` | 8161 | opus |
| U1 the Swallow, the aqueduct and the tube | `issue-1702-swallow` | 8162 | opus |
| S1 the sphere (90 minutes at most; left out if it does not read) | `issue-1705-sphere` | 8165 | opus |
| U3 the Garth's light reads as noon (bright warm-neutral ground, short blue shadows, no glowing fruit; a blind reader says daylight twice running) | `issue-1708-garth-light` | 8168 | opus |

**2026-11-17, 06:20 PST. Batch 1 still building; the Garth is on its second round.**

- **The before set** (23 views, `shots/wip/v17-before-*`) shows the south trough near black on low: W1 and U1 told to make the water and the portal read from 30 m and from the Span's deck.
- **U1 asked, through the orchestrator, that W1's cut end square at the portal's face** (z 311.5; it ran on into a bowl); relayed to W1.
- **U2 handed back** (opus, 60 min; `briefs/v17/reports/issue-1703-garth.md`): the hall, the lens' beam (in every material, no point light; it ignores the gutter), five rings of garden, rills, the can; `edges`, `heights`, `walk`, `seams`, `gutter`, `geometry` green on its branch; draw calls on low 125 to 161 (the Laid Sun 172 to 190); `under.js` gained `below.grade(fn)`. Its own blind reader: "pale dusty-gold ... a hazy dying-sun afternoon", not noon. **Sent back for one round** (45 min): the lit core neutral-white, each ring's stage readable from the door with tide lines where the light once reached, the dome taking bounce. `height-speed` read 1.13 to 1.15 beside a running suite with no height change: to be rerun quiet.
- In flight: W1 (`issue-1701-brook`, 8161), U1 (`issue-1702-swallow`, 8162), U2 round two (`issue-1703-garth`, 8163), all opus.

**2026-11-17, 05:18 PST. The plan is on `next`; batch 1 dispatched.** The planner's branch merged and its worktree removed. The before set (`tools/views-v17-water.json`, low) is rendering in the deploy worktree to `shots/wip/v17-before-*`. v16 is live (`0eba44a`); #74 is `in-progress`, `v17`.

| Brief | Branch / worktree | Port | Model |
|---|---|---|---|
| W1 the brook and the mere (pushes `src/v17/plan.js` first) | `issue-1701-brook` | 8161 | opus |
| U1 the Swallow, the aqueduct and the tube | `issue-1702-swallow` | 8162 | opus |
| U2 the Meridian Garth | `issue-1703-garth` | 8163 | opus |

Next: look at the before set; W1's brook judged moving by a blind reader before it merges and before W2 (the leat) starts; U1 and U2 reviewed cold as they hand back.

**2026-11-17, 05:10 PST. Opened.** v16 is live; `next` is at `f8f62b6`. The plan, the survey, the fixed views (`tools/views-v17-water.json`), two story files and seven briefs are on `issue-1700-plan`, written by a planning agent. Its survey render (ten frames at low, `shots/wip/v17-survey-*.png`) was taken against the working branch's server on 8123 by mistake (the tools' default `FP_BASE`), not its own on 8173; the tree was the same commit, nothing was written there. Nothing dispatched yet.

Next: merge the plan into `next`; render the before set from `tools/views-v17-water.json` on `next` at medium (`shots/wip/v17-before-*.png`); dispatch batch 1 (W1 the brook and the mere, U1 the Swallow and the tube, U2 the Garth; all opus) from `briefs/v17/index.md`. Then W2 the leat once the brook is judged moving and merged, S1 the sphere when a slot is free, N1 and A1 (sonnet) after the builders.
