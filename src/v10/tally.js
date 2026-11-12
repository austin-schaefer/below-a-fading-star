// The travellers' tally at the Lantern Halt (v10-A0, #24): the first act, and the example in the `world-code`
// skill's "Acts". Everyone who slept in the lantern chalked a stroke on the slab's face, in fives, row under row,
// each in their own hand: the oldest rows high up, washed thin by the rain; the newest low, still white. Above them
// the Late folk chalked the halt's own sign, the V with the lamp hung in it. A stub of chalk hangs on a cord from an
// iron staple at the wall's left edge. Standing at the wall and looking at it, the visitor is offered the chalk
// ("Chalk your stroke", ctx.acts); their stroke is drawn where the last row ends, over half a second, whiter than the
// rest, and kept (one a visit), so it is there when they come back and the rows grow.
//
// One draw: a decal on the face, a CanvasTexture of the whole wall (1536 x 614, about 4.7 mm a pixel), drawn once at
// build from ctx.makeRng; the visitor's strokes are drawn over a copy of it. The texture is uploaded only while a
// stroke is being drawn (about 30 frames) or when the marks are forgotten. Its emissive share is chalk catching the
// sky: the face looks east, away from the sun, and in its shadow plain chalk would read as nothing from the road.
// The chalk stub and its staple go into the waystation's furniture Builder (no draw of their own).
//
// buildTally(ctx, o) is called by src/v9/waystation.js with its frame: { M0 (the slab's matrix), W (its site), foot,
// gAt(x, z) (ground, local), at(...) (a local frame), B (the furniture Builder), late(color, o) (its material
// options), group }. Returns { strokes(), wall, visitor(), mesh }; also ctx.tally for the tests.
import * as THREE from 'three';

const PX = 1536, PY = 614; // the canvas
const X0 = -3.55, X1 = 3.65; // the wall's extent along the face, local x: nearly all of it, over the bench too
const WM = X1 - X0, HM = WM * PY / PX; // metres: 7.2 x 2.88
const M2P = PX / WM; // pixels a metre
const ID = 'halt-tally';

