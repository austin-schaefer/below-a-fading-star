// The gallery a visitor walks (v12-H4): the run of the Galleries of Durance at 135 m, from the lift's landing north
// along the face for about 100 m to where it has fallen away. src/v5/galleries.js draws its posts, lintels, lattice
// screens, roof beams and brackets (ctx.galleries.geo.tiers, the entry with `walk`); this file lays what is walked and
// what is found: the deck of riveted iron plates over an open grating (a plate gone here and there, the drop seen through
// it), the front rail (broken in three bays, where the edge is open and the edge-guard holds), the cells built against
// the rock behind the deck, and the one cell that is not like the others (stories/until-the-sun-goes-out.md): its grille
// still locked, and through a bore a hand wide, dug low in its back wall with a spoon, the sun comes in, a thin red rod
// of light out of the door to a coin of light on the deck. At the far end the deck tears off in hanging plates.
//
// buildGallery(ctx, o) → { y, floor(x, z), keep(x, z), landing: { x, z, b, r }, path, cells, odd, end, update(dt, t), draws, tris }
// o: { geo (ctx.galleries.geo), stone (the structures' stone material), low }. Registers its own colliders (the posts, the
// mullions, the cells' walls) and the deck as a stacked floor with held edges (its back on the rock, its front where the
// rail stands); the corridor and the ascent are lift.js's.
import * as THREE from 'three';
import { Builder } from '../../structures/geo.js';
import { hyp } from '../../noise.js';
import { SUN } from '../../world.js';

const D2R = Math.PI / 180;
const C = {
  iron: new THREE.Color('#2e241c'), ironDark: new THREE.Color('#1e1712'), rust: new THREE.Color('#47291b'),
  stone: new THREE.Color('#3a2e25'), strap: new THREE.Color('#231a14'), lining: new THREE.Color('#15110e'), cloth: new THREE.Color('#4a1a1c'),
  spoil: new THREE.Color('#5a524a'), pewter: new THREE.Color('#7c7872'),
};
const REAR = 0.6;          // the deck stops this far short of the line the galleries call the face (`back`)
const CELL_D = 2.5;        // a cell's depth, wall to wall, from the rear of the deck
const CELL_W = 3.7;        // its width along the face
const WALL = 0.3;
const CELL_H = 2.5;
export const CELLS = [1, 4, 6, 7, 10, 11]; // the bays with a cell; the last is the odd one
const ODD = 11;
const BROKEN = { 5: [0, 1], 8: [0.5, 1], 9: [0, 1], 12: [0, 1] }; // bays where the rail is gone, as fractions of the bay
const RAGGED = 0.42;       // how far into the last walked bay the deck reaches before it tears off

