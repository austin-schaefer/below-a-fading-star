// Shared helpers for the v2 ruins: a sampler of the ground as the terrain mesh draws it, a light
// "sky in the surface" term for glossy things (there is no environment map in this scene), and
// per-vertex recolouring of parts merged with the structures Builder.
import * as THREE from 'three';

// The rendered ground: the terrain mesh's own vertex heights on its own triangle split, so parts sit on
// the visible surface. Reads the live position array, so call it before anything lowers vertices or
// keep the result of snapshot() for a region.
export function meshGround(ctx) {
  const geo = ctx.terrain.mesh.geometry;
  const segs = geo.parameters.widthSegments, size = geo.parameters.width;
  const step = size / segs, half = size / 2, row = segs + 1;
  const P = geo.attributes.position.array;
  function at(x, z) {
    let gx = (x + half) / step, gz = (z + half) / step;
    gx = Math.min(Math.max(gx, 0), segs - 1e-4); gz = Math.min(Math.max(gz, 0), segs - 1e-4);
    const ix = gx | 0, iz = gz | 0, fx = gx - ix, fz = gz - iz;
    const a = (iz * row + ix) * 3 + 1, b = ((iz + 1) * row + ix) * 3 + 1, c = ((iz + 1) * row + ix + 1) * 3 + 1, d = (iz * row + ix + 1) * 3 + 1;
    if (fx + fz <= 1) return P[a] + (P[d] - P[a]) * fx + (P[b] - P[a]) * fz;
    return P[c] + (P[b] - P[c]) * (1 - fx) + (P[d] - P[c]) * (1 - fz);
  }
  function min(x, z, r) { let m = at(x, z); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; m = Math.min(m, at(x + Math.cos(a) * r, z + Math.sin(a) * r)); } return m; }
  function max(x, z, r) { let m = at(x, z); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; m = Math.max(m, at(x + Math.cos(a) * r, z + Math.sin(a) * r)); } return m; }
  function normal(x, z, out = new THREE.Vector3(), e = 0.5) {
    return out.set(at(x - e, z) - at(x + e, z), 2 * e, at(x, z - e) - at(x, z + e)).normalize();
  }
  return { at, min, max, normal, step, half, segs, row };
}

// Recolour the vertices a Builder.add just appended: fn(x, y, z, out Color) for each.
export function recolor(B, from, fn) {
  const c = new THREE.Color();
  for (let i = from; i < B.count; i++) {
    c.setRGB(B.C[i * 3], B.C[i * 3 + 1], B.C[i * 3 + 2]);
    fn(B.P[i * 3], B.P[i * 3 + 1], B.P[i * 3 + 2], c, i);
    B.C[i * 3] = c.r; B.C[i * 3 + 1] = c.g; B.C[i * 3 + 2] = c.b;
  }
}
// Override the moss / wet channels for the vertices just appended.
export function reaux(B, from, fn) {
  for (let i = from; i < B.count; i++) fn(B.A, i * 4, B.P[i * 3], B.P[i * 3 + 1], B.P[i * 3 + 2]);
}

