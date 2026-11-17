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
  { name: 'strake', route: 'village.row.route', half: 9 }, // v15-V1 the Strake: its flags walked end to end, the five fronts (src/v15/row.js gives the route, wherever the plan puts the row)
];
