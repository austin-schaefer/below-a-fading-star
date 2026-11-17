# v17 U2, the Meridian Garth: report

Branch `issue-1703-garth`, 2026-11-17.

## What is built

- `src/v17/garth.js` and `src/v17/garth/` (`plan.js`, `hall.js`, `garden.js`, `noon.js`, `water.js`, `can.js`): the hall at `GARTH` (centre (-10, 322), floor -24, r 20, a dome to -4). It has the Heliarchs' coursed drum, plinth, cornice, a ribbed segmental dome, an oculus ringed in bronze, a round-arched west door with its reveal, and a hex-paved walk round the wall.
- **The Noonwrights' glass.** Their lens hangs in the crown on strands. The tube that feeds it comes in through the dome from the sphere's bearing and ends in a node at the lens.
- **The noon.** It is a beam computed per fragment in every Garth material (`noon.js`), not a PointLight. It lights the inside of a cone from the lens down to a 4.5 m disc on the floor, and a leaf is lit on both faces. The beam's bounce is baked into the vertices. The light breathes on a 9 s and a 4 s sine and ignores the gutter. Beside it are the shaft and the dust in the air.
- **The garden.** Five rings by radius: living, wilting, brown, grey stalks, and dust. Each ring has its own ring of espaliers on spun-filament frames, a stage further dead from ring to ring.
- **The water and the can.** Moving rills: a spout by the door feeds an outer ring that runs both ways to a grate, three feeders run inward, and an inner ring sits at the light's edge. The can is the tender's make, man-high, with its rose over the inner rill; a drop falls every 2.3 s and rings spread where it lands.
- **The door's numbers.** They are in `src/v17/plan.js` as `GARTH_DOOR`. U1 builds to its `face` (r 21.6), and its tube (bore 1.65, outer 1.75) fits inside my 3.8 by 5.2 m opening. A black end closes the door until `ctx.swallow` builds.

## Shared files

- `src/v14/under.js`: `below.grade(fn)` (+5 lines), a place's own grade under the ground.
- `src/main.js`: one line.
- `tools/edges-test.mjs`: `UNDER` takes `garth-`.
- `tools/geometry/places.mjs`: `v17-garth`.
- `modules.md`: a row. `runtime.md`: a `### v17` entry.
- `src/v8/places.js`: untouched.

## Tests (port 8163)

- `ONLY=edges,heights`: 414 PASS, 0 failed. Under-geometry runs inside `edges`: 3886 members, 0 in the air; 170527 faces, 0 coplanar pairs.
- `ONLY=geometry`: v17-garth has 0 faults, 0 failed.
- An earlier run of `walk,seams,gutter` was green.
- **heights** first failed at the top of the gallery (366 calls against a limit of 364). The hall's meshes were being drawn through the ground from up there. They are now drawn only while the eye is below y -8 and within 95 m.
- **Draw calls on low:** the Garth takes 125–161, the Laid Sun 172–190.
- **height-speed:** the ratio came out at 1.13–1.15. That is load noise: the height path is unchanged against `origin/next`, and the suite was running beside the measurement.

## Weaker than asked

- **The light.** The first blind reader called it "moon- or starlight, or a thin dusky daylight", and the plants "generic low-poly, toy-like". I warmed the light after that, but it may still not read as plainly noon.
- **The leaves** are flat cards.
- **The can** reads as a jug from inside the light.
- **No sound.** That is A1's.

## The blind reader (sonnet), last round
- Three stills: "a round domed stone conservatory, a lone green garden of trellised fruit trees tended in the middle of a dark dead ring of withered plants"; light "pale dusty-gold shaft from the oculus... like a hazy dying-sun afternoon"; story: "someone kept one patch alive... watered... a watering can at the bed's edge". Not said: daylight, or that the light is shrinking.
- Walk frames (medium, low): no flicker or pop. Phone: "a little dark but readable, nothing blown out". Can frames: the drip's ring on the rill seen growing.
- Worst: walk-medium-11, a blank wall at the walk's end; colour fringing on grass (the post's aberration).

Stand: `?pos=-28.2,318.4,-24&yaw=-1.77` (feet on the floor inside the door, facing the light).
