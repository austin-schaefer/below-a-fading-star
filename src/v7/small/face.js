// The Simulacrum's face: "a long grave face the size of a man's" (index.md, design gap 22: life-size, about 0.22 m wide and
// 0.32 m tall), as points on a relief. Long and narrow, deep eye hollows (left empty: the dark is the eye), brows over them,
// a long nose ridge, a closed straight mouth, sunken cheeks. More points on the contour, the brows, the nose and the mouth
// than anywhere else, so it reads as a face of points.
// facePoints(n, rng) -> Float32Array(n * 4): x (right), y (up), z (toward the viewer), light (0..1: how much of the faint
// pale light that point catches: the brows, the nose, the cheekbones and the chin most, the hollows least). Metres.
const W = 0.11, H = 0.16; // half-width, half-height

// the parts and their share of the points; each draws a point in the face's frame
const PARTS = [
  // the contour: a long narrow oval, the jaw a little squarer, temples drawn in
  [0.28, (r) => { const a = r() * 6.2832, s = Math.sin(a), c = Math.cos(a); const wq = W * (s < 0 ? 0.9 + 0.1 * Math.abs(c) : 1 - 0.08 * s * s); return [c * wq, s * H, -0.02 - 0.02 * Math.abs(c), 0.55]; }],
  // the brows: two heavy arcs over the hollows, close to the nose's root
  [0.16, (r) => { const sd = r() < 0.5 ? -1 : 1, u = r(); return [sd * (0.012 + u * 0.05), 0.045 + Math.sin(u * 3.1416) * 0.008 - u * 0.006 + (r() - 0.5) * 0.006, 0.02, 1.0]; }],
  // the eye hollows' rims: rings round the sockets, the inside empty
  [0.12, (r) => { const sd = r() < 0.5 ? -1 : 1, a = r() * 6.2832; return [sd * 0.038 + Math.cos(a) * 0.022, 0.022 + Math.sin(a) * 0.014, 0.0, Math.sin(a) > 0 ? 0.35 : 0.6]; }],
  // the nose: a long ridge from between the brows down to the tip, the wings of the nostrils at its foot
  [0.17, (r) => { const u = r(); if (u < 0.78) { const v = u / 0.78; return [(r() - 0.5) * 0.006, 0.04 - v * 0.095, 0.02 + v * 0.025, 0.9]; } const sd = r() < 0.5 ? -1 : 1; return [sd * (0.008 + r() * 0.012), -0.058 + (r() - 0.5) * 0.006, 0.03, 0.55]; }],
  // the mouth: closed, straight, long
  [0.11, (r) => { const u = r() * 2 - 1; return [u * 0.034, -0.09 + (r() - 0.5) * 0.003 - Math.abs(u) * 0.003, 0.01, 0.45]; }],
  // the cheeks: sunken lines from under the cheekbones down toward the jaw, and the bones over them
  [0.1, (r) => { const sd = r() < 0.5 ? -1 : 1, u = r(); if (u < 0.6) { const v = u / 0.6; return [sd * (0.07 - v * 0.012), -0.01 - v * 0.08, -0.012, 0.3]; } const v = (u - 0.6) / 0.4; return [sd * (0.045 + v * 0.03), -0.004 - v * 0.004, 0.012, 0.85]; }],
  // the chin and the forehead, sparse
  [0.06, (r) => { if (r() < 0.5) { const u = r() * 2 - 1; return [u * 0.03, -0.135 + Math.abs(u) * 0.01, 0.0, 0.8]; } const u = r() * 2 - 1; return [u * 0.06, 0.09 + r() * 0.04, 0.0, 0.7]; }],
];

export function facePoints(n, rng) {
  const out = new Float32Array(n * 4);
  const counts = PARTS.map(([w]) => Math.round(w * n));
  let k = 0, fix = n - counts.reduce((a, b) => a + b, 0);
  counts[0] += fix;
  PARTS.forEach(([, fn], pi) => {
    for (let j = 0; j < counts[pi] && k < n; j++, k++) {
      const [x, y, z, l] = fn(rng);
      out[k * 4] = x; out[k * 4 + 1] = y; out[k * 4 + 2] = z; out[k * 4 + 3] = l;
    }
  });
  return out;
}
