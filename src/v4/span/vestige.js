// The Span's thin way over its three fallen bays (v12 H1; the plan is vestige-plan.js). Each is a ruin, not a
// repair, and each is a different thing:
//   west: the north side's footing course (two rows of dressed stone, a few of the lower row gone) still standing
//         on three spandrel stubs and the arch's own rib, which is all of the bay that is left
//   fen:  the cornice and kerb stones of the south side, a dozen slabs hung from an iron tie-bar by straps, daylight
//         between them, two corbel arms out of the piers meeting crooked
//   river: not stone: a strut of the Lattice come down out of the sky, bowed, slung from pier to pier and lashed
//         with bronze, rags of saffron on the lashings (the Late folk's work)
// The stone goes into the span's own masonry mesh (K.body), the iron into its metal mesh (K.metals); the strut and the
// rags are two meshes of their own and one cold light. The walkable is vestigeAt (vestige-plan.js).
import * as THREE from 'three';
import { SPAN, bayArch, intrados, RING } from './plan.js';
import { VESTIGES, vestigeAt, fenSlabs, FEN_GAP, FEN_LET_GO, CRACK_WAY } from './vestige-plan.js';
import { box, extrudeXY, clean } from './geo.js';
import { mergeGeometries } from '../kit/merge.js';
import { buildStrut } from './strut.js';
import { travellerCloth } from './cloth.js';

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
  const metalParts = [];
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
    // one is gone from both rows: a stride of air (0.6 m) you step over with the tarn's shallows under it; the stone
    // after it has tipped on its bed toward the south, its outer edge 0.07 m down.
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
  void metalParts; void hi; void addCol;
  K.vestigeMeshes = strutMeshes;
  return { at: vestigeAt, ways: VESTIGES };
}
