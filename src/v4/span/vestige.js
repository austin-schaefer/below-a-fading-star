// The Span's thin way over its three fallen bays (v12 H1; the plan is vestige-plan.js). Each is a ruin, not a
// repair, and each is a different thing:
//   west: the north side's footing course (two rows of dressed stone, a few of the lower row gone) still standing
//         on three spandrel stubs and the arch's own rib, which is all of the bay that is left
//   fen:  the cornice and kerb stones of the south side, a dozen slabs hung from an iron tie-bar by straps, daylight
//         between them, two corbel arms out of the piers meeting crooked
//   river: not stone: a member of a Lattice come down out of the sky, a bowed box truss (strut.js)
//   crack: a length of the south parapet's coping, fallen across it and broken in two
// The one who crossed to wait on the middle deck (stories/the-wait-on-the-span.md) marked the way for the one who was to
// follow: strips of their saffron cloth tied every few strides along each way's edge, hanging and moving in the air, so
// that from the valley floor each gap still shows a thin line with rags under it; and at each way's lips a staff in
// three stones with a strip on it. The stone ways and the coping carry a paler line worn by feet down their middle.
// The stone goes into the span's own masonry mesh (K.body), the iron and the staffs into its metal mesh (K.metals); the
// strips are one swaying mesh (cloth.js), the worn lines one small mesh, the strut its own (strut.js).
// The walkable is vestigeAt (vestige-plan.js).
import * as THREE from 'three';
import { SPAN, bayArch, intrados, RING } from './plan.js';
import { VESTIGES, vestigeAt, fenSlabs, FEN_GAP, FEN_LET_GO, CRACK_WAY } from './vestige-plan.js';
import { box, extrudeXY, clean } from './geo.js';
import { mergeGeometries } from '../kit/merge.js';
import { buildStrut } from './strut.js';
import { travellerCloth, swayingCloth, sheet } from './cloth.js';

const Y = SPAN.deckY;

// a slab whose top face centre is at (xc, yTop, zc), pitched to the way's slope and yawed to its jog
function slab(v, xc, len, wid, th, drop = 0.03, dy = 0, dzr = 0) {
  const g = new THREE.BoxGeometry(len, th, wid);
  g.translate(0, -th / 2, 0);
  const s = (v.y(xc + 0.5) - v.y(xc - 0.5)), jz = (v.zc(xc + 0.5) - v.zc(xc - 0.5));
  g.rotateZ(Math.atan(s)); g.rotateY(-Math.atan(jz) + dzr);
  g.translate(xc, v.y(xc) - drop + dy, v.zc(xc));
  return clean(g);
}
// the pointed arch's ring between intrados and extrados, as one outline in x-y
function ringOutline(A) {
  const pts = [], n = 14, m = A.m;
  const top = (x) => { const xr = x <= m ? x : 2 * m - x, Rr = A.R + RING; return A.ys + Math.sqrt(Math.max(0, Rr * Rr - (xr - A.cl) ** 2)); };
  for (let i = 0; i <= n * 2; i++) { const x = A.fl + (A.fr - A.fl) * (i / (n * 2)); pts.push([x, intrados(A, x)]); }
  pts.push([A.fr + RING, A.ys]);
  for (let i = n * 2; i >= 0; i--) { const x = (A.fl - RING) + (A.fr - A.fl + 2 * RING) * (i / (n * 2)); pts.push([x, i === 0 || i === n * 2 ? A.ys : top(x)]); }
  return pts;
}

