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
  castle:   { x: 40,   z: 30,   r: 42,  y: 18,  name: "Carcanet Keep",        line: "“Over all brooded the citadel, like a condor stooping above its prey, intent on its own dark meditations.”" },
  stones:   { x: -170, z: -50,  r: 26,  y: 4,   name: "The Cardinal Stones",  line: "Pride and Sloth, Avarice and Spite." },
  tarn:     { x: -90,  z: 110,  r: 58,  y: -6,  name: "Circumbambulate Pool",            line: "“No hand was at the sweep of the Tigress, no oars drove her through the green water.”" },
  fen:      { x: 70,   z: 160,  r: 72,  y: -2,  name: "Corpse-Candle Fen",    line: "“Unseen whippoorwills chatter and the fireflies come out in abnormal profusion to dance.”" },
  wood:     { x: -210, z: 130,  r: 90,  y: null, name: "The Deodand Wood",    line: "“Branches and boughs knit patterns on the fading purple over him; the air smelt of moss and dank mold.”" },
  byre:     { x: -148, z: 64,   r: 14,  y: null, name: "The Oast Byre",    line: "“In a litter of filth and matted straw stood a number of hulking men eight or nine feet tall. They were naked, with shocks of dirty yellow hair and watery blue eyes.”" },
  orchard:  { x: 130,  z: -90,  r: 52,  y: null, name: "Medlar Close",        line: "“Now in the last fleeting moments, humanity festers rich as rotten fruit.”" },
  court:    { x: -40,  z: -165, r: 40,  y: -1,  name: "The Sunken Court",     line: "“Law cannot reach where enforcement will not follow.”" },
  moraine:  { x: 40,   z: -265, r: 80,  y: null, name: "The Lattice",         line: "“Automatic, unmoral, uncalculating inevitability.”" },
  tower:    { x: -250, z: -135, r: 24,  y: 34,  name: "The Armiger's Tower",  line: "“The moon is dark, and the gods dance in the night; there is terror in the sky, for upon the moon hath sunk an eclipse foretold in no books of men or of earth’s gods.”" },
  arcature: { x: 160,  z: 60,   r: 23,  y: null, name: "The Arcature",         line: "“Here you see the pattern from which my great work is derived. It expresses the symbolic significance of NULLITY to which TOTALITY must necessarily attach itself.”" },
  taverna:  { x: 95,   z: -45,  r: 20,  y: null, name: "The Pomegranate House", line: "“While we are alive we should sit among colored lights and taste good wines.”" },
  // v4: the Great Span (W) along z 215, gate to gate; axis: the landmark is that line (landmarkDistance), at: where the debug panel lands you
  bridge:   { x: 0,    z: 215,  r: 270, y: null, name: "The Trigon Span",      line: "“I challenge Destiny, yes, but I do not leap off cliffs.”",
              axis: { x0: -257, x1: 257, half: 14 }, at: { x: -199, z: 199 } },
  shrine:   { x: -108, z: -128, r: 8,   y: null, name: "The Wayside Shrine",   line: "“Love is not blind, neither God’s love nor man’s.”" },
  graveyard:{ x: 198,  z: -130, r: 14,  y: null, name: "The Leaning Yard",     line: "“When we’re young, we notice things that are young, like ourselves. New grass on old graves.”" },
  speculum: { x: 208,  z: 258,  r: 10,  y: 3.5, name: "The Speculum",          line: "“... who lived ages before there were any men, and who came to the young world out of the sky.”" },
  river:    { x: 168,  z: 236,  r: 30,  y: null, name: "The Tumbling Water",   line: "“Below she caught glimpses of misty plains and valleys with mountain peaks rising far away.”" },
  // v2 sites from the placement plan (plans/wilderness-v2-placement.md). Built by the stage C agents; names [Proposed].
  sward:    { x: -45,  z: 45,   r: 26,  y: null, name: "The Heliotrope Sward", line: "“You shall die in this tragic golden light of sunset.”" },
  menology: { x: -15,  z: 255,  r: 24,  y: null, name: "The Menology",         line: "“The clock moves forward; wasted time is life defeated.”" },
  hypogeum: { x: 226,  z: -112, r: 12,  y: null, name: "The Hypogeum",         line: "“The magician hides his hinges, mirrors, and trapdoors with the utmost care.”" },
  gradine:  { x: 282,  z: -172, r: 14,  y: null, name: "The Gradine",          line: "“The marble treads were cracked: A condition which the murk of twilight invested with a mournful grandeur.”" },
  cutting:  { x: 190,  z: 246,  r: 8,   y: null, name: "The Cutting",          line: "“The stone walls were incised with those inevitable, mysterious symbols which have become nothing more than queer designs now.”" },
  eddy:     { x: 171,  z: 242,  r: 5,   y: null, name: "The Wrong Colour",     line: "“Their souls enter a gray misty realm of clouds and icy winds, to wander cheerlessly throughout eternity.”" },
  // v7.1: the pit beside the old road from the east gate (SITES.pit); inside the Span's broad card, so a card wins there
  pit:      { x: 200,  z: 185,  r: 14,  y: null, name: "The Pit", line: "“He tried to tell himself that this well connected somehow with the outer world, but his instincts told him it was a thing unnatural... How then could an outer wind find its way into the pits and blow up from below?”", card: true, feet: [-27, 60] }, // v14-D2: the lip's and the stair's down the wall (the floor has its own, the Nadir; v14-F1: down to it, so no region card rises on the stair)
  // v7.1: the Sexton's grave field (SITES.sexton's block): a card wins over the Saltings' region card and the Span's broad one
  graves:   { x: 55,   z: 274,  r: 18,  y: null, name: "Rest in Starlight", line: "“Dig me no grave; I shall not need one.”", card: true },
  // v6.5: name cards for the v5 sites (SITES): card places have no footprint of their own, so the scatter ignores them and
  // the HUD prefers one to the broad landmark it lies inside. The Galleries and the Thrones hang on the wall: their trigger
  // sits on the nearest walkable ground below them.
  collation: { x: 150, z: -70, r: 14, y: null, name: "The Collation", line: "“We need no chieftain; such folk eat more than their share.”", card: true },
  prospect: { x: 238, z: -30, r: 10, y: null, name: "The Unfinished Prospect", line: "“It was from the artists and poets that the pertinent answers came, and I know that panic would have broken loose had they been able to compare notes.”", card: true },
  keptfire: { x: 10, z: -190, r: 14, y: null, name: "The Kept Fire", line: "“He walked apart, beyond the glow of the campfires to gaze out among the mystic vistas of crag and valley. The slopes were softened by verdure and foliage, the vales deepening into shadowy realms of magic.”", card: true },
  hawser: { x: -80, z: -272, r: 25, y: null, name: "The Hawser", line: "“To chain them wholly to modern rules would be barbarous.”", card: true },
  plinths: { x: 148, z: -220, r: 25, y: null, name: "The Plinth Road", line: "“It had not been built for human feet to travel. It had not been built for feet at all.”", card: true },
  lappet: { x: 78, z: -12, r: 30, y: null, name: "The Lappet", card: true, aside: false, at: { x: 128, z: 5 } }, // v15: the village on the Elder stair under the keep (its ways' heads and feet are named by it)
  // v15-N1: the Lappet's four quarters, each a card up only on its own level (`feet`: the Quarrels on the crown, the Rungs on the High, Mid and Low Rungs, the Lees on the bench, the Pennyworth on the foot); they win over "The Lappet" inside them, so every way up's end is named by the quarter it comes out in; `map: false`: a card only, not a place in the teleport list (the owner's #70: fewer entries; the village is the one entry, The Lappet)
  lappetCrown: { x: 60, z: -6, r: 18, y: null, name: "The Quarrels", card: true, map: false, feet: [16, 21.5], aside: false },
  lappetRungs: { x: 80, z: -16, r: 24, y: null, name: "The Rungs", card: true, map: false, feet: [4.8, 15.8], aside: false },
  lappetLees: { x: 80, z: -28, r: 34, y: null, name: "The Lees", card: true, map: false, feet: [2, 4.6], aside: false },
  lappetFoot: { x: 110, z: -30, r: 24, y: null, name: "The Pennyworth", card: true, map: false, feet: [-3, 1.8], aside: false },
  nave: { x: 255, z: 40, r: 30, y: null, name: "The Foundered Nave", line: "“Hard as the sea in the sun’s slanting beams, in the darkness of the stars, where no eye can pierce her deeps.”", card: true },
  galleries: { x: -338, z: -69, r: 40, y: null, name: "The Galleries of Durance", line: "“What is peace? Balance three iron skewers tip to tip, one upon the other.”", card: true },
  thrones: { x: -324, z: 118, r: 40, y: null, name: "The Acephalous Thrones", line: "“She turned her face up to the strange stars and wondered in what direction her course lay. The sky looked blankly down upon her with its myriad meaningless eyes.”", card: true },
  leerie: { x: 128, z: 5, r: 20, y: null, name: "A Lamplighter’s Standards", line: "“All fled, all done, so lift me on the pyre;\nThe feast is over and the lamps expire.”", card: true },
  // v14-B3 (#52): the places a visitor can stand that came with v9 to v12, named; v14-B5: the owner's quotations,
  // renames and cuts (#52, 2026-11-15). `feet: [lo, hi]`: the card is up only while the walker's feet are at that height (a
  // deck over the valley floor, a gallery on the wall); `reached`: a place up or at the walk's edge that no track comes
  // near, reached by its own way, said how (roads-test asks no track of it; a place on open ground is in roads-test's
  // EXEMPT, bounded). An axis along z is { z0, z1, half } (landmarkDistance). `aside: false`: the Link-Boy does not take it
  // for what continues past a lead's end (v7/walkers/linkboy.js), so he steps aside as before. `broad: true`: a card that
  // gives way to every other card inside it (hud.js): Titan's Causeway is the whole deck, the Long Wait and the Shaky
  // Splice are places on it.
  halt: { x: -63, z: 1, r: 9, y: null, name: "The Lantern Halt", line: "“We went out into the moonless and tortuous network of that incredibly ancient town; went out as the lights in the curtained windows disappeared one by one.”", card: true, aside: false },
  tocsin: { x: -52, z: 207, r: 11, y: null, name: "The Tocsin", line: "“I came to the fog-enfolded river that flows beside its walls, and heard beyond the river the mortuary tolling of many bells.”", card: true, feet: [-30, 30], aside: false },
  escalade: { x: -226, z: 200, r: 9, y: null, name: "The Cyclopean Stairs", line: "“In the dank twilight I climbed the worn and aged stone stairs till I reached the level where they ceased.”", card: true, feet: [-30, 30], aside: false },
  // the Span's deck from gate to gate, and both stairs' top landings (the west one's turn at z 186 is 29 m off the line):
  // up from the stair's last flight (feet 53 m) at either end
  causeway: { x: 0, z: 215, r: 0, y: null, name: "Titan’s Causeway", line: "“Never shall I learn the secret of those ruinous walls and crumbling keeps, nor the fate of my companions.”", card: true, broad: true, feet: [53, 70], axis: { x0: -257, x1: 257, half: 24 }, at: { x: -150, z: 213 }, reached: 'the Span', aside: false },
  wait: { x: 88, z: 211, r: 11, y: null, name: "The Long Wait", line: "“A bitter night for travelers.”\n“A bitter night for musing on the stars.”", card: true, feet: [44, 70], reached: 'the Span', aside: false },
  spar: { x: 145, z: 215, r: 0, y: null, name: "Shaky Splice", line: "“At intervals we came to the broken fragments of a paved road: broad, cyclopean flags of gneiss.”", card: true, feet: [40, 70], axis: { x0: 122, x1: 169, half: 3 }, at: { x: 118, z: 214 }, reached: 'the Span', aside: false },
  bitter: { x: 44, z: -390, r: 10, y: null, name: "The Bitter End", line: "“Our eyes swept that limitless, tempest-scarred plateau and grasped the almost endless labyrinth.”", card: true, feet: [80, 130], reached: 'the icefall', aside: false },
  diffident: { x: 286, z: -14, r: 9, y: null, name: "Lonely Staircase", line: "“Form is shadow, substance is illusion, materiality is dream.”", card: true, feet: [-30, 30], aside: false },
  coffinroad: { x: 271, z: 42, r: 0, y: null, name: "The Noon Road", card: true, feet: [-22, -8], axis: { x0: 246, x1: 296, half: 6 }, at: { x: 250.4, z: 42 }, reached: 'the hung stair', aside: false }, // v14-D3: the Noonwrights' stalled carriers on the Foundered Nave's water, 15 m under the moor (src/v14/coffin-road.js, noon-road.js; the key keeps its first name); no line yet: the owner sources the quotations
  croft: { x: 224.5, z: -68, r: 0, y: null, name: "The Hanging Croft", line: "“We discovered, however, at an early date, that we ourselves and our buildings were invisible to men.”", card: true, feet: [95, 130], axis: { z0: -88, z1: -48, half: 6 }, at: { x: 228.6, z: -55 }, reached: 'Lonely Staircase', aside: false },
  tenders: { x: 223.1, z: -70, r: 0, y: null, name: "The Tender’s Round", card: true, map: false, feet: [140, 160], axis: { z0: -94, z1: -47, half: 3 }, at: { x: 223.1, z: -56 }, reached: 'the Hanging Croft’s ladder', aside: false }, // v15-W2: the lattice's lowest course over the Croft, up the tender's ladder (src/v12/stair/top.js)
  // the top of the lift: the gangway off the carriage and the walked gallery on the cliff, 135 m up
  remand: { x: -375, z: -70, r: 0, y: null, name: "Final Refuge", line: "“In relating the circumstances which have led to my confinement within this refuge, I am aware that my present position will create a natural doubt.”", card: true, feet: [120, 150], axis: { z0: -117, z1: -24, half: 8 }, at: { x: -377, z: -50 }, reached: 'the lift', aside: false },
  laidsun: { x: 223.6, z: 123.0, r: 6, y: null, name: "The Laid Sun", card: true, feet: [-34, -22], reached: 'the Wellward Way', aside: false }, // v14-D1: the room on the way under the moor from the Nave to the Pit, the Reckoner's new sun going into its floor
  nadir: { x: 200, z: 185, r: 14, y: null, name: "The Nadir", card: true, feet: [-40, -27], reached: 'the road’s slabs down the Pit’s wall', aside: false }, // v14-D2: the bottom of the Pit, the hole through the floor of the world and the down-reel over it (src/v14/pit.js)
};

