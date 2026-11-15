// What is left of the Span across its three fallen bays (v12 H1): a thin way over each, 1.2 m wide, with nothing
// either side. Pure data and functions (no THREE) so the deck's kerbs, the build, ctx.span and the tests share them.
//   west bay (pier -120 to -70, 36 m clear): the north side's footing course, still standing on its arch rib
//   fen bay  (pier 25 to 70, 31 m clear): the south side's cornice and kerb stones, hanging on iron
//   river bay (pier 115 to 176, 47 m clear): not stone; a strut of the Lattice come down out of the sky, slung across
// Each runs from a deck end to the next deck end at the deck's own height, sags between, and jogs sideways once.
// The walkable is the top as drawn: hw is the drawn half-width (the stones' 1.5 m, the strut's chords' outer faces).
// A fourth way crosses the crack at x -45: a length of the south parapet's coping, fallen across it and broken in two.
import { SPAN } from './plan.js';
import { smoothstep } from '../../noise.js';

const Y = SPAN.deckY;
const D = SPAN.decks; // [-257,-113], [-77,32], [63,122], [169,257]

const make = (name, a, b, o) => {
  const L = b - a;
  const t = (x) => (x - a) / L;
  return {
    name, a, b, L, hw: o.hw,                       // the clear gap a..b between two deck ends; hw: half the walkable width
    x0: a - 0.6, x1: b + 0.6,                      // the way overlaps each deck end by a stride
    zc: (x) => o.z0 + (o.z1 - o.z0) * smoothstep(o.j0, o.j1, t(x)),
    y: (x) => { const u = Math.min(1, Math.max(0, t(x))); return Y - o.sag(u) - (o.dip ? o.dip(x) : 0); },
  };
};
// the fen way's slabs: their centres and length (the build lays them; the walkable follows the one whose strap let go)
export const FEN_GAP = 0.24;
export function fenSlabs() {
  const x0 = D[1][1] - 0.6, x1 = D[2][0] + 0.6, pitch = 2.7 + FEN_GAP;
  const n = Math.round((x1 - x0 + FEN_GAP) / pitch), len = (x1 - x0 + FEN_GAP) / n - FEN_GAP;
  return { n, len, xc: (i) => x0 + len / 2 + i * (len + FEN_GAP) };
}
export const FEN_LET_GO = { i: 4, drop: 0.12 }; // its east strap gave: the slab hangs 0.12 m down at that end
let DIP = null; // [a, b, len], worked out once
function fenDip(x) {
  if (!DIP) { const f = fenSlabs(), c = f.xc(FEN_LET_GO.i); DIP = [c - f.len / 2, c + f.len / 2 + FEN_GAP, f.len]; }
  if (x <= DIP[0] || x >= DIP[1]) return 0;
  return FEN_LET_GO.drop * Math.min(1, (x - DIP[0]) / DIP[2]);
}
export const VESTIGES = [
  // north side, 210.4 jogging to 211.6 about the crown: the footing course on its rib
  make('west', D[0][1], D[1][0], { hw: 0.75, z0: 210.4, z1: 211.6, j0: 0.2, j1: 0.8, sag: (u) => 0.9 * Math.sin(Math.PI * u) }),
  // south side, 220.3 stepping out to 218.8 at the middle: the stones hang from the piers in two arms and meet crooked
  make('fen', D[1][1], D[2][0], { hw: 0.75, dip: (x) => fenDip(x), z0: 220.3, z1: 218.8, j0: 0.2, j1: 0.8, sag: (u) => 1.3 * Math.sin(Math.PI * Math.pow(u, 0.8)) }),
  // north to south across the canyon, 5 m over its 47: a bowed strut, 3.2 m down at the middle
  make('river', D[2][1], D[3][0], { hw: 0.7, z0: 212.6, z1: 217.6, j0: 0, j1: 1, sag: (u) => 3.2 * 4 * u * (1 - u) }),
];

// the crack at x -45 (3.6 m): a coping stone 6.6 m long and 1.3 wide, from the south parapet, lying across it 4 m in from
// the parapet, yawed a little; broken at the middle, the two halves sag 0.22 m into the crack. Its ends lie in the lips'
// broken stone at the deck's own height.
export const CRACK_WAY = (() => {
  const cx = SPAN.crack.x, a = cx - SPAN.crack.w / 2, b = cx + SPAN.crack.w / 2, L = 6.6, yaw = 0.1, z0 = 218.9;
  return {
    name: 'crack', a, b, L, hw: 0.65, x0: cx - L / 2, x1: cx + L / 2, yaw,
    zc: (x) => z0 + (x - cx) * Math.tan(yaw),
    y: (x) => Y - 0.22 * Math.max(0, 1 - Math.abs(x - cx) / (L / 2)),
  };
})();
export const WAYS = [...VESTIGES, CRACK_WAY];

// the height of the vestige under (x, z), or null
export function vestigeAt(x, z) {
  for (const v of WAYS) {
    if (x < v.x0 || x > v.x1) continue;
    if (Math.abs(z - v.zc(x)) <= v.hw) return v.y(x);
  }
  return null;
}
// where the deck's kerbs open: the run end at x, the z the way leaves at, and the half-gap to leave clear
export const KERB_OPENINGS = (() => {
  const out = [];
  for (const v of WAYS) { out.push({ x: v.a, z: v.zc(v.a) }); out.push({ x: v.b, z: v.zc(v.b) }); }
  return out;
})();
export const OPENING_HALF = 1.35;
