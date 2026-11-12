// The Lynchets' strips (v8-02): the old field, ploughed in long strips, each still showing a different crop's ghost.
// No imports, so a region module and the vegetation can both read it without a cycle.
// stripAt(x, z) -> 0 stubble (short, pale straw), 1 ley (rank green), 2 plough (bare furrowed earth), 3 fallow (thistle
// and seed-heads); stripEdge(x, z) -> 0 on a strip's edge (the balk between two strips) to 1 in its middle.
const A = 0.62, CA = Math.cos(A), SA = Math.sin(A), W = 7;
const CROPS = [0, 1, 2, 3, 1, 0, 2, 3, 0, 2, 1, 3];
const u = (x, z) => (x * CA + z * SA) / W + 0.37;
export function stripAt(x, z) { return CROPS[((Math.floor(u(x, z)) % CROPS.length) + CROPS.length) % CROPS.length]; }
export function stripEdge(x, z) { const f = u(x, z) % 1, g = f < 0 ? f + 1 : f; return Math.min(1, Math.min(g, 1 - g) * 8); }