export function buildTally(ctx, o) {
  const { M0, W, foot, gAt, at, B, late, group } = o;
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

  // the stone's grain: a fixed field of pits, a pixel each, that chalk skips over
  const pits = (x, y) => { const v = Math.sin(Math.floor(x) * 12.9898 + Math.floor(y) * 78.233) * 43758.5453; return v - Math.floor(v); };
  // one stroke of chalk: dabs along the line, heavier where the chalk first bites, thinning to the lift; the stone's
  // grain takes some away (see grain below). from t0 to t1 of its length, so a stroke can be drawn in parts.
  function stroke(c2, s, t0 = 0, t1 = 1) {
    const dx = s.x1 - s.x0, dy = s.y1 - s.y0, len = Math.hypot(dx, dy), n = Math.max(4, Math.round(len * 1.6));
    const nx = -dy / len, ny = dx / len;
    const r = s.rng;
    c2.fillStyle = s.col;
    for (let i = Math.floor(t0 * n); i < Math.ceil(t1 * n); i++) {
      const u = i / n, press = s.press * (u < 0.12 ? 0.75 + 2 * u : 1 - 0.55 * Math.pow(Math.max(0, u - 0.6) / 0.4, 1.5));
      // the hand's little hook at the end of a stroke
      const hook = u > 0.88 ? (u - 0.88) * s.hook : 0;
      const cx = s.x0 + dx * u + nx * hook, cy = s.y0 + dy * u + ny * hook;
      const nd = s.press > 1 ? 4 : s.press > 0.62 ? 3 : s.press > 0.38 ? 2 : 1; // a light hand leaves fewer grains
      for (let k = 0; k < nd; k++) {
        const off = (r() - 0.5) * s.w, a = press * (0.3 + 0.6 * r()), rr = s.w * (0.16 + 0.26 * r());
        const px = cx + nx * off, py = cy + ny * off;
        if (pits(px, py) < 0.3) continue; // the stone's pits: chalk skips them, the same pits for every hand
        c2.globalAlpha = Math.min(1, a);
        c2.fillRect(px - rr / 2, py - rr / 2, rr, rr * (1.2 + r()));
      }
    }
    c2.globalAlpha = 1;
  }

  // a hand: how one sleeper chalks. Older hands are fainter and warmer (dust and lichen in them). Most count in gates
  // of five; a few, from the far side of the saddle, count in boxes (four sides and the diagonal); a few had no chalk
  // and used a coal from the lamp, or the red earth by the trough.
  function hand(r, age) {
    const L = (0.17 + 0.15 * r()) * M2P; // stroke length
    const k = r(), ink = k < 0.09 ? 'coal' : k < 0.14 ? 'ochre' : 'chalk';
    const fade = 1 - 0.7 * age;
    const col = ink === 'coal' ? 'rgb(34,28,26)' : ink === 'ochre' ? `rgb(${Math.round(176 + 20 * fade)},${Math.round(92 + 18 * fade)},58)`
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
      const L = h.L * 0.8, j = () => (r() - 0.5) * 3;
      const c = [[x, y], [x + L, y], [x + L, y + L], [x, y + L]];
      const sides = [[0, 3], [0, 1], [1, 2], [3, 2]];
      for (let i = 0; i < Math.min(4, n); i++) { const [p, q] = sides[i]; S(c[p][0] + j(), c[p][1] + j(), c[q][0] + j(), c[q][1] + j()); }
      if (n >= 5) S(c[3][0] + j(), c[3][1] + j(), c[1][0] + j(), c[1][1] + j(), { bar: true, press: h.press * h.bar });
      return out;
    }
    for (let i = 0; i < Math.min(4, n); i++) {
      const sl = h.slant + (r() - 0.5) * h.jit, L = h.L * (0.92 + 0.16 * r());
      const xa = x + i * h.gap + (r() - 0.5) * 2, ya = y + (r() - 0.5) * 3;
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
  const ROW = 0.3 * M2P, TOP = 0.5 * M2P, LEFT = 0.1 * M2P, RIGHT = PX - 0.08 * M2P;
  const rows = Math.floor((PY - TOP - 0.04 * M2P) / ROW); // the rows the wall holds
  let wall = 0;
  const cursor = { row: 0, x: LEFT };
  const OWN_ROWS = rows - 1; // the last row is left for the visitors who come after
  const rowY = (row, r) => TOP + row * ROW + (r() - 0.5) * 7;
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
      const n = last && x + w * 2.4 > end ? 3 : 5; // the last gate unfinished: the next sleeper finishes it
      for (const st of gate(x, rowY(row, rng), h, n, rng)) stroke(bg, st);
      wall += n;
      cursor.row = row; cursor.x = x + h.gap * n; cursor.h = h; cursor.n = n; cursor.y = TOP + row * ROW;
      x += w + (0.04 + 0.09 * rng()) * M2P + (rng() < 0.1 ? 0.2 * M2P : 0);
      if (n < 5) break;
    }
  }
  // a few marks beside the counts: a hand's sign after its gate (a ring, a cross, a hook), as people sign
  for (let i = 0; i < 12; i++) {
    const x = LEFT + 20 + rng() * (RIGHT - LEFT - 60), y = TOP + Math.floor(rng() * (OWN_ROWS - 1)) * ROW + ROW * 0.86;
    const o = { w: 4, press: 0.35 + 0.3 * rng(), col: 'rgb(206,196,176)' }, k = i % 3, r = 5 + 3 * rng();
    if (k === 0) path(ring(x, y, r, 9), o);
    else if (k === 1) { path([[x - r, y - r], [x + r, y + r]], o); path([[x + r, y - r], [x - r, y + r]], o); }
    else path([[x, y - r * 1.4], [x, y + r * 0.6], [x + r * 0.5, y + r * 1.1], [x + r * 1.2, y + r * 0.8]], o);
  }
  // the Late folk's heading, top left: the halt's sign, the V with the lantern hung in its notch, a line under the
  // row of it, and the same sign small at the far end, where someone copied it
  {
    const o = { w: 9, press: 0.8, col: 'rgb(224,214,192)' };
    const sign = (cx, cy, s, oo) => {
      path([[cx - s, cy - s * 0.7], [cx - s * 0.5, cy], [cx, cy + s * 0.75], [cx + s * 0.5, cy], [cx + s, cy - s * 0.7]], oo);
      path(ring(cx, cy - s * 0.02, s * 0.36, 12), oo);
      path([[cx, cy - s * 0.95], [cx, cy - s * 0.4]], oo);
    };
    const cx = LEFT + 0.35 * M2P, cy = 0.24 * M2P, s = 0.19 * M2P;
    sign(cx, cy, s, o);
    const ln = []; for (let i = 0; i <= 16; i++) { const u = i / 16; ln.push([cx + s * 1.7 + u * (RIGHT - cx - s * 3.2), cy + s * 0.55 + Math.sin(u * 5.3) * 3 + u * 6]); }
    path(ln, { ...o, w: 5, press: 0.55 });
    sign(RIGHT - 0.12 * M2P, cy + 4, s * 0.55, { ...o, w: 4, press: 0.45 });
  }
  // the weather: rain runs down the face and takes the chalk in streaks; the stone's grain takes it in specks
  bg.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 9; i++) {
    const x = rng() * PX, w = (0.03 + 0.09 * rng()) * M2P, gr = bg.createLinearGradient(0, 0, 0, PY);
    gr.addColorStop(0, `rgba(0,0,0,${(0.5 + 0.35 * rng()).toFixed(2)})`); gr.addColorStop(1, 'rgba(0,0,0,0.04)');
    bg.fillStyle = gr; bg.fillRect(x, 0, w, PY * (0.45 + 0.55 * rng()));
  }
  bg.fillStyle = '#000';
  for (let i = 0; i < 30000; i++) { bg.globalAlpha = 0.25 + 0.75 * rng(); const sz = 1 + 2 * rng(); bg.fillRect(rng() * PX, rng() * PY, sz, sz * (0.6 + rng())); }
  bg.globalAlpha = 1; bg.globalCompositeOperation = 'source-over';
  g.drawImage(base, 0, 0);

  // ------------------------------------------------------------------ the visitor's strokes: where the last row ends
  // The k-th visitor stroke's place is a pure function of k (its gate's own rng), so a reload puts each where it was.
  const mine = { L: 0.27 * M2P, w: 0.028 * M2P, gap: 0.068 * M2P, slant: 0.05, jit: 0.05, press: 1.05, hook: 3, bar: 1.1, col: 'rgb(255,253,248)' };
  function visitorStroke(k) {
    // continue the last row's unfinished gate first, then whole gates of five after it, row under row
    const left = 5 - cursor.n;
    if (k < left) {
      const h = cursor.h, r = ctx.makeRng(1001 + k), i = cursor.n + k;
      const gx = cursor.x - h.gap * cursor.n;
      const ss = gate(gx, cursor.y, h, 5, r, mine.col);
      const s = ss[Math.min(i, 4)];
      return { ...s, w: mine.w, press: mine.press, col: mine.col };
    }
    const kk = k - left, gi = Math.floor(kk / 5), i = kk % 5;
    const gw = gateW(mine) + 0.1 * M2P;
    const startX = cursor.x + 0.12 * M2P, perRow0 = Math.max(0, Math.floor((RIGHT - startX) / gw)), perRow = Math.floor((RIGHT - LEFT) / gw);
    let row, x;
    if (gi < perRow0) { row = cursor.row; x = startX + gi * gw; }
    else { const j = gi - perRow0; row = cursor.row + 1 + Math.floor(j / perRow); x = LEFT + (j % perRow) * gw; }
    if (row >= rows) row = (row - rows) % rows; // the wall is full: over the old ones, from the top again
    const r = ctx.makeRng(2000 + gi);
    const ss = gate(x + (r() - 0.5) * 6, TOP + row * ROW + (r() - 0.5) * 5, mine, 5, r);
    return ss[i];
  }
  let visitors = 0;
  const drawVisitors = (n) => { g.clearRect(0, 0, PX, PY); g.drawImage(base, 0, 0); for (let k = 0; k < n; k++) stroke(g, visitorStroke(k)); };

  // ------------------------------------------------------------------ the decal
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const matl = new THREE.MeshStandardMaterial({
    map: tex, transparent: true, depthWrite: false, roughness: 1, metalness: 0,
    emissive: new THREE.Color('#d8cdb8'), emissiveMap: tex, emissiveIntensity: 0.5,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(WM, HM), matl);
  mesh.name = 'waystation-tally';
  mesh.receiveShadow = true;
  mesh.applyMatrix4(at((X0 + X1) / 2, Y0 + HM / 2, zf + 0.012));
  group.add(mesh);

  // the chalk: a stub on a cord from an iron staple at the wall's left edge, worn to a slant at its end
  {
    const sx = -0.95, sy = Y0 + 1.5; // between the bench's end and the winch
    B.add(B.box(0.1, 0.03, 0.05), at(sx, sy, zf + 0.025), late(o.iron, { iron: 0.8 }));
    B.add(B.cyl(0.006, 0.006, 0.42, 4, 1), at(sx, sy - 0.21, zf + 0.04, 0, 0, 0.03), late(new THREE.Color('#8a7a5a')));
    B.add(B.cyl(0.022, 0.026, 0.11, 7, 1), at(sx + 0.006, sy - 0.47, zf + 0.045, 0.05, 0, 0.06), late(new THREE.Color('#ece6d6'), { emit: [0.22, 0.21, 0.19, 1] }));
  }

  // ------------------------------------------------------------------ the act
  // the face's outward normal in the world, and the wall's centre
  const nrm = new THREE.Vector3(0, 0, 1).transformDirection(M0);
  const centre = new THREE.Vector3((X0 + X1) / 2, Y0 + HM / 2, zf).applyMatrix4(M0);
  const ex = new THREE.Vector3(1, 0, 0).transformDirection(M0); // along the face
  // facing: the look, held level, meets the face within the wall's width (and a little past its ends)
  function facing(P) {
    const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw);
    const into = -(fx * nrm.x + fz * nrm.z);
    if (into < 0.35) return false;
    const d = (P.pos.x - centre.x) * nrm.x + (P.pos.z - centre.z) * nrm.z; // metres out from the face
    const hx = P.pos.x + fx * d / into - centre.x, hz = P.pos.z + fz * d / into - centre.z;
    return Math.abs(hx * ex.x + hz * ex.z) < WM / 2 + 0.4 && P.pitch > -0.9 && P.pitch < 0.75;
  }
  // a stroke drawn over half a second, with the scrape of chalk
  let drawing = null;
  const DRAW = 0.55;
  ctx.registerUpdate((dt) => {
    if (!drawing) return;
    const a = drawing.t, b = Math.min(1, (drawing.t += dt / (drawing.s.bar ? DRAW * 1.15 : DRAW)));
    stroke(g, drawing.s, a, b);
    tex.needsUpdate = true;
    if (b >= 1) drawing = null;
  }, { pos: { x: centre.x, z: centre.z }, near: 60, hz: 2 });

  ctx.acts?.add({
    id: ID, at: { x: centre.x, y: centre.y, z: centre.z }, reach: 4.6, face: { x: nrm.x, z: nrm.z }, facing,
    words: 'Chalk your stroke', every: 'visit',
    show(count) { visitors = count; drawing = null; drawVisitors(count); tex.needsUpdate = true; },
    do(count) {
      if (drawing) stroke(g, drawing.s, drawing.t, 1); // finish one still being drawn
      visitors = count;
      drawing = { s: visitorStroke(count - 1), t: 0 };
      ctx.audio?.cue('act-chalk', { x: centre.x, y: centre.y, z: centre.z }, { bar: drawing.s.bar });
    },
  });
  const api = ctx.tally = {
    wall, rows, get visitor() { return visitors; }, strokes: () => wall + visitors, mesh, centre, normal: nrm,
    // where a visitor stands to chalk: in front of the last row's end, 1.6 m out, looking at the wall
    stand() { const s = visitorStroke(visitors); const lx = X0 + s.x0 / M2P; const p = new THREE.Vector3(lx, 0, zf + 1.6).applyMatrix4(M0); return { x: p.x, z: p.z, yaw: Math.atan2(nrm.x, nrm.z) }; },
    get drawing() { return !!drawing; },
  };
  return api;
}
