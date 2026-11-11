// CF the Sexton of No One's plan (v7, living-workers), in his marked block (SITES.sexton.block, x 40-70, z 264-284):
// sixty grave slots in six rows of ten, rows along x, numbered in the order he digs them (row by row from the
// north, each row the other way from the last, so the next slot is always a few metres on), and the clearances
// rocks.js and vegetation/ground.js read after their draws. The heightfield is not changed: every placement stream
// that reads the ground before it draws would shift across the whole map (plans/wilderness-v5.md, BD). The graves are cut
// by src/v7/workers/sexton.js, which takes the terrain's triangles over the block out and lays its own ground there.
// A boulder rocks.js has placed on a slot keeps its place: rocks.js passes each boulder's size, and the slot under it
// is never opened. ?workers=0 or ?sexton=0 makes every export here a no-op.
import { SITES } from '../../world.js';

const Q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams('');
export const SEXTON_OFF = Q.get('workers') === '0' || Q.get('sexton') === '0';
const S = SITES.sexton, B = S.block;
export const GRAVE = { len: 2.0, wid: 0.8, depth: 1.8, heapH: 0.35, heapW: 0.9, heapGap: 0.12, rows: 6, cols: 10, px: 2.9, pz: 3.3, open: 40 };
// centred in the block: the margins are about 1.0 m at the rows' ends and 1.35 m north and south
const X0 = (B[0] + B[1]) / 2 - ((GRAVE.cols - 1) * GRAVE.px) / 2, Z0 = (B[2] + B[3]) / 2 - ((GRAVE.rows - 1) * GRAVE.pz) / 2;
export const SLOTS = [];
for (let r = 0; r < GRAVE.rows; r++) for (let k = 0; k < GRAVE.cols; k++) {
  const c = r % 2 ? GRAVE.cols - 1 - k : k; // even rows run east (+x), odd rows west
  SLOTS.push({ n: SLOTS.length, row: r, col: c, x: X0 + c * GRAVE.px, z: Z0 + r * GRAVE.pz, dir: r % 2 ? -1 : 1, blocked: false });
}
// the heap lies on each grave's north side (-z): its centre
export const heapZ = (s) => s.z - GRAVE.wid / 2 - GRAVE.heapGap - GRAVE.heapW / 2;
// the slot's footprint (the cut and its heap), padded
function inSlot(s, x, z, pad) {
  const hx = GRAVE.len / 2 + pad;
  if (x < s.x - hx || x > s.x + hx) return false;
  return z > heapZ(s) - GRAVE.heapW / 2 - pad && z < s.z + GRAVE.wid / 2 + pad;
}
function slotAt(x, z, pad) {
  if (x < B[0] - 3 || x > B[1] + 3 || z < B[2] - 3 || z > B[3] + 3) return null;
  for (const s of SLOTS) if (inSlot(s, x, z, pad)) return s;
  return null;
}
// Cleared after the draws. rocks.js: sextonClear(x, z, boulderSize) for each rock (a boulder on a slot blocks the slot
// and stays; pebbles and stones on a slot go); vegetation/ground.js: sextonClear(x, z, 0, 1) for each 2 m cover
// cell (padded by the cell's half, so no tuft stands over a cut). Every slot that may ever be opened is cleared from
// the start, since the cover is packed once and a grave opens each gutter.
export function sextonClear(x, z, boulder = 0, pad = 0.25) {
  if (SEXTON_OFF) return false;
  if (boulder > 0) {
    const r = boulder * 0.55; // the boulder's footprint (rocks.js sinks it 0.18 of its size)
    const s = slotAt(x, z, r);
    if (s) s.blocked = true;
    return false;
  }
  const s = slotAt(x, z, pad);
  return !!s && !s.blocked;
}
// the slots he will dig, in order (the blocked left out), and the first that is still turf at load
export function digOrder() { return SLOTS.filter((s) => !s.blocked); }
