// The travellers' tally at the Lantern Halt (v10-A0, #24; reworked in v10-A4 after the owner tried it): the first act,
// and the example in the `world-code` skill's "Acts". Everyone who slept in the lantern chalked a stroke on the slab's
// face, in fives, row under row, each in their own hand: the oldest rows high up, washed thin by the rain; lower
// down, nearer the road. A few counted in boxes, a few had only a coal from the lamp or the red earth by the trough.
// Above them the Late folk chalked the halt's own sign large, ruled a line, and kept their count of the hundreds.
// At chest height, left of where the seat's rope comes down, the stone is nearly clear (rubbed for the newcomers):
// that is where the visitor writes, and a stub of saffron chalk hangs there on a cord from an iron staple driven in
// over their gate. Standing at the wall and looking at that spot, the visitor is offered it ("Chalk your stroke"):
// the stub lifts on its cord to the stone, draws a forearm-long stroke top to bottom over a second and more, dust
// falling from its tip, and is let go and swings, settling. The stroke is the brightest thing on the wall while it
// is new. Kept, one a visit: on a return visit their own gates are there, saffron, with the chalk over the next.
// Chalking is how a traveller claims the bed, so the stroke brings the seat down (src/v10/halt-seat.js).
//
// One draw for the wall: a decal on the face, a CanvasTexture of all of it (1536 x 614, about 4.7 mm a pixel; half
// that on the low tier), drawn once at build from ctx.makeRng. A stroke being drawn goes on a small overlay quad of
// its own (160 px square, no mipmaps), uploaded on the frames the tip moves; it stays there, fresh, for 25 s and then
// goes onto the wall in one upload. Its emissive share is chalk catching the sky: the face looks east, away from the
// sun, and in its shadow plain chalk would read as nothing from the road. The chalk (staple, cord, stub) and its dust
// are four small draws in the slab's frame; nothing runs per frame while the chalk hangs still.
//
// buildTally(ctx, o) is called by src/v9/waystation.js with its frame: { M0 (the slab's matrix), W (its site), foot,
// gAt(x, z) (ground, local), at(...) (a local frame), B, late, group, iron }. Returns ctx.tally: { wall, visitor,
// strokes(), stand(), next(), centre, normal, mesh, chalk, strokeEnd() }.
import * as THREE from 'three';

const X0 = -3.55, X1 = 3.65; // the wall's extent along the face, local x: nearly all of it, over the bench too
const WM = X1 - X0; // metres: 7.2 x 2.88
const ID = 'halt-tally';
const MAXV = 400; // visitor strokes drawn at most (a tampered count is clamped by acts.js to 9999)
const SAFFRON = 'rgb(255,214,132)';

