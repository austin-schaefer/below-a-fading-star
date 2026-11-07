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
  tower:    { x: -250, z: -135, r: 24,  y: 34,  name: "The Armiger's Tower",  line: 'The banner still flies. Nobody has seen who raises it.' },
  arcature: { x: 160,  z: 60,   r: 22,  y: null, name: 'The Arcature',         line: 'It was built to think. Nobody can say whether it has stopped.' },
  taverna:  { x: 95,   z: -45,  r: 20,  y: null, name: 'The Pomegranate House', line: 'The last stopping place. The lamps are kept for no one you will meet.' },
  bridge:   { x: -95,  z: 215,  r: 40,  y: null, name: 'The Trigon Span',      line: 'Each triangle holds three more. Count them and you will not reach the far side.' },
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

// The causeway: hex-paved road from the castle gate out to the tower hill, passing the stones.
export const CAUSEWAY = [
  { x: 8, z: 30 }, { x: -40, z: 22 }, { x: -90, z: 2 }, { x: -140, z: -30 }, { x: -185, z: -72 }, { x: -222, z: -110 },
];

// Water bodies: flat planes at a fixed height, clipped by the terrain naturally.
export const WATER = {
  tarn: { x: -90, z: 110, r: 60, y: -4.6 },
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
