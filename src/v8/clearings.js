// v8-11: the one table of ground kept clear of anything bigger than a pebble (rocks.js reads it after its draws, so no
// placement stream moves; tools/rocks-test.mjs checks every stone and boulder against it). Built places, the walked
// lines of the walkers, the grazers' homes; every road (the leads, with the kerb K1) and the causeway by the stone's
// whole footprint, at every tier. A rock's footprint is a disc of radius r round its centre; it is cleared when that
// disc reaches into an entry.
//   disc   { x, z, r }                   a round place
//   box    { x0, x1, z0, z1 }            an axis-aligned block (the Sexton's field)
//   strip  { a: [x, z], b: [x, z], half } a straight band, `half` metres either side of a-b
//   region { key, w }                     wherever ctx.regions gives that region more than w at the rock's centre
//   figure { pad }                        the Long Figure's cut chalk, pad metres round it (v9, #16; needs ctx.terrain)
// The leads: every non-rivulet lead's tread plus LEAD_PAD (the Thurifer's P3 more: his train drags behind him).
// The causeway: CAUSEWAY_CLEAR metres from its centre line, plus the footprint.
// ?rockcut=0 (read by rocks.js) leaves rocks where v8-10 put them.
import { LANDMARKS as L, SITES } from '../world.js';
import { TAVERNA } from '../structures/taverna.js';
import { BARE } from './house/clear.js';
import { COLLATION } from '../v5/dressing/collation.js';
import { LEERIE } from '../v5/lights.js';
import { leads } from '../v4/paths/routes.js';
import { onFigure } from '../v4/dressing/figure.js';
import { WAYSTATION } from '../v9/waystation/site.js';

// the Leerie's row: the kerb K1 from SITES.leerie.from to .to; the standards stand LEERIE.side east of it and he walks
// 0.6 m on the kerb's side of their feet. The strip covers both lines with 2 m to spare, and 3 m past each end.
const LR = (() => {
  const [x0, z0] = SITES.leerie.from, [x1, z1] = SITES.leerie.to, len = Math.hypot(x1 - x0, z1 - z0);
  const ux = (x1 - x0) / len, uz = (z1 - z0) / len, nx = uz, nz = -ux, off = LEERIE.side - 0.3, ext = 3;
  return { a: [x0 + nx * off - ux * ext, z0 + nz * off - uz * ext], b: [x1 + nx * off + ux * ext, z1 + nz * off + uz * ext], half: 0.3 + 0.3 + 2 };
})();
const SX = SITES.sexton.block;

export const CLEARINGS = [
  { name: 'the Leaning Yard', kind: 'disc', x: L.graveyard.x, z: L.graveyard.z, r: L.graveyard.r + 3 },
  { name: "the Sexton's graves", kind: 'box', x0: SX[0] - 3, x1: SX[1] + 3, z0: SX[2] - 3, z1: SX[3] + 3 },
  { name: 'the Pomegranate House', kind: 'disc', x: TAVERNA.x, z: TAVERNA.z, r: TAVERNA.half * 1.42 + 2 },
  { name: "the Pomegranate House's gate", kind: 'disc', x: BARE.x, z: BARE.z, r: BARE.rx + 2 },
  { name: 'the Collation', kind: 'disc', x: COLLATION.x, z: COLLATION.z, r: COLLATION.length + 2 },
  { name: 'the shrine', kind: 'disc', x: L.shrine.x, z: L.shrine.z, r: L.shrine.r + 4 },
  { name: 'the court', kind: 'disc', x: L.court.x, z: L.court.z, r: L.court.r + 2 },
  { name: "the keep and its apron", kind: 'disc', x: L.castle.x, z: L.castle.z, r: 48 },
  { name: "the Leerie's row", kind: 'strip', a: LR.a, b: LR.b, half: LR.half },
  { name: "the Link-Boy's post", kind: 'disc', x: SITES.linkBoy.x, z: SITES.linkBoy.z, r: 5 },
  { name: "the grazers' home", kind: 'disc', x: 22, z: 78, r: 17 }, // fauna.js: home [22, 78], strays 2-13 m and ambles
  { name: "the orchard herd's home", kind: 'disc', x: 183, z: -76, r: 17 }, // fauna.js: home [183, -76]
  { name: 'the Demesne lawn', kind: 'region', key: 'demesne', w: 0.15 }, // the shaven lawn (v8-02), wherever the region reaches
  { name: 'the Lantern Halt', kind: 'disc', x: WAYSTATION.x, z: WAYSTATION.z, r: WAYSTATION.r }, // v9 (#934): the slab, its foot and the winch
  { name: 'the icefall', kind: 'box', x0: -40, x1: 130, z0: -520, z1: -289 }, // v12-H2: its seracs are its stones (src/v12/icefall.js)
  { name: 'the Long Figure', kind: 'figure', pad: 1 }, // v9 (#16): nothing lies on him; rocks.js also keeps pebbles off, with or without the cut
];
export const LEAD_PAD = 0.6, LEAD_PADS = { P3: 2.0 };
export const CAUSEWAY_CLEAR = 3.0; // the paving's ragged edge is 1.75-2.05 m from the line, its kerbs a little more

