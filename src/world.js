// The lay of the land: where every landmark sits, shared by terrain and every module.
// Coordinates are metres; x runs east, z runs south, y is up. The player starts at the castle gate.
// Landmark names are placeholders in the game's register, tagged [Proposed]; Austin decides names.

export const WORLD = {
  size: 1000,            // terrain extent (square), centred on 0,0
  regionRadius: 300,     // walkable region ends here; mountains climb beyond
  mountainRadius: 440,   // mountains reach full height here
  seed: 20261107,
};

// Where the sun hangs. Low in the west-south-west, swollen and red. It does not move.
export const SUN = {
  azimuth: (160 * Math.PI) / 180, // measured from +x toward +z: 160° is west, a little south
  elevation: (13.5 * Math.PI) / 180,
};
// Unit vector pointing *toward* the sun.
SUN.dir = (() => {
  const e = SUN.elevation, a = SUN.azimuth;
  return { x: Math.cos(e) * Math.cos(a), y: Math.sin(e), z: Math.cos(e) * Math.sin(a) };
})();

export const LANDMARKS = {
  castle:   { x: 40,   z: 30,   r: 42,  y: 18,  name: 'Carcanet Keep',        line: 'You woke here. The gate has not closed in a thousand years.' },
  stones:   { x: -170, z: -50,  r: 26,  y: 4,   name: 'The Cardinal Stones',  line: 'Pride and Sloth, Avarice and Spite. Always in that order.' },
  tarn:     { x: -90,  z: 110,  r: 58,  y: -6,  name: 'Lees Tarn',            line: 'The water keeps what it is given, and gives back nothing.' },
  fen:      { x: 70,   z: 160,  r: 72,  y: -2,  name: 'Corpse-Candle Fen',    line: 'The lights are not for you. Follow none of them.' },
  wood:     { x: -210, z: 130,  r: 90,  y: null, name: 'The Deodand Wood',    line: 'Something in the trees is counting your steps.' },
  byre:     { x: -148, z: 64,   r: 14,  y: null, name: 'The Deodand Byre',    line: 'Eight of them, the ostler said. He did not say what he fed them.' },
  orchard:  { x: 130,  z: -90,  r: 52,  y: null, name: 'Medlar Close',        line: 'The fruit is only eaten rotten. It has been ready a long while.' },
  court:    { x: -40,  z: -165, r: 40,  y: -1,  name: 'The Sunken Court',     line: 'Whatever held court here ruled by weight of stone alone.' },
  moraine:  { x: 40,   z: -265, r: 80,  y: null, name: 'The Lattice',         line: 'A mote of dust found its seed crystal. It is still unspooling.' },
  tower:    { x: -250, z: -135, r: 24,  y: 34,  name: "The Armiger's Tower",  line: 'A lens mount, still turned to the sun. Nobody has seen who turned it.' },
  arcature: { x: 160,  z: 60,   r: 22,  y: null, name: 'The Arcature',         line: 'It was built to think. Nobody can say whether it has stopped.' },
  taverna:  { x: 95,   z: -45,  r: 20,  y: null, name: 'The Pomegranate House', line: 'The last stopping place. The lamps are kept for no one you will meet.' },
  // v4: the Great Span (W) along z 215, gate to gate; axis: the landmark is that line (landmarkDistance), at: where the debug panel lands you
  bridge:   { x: 0,    z: 215,  r: 270, y: null, name: 'The Trigon Span',      line: 'Each triangle holds three more. Count them and you will not reach the far side.',
              axis: { x0: -257, x1: 257, half: 14 }, at: { x: -199, z: 199 } },
  shrine:   { x: -108, z: -128, r: 8,   y: null, name: 'The Wayside Shrine',   line: 'Whoever is carved here has been prayed smooth.' },
  graveyard:{ x: 198,  z: -130, r: 14,  y: null, name: 'The Leaning Yard',     line: 'The stones lean the way the wind goes. So, in time, do the dead.' },
  speculum: { x: 208,  z: 258,  r: 10,  y: 3.5, name: 'The Speculum',          line: 'It remembers a sun that was young. It will not remember you.' },
  river:    { x: 168,  z: 236,  r: 30,  y: null, name: 'The Tumbling Water',   line: 'The last thing here in a hurry. Do not ask it where.' },
  // v2 sites from the placement plan (wilderness-v2-placement.md). Built by the stage C agents; names [Proposed].
  sward:    { x: -45,  z: 45,   r: 26,  y: null, name: 'The Heliotrope Sward', line: 'They face the sun because they remember when it was worth facing.' },
  menology: { x: -15,  z: 255,  r: 24,  y: null, name: 'The Menology',         line: 'Thirty-six stones, one for each month. The last is not yet carved.' },
  hypogeum: { x: 226,  z: -112, r: 12,  y: null, name: 'The Hypogeum',         line: 'The door is bronze and the lintel keeps changing its mind.' },
  gradine:  { x: 282,  z: -172, r: 14,  y: null, name: 'The Gradine',          line: 'Steps worn hollow by feet that climbed into the haze and did not come down.' },
  cutting:  { x: 190,  z: 246,  r: 8,   y: null, name: 'The Cutting',          line: 'Stone, black glass, lattice, stone. The ages lie flat here, like strata of mistakes.' },
  eddy:     { x: 171,  z: 242,  r: 5,   y: null, name: 'The Wrong Colour',     line: 'The reeds around it have gone grey. You will not be able to say what colour it is.' },
};

