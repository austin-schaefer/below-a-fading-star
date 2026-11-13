// Thread 5, the painter (v8-08; briefs/v8/index.md, briefs/v8/brief-v8-08-painter.md): the Unfinished Prospect (v5) is
// the last of a painter's attempts at this country. On the way to it stand the others, each where he gave it up, its
// face to the track and the view it failed at behind it:
//   - on P8, a primed canvas on a broken easel (one leg snapped, the stub stood on two stones), with one confident
//     crimson line across it: the ridge and the saddle's notch, and nothing else;
//   - on P10, stood on a heap of flat stones: an ember sky in which the sun has been painted five times, each lower than the
//     last as it sank while he worked, the first four scraped out to ghosts;
//   - by P10's junction, on its easel: the keep under the sun, quite good, slashed corner to corner, the upper flap
//     hanging forward, the palette knife stuck in the turf;
//   - on P22 beyond the Prospect: the Arcature under the twin peaks, kicked through, leaning back on a stone, the easel
//     kicked over beside it.
// Between them on the tracks: a squeezed tube, a brush snapped in two, a rag. The Prospect gains the same smock's rag
// on its stool. East of the Prospect sits the painter, alive, on his pack, his back squarely to the view and the sun,
// painting a medlar on a stone with enormous care, his smock stiff with every colour of the abandoned canvases. Come
// within 6 m and he turns to you and clutches the little picture to his chest.
// The paintings are drawn in code into one 1024 x 512 CanvasTexture (eight 256 px cells), crude on purpose.
// Draws: the props (one vertex-coloured mesh), the paintings (one unlit mesh on the atlas), the painter's legs and pack,
// his body and arms (turns), his head (looks), his hands and the little canvas (two: vertex colours and the atlas).
import * as THREE from 'three';
import { PAINTER } from './plan.js';
import { Acc, frame, local, ellipsoid, rod, boxAt, finish } from './kit.js';
import { prospectAt, PROSPECT } from '../../v5/dressing/prospect.js';
import { SUN } from '../../world.js';

// the walk's palette on his canvases, and the same paint on his smock, his rag and his tubes
const PAINT = { ember: '#d0561e', crimson: '#9a2226', violet: '#4c3a70', moss: '#5e6e2a', blue: '#6a8ab8', saffron: '#e0b040', cream: '#ece2c8', black: '#1e1a22' };
const DABS = Object.values(PAINT);
// the Prospect's palette (prospect.js, its dried dishes): the tubes on the road are the same colours
const PROSPECT_PIGMENTS = ['#8a6a32', '#4b3425', '#47586a', '#5b6847', '#6d3b34'];
const LINEN = '#b9a98a', WOOD = '#7a5a3a', WOOD_D = '#5a4430', STONE = '#6e6862', SPLINTER = '#c4a878';
const ANTI_SUN = Math.atan2(-SUN.dir.x, -SUN.dir.z); // a yaw whose +z points away from the sun