export function buildVestige(K) {
  const { ctx, hi, rng, jit, body, metals, paint, addCol } = K;
  const [W, F, R] = VESTIGES;
  const worn = [];
  // a paler line worn down the middle of a way by feet, 0.45 m wide, laid on its top from x0 to x1
  const wornLine = (v, x0, x1, step = 0.8) => { for (let x = x0; x < x1 - 0.05; x += step) { const xb = Math.min(x1, x + step); worn.push(slab(v, (x + xb) / 2, xb - x + 0.02, 0.4 + 0.1 * Math.sin(x * 3.1), 0.05, 0.026)); } }; // (thick enough to sit on every stone)
  const iron = (g, hex = '#4a3a30') => metals.push(paint(g, hex));

  // ---------------------------------------------------------------- west: the footing on its rib
  {
    const A = bayArch(-120, -70), zr = 211.0;
    body.push(extrudeXY(ringOutline(A), zr - 0.75, zr + 0.75)); // the rib, all of the bay's arch that is left
    // three stubs of the spandrel wall from the rib up to the footing: leaning, ragged
    for (const [xc, w] of [[-107.2, 2.8], [-95.3, 2.2], [-83.6, 3.0]]) {
      const yb = intrados(A, xc) + RING * 0.6, yt = W.y(xc) - 1.35;
      const pts = [[xc - w / 2 - jit(0.3), yb], [xc + w / 2, yb], [xc + w / 2 - 0.5 + jit(0.4), yt], [xc - w / 2 + 0.4 + jit(0.4), yt]];
      body.push(extrudeXY(pts, W.zc(xc) - 0.7, W.zc(xc) + 0.7));
    }
    // the footing: an upper row of long stones, a lower row set back and broken, two stones of it fallen away. At x -100
    // one has broken and gone from both rows; a piece of it is wedged in the gap, sunk and canted, daylight either side of
    // it (you step down on it); the stone after it has tipped on its bed toward the south, its outer edge 0.07 m down.
    const GAP = [-100.3, -99.7];
    let gapDone = false, tipped = false;
    for (let x = W.x0, i = 0; x < W.x1 - 0.5; i++) {
      let len = Math.min(W.x1 - x, 2.6 + rng() * 1.3);
      if (!gapDone && x + len > GAP[0] - 1.2) len = GAP[0] - x; // (never a sliver before the gap)
      const xc = x + len / 2;
      const g = slab(W, xc, len - 0.05, 1.5, 0.82, 0.03 + rng() * 0.02, 0, jit(0.03));
      const tip = gapDone && !tipped;
      if (tip) { tipped = true; g.translate(-xc, -W.y(xc), -W.zc(xc)); g.rotateX(0.09); g.translate(xc, W.y(xc) - 0.01, W.zc(xc)); }
      body.push(g);
      const lx0 = xc + 1.1 - len / 2, lx1 = xc + 1.1 + len / 2;
      if (!(i === 2 || i === 7 || tip || (lx1 > GAP[0] - 0.6 && lx0 < GAP[1] + 0.6))) body.push(slab(W, xc + 1.1, len - 0.1, 1.34, 0.6, 0.85 + rng() * 0.04, 0, jit(0.04)));
      x += len;
      if (!gapDone && x >= GAP[0] - 1e-6) { gapDone = true; x = GAP[1]; }
    }
    { // the wedged piece: narrower than the gap along the way, as wide as the way, its top 0.04 to 0.11 m under it
      const xc = (GAP[0] + GAP[1]) / 2, g = new THREE.BoxGeometry(0.5, 0.42, 1.44); g.translate(0, -0.21, 0);
      g.rotateZ(0.13); g.rotateX(-0.03); g.translate(xc, W.y(xc) - 0.075, W.zc(xc)); body.push(clean(g));
    }
    wornLine(W, W.a - 0.4, GAP[0]); wornLine(W, GAP[1], W.b + 0.4);
  }

  // ---------------------------------------------------------------- fen: the cornice and kerb stones on their iron
  {
    const fs = fenSlabs(), len = fs.len, gap = FEN_GAP, n = fs.n;
    for (let i = 0; i < n; i++) {
      const xc = fs.xc(i), zc = F.zc(xc), letGo = i === FEN_LET_GO.i;
      const g = slab(F, xc, len, 1.5, 0.55, letGo ? 0.02 : 0.03 + rng() * 0.04, 0, jit(0.05));
      if (letGo) { // tipped down at its east end where the strap gave, and over a little to the south; cracked across
        const t = Math.atan(FEN_LET_GO.drop / len);
        const xa = xc - len / 2; // about its west end, which the other strap still holds
        g.translate(-xa, -F.y(xa), -zc); g.rotateZ(-t); g.rotateX(0.035); g.translate(xa, F.y(xa), zc);
      }
      body.push(g);
      // the strap from the tie-bar up to the stone's underside, and the tie-bar between straps
      const yb = F.y(xc) - 1.55;
      if (!letGo) iron(box(xc - 0.07, xc + 0.07, yb, F.y(xc) - 0.5, zc - 0.7, zc + 0.7), '#5a3a26');
      else { // the strap has let go: torn at its top, it hangs off the bar, swung out under the slab
        const sg = new THREE.BoxGeometry(0.14, 1.3, 0.1); sg.translate(0, -0.65, 0); sg.rotateZ(0.5); sg.rotateX(-0.35);
        sg.translate(xc + 0.4, yb + 0.06, zc + 0.55); iron(clean(sg), '#5e3c26');
        const s2 = new THREE.BoxGeometry(0.14, 0.42, 0.1); s2.rotateZ(0.15); s2.translate(xc, F.y(xc) - 0.75, zc - 0.6); iron(clean(s2), '#5a3a26'); // the stub still on the stone
      }
      const x2 = xc + len / 2 + gap / 2, cx = xc + (len + gap) / 2, s = F.y(cx + 1) - F.y(cx - 1);
      const bar = new THREE.BoxGeometry(len + gap + 0.1, 0.16, 0.16); bar.rotateZ(Math.atan(s / 2));
      bar.translate(cx, F.y(cx) - 1.61, F.zc(cx));
      iron(clean(bar), '#4d3626');
      // a bronze cramp across the joint on the upper face (the one into the tipped slab has pulled out)
      if (i < n - 1 && !letGo) for (const dz of [-0.4, 0.4]) iron(box(x2 - 0.22, x2 + 0.22, F.y(x2) - 0.01, F.y(x2) + 0.03, zc + dz - 0.08, zc + dz + 0.08), '#8a6f36');
    }
    // two corbel arms out of each pier face, the first three courses stepping out under the first stones
    for (const [dir, x] of [[1, F.a], [-1, F.b]]) for (let c = 0; c < 3; c++) {
      const out = 0.9 * (c + 1), x0 = dir > 0 ? x : x - out, x1 = dir > 0 ? x + out : x;
      const zc = F.zc(x);
      body.push(box(x0, x1, F.y(x) - 0.55 - 0.6 * (c + 1), F.y(x) - 0.55 - 0.6 * c, zc - 0.7, zc + 0.7));
    }
  }

  { const fs = fenSlabs(); for (let i = 0; i < fs.n; i++) if (i !== FEN_LET_GO.i) wornLine(F, fs.xc(i) - fs.len / 2 + 0.05, fs.xc(i) + fs.len / 2 - 0.05, 0.7); }

  // ---------------------------------------------------------------- the crack: a parapet's coping, fallen across it
  {
    const C = CRACK_WAY, cx = SPAN.crack.x, half = C.L / 2;
    for (const s of [-1, 1]) { // two halves, broken at the middle, each sagging into the crack
      const xa = cx + s * 0.04, xb = cx + s * half, xm = (xa + xb) / 2, ln = Math.abs(xb - xa);
      const g = new THREE.BoxGeometry(ln, 0.46, 2 * C.hw); g.translate(0, -0.23, 0);
      // the coping's moulding: a roll along its south edge, half its thickness down
      const roll = new THREE.CylinderGeometry(0.13, 0.13, ln, 8); roll.rotateZ(Math.PI / 2); roll.translate(0, -0.32, C.hw - 0.06);
      for (const q of [g, roll]) {
        q.rotateZ(Math.atan((C.y(xb) - C.y(xa)) / (xb - xa))); q.rotateY(-C.yaw);
        q.translate(xm, (C.y(xa) + C.y(xb)) / 2 - 0.02, C.zc(xm));
        body.push(clean(q));
      }
    }
    // the worn line on it, and leading to it on the deck from each side, as if it had always been the way
    for (const sgn of [-1, 1]) {
      const xa = cx + sgn * 0.1, xb = cx + sgn * (half + 2.5);
      for (let k = 0; k < 8; k++) {
        const u0 = k / 8, u1 = (k + 1) / 8, x0 = xa + (xb - xa) * u0, x1 = xa + (xb - xa) * u1, xm = (x0 + x1) / 2;
        const g = new THREE.BoxGeometry(Math.abs(x1 - x0) + 0.02, 0.012, 0.42 - 0.12 * Math.max(0, (Math.abs(xm - cx) - half) / 2.5));
        g.rotateZ(Math.atan((C.y(x1) - C.y(x0)) / (x1 - x0))); g.rotateY(-C.yaw);
        g.translate(xm, Math.abs(xm - cx) > half ? Y + 0.002 : C.y(xm) - 0.014, C.zc(xm)); worn.push(clean(g));
      }
    }
    // the lips under its ends, spalled: a few chips on the deck beside it
    for (let k = 0; k < 6; k++) {
      const side = k % 2 ? 1 : -1, x = cx + (k < 3 ? -1 : 1) * (half - 0.4 - rng() * 1.4);
      const g = new THREE.BoxGeometry(0.2 + rng() * 0.25, 0.12 + rng() * 0.12, 0.2 + rng() * 0.2);
      g.rotateY(rng() * 3); g.rotateX(jit(0.3)); g.translate(x, Y + 0.04, C.zc(x) + side * (C.hw + 0.35 + rng() * 0.5));
      body.push(clean(g));
    }
  }

  // ---------------------------------------------------------------- river: the Lattice's strut (strut.js)
  const strut = buildStrut(K, R);
  const strutMeshes = strut.meshes;
  if (strut.rags.length) {
    const rg = mergeGeometries(strut.rags); for (const q of strut.rags) q.dispose();
    const rm = new THREE.Mesh(rg, travellerCloth()); rm.name = 'span-rags'; rm.castShadow = false; rm.receiveShadow = true;
    ctx.scene.add(rm); strutMeshes.push(rm);
  }
  // ---------------------------------------------------------------- the way marked: strips of the cloth, and staffs at the lips
  const strips = [];
  const strip = (x, y, z, len, w, ang) => strips.push(sheet((u, v) => {
    const d = 1 - v; return [x + Math.cos(ang) * (u - 0.5) * w * (1 - 0.25 * d), y - len * d, z + Math.sin(ang) * (u - 0.5) * w * (1 - 0.25 * d)];
  }, 1, hi ? 6 : 3));
  const every = hi ? 1 : 2;
  // (long enough, 2 to 3.6 m, and many enough to read from the valley floor as a fringe under a thin line)
  [[W, 2.3, 0.78, 0.0], [F, 2.1, 0.78, 0.0], [R, 2.2, 0.72, 1.5]].forEach(([v, pitch, out, down], wi) => {
    for (let x = v.a + 1.2, i = 0; x < v.b - 1.0; x += pitch, i++) {
      if (i % every) continue;
      const side = (i + wi) % 2 ? 1 : -1, len = 2.0 + rng() * 1.6;
      strip(x + jit(0.4), v.y(x) - down - 0.04, v.zc(x) + side * out, len, 0.55 + rng() * 0.25, 0.8 + jit(0.35)); // (turned to take the low sun and face the valley)
    }
  });
  const staff = (x, z, yb) => {
    const g = new THREE.CylinderGeometry(0.03, 0.04, 1.5, 6); g.rotateZ(jit(0.08)); g.rotateX(jit(0.08)); g.translate(x, yb + 0.75, z); iron(clean(g), '#3d3026');
    for (let k = 0; k < 3; k++) { const a = k * 2.1 + rng(), q = new THREE.BoxGeometry(0.26, 0.2, 0.24); q.rotateY(rng() * 3); q.translate(x + Math.cos(a) * 0.2, yb + 0.1, z + Math.sin(a) * 0.2); body.push(clean(q)); }
    strip(x, yb + 1.46, z, 0.95, 0.24, 0.3 + jit(0.4));
    addCol({ x, z, r: 0.32, y: yb - 0.2, h: 0.5 });
  };
  for (const v of [W, F, R, CRACK_WAY]) for (const [x, dir] of [[v.a, -1], [v.b, 1]]) staff(x + dir * 1.4, v.zc(x) + (v === CRACK_WAY ? -1.25 : 1.25), Y); // (south of the line, out of the deck's walk; the coping's north)
  {
    const g = mergeGeometries(strips); for (const q of strips) q.dispose(); g.computeBoundingSphere();
    const m = new THREE.Mesh(g, swayingCloth()); m.name = 'span-way-strips'; m.castShadow = false; m.receiveShadow = hi;
    ctx.scene.add(m); strutMeshes.push(m);
    const uT = swayingCloth().userData.uT; ctx.registerUpdate((dt, t) => { uT.value = t; });
  }
  {
    const g = mergeGeometries(worn); for (const q of worn) q.dispose(); g.computeBoundingSphere();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: '#8f877a', roughness: 0.85 })); m.name = 'span-worn';
    m.receiveShadow = true; m.matrixAutoUpdate = false; ctx.scene.add(m); strutMeshes.push(m);
  }
  K.vestigeMeshes = strutMeshes;
  return { at: vestigeAt, ways: VESTIGES };
}