// v7.1: region cards. Austin's copy for four of the v4 regions (briefs/copy/place-copy.md): the card shows while the
// region's weight at the player is 0.5 or more and no landmark card is up (hud.js). Kept apart from LANDMARKS so nothing
// that walks LANDMARKS (the scatter, the Link-Boy's bearings, the debug keys) takes a region for a footprint. x, z: where
// the settings panel stands you (inside the region, clear of the smaller cards that would win there).
export const REGION_CARDS = {
  adust:    { region: 'adust',    x: -275, z: -15, name: "The Taker of Altitudes",     line: "“Man was unaware of his vulnerability. Logic was the special environment; the brain was the special tool.”" },
  bletting: { region: 'bletting', x: 185,  z: -70, name: "Sleeper’s Orchard",  line: "“I loved the irradiate refuge of sleep. In my dreams I found a little of the beauty I had vainly sought in life, and wandered through old gardens and enchanted woods.”" },
  lynchets: { region: 'lynchets', x: -195, z: -113, name: "The Lynchets", line: "“On the gentle slopes there are farms, ancient and rocky... but these are all vacant now. The old folk have gone away, and foreigners do not like to live there.”" },
  saltings: { region: 'saltings', x: 45,   z: 246, name: "Kenching Flats", line: "“From the essential Saltes of humane Dust, a Philosopher may, without any criminal Necromancy, call up the Shape of any dead Ancestour from the Dust.”" },
};