// ---------------------------------------------------------------- the paintings (an atlas of 256 x 192 pictures)
const AW = 1024, AH = 512, CW = 256, CH = 192;
const CELL = { line: 0, suns: 1, slash: 2, kicked: 3, medlar: 4 };
function cellUV(i) { // u0, v0 (bottom), u1, v1 (top) of a cell's picture
  const c = i % 4, r = Math.floor(i / 4), top = r * 256 + 32;
  return [c * 256 / AW, 1 - (top + CH) / AH, (c + 1) * 256 / AW, 1 - top / AH];
}
function paintAtlas(rng) {
  const cv = document.createElement('canvas'); cv.width = AW; cv.height = AH;
  const g = cv.getContext('2d');
  g.fillStyle = '#d8ccb0'; g.fillRect(0, 0, AW, AH);
  const at = (i, fn) => { g.save(); g.translate((i % 4) * 256, Math.floor(i / 4) * 256 + 32); g.beginPath(); g.rect(0, 0, CW, CH); g.clip(); fn(g); g.restore(); };
  const sky = (g, stops) => { const gr = g.createLinearGradient(0, 0, 0, CH); for (const [t, c] of stops) gr.addColorStop(t, c); g.fillStyle = gr; g.fillRect(0, 0, CW, CH); };
  const blob = (g, x, y, r, c, a = 1) => { g.globalAlpha = a; g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1; };
  const strokes = (g, n, c, a, x0, y0, w, h, len = 14, thick = 3) => { // dry-brush texture over an area
    g.strokeStyle = c; g.globalAlpha = a; g.lineWidth = thick; g.lineCap = 'round';
    for (let k = 0; k < n; k++) { const x = x0 + rng() * w, y = y0 + rng() * h, t = (rng() - 0.5) * 0.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(t) * len, y + Math.sin(t) * len); g.stroke(); }
    g.globalAlpha = 1;
  };
  // the land: two peaks and the saddle between them, a V notch at x 128 (the sign's half-angle, about 35 degrees)
  const ridge = (g, base, c, notchY = 108) => {
    g.fillStyle = c; g.beginPath(); g.moveTo(0, base); g.lineTo(0, 92); g.lineTo(46, 52); g.lineTo(86, 78); g.lineTo(104, notchY - 34);
    g.lineTo(128, notchY); g.lineTo(152, notchY - 34); g.lineTo(176, 62); g.lineTo(214, 40); g.lineTo(256, 84); g.lineTo(256, base); g.closePath(); g.fill();
  };
  // 0, the first: primed, a faint pencil grid, and one confident line: the ridge and the notch, in crimson
  at(CELL.line, (g) => {
    g.fillStyle = PAINT.cream; g.fillRect(0, 0, CW, CH);
    strokes(g, 60, '#d6caa8', 0.5, 0, 0, CW, CH, 20, 5);
    g.strokeStyle = 'rgba(80,70,60,0.28)'; g.lineWidth = 1;
    for (let x = 32; x < CW; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, CH); g.stroke(); }
    for (let y = 32; y < CH; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(CW, y); g.stroke(); }
    g.strokeStyle = 'rgba(80,70,60,0.35)'; g.beginPath(); g.arc(128, 84, 17, 0, Math.PI * 2); g.stroke(); // the sun, planned in pencil
    g.strokeStyle = PAINT.crimson; g.lineWidth = 7; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(10, 96); g.lineTo(46, 58); g.lineTo(86, 82); g.lineTo(104, 76); g.lineTo(128, 112); g.lineTo(152, 76); g.lineTo(176, 66); g.lineTo(214, 46); g.lineTo(236, 66); g.stroke();
    g.lineWidth = 3; g.beginPath(); g.moveTo(236, 66); g.lineTo(246, 74); g.stroke(); // the flick at the end
    g.lineWidth = 2.5; g.beginPath(); g.moveTo(128, 113); g.lineTo(129, 140); g.stroke(); // a drip from the notch
    blob(g, 129, 141, 2.5, PAINT.crimson);
  });
  // 1: the sun, five times, each lower; four scraped back to ghosts
  at(CELL.suns, (g) => {
    sky(g, [[0, '#4a3a68'], [0.45, '#b8503a'], [0.75, '#e08a3a'], [1, '#e0a050']]);
    strokes(g, 90, '#c8603a', 0.35, 0, 30, CW, 90, 22, 6);
    const suns = [[120, 26], [124, 46], [126, 66], [127, 86]];
    for (const [x, y] of suns) {
      blob(g, x, y, 17, '#e8c890', 0.55); // the scraped disc: pale where the knife took it down to the ground
      g.strokeStyle = 'rgba(150,40,30,0.55)'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 17, 0, Math.PI * 2); g.stroke();
      strokes(g, 9, '#d8784a', 0.6, x - 22, y - 12, 44, 24, 30, 2); // the knife's streaks across it
    }
    ridge(g, CH, '#5a3c5c', 112);
    strokes(g, 40, '#7a4a5a', 0.6, 0, 110, CW, 80, 18, 4);
    blob(g, 128, 108, 17, '#d8401e'); // the fifth, half down in the notch, fresh and thick
    g.save(); g.beginPath(); g.moveTo(104, 78); g.lineTo(128, 112); g.lineTo(152, 78); g.lineTo(256, 78); g.lineTo(256, CH); g.lineTo(0, CH); g.lineTo(0, 78); g.closePath(); g.clip();
    ridge(g, CH, '#5a3c5c', 112); g.restore();
    g.fillStyle = 'rgba(30,20,30,0.85)'; g.font = 'bold 16px serif'; g.fillText('V', 222, 182); // his initial
  });
  // 2: the keep under the sun, quite good (the slash is in the geometry)
  at(CELL.slash, (g) => {
    sky(g, [[0, '#3a2e58'], [0.5, '#a04838'], [0.8, '#d87a3a'], [1, '#d89050']]);
    strokes(g, 70, '#8a4060', 0.3, 0, 0, CW, 110, 26, 6);
    blob(g, 134, 58, 22, '#e0703a'); blob(g, 134, 58, 15, '#f0a050');
    g.fillStyle = '#5a4a5a'; g.beginPath(); g.moveTo(0, 120); g.lineTo(60, 100); g.lineTo(200, 104); g.lineTo(256, 116); g.lineTo(256, CH); g.lineTo(0, CH); g.fill();
    g.fillStyle = '#2a2230'; // the keep: a block, a gap, a tower and its spire
    g.fillRect(98, 70, 22, 40); g.fillRect(120, 82, 62, 28); g.fillRect(144, 92, 8, 18);
    g.beginPath(); g.moveTo(106, 70); g.lineTo(109, 30); g.lineTo(112, 70); g.fill();
    g.fillStyle = '#e09040'; g.fillRect(152, 96, 6, 9); // its lit window
    g.fillStyle = '#3a4a24'; g.fillRect(0, 140, CW, 52); strokes(g, 60, '#5e6e2a', 0.8, 0, 140, CW, 52, 10, 4);
    strokes(g, 40, '#6a3050', 0.8, 0, 160, CW, 32, 8, 5); // heather
  });
  // 3: the Arcature's arches under the twin peaks, the sun too big and too red
  at(CELL.kicked, (g) => {
    sky(g, [[0, '#2e2850'], [0.55, '#8a3a48'], [1, '#c86a3a']]);
    blob(g, 128, 90, 34, '#c8301e');
    ridge(g, CH, '#3a2a40', 112);
    g.fillStyle = '#1e1824';
    for (let k = 0; k < 6; k++) { const x = 20 + k * 38; g.fillRect(x, 118, 10, 46); g.beginPath(); g.arc(x + 24, 122, 14, Math.PI, 0); g.lineTo(x + 38, 128); g.lineTo(x + 10, 128); g.fill(); }
    g.fillRect(0, 160, CW, 32);
    strokes(g, 50, PAINT.violet, 0.5, 0, 10, CW, 80, 20, 5);
  });
  // 4: his medlar, small and bright and done with enormous care: on a white cloth, its five-pointed crown, a highlight
  at(CELL.medlar, (g) => {
    const bg = g.createRadialGradient(128, 96, 10, 128, 96, 150); bg.addColorStop(0, '#3a6a6a'); bg.addColorStop(1, '#16282c'); g.fillStyle = bg; g.fillRect(0, 0, CW, CH);
    g.fillStyle = '#f2ecdc'; g.beginPath(); g.ellipse(128, 160, 120, 30, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(40,30,20,0.35)'; g.beginPath(); g.ellipse(138, 150, 56, 12, 0, 0, Math.PI * 2); g.fill();
    const fr = g.createRadialGradient(108, 90, 6, 128, 104, 58); fr.addColorStop(0, '#f0b050'); fr.addColorStop(0.5, '#b8642a'); fr.addColorStop(1, '#5a2a14');
    g.fillStyle = fr; g.beginPath(); g.ellipse(128, 106, 54, 46, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#3a2010'; g.beginPath(); g.ellipse(128, 66, 20, 7, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#6a4a20';
    for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k - 2) * 0.42; g.beginPath(); g.moveTo(128 + Math.cos(a) * 8 - 5, 66); g.lineTo(128 + Math.cos(a) * 28, 66 + Math.sin(a) * 26 - 4); g.lineTo(128 + Math.cos(a) * 8 + 5, 66); g.fill(); }
    blob(g, 104, 88, 9, '#fff0c8', 0.85); blob(g, 100, 84, 4, '#ffffff', 0.9);
    g.strokeStyle = '#e0b040'; g.lineWidth = 4; g.strokeRect(4, 4, CW - 8, CH - 8); // a painted gilt frame
    g.fillStyle = '#e0b040'; g.font = 'italic 13px serif'; g.fillText('Mespilus. — after nature', 132, 182);
  });
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return tex;
}