export function buildGallery(ctx, o) {
  const { geo, low } = o;
  const stone = o.iron; // the deck and the cells: plain vertex-coloured iron, as the Galleries' own
  const t = geo.tiers.find((q) => q.walk);
  const { y, D, bs, back } = t;
  const nW = t.walk; // walked bays 0..nW-1 (the last is the ragged one)
  const P = (b, r, yy) => new THREE.Vector3(...geo.P(b, r, yy));
  const io = (b) => new THREE.Vector3(...geo.inward(b));
  const al = (b) => new THREE.Vector3(...geo.along(b));
  const bear = (x, z) => { let b = Math.atan2(x, -z) / D2R; if (b < 0) b += 360; return b; };
  const rng = ctx.makeRng(1205);
  const group = new THREE.Group(); group.name = 'lift-gallery';
  ctx.scene.add(group);

  // the deck's front and rear at bearing b (bays interpolated in bearing; an 8 m bay's arc is within 2 cm of its chord)
  const bayOf = (b) => { for (let k = 0; k < nW; k++) if (b <= bs[k + 1]) return k; return nW - 1; };
  const backAt = (k, f) => back[k] + (back[k + 1] - back[k]) * f;
  const EDGE = RAGGED + 0.1; // the walk ends where the last plates drawn end (a plate may be gone there, its grating left)
  const bEnd = bs[nW - 1] + (bs[nW] - bs[nW - 1]) * EDGE;

  // ---- the cells: a box of rubble stone against the rear of the deck in their bays, its door to the walkway
  const cells = [];
  for (const k of CELLS) {
    const f = 0.5, b = bs[k] + (bs[k + 1] - bs[k]) * f, rb = backAt(k, f) - REAR;
    const n = io(b), u = al(b), c = P(b, rb, y); // c: the middle of the cell's rear, on the deck
    const odd = k === ODD;
    cells.push({ k, b, n, u, c, odd, door: odd ? 0.8 : 0, doorW: 1.0, front: CELL_D, open: !odd });
  }
  // the point (x, z) in a cell's frame: lateral (along u, north +) and depth (out from its rear, along n)
  const cellAt = (x, z) => {
    for (const cl of cells) {
      const dx = x - cl.c.x, dz = z - cl.c.z, lat = dx * cl.u.x + dz * cl.u.z;
      if (lat < -CELL_W / 2 || lat > CELL_W / 2) continue;
      return cl;
    }
    return null;
  };

  // ---- the floor: a stacked floor; its held edges are the rear (the rock, the cells' rear walls), the south end, and
  // the front where the rail stands or a screen closes the bay; open where the rail is gone and at the ragged end
  const floor = (x, z) => {
    if (x > -330) return null;
    const b = bear(x, z);
    if (b < bs[0] - 0.01 || b > bEnd + 0.2) return null;
    const k = bayOf(b), f = (b - bs[k]) / (bs[k + 1] - bs[k]);
    const r = hyp(x, z), bk = backAt(k, f);
    if (r < bk - D - 0.15 || r > bk - REAR) return null;
    if (k === nW - 1 && f > EDGE) return null;
    const cl = cellAt(x, z);
    if (cl) { const dep = (x - cl.c.x) * cl.n.x + (z - cl.c.z) * cl.n.z; if (dep < 0.02) return null; } // the cell's rear wall, square to it
    return y;
  };
  const railGone = (k, f) => { const g = BROKEN[k]; return !!g && f >= g[0] && f <= g[1] && !t.screens.includes(k); };
  const keep = (x, z) => {
    const b = bear(x, z);
    if (b < bs[0]) return true;
    if (b > bEnd - 0.05) return false; // the ragged end: open
    const k = bayOf(b), f = (b - bs[k]) / (bs[k + 1] - bs[k]);
    const r = hyp(x, z), bk = backAt(k, f);
    if (r > bk - D - 0.15) return true; // the rear, or a cell's wall
    return !railGone(k, f);
  };

  // ---- the deck: riveted plates over a grating, two runners under it, joists at the posts
  const B = new Builder(ctx.noise);
  const hexa = (corners, col, o2 = {}) => {
    // a box whose 8 corners are given: [x0z0 bottom, ...] as a function (sx, sy, sz in {-1, 1}) -> Vector3
    const g = new THREE.BoxGeometry(1, 1, 1);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) { const v = corners(Math.sign(pos.getX(i)), Math.sign(pos.getY(i)), Math.sign(pos.getZ(i))); pos.setXYZ(i, v.x, v.y, v.z); }
    B.add(g, null, { color: col, moss: 0, iron: 0.35, ground: y - 3, ...o2 });
  };
  // a point on the deck: bay k, fraction f along it, d metres out from the rear (toward the front), height h over the deck
  const at = (k, f, d, h = 0) => { const b = bs[k] + (bs[k + 1] - bs[k]) * f; return P(b, backAt(k, f) - REAR - d, y + h); };
  const depth = (k, f) => D - REAR + 0.15; // rear to front lip
  const gratingQuads = [];
  const plateRows = 3;
  for (let k = 0; k < nW; k++) {
    const len = at(k, 0, 0).distanceTo(at(k, 1, 0));
    const nA = Math.max(4, Math.round(len / 1.15));
    for (let i = 0; i < nA; i++) for (let j = 0; j < plateRows; j++) {
      let f0 = i / nA, f1 = (i + 1) / nA;
      if (k === nW - 1) { if (f0 > RAGGED + 0.08) continue; f1 = Math.min(f1, RAGGED + 0.1); }
      const missing = rng() < (k === nW - 1 ? 0.3 : 0.1) && !(k === 0 && i < 2);
      const d0 = (j / plateRows), d1 = ((j + 1) / plateRows);
      const corner = (sx, sy, sz) => {
        const f = sx < 0 ? f0 + 0.004 : f1 - 0.004, dd = (sz < 0 ? d0 : d1) * depth(k, f) + (sz < 0 ? 0.015 : -0.015);
        return at(k, f, dd, sy < 0 ? -0.07 : (rng() - 0.5) * 0.012);
      };
      if (missing) { gratingQuads.push([at(k, f0, d0 * depth(k, f0), -0.09), at(k, f1, d0 * depth(k, f1), -0.09), at(k, f1, d1 * depth(k, f1), -0.09), at(k, f0, d1 * depth(k, f0), -0.09)]); continue; }
      const tone = rng();
      hexa(corner, tone < 0.3 ? C.rust : tone < 0.8 ? C.iron : C.ironDark);
    }
    // the runners under the front and the rear, a joist at each post
    for (const dd of [0.2, depth(k, 0.5) - 0.25]) {
      const f1 = k === nW - 1 ? RAGGED - 0.05 : 1;
      hexa((sx, sy, sz) => at(k, sx < 0 ? 0 : f1, dd + sz * 0.11, -0.1 + sy * 0.16 - 0.16), C.ironDark);
    }
    hexa((sx, sy, sz) => { const p = at(k, 0, sz < 0 ? -0.2 : depth(k, 0) + 0.1, -0.12 + sy * 0.13 - 0.13); return p.addScaledVector(al(bs[k]), sx * 0.09); }, C.ironDark);
  }
  // the ragged end: three plates hanging off it by a corner, a runner bent down into the air
  {
    const k = nW - 1;
    for (let j = 0; j < 3; j++) {
      const f = RAGGED + 0.04 + 0.02 * j, dd = (j + 0.5) / 3 * depth(k, f);
      const hinge = at(k, f, dd, -0.02), u = al(bs[k]), n = io(bs[k]);
      const drop = 0.9 + j * 0.25, tilt = 0.5 + j * 0.3;
      hexa((sx, sy, sz) => hinge.clone().addScaledVector(u, (sx + 1) * 0.5 * Math.cos(tilt) * 1.05).add(new THREE.Vector3(0, -(sx + 1) * 0.5 * Math.sin(tilt) * drop * 1.2 + sy * 0.03, 0)).addScaledVector(n, sz * 0.8), C.rust);
    }
    const p0 = at(k, RAGGED - 0.05, 0.2, -0.26), dirB = al(bs[k]).multiplyScalar(2.6).add(new THREE.Vector3(0, -1.9, 0)).addScaledVector(io(bs[k]), 0.6);
    hexa((sx, sy, sz) => p0.clone().addScaledVector(dirB, (sx + 1) / 2).add(new THREE.Vector3(0, sy * 0.13, 0)).addScaledVector(io(bs[k]), sz * 0.1), C.ironDark);
  }

  // ---- the rail: balusters every 0.55 m along the front lip, a top rail at 1.05 m and a mid rail; gone in the broken
  // bays (a bent stub at each end of a gap), and left open at the landing where the gangway comes in
  const landB = geo.lift.b;
  const landK = bayOf(landB), landF = (landB - bs[landK]) / (bs[landK + 1] - bs[landK]);
  const landLen = at(landK, 0, 0).distanceTo(at(landK, 1, 0));
  const railPts = [];
  for (let k = 0; k < nW; k++) {
    const len = at(k, 0, 0).distanceTo(at(k, 1, 0));
    const n = Math.round(len / 0.55);
    let run = null;
    const flush = () => { if (run && run.length > 1) railPts.push(run); run = null; };
    for (let i = 0; i <= n; i++) {
      const f = i / n;
      const gone = railGone(k, f) || (k === landK && Math.abs(f - landF) * landLen < 1.05) || (k === nW - 1 && f > 0.02);
      if (gone) { flush(); continue; }
      const p = at(k, f, depth(k, f) - 0.12);
      (run ||= []).push(p);
      if (!t.posts.includes(k) || (i > 0 && i < n)) hexa((sx, sy, sz) => p.clone().addScaledVector(al(bs[k]), sx * 0.025).add(new THREE.Vector3(0, (sy + 1) * 0.5 * 1.05, 0)).addScaledVector(io(bs[k]), sz * 0.025), C.ironDark);
    }
    flush();
  }
  for (const run of railPts) for (let i = 0; i + 1 < run.length; i++) for (const h of [1.05, 0.55]) {
    const a = run[i], b = run[i + 1];
    const u = b.clone().sub(a);
    const side = new THREE.Vector3(-u.z, 0, u.x).normalize();
    const th = h > 1 ? 0.05 : 0.03;
    hexa((sx, sy, sz) => (sx < 0 ? a : b).clone().add(new THREE.Vector3(0, h + sy * th, 0)).addScaledVector(side, sz * th), h > 1 ? C.rust : C.ironDark);
  }
  // the bent stubs at the gaps' ends: the rail torn and bowed outward and down
  for (const run of railPts) for (const [p, q] of [[run[0], run[1]], [run[run.length - 1], run[run.length - 2]]]) {
    if (!p || !q) continue;
    const dir = p.clone().sub(q).normalize(), out = new THREE.Vector3(dir.z, 0, -dir.x);
    const tip = p.clone().addScaledVector(dir, 0.5).addScaledVector(out, 0.25).add(new THREE.Vector3(0, 0.75, 0));
    const base = p.clone().add(new THREE.Vector3(0, 1.05, 0));
    hexa((sx, sy, sz) => (sx < 0 ? base : tip).clone().add(new THREE.Vector3(0, sy * 0.05, 0)).addScaledVector(out, sz * 0.05), C.rust);
  }
  const deckIron = new THREE.Mesh(B.build(), stone);
  deckIron.name = 'lift-gallery-deck'; deckIron.castShadow = true; deckIron.receiveShadow = true;
  group.add(deckIron);

  // the grating under the gone plates: one alpha-tested draw of iron bars
  const gcv = document.createElement('canvas'); gcv.width = gcv.height = 64;
  { const g = gcv.getContext('2d'); g.clearRect(0, 0, 64, 64); g.fillStyle = '#2a2018'; for (let i = 0; i < 64; i += 16) { g.fillRect(i, 0, 4, 64); } g.fillRect(0, 0, 64, 3); g.fillRect(0, 32, 64, 3); }
  const gtex = new THREE.CanvasTexture(gcv); gtex.wrapS = gtex.wrapT = THREE.RepeatWrapping; gtex.colorSpace = THREE.SRGBColorSpace;
  const gpos = [], guv = [], gidx = [];
  for (const q of gratingQuads) {
    const base = gpos.length / 3;
    const w = q[0].distanceTo(q[1]) * 3.2, h = q[1].distanceTo(q[2]) * 3.2;
    q.forEach((v, i) => { gpos.push(v.x, v.y, v.z); guv.push(i === 1 || i === 2 ? w : 0, i >= 2 ? h : 0); });
    gidx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const gg = new THREE.BufferGeometry();
  gg.setAttribute('position', new THREE.Float32BufferAttribute(gpos, 3)); gg.setAttribute('uv', new THREE.Float32BufferAttribute(guv, 2)); gg.setIndex(gidx); gg.computeVertexNormals();
  const grating = new THREE.Mesh(gg, new THREE.MeshStandardMaterial({ map: gtex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.7, metalness: 0.5, color: '#8a7a6a' }));
  grating.name = 'lift-gallery-grating'; grating.castShadow = true;
  group.add(grating);

  // ---- the cells
  const Bc = new Builder(ctx.noise);
  const cellBox = (cl, lat0, lat1, d0, d1, h0, h1, col, o2 = {}) => {
    const g = new THREE.BoxGeometry(1, 1, 1), pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const sx = Math.sign(pos.getX(i)), sy = Math.sign(pos.getY(i)), sz = Math.sign(pos.getZ(i));
      const v = cl.c.clone().addScaledVector(cl.u, sx < 0 ? lat0 : lat1).addScaledVector(cl.n, sz < 0 ? d0 : d1); v.y += sy < 0 ? h0 : h1;
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    Bc.add(g, null, { color: col, moss: 0, iron: 0.4, course: 0, ground: y - 4, ...o2 });
  };
  const ironBox = (cl, lat0, lat1, d0, d1, h0, h1) => cellBox(cl, lat0, lat1, d0, d1, h0, h1, C.ironDark, { iron: 0.5, course: 0, moss: 0 });
  // the odd cell's bore, worked out first: its rear wall is built round the hole
  const odd = cells.find((cl) => cl.odd);
  const L = new THREE.Vector3(-SUN.dir.x, -SUN.dir.y, -SUN.dir.z); // the light's way: from the sun, east, down and north
  const Ln = L.x * odd.n.x + L.z * odd.n.z, Lu = L.x * odd.u.x + L.z * odd.u.z;
  const BORE_H = 1.35, tFront = (CELL_D - WALL / 2) / Ln;
  const boreLat = odd.door - Lu * tFront; // so the rod goes out through the middle of the door
  const bore = odd.c.clone().addScaledVector(odd.u, boreLat).add(new THREE.Vector3(0, BORE_H, 0));
  const tLand = BORE_H / -L.y;
  const coin = bore.clone().addScaledVector(L, tLand); coin.y = y + 0.075;
  const W2 = CELL_W / 2, FD = CELL_D; // FD: the front wall's outer face, out from the rear
  for (const cl of cells) {
    const dl = cl.door - cl.doorW / 2, dr = cl.door + cl.doorW / 2;
    // walls: the rear (into the rock), two sides, the front either side of the door, the lintel over it, the roof
    const R = 0.11; // the hole: a hand wide
    const around = (l0, l1, d0, d1, h0, h1, col, o2) => {
      if (!cl.odd) { cellBox(cl, l0, l1, d0, d1, h0, h1, col, o2); return; }
      const bl = boreLat, bh = BORE_H;
      cellBox(cl, l0, bl - R, d0, d1, h0, h1, col, o2); cellBox(cl, bl + R, l1, d0, d1, h0, h1, col, o2);
      cellBox(cl, bl - R, bl + R, d0, d1, h0, bh - R, col, o2); cellBox(cl, bl - R, bl + R, d0, d1, bh + R, h1, col, o2);
    };
    around(-W2, W2, -0.5, 0.0, 0, CELL_H + 0.25, C.stone);
    for (const s of [-1, 1]) cellBox(cl, s < 0 ? -W2 : W2 - WALL, s < 0 ? -W2 + WALL : W2, -0.5, FD, 0, CELL_H, C.stone);
    cellBox(cl, -W2, dl, FD - WALL, FD, 0, CELL_H, C.stone);
    cellBox(cl, dr, W2, FD - WALL, FD, 0, CELL_H, C.stone);
    cellBox(cl, dl, dr, FD - WALL, FD, 2.05, CELL_H, C.stone);
    cellBox(cl, -W2 - 0.1, W2 + 0.1, -0.5, FD + 0.15, CELL_H, CELL_H + 0.28, C.stone);
    // the plates' straps and rivet-rows: an iron rib up the front at each plate's seam, a band round the top
    for (const lat of [-W2 + 0.02, -W2 / 2, W2 / 2, W2 - 0.02]) if (lat < dl - 0.1 || lat > dr + 0.1) cellBox(cl, lat - 0.05, lat + 0.05, FD, FD + 0.05, 0, CELL_H, C.strap, { iron: 1 });
    cellBox(cl, -W2, W2, FD, FD + 0.06, CELL_H - 0.18, CELL_H - 0.06, C.strap, { iron: 1 });
    // the lining: the inside is dark (the walk's light comes from everywhere at once, so a room needs its own dark)
    around(-W2 + WALL, W2 - WALL, 0.0, 0.03, 0.02, CELL_H - 0.02, C.lining, { course: 0, moss: 0 });
    for (const s of [-1, 1]) cellBox(cl, s < 0 ? -W2 + WALL : W2 - WALL - 0.03, s < 0 ? -W2 + WALL + 0.03 : W2 - WALL, 0, FD - WALL, 0.02, CELL_H - 0.02, C.lining, { course: 0, moss: 0 });
    cellBox(cl, -W2 + WALL, W2 - WALL, 0, FD - WALL, CELL_H - 0.04, CELL_H - 0.01, C.lining, { course: 0, moss: 0 });
    cellBox(cl, -W2 + WALL, dl, FD - WALL - 0.03, FD - WALL, 0.02, CELL_H - 0.02, C.lining, { course: 0, moss: 0 });
    cellBox(cl, dr, W2 - WALL, FD - WALL - 0.03, FD - WALL, 0.02, CELL_H - 0.02, C.lining, { course: 0, moss: 0 });
    cellBox(cl, -W2 + WALL, W2 - WALL, 0, FD - WALL, 0.0, 0.025, C.lining, { course: 0, moss: 0 });
    // the door's iron frame
    ironBox(cl, dl - 0.08, dl, FD - 0.02, FD + 0.06, 0, 2.05); ironBox(cl, dr, dr + 0.08, FD - 0.02, FD + 0.06, 0, 2.05);
    ironBox(cl, dl - 0.08, dr + 0.08, FD - 0.02, FD + 0.06, 2.05, 2.15);
    // a stone bench along a side wall, a ring in the rear wall
    const bs0 = cl.odd ? -1 : (rng() < 0.5 ? -1 : 1);
    cellBox(cl, bs0 < 0 ? -W2 + WALL : W2 - WALL - 0.75, bs0 < 0 ? -W2 + WALL + 0.75 : W2 - WALL, 0.03, FD - WALL - 0.1, 0, 0.45, C.spoil, { iron: 0, moss: 0.3, course: 0 });
    ironBox(cl, 0.3, 0.45, 0.03, 0.12, 1.1, 1.18);
    // the grille: shut and locked in the odd cell; elsewhere swung open against the wall, hanging by one hinge, or down
    const gx = (cl.odd ? 0 : cells.indexOf(cl) % 3);
    const bars = 9;
    for (let i = 0; i <= bars; i++) {
      const f = i / bars;
      if (gx === 0) ironBox(cl, dl + f * cl.doorW - 0.02, dl + f * cl.doorW + 0.02, FD + 0.08, FD + 0.12, 0.02, 2.03);
      else if (gx === 1) { const lat = dr + 0.05 + 0.04, dd = FD + 0.1 + f * cl.doorW; ironBox(cl, lat, lat + 0.04, dd - 0.02, dd + 0.02, 0.02, 2.03); } // swung back flat against the front wall
      else { const dd = FD + 0.25 + f * 0.95; ironBox(cl, dl + 0.1, dr - 0.1, dd - 0.02, dd + 0.02, 0.03 + f * 0.08, 0.07 + f * 0.08); } // lying on the deck outside
    }
    if (gx === 0) for (const h of [0.15, 1.0, 1.9]) ironBox(cl, dl, dr, FD + 0.07, FD + 0.13, h, h + 0.06);
    if (gx === 1) for (const h of [0.15, 1.0, 1.9]) ironBox(cl, dr + 0.08, dr + 0.14, FD + 0.1, FD + 0.1 + cl.doorW, h, h + 0.06);
    if (gx === 2) for (const f of [0.05, 0.5, 0.95]) ironBox(cl, dl, dr, FD + 0.25 + f * 0.95 - 0.03, FD + 0.25 + f * 0.95 + 0.03, 0.03, 0.09);
    if (gx === 0) ironBox(cl, dr - 0.22, dr - 0.04, FD + 0.12, FD + 0.2, 0.95, 1.2); // the lock
    // what is left: a bowl, a heap of rags
    if (!cl.odd) {
      const lat = bs0 * -0.9;
      Bc.add(Bc.cyl(0.14, 0.09, 0.07, 9, 1), new THREE.Matrix4().setPosition(cl.c.clone().addScaledVector(cl.u, lat).addScaledVector(cl.n, 0.5).add(new THREE.Vector3(0, 0.06, 0))), { color: C.pewter, iron: 0.4, moss: 0 });
      Bc.add(Bc.rock(0.35, 1, 1.4, 0.35, 1), new THREE.Matrix4().setPosition(cl.c.clone().addScaledVector(cl.u, bs0 * (W2 - WALL - 0.4)).addScaledVector(cl.n, 1.2).add(new THREE.Vector3(0, 0.55, 0))), { color: C.cloth, moss: 0 });
    }
  }
  // the odd cell: the bore and its spoil, the spoon, a blanket folded for a pillow at the bench's end under the bore

  {
    const cl = odd;
    // the bore's mouth: a rough ring of chipped stone, the bore going back into the dark
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2, p = bore.clone().addScaledVector(cl.u, Math.cos(a) * 0.15).add(new THREE.Vector3(0, Math.sin(a) * 0.15, 0)).addScaledVector(cl.n, 0.04);
      Bc.add(Bc.rock(0.07, 0, 1, 1, 0.6), new THREE.Matrix4().setPosition(p), { color: C.spoil, moss: 0 });
    }
    // the spoil: swept into a heap under the bore, grey chips of the mountain
    for (let i = 0; i < 9; i++) {
      const p = cl.c.clone().addScaledVector(cl.u, boreLat + (rng() - 0.5) * 0.7).addScaledVector(cl.n, 0.25 + rng() * 0.5);
      p.y = y + 0.05 + rng() * 0.12;
      Bc.add(Bc.rock(0.08 + rng() * 0.1, 0, 1, 0.6, 1), new THREE.Matrix4().setPosition(p), { color: C.spoil, moss: 0 });
    }
    // the spoon, worn to a stub of its bowl, on the bench's end by the spoil
    const sp = cl.c.clone().addScaledVector(cl.u, -W2 + WALL + 0.45).addScaledVector(cl.n, 0.25).add(new THREE.Vector3(0, 0.47, 0));
    const sq = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(cl.n.x, cl.n.z) + 0.4);
    Bc.add(new THREE.BoxGeometry(0.018, 0.01, 0.16), new THREE.Matrix4().compose(sp, sq, new THREE.Vector3(1, 1, 1)), { color: C.pewter, iron: 0.2, moss: 0 });
    Bc.add(new THREE.SphereGeometry(0.022, 6, 4), new THREE.Matrix4().compose(sp.clone().add(new THREE.Vector3(0, 0, 0)).addScaledVector(cl.n, 0.08), sq, new THREE.Vector3(1, 0.4, 1.2)), { color: C.pewter, iron: 0.2, moss: 0 });
    // the blanket folded at the bench's head, under the bore, where the head lay to watch it
    const bl = cl.c.clone().addScaledVector(cl.u, -W2 + WALL + 0.38).addScaledVector(cl.n, 0.45).add(new THREE.Vector3(0, 0.52, 0));
    Bc.add(Bc.box(0.6, 0.12, 0.45, { chip: 0.02 }), new THREE.Matrix4().compose(bl, sq, new THREE.Vector3(1, 1, 1)), { color: C.cloth, moss: 0 });
    odd.bore = bore; odd.coin = coin; odd.L = L;
  }
  const cellMesh = new THREE.Mesh(Bc.build(), stone);
  cellMesh.name = 'lift-gallery-cells'; cellMesh.castShadow = true; cellMesh.receiveShadow = true;
  group.add(cellMesh);

  // ---- the rod of sunlight, its coin on the deck, the sun's eye at the end of the bore, the dust in it
  const flick = ctx.sky?.flicker;
  const U = { uT: { value: 0 }, uSun: { value: 1 } };
  const rodLen = tLand;
  const rodG = new THREE.CylinderGeometry(0.045, 0.06, rodLen, 10, 1, true); rodG.translate(0, rodLen / 2, 0);
  const rodMat = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    vertexShader: /* glsl */`
      varying float vA; varying vec3 vN; varying vec3 vV;
      void main() { vA = position.y / ${rodLen.toFixed(3)}; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */`
      uniform float uT, uSun; varying float vA; varying vec3 vN; varying vec3 vV;
      void main() {
        float edge = pow(abs(dot(vN, vV)), 1.6);
        float dust = 0.75 + 0.25 * sin(vA * 40.0 - uT * 0.7) * sin(vA * 17.0 + uT * 0.3);
        float a = edge * dust * smoothstep(0.0, 0.06, vA) * (1.0 - 0.6 * smoothstep(0.85, 1.0, vA)) * uSun;
        gl_FragColor = vec4(vec3(1.0, 0.11, 0.02) * a * 0.5, 1.0);
      }`,
  });
  const rod = new THREE.Mesh(rodG, rodMat);
  rod.position.copy(bore); rod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), L);
  rod.name = 'lift-gallery-rod'; rod.renderOrder = 12;
  group.add(rod);
  // the coin: the rod's foot on the deck, long across the plates at so low a sun, striped by the grille's bars
  const along2 = new THREE.Vector3(L.x, 0, L.z).normalize();
  const coinG = new THREE.PlaneGeometry(1, 1); coinG.rotateX(-Math.PI / 2);
  const coinMat = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    vertexShader: /* glsl */`varying vec2 vU; void main() { vU = uv * 2.0 - 1.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform float uSun; varying vec2 vU;
      void main() {
        float r = length(vU); if (r > 1.0) discard;
        float bars = smoothstep(0.08, 0.2, abs(fract(vU.x * 1.6 + 0.3) - 0.5));
        float core = 1.0 - smoothstep(0.25, 0.6, r), pen = 1.0 - smoothstep(0.5, 1.0, r);
        float a = (core * (0.4 + 0.6 * bars) * 1.2 + pen * 0.25) * uSun;
        gl_FragColor = vec4(vec3(1.0, 0.22, 0.05) * a * 0.8, 1.0);
      }`,
  });
  const coinMesh = new THREE.Mesh(coinG, coinMat);
  const coinLen = 0.2 / Math.tan(-Math.asin(L.y)) ;
  coinMesh.scale.set(0.42, 1, Math.min(1.6, coinLen * 1.6));
  coinMesh.position.copy(coin);
  coinMesh.rotation.y = Math.atan2(along2.x, along2.z);
  coinMesh.name = 'lift-gallery-coin'; coinMesh.renderOrder = 12;
  group.add(coinMesh);
  // the sun's eye: a bead of the sun at the bore's end, seen down the bore
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 0.85, 0.22), fog: false }));
  eye.position.copy(bore).addScaledVector(L, -0.12);
  eye.name = 'lift-gallery-sun-eye';
  group.add(eye);
  // the dark of the bore round it
  const boreG = new THREE.CylinderGeometry(0.1, 0.1, 0.5, 10, 1, true); boreG.translate(0, -0.25, 0);
  const boreM = new THREE.Mesh(boreG, new THREE.MeshBasicMaterial({ color: '#050403', side: THREE.BackSide }));
  boreM.position.copy(bore); boreM.quaternion.copy(rod.quaternion); boreM.name = 'lift-gallery-bore';
  group.add(boreM);
  // a red light where it lands, on the grille, the door's jambs and the deck about it
  const glow = new THREE.PointLight(new THREE.Color('#ff5a26'), 3.0, 4.5, 2);
  glow.position.copy(coin).add(new THREE.Vector3(0, 0.25, 0)).addScaledVector(L, -0.6);
  glow.name = 'lift-gallery-coin-light';
  group.add(glow);
  // and inside, faintly, where the rod passes over the bench: the spoil, the spoon, the blanket
  const inner = new THREE.PointLight(new THREE.Color('#ff4a1c'), 3.2, 3.6, 2);
  inner.position.copy(bore).addScaledVector(L, 1.2).add(new THREE.Vector3(0, -0.3, 0));
  inner.name = 'lift-gallery-cell-light';
  group.add(inner);
  // the warders' lamps, still lit, under the lintels of a few bays from the landing; none near the end, where the only
  // light is the sun's coin
  const LAMP_BAYS = [0, 2, 4, 6, 8];
  const lampMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.13, 0.17, 0.38, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.7, 1.0, 0.42) }), LAMP_BAYS.length);
  const chainG = new THREE.CylinderGeometry(0.015, 0.015, 1, 4); chainG.translate(0, 0.5, 0);
  const chainMesh = new THREE.InstancedMesh(chainG, new THREE.MeshStandardMaterial({ color: '#1a1410', roughness: 0.6, metalness: 0.5 }), LAMP_BAYS.length);
  const lamps = [], _lm = new THREE.Matrix4();
  LAMP_BAYS.forEach((k, i) => {
    const p = at(k, 0.5, depth(k, 0.5) - 0.6, 3.1);
    lampMesh.setMatrixAt(i, _lm.makeTranslation(p.x, p.y, p.z));
    chainMesh.setMatrixAt(i, _lm.compose(p.clone().add(new THREE.Vector3(0, 0.16, 0)), new THREE.Quaternion(), new THREE.Vector3(1, t.H - 3.3, 1)));
    const l = new THREE.PointLight(new THREE.Color('#ffa24e'), 22, 13, 2); l.position.copy(p).add(new THREE.Vector3(0, -0.3, 0)); l.name = 'lift-gallery-lamp-light'; group.add(l);
    lamps.push(l);
  });
  lampMesh.name = 'lift-gallery-lamps'; chainMesh.name = 'lift-gallery-lamp-chains';
  group.add(lampMesh, chainMesh);

  // ---- colliders: the posts and mullions at the front, the cells' walls (the odd cell's grille shut)
  const cols = [];
  const postAt = (k) => P(bs[k], back[k] - D, y);
  for (const k of t.posts) { const p = postAt(k); cols.push({ x: p.x, z: p.z, r: 0.45, y: y - 1.1, h: 13, stand: false }); }
  if (!low) for (const k of t.mullions) { const p = P((bs[k] + bs[k + 1]) / 2, (back[k] + back[k + 1]) / 2 - D, y); cols.push({ x: p.x, z: p.z, r: 0.2, y: y - 1, h: 13, stand: false }); }
  const wall = (cl, l0, d0, l1, d1) => { const a = cl.c.clone().addScaledVector(cl.u, l0).addScaledVector(cl.n, d0), b = cl.c.clone().addScaledVector(cl.u, l1).addScaledVector(cl.n, d1); cols.push({ x1: a.x, z1: a.z, x2: b.x, z2: b.z, r: WALL / 2, y, h: CELL_H + 0.3, stand: false }); };
  for (const cl of cells) {
    const dl = cl.door - cl.doorW / 2, dr = cl.door + cl.doorW / 2, fz = FD - WALL / 2;
    for (const s of [-1, 1]) wall(cl, s * (W2 - WALL / 2), 0, s * (W2 - WALL / 2), FD);
    wall(cl, -W2, fz, dl, fz); wall(cl, dr, fz, W2, fz);
    if (!cl.open) wall(cl, dl, FD + 0.1, dr, FD + 0.1);
  }
  // the chain from the short boom's tip that hangs past the deck's rear at 276.3 (src/v5/galleries.js)
  for (const ch of geo.chains) {
    if (ch.mode !== 0) continue;
    const b = bear(ch.A[0], ch.A[2]);
    if (b < bs[0] || b > bEnd || ch.A[1] < y || ch.A[1] - ch.n * 2.5 > y + 2) continue;
    if (floor(ch.A[0] * 0.995, ch.A[2] * 0.995) === null && floor(ch.A[0], ch.A[2]) === null) continue;
    cols.push({ x: ch.A[0], z: ch.A[2], r: 0.5, y: y - 1, h: 14, stand: false });
  }
  for (const c of cols) ctx.addCollider(c);

  // ---- the walk, for the ascent and the tests: the deck's middle from the landing to the ragged end
  const path = [];
  for (let k = 0; k < nW; k++) {
    const fs = k === landK ? [Math.max(landF, 0.02), 0.5] : [0.15, 0.5, 0.85];
    for (const f of fs) { if (k === nW - 1 && f > RAGGED - 0.12) continue; const p = at(k, f, (D - REAR) * 0.7); path.push([p.x, p.z]); }
  }
  {
    const p = at(nW - 1, RAGGED - 0.12, (D - REAR) * 0.7); path.push([p.x, p.z]);
  }
  const landing = (() => { const p = at(landK, landF, depth(landK, landF)); return { x: p.x, z: p.z, b: landB, r: hyp(p.x, p.z), k: landK, f: landF }; })();
  const endP = at(nW - 1, RAGGED - 0.1, (D - REAR) * 0.6);

  // ---- per frame (only near): the sun's strength in the rod and the coin, the dust drifting
  function update(dt, tt) {
    U.uT.value = tt;
    const f = flick ? flick.value : 1;
    U.uSun.value = Math.max(0.12, f);
    glow.intensity = 3.0 * U.uSun.value; inner.intensity = 3.2 * U.uSun.value;
  }
  update(0, 0);

  const tris = (m) => (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3;
  return {
    y, floor, keep, landing, path, cells, odd, end: { x: endP.x, z: endP.z, b: bEnd }, bs, back, D, nW, at, update, group,
    railGone, broken: BROKEN, draws: 9, tris: [deckIron, grating, cellMesh, rod, coinMesh, eye, boreM].reduce((a, m) => a + tris(m), 0), colliders: cols.length,
  };
}