// Distance from (x, z) to a landmark's edge (negative inside): its circle, or for one with an axis its line (along x at
// L.z from x0 to x1, or, given z0 and z1, along z at L.x).
export function landmarkDistance(L, x, z) {
  const a = L.axis;
  if (!a) { const dx = x - L.x, dz = z - L.z; return Math.sqrt(dx * dx + dz * dz) - L.r; }
  if (a.z0 !== undefined) { const dz = z < a.z0 ? z - a.z0 : z > a.z1 ? z - a.z1 : 0, dx = x - L.x; return Math.sqrt(dx * dx + dz * dz) - a.half; }
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

// v4: the eight bioregions (plans/wilderness-v4-placement.md section 2; briefs in plans/wilderness-v5.md). Shapes:
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
  adust:      { id: 'BW', name: 'The Adust', shape: { poly: [[-258, -76], [-274, -83], [-291, -75], [-298, -40], [-300, 2], [-297, 40], [-286, 50], [-270, 44], [-257, 49], [-246, 39], [-249, 28], [-237, 21], [-234, 12], [-247, 5], [-251, -7], [-240, -15], [-236, -24], [-250, -31], [-255, -45], [-245, -57], [-249, -68]] }, blend: 8, // v12-H5: ragged, drifts tongued east with the wind; it was a rectangle, and from the tops a red stain
                yields: [] },
};

