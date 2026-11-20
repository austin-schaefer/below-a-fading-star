// The settings panel's map (v17.1-Q1, #70: "Teleport menu is overwhelming, and also inscrutable if you don't know place
// names"): the valley drawn from above as an old chart, ember and slate, with a mark for each of seventeen stands and
// "you are here". Pointing at a mark (hover, focus, a first tap) says what it is in one plain line, its name second;
// a click, Enter, a second tap or "Go there" goes. Loaded by settings.js on the panel's first open, never before: the
// chart is drawn then from the terrain's own height, water and cover (about half a second, sliced so the page keeps
// answering), so nothing is fetched or built for a visitor who never opens the gear.
//
// The stands are settings.js PLACES entries, found by name: their stand points, looks and checks are the ones the
// whole list had (tools/settings-test.mjs). Every other place keeps its card and its entry in PLACES (the debug panel,
// the tools); only the map's marks are few. Which seventeen, and why the rest are not on it, is in MARKS' comment.
import { CAUSEWAY_V4, SUN } from '../world.js';

// Seventeen, spread over the valley, each something a visitor would walk to see (the owner's favourites among them: the
// Span, seen from its bell, the Pomegranate House, the Arcature). Not on the map: the tops of the ways up
// (the Bitter End, the Hanging Croft, Final Refuge, the Span's deck and its camp and splice, the Cyclopean Stairs,
// Lonely Staircase): the climb is the thing; the rooms under the moor (the Noon Road, the Laid Sun, the Nadir, the
// Meridian Garth): found by going down from the Nave, the Pit and the Swallow, which are on it; the seventeen living:
// they wander and are met; the eight story ends: found by following the story; and the small places beside a mark
// (the Wayside Shrine, the Smoking Saint, the Fountain of Noon, the Sunken Court, the Leaning Yard, the Gradine, the Unfinished Prospect,
// the Speculum, the Cutting, the Wrong Colour, the Kept Fire, the Hawser, the Plinth Road, the Menology, Rest in
// Starlight, the regions' cards and the rest), found from the mark beside them. `line` is what a stranger sees there,
// in plain words; `glyph` the little drawing on the chart; `at` where the mark sits when not where the stand looks.
export const MARKS = [
  { name: 'Carcanet Keep', line: 'a great walled keep in the middle of the valley; you start here', glyph: 'keep' },
  { name: 'The Lantern Halt', line: 'a waymark slab by the west road, chalked with strokes', glyph: 'slab' },
  { name: 'The Pomegranate House', line: 'a cream house with turquoise domes, under coloured lamps', glyph: 'house' },
  { name: 'Circumbambulate Pool', line: 'a still, dark lake west of the keep', glyph: 'pool' },
  { name: 'The Cardinal Stones', line: 'four standing stones, each its own colour', glyph: 'stones' },
  { name: "The Armiger's Tower", line: 'a lone spire on a mound under the north-west cliffs', glyph: 'tower' },
  { name: 'The Arcature', line: 'tall stone arches set one inside another, like a giant’s globe', glyph: 'arches', at: { x: 160, z: 60 } },
  { name: 'The Lattice', line: 'great blue crystals at the glacier’s foot', glyph: 'crystal' },
  { name: 'The Collation', line: 'a table laid for twelve among the medlar trees', glyph: 'table' },
  { name: 'The Hypogeum', line: 'a bronze door at the bottom of a stair in the ground', glyph: 'door' },
  { name: 'The Foundered Nave', line: 'a sunken church, flooded to its broken roof', glyph: 'nave' },
  { name: 'The Pit', line: 'a deep shaft by the old east road', glyph: 'pit' },
  { name: 'The Tocsin', line: 'a bell on a post at the great bridge’s foot', glyph: 'bell' },
  { name: 'The Tumbling Water', line: 'waterfalls in the canyon to the south-east', glyph: 'falls' },
  { name: 'The Swallow', line: 'where a lake pours into a pale doorway in the hill', glyph: 'portal' },
  { name: 'The Florilegium', line: 'a glasshouse of many colours, deep in the western wood', glyph: 'glasshouse' },
  { name: 'Corpse-Candle Fen', line: 'a marsh of pale lights south of the keep', glyph: 'candles' },
];