// Distance from (x, z) to a landmark's edge (negative inside): its circle, or for one with an axis its line.
export function landmarkDistance(L, x, z) {
  const a = L.axis;
  if (!a) { const dx = x - L.x, dz = z - L.z; return Math.sqrt(dx * dx + dz * dz) - L.r; }
  const dx = x < a.x0 ? x - a.x0 : x > a.x1 ? x - a.x1 : 0, dz = z - L.z;
  return Math.sqrt(dx * dx + dz * dz) - a.half;
}

// v4 systems (BI): named peaks on the main crest of the walls. Bearings are compass degrees from the bowl's
// centre (0 north, 90 east); h is metres above the crest round it, w the half-width in degrees; a twin peak has
// two horns, a table peak a flat top. Names are [Proposed] placeholders; Austin decides names.
export const PEAKS = {
  tierce:  { bearing: 348, h: 125, w: 4.5, name: 'The Tierce' },
  mitre:   { bearing: 92,  h: 95,  w: 6,   twin: true,  name: 'The Mitre' },
  horn:    { bearing: 162, h: 135, w: 3.5, name: 'The Ossuary Horn' },
  abbess:  { bearing: 200, h: 110, w: 5,   name: 'The Abbess' },
  lectern: { bearing: 306, h: 95,  w: 7,   table: true, name: 'The Lectern' },
};

// The causeway: hex-paved road from the castle gate out to the tower hill, passing the stones.
export const CAUSEWAY = [
  { x: 8, z: 30 }, { x: -40, z: 22 }, { x: -90, z: 2 }, { x: -140, z: -30 }, { x: -185, z: -72 }, { x: -222, z: -110 },
];