// ---------------------------------------------------------------- canvas pieces in a canvas's own frame (x right, y up, +z its face)
// a flat triangle list with uvs in the picture's cell: from (u, v) in 0..1 over the picture to local x, y
function pieces(kind, W, H, rng) {
  const [u0, v0, u1, v1] = cellUV(CELL[kind]);
  const P = (u, v, z = 0) => ({ x: (u - 0.5) * W, y: (v - 0.5) * H, z, u: u0 + (u1 - u0) * u, v: v0 + (v1 - v0) * v });
  const tris = [], rim = [];
  const quad = (a, b, c, d) => { tris.push([a, b, c], [a, c, d]); };
  if (kind === 'slash') {
    // cut from the bottom-left corner to the top-right, the edge a little ragged
    const n = 9, cut = [];
    for (let i = 0; i <= n; i++) { const t = i / n; cut.push([t + (i % 2 ? 0.012 : -0.01) * (i > 0 && i < n), t]); }
    // each half hangs from its two stretcher edges: the lower curls a little forward, the upper flap falls back and down
    // through the frame, so the cut shows as a dark gash the length of the picture
    const lo = (u, v) => { const f = Math.min(v, 1 - u) * 2; return P(u + f * 0.03, v - f * 0.05, f * 0.1); };
    const hi = (u, v) => { const f = Math.min(u, 1 - v) * 2; return P(u - f * f * 0.12, v - f * f * 0.3, -f * f * 0.32); };
    const strip = (fn, a0, side) => { // a strip of quads from the cut to the far edge, 4 across
      for (let i = 0; i < n; i++) {
        const [ua, va] = cut[i], [ub, vb] = cut[i + 1];
        for (let k = 0; k < 4; k++) {
          const s0 = k / 4, s1 = (k + 1) / 4;
          const A = (u, v, s) => (side ? fn(u + (1 - u) * s, v) : fn(u * (1 - s), v));
          quad(A(ua + a0, va, s0), A(ua + a0, va, s1), A(ub + a0, vb, s1), A(ub + a0, vb, s0));
        }
      }
    };
    strip(lo, 0.09, true);
    strip(hi, -0.09, false);
  } else if (kind === 'kicked') {
    // a ragged hole a boot wide a little low of centre, and the torn tongues of canvas pushed back into it
    const nx = 14, ny = 10, hc = [0.47, 0.45], R = 0.33;
    const hole = (i, j) => { const u = (i + 0.5) / nx, v = (j + 0.5) / ny, a = Math.atan2(v - hc[1], u - hc[0]); return Math.hypot((u - hc[0]) * 1.1, v - hc[1]) < R * (0.75 + 0.25 * Math.sin(a * 5 + 1.3) + 0.12 * Math.sin(a * 11)); };
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
      if (hole(i, j)) continue;
      quad(P(i / nx, j / ny), P((i + 1) / nx, j / ny), P((i + 1) / nx, (j + 1) / ny), P(i / nx, (j + 1) / ny));
    }
    // round the hole's edge, the torn tongues of primed canvas, bent back through it: pale against the dark
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
      if (!hole(i, j)) continue;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (hole(i + di, j + dj) || i + di < 0 || j + dj < 0 || i + di >= nx || j + dj >= ny) continue;
        // the shared edge's two ends, and a tip toward the hole's centre and back
        const ex = (i + 0.5 + di * 0.5) / nx, ey = (j + 0.5 + dj * 0.5) / ny, hx = dj !== 0 ? 0.5 / nx : 0, hy = di !== 0 ? 0.5 / ny : 0;
        const u = (i + 0.5) / nx, v = (j + 0.5) / ny, du = hc[0] - ex, dv = hc[1] - ey, L = Math.hypot(du, dv) || 1, k = 0.05 + rng() * 0.05;
        rim.push([P(ex - hx, ey - hy), P(ex + hx, ey + hy), P(u + du / L * k * 0.4 + (rng() - 0.5) * 0.03, v + dv / L * k * 0.4, -0.04 - k * 0.9)]);
      }
    }
  } else quad(P(0, 0), P(1, 0), P(1, 1), P(0, 1));
  const build = (list) => {
    const pos = [], uv = [];
    for (const t of list) for (const p of t) { pos.push(p.x, p.y, p.z); uv.push(p.u, p.v); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    return g;
  };
  const g = build(tris);
  g.userData.rim = rim.length ? build(rim) : null;
  return g;
}
// a canvas at matrix C: its painted face into `faces` (on the atlas), its linen back and its stretcher into `acc`
function canvasAt(acc, faces, C, kind, W, H, rng, { stretcher = true } = {}) {
  const g = pieces(kind, W, H, rng);
  faces.add(g, C.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0, 0.004)), '#ffffff', 0);
  acc.add(g, C.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0, -0.003)), LINEN, 0.04); // the back, raw linen
  if (g.userData.rim) acc.add(g.userData.rim, C, '#e8dec6', 0.12); // the torn edge, the white priming showing
  if (!stretcher) return;
  const bar = (w, h, x, y) => boxAt(acc, C, w, h, 0.03, x, y, -0.02, '#9a8462', 0, 0, 0, 0.06);
  bar(W, 0.03, 0, -H / 2 + 0.015); bar(0.03, H, -W / 2 + 0.015, 0); bar(0.03, H, W / 2 - 0.015, 0);
  if (kind === 'kicked') { // the top bar snapped at the middle, both halves bowed in
    boxAt(acc, C, W / 2, 0.03, 0.03, -W / 4, H / 2 - 0.03, -0.03, '#9a8462', 0, 0, -0.12, 0.06);
    boxAt(acc, C, W / 2, 0.03, 0.03, W / 4, H / 2 - 0.03, -0.03, '#9a8462', 0, 0, 0.1, 0.06);
  } else bar(W, 0.03, 0, H / 2 - 0.015);
}