// The chart's window on the world: x east, z south (north is up), metres
const X0 = -370, Z0 = -355, SPAN = 740;
const N = 231; // samples a side (3.2 m each)
const W = 800; // the canvas's backing pixels a side; drawn at the frame's width
const toU = (x) => (x - X0) / SPAN, toV = (z) => (z - Z0) / SPAN;

// Glyphs, 24 units square, drawn in the mark's ink (currentColor) over a dark fill; a few carry their own colour
const G = {
  keep: '<path d="M5 20V9h2.5V6.5H10V9h4V6.5h2.5V9H19v11z" class="f"/><path d="M10.5 20v-4a1.5 1.5 0 0 1 3 0v4"/>',
  slab: '<path d="M8.5 20.5V6l3.5-2.5L15.5 6v14.5z" class="f"/><path d="M10.5 9v6M12 9v6M13.5 9v6M10 13.5l4-2.5"/>',
  house: '<path d="M4.5 20.5v-8h15v8z" class="f"/><path d="M8 12.5a4 4 0 0 1 8 0" fill="#1f9a92" stroke="#3fc0b4"/><path d="M12 8.5V6M10.5 20.5V17a1.5 1.5 0 0 1 3 0v3.5"/><circle cx="7" cy="15.5" r="0.9" fill="#ffbc72" stroke="none"/><circle cx="17" cy="15.5" r="0.9" fill="#b3263a" stroke="none"/>',
  arches: '<path d="M3.5 20.5C3.5 5 20.5 5 20.5 20.5M7 20.5C7 9.5 17 9.5 17 20.5M10.3 20.5c0-6.5 3.4-6.5 3.4 0"/>',
  pool: '<path d="M3.5 9.5c2.5-2 4.5 2 7 0s4.5 2 7 0 2.5 1 3 0.5M3.5 14.5c2.5-2 4.5 2 7 0s4.5 2 7 0 2.5 1 3 0.5" stroke="#8fa6c8"/>',
  stones: '<path d="M4 20v-9l2-1.5 2 1.5v9z" fill="#ffb347" stroke="none"/><path d="M9 20V8.5l1.8-1.5 1.8 1.5V20z" fill="#6a8a6a" stroke="none"/><path d="M13.6 20V9.5l1.8-1.3 1.8 1.3V20z" fill="#5fb89a" stroke="none"/><path d="M18 20v-8l1.5-1.2L21 12v8z" fill="#b06ad4" stroke="none"/>',
  tower: '<path d="M12 2.5l2.8 7.5v8h-5.6v-8z" class="f"/><path d="M4 21.5c3.5-3.5 12.5-3.5 16 0"/>',
  crystal: '<path d="M7.5 20.5L9.5 9l2 11.5zM12 20.5L15 4l3 16.5zM4 20.5l1.8-6.5 1.8 6.5z" fill="#2a4a63" stroke="#7ad7ff"/>',
  table: '<path d="M3.5 11.5h17M6 11.5v7M18 11.5v7"/><circle cx="7" cy="8.5" r="1" class="d"/><circle cx="12" cy="8.5" r="1" class="d"/><circle cx="17" cy="8.5" r="1" class="d"/>',
  door: '<path d="M3.5 7.5h4v3.5h4v3.5h4v3.5h5"/><path d="M15.5 18v-3.5a2.5 2.5 0 0 1 5 0V18z" fill="#c98a4a" stroke="#c98a4a"/>',
  nave: '<path d="M6 16V9.5a6 6 0 0 1 12 0V16M9 16v-5.5a3 3 0 0 1 6 0V16"/><path d="M3.5 18.5c2.5-1.6 4.5 1.6 7 0s4.5 1.6 7 0 2.5 1 3 .5" stroke="#8fa6c8"/>',
  pit: '<circle cx="12" cy="12" r="7.5" class="f"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1.8" fill="#000" stroke="none"/>',
  bell: '<path d="M7.5 16c0-6 1.5-9 4.5-9s4.5 3 4.5 9z" class="f"/><path d="M6 16h12M12 7V4.5M12 18v1.5M4 4.5h16"/>',
  falls: '<path d="M4 6.5h9v14" class="f"/><path d="M14.5 6.5v12M17 7.5v11M19.5 9v10" stroke="#8fa6c8"/>',
  portal: '<path d="M7 17V10a5 5 0 0 1 10 0v7" class="f" stroke="#d9cdb4"/><path d="M3.5 19c2.5-1.6 4.5 1.6 7 0s4.5 1.6 7 0 2.5 1 3 .5" stroke="#8fa6c8"/>',
  glasshouse: '<path d="M4.5 20.5v-7h15v7z" class="f"/><path d="M4.5 13.5L8 8.5h8l3.5 5M12 8.5v12M4.5 17h15"/><path d="M5.2 14.2h6.2v2.3H5.2z" fill="#c9506a" stroke="none"/><path d="M12.6 17.7h6.2v2.2h-6.2z" fill="#4fb8c4" stroke="none"/>',
  candles: '<path d="M7 14c-1.6-2 0-4 0-6 1.5 2 2.5 4 0 6zM13 11c-1.6-2 0-4 0-6 1.5 2 2.5 4 0 6zM17.5 17c-1.6-2 0-4 0-6 1.5 2 2.5 4 0 6z" fill="#9fe8c2" stroke="none"/><path d="M3.5 19.5c2.5-1.4 4.5 1.4 7 0s4.5 1.4 7 0 2.5 1 3 .5" stroke="#6f8a7a"/>',
};