// v4: the eight bioregions (wilderness-v4-placement.md section 2; briefs in wilderness-v5.md). Shapes:
// circle {x, z, r}, ellipse {x, z, rx, rz}, poly [[x, z], ...], strip (a spine of [x, z, halfWidth]),
// annulus {x, z, r0, r1, from, to} (compass bearings from the centre, clockwise). clip: half-planes the shape
// stops at ({ zMin } / { zMax }). yields: places that win inside their radius ({x, z, r}). blend: metres the
// ground, stone and cover take to cross the boundary. src/v4/regions.js turns these into weights; each region's
// own work is src/v4/regions/<key>.js. Names are the briefs' and stay [Proposed].
export const REGIONS = {
  bletting:   { id: 'BO', name: 'The Bletting', shape: { circle: { x: 130, z: -90, r: 100 } }, clip: { zMin: -150 }, blend: 8,
                yields: [{ x: 40, z: 30, r: 85 }] }, // clipped on the west by the Demesne's ha-ha (placement plan, BO)
  saltings:   { id: 'BP', name: 'The Saltings', blend: 6,
                shape: { strip: [[168, 130, 20], [192, 158, 25], [178, 192, 18], [140, 200, 12], [118, 222, 12], [85, 246, 10], [45, 246, 10], [12, 228, 12], [-18, 200, 12], [-30, 180, 10]] },
                yields: [{ x: 70, z: 160, r: 75 }] },
  outwash:    { id: 'BQ', name: 'The Outwash', shape: { ellipse: { x: 25, z: -195, rx: 85, rz: 24 } }, blend: 8,
                yields: [{ x: -40, z: -165, r: 40 }, { x: 40, z: -265, r: 50 }] },
  highLing:   { id: 'BR', name: 'The High Ling', shape: { poly: [[228, 10], [236, -105], [276, -105], [293, -40], [293, 10]] }, blend: 6,
                yields: [] },
  demesne:    { id: 'BT', name: 'The Demesne', shape: { annulus: { x: 40, z: 30, r0: 42, r1: 85, from: 300, to: 120 } }, blend: 6,
                yields: [] },
  lynchets:   { id: 'BU', name: 'The Lynchets', shape: { poly: [[-228, -115], [-200, -150], [-160, -115], [-182, -78], [-215, -85]] }, blend: 4,
                yields: [{ x: -170, z: -50, r: 30 }, { x: -250, z: -135, r: 24 }] },
  strandline: { id: 'BV', name: 'The Strandline', blend: 1.5, // v4 regions: "abrupt as a carpet's edge"
                // v4 regions: the spine follows the tarn's new shore (src/v4/tarn.js) round the south bay, 4.5 m inland, and out along the spit
                shape: { strip: [[-31, 130, 9], [-37, 142, 9], [-45, 153, 9], [-67, 142.5, 4.5], [-45, 153, 9], [-55, 162, 9], [-66, 171, 9], [-73, 180, 8], [-77, 191, 8], [-88, 202, 7], [-102, 206, 7], [-114, 195, 8], [-121, 180, 8], [-121, 169, 8]] },
                yields: [{ x: -210, z: 130, r: 95 }] },
  adust:      { id: 'BW', name: 'The Adust', shape: { poly: [[-255, -70], [-290, -72], [-297, 40], [-252, 40]] }, blend: 8,
                yields: [] },
};

// v4–v6 reserved sites (wilderness-v4-placement.md sections 3–5): where each later piece goes, so nothing is
// placed twice. Not landmarks yet (the HUD and the scatter ignore them); a module claims its site when it builds.
export const SITES = {
  pit:        { x: 200, z: 185, r: 14, name: 'the pit', block: [182, 218, 167, 203] },
  thrones:    { x: -410, z: 150, r: 80, name: 'The Acephalous Thrones', at: [[-420, 100], [-400, 200]] },
  galleries:  { x: -390, z: -80, r: 70, name: 'The Galleries of Durance', y: [60, 260] },
  lamps:      { x: -300, z: -330, r: 60, name: 'The Escarpment Lamps', bearings: [300, 335], y: [60, 250] },
  ridge:      { x: 270, z: -380, r: 60, name: 'The Battlemented Ridge', bearings: [20, 45] },
  annals:     { x: 0, z: 0, r: 0, name: 'The Annals', band: [110, 130], bearings: [60, 120] },
  plinths:    { x: 148, z: -220, r: 15, name: 'The Plinth Road', from: [130, -150], to: [165, -290] },
  hawser:     { x: -80, z: -272, r: 10, name: 'The Hawser', from: [-120, -380], to: [-40, -165] },
  nave:       { x: 255, z: 40, r: 25, name: 'The Foundered Nave', block: [230, 280, 15, 65] },
  postern:    { x: -254, z: 212, r: 3, name: 'The Postern' },
  spanWest:   { x: -257, z: 215, r: 12, name: 'the Great Span, west gate', block: [-270, -195, 180, 245] },
  spanEast:   { x: 257, z: 215, r: 12, name: 'the Great Span, east gate', block: [220, 270, 160, 245] },
  fallLip:    { x: 214, z: 266, r: 15, name: 'the Tumbling Water, the taller lip', block: [195, 235, 248, 290] },
  longFigure: { x: 292, z: 70, r: 45, name: 'The Long Figure' },
  lightMoss:  { x: -205, z: 140, r: 8, name: 'moss light' },
  lightEmbers:{ x: 160, z: 60, r: 6, name: 'embers' },
  lightPost:  { x: -140, z: -30, r: 3, name: 'a lamp on a post' },
  lightDoor:  { x: -250, z: -120, r: 4, name: 'a lit doorway' },
  leerie:     { x: 128, z: 5, r: 3, name: "the Leerie's standards", from: [110, -25], to: [145, 35] },
  keptFire:   { x: 10, z: -190, r: 6, name: 'The Kept Fire' },
  collation:  { x: 150, z: -70, r: 10, name: 'The Collation' },
  slipper:    { x: -20, z: 26, r: 1, name: 'The Slipper' },
  prospect:   { x: 238, z: -30, r: 4, name: 'The Unfinished Prospect' },
  tallestTor: { x: 268, z: -80, r: 8, name: "the High Ling's tallest tor" },
};

