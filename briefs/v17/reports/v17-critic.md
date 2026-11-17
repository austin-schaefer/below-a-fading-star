# v17 critic

> 🤖 Written by an automated critic agent (`issue-1720-critic`, 2026-11-17, 08:25 to 09:40, at `9c6c678`; no fix landed in the branch while I worked).

**Coverage:**
- 60 map stands and 13 odd views (`tools/views.mjs`).
- `route-frames` on v17-swallow, v17-garth and v17-leat-bridge: 1,134 frames, read by a sonnet helper; I checked its suspects.
- On the keys, a frame every 2 m: the brook, the leat channel, round the mere, and round the sphere. Down the Swallow to the Garth and back at medium and at low.
- 7 phone views, six acts, and 14 audio poses.
- My server ran on 8178, because 8174 is held by a stale `http-server` from the removed worktree `issue-1532-buried`.
- Renders: `shots/wip/critic-v17-*`.

## Blocking
- **An error fills the screen under the mere.**
  - Where: going down the Swallow's tube, from about (-83.8, -9.3, 318.2), yaw -1.57.
  - What: `Uncaught TypeError: Failed to execute 'setTargetAtTime' on 'AudioParam': The provided float value is non-finite` is printed over the view in rows that fill the screen. It stays after you climb back to the moor.
  - It fired 447 to 475 times in each walk, and only on this route (`critic-v17-keys-under-low-016.png`, all of `critic-v17-keys-under-medium-*`). The likely source is `src/v17/sound.js`.
- **"A Lamplighter's Standards" teleports into a void.**
  - Where: it lands at (110, 0.9, -12), yaw -2.33, in flat purple fog, under the card "The Lappet".
  - I saw it on desktop and on the phone (`critic-v17-pl-34-*`, `critic-v17-phone-lamplighter.png`).
- **The Swallow's quay looks unbuilt.**
  - Flat untextured grey sheets stand where walls should be (`critic-v17-swallow-medium-m014.2-2right`, `m020.5-3back`).
  - The pool's surface cuts across the stair in a hard ruled line (`m028.3-1ahead`, `m029.3-4left`).

## Familiar
- **Could be anywhere:**
  - reeds at every water
  - ice-blue crystal prisms
  - a white railway-tunnel portal (the Swallow)
  - a tiled underpass with porthole rings and saucer ceiling lamps (the tube)
  - a snow-globe dome
  - striped market stalls
  - the yellow tower with a teal dome
  - a bronze bell in an arch
- **Only here:**
  - The man at the wheel, inside a glass sphere of light at the west wall.
  - The Meridian Garth: a garden lit like a stage under a ribbed dome, 24 m down.
  - The Laid Sun's gold, being set into a floor underground.

## Weak
- **Empty cards.** The Slake, the Swallow, the Garth, the Shuttered Noon, the Nadir, the Laid Sun, the Lappet, the Fountain and the Saint show a name and a rule over nothing. They read as unfinished.
- **Cards name the wrong place.** The Pomegranate House stand shows "Sleeper's Orchard", and the Trigon Span stand shows "Circumbambulate Pool".
- **An offer hides behind a card.** At the Tocsin, the words "Ring the bell" sit under the card.
- **The tube is out of tone.** Clean pastel tile and saucer lamps look like a modern aquarium tunnel, the only new-looking thing in the valley.
- **The water does not move or sound right.**
  - The brook reads as a still grey sheet, with no movement in 8 frames over 4 s (`w-run-brook`). Its sound loops with a seam every 5.7 s and has 4 clicks.
  - The Speculum's fall has a ruled white bar where it meets the pool (`w-fall-speculum-s*`). It sounds quieter than the still pool (-32.5 against -29.5 LUFS).
  - Close to, the weir water shows as grey zigzag teeth (`w-fall-weirs-s*`). The weirs are the loudest thing I measured (-23.8 LUFS) and flat (LRA 1.2).
  - The pool and the Slake do read as water: the glints shimmer and nothing fights.