// ---------------------------------------------------------------- the supports
// an easel in frame F (+z toward the viewer): front legs from (±0.42, 0, 0.12) to (±0.05, 1.8, -0.08), a rear leg, a
// cross-bar and the shelf at 0.62. broken: the left front leg snapped at 0.72, its upper part on the ground.
const EASEL_LEAN = Math.atan2(0.2, 1.8);
function easel(acc, F, { broken = false } = {}) {
  const L = [-0.42, 0, 0.12], LT = [-0.05, 1.8, -0.08], R = [0.42, 0, 0.12], RT = [0.05, 1.8, -0.08];
  const at = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  rod(acc, F, R, RT, 0.024, WOOD, 0.022);
  if (broken) {
    const k = 0.4, m = at(L, LT, k);
    rod(acc, F, at(L, LT, k + 0.04), LT, 0.024, WOOD, 0.022); // what is left hangs from the head, short of the ground
    rod(acc, F, L, [m[0], m[1] - 0.12, m[2]], 0.024, WOOD); // the stub, standing on the stones
    rod(acc, F, [m[0], m[1] - 0.12, m[2]], [m[0] + 0.02, m[1] - 0.04, m[2] + 0.01], 0.012, SPLINTER, 0.004);
    rod(acc, F, at(L, LT, k + 0.04), [m[0] - 0.01, m[1] - 0.02, m[2]], 0.014, SPLINTER, 0.004);
  } else rod(acc, F, L, LT, 0.024, WOOD, 0.022);
  rod(acc, F, [0, 1.76, -0.1], [0, 0, -0.8], 0.022, WOOD_D);
  rod(acc, F, [-0.34, 0.5, 0.06], [0.34, 0.5, 0.06], 0.016, WOOD_D);
  boxAt(acc, F, 0.9, 0.035, 0.11, 0, 0.62, 0.06, WOOD, -EASEL_LEAN, 0, 0, 0.06);
  boxAt(acc, F, 0.08, 0.06, 0.08, 0, 1.78, -0.08, WOOD_D, 0, 0, 0, 0.06);
}
function stone(acc, F, x, y, z, r, c = STONE, o = {}) { ellipsoid(acc, F, x, y, z, r * (o.sx || 1.2), r * (o.sy || 0.7), r, c, { low: true, ay: o.ay || x * 3.1, jitter: 0.12 }); }

// ---------------------------------------------------------------- the dropped things
function tube(acc, F, color) { // squeezed flat from the bottom, rolled up, a worm of paint from its mouth
  boxAt(acc, F, 0.13, 0.012, 0.032, 0, 0.007, 0, '#b8b4ac', 0, 0, 0.04, 0.05);
  rod(acc, F, [-0.08, 0.012, 0], [-0.065, 0.012, 0], 0.016, '#a8a49c'); // the rolled end
  boxAt(acc, F, 0.06, 0.014, 0.034, 0.02, 0.008, 0, color, 0, 0, 0, 0.03); // its band of colour
  rod(acc, F, [0.065, 0.01, 0], [0.085, 0.01, 0], 0.009, '#2a2a2a'); // the neck; the cap is gone
  rod(acc, F, [0.085, 0.008, 0], [0.12, 0.008, 0.02], 0.008, color, 0.007);
  rod(acc, F, [0.12, 0.008, 0.02], [0.15, 0.007, 0.0], 0.007, color, 0.004);
}
function brush(acc, F) { // snapped across the handle, the halves a hand apart
  rod(acc, F, [-0.16, 0.008, 0], [-0.02, 0.008, 0.01], 0.006, '#8a2a1a');
  rod(acc, F, [-0.02, 0.008, 0.01], [-0.005, 0.009, 0.014], 0.004, SPLINTER, 0.002);
  rod(acc, F, [0.05, 0.008, 0.05], [0.13, 0.008, 0.07], 0.006, '#8a2a1a');
  rod(acc, F, [0.04, 0.008, 0.048], [0.05, 0.008, 0.05], 0.004, SPLINTER, 0.002);
  rod(acc, F, [0.13, 0.008, 0.07], [0.16, 0.008, 0.078], 0.007, '#9a9a9e'); // the ferrule
  rod(acc, F, [0.16, 0.008, 0.078], [0.2, 0.008, 0.086], 0.009, PAINT.ember, 0.003); // the bristles, ember
}
function rag(acc, F, rng, s = 1) { // a crumpled rag, stiff with the canvases' colours
  for (let k = 0; k < 7; k++) ellipsoid(acc, F, (rng() - 0.5) * 0.24 * s, 0.02 + rng() * 0.02, (rng() - 0.5) * 0.18 * s, 0.09 * s, 0.025, 0.07 * s, k < 3 ? PAINT.cream : DABS[k % DABS.length], { low: true, ay: rng() * 6, jitter: 0.1 });
}

