// v18, the wood: every coordinate of the milestone, in one place. Three-free; imports nothing. Each brief reads its
// numbers here and adds rows only in its own section. Levels (y) are found from heightAt by the brief that builds.
// x, z in world metres; the Deodand Wood is LANDMARKS.wood (-210, 130), r 90.

// F1: the wood's reach. The north lobe is new wood on what was open moor.
export const NORTH_LOBE = { x: -198, z: 22, r: 38, box: { x0: -232, x1: -165, z0: -5, z1: 42 } }; // keep off the tor (-230, 30), rivulet R4 (x -150..-160) and the Stones' ring (z -24)

// F1: the spurs. Each leaves the wood way (P32) and twists to its end; `from` is on P32, `to` is the find's doorstep.
export const SPURS = {
  glass: { from: { x: -199.4, z: 126.8 }, to: { x: -257, z: 127 } },  // west, to the Florilegium's door
  beds: { from: { x: -213.8, z: 162 }, to: { x: -249, z: 172 } },   // south-west, to the Lower Beds' door in the bank
  north: { from: { x: -169.7, z: 93.6 }, to: { x: -198, z: 24 } },    // north, out of the old wood and into the lobe, to the stilters' grove
};
// F1: each spur's mouth, kept clear of trunks (a gap seen from the road): from its head on P32 along its first leg, which
// leaves the road square to it for 7 m (round three: the heads moved along P32 to where it is straight and level)
export const SPUR_MOUTHS = [
  { a: [-199.4, 126.8], b: [-204.8, 122.3], half: 1.8 },
  { a: [-213.8, 162], b: [-220.7, 160.5], half: 1.8 },
  { a: [-169.7, 93.6], b: [-174.1, 88.2], half: 1.8 },
];

// F2: the Florilegium, the glasshouse. A claim of r 13 on the patch at mean slope 0.24; nobody walks inside it.
export const GLASSHOUSE = { x: -265, z: 126, r: 13, door: { x: -257, z: 127 } };
// F2: its ground is a level pad (src/height/pads.js) at `floor`; the grate's opening in the paving outside the door (a
// square of `half`, axis-aligned, the bars' top at y); the six tubs on a ring of r `ring` at 30, 90, ... 330 degrees
// from +x toward +z in LIKENESSES' order, the sprout's inside the door
export const FLORILEGIUM = { floor: -3.2, pad: { half: 8.5, angle: 0.62, ease: 7 }, grate: { x: -258.0, z: 126.0, half: 0.6, y: -3.15 }, ring: 3.4, sprout: { x: -260.9, z: 126.0 } };

// F3: the Lower Beds, the crypt, and its way under the wood to beneath the glasshouse.
export const BEDS = {
  door: { x: -249, z: 172 },      // in the south-west rise, slope 0.74; outside the Span's west block (x -270..-195, z 180..245)
  crypt: { x: -258, z: 164 },     // the vault, under the rise
  under: { x: -265, z: 126 },     // the round chamber under the glasshouse's floor; a grate overhead
};

// F4: the stilters' grove, in the lobe.
export const GROVE = { x: -198, z: 22, r: 22 };
// F4: the stilters: where each starts (bearing in radians from north toward east, metres from the grove's middle), how
// tall, how many legs, `mark` the one thing a visitor knows it by again (scar, rag, broken, both); the asleep one never moves. `leash`: none strays further than this from the grove's middle.
export const STILTERS = {
  leash: 34, near: 5.5, keep: 7, ring: 8, gap: 1.6,
  list: [
    { a: 0.6, d: 12, h: 12.5, legs: 3, lean: [0.6, -0.3], mark: 'scar' },
    { a: 2.3, d: 15, h: 11, legs: 3, prop: true, lean: [-0.8, 0.2], mark: 'rag' },
    { a: 3.6, d: 10, h: 13, legs: 3, lean: [0.2, 0.5], mark: 'broken' },
    { a: 5.0, d: 16, h: 10, legs: 2, lean: [0.9, 0.4], mark: 'both' },
    { a: 4.3, d: 19, h: 12, legs: 3, asleep: true, lean: [-0.4, -0.4] },
  ],
};

// The likenesses: the same six people, in the same order, as flowers in the glasshouse (F2) and as effigies on the
// tomb lids below (F3); the seventh is the Graffer's own. `prop` is what makes each read at 15 m.
export const LIKENESSES = [
  { id: 'fan', who: 'a lady', prop: 'an open fan held high' },
  { id: 'sword', who: 'an armiger', prop: 'both hands on a sword point-down before him' },
  { id: 'hoop', who: 'a child', prop: 'a hoop as tall as itself' },
  { id: 'cup', who: 'a fat magnate', prop: 'a cup raised' },
  { id: 'pair', who: 'two lovers', prop: 'hand in hand, heads together' },
  { id: 'hawk', who: 'a falconer', prop: 'a bird on a lifted wrist' },
  { id: 'graffer', who: 'the Graffer', prop: 'a watering can; in the glasshouse only a sprout, on the tomb a lid half carved, the tomb open and empty' },
];
