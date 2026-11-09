// The Hypogeum's nine glyph forms, as the rest of the map borrows them (v7, the glyph motif). The strokes are the
// lintel's own (glyphStrokes in v2/ruins/hypogeum.js); nothing here adds a form.
//   lintelForms(ctx): the lintel's slot -> form at load, drawn exactly as buildGlyphs draws them (makeRng(7103))
//   strokeTargets(f, scale, n): n points spread evenly along form f's strokes (dots as knots of three), with headings
//   glyphSdfGLSL(): a GLSL function glyphSd(int f, vec2 p), the distance to form f's strokes in glyph units
//   flags(): the URL switches (?glyphs=0, ?scriveners=0, ?moles=0, ?glyphmotif=0)
import { glyphStrokes } from '../../v2/ruins/hypogeum.js';

export const FORMS = 9, SLOTS = 11;

export function lintelForms(ctx) {
  const rng = ctx.makeRng(7103);
  const forms = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  for (let i = forms.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [forms[i], forms[j]] = [forms[j], forms[i]]; }
  while (forms.length < SLOTS) forms.push(Math.floor(rng() * 9));
  return forms;
}

// "the glyph the bronze door showed last": the form most recently pushed off the lintel's end, which after a shift
// has come round to the first slot; before the first shift of the session, the last slot's
export function doorsLast(ctx, fallback) {
  const h = ctx.hypogeum;
  if (!h) return fallback[SLOTS - 1];
  return h.shifts > 0 ? h.glyphOrder[0] : h.glyphOrder[SLOTS - 1];
}

// stroke primitives as segments (rings unrolled into 24 chords) plus dots
export function prims(f) {
  const segs = [], dots = [];
  for (const s of glyphStrokes(f)) {
    if (s[0] === 's') segs.push([s[1], s[2], s[3], s[4]]);
    else if (s[0] === 'r') { const [, x, y, r] = s; for (let k = 0; k < 24; k++) { const a = (k / 24) * 6.2832, b = ((k + 1) / 24) * 6.2832; segs.push([x + Math.cos(a) * r, y + Math.sin(a) * r, x + Math.cos(b) * r, y + Math.sin(b) * r]); } }
    else dots.push([s[1], s[2]]);
  }
  return { segs, dots };
}

// n targets on form f, scaled: every dot a knot of three, the rest spread evenly along the strokes' total length
// (never closer than `minStep` m; with fewer fish than that allows, the gaps open). Returns Float32Array(n * 3): x, y, heading.
export function strokeTargets(f, scale, n, minStep = 0.09) {
  const { segs, dots } = prims(f), out = new Float32Array(n * 3);
  let L = 0; for (const s of segs) L += Math.hypot(s[2] - s[0], s[3] - s[1]) * scale;
  const nd = Math.min(dots.length * 3, n), ns = n - nd;
  const step = Math.max(minStep, L / Math.max(1, ns));
  let k = 0, carry = step * 0.5;
  for (const s of segs) {
    const l = Math.hypot(s[2] - s[0], s[3] - s[1]) * scale, h = Math.atan2(s[3] - s[1], s[2] - s[0]);
    while (carry <= l && k < ns) { const u = carry / l; out[k * 3] = (s[0] + (s[2] - s[0]) * u) * scale; out[k * 3 + 1] = (s[1] + (s[3] - s[1]) * u) * scale; out[k * 3 + 2] = h; k++; carry += step; }
    carry -= l;
  }
  // any fish left over (rounding) lie on the strokes again from the start, half a step along
  for (let j = 0; k < ns; j++, k++) { const s = segs[j % segs.length]; out[k * 3] = (s[0] + s[2]) * 0.5 * scale; out[k * 3 + 1] = (s[1] + s[3]) * 0.5 * scale; out[k * 3 + 2] = Math.atan2(s[3] - s[1], s[2] - s[0]); }
  // the dots: three fish nose to tail round each, a tight knot (a dot's own disc on the lintel is 0.02 units)
  for (let d = 0; k < n; d++) {
    const [x, y] = dots[Math.floor(d / 3) % dots.length], a = (d % 3) * 2.094 + 0.4, r = 0.06; // m: three 14 cm fish nose to tail
    out[k * 3] = x * scale + Math.cos(a) * r; out[k * 3 + 1] = y * scale + Math.sin(a) * r; out[k * 3 + 2] = a + 1.5708; k++;
  }
  return out;
}

// the distance from (x, y) (glyph units) to form f's strokes, dots as discs of radius `dotR`
export function strokeDistance(f, x, y, dotR = 0) {
  const { segs, dots } = prims(f);
  let d = Infinity;
  for (const [ax, ay, bx, by] of segs) {
    const ex = bx - ax, ey = by - ay, t = Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / (ex * ex + ey * ey || 1)));
    d = Math.min(d, Math.hypot(x - ax - ex * t, y - ay - ey * t));
  }
  for (const [px, py] of dots) d = Math.min(d, Math.max(0, Math.hypot(x - px, y - py) - dotR));
  return d;
}

const g = (v) => v.toFixed(4);
let sdfCache = null;
// GLSL: float glyphSd(int f, vec2 p): distance in glyph units to form f's strokes; dots are discs of radius 0.02
export function glyphSdfGLSL() {
  if (sdfCache) return sdfCache;
  let body = '';
  for (let f = 0; f < FORMS; f++) {
    const lines = [];
    for (const s of glyphStrokes(f)) {
      if (s[0] === 's') lines.push(`d = min(d, glSeg(p, vec2(${g(s[1])}, ${g(s[2])}), vec2(${g(s[3])}, ${g(s[4])})));`);
      else if (s[0] === 'r') lines.push(`d = min(d, abs(length(p - vec2(${g(s[1])}, ${g(s[2])})) - ${g(s[3])}));`);
      else lines.push(`d = min(d, max(length(p - vec2(${g(s[1])}, ${g(s[2])})) - 0.012, 0.0));`);
    }
    body += `  ${f ? 'else ' : ''}if (f == ${f}) { ${lines.join(' ')} }\n`;
  }
  sdfCache = `
float glSeg(vec2 p, vec2 a, vec2 b) { vec2 e = b - a, w = p - a; float t = clamp(dot(w, e) / dot(e, e), 0.0, 1.0); return length(w - e * t); }
float glyphSd(int f, vec2 p) {
  float d = 1e3;
${body}  return d;
}`;
  return sdfCache;
}

export function flags() {
  const q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
  const off = (k) => q.get(k) === '0';
  const all = !off('glyphs');
  return { all, scriveners: all && !off('scriveners'), moles: all && !off('moles'), motif: all && !off('glyphmotif') };
}
