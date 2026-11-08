// BP The Saltings [Proposed] (wilderness-v5.md; shape and site in wilderness-v4-placement.md section 2, REGIONS.saltings
// in world.js). The region agent fills these hooks (contract in src/v4/regions.js); empty, the region is plain
// moor that only knows where it is.
export const height = null; // (h, x, z, w) -> h: the marked heightfield block
export const ground = null; // (col, x, z, w, biome): the terrain's vertex colour, in place
export const cover = null;  // what grows here, for vegetation
export const stone = null;  // the region's stone, for rocks
export const air = null;    // { tint: '#hex', strength }: the Tincture
export const sound = null;  // the region's sound, for audio

// The region's meshes, creatures and lights, built as the world module `region-saltings`.
export async function build(ctx) {}
