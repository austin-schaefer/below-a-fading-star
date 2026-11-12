// The travellers' tally at the Lantern Halt (v10-A0, #24): the first act, and the example in the `world-code`
// skill's "Acts". Everyone who slept in the lantern chalked a stroke on the slab's face, in fives, row under row,
// each in their own hand: the oldest rows high up, washed thin by the rain; the newest low, still white. A few counted
// in boxes, a few had only a coal from the lamp or the red earth by the trough. Above them the Late folk chalked the
// halt's own sign large, the V with the lamp hung in it, ruled a line, and kept their own count of the hundreds in
// strokes as long as a forearm. A stub of saffron chalk hangs on a cord from an iron staple, the Late folk's colour.
// Standing at the wall and looking at where the last row ends, the visitor is offered it ("Chalk your stroke");
// their stroke is drawn there in saffron, over half a second, with a fall of dust under it, and kept (one a visit):
// on a return visit their own gates stand a little apart at the end of the rows, the only saffron on the wall.
//
// One draw for the wall: a decal on the face, a CanvasTexture of all of it (1536 x 614, about 4.7 mm a pixel; half
// that on the low tier), drawn once at build from ctx.makeRng. A stroke being drawn goes on a small overlay quad of
// its own (160 px square, no mipmaps), uploaded each frame of the half second; the wall is uploaded once when the
// stroke is done, and when the marks are forgotten. Its emissive share is chalk catching the sky: the face looks
// east, away from the sun, and in its shadow plain chalk would read as nothing from the road. The chalk stub and its
// staple go into the waystation's furniture Builder (no draw of their own).
//
// buildTally(ctx, o) is called by src/v9/waystation.js with its frame: { M0 (the slab's matrix), W (its site), foot,
// gAt(x, z) (ground, local), at(...) (a local frame), B (the furniture Builder), late(color, o) (its material
// options), group, iron }. Returns ctx.tally: { wall, visitor, strokes(), stand(), next(), centre, normal, mesh }.
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
      for (const st of gate(x, rowY(row, rng), h, n, rng)) stroke(bg, st);
      wall += n;
      cursor.row = row; cursor.x = x + w; cursor.y = TOP + row * ROW;
      x += w + (0.04 + 0.09 * rng()) * M2P + (rng() < 0.1 ? 0.2 * M2P : 0);
      if (n < 5) break;
    }
  }
  // a few marks beside the counts: a hand's sign after its gate (a ring, a cross, a hook), as people sign
  for (let i = 0; i < 12; i++) {
    const x = LEFT + 20 * K + rng() * (RIGHT - LEFT - 60 * K), y = TOP + Math.floor(rng() * (OWN_ROWS - 1)) * ROW + ROW * 0.86;
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
  // In saffron chalk, set a little apart after the last row's end, gate after gate, then on along the free row, then
  // over the oldest rows from the top. The k-th stroke's place and grain are a pure function of k, so a reload puts
  // each where it was and draws it the same.
  const mine = { L: 0.27 * M2P, w: 0.028 * M2P, gap: 0.068 * M2P, slant: 0.05, jit: 0.05, press: 1.05, hook: 3, bar: 1.1, col: SAFFRON };
  const gw = gateW(mine) + 0.1 * M2P, startX = cursor.x + 0.3 * M2P;
  const perRow0 = Math.max(0, Math.floor((RIGHT - startX) / gw)), perRow = Math.floor((RIGHT - LEFT) / gw);
  function visitorStroke(k) {
    const gi = Math.floor(k / 5), i = k % 5;
    let row, x;
    if (gi < perRow0) { row = cursor.row; x = startX + gi * gw; }
    else { const j = gi - perRow0; row = cursor.row + 1 + Math.floor(j / perRow); x = LEFT + (j % perRow) * gw; }
    if (row >= rows) row = (row - rows) % rows; // the wall is full: over the old ones, from the top again
    const r = ctx.makeRng(2000 + gi);
    const s = gate(x + (r() - 0.5) * 6 * K, TOP + row * ROW + (r() - 0.5) * 5 * K, mine, 5, r)[i];
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
  const overlay = new THREE.Mesh(new THREE.PlaneGeometry(OS / M2P, OS / M2P), chalkMat(otex, -4));
  overlay.name = 'waystation-tally-stroke'; overlay.visible = false; overlay.renderOrder = 1;
  group.add(overlay);
  // canvas px -> local frame on the face
  const lx = (px) => X0 + px / M2P, ly = (py) => Y0 + HM - py / M2P;

  // the chalk: a stub of the Late folk's saffron on a cord from an iron staple, between the bench's end and the winch
  {
    const sx = -0.95, sy = Y0 + 1.5;
    B.add(B.box(0.1, 0.03, 0.05), at(sx, sy, zf + 0.025), late(o.iron, { iron: 0.8 }));
    B.add(B.cyl(0.006, 0.006, 0.42, 4, 1), at(sx, sy - 0.21, zf + 0.04, 0, 0, 0.03), late(new THREE.Color('#8a7a5a')));
    B.add(B.cyl(0.022, 0.026, 0.11, 7, 1), at(sx + 0.006, sy - 0.47, zf + 0.045, 0.05, 0, 0.06), late(new THREE.Color('#f2c878'), { emit: [0.3, 0.22, 0.1, 1] }));
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
    const hx = P.pos.x + fx * d / into - centre.x, hz = P.pos.z + fz * d / into - centre.z;
    if (Math.abs(hx * ex.x + hz * ex.z - next.along) > 1.4) return false;
    const el = Math.atan2(next.y - P.pos.y, Math.max(0.3, d));
    return Math.abs(P.pitch - el) < 0.42;
  }
  // a stroke drawn over half a second on the overlay, with the scrape of chalk; then onto the wall in one upload
  let drawing = null;
  const DRAW = 0.55;
  function finish() {
    if (!drawing) return;
    paint(g, SAFFRON, drawing.d);
    tex.needsUpdate = true;
    overlay.visible = false; drawing = null;
  }
  ctx.registerUpdate((dt) => {
    if (!drawing) return;
    const n = drawing.d.length / 5;
    drawing.t = Math.min(1, drawing.t + dt / drawing.len);
    const b = Math.ceil(drawing.t * n);
    paint(og, SAFFRON, drawing.d, drawing.i, b, drawing.ox, drawing.oy); drawing.i = b;
    otex.needsUpdate = true;
    if (drawing.t >= 1) finish();
  }, { pos: { x: centre.x, z: centre.z }, near: 60, hz: 2 });

  const handle = ctx.acts?.add({
    id: ID, at: next, reach: 3.4, face: { x: nrm.x, z: nrm.z }, facing,
    words: 'Chalk your stroke', every: 'visit',
    show(count) { visitors = count; drawing = null; overlay.visible = false; drawVisitors(count); tex.needsUpdate = true; aim(); },
    do(count) {
      finish(); // one still being drawn goes straight onto the wall
      visitors = count;
      const s = visitorStroke(count - 1), d = dabs(s);
      const mx = (s.x0 + s.x1) / 2, my = (Math.min(s.y0, s.y1) + Math.max(s.y0, s.y1)) / 2 + 0.02 * M2P;
      drawing = { d, t: 0, i: 0, len: s.bar ? DRAW * 1.15 : DRAW, ox: mx - OS / 2, oy: my - OS / 2 };
      og.clearRect(0, 0, OS, OS); otex.needsUpdate = true;
      overlay.position.copy(tmp.set(lx(mx), ly(my), zf + 0.016).applyMatrix4(M0).sub(group.position));
      overlay.quaternion.setFromRotationMatrix(M0); overlay.visible = true;
      aim();
      ctx.audio?.cue('act-chalk', { x: next.x, y: next.y, z: next.z }, { bar: !!s.bar });
      return drawing.len + 0.1; // busy while the stroke is drawn
    },
  });
  if (!handle || ctx.acts?.off) aim();
  return (ctx.tally = {
    wall, rows, get visitor() { return visitors; }, strokes: () => wall + visitors, mesh, overlay, centre, normal: nrm, next,
    // where a visitor stands to chalk: 1.6 m out in front of where the next stroke goes, looking at it
    stand(d = 1.6) {
      const p = { x: next.x + nrm.x * d, z: next.z + nrm.z * d };
      return { x: p.x, z: p.z, yaw: Math.atan2(nrm.x, nrm.z), pitch: Math.atan2(next.y - (ctx.terrain.heightAt(p.x, p.z) + ctx.player.eye), d) };
    },
    // the canvas position of the k-th visitor stroke's middle, in metres along and up the face (for the tests)
    strokeAt(k) { const s = visitorStroke(k); return { along: lx((s.x0 + s.x1) / 2) - (X0 + X1) / 2, up: ly((s.y0 + s.y1) / 2) - Y0 }; },
    get drawing() { return !!drawing; },
  });
}
