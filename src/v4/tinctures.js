// The Tinctures (DI, wilderness-v5.md; placement plan section 4): each bioregion takes the one sun a little
// differently, so the haze answers in its own hue. "Don't take it too far: subtle regional variation in light, nothing
// extreme. Hue shifts the eye notices on crossing a boundary, not a filter per region; luminance unchanged."
//
// Once a frame, atmosphere's fog colour (already dimmed by the gutter) is turned toward the air hue at the camera
// (ctx.regions.airAt: the regions' own Tinctures blended over 25 m, nothing for the Demesne and the Strandline) and
// rescaled to the luminance it had. The haze, the ground mist and the gutter's own dimming are all computed from that
// colour, so none of them needs to know. ?tinct=0 leaves the air as v4's systems made it. No allocation per frame.
import * as THREE from 'three';

// How far a region can turn the haze: the largest channel change at full strength is MIN for the palest hue (the
// Saltings' rose-white) up to MAX for the strongest (the Adust's red); the hemisphere light takes AMBIENT of it.
const MIN = 0.24, MAX = 0.50, AMBIENT = 0.8;
const lum = (c) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
const relum = (c, l0) => { const l1 = lum(c); if (l1 > 1e-6) c.multiplyScalar(l0 / l1); return c; };

export function makeTinctures(ctx, url = new URL(location.href)) {
  const enabled = url.searchParams.get('tinct') !== '0';
  const air = { color: new THREE.Color(), strength: 0 };
  const ratio = new THREE.Color(), shift = new THREE.Color(1, 1, 1);
  const T = { enabled, color: air.color, strength: 0, k: 0, shift, apply, at };
  let hemi = null, hemiSky, hemiGround, ambient, ambientBase;

  // the fog multiplier at a point: the air hue over its own luminance, its deviation from 1 scaled to a size by hue
  function mult(x, z, out) {
    ctx.regions.airAt(x, z, air);
    const L = lum(air.color);
    T.strength = air.strength;
    if (!enabled || air.strength <= 0.001 || L < 1e-4) { T.k = 0; return out.setRGB(1, 1, 1); }
    const r = air.color.r / L - 1, g = air.color.g / L - 1, b = air.color.b / L - 1;
    const m = Math.max(Math.abs(r), Math.abs(g), Math.abs(b)) || 1e-6;
    const k = T.k = (MIN + (MAX - MIN) * Math.min(1, m / 0.5)) * Math.min(1, air.strength) / m;
    return out.setRGB(1 + r * k, 1 + g * k, 1 + b * k);
  }
  // fog (a Color, the frame's haze colour) -> tinted in place at the same luminance; reads the camera
  function apply(fog) {
    if (!enabled) return fog;
    if (!hemi && ctx.lights) {
      hemi = ctx.lights.hemi; hemiSky = hemi.color.clone(); hemiGround = hemi.groundColor.clone();
      ambient = ctx.lights.ambient; ambientBase = ambient.color.clone();
    }
    const p = ctx.camera.position;
    mult(p.x, p.z, shift);
    const sr = shift.r, sg = shift.g, sb = shift.b, a = AMBIENT;
    const l0 = lum(fog);
    fog.r *= sr; fog.g *= sg; fog.b *= sb; relum(fog, l0);
    if (hemi) { // the light the ground answers with: the same turn, a part of it
      tintLight(hemi.color, hemiSky, sr, sg, sb, a); tintLight(hemi.groundColor, hemiGround, sr, sg, sb, a); tintLight(ambient.color, ambientBase, sr, sg, sb, a);
    }
    return fog;
  }
  // for tests and tools: the multiplier a point would give (a fresh Color)
  function at(x, z) { const o = new THREE.Color(); mult(x, z, o); return { shift: o, color: air.color.clone(), strength: air.strength, k: T.k }; }
  return T;
}

// a light colour turned toward the region's hue at its own luminance (module scope: nothing is allocated per frame)
function tintLight(c, base, sr, sg, sb, a) { const l = lum(base); c.setRGB(base.r * (1 + (sr - 1) * a), base.g * (1 + (sg - 1) * a), base.b * (1 + (sb - 1) * a)); relum(c, l); }
