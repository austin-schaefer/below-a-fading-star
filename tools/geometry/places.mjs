// The places the geometry check (tools/geometry-test.mjs) and the route walk (tools/route-frames.mjs) know: every
// walkable place a visitor stands on or inside. A brief that builds one adds a line here (or, for the village, in
// src/v15/plan.js's GEOMETRY_PLACES, read by both tools when it exists).
//
// A place is { name, half, sealed?, exempt?, then one of:
//   ascent: 'id'         the route is that registered ascent's path (ctx.ascents, src/v12/heights.js)
//   span: 'west'|'east'  the Great Span's stair of that side, foot to deck (ctx.span.stairs)
//   pts: [[x, z, y?], ...] a route written out (y: the feet's height there, as an ascent's)
//   route: 'a.b.c'       a route the page holds, by its path from the context (ctx.a.b.c: [[x, z, y?], ...]), for a
//                        place whose own module knows where it stands
//   c: [x, z], r          a disc on the ground, stood on every `step` metres (default 2)
// }
// `half`: how far either side of the route (m) the faces are taken. `sealed: [s0, s1]`: metres along the route between
// which the place is roofed and walled (a ray from there that meets nothing is a hole to the sky); a negative s1 counts
// back from the route's end. `exempt`: extra { pattern: reason } for this place alone (the tool's own list is general).
export const PLACES = [
  { name: 'v14-descent', ascent: 'coffin-road', half: 9 }, // the Nave's hung stair down from the shears and the road over the water
  { name: 'v14-passage', ascent: 'wellward-way', half: 16, sealed: [6, -10] }, // the Wellward Way, the Nave's door to the Pit's floor
  { name: 'v14-pit-floor', pts: [[187.6, 187.2, -30.2], [196, 184], [203.6, 175.2, -31.4], [208.9, 160.2, -31.1]], half: 9 }, // the passage's mouth on the Pit's floor (#60)
  { name: 'v14-pit-stair', ascent: 'pit-stair', half: 8 }, // the Pit's wall stair and its landings, floor to lip
  { name: 'v12-stair', ascent: 'stair', half: 6 }, // the Diffident Stair up the wall, its landings and top
  { name: 'v12-lift-lower', pts: [[-280, -19], [-288, -18.6], [-296, -18.2]], half: 12 }, // the path in to the lift's lower station: plinth, bell arch, the cage at rest
  { name: 'v12-lift-gallery', ascent: 'lift-gallery', half: 6 }, // the gallery from the upper station along the face
  { name: 'v12-icefall', ascent: 'icefall', half: 6 }, // the way up the icefall, its bridge over the crevasse
  { name: 'span-west-stairs', span: 'west', half: 7 }, // the Cyclopean Stairs, the Span's west end
  { name: 'span-east-stairs', span: 'east', half: 7 }, // and its east end, over the Pit's side
  { name: 'house', c: [95, -45], r: 17 }, // the Pomegranate House: court, galleries, gate
  { name: 'v17-garth', pts: [[-30.79, 317.84, -24], [-27.65, 318.47, -24], [-19.81, 320.04, -24], [-14.12, 321.18, -24], [-13.22, 319.30, -24], [-11.53, 318.09, -24], [-9.47, 317.83, -24], [-7.54, 318.60, -24], [-6.21, 320.20, -24], [-5.81, 322.23, -24], [-5.88, 322.82, -24], [-0.19, 323.96, -24], [8.04, 325.61, -24], [5.21, 332.35, -24], [-0.02, 337.46, -24], [-6.83, 340.12, -24], [-14.13, 339.93, -24], [-20.79, 336.90, -24], [-25.74, 331.53, -24], [-28.21, 324.64, -24]], half: 25, sealed: [1.5, -0.5] }, // v17-U2 the Meridian Garth: in by the west door, round the light, out the far side and along the walk (clear of the trees' frames)
  { name: 'v18-florilegium', pts: [[-257.70, 126.00], [-258.68, 129.65], [-261.35, 132.32], [-265.00, 133.30], [-268.65, 132.32], [-271.32, 129.65], [-272.30, 126.00], [-271.32, 122.35], [-268.65, 119.68], [-265.00, 118.70], [-261.35, 119.68], [-258.68, 122.35], [-257.70, 126.00]], half: 7 }, // v18-F2 the Florilegium: the path worn round the glass, door to door
  { name: 'strake', route: 'village.row.route', half: 9 }, // v15-V1 the Strake: its flags walked end to end, the five fronts (src/v15/row.js gives the route, wherever the plan puts the row)
  { name: 'v17-leat-bridge', ascent: 'leat-bridge', half: 8 }, // v17-W2 the leat's slab bridge: from the meeting of P14 and P38 over the deck, the weirs above and below it in view
  { name: 'v17-swallow', ascent: 'swallow', half: 14, sealed: [42, -8] }, // v17-U1 the Swallow: the quay, the tube's lip, down the head under the pool and the drowned conduit to the Garth's door (sealed from the head's turn to 8 m short of the end: from the last 8 m the rays run on through the door into U2's hall past this place's 14 m: v17-garth judges the hall)
  { name: 'v17-sphere', pts: [[312.00, 108.00],[311.75, 111.13],[311.02, 114.18],[309.82, 117.08],[308.18, 119.76],[306.14, 122.14],[303.76, 124.18],[301.08, 125.82],[298.18, 127.02],[295.13, 127.75],[292.00, 128.00],[288.87, 127.75],[285.82, 127.02],[282.92, 125.82],[280.24, 124.18],[277.86, 122.14],[275.82, 119.76],[274.18, 117.08],[272.98, 114.18],[272.25, 111.13],[272.00, 108.00],[272.25, 104.87],[272.98, 101.82],[274.18, 98.92],[275.82, 96.24],[277.86, 93.86],[280.24, 91.82],[282.92, 90.18],[285.82, 88.98],[288.87, 88.25],[292.00, 88.00],[295.13, 88.25],[298.18, 88.98],[301.08, 90.18],[303.76, 91.82],[306.14, 93.86],[308.18, 96.24],[309.82, 98.92],[311.02, 101.82],[311.75, 104.87],[312.00, 108.00],[308.50, 108.00],[308.30, 110.58],[307.69, 113.10],[306.70, 115.49],[305.35, 117.70],[303.67, 119.67],[301.70, 121.35],[299.49, 122.70],[297.10, 123.69],[294.58, 124.30],[292.00, 124.50],[289.42, 124.30],[286.90, 123.69],[284.51, 122.70],[282.30, 121.35],[280.33, 119.67],[278.65, 117.70],[277.30, 115.49],[276.31, 113.10],[275.70, 110.58],[275.50, 108.00],[275.70, 105.42],[276.31, 102.90],[277.30, 100.51],[278.65, 98.30],[280.33, 96.33],[282.30, 94.65],[284.51, 93.30],[286.90, 92.31],[289.42, 91.70],[292.00, 91.50],[294.58, 91.70],[297.10, 92.31],[299.49, 93.30],[301.70, 94.65],[303.67, 96.33],[305.35, 98.30],[306.70, 100.51],[307.69, 102.90],[308.30, 105.42],[308.50, 108.00]], half: 8 }, // v17-S1 the sphere (moved to the east wall's foot, issue-1722): round it at 20 m from its centre, then round its glass at 16.5 m (the walls hold a walker 0.5 m off it), over the hill behind it
  { name: 'v18-beds', ascent: 'beds', half: 10, sealed: [11.5, -0.5], exempt: { 'beds-roots': 'roots: they hang from the tubs and run along the roofs, alive, into the lids', 'beds-light': 'the grate\'s light made visible, not a solid', 'beds-glow': 'the foxfire\'s caps and the panes over the grate: light, not solids' }, anchor: { 'beds-ground': 'the ground at the door, cut clean round the forecourt (src/v18/beds/ground.js)' } }, // v18-F3 the Lower Beds: the forecourt, the door, the stair, the vault's aisle between the tombs, the way under the wood, the chamber under the glasshouse (sealed from the landing on: up the stair the door is open to the wood)
];