// ---------------------------------------------------------------- the painter
// all in his frame: +z ahead of him (east), y up from the ground, x to his left
const SPINE = new THREE.Vector3(0, 0.62, -0.04); // the pivot his upper body turns about
const NECK = new THREE.Vector3(0, 1.12, 0.17);
const SMOCK = '#c9b892', SKIN = '#c49470', TROUSERS = '#c8962e', PATCH = '#2e8a86', BOOT = '#2a2018', PACK = '#6a5236', HAT = '#a8404e';
// the smock: a bell from the hips to the neck, hunched forward over his work; r(y) its radius at height y (his frame)
const SMOCK_PROFILE = [[0.0, 0.5], [0.27, 0.52], [0.25, 0.62], [0.21, 0.76], [0.215, 0.9], [0.19, 1.0], [0.12, 1.08], [0.06, 1.13], [0.0, 1.14]];
const HUNCH = 0.22;
function smockR(y) {
  for (let i = 1; i < SMOCK_PROFILE.length; i++) { const [r0, y0] = SMOCK_PROFILE[i - 1], [r1, y1] = SMOCK_PROFILE[i]; if (y <= y1) return r0 + (r1 - r0) * (y - y0) / (y1 - y0 || 1); }
  return 0;
}
// the hunch: a point at height y moves forward with it (about the hips)
const hunchZ = (y) => Math.sin(HUNCH) * (y - 0.5);
function paintOn(acc, rng, n) { // paint stiff on the smock: wipes and dabs over its surface, every colour of his canvases
  for (let k = 0; k < n; k++) {
    const y = 0.56 + rng() * 0.48, a = rng() * Math.PI * 2, r = smockR(y) + 0.006;
    const x = Math.sin(a) * r, z = Math.cos(a) * r * 0.85 + 0.04 + hunchZ(y), c = DABS[k % (DABS.length - 1)];
    if (rng() < 0.75) boxAt(acc, null, 0.05 + rng() * 0.1, 0.014 + rng() * 0.026, 0.004, x, y, z, c, HUNCH * Math.cos(a), a, (rng() - 0.5) * 1.2, 0.05); // a wipe
    else ellipsoid(acc, null, x, y, z, 0.018 + rng() * 0.016, 0.016 + rng() * 0.014, 0.012, c, { low: true, ay: a, jitter: 0.05 }); // a dab
  }
}
function legs(acc, rng) { // the seat (his pack), hips, legs, boots; the medlar on its stone; his tubes and things
  // the pack: a bulging canvas sack with a rolled blanket, a strap, a sewn sign on its flap (a crescent, a pomegranate)
  ellipsoid(acc, null, 0, 0.24, -0.06, 0.3, 0.25, 0.24, PACK, { jitter: 0.04 });
  rod(acc, null, [-0.3, 0.36, -0.2], [0.3, 0.36, -0.2], 0.09, '#5a3a4a');
  rod(acc, null, [-0.26, 0.05, 0.12], [-0.26, 0.42, 0.15], 0.018, '#3a2a1e');
  ellipsoid(acc, null, 0.28, 0.32, -0.1, 0.012, 0.07, 0.07, PAINT.cream, { low: true });
  ellipsoid(acc, null, 0.289, 0.31, -0.1, 0.008, 0.03, 0.03, PAINT.crimson, { low: true });
  // hips and thighs forward to the knees (raised), shins down to the boots set apart
  ellipsoid(acc, null, 0, 0.56, 0.02, 0.22, 0.12, 0.2, TROUSERS);
  for (const sx of [-1, 1]) {
    rod(acc, null, [sx * 0.12, 0.56, 0.04], [sx * 0.16, 0.6, 0.42], 0.085, TROUSERS, 0.07);
    rod(acc, null, [sx * 0.16, 0.6, 0.42], [sx * 0.18, 0.08, 0.52], 0.065, TROUSERS, 0.05);
    ellipsoid(acc, null, sx * 0.18, 0.05, 0.58, 0.07, 0.06, 0.15, BOOT);
  }
  boxAt(acc, null, 0.11, 0.13, 0.03, 0.17, 0.6, 0.44, PATCH, 0.3, 0, 0, 0.05); // a turquoise patch on the left knee
  boxAt(acc, null, 0.09, 0.1, 0.03, -0.18, 0.3, 0.5, '#c8384a', 0.1, 0, 0, 0.05); // a rose one on the right shin
  // the medlar on its flat stone, a little ahead and to his left, set out like a jewel on a folded white cloth
  stone(acc, null, 0.2, 0.1, 1.0, 0.2, '#7a746c', { sy: 0.6 });
  boxAt(acc, null, 0.2, 0.012, 0.16, 0.2, 0.18, 1.0, '#f0eadc', 0, 0.3, 0, 0.02);
  ellipsoid(acc, null, 0.2, 0.225, 1.0, 0.042, 0.038, 0.042, '#8a4a20');
  ellipsoid(acc, null, 0.2, 0.258, 1.0, 0.02, 0.008, 0.02, '#3a2414');
  // his tubes in a row on the turf by his right boot, in the Prospect's colours; a rag; a jar of turps
  PROSPECT_PIGMENTS.forEach((c, i) => tube(acc, local(null, -0.42 - i * 0.05, 0.0, 0.3 + i * 0.02, 0, 1.5 + i * 0.05, 0), c));
  rag(acc, local(null, -0.45, 0, -0.2), rng, 0.9);
  rod(acc, null, [-0.36, 0, 0.62], [-0.36, 0.12, 0.62], 0.04, '#8a9a8a', 0.045);
}
function torso(acc, rng) { // the smock, shoulders and upper arms: turns about SPINE
  const lathe = new THREE.LatheGeometry(SMOCK_PROFILE.map(([r, y]) => new THREE.Vector2(r, y - 0.5)), 14);
  acc.add(lathe, local(null, 0, 0.5, 0.04, HUNCH, 0, 0, [1, 1, 0.85]), SMOCK, 0.03);
  paintOn(acc, rng, 70);
  ellipsoid(acc, null, 0, 1.1, 0.06 + hunchZ(1.1), 0.1, 0.04, 0.09, PAINT.crimson); // a knotted neckerchief
  rod(acc, null, [0.04, 1.08, 0.16 + hunchZ(1.08)], [0.07, 0.94, 0.24 + hunchZ(0.94)], 0.022, PAINT.crimson, 0.012); // its ends
  for (const sx of [-1, 1]) {
    const sh = [sx * 0.19, 1.02, 0.05 + hunchZ(1.02)];
    ellipsoid(acc, null, sh[0] * 0.85, sh[1] - 0.01, sh[2], 0.075, 0.05, 0.075, SMOCK);
    rod(acc, null, sh, [sx * 0.22, 0.8, 0.22], 0.058, SMOCK, 0.052);
    ellipsoid(acc, null, sx * 0.21, 0.92, 0.12 + hunchZ(0.92), 0.04, 0.02, 0.03, DABS[sx > 0 ? 0 : 4], { low: true });
  }
}
function head(acc) { // the head at NECK: face toward +z; a wide rose hat with a long crimson plume, grey hair under it
  rod(acc, null, [0, -0.02, 0], [0, 0.08, 0.02], 0.05, SKIN);
  ellipsoid(acc, null, 0, 0.16, 0.03, 0.095, 0.12, 0.105, SKIN);
  ellipsoid(acc, null, 0, 0.17, -0.03, 0.105, 0.11, 0.09, '#8a8478'); // the hair, long and grey at the back
  ellipsoid(acc, null, 0, 0.09, -0.06, 0.09, 0.07, 0.06, '#8a8478');
  for (const sx of [-1, 1]) ellipsoid(acc, null, sx * 0.095, 0.15, 0.02, 0.02, 0.035, 0.025, SKIN, { low: true });
  ellipsoid(acc, null, 0, 0.08, 0.09, 0.065, 0.05, 0.05, '#4a3020'); // the beard, pointed and dark
  rod(acc, null, [0, 0.06, 0.11], [0, -0.03, 0.14], 0.03, '#4a3020', 0.004);
  for (const sx of [-1, 1]) rod(acc, null, [0, 0.12, 0.125], [sx * 0.08, 0.145, 0.11], 0.01, '#3a2418', 0.003); // the moustache, waxed up
  ellipsoid(acc, null, 0, 0.15, 0.13, 0.018, 0.03, 0.03, '#b07a5a', { low: true }); // the nose
  ellipsoid(acc, null, 0, 0.245, 0.01, 0.26, 0.022, 0.24, HAT, { jitter: 0.03, ax: 0.12 }); // the brim, wide, tipped down in front
  ellipsoid(acc, null, 0, 0.3, -0.01, 0.11, 0.09, 0.11, HAT, { jitter: 0.03 });
  rod(acc, null, [0.06, 0.32, -0.04], [0.2, 0.46, -0.24], 0.022, PAINT.crimson, 0.008); // the plume
  rod(acc, null, [0.2, 0.46, -0.24], [0.32, 0.4, -0.38], 0.016, PAINT.ember, 0.004);
}
// the hands and the little canvas, about its own centre: face toward +z (toward him once placed), brush in his right
const SMALL = [0.4, 0.3];
function hands(acc, faces, rng) {
  const C = new THREE.Matrix4();
  canvasAt(acc, faces, C, 'medlar', SMALL[0], SMALL[1], rng);
  for (const sx of [-1, 1]) ellipsoid(acc, null, sx * 0.2, -0.04, -0.01, 0.035, 0.045, 0.03, SKIN, { low: true }); // gripping the sides
  // the forearms back toward his elbows (+z here is toward him once placed)
  for (const sx of [-1, 1]) rod(acc, null, [sx * 0.2, -0.05, -0.02], [sx * 0.22, -0.12, 0.2], 0.045, SMOCK, 0.04);
  rod(acc, null, [-0.15, -0.02, 0.03], [-0.08, 0.1, 0.12], 0.006, '#8a2a1a'); // the brush, held against the frame, its tip ember
  rod(acc, null, [-0.08, 0.1, 0.12], [-0.065, 0.125, 0.135], 0.007, PAINT.ember, 0.002);
}