// The causeway's v4 route (placement plan section 4): from between the colossi's feet in the saddle, north
// through the Adust past the Armiger's Tower, the old road to the keep's gate, round the keep and east to the
// pit. The map-structure agent swaps CAUSEWAY for it, with its paving and wear; until then CAUSEWAY is v3's.
export const CAUSEWAY_V4 = [
  { x: -344, z: 126 }, { x: -302, z: 106 }, { x: -286, z: 60 }, { x: -272, z: 0 }, { x: -262, z: -60 }, { x: -254, z: -108 },
  { x: -222, z: -110 }, { x: -185, z: -72 }, { x: -140, z: -30 }, { x: -90, z: 2 }, { x: -40, z: 22 }, { x: 8, z: 30 },
  { x: 0, z: 5 }, { x: 12, z: -18 }, { x: 45, z: -22 }, { x: 80, z: -8 }, { x: 98, z: 25 }, { x: 122, z: 55 },
  { x: 148, z: 95 }, { x: 172, z: 135 }, { x: 192, z: 168 }, { x: 200, z: 185 },
];

// Water bodies: flat planes at a fixed height, clipped by the terrain naturally.
export const WATER = {
  // r takes in the south bay (v4 regions, src/v4/tarn.js); shore is the old round shore's radius, for what is laid
  // round it (the bench's arc, mists, reeds). terrain.waterLevelAt knows where the water really is.
  tarn: { x: -90, z: 110, r: 92, y: -4.6, shore: 60 },
  fen:  { x: 70, z: 160, r: 80, y: -2.45 },
  // the pool at the fall's foot (The Speculum): the disc takes in its pale-stone beach; the river itself
  // is not a disc, see terrain.js (RIVER, riverAt, waterDepthAt)
  pool: { x: 208, z: 258, r: 6.8, y: 3.5 },
};

export const SPAWN = { x: 6, z: 36, yaw: Math.PI / 2 + 0.15 }; // yaw: 0 looks down -z; PI/2 looks down -x (west)

// Shared palette (hex strings) so modules agree on the world's colours.
export const PALETTE = {
  sunCore: '#ff7030',
  sunLight: '#ffa868',
  skyHorizonSun: '#8a2a16',
  skyHorizonAway: '#3c3456',
  skyZenith: '#0e0c22',
  haze: '#4a3c52',
  moorGrass: '#55582e',
  moorDry: '#8c7a48',
  heather: '#4e3450',
  mud: '#2a241a',
  rock: '#4a3f3a',
  rockDark: '#2c2420',
  scree: '#5c514a',
  ice: '#b9c6d6',
  crystal: '#7ad7ff',
  crystalDeep: '#2a7fa8',
  water: '#0e0a12',
  bark: '#2a1e18',
  leafDark: '#2e3a22',
  leafRust: '#6a3a1a',
  bone: '#d8cdb4',
  stone: '#6a5e58',
  stoneOld: '#8a7a6a',
  ember: '#e8591a',
  wisp: '#9fe8c2',
  pride: '#ffb347',
  sloth: '#6a8a6a',
  avarice: '#5fb89a',
  spite: '#b06ad4',
};