// v4–v7 reserved sites (plans/wilderness-v4-placement.md sections 3–5): where each later piece goes, so nothing is
// placed twice. Not landmarks yet (the HUD and the scatter ignore them); a module claims its site when it builds.
export const SITES = {
  pit:        { x: 200, z: 185, r: 14, name: 'the pit', block: [182, 218, 167, 203] },
  thrones:    { x: -410, z: 150, r: 80, name: 'The Acephalous Thrones', at: [[-420, 100], [-400, 200]] },
  galleries:  { x: -390, z: -80, r: 70, name: 'The Galleries of Durance', y: [60, 260] },
  lamps:      { x: -171, z: 384, r: 60, name: 'The Escarpment Lamps', bearings: [190, 218], y: [60, 240] }, // the south massif's north face, over the Span's road, out of the sun's glare (v11: moved off the Galleries' massif)
  ridge:      { x: 270, z: -380, r: 60, name: 'The Battlemented Ridge', bearings: [20, 45] },
  annals:     { x: 0, z: 0, r: 0, name: 'The Annals', band: [110, 130], bearings: [60, 120] },
  plinths:    { x: 148, z: -220, r: 15, name: 'The Plinth Road', from: [130, -150], to: [165, -290] },
  hawser:     { x: -80, z: -272, r: 10, name: 'The Hawser', from: [-120, -380], to: [-40, -165] },
  nave:       { x: 255, z: 40, r: 25, name: 'The Foundered Nave', block: [230, 280, 15, 65] },
  postern:    { x: -254, z: 212, r: 3, name: 'The Postern' },
  spanWest:   { x: -257, z: 215, r: 12, name: 'the Great Span, west gate', block: [-270, -195, 180, 245] },
  spanEast:   { x: 257, z: 215, r: 12, name: 'the Great Span, east gate', block: [220, 270, 160, 245] },
  fallLip:    { x: 214, z: 266, r: 15, name: 'the Tumbling Water, the taller lip', block: [195, 235, 248, 290] },
  lightMoss:  { x: -205, z: 140, r: 8, name: 'moss light' },
  lightEmbers:{ x: 160, z: 60, r: 6, name: 'embers' },
  lightPost:  { x: -140, z: -30, r: 3, name: 'a lamp on a post' },
  lightDoor:  { x: -250, z: -120, r: 4, name: 'a lit doorway' },
  leerie:     { x: 128, z: 5, r: 3, name: "The Leerie's Standards", from: [110, -25], to: [145, 35] },
  keptFire:   { x: 10, z: -190, r: 6, name: 'The Kept Fire' },
  collation:  { x: 150, z: -70, r: 10, name: 'The Collation' },
  slipper:    { x: -20, z: 26, r: 1, name: 'The Slipper' },
  prospect:   { x: 238, z: -30, r: 4, name: 'The Unfinished Prospect' },
  tallestTor: { x: 268, z: -80, r: 8, name: "the High Ling's tallest tor" },
  // v7, the living (placement plan section 5): routes.js AVOID holds the same numbers; change neither without the other
  taker:      { x: -255, z: 10, r: 4, name: 'The Taker of Altitudes' }, // facing the sun
  coheirs:    { x: -45, z: 160, r: 6, name: 'The Coheirs' },
  sleeper:    { x: 180, z: -40, r: 6, name: 'The Sleeper' },
  thurifer:   { x: -108, z: -128, r: 0, from: [-108, -128], to: [-170, -50], lead: 'P3', name: 'The Thurifer' },
  bather:     { x: 158, z: 228, r: 10, rim: [165, 215], rimR: 4, name: 'The Bather' },
  sexton:     { x: 55, z: 272, r: 18, block: [40, 70, 264, 284], name: 'The Sexton' },
  stylite:    { x: 268, z: -80, r: 8, on: 'tallestTor', name: 'The Stylite' },
  accrescent: { x: 60, z: -180, r: 3, trailFrom: [40, -265], corridor: 3, name: 'The Accrescent' },
  repetend:   { x: -170, z: -97, r: 0, name: 'The Repetend' }, // the Lynchets' east wall-tops
  scriveners: { x: -100, z: 58, r: 8, name: 'The Scriveners' },
  simulacrum: { x: 20, z: -205, r: 5, name: 'The Simulacrum' },
  moles:      { x: 104, z: -23, r: 9, name: 'The Moles' }, // v15: in the Pennyworth's garden and the bare earth beside it (the Lappet's steps stand where their lawn was)
  toadstone:  { x: 180, z: 230, r: 2, name: 'The Toadstone' },
  linkBoy:    { x: -165, z: -105, r: 2, leads: 'P1-P17', name: 'The Link-Boy' },
  reach:      { x: 171, z: 235, r: 0, from: [208, 258], to: [134, 211], name: 'The Luminous Reach' },
  glyphs:     { x: 226, z: -112, r: 0, at: [[75, 0], [-80, null], [75, -200]], name: 'The Glyphs' }, // the Hypogeum's door, a tessera, the peg caps on x = -80, the erratic
};