export function buildPainter(ctx, gy, prospect = true) {
  const rng = ctx.makeRng(80805), n = new THREE.Vector3();
  const tex = paintAtlas(rng);
  const faceMat = new THREE.MeshBasicMaterial({ map: tex, vertexColors: true, color: 0xc4beb4, side: THREE.DoubleSide });
  const props = new Acc(rng), faces = new Acc(rng), meshes = [];
  const ends = { attempts: [], drops: [] };
  const lean = (F, ang) => F.clone().multiply(new THREE.Matrix4().makeRotationX(-ang));
  for (const a of PAINTER.attempts) {
    // the face: halfway between away-from-the-sun and toward the stand
    const ts = Math.atan2(a.stand.x - a.x, a.stand.z - a.z);
    let d = ts - ANTI_SUN; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
    const yaw = ANTI_SUN + d * 0.5, y = gy(a.x, a.z);
    const F = frame(a.x, y, a.z, yaw);
    let C, W = 0.86, H = 0.645;
    if (a.kind === 'line') { // on the broken easel, the stub stood on two stones, the whole of it askew
      const T = F.clone().multiply(new THREE.Matrix4().makeRotationZ(-0.07));
      easel(props, T, { broken: true });
      stone(props, F, -0.42, 0.05, 0.12, 0.12); stone(props, F, -0.42, 0.15, 0.13, 0.08, '#7a7470');
      // the broken leg's upper part, where it fell
      rod(props, F, [-0.9, 0.03, 0.5], [-0.3, 0.03, 0.9], 0.024, WOOD);
      C = lean(T.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0.64 + H / 2, 0.02)), EASEL_LEAN).multiply(new THREE.Matrix4().makeRotationZ(0.05));
    } else if (a.kind === 'suns') { // propped on stones, leaning back on a forked stick
      // a heap of flat stones built up knee-high to stand it on, two to stop it sliding, a forked stick behind
      for (let k = 0; k < 4; k++) stone(props, F, (k % 2 - 0.5) * 0.12, 0.07 + k * 0.1, 0.02, 0.3 - k * 0.03, k % 2 ? '#7a746c' : STONE, { sy: 0.32 });
      stone(props, F, -0.32, 0.47, 0.16, 0.08); stone(props, F, 0.33, 0.47, 0.16, 0.07);
      rod(props, F, [0, 0, -0.82], [0, 0.98, -0.12], 0.02, '#4a3a2a'); rod(props, F, [0, 0.94, -0.14], [0.08, 1.06, -0.12], 0.012, '#4a3a2a');
      C = lean(F.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0.46 + H / 2 * Math.cos(0.3), 0.1 - H / 2 * Math.sin(0.3))), 0.3);
    } else if (a.kind === 'slash') { // on its easel, whole; the palette knife stuck in the turf below
      easel(props, F);
      C = lean(F.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0.64 + H / 2, 0.02)), EASEL_LEAN);
      rod(props, F, [0.25, -0.03, 0.4], [0.3, 0.1, 0.44], 0.012, '#c0c4c8', 0.004); rod(props, F, [0.3, 0.1, 0.44], [0.33, 0.2, 0.46], 0.012, '#6a4a2a');
    } else { // kicked through: leaning back on a stone, the easel kicked over beside it
      stone(props, F, 0, 0.2, -0.42, 0.3, '#6a6460', { sy: 0.9 });
      C = lean(F.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0.02 + H / 2 * Math.cos(0.55), 0.05 - H / 2 * Math.sin(0.55))), 0.55);
      const K = F.clone().multiply(new THREE.Matrix4().makeTranslation(1.0, 0.06, 0.3)).multiply(new THREE.Matrix4().makeRotationY(0.5)).multiply(new THREE.Matrix4().makeRotationX(-Math.PI / 2 + 0.06));
      easel(props, K);
    }
    canvasAt(props, faces, C, a.kind, W, H, rng);
    const c = new THREE.Vector3().applyMatrix4(C);
    ctx.addCollider({ x: a.x, z: a.z, r: 0.55, y: y - 0.2, h: 1.9, stand: false }); // v8-10: an easel is not stood on
    ends.attempts.push({ kind: a.kind, x: a.x, z: a.z, y, centre: { x: c.x, y: c.y, z: c.z }, face: yaw, stand: { ...a.stand } });
  }
  // the dropped things on the tracks
  for (const d of PAINTER.drops) {
    const y = gy(d.x, d.z); ctx.terrain.normalAt(d.x, d.z, n);
    const F = frame(d.x, y, d.z, d.yaw, n.clone());
    if (d.kind === 'tube') tube(props, F, PROSPECT_PIGMENTS[2]); else if (d.kind === 'brush') brush(props, F); else rag(props, F, rng);
    ends.drops.push({ kind: d.kind, x: d.x, z: d.z, y });
  }
  // the Prospect's stool: the same rag over its seat, one corner hanging
  if (prospect) {
    const [sx, sz] = prospectAt(1.5, -0.1), sy = ctx.terrain.heightAt(sx, sz) + 0.5 + 0.0225;
    const F = frame(sx, sy, sz, PROSPECT.yaw);
    rag(props, F, rng, 0.8);
    boxAt(props, F, 0.14, 0.2, 0.012, 0.17, -0.09, 0, PAINT.cream, 0, 0, 0.12, 0.05);
    boxAt(props, F, 0.05, 0.05, 0.014, 0.18, -0.12, 0.002, PAINT.blue, 0, 0, 0.12, 0.05);
  }
  meshes.push(finish(ctx, props, 'threads-painter-props'));
  const faceMesh = new THREE.Mesh(faces.geometry(), faceMat);
  faceMesh.name = 'threads-painter-canvases'; ctx.scene.add(faceMesh); meshes.push(faceMesh);

  // ---------------------------------------------------------------- the man
  const M = PAINTER.man, my = gy(M.x, M.z), B = frame(M.x, my, M.z, M.yaw);
  const legAcc = new Acc(rng); legs(legAcc, rng);
  const legMesh = finish(ctx, legAcc, 'threads-painter-seat');
  legMesh.applyMatrix4(B); legMesh.matrixAutoUpdate = false; legMesh.updateMatrix();
  const mk = (acc, name, mat) => { const m = mat ? new THREE.Mesh(acc.geometry(), mat) : finish(ctx, acc, name); m.name = name; m.matrixAutoUpdate = false; m.castShadow = !mat; m.receiveShadow = !mat; if (mat) ctx.scene.add(m); return m; };
  const tAcc = new Acc(rng); torso(tAcc, rng);
  const torsoMesh = mk(tAcc, 'threads-painter-body');
  const hAcc = new Acc(rng); head(hAcc);
  const headMesh = mk(hAcc, 'threads-painter-head');
  const kAcc = new Acc(rng), kFaces = new Acc(rng); hands(kAcc, kFaces, rng);
  const handMesh = mk(kAcc, 'threads-painter-hands');
  const smallMesh = mk(kFaces, 'threads-painter-picture', faceMat);
  meshes.push(legMesh, torsoMesh, headMesh, handMesh, smallMesh);
  // the little canvas's two poses in his turned frame: on his knees tilted up to him, painted side toward his face;
  // clutched to his chest, painted side in
  const pose = (x, y, z, rx, ry) => ({ p: new THREE.Vector3(x, y, z), q: new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, 0, 'YXZ')) });
  const WORK = pose(0, 0.78, 0.4, -1.05, Math.PI), HUG = pose(0, 0.9, 0.3, 0.12, Math.PI);
  const st = { turn: 0, hug: 0, look: 0, nod: 0, near: false, hold: false };
  const _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _m = new THREE.Matrix4(), _r = new THREE.Matrix4(), _g = new THREE.Matrix4(), _s = new THREE.Vector3(1, 1, 1);
  const _hq = new THREE.Quaternion(), _e = new THREE.Euler();
  const place = () => {
    // his upper body: B * T(spine) * Ry(turn) * T(-spine)
    _g.copy(B).multiply(_m.makeTranslation(SPINE.x, SPINE.y, SPINE.z)).multiply(_r.makeRotationY(st.turn)).multiply(_m.makeTranslation(-SPINE.x, -SPINE.y, -SPINE.z));
    torsoMesh.matrix.copy(_g);
    // the head: looks down at the picture or up at the medlar while he works; at you when you are near
    _e.set(0.5 - st.nod * 0.45 - st.look * 0.45, st.look * st.lookYaw, 0, 'YXZ'); _hq.setFromEuler(_e);
    headMesh.matrix.copy(_g).multiply(_m.compose(NECK, _hq, _s));
    _p.lerpVectors(WORK.p, HUG.p, st.hug); _q.slerpQuaternions(WORK.q, HUG.q, st.hug);
    handMesh.matrix.copy(_g).multiply(_m.compose(_p, _q, _s));
    smallMesh.matrix.copy(handMesh.matrix);
    for (const m of [torsoMesh, headMesh, handMesh, smallMesh]) m.matrixWorldNeedsUpdate = true;
  };
  st.lookYaw = 0;
  place();
  const ease = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));
  const update = (dt, t) => {
    const P = ctx.player?.pos; if (!P || st.hold) return; // hold: a render or a test poses him by hand
    const dx = P.x - M.x, dz = P.z - M.z, dist = Math.hypot(dx, dz);
    st.near = dist < 6;
    // the bearing to you in his frame (0 straight ahead, + to his left)
    let rel = Math.atan2(dx, dz) - M.yaw; while (rel > Math.PI) rel -= Math.PI * 2; while (rel < -Math.PI) rel += Math.PI * 2;
    const turnTo = st.near ? Math.max(-1.0, Math.min(1.0, rel)) : 0;
    st.turn = ease(st.turn, turnTo, st.near ? 5 : 1.5, dt);
    st.hug = ease(st.hug, st.near ? 1 : 0, st.near ? 7 : 1.2, dt);
    st.look = ease(st.look, dist < 9 ? 1 : 0, 3, dt);
    st.lookYaw = ease(st.lookYaw, Math.max(-0.9, Math.min(0.9, rel - st.turn)), 4, dt);
    // at work: eyes on the medlar, then down at the picture, a long look each
    const ph = (t * 0.33) % 1, nodT = ph < 0.35 ? 1 : 0;
    st.nod = ease(st.nod, nodT, 4, dt);
    place();
  };
  ctx.registerUpdate(update, { pos: { x: M.x, z: M.z }, near: 40, hz: 2 });
  ctx.addCollider({ x: M.x, z: M.z, r: 0.75, y: my - 0.2, h: 1.4, stand: false }); // v8-10: nor is the painter
  ends.man = { x: M.x, z: M.z, y: my, top: my + 1.5, stand: { ...PAINTER.stand }, state: st };
  ends.prospect = { x: PROSPECT.x, z: PROSPECT.z };
  return { meshes, ends, state: st, tex, place };
}
