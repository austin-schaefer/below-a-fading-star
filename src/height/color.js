// A colour without THREE (v13 L3), for the terrain's bake in a worker: the same arithmetic as THREE.Color to the bit
// for what the bake does with one (a '#rgb' or '#rrggbb' hex in sRGB taken to the linear working space, as three's
// ColorManagement does by default; copy, lerp, multiplyScalar, setRGB in the working space). Duck-typed both ways: a
// THREE.Color can lerp toward one of these and the reverse. tools/height-check.mjs (pure) checks the bake's colours.
const s2l = (c) => (c < 0.04045 ? c * 0.0773993808 : Math.pow(c * 0.9478672986 + 0.0521327014, 2.4)); // three's SRGBToLinear

export class Col {
  constructor(r = 1, g = 1, b = 1) {
    if (typeof r === 'string') { this.r = 1; this.g = 1; this.b = 1; this.setStyle(r); }
    else { this.r = r; this.g = g; this.b = b; }
  }
  setStyle(s) {
    const m = /^#([A-Fa-f0-9]+)$/.exec(s);
    if (!m || (m[1].length !== 3 && m[1].length !== 6)) throw new Error(`Col: only #rgb or #rrggbb, not ${s}`);
    const h = m[1];
    if (h.length === 3) { this.r = s2l(parseInt(h.charAt(0), 16) / 15); this.g = s2l(parseInt(h.charAt(1), 16) / 15); this.b = s2l(parseInt(h.charAt(2), 16) / 15); return this; }
    const n = Math.floor(parseInt(h, 16));
    this.r = s2l(((n >> 16) & 255) / 255); this.g = s2l(((n >> 8) & 255) / 255); this.b = s2l((n & 255) / 255);
    return this;
  }
  setRGB(r, g, b) { this.r = r; this.g = g; this.b = b; return this; }
  copy(c) { this.r = c.r; this.g = c.g; this.b = c.b; return this; }
  lerp(c, a) { this.r += (c.r - this.r) * a; this.g += (c.g - this.g) * a; this.b += (c.b - this.b) * a; return this; }
  multiplyScalar(s) { this.r *= s; this.g *= s; this.b *= s; return this; }
}
export const col = (hex) => new Col(hex);