const hash = (i, j) => { let h = (i * 374761393 + j * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
let awake = () => true; // the panel is open: the chart is drawn only then, so a panel shut mid-draw costs the walk nothing
const yieldNow = async () => { await new Promise((r) => setTimeout(r, 0)); while (!awake()) await new Promise((r) => setTimeout(r, 250)); };

// The chart, sampled from the terrain and drawn on a canvas; sliced into pieces of about 12 ms (a 6x-throttled CPU's
// longest task is measured in tools/settings-test.mjs's notes: see runtime.md)
async function drawChart(ctx, canvas) {
  const T = ctx.terrain, cell = SPAN / (N - 1);
  const H = new Float32Array(N * N), WL = new Float32Array(N * N), WOOD = new Float32Array(N * N), ICE = new Float32Array(N * N), ROCK = new Float32Array(N * N), MOSS = new Float32Array(N * N);
  await yieldNow(); // not in the task that built the marks and laid the panel out
  let t = performance.now();
  const tick = async () => { if (performance.now() - t > 12) { await yieldNow(); t = performance.now(); } };
  for (let j = 0; j < N; j++) {
    const z = Z0 + j * cell;
    for (let i = 0; i < N; i++) {
      const x = X0 + i * cell, k = j * N + i;
      const h = T.heightAt(x, z); H[k] = h;
      const wl = T.waterLevelAt(x, z); WL[k] = wl === null ? -1e9 : wl;
      if (!(i & 1) && !(j & 1)) { const b = T.biomeAt(x, z); WOOD[k] = b.wood || 0; ICE[k] = Math.max(b.ice || 0, b.crystal || 0); ROCK[k] = Math.max(b.rock || 0, b.slope || 0); MOSS[k] = Math.max(b.heath || 0, b.marsh || 0, b.orchard || 0); } // the cover at every other sample (it is the slow query, and smooth)
    }
    await tick();
  }
  for (const F of [WOOD, ICE, ROCK, MOSS]) { // fill the odd samples from their even neighbours (N is odd: the last row and column are even)
    for (let j = 0; j < N; j += 2) for (let i = 1; i < N; i += 2) F[j * N + i] = (F[j * N + i - 1] + F[j * N + i + 1]) / 2;
    for (let j = 1; j < N; j += 2) for (let i = 0; i < N; i++) F[j * N + i] = (F[(j - 1) * N + i] + F[(j + 1) * N + i]) / 2;
    await tick();
  }
  // the raster: hillshade lit from the sun's side, the ground's colour by its cover, water flat slate
  const img = new ImageData(N, N), d = img.data;
  const lx = Math.cos(SUN.azimuth), lz = Math.sin(SUN.azimuth), le = Math.sin(0.62), lh = Math.cos(0.62);
  for (let j = 0; j < N; j++) {
  if (!(j & 15)) await tick();
  for (let i = 0; i < N; i++) {
    const k = j * N + i, h = H[k];
    const hx = (H[j * N + Math.min(N - 1, i + 1)] - H[j * N + Math.max(0, i - 1)]) / (2 * cell);
    const hz = (H[Math.min(N - 1, j + 1) * N + i] - H[Math.max(0, j - 1) * N + i]) / (2 * cell);
    const nl = Math.hypot(hx, 1, hz), shade = Math.max(0, (-hx * lx * lh - hz * lz * lh + le) / nl);
    const wet = WL[k] - h;
    let r, g, b;
    if (wet > 0.05) { const deep = Math.min(1, wet / 5); r = 34 - 14 * deep; g = 44 - 16 * deep; b = 64 - 18 * deep; }
    else {
      const rock = Math.min(1, ROCK[k]), ice = Math.min(1, ICE[k]), moss = Math.min(1, MOSS[k]), wood = Math.min(1, WOOD[k]);
      r = 50; g = 37; b = 32; // worn moor, rust-brown
      r += (42 - r) * moss; g += (44 - g) * moss; b += (33 - b) * moss;
      r += (30 - r) * wood; g += (36 - g) * wood; b += (27 - b) * wood;
      r += (58 - r) * rock; g += (52 - g) * rock; b += (60 - b) * rock;
      r += (100 - r) * ice; g += (114 - g) * ice; b += (134 - b) * ice;
      const lit = 0.42 + 0.95 * shade;
      r *= lit; g *= lit; b *= lit;
      const warm = Math.max(0, shade - 0.62) * 0.9, cold = Math.max(0, 0.45 - shade) * 0.8;
      r += 232 * warm * 0.45; g += 89 * warm * 0.45; b += 26 * warm * 0.45;
      r += (34 - r) * cold; g += (30 - g) * cold; b += (56 - b) * cold;
    }
    d[k * 4] = r; d[k * 4 + 1] = g; d[k * 4 + 2] = b; d[k * 4 + 3] = 255;
  }
  }
  await yieldNow();
  const small = document.createElement('canvas'); small.width = small.height = N;
  small.getContext('2d').putImageData(img, 0, 0);
  canvas.width = canvas.height = W;
  const c = canvas.getContext('2d', { willReadFrequently: true }); // read back once for the grain: kept on the CPU, so the read is cheap
  c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
  c.drawImage(small, 0, 0, W, W);
  const P = (i) => i / (N - 1) * W; // a sample index to canvas pixels

  // iso-lines by marching squares over a field f, at level L: segments into the current path
  const iso = (f, L, skip) => {
    for (let j = 0; j < N - 1; j++) for (let i = 0; i < N - 1; i++) {
      const k = j * N + i;
      if (skip && skip(k)) continue;
      const a = f[k] - L, b = f[k + 1] - L, cc = f[k + N + 1] - L, dd = f[k + N] - L;
      const m = (a > 0) | ((b > 0) << 1) | ((cc > 0) << 2) | ((dd > 0) << 3);
      if (m === 0 || m === 15) continue;
      const e = [
        [P(i + a / (a - b)), P(j)], [P(i + 1), P(j + b / (b - cc))],
        [P(i + dd / (dd - cc)), P(j + 1)], [P(i), P(j + a / (a - dd))],
      ];
      const seg = (p, q) => { c.moveTo(e[p][0], e[p][1]); c.lineTo(e[q][0], e[q][1]); };
      switch (m) {
        case 1: case 14: seg(0, 3); break; case 2: case 13: seg(0, 1); break; case 3: case 12: seg(1, 3); break;
        case 4: case 11: seg(1, 2); break; case 6: case 9: seg(0, 2); break; case 7: case 8: seg(2, 3); break;
        case 5: seg(0, 1); seg(2, 3); break; case 10: seg(0, 3); seg(1, 2); break;
      }
    }
  };
  const dry = (k) => WL[k] - H[k] > 0.05 && WL[k + N + 1] - H[k + N + 1] > 0.05;
  // contours every 8 m, every fifth heavier; the walls' are dense and give the chart its relief
  c.lineWidth = 0.8;
  for (let L = -40; L < 420; L += 8) {
    c.beginPath(); iso(H, L, dry);
    c.strokeStyle = L % 40 === 0 ? 'rgba(255,154,92,0.26)' : 'rgba(255,154,92,0.11)';
    c.stroke();
    await tick();
  }
  // shores: a firm line and a fainter one off it, as old charts draw water
  const WD = new Float32Array(N * N); for (let k = 0; k < N * N; k++) WD[k] = WL[k] - H[k];
  await tick();
  c.beginPath(); iso(WD, 0.05); c.strokeStyle = 'rgba(190,206,228,0.7)'; c.lineWidth = 1.4; c.stroke();
  await tick();
  c.beginPath(); iso(WD, 1.2); c.strokeStyle = 'rgba(160,180,210,0.28)'; c.lineWidth = 0.8; c.stroke();
  // the wood: little trees stippled where the cover is wood, a band of rows to one path (filled, then outlined)
  c.lineWidth = 0.9; c.fillStyle = 'rgba(18,24,16,0.85)'; c.strokeStyle = 'rgba(120,150,96,0.55)';
  for (let j0 = 1; j0 < N - 1; j0 += 24) {
    await tick();
    c.beginPath();
    for (let j = j0; j < Math.min(N - 1, j0 + 24); j += 2) for (let i = 1; i < N - 1; i += 2) {
      const k = j * N + i;
      if (WOOD[k] < 0.42 || WD[k] > 0) continue;
      if (hash(i, j) > WOOD[k] * 0.95) continue;
      const x = P(i + hash(j, i) * 1.6 - 0.8), y = P(j + hash(i + 7, j) * 1.6 - 0.8), r = 2.6 + hash(i, j + 3) * 1.4;
      c.moveTo(x + r, y); c.arc(x, y, r, 0, Math.PI * 2);
    }
    c.fill(); c.stroke();
  }
  await tick();
  // ice: short strokes across it, cold
  c.beginPath();
  for (let j = 1; j < N - 1; j += 2) for (let i = 1; i < N - 1; i += 2) {
    const k = j * N + i;
    if (ICE[k] < 0.5) continue;
    const x = P(i), y = P(j); c.moveTo(x - 3, y + 2); c.lineTo(x + 3, y - 2);
  }
  c.strokeStyle = 'rgba(210,228,240,0.35)'; c.lineWidth = 0.8; c.stroke();
  await yieldNow();
  // ways: the paths a visitor walks, dotted, and the old causeway, a double line
  const wx = (x) => toU(x) * W, wz = (z) => toV(z) * W;
  c.setLineDash([2, 4]); c.lineWidth = 1.1; c.strokeStyle = 'rgba(219,170,134,0.42)'; c.beginPath();
  for (const l of ctx.paths?.leads || []) for (const S of l.lines) S.forEach((s, n) => (n ? c.lineTo(wx(s[0]), wz(s[1])) : c.moveTo(wx(s[0]), wz(s[1]))));
  c.stroke(); c.setLineDash([]);
  const road = () => { c.beginPath(); CAUSEWAY_V4.forEach((p, n) => (n ? c.lineTo(wx(p.x), wz(p.z)) : c.moveTo(wx(p.x), wz(p.z)))); c.stroke(); };
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.strokeStyle = 'rgba(219,170,134,0.55)'; c.lineWidth = 4; road();
  c.strokeStyle = 'rgba(30,20,22,0.9)'; c.lineWidth = 2; road();
  // the great bridge: a heavy double line on its piers, gate to gate
  c.strokeStyle = 'rgba(226,200,170,0.75)'; c.lineWidth = 6; c.beginPath(); c.moveTo(wx(-257), wz(215)); c.lineTo(wx(257), wz(215)); c.stroke();
  c.strokeStyle = 'rgba(24,16,18,0.95)'; c.lineWidth = 3; c.stroke();
  c.fillStyle = 'rgba(226,200,170,0.75)';
  for (let x = -240; x <= 240; x += 30) { c.beginPath(); c.arc(wx(x), wz(215), 3.2, 0, Math.PI * 2); c.fill(); }
  // the sun's side: an ember wash off the west edge, and the sun itself on the margin where it hangs
  const sg = c.createLinearGradient(0, 0, W * 0.4, 0); sg.addColorStop(0, 'rgba(232,89,26,0.20)'); sg.addColorStop(1, 'rgba(232,89,26,0)');
  c.fillStyle = sg; c.fillRect(0, 0, W * 0.4, W);
  { // the swollen sun, half off the west margin at its bearing from the keep
    const sx = 0, sy = W / 2 + Math.tan(SUN.azimuth - Math.PI) * -W / 2;
    const g = c.createRadialGradient(sx, sy, 6, sx, sy, 70); g.addColorStop(0, 'rgba(255,140,70,0.75)'); g.addColorStop(0.35, 'rgba(232,89,26,0.35)'); g.addColorStop(1, 'rgba(232,89,26,0)');
    c.fillStyle = g; c.beginPath(); c.arc(sx, sy, 70, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#ff7030'; c.beginPath(); c.arc(sx, sy, 22, 0, Math.PI * 2); c.fill();
  }
  // wear: grain, foxed patches, the edges burnt dark, a double rule
  await yieldNow(); t = performance.now();
  const grain = c.getImageData(0, 0, W, W), gd = grain.data;
  t = performance.now();
  for (let p = 0, n = W * W; p < n; p++) {
    const x = p % W, y = (p / W) | 0, nx = x / W - 0.5, ny = y / W - 0.5;
    if (x === 0 && !(y & 7)) await tick();
    const edge = Math.max(0, Math.hypot(nx, ny) * 1.6 - 0.55);
    const fox = hash((x >> 5) + 11, (y >> 5) + 3) > 0.86 ? 0.9 : 1;
    const k = 1 - edge * 0.9, gr = (hash(x, y) - 0.5) * 14;
    gd[p * 4] = gd[p * 4] * k * fox + gr; gd[p * 4 + 1] = gd[p * 4 + 1] * k * fox + gr; gd[p * 4 + 2] = gd[p * 4 + 2] * k * fox + gr;
  }
  await yieldNow();
  c.putImageData(grain, 0, 0);
  c.strokeStyle = 'rgba(255,154,92,0.5)'; c.lineWidth = 2; c.strokeRect(9, 9, W - 18, W - 18);
  c.lineWidth = 0.8; c.strokeRect(15, 15, W - 30, W - 30);
  // north: a plain needle, top right
  c.save(); c.translate(W - 46, 52);
  c.fillStyle = 'rgba(255,154,92,0.8)'; c.beginPath(); c.moveTo(0, -24); c.lineTo(6, 4); c.lineTo(0, 0); c.lineTo(-6, 4); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(255,154,92,0.6)'; c.lineWidth = 1; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 18); c.stroke();
  c.fillStyle = 'rgba(255,233,219,0.85)'; c.font = '20px "Fell English SC", Georgia, serif'; c.textAlign = 'center'; c.fillText('N', 0, -30);
  c.restore();
}

// The map in the panel: the chart, the marks over it, "you are here", and the line under it
export function buildMap(ctx, host, places, { go, touch, shown }) {
  if (shown) awake = shown;
  host.textContent = '';
  host.classList.add('map');
  const frame = document.createElement('div'); frame.className = 'map-frame';
  const canvas = document.createElement('canvas'); canvas.className = 'map-chart'; canvas.setAttribute('aria-hidden', 'true');
  const leaders = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); leaders.setAttribute('class', 'map-leaders'); leaders.setAttribute('aria-hidden', 'true');
  const you = document.createElement('div'); you.className = 'map-you'; you.setAttribute('aria-hidden', 'true');
  you.innerHTML = '<svg viewBox="-12 -12 24 24"><path d="M0 -11 L4 -3 L-4 -3 Z" class="map-you-dir"/><circle r="4.2"/></svg>';
  const busy = document.createElement('p'); busy.className = 'map-busy'; busy.textContent = 'the chart is being drawn…';
  frame.append(canvas, leaders, busy, you);
  frame.setAttribute('role', 'group'); frame.setAttribute('aria-label', 'a map of the valley: each mark is a place to go');
  const say = document.createElement('div'); say.className = 'map-say'; say.setAttribute('aria-live', 'polite');
  const sayLine = document.createElement('span'); sayLine.className = 'map-line';
  const sayName = document.createElement('span'); sayName.className = 'map-name';
  const goBtn = document.createElement('button'); goBtn.type = 'button'; goBtn.className = 'map-go'; goBtn.textContent = 'Go there'; goBtn.hidden = true;
  const sayText = document.createElement('div'); sayText.className = 'map-text'; sayText.append(sayLine, sayName);
  say.append(sayText, goBtn);
  host.append(frame, say);

  const marks = [];
  for (const M of MARKS) {
    const pl = places.find((p) => p.name === M.name);
    if (!pl) { console.warn('[fp] map: no stand named', M.name); continue; }
    const at = M.at || (pl.look && pl.look !== 'sun' ? { x: pl.look.x, z: pl.look.z } : { x: pl.x, z: pl.z }); // the thing: the mark's own, or where the stand looks
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'map-mark'; b.tabIndex = -1;
    b.setAttribute('aria-label', `${M.name}: ${M.line}`);
    b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${G[M.glyph] || ''}</svg><span class="map-sr">${M.name}</span>`;
    const m = { ...M, place: pl, at, u: toU(at.x), v: toV(at.z), el: b, px: 0, py: 0 };
    b.dataset.mark = String(marks.length);
    frame.appendChild(b);
    marks.push(m);
  }
  if (marks.length) marks[0].el.tabIndex = 0;

  let selected = null, hovered = null, ptr = '', had = null; // ptr, had: the pointer that pressed and what was selected before it (the press focuses, and focus selects)
  const blank = touch ? 'Touch a mark to see what is there; touch it again to go.' : 'Point at a mark to see what is there; click it to go.';
  function show() {
    const m = hovered || selected;
    sayLine.textContent = m ? m.line.charAt(0).toUpperCase() + m.line.slice(1) + '.' : blank;
    sayName.textContent = m ? m.name : '';
    goBtn.hidden = !selected;
    say.classList.toggle('map-say-on', !!m);
    for (const k of marks) k.el.classList.toggle('map-on', k === m);
  }
  function select(m) {
    selected = m;
    for (const k of marks) k.el.tabIndex = k === m ? 0 : -1;
    show();
  }
  show();
  for (const m of marks) {
    const b = m.el;
    b.addEventListener('pointerdown', (e) => { ptr = e.pointerType; had = selected; });
    b.addEventListener('pointercancel', () => { ptr = ''; had = null; }); // a scroll begun on a mark: the next Enter is a key's, not a tap's
    b.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { hovered = m; show(); } });
    b.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && hovered === m) { hovered = null; show(); } });
    b.addEventListener('focus', () => select(m));
    b.addEventListener('click', () => {
      const wasTouch = ptr === 'touch', before = had; ptr = ''; had = null;
      if (wasTouch && before !== m) { select(m); b.focus({ preventScroll: true }); return; } // a first tap says; the second goes
      go(m.place);
    });
    b.addEventListener('keydown', (e) => {
      const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
      if (!dir) return;
      e.preventDefault();
      moveAmongMarks(m, dir[0], dir[1]);
    });
  }
  goBtn.addEventListener('click', () => { if (selected) go(selected.place); });

  // the nearest mark that way (by where the marks are drawn), else none
  function nearestFrom(px, py, dx, dy, list) {
    const l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l;
    let best = null, bs = Infinity;
    for (const k of list) {
      const vx = k.px - px, vy = k.py - py, along = vx * ux + vy * uy;
      if (along <= 2) continue;
      const across = Math.abs(vx * uy - vy * ux);
      if (across > along * 2.2) continue; // within about 65 degrees of the way pressed
      const s = along + 2.2 * across;
      if (s < bs) { bs = s; best = k; }
    }
    return best;
  }
  function moveAmongMarks(m, dx, dy) {
    const n = nearestFrom(m.px, m.py, dx, dy, marks.filter((k) => k !== m));
    if (n) { n.el.focus({ preventScroll: true }); return true; }
    return false;
  }

  // lay the marks out over the frame: each at its place, pushed apart where they crowd (a thumb wants 44 px), with a
  // thin line back to the true spot when moved
  function layout() {
    const w = frame.clientWidth;
    if (!w) return;
    const R = 44, half = R / 2;
    for (const m of marks) { m.tx = m.u * w; m.ty = m.v * w; m.px = m.tx; m.py = m.ty; }
    const sep = R + 4;
    for (let it = 0; it < 140; it++) {
      const pull = it < 100 ? 0.03 : 0; // the last passes only push, so nothing is left on another
      for (let a = 0; a < marks.length; a++) for (let b = a + 1; b < marks.length; b++) {
        const A = marks[a], B = marks[b], dx = B.px - A.px, dy = B.py - A.py, dd = Math.hypot(dx, dy) || 0.01;
        if (dd < sep) { const push = (sep - dd) / 2, ux = dx / dd, uy = dy / dd; A.px -= ux * push; A.py -= uy * push; B.px += ux * push; B.py += uy * push; }
      }
      for (const m of marks) { m.px += (m.tx - m.px) * pull; m.py += (m.ty - m.py) * pull; m.px = Math.min(w - half, Math.max(half, m.px)); m.py = Math.min(w - half, Math.max(half, m.py)); }
    }
    let lines = '';
    for (const m of marks) {
      m.el.style.left = `${m.px - half}px`; m.el.style.top = `${m.py - half}px`;
      if (Math.hypot(m.px - m.tx, m.py - m.ty) > 8) lines += `<line x1="${m.tx.toFixed(1)}" y1="${m.ty.toFixed(1)}" x2="${m.px.toFixed(1)}" y2="${m.py.toFixed(1)}"/><circle cx="${m.tx.toFixed(1)}" cy="${m.ty.toFixed(1)}" r="2.2"/>`;
    }
    leaders.setAttribute('viewBox', `0 0 ${w} ${w}`);
    leaders.innerHTML = lines;
    here();
  }
  function here() {
    const p = ctx.player, w = frame.clientWidth;
    if (!p || !w) return;
    const u0 = toU(p.pos.x), v0 = toV(p.pos.z), off = u0 < 0.02 || u0 > 0.98 || v0 < 0.02 || v0 > 0.98;
    // off the chart (the far wall, the lift's gallery, the icefall's top): an arrow on the edge, pointing out toward them
    const u = Math.min(0.97, Math.max(0.03, u0)), v = Math.min(0.97, Math.max(0.03, v0));
    const deg = off ? Math.atan2(v0 - 0.5, u0 - 0.5) * 180 / Math.PI + 90 : -p.yaw * 180 / Math.PI;
    you.classList.toggle('map-you-off', off);
    you.style.transform = `translate(${(u * w).toFixed(1)}px, ${(v * w).toFixed(1)}px) rotate(${deg.toFixed(1)}deg)`;
  }
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => layout()) : null;
  ro?.observe(frame);
  layout();
  const t0 = performance.now();
  const drawn = drawChart(ctx, canvas).then(() => { api.ms = Math.round(performance.now() - t0); busy.remove(); frame.classList.add('map-drawn'); }).catch((e) => { busy.textContent = 'the chart could not be drawn'; console.warn('[fp] map:', e); });

  const api = {
    ms: null, marks, drawn, layout, here,
    contains: (el) => frame.contains(el),
    markOf: (el) => marks.find((m) => m.el === el) || null,
    moveAmongMarks,
    nearestFrom,
    clear() { hovered = null; show(); },
    get selected() { return selected; },
    focusFirst() { (selected || marks[0])?.el.focus({ preventScroll: true }); },
  };
  return api;
}