// A glossy surface with no environment map reads black. This adds what it would mirror: the ember
// horizon toward the sun and the violet zenith, by Fresnel, dimmed while the sun gutters.
// Returns GLSL for the fragment, using vViewPosition and normal (view space) at <emissivemap_fragment>.
export const SKY_SHEEN = `
  {
    vec3 sheenV = normalize(vViewPosition);
    vec3 sheenR = reflect(sheenV, normal);                      // view space
    vec3 sheenW = normalize((vec4(sheenR, 0.0) * viewMatrix).xyz); // to world
    float fres = pow(1.0 - clamp(dot(-sheenV, normal), 0.0, 1.0), 4.0);
    float toSun = max(0.0, dot(sheenW, uSheenSun));
    vec3 skyC = mix(vec3(0.16, 0.07, 0.07), vec3(0.05, 0.045, 0.10), smoothstep(-0.05, 0.6, sheenW.y));
    skyC += vec3(0.85, 0.32, 0.12) * pow(toSun, 6.0) * 0.6 + vec3(1.0, 0.55, 0.3) * pow(toSun, 120.0) * 2.5;
    skyC *= smoothstep(-0.35, 0.02, sheenW.y);                 // the ground below mirrors nothing
    totalEmissiveRadiance += skyC * (0.04 + 0.96 * fres) * uSheen * uSheenFlicker;
  }`;

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// A step block whose top is worn into a rounded hollow by feet: deepest a little forward of the middle,
// the nosing rounded off, the riser chipped. Local frame: x across (width w), y up (top at +h/2), z toward
// the front (the riser at +d/2). Returns { g, wear } with wear[i] in 0..1 per vertex (for pale colouring).
// o: { wear (m), nose (m), chip (m), seed, nu, nv, off (hollow's sideways offset, -1..1), notch (break one side) }
export function wornBlock(B, w, h, d, o = {}) {
  const THREE_ = B._T;
  const nu = o.nu || 8, nv = o.nv || 4;
  const g = new THREE_.BoxGeometry(w, h, d, nu, o.ny || 1, nv);
  const pos = g.attributes.position;
  const wear = new Float32Array(pos.count);
  const hx = w / 2, hy = h / 2, hz = d / 2;
  const depth = o.wear ?? 0.06, nose = o.nose ?? 0.04, chip = o.chip ?? 0.03, seed = o.seed || 0, off = o.off || 0;
  const muv = new Float32Array(pos.count * 2);
  const nrm = g.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const ax = Math.abs(nrm.getX(i)), ay = Math.abs(nrm.getY(i));
    if (ax > 0.5) { muv[i * 2] = z + hz; muv[i * 2 + 1] = y + hy; }
    else if (ay > 0.5) { muv[i * 2] = x; muv[i * 2 + 1] = z; }
    else { muv[i * 2] = x + hx; muv[i * 2 + 1] = y + hy; }
    const u = x / hx, v = z / hz; // -1..1, v = +1 at the front
    let hol = 0;
    if (y > hy - 1e-4) {
      // the hollow: a broad trough across the middle, deepest just forward of centre, fading at the ends
      const across = Math.exp(-((u - off) * (u - off)) / (2 * 0.36 * 0.36));
      const along = 0.45 + 0.55 * smooth(-1.0, 0.6, v);
      const edge = (1 - Math.pow(Math.abs(u), 6));
      hol = depth * across * along * edge * (0.85 + 0.3 * B.n3(x * 3.1 + seed, z * 3.1, seed));
      const ns = nose * smooth(0.45, 1.0, v) * (0.6 + 0.4 * across);
      y -= hol + ns;
      wear[i] = Math.min(1, (hol / Math.max(depth, 1e-3)) * 0.9 + across * smooth(0.0, 1.0, v) * 0.35);
    }
    // the riser and the front edge: chipped, bitten by noise
    if (z > hz - 1e-4) {
      const k = chip * Math.max(0, 0.25 + B.n3(x * 4.3 + seed, y * 4.3, seed * 1.7));
      z -= k * (0.4 + 0.6 * smooth(-hy, hy, y));
      if (y > hy - 1e-3 - hol - nose) z -= nose * 0.5;
    }
    // a broken side: one end sheared off at a slant
    if (o.notch) {
      const side = o.notch > 0 ? 1 : -1;
      const cut = 1 - Math.abs(o.notch) * 2; // where along the width (u) the break runs
      const su = u * side;
      if (su > cut) {
        const bite = (su - cut) * hx;
        y -= bite * (1.4 + 0.6 * B.n3(z * 5 + seed, y * 5, 3));
        if (y < -hy) y = -hy;
      }
    }
    pos.setXYZ(i, x, y, z);
  }
  g.setAttribute('muv', new THREE_.BufferAttribute(muv, 2));
  return { g, wear };
}