// The causeway's v4 route (placement plan section 4): from between the colossi's feet in the saddle, north
// through the Adust past the Armiger's Tower, the old road to the keep's gate, round the keep and east past the
// Pit to the foot of the Great Span's east stair (v15-F1, the owner's #59: it had ended at the Pit's lip, beside the
// stair's landing, and read as an error; the trod P54 from its last bend is what goes to the landing now).
export const CAUSEWAY_V4 = [
  { x: -344, z: 126 }, { x: -302, z: 106 }, { x: -286, z: 60 }, { x: -272, z: 0 }, { x: -262, z: -60 }, { x: -254, z: -108 },
  { x: -222, z: -110 }, { x: -185, z: -72 }, { x: -140, z: -30 }, { x: -90, z: 2 }, { x: -40, z: 22 }, { x: 8, z: 30 },
  { x: 0, z: 5 }, { x: 12, z: -18 }, { x: 45, z: -22 }, { x: 80, z: -8 }, { x: 98, z: 25 }, { x: 122, z: 55 },
  { x: 148, z: 95 }, { x: 172, z: 135 }, { x: 190, z: 160 }, { x: 205, z: 160.5 }, { x: 217, z: 160 }, { x: 225, z: 161.8 },
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

export const SPAWN = { x: 2, z: 35, yaw: Math.PI / 2 + 0.15 }; // yaw: 0 looks down -z; PI/2 looks down -x (west)

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
