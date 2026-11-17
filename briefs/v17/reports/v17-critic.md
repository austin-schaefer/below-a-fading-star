# v17 critic

> 🤖 Automated critic (`issue-1720-critic`, 2026-11-17 08:25 to 09:45, at `9c6c678`, unchanged throughout).

**Coverage:** I took 60 map stands and 13 odd views. I ran `route-frames` on the three v17 routes (1,134 frames, read by a sonnet helper; I checked its suspects). On the keys I walked the brook, the leat, the mere's shore and round the sphere. I went down the Swallow to the Garth and back, at medium and at low. I also took 7 phone views, did 6 acts and rendered 14 audio poses. I served on 8178: 8174 is held by a stale server from the removed worktree `issue-1532-buried`. Renders are `shots/wip/critic-v17-*`.

## Blocking
- **An error fills the screen under the mere.** From about (-83.8, -9.3, 318.2), yaw -1.57, rows of `Uncaught TypeError: … 'setTargetAtTime' … non-finite` cover the view. They stay after you climb back out. There were about 450 errors per walk, and they appear only on this route (`critic-v17-keys-under-low-016.png`). Probably `src/v17/sound.js`.
- **"A Lamplighter's Standards" teleports into a void.** It lands at (110, 0.9, -12), yaw -2.33, in flat purple, under the card "The Lappet". It happens on desktop and phone (`critic-v17-pl-34-*`, `critic-v17-phone-lamplighter.png`).
- **The Swallow's quay looks unbuilt.** Untextured grey sheets stand where walls should be (`critic-v17-swallow-medium-m014.2-2right`, `m020.5-3back`). The pool surface cuts the stair with a ruled line (`m028.3-1ahead`).

## Familiar
- **Anywhere:** reeds at every water, ice-blue crystal, a white railway-tunnel portal (the Swallow), and a tiled underpass with saucer lamps (the tube). Also a snow-globe dome, striped stalls, and a yellow tower with a teal dome.
- **Only here:** the man at the wheel inside a sphere of held noon; the Garth, a garden lit like a stage 24 m down; the Laid Sun's gold.

## Weak
- **Empty cards.** The Slake, the Swallow, the Garth, the Shuttered Noon, the Nadir, the Laid Sun, the Lappet, the Fountain and the Saint each show a name over nothing. Some cards name the wrong place: the Pomegranate House stand says "Sleeper's Orchard". At the Tocsin, "Ring the bell" hides under the card.
- **The tube is out of tone.** Its clean pastel tile looks new, like an aquarium tunnel.
- **The water.**
  - The brook is a still sheet: nothing moves across 8 frames. Its sound loops every 5.7 s with 4 clicks.
  - The Speculum fall ends on a ruled white bar and sounds quieter than a still pool (-32.5 vs -29.5 LUFS).
  - The weirs are zigzag teeth up close, and the loudest place I measured (-23.8 LUFS), with a flat loudness range of 1.2 LU.
  - The pool and the Slake read as water.
- **Bad stands.** The brook's head under the Span is near black. The Tumbling Water stand faces a slab. The Lattice act stand is half wall.
- **Village lights from (269, -20), looking west.** A heap of white, red and green points, brighter than the sun: fairy lights, not windows (`l-stairtop-*`).
- **Shadows walking south-east from (-21, 104).** They are steady, except one foreground smudge that vanishes between pace 0 and pace 1.

## Strong
1. **Ring the bell.** The bell shudders, then candles cross the fen toward you for a minute.
2. **The Garth at the end of the tube.** The lit garden pulls you down the green descent.
3. **The sphere.** Someone at work inside held noon; you want to know why the wheel is shut.

## Acts
- **Lay your hand.** I saw the hand and veins at 0.5 to 4 s. Good, though the stand faces a wall.
- **Knock.**
  - The ring swings, light spills under the door at 8 s, and "Read the plate" is offered at 30 s.
  - The view tilts down on its own.
  - The v16 black mass is gone.
- **Pour for him.** The glass reddens at 2 s and embers rise. Quiet.
- **Chalk your stroke.** A stroke appears at 2 s, the seat lowers at 8 to 15 s, then nothing. There is no offer to sit, so it is a dead end.
- **Ring the bell.** I would show a friend.
- **Let go the lead.** The lead falls into the stars, they flare, and a pale shape rises at 30 s. Seen this time.
- **No offer:** at the wheel, at the Garth's cans, at the Swallow, or at the Laid Sun's lamp.

## Stories
- **Found unprompted:** twelfth-chair, painter, lantern-halt, reckoner, bell-under-the-span, sounding-down, wellward-way, tender-of-the-lattices, meridian-garth, man-at-the-wheel.
- **Missed, and went back to:**
  - **gold-from-the-court**, at (-73.5, -149): there is no bird and no trail of tesserae.
  - **door-on-her-back**, at (99.5, -27.6): I see only a dark figure among stalls. She needs to be against the sky on the road out.
- **Missed, not revisited:** slippers-mate, salt-for-news, wait-on-the-span, until-the-sun-goes-out, dead-letters, copyist, noon-by-the-jug, saint-in-the-kiln, spilt-measure, traveller-on-the-span.
- **Deep stories:** the soundings and the twelfth chair both read on the surface.

## Compared with v16
- **Better:** the knock no longer blacks the view, the lead is seen falling, and no audio band failed (moor-gutter not run).
- **Worse:** the error overlay, the void teleport, and the empty cards.
- **Still there:** captions everywhere, stands that face walls, and the crystal and reeds.

## Arrival and lettering
The card is ready in 7 to 14 s. The first view is the keep, the sun and the colossi, and I would stay. The lettering looks designed at both sizes. On the phone, the Keep's line is unreadable over the bright ground. Of the first screens, keep `?type=b`: the framed plate with a one-line title looks like a book. The default's heavy B is clumsy, and `?type=a`'s "BELOW A" is too small.

## Underground
It is a drowned aqueduct down to a buried garden. The way is clear at medium and at low, except at the quay, where the grey sheets look like walls.

The light changes three times:
- The quay is late dusk.
- The tube has no time of day: flat aquarium green, with lamps blown out to white.
- The Garth is a grey, overcast noon.

## Missing
A seat at the Halt, a voice for the big falls, and something to do underground.

## One suggestion
- **Build:** make the man's shut wheel an act that opens the line and lights the Garth.
- **Cut:** every card without a line.