export function buildTally(ctx, o) {
  const { M0, W, foot, gAt, at, B, late, group } = o;
  const K = ctx.quality === 'low' ? 0.5 : 1; // the canvas's scale: every pixel measure below is in M2P or times K
  const PX = Math.round(1536 * K), PY = Math.round(614 * K), HM = WM * PY / PX, M2P = PX / WM;
  const rng = ctx.makeRng(1000);
  const zf = W.d / 2; // the face
  // the wall's foot: over the highest ground along it, so no row is in the turf
  let gHi = -Infinity;
  for (let i = 0; i <= 10; i++) gHi = Math.max(gHi, gAt(X0 + (i / 10) * WM, zf + 0.3));
  const Y0 = gHi - foot + 0.35; // the wall's bottom edge, local y (the slab's foot is y 0)

  // ------------------------------------------------------------------ the canvas
  const cv = document.createElement('canvas'); cv.width = PX; cv.height = PY;
  const g = cv.getContext('2d');
  const base = document.createElement('canvas'); base.width = PX; base.height = PY;
  const bg = base.getContext('2d');

  // the stone's grain: a fixed field of pits, 1.5 mm each, that chalk skips over
  const pits = (x, y) => { const v = Math.sin(Math.floor(x / K) * 12.9898 + Math.floor(y / K) * 78.233) * 43758.5453; return v - Math.floor(v); };
  // one stroke of chalk as dabs: heavier where the chalk first bites, thinning to the lift; the grain takes some
  // away. A flat list [x, y, w, h, alpha, ...] so a stroke can be painted in parts, anywhere, the same each time.
  function dabs(s) {
    const dx = s.x1 - s.x0, dy = s.y1 - s.y0, len = Math.hypot(dx, dy), n = Math.max(4, Math.round(len * 1.6 / K));
    const nx = -dy / len, ny = dx / len, r = s.rng, out = [];
    const nd = s.press > 1 ? 4 : s.press > 0.62 ? 3 : s.press > 0.38 ? 2 : 1; // a light hand leaves fewer grains
    for (let i = 0; i < n; i++) {
      const u = i / n, press = s.press * (u < 0.12 ? 0.75 + 2 * u : 1 - 0.55 * Math.pow(Math.max(0, u - 0.6) / 0.4, 1.5));
      const hook = u > 0.88 ? (u - 0.88) * s.hook * K : 0; // the hand's little hook at the end of a stroke
      const cx = s.x0 + dx * u + nx * hook, cy = s.y0 + dy * u + ny * hook;
      for (let k = 0; k < nd; k++) {
        const off = (r() - 0.5) * s.w, a = press * (0.3 + 0.6 * r()), rr = s.w * (0.16 + 0.26 * r()), hh = rr * (1.2 + r());
        const px = cx + nx * off, py = cy + ny * off;
        if (pits(px, py) < 0.3) continue; // the stone's pits: chalk skips them, the same pits for every hand
        out.push(px - rr / 2, py - rr / 2, rr, hh, Math.min(1, a));
      }
    }
    if (s.dust) { // fresh chalk: a little falls and catches on the stone under the stroke's end
      const bx = Math.min(s.x0, s.x1), by = Math.max(s.y0, s.y1);
      for (let i = 0; i < 26; i++) { const sz = (1 + 2 * r()) * K * 2; out.push(bx + (r() - 0.3) * s.w * 2.5, by + (0.01 + 0.07 * r() * r()) * M2P, sz, sz, 0.12 + 0.25 * r()); }
    }
    return out;
  }
  function paint(c2, col, d, i0 = 0, i1 = d.length / 5, ox = 0, oy = 0) {
    c2.fillStyle = col;
    for (let i = i0; i < i1; i++) { const j = i * 5; c2.globalAlpha = d[j + 4]; c2.fillRect(d[j] - ox, d[j + 1] - oy, d[j + 2], d[j + 3]); }
    c2.globalAlpha = 1;
  }
  const stroke = (c2, s) => paint(c2, s.col, dabs(s));

  // a hand: how one sleeper chalks. Older hands are fainter and warmer (dust and lichen in them). Most count in gates
  // of five; a few, from the far side of the saddle, count in boxes (four sides and the diagonal); a few had no chalk
  // and used a coal from the lamp, or the red earth by the trough.
  function hand(r, age) {
    const L = (0.17 + 0.15 * r()) * M2P; // stroke length
    const k = r(), ink = k < 0.09 ? 'coal' : k < 0.14 ? 'ochre' : 'chalk';
    const fade = 1 - 0.7 * age;
    const col = ink === 'coal' ? 'rgb(34,28,26)' : ink === 'ochre' ? `rgb(${Math.round(150 + 20 * fade)},${Math.round(70 + 14 * fade)},52)`
      : `rgb(${Math.round(176 + 40 * fade)},${Math.round(166 + 40 * fade)},${Math.round(146 + 42 * fade)})`;
    return {
      L, w: (0.016 + 0.012 * r()) * M2P, gap: Math.max(L * (0.17 + 0.12 * r()), 0.055 * M2P), slant: (r() - 0.4) * 0.26, jit: 0.04 + 0.1 * r(),
      press: (0.55 + 0.3 * r()) * fade * (ink === 'coal' ? 1.3 : 1), hook: (r() - 0.5) * 12, bar: 0.9 + 0.5 * r(),
      col, box: r() < 0.08,
    };
  }
  // the strokes of one gate of five (or fewer) at (x, y) (the top of the strokes), in hand h
  function gate(x, y, h, n, r, col = h.col) {
    const out = [];
    const S = (x0, y0, x1, y1, o = {}) => out.push({ x0, y0, x1, y1, w: h.w, press: h.press, hook: h.hook, col, rng: r, ...o });
    if (h.box) { // a box: left, top, right, bottom, and the diagonal closes it
      const L = h.L * 0.8, j = () => (r() - 0.5) * 3 * K;
      const c = [[x, y], [x + L, y], [x + L, y + L], [x, y + L]];
      const sides = [[0, 3], [0, 1], [1, 2], [3, 2]];
      for (let i = 0; i < Math.min(4, n); i++) { const [p, q] = sides[i]; S(c[p][0] + j(), c[p][1] + j(), c[q][0] + j(), c[q][1] + j()); }
      if (n >= 5) S(c[3][0] + j(), c[3][1] + j(), c[1][0] + j(), c[1][1] + j(), { bar: true, press: h.press * h.bar });
      return out;
    }
    for (let i = 0; i < Math.min(4, n); i++) {
      const sl = h.slant + (r() - 0.5) * h.jit, L = h.L * (0.92 + 0.16 * r());
      const xa = x + i * h.gap + (r() - 0.5) * 2 * K, ya = y + (r() - 0.5) * 3 * K;
      S(xa, ya, xa - Math.sin(sl) * L, ya + Math.cos(sl) * L);
    }
    if (n >= 5) { // the bar across, low left to high right, past both ends
      const L = h.L;
      S(x - h.gap * 0.6, y + L * (0.75 + 0.1 * r()), x + h.gap * 3.6, y + L * (0.18 + 0.1 * r()), { press: h.press * h.bar, hook: h.hook * 0.3, bar: true });
    }
    return out;
  }
  const gateW = (h) => (h.box ? h.L * 0.8 : h.gap * 3 + h.L * 0.5);
  // a chalk line through points (the heading, the signs): the same dabs as a stroke, segment by segment
  const path = (pts, o) => { for (let i = 1; i < pts.length; i++) stroke(bg, { x0: pts[i - 1][0], y0: pts[i - 1][1], x1: pts[i][0], y1: pts[i][1], hook: 0, rng, ...o }); };
  const ring = (cx, cy, R, n = 14) => Array.from({ length: n + 1 }, (_, i) => [cx + R * Math.cos((i / n) * Math.PI * 2), cy + R * Math.sin((i / n) * Math.PI * 2)]);

  // ------------------------------------------------------------------ the wall's own strokes, top row oldest
  const ROW = 0.3 * M2P, TOP = 0.66 * M2P, LEFT = 0.1 * M2P, RIGHT = PX - 0.08 * M2P;
  const rows = Math.floor((PY - TOP - 0.04 * M2P) / ROW); // the rows the wall holds
  let wall = 0;
  const cursor = { row: 0, x: LEFT };
  const OWN_ROWS = rows - 1; // the last row is left for the visitors who come after
  const rowY = (row, r) => TOP + row * ROW + (r() - 0.5) * 7 * K;
  // the visitors' place: the stone at chest height left of the seat's fall, kept nearly clear of old marks (a few big
  // old gates stay, washed), so a visitor's strokes have dark stone about them. Canvas px, from local x and the
  // height over the ground.
  const hx = (x) => (x - X0) * M2P, hy = (h) => (0.35 + HM - h) * M2P;
  const CLR = { x0: hx(-3.5), x1: hx(0.34), y0: hy(1.98), y1: hy(0.36), keep: hx(-2.3) }; // old gates kept only at its far end
  const inClear = (x0, y0, x1, y1) => x1 > CLR.x0 && x0 < CLR.x1 && y1 > CLR.y0 && y0 < CLR.y1;
  for (let row = 0; row < OWN_ROWS; row++) {
    let x = LEFT + (rng() * 0.18) * M2P;
    const last = row === OWN_ROWS - 1;
    const end = last ? LEFT + (0.5 + 0.12 * rng()) * (RIGHT - LEFT) : RIGHT;
    while (true) {
      const age = 1 - (row + x / PX) / OWN_ROWS;
      const h = hand(rng, Math.max(0, Math.min(1, age)));
      if (last) h.box = false;
      const w = gateW(h);
      if (x + w > end && !last) break;
      const n = last && x + w * 2.4 > end ? 3 : 5; // the last gate unfinished
      const gy = rowY(row, rng);
      if (inClear(x, gy, x + w, gy + h.L) && (x + w > CLR.keep || rng() > 0.2)) { if (n < 5) break; x += w + 0.06 * M2P; continue; } // rubbed out: the visitors' place
      for (const st of gate(x, gy, h, n, rng)) stroke(bg, st);
      wall += n;
      cursor.row = row; cursor.x = x + w; cursor.y = TOP + row * ROW;
      x += w + (0.04 + 0.09 * rng()) * M2P + (rng() < 0.1 ? 0.2 * M2P : 0);
      if (n < 5) break;
    }
  }
  // a few marks beside the counts: a hand's sign after its gate (a ring, a cross, a hook), as people sign
  for (let i = 0; i < 12; i++) {
    const x = LEFT + 20 * K + rng() * (RIGHT - LEFT - 60 * K), y = TOP + Math.floor(rng() * (OWN_ROWS - 1)) * ROW + ROW * 0.86;
    if (inClear(x - 12 * K, y - 12 * K, x + 12 * K, y + 12 * K)) { rng(); rng(); continue; }
    const o = { w: 4 * K, press: 0.35 + 0.3 * rng(), col: 'rgb(206,196,176)' }, k = i % 3, r = (5 + 3 * rng()) * K;
    if (k === 0) path(ring(x, y, r, 9), o);
    else if (k === 1) { path([[x - r, y - r], [x + r, y + r]], o); path([[x + r, y - r], [x - r, y + r]], o); }
    else path([[x, y - r * 1.4], [x, y + r * 0.6], [x + r * 0.5, y + r * 1.1], [x + r * 1.2, y + r * 0.8]], o);
  }
  // the Late folk's heading, read from the road: the halt's sign large at the left (half a metre), a line ruled
  // under the band, the sign again small at the far end where someone copied it, and the halt's own count of the
  // hundreds near the right, in strokes as long as a forearm and as thick as a thumb, gone over many times
  {
    const o = { w: 0.05 * M2P, press: 0.95, col: 'rgb(232,222,200)' };
    const sign = (cx, cy, s, oo) => {
      path([[cx - s, cy - s * 0.7], [cx - s * 0.5, cy], [cx, cy + s * 0.75], [cx + s * 0.5, cy], [cx + s, cy - s * 0.7]], oo);
      path(ring(cx, cy - s * 0.02, s * 0.36, 14), oo);
      path([[cx, cy - s * 0.95], [cx, cy - s * 0.4]], oo);
    };
    const s = 0.26 * M2P, cx = LEFT + s * 1.1, cy = 0.3 * M2P;
    sign(cx, cy, s, o); sign(cx + 2 * K, cy + 1 * K, s, { ...o, press: 0.5 }); // gone over twice
    const ly = TOP - 0.06 * M2P, ln = [];
    for (let i = 0; i <= 20; i++) { const u = i / 20; ln.push([cx + s * 1.3 + u * (RIGHT - cx - s * 1.5), ly + Math.sin(u * 5.3) * 3 * K + u * 4 * K]); }
    path(ln, { ...o, w: 0.022 * M2P, press: 0.7 });
    sign(RIGHT - 0.12 * M2P, 0.2 * M2P, s * 0.3, { ...o, w: 4 * K, press: 0.45 });
    const big = { L: 0.44 * M2P, w: 0.045 * M2P, gap: 0.11 * M2P, slant: 0.04, jit: 0.04, press: 0.9, hook: 4, bar: 1, col: 'rgb(228,218,196)' };
    const hx = RIGHT - 0.45 * M2P - gateW(big) * 2;
    for (const st of gate(hx, 0.06 * M2P, big, 5, rng)) { stroke(bg, st); stroke(bg, { ...st, press: 0.45, x0: st.x0 + 2 * K, x1: st.x1 + 2 * K }); }
    for (const st of gate(hx + gateW(big) + 0.12 * M2P, 0.07 * M2P, big, 2, rng)) { stroke(bg, st); stroke(bg, { ...st, press: 0.45, x0: st.x0 + 2 * K, x1: st.x1 + 2 * K }); }
  }
  // the weather: rain runs down the face and takes the chalk in streaks; the stone's grain takes it in specks
  bg.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 9; i++) {
    const x = rng() * PX, w = (0.03 + 0.09 * rng()) * M2P, gr = bg.createLinearGradient(0, 0, 0, PY);
    gr.addColorStop(0, `rgba(0,0,0,${(0.5 + 0.35 * rng()).toFixed(2)})`); gr.addColorStop(1, 'rgba(0,0,0,0.04)');
    bg.fillStyle = gr; bg.fillRect(x, 0, w, PY * (0.45 + 0.55 * rng()));
  }
  bg.fillStyle = '#000';
  for (let i = 0; i < 30000; i++) { bg.globalAlpha = 0.25 + 0.75 * rng(); const sz = (1 + 2 * rng()) * K; bg.fillRect(rng() * PX, rng() * PY, sz, sz * (0.6 + rng())); }
  bg.globalAlpha = 1; bg.globalCompositeOperation = 'source-over';
  g.drawImage(base, 0, 0);

  // ------------------------------------------------------------------ the visitor's strokes: their own gates
  // In saffron chalk, forearm-long, in gates of five in the clear place: the first gate just left of where the seat
  // comes down, each next gate to its left, three rows, then over them again. The k-th stroke's place and grain are
  // a pure function of k, so a reload puts each where it was and draws it the same.
  const mine = { L: 0.38 * M2P, w: 0.034 * M2P, gap: 0.085 * M2P, slant: 0.05, jit: 0.04, press: 1.1, hook: 3, bar: 1.1, col: SAFFRON };
  const gw = gateW(mine) + 0.17 * M2P, VR = [1.8, 1.25, 0.76], GX0 = hx(-0.4);
  const perRow = Math.floor((GX0 - hx(-3.45)) / gw) + 1;
  // gate gi's top-left on the canvas
  function gateAt(gi) {
    const j = gi % perRow, row = Math.floor(gi / perRow) % VR.length, cyc = Math.floor(gi / (perRow * VR.length));
    return { x: GX0 - j * gw + (cyc % 3) * 0.05 * M2P, y: hy(VR[row]) + (cyc % 2) * 0.05 * M2P };
  }
  function visitorStroke(k) {
    const gi = Math.floor(k / 5), i = k % 5, G = gateAt(gi);
    const r = ctx.makeRng(2000 + gi);
    const s = gate(G.x + (r() - 0.5) * 6 * K, G.y + (r() - 0.5) * 5 * K, mine, 5, r)[i];
    return { ...s, rng: ctx.makeRng(3000 + k), dust: true };
  }
  let visitors = 0;
  const drawVisitors = (n) => { g.clearRect(0, 0, PX, PY); g.drawImage(base, 0, 0); for (let k = Math.max(0, n - MAXV); k < n; k++) stroke(g, visitorStroke(k)); };

  // ------------------------------------------------------------------ the decal, and the overlay a stroke is drawn on
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const chalkMat = (map, offset) => new THREE.MeshStandardMaterial({
    map, transparent: true, depthWrite: false, roughness: 1, metalness: 0,
    emissive: new THREE.Color('#d8cdb8'), emissiveMap: map, emissiveIntensity: 0.5,
    polygonOffset: true, polygonOffsetFactor: offset, polygonOffsetUnits: offset,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(WM, HM), chalkMat(tex, -2));
  mesh.name = 'waystation-tally';
  mesh.receiveShadow = true;
  mesh.applyMatrix4(at((X0 + X1) / 2, Y0 + HM / 2, zf + 0.012));
  group.add(mesh);
  const OS = Math.round(160 * K); // the overlay's canvas, px (0.75 m)
  const ocv = document.createElement('canvas'); ocv.width = OS; ocv.height = OS;
  const og = ocv.getContext('2d');
  const otex = new THREE.CanvasTexture(ocv);
  otex.colorSpace = THREE.SRGBColorSpace; otex.generateMipmaps = false; otex.minFilter = THREE.LinearFilter;
  const omat = chalkMat(otex, -4);
  const overlay = new THREE.Mesh(new THREE.PlaneGeometry(OS / M2P, OS / M2P), omat);
  overlay.name = 'waystation-tally-stroke'; overlay.visible = false; overlay.renderOrder = 1;
  group.add(overlay);
  // canvas px -> local frame on the face
  const lx = (px) => X0 + px / M2P, ly = (py) => Y0 + HM - py / M2P;

  // ------------------------------------------------------------------ the chalk on its cord
  // A stub of the Late folk's saffron on a cord from an iron staple driven into the stone over the visitor's gate,
  // so the chalk, the offer and the stroke are one place. The rig is in the slab's frame (x along the face, y up,
  // z out of it); the staple is set over the gate the next stroke belongs to, when the wall is drawn (a load, a
  // forget), so it moves along as the visitor's gates grow.
  const rig = new THREE.Group(); rig.name = 'waystation-chalk'; rig.applyMatrix4(M0);
  group.add(rig);
  const ironM = new THREE.MeshStandardMaterial({ color: o.iron, roughness: 0.6, metalness: 0.6 });
  const cordM = new THREE.MeshStandardMaterial({ color: '#8a7a5a', roughness: 1 });
  const stubM = new THREE.MeshStandardMaterial({ color: '#f2c878', roughness: 0.9, emissive: new THREE.Color('#5a3c14'), emissiveIntensity: 1 });
  const staple = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.035, 0.06), ironM);
  const cordG = new THREE.CylinderGeometry(0.006, 0.006, 1, 4, 1); cordG.translate(0, -0.5, 0); // hangs down from its top, length 1
  const cord = new THREE.Mesh(cordG, cordM);
  const stubG = new THREE.CylinderGeometry(0.024, 0.029, 0.14, 8, 1); stubG.translate(0, -0.07, 0); // its butt at the origin, its tip down
  const stub = new THREE.Mesh(stubG, stubM);
  staple.castShadow = stub.castShadow = true;
  rig.add(staple, cord, stub);
  const LC = 0.66, PR = 0.035; // the cord's length; the angle it hangs out from the stone at rest
  const S = new THREE.Vector3(); // the cord's top, under the staple
  const butt = new THREE.Vector3(), tipDir = new THREE.Vector3(0, -1, 0), DOWN = new THREE.Vector3(0, -1, 0);
  const WRITE = new THREE.Vector3(0.12, -0.45, -0.85).normalize(); // a hand holds chalk like this: tip into the stone, a little down
  function hang() { butt.set(S.x, S.y - LC * Math.cos(PR), S.z + LC * Math.sin(PR)); tipDir.copy(DOWN); }
  function placeStaple(k) { // over gate k / 5, toward its right end
    const G = gateAt(Math.floor(k / 5));
    const x = lx(G.x + gateW(mine) * 0.6), top = ly(G.y) + 0.24;
    staple.position.set(x, top + 0.02, zf + 0.03);
    S.set(x, top, zf + 0.04);
    hang(); pose();
  }
  const q = new THREE.Quaternion(), qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), dv = new THREE.Vector3();
  function pose() { // stub at butt pointing along tipDir; the cord straight from S to the butt
    stub.position.copy(butt); stub.quaternion.setFromUnitVectors(DOWN, tipDir);
    dv.copy(butt).sub(S); const len = dv.length();
    cord.position.copy(S); cord.quaternion.setFromUnitVectors(DOWN, dv.divideScalar(len || 1)); cord.scale.set(1, len, 1);
  }

  // the dust: grains that fall from the chalk's tip while it bites, catching the light, and are gone in a second
  const ND = 48, dpos = new Float32Array(ND * 3), dcol = new Float32Array(ND * 3), dvel = new Float32Array(ND * 3), dlife = new Float32Array(ND);
  const dGeo = new THREE.BufferGeometry();
  dGeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3)); dGeo.setAttribute('color', new THREE.BufferAttribute(dcol, 3));
  const dust = new THREE.Points(dGeo, new THREE.PointsMaterial({ size: 0.022, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  dust.name = 'waystation-chalk-dust'; dust.frustumCulled = false; dust.visible = false;
  rig.add(dust);
  const drng = ctx.makeRng(1001);
  let dnext = 0, dlive = 0;
  function emit(p) {
    const i = dnext; dnext = (dnext + 1) % ND;
    dpos[i * 3] = p.x + (drng() - 0.5) * 0.02; dpos[i * 3 + 1] = p.y + (drng() - 0.5) * 0.02; dpos[i * 3 + 2] = p.z + 0.01 + drng() * 0.02;
    dvel[i * 3] = (drng() - 0.5) * 0.12; dvel[i * 3 + 1] = -0.05 - drng() * 0.1; dvel[i * 3 + 2] = 0.02 + drng() * 0.08;
    dlife[i] = 0.9 + drng() * 0.8;
  }
  function stepDust(dt) {
    dlive = 0;
    for (let i = 0; i < ND; i++) {
      if (dlife[i] <= 0) { dcol[i * 3] = dcol[i * 3 + 1] = dcol[i * 3 + 2] = 0; continue; }
      dlife[i] -= dt; dlive++;
      dvel[i * 3 + 1] -= 0.9 * dt; // chalk dust falls slowly
      for (let a = 0; a < 3; a++) dpos[i * 3 + a] += dvel[i * 3 + a] * dt;
      const f = Math.max(0, Math.min(1, dlife[i] / 0.7)) * 0.9;
      dcol[i * 3] = 1 * f; dcol[i * 3 + 1] = 0.86 * f; dcol[i * 3 + 2] = 0.6 * f;
    }
    dGeo.attributes.position.needsUpdate = true; dGeo.attributes.color.needsUpdate = true;
  }

  // ------------------------------------------------------------------ the act
  const nrm = new THREE.Vector3(0, 0, 1).transformDirection(M0); // the face's outward normal in the world
  const centre = new THREE.Vector3((X0 + X1) / 2, Y0 + HM / 2, zf).applyMatrix4(M0);
  const ex = new THREE.Vector3(1, 0, 0).transformDirection(M0); // along the face
  const next = { x: 0, y: 0, z: 0, along: 0 }; // where the next stroke goes, in the world; the act's `at`
  const tmp = new THREE.Vector3();
  function aim() {
    const s = visitorStroke(visitors);
    tmp.set(lx((s.x0 + s.x1) / 2), ly((s.y0 + s.y1) / 2), zf).applyMatrix4(M0);
    next.x = tmp.x; next.y = tmp.y; next.z = tmp.z;
    next.along = (tmp.x - centre.x) * ex.x + (tmp.z - centre.z) * ex.z;
  }
  // facing: the look, held level, meets the face within 1.4 m of where the next stroke goes, and the pitch has that
  // spot in the upper or lower part of the view, so the stroke is always drawn where the visitor is looking
  function facing(P) {
    const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw);
    const into = -(fx * nrm.x + fz * nrm.z);
    if (into < 0.45) return false;
    const d = (P.pos.x - centre.x) * nrm.x + (P.pos.z - centre.z) * nrm.z; // metres out from the face
    const hx2 = P.pos.x + fx * d / into - centre.x, hz2 = P.pos.z + fz * d / into - centre.z;
    if (Math.abs(hx2 * ex.x + hz2 * ex.z - next.along) > 1.4) return false;
    const el = Math.atan2(next.y - P.pos.y, Math.max(0.3, d));
    return Math.abs(P.pitch - el) < 0.42;
  }
  // The stroke is made by the chalk: it lifts on its cord to the stone (TL), draws the stroke top to bottom (TD; the
  // bar a little longer) with dust falling from its tip, is let go and swings on its cord, settling over a few
  // seconds. The stroke grows on the overlay as the tip passes; it stays there, brighter than the wall (fresh chalk),
  // fading to the wall's own over FRESH seconds, and then goes onto the wall in one upload.
  const TL = 0.55, TD = 1.3, TDB = 1.55, SWING = 10, FRESH = 25, TAU = 2.2, OMEGA = (2 * Math.PI) / 1.6;
  let drawing = null; // { d (dabs), i (painted), s (the stroke), t, td, ox, oy, a: lift start butt, ta (tip dir at start) }
  let fresh = -1, swing = -1;
  const sw = { th: 0, ph: 0 }, p0 = new THREE.Vector3(), p1 = new THREE.Vector3(), lift0 = new THREE.Vector3(), tip = new THREE.Vector3();
  const sCanvas = (s, u, out) => out.set(lx(s.x0 + (s.x1 - s.x0) * u), ly(s.y0 + (s.y1 - s.y0) * u), zf + 0.006);
  function bake() { // the fresh stroke onto the wall
    if (fresh < 0) return;
    paint(g, SAFFRON, drawing ? drawing.d : bakeD); tex.needsUpdate = true;
    overlay.visible = false; fresh = -1; bakeD = null;
  }
  let bakeD = null;
  function finish() { // a stroke being drawn goes straight onto the wall; the chalk hangs again
    if (drawing) { bakeD = drawing.d; drawing = null; fresh = 0; }
    bake(); swing = -1; dust.visible = false; dlife.fill(0); hang(); pose();
  }
  const ease = (x) => x * x * (3 - 2 * x);
  ctx.registerUpdate((dt) => {
    if (!drawing && swing < 0 && fresh < 0 && !dust.visible) return; // nothing being done: nothing per frame
    if (drawing) {
      const D = drawing; D.t += dt;
      if (D.t < TL) { // the lift: from where it hangs, out from the stone and to the stroke's top
        const u = ease(D.t / TL);
        sCanvas(D.s, 0, p1); tip.copy(p1); p1.addScaledVector(WRITE, -0.14);
        p0.copy(lift0).lerp(p1, u); p0.z += Math.sin(Math.PI * u) * 0.12; butt.copy(p0);
        qa.setFromUnitVectors(DOWN, D.ta); qb.setFromUnitVectors(DOWN, WRITE); q.slerpQuaternions(qa, qb, u);
        tipDir.copy(DOWN).applyQuaternion(q); pose();
      } else if (D.t < TL + D.td) { // the drawing: the tip down the stroke, the stroke growing behind it
        if (!D.cued) { D.cued = true; tmp.copy(butt).applyMatrix4(M0); ctx.audio?.cue('act-chalk', { x: tmp.x, y: tmp.y, z: tmp.z }, { bar: !!D.s.bar, dur: D.td }); }
        const u = Math.min(1, (D.t - TL) / D.td), uu = u < 0.08 ? u * u / 0.16 : u - 0.04 + 0.04 * Math.min(1, (u - 0.08) / 0.92); // a bite, then steady
        sCanvas(D.s, Math.min(1, uu), tip);
        const wob = Math.sin(D.t * 31) * 0.003;
        butt.copy(tip).addScaledVector(WRITE, -0.14); butt.x += wob; tipDir.copy(WRITE); pose();
        const n = D.d.length / 5, b = Math.min(D.nStroke, Math.ceil(uu * D.nStroke));
        if (b > D.i) { paint(og, SAFFRON, D.d, D.i, b, D.ox, D.oy); D.i = b; otex.needsUpdate = true; }
        if (drng() < dt * 40) emit(tip);
        if (u >= 1 && D.i < n) { paint(og, SAFFRON, D.d, D.i, n, D.ox, D.oy); D.i = n; otex.needsUpdate = true; } // the dust under it
      } else if (D.t > TL + D.td + 0.12) { // let go: it swings on its cord from where it is
        dv.copy(butt).sub(S);
        sw.th = Math.atan2(dv.x, -dv.y); sw.ph = Math.atan2(dv.z, -dv.y);
        bakeD = D.d; drawing = null; fresh = 0; swing = 0;
      }
    }
    if (swing >= 0) {
      swing += dt;
      const k = Math.exp(-swing / TAU) * Math.cos(OMEGA * swing);
      const th = sw.th * k, ph = Math.max(0.012, PR + (sw.ph - PR) * Math.exp(-swing / (TAU * 0.6)) * Math.cos(OMEGA * swing));
      butt.set(S.x + LC * Math.sin(th), S.y - LC * Math.cos(th) * Math.cos(ph), S.z + LC * Math.sin(ph));
      dv.copy(butt).sub(S).normalize();
      const u = Math.min(1, swing / 0.35); // from the writing angle to hanging along its cord
      tipDir.copy(WRITE).lerp(dv, ease(u)).normalize(); pose();
      if (swing > SWING) { swing = -1; hang(); pose(); }
    }
    if (fresh >= 0) {
      fresh += dt;
      omat.emissiveIntensity = 0.5 + 0.9 * Math.exp(-fresh / (FRESH * 0.35));
      if (fresh > FRESH) bake();
    }
    if (drawing || dlive > 0) { dust.visible = true; stepDust(dt); } else dust.visible = false;
  }, { pos: { x: centre.x, z: centre.z }, near: 60, hz: 2 });

  const handle = ctx.acts?.add({
    id: ID, at: next, reach: 3.4, face: { x: nrm.x, z: nrm.z }, facing,
    words: 'Chalk your stroke', every: 'visit',
    show(count) { visitors = count; drawing = null; fresh = -1; bakeD = null; overlay.visible = false; swing = -1; drawVisitors(count); tex.needsUpdate = true; aim(); placeStaple(count); },
    do(count) {
      finish(); // one still being drawn (or fresh) goes straight onto the wall
      visitors = count;
      const s = visitorStroke(count - 1), d = dabs(s);
      const mx = (s.x0 + s.x1) / 2, my = (Math.min(s.y0, s.y1) + Math.max(s.y0, s.y1)) / 2 + 0.02 * M2P;
      lift0.copy(butt);
      drawing = { d, s, i: 0, t: 0, td: s.bar ? TDB : TD, ox: mx - OS / 2, oy: my - OS / 2, ta: tipDir.clone(), nStroke: d.length / 5 - (s.dust ? 26 : 0), cued: false };
      og.clearRect(0, 0, OS, OS); otex.needsUpdate = true; omat.emissiveIntensity = 1.4;
      overlay.position.copy(tmp.set(lx(mx), ly(my), zf + 0.016).applyMatrix4(M0).sub(group.position));
      overlay.quaternion.setFromRotationMatrix(M0); overlay.visible = true;
      aim();
      return TL + drawing.td + 0.3; // busy while the chalk is at the stone
    },
  });
  if (!handle || ctx.acts?.off) { aim(); placeStaple(0); }
  const world = (v) => v.clone().applyMatrix4(M0);
  return (ctx.tally = {
    wall, rows, get visitor() { return visitors; }, strokes: () => wall + visitors, mesh, overlay, centre, normal: nrm, next,
    // where a visitor stands to chalk: d metres out in front of where the next stroke goes, looking at it
    stand(d = 2.4) {
      const p = { x: next.x + nrm.x * d, z: next.z + nrm.z * d };
      return { x: p.x, z: p.z, yaw: Math.atan2(nrm.x, nrm.z), pitch: Math.atan2(next.y - (ctx.terrain.heightAt(p.x, p.z) + ctx.player.eye), d) };
    },
    // the canvas position of the k-th visitor stroke's middle, in metres along and up the face (for the tests)
    strokeAt(k) { const s = visitorStroke(k); return { along: lx((s.x0 + s.x1) / 2) - (X0 + X1) / 2, up: ly((s.y0 + s.y1) / 2) - Y0 }; },
    // the chalk: its staple and the stub's butt in the world (for the tests: the chalk sits over the next stroke)
    chalk: { staple: () => world(S), stub: () => world(butt), get swinging() { return swing >= 0; } },
    get drawing() { return !!drawing; },
    get fresh() { return fresh >= 0; },
    strokeEnd: () => TL + TD,
  });
}