function segD(x, z, ax, az, bx, bz) {
  const ex = bx - ax, ez = bz - az, l2 = ex * ex + ez * ez || 1;
  const t = Math.max(0, Math.min(1, ((x - ax) * ex + (z - az) * ez) / l2));
  return Math.hypot(x - ax - ex * t, z - az - ez * t);
}
function inEntry(C, x, z, r, ctx) {
  if (C.kind === 'figure') return !!ctx?.terrain && onFigure(x, z, r + C.pad, ctx.terrain);
  if (C.kind === 'region') return !!ctx?.regions && ctx.regions.regionAt(x, z)[C.key] > C.w;
  if (C.kind === 'disc') return Math.hypot(x - C.x, z - C.z) < C.r + r;
  if (C.kind === 'box') return x > C.x0 - r && x < C.x1 + r && z > C.z0 - r && z < C.z1 + r;
  return segD(x, z, C.a[0], C.a[1], C.b[0], C.b[1]) < C.half + r;
}

// the leads' segments in an 8 m grid, each in every cell within REACH of it (so a footprint of up to MAX_R is found)
const CELL = 8, MAX_R = 8;
let GRID = null;
function grid() {
  if (GRID) return GRID;
  GRID = new Map();
  for (const Ld of leads().list) {
    if (Ld.kind === 'rivulet') continue;
    const pad = LEAD_PADS[Ld.id] ?? LEAD_PAD, reach = Ld.w + pad + MAX_R;
    for (const S of Ld.lines) for (let i = 0; i < S.length - 1; i++) {
      const a = S[i], b = S[i + 1], seg = { id: Ld.id, w: Ld.w + pad, ax: a.x, az: a.z, bx: b.x, bz: b.z };
      const gx0 = Math.floor((Math.min(a.x, b.x) - reach) / CELL), gx1 = Math.floor((Math.max(a.x, b.x) + reach) / CELL);
      const gz0 = Math.floor((Math.min(a.z, b.z) - reach) / CELL), gz1 = Math.floor((Math.max(a.z, b.z) + reach) / CELL);
      for (let gx = gx0; gx <= gx1; gx++) for (let gz = gz0; gz <= gz1; gz++) {
        const k = gx * 4096 + gz; let c = GRID.get(k); if (!c) GRID.set(k, (c = [])); c.push(seg);
      }
    }
  }
  return GRID;
}
// the lead whose padded tread a footprint of radius r at (x, z) reaches, or null
export function leadUnder(x, z, r = 0) {
  const c = grid().get(Math.floor(x / CELL) * 4096 + Math.floor(z / CELL));
  if (!c) return null;
  for (const s of c) if (segD(x, z, s.ax, s.az, s.bx, s.bz) < s.w + Math.min(r, MAX_R)) return s.id;
  return null;
}

// v9 (#16): whether a footprint of radius r at (x, z) lies on the Long Figure (its entry above), for every rock class
export const offFigure = (x, z, r, ctx) => inEntry(CLEARINGS.find((C) => C.kind === 'figure'), x, z, r, ctx);

// What keeps a footprint of radius r at (x, z) off the ground, or null. ctx: for its terrain (the causeway's distance)
// and regions (the Demesne); without it those two entries are skipped.
export function clearedBy(x, z, r, ctx) {
  for (const C of CLEARINGS) if (inEntry(C, x, z, r, ctx)) return C.name;
  const terrain = ctx?.terrain;
  const id = leadUnder(x, z, r);
  if (id) return `the lead ${id}`;
  if (terrain && terrain.causewayDistance(x, z) < CAUSEWAY_CLEAR + r) return 'the causeway';
  return null;
}