- **Bad stands.**
  - The brook's head under the Span is near black (`keys-brook-medium-001`).
  - The Tumbling Water stand faces a grey slab.
  - The act stand at the Lattice is half crystal wall.
- **The village lights, from (269, -20) looking west.** They are a heap of white, red and green points, brighter than the sun behind them. They read as fairy lights, not windows (`l-stairtop-*`).
- **Shadows on the shore walk.** From (-21, 104) south-east, the shadows hold from pace to pace, except one dark smudge in the foreground that vanishes between pace 0 and pace 1.

## Strong
1. **Ring the bell.** The bell shudders at 4 to 8 s. Candles then cross the fen toward you from 8 to 60 s, and the bell's lip glows green.
2. **The Garth seen down the tube.** The lit garden waits at the end of a long green-lit descent. You know where you are going.
3. **The sphere.** A person is at work inside a held noon. The first Noonwright, and you want to know why the wheel is shut.

## Acts
- **Lay your hand.** I saw a hand-print and white veins climb the crystal at 0.5 to 4 s, gone by 15 s. Good, though the stand faces a wall.
- **Knock.** The ring swings at 1 to 2 s, and light spills under the door at 8 to 15 s. "Read the plate" is offered at 30 s. The view tilts down by itself (pitch 0 to -0.15). The v16 dark mass is gone.
- **Pour for him.** The glass reddens at 2 s and embers rise at 4 to 8 s. Quiet.
- **Chalk your stroke.** A stroke appears at 2 s and the seat comes down at 8 to 15 s. Then nothing: no offer to sit, which is a dead end.
- **Ring the bell.** I would show a friend.
- **Let go the lead.** The lead falls into the star-hole at 2 to 8 s, the stars flare, and a pale shape rises at 30 s with the offer again. Seen being done this time.
- **No offer where I expected one:** the man at the wheel, the Garth's cans, the Swallow's lip, the Laid Sun's lamp.

## Stories
- **Found unprompted:** twelfth-chair, painter, lantern-halt, reckoner, bell-under-the-span, sounding-down, wellward-way, tender-of-the-lattices, meridian-garth, man-at-the-wheel.
- **Missed:**
  - **gold-from-the-court.** I went back to (-73.5, -149): the mosaic reads, but there is no bird and no trail of tesserae.
  - **door-on-her-back.** I went back to (99.5, -27.6): a dark figure among the stalls. Her door needs to be against the sky on the road out.
  - Also missed: slipper's-mate, salt-for-news, wait-on-the-span, until-the-sun-goes-out, dead-letters, copyist, noon-by-the-jug, saint-in-the-kiln, sounder-of-the-wreck, traveller-on-the-span.
- **Deep stories:** the surfaces of both (soundings, twelfth chair) read.

## Compared with v16
- **Better:**
  - The knock no longer blacks the view.
  - The lead is seen falling.
  - No audio band failed (14 poses, moor-gutter not run).
- **Worse:** the error overlay, the void teleport, and the empty cards.
- **Still there:** captions at every step, wall-facing stands, and the familiar crystal and reeds.

## Arrival and lettering
- The card is ready in 7 to 14 s. The first view is the keep, the sun and the colossi, and I would stay.
- The lettering looks designed at both 1280 by 720 and 390 by 844.
- On the phone, the Keep's line is unreadable over the bright ground.
- Of the three first screens I would keep `?type=b`: the framed plate and one-line title look most like a book. The default's heavy two-colour B is clumsy, and `?type=a`'s "BELOW A" is too small.

## Underground
- **What the place is:** a drowned aqueduct down to a buried garden.
- **The light:**
  - On the quay, it is late dusk.
  - In the tube, there is no time of day: flat aquarium green, and the lamps blow out to white.
  - In the Garth, it is grey, like an overcast noon.
- **The way:** clear at both medium and low, but I was unsure at the quay, where the grey sheets look like walls.

## Missing
Somewhere to sit at the Halt, and a voice for the big falls. Something to do underground.

## One suggestion
- **Build:** make the man's shut wheel an act that opens the line and lights the Garth. It would tie the sphere, the tube and the garden together.
- **Cut:** every card without a line.
