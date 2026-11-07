// The Parhelion City: spires on the western horizon, in the sun's saddle and spreading a little
// either side of it. Most of the time it is a ghost, a faint darkening of the glow you only see
// once you have noticed it; while the sun gutters it comes up solid and dark, with a few lit
// windows, and fades back as the light returns. It never covers the sun's disc: it stands beside
// and below it.
// Three silhouette layers (back, middle, front) painted once into one canvas atlas, drawn as three
// curved strips in one draw call. Each strip is laid out in bearing and elevation as seen from the
// castle gate, at its own notional distance (13 km, 7.5 km, 4.5 km): the vertex shader finds that
// point, turns it into a direction from the eye and draws it 2 km out, so the layers parallax
// against each other (and the mountains hide them) as you walk, but nothing reaches the far plane.
// The lowest degree or so shimmers like heat haze. Exposes ctx.parhelion = { solidity }.
import * as THREE from 'three';
import { SKY_GLSL, withSky } from './common.js';

const B0 = 236, B1 = 276;      // bearing span of every strip (degrees)
const E0 = 4.0, E1 = 22.0;     // elevation span (degrees)
const BASE = 5.0;              // the city's ground line, a little under the saddle floor seen from the gate
const W = 1024, H = 320;       // one layer's band in the atlas
const DIST = [13000, 7500, 4500];  // back, mid, front: notional distances (metres)
const RADIUS = [2250, 2150, 2050]; // drawn at (from the eye)

const VS = /* glsl */`
  attribute float aLayer;
  uniform vec3 uAnchor; uniform vec3 uDist, uRad;
  varying vec2 vUv; varying float vLayer, vElev; varying vec3 vDir;
  void main() {
    float b = radians(mix(${B0.toFixed(1)}, ${B1.toFixed(1)}, uv.x));
    float e = radians(mix(${E0.toFixed(1)}, ${E1.toFixed(1)}, uv.y));
    vec3 ds = vec3(sin(b) * cos(e), sin(e), -cos(b) * cos(e));
    float D = aLayer < 0.5 ? uDist.x : aLayer < 1.5 ? uDist.y : uDist.z;
    float R = aLayer < 0.5 ? uRad.x : aLayer < 1.5 ? uRad.y : uRad.z;
    vec3 dc = normalize(uAnchor + ds * D - cameraPosition);
    vDir = dc; vUv = uv; vLayer = aLayer; vElev = degrees(e);
    gl_Position = projectionMatrix * viewMatrix * vec4(cameraPosition + dc * R, 1.0);
  }`;

const FS = /* glsl */`
  ${SKY_GLSL}
  uniform sampler2D uAtlas;
  uniform float uSolid;
  uniform vec3 uDark, uWindow;
  varying vec2 vUv; varying float vLayer, vElev; varying vec3 vDir;
  void main() {
    vec3 d = normalize(vDir);
    // heat haze: the lowest couple of degrees waver
    float haze = 1.0 - smoothstep(${BASE.toFixed(1)}, ${(BASE + 2.2).toFixed(1)}, vElev);
    vec2 uv = vUv;
    float wob = sin(uv.y * 900.0 + uT * 2.1 + uv.x * 140.0) * 0.6 + sin(uv.y * 1500.0 - uT * 3.3 + uv.x * 60.0) * 0.4;
    uv.x += wob * haze * 0.0016;
    uv.y += sin(uv.x * 700.0 + uT * 1.7) * haze * 0.0012;
    vec4 tx = texture2D(uAtlas, vec2(uv.x, (vLayer + clamp(uv.y, 0.004, 0.996)) / 3.0));
    float cover = tx.r;
    // each layer has its own air: the far ones are paler and thinner
    float far = vLayer < 0.5 ? 1.0 : vLayer < 1.5 ? 0.55 : 0.2;
    vec3 sky = sl_sky(d);
    float ghostA = mix(0.26, 0.14, far);
    float solidA = mix(0.96, 0.62, far);
    float a = cover * mix(ghostA, solidA, uSolid);
    vec3 col = mix(sky * 0.62, mix(uDark, sky, 0.12 + 0.45 * far), uSolid);
    // the base dissolves into the haze it shimmers in
    a *= 1.0 - 0.55 * haze;
    col = mix(col, sky, haze * 0.35);
    // a few windows, lit one after another as it hardens, out again as it fades
    float th = 0.25 + 0.6 * tx.b;
    float lit = tx.g * smoothstep(th, th + 0.12, uSolid) * step(0.5, vLayer);
    lit *= 0.75 + 0.25 * sin(uT * (0.7 + tx.b * 2.3) + tx.b * 40.0);
    col += uWindow * lit * (vLayer > 1.5 ? 1.0 : 0.55);
    a = max(a, lit * 0.9);
    // never over the sun's disc (radius 0.072 rad) or its seething rim
    float ang = acos(clamp(dot(d, uSunDir), -1.0, 1.0));
    a *= smoothstep(0.074, 0.083, ang);
    gl_FragColor = vec4(col, a);
  }`;

// ---------------------------------------------------------------- the silhouettes
// Painted in degrees: x is bearing, y is elevation. Coverage goes in red, lit windows in green
// (blue holds each window's moment of lighting).
function paintAtlas(rng) {
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H * 3;
  const g = cv.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H * 3);
  const sx = W / (B1 - B0), sy = H / (E1 - E0);
  const R = (a, b) => a + (b - a) * rng();
  const windows = [];

  // how tall the city stands along the horizon: low under the sun, tallest just right of it,
  // a few needles squeezed in left of it
  function envelope(b) {
    if (b < 242.5) return 4.0;
    if (b < 246.4) return 10.0;
    if (b < 253.8) return 4.2;
    if (b < 256) return 8.5;
    if (b < 263.5) return 13.5;
    if (b < 268) return 9.0;
    return 5.0;
  }

  for (let L = 0; L < 3; L++) {
    const top = (2 - L) * H; // canvas band for this layer (flipY puts layer 0 at the bottom)
    const X = (b) => (b - B0) * sx, Y = (e) => top + (E1 - e) * sy;
    const scale = [0.55, 0.78, 1.0][L];   // farther layers stand lower
    const wsc = [0.45, 0.7, 1.0][L];      // and thinner
    g.fillStyle = 'rgb(255,0,0)';
    const poly = (pts) => { g.beginPath(); pts.forEach(([b, e], i) => (i ? g.lineTo(X(b), Y(e)) : g.moveTo(X(b), Y(e)))); g.closePath(); g.fill(); };
    const ellipse = (b, e, rb, re, a0 = 0, a1 = Math.PI * 2) => { g.beginPath(); g.ellipse(X(b), Y(e), rb * sx, re * sy, 0, a0, a1); g.fill(); };

    // the fabric: a ragged roofline of walls and halls the whole width
    {
      const pts = [[B0, E0]];
      let b = B0;
      while (b < B1) {
        const w = R(0.15, 0.7) * wsc;
        const h = BASE + Math.min(envelope(b) * 0.3, R(0.8, 2.3)) * scale;
        pts.push([b, h]);
        if (rng() < 0.3) { pts.push([b + w * 0.4, h + R(0.1, 0.4) * scale]); pts.push([b + w * 0.6, h]); }
        pts.push([b + w, h]);
        b += w;
      }
      pts.push([B1, E0]);
      poly(pts);
    }

    // towers
    const towers = [];
    const n = [90, 60, 38][L];
    for (let i = 0; i < n; i++) {
      // more of them where the envelope is high
      // crowded into the saddle, thinning out to either side where the walls hide it anyway
      let b = rng() < 0.7 ? 255 + (rng() + rng() + rng() - 1.5) * 9 : R(B0 + 0.5, B1 - 0.5);
      b = Math.min(B1 - 0.5, Math.max(B0 + 0.5, b));
      const env = envelope(b) * scale;
      const h = env * Math.pow(R(0.25, 1), 1.3);
      if (h < 0.6) continue;
      const w = R(0.2, 0.55) * wsc * (0.6 + 0.4 * Math.min(1, h / 5));
      const lean = rng() < 0.3 ? R(-0.22, 0.22) : R(-0.03, 0.03);
      const base = BASE + R(0.1, 0.9) * scale;
      towers.push({ b, h, w, lean, base });
      const tip = base + h;
      const sh = (e) => (e - base) * lean; // shear as it rises
      const style = rng();
      if ((style < 0.12 && h < 4) || (style < 0.45 && envelope(b) < 5 && h < 4)) {
        // a dome on a drum
        const dw = w * R(2.2, 3.2), drum = base + h * 0.45;
        poly([[b - dw / 2, base], [b + dw / 2, base], [b + dw / 2, drum], [b - dw / 2, drum]]);
        ellipse(b, drum, dw / 2, h * 0.45, Math.PI, Math.PI * 2);
        poly([[b - 0.02, drum + h * 0.4], [b + 0.02, drum + h * 0.4], [b, drum + h * 0.75]]);
        continue;
      }
      // the shaft: tapering, maybe stepped in tiers, ending in a needle or broken off
      const tiers = 1 + ((rng() * 3) | 0);
      let e = base, ww = w;
      const shaftTop = base + h * R(0.55, 0.8);
      for (let t = 0; t < tiers; t++) {
        const e2 = e + (shaftTop - e) / (tiers - t);
        const w2 = ww * R(0.72, 0.92);
        poly([[b - ww / 2 + sh(e), e], [b + ww / 2 + sh(e), e], [b + w2 / 2 + sh(e2), e2], [b - w2 / 2 + sh(e2), e2]]);
        // a gallery ring where the tiers meet
        if (t < tiers - 1 || rng() < 0.4) poly([[b - w2 * 0.75 + sh(e2), e2 - 0.06], [b + w2 * 0.75 + sh(e2), e2 - 0.06], [b + w2 * 0.6 + sh(e2), e2 + 0.08], [b - w2 * 0.6 + sh(e2), e2 + 0.08]]);
        e = e2; ww = w2;
        if (L > 0 && h > 1.5 && rng() < 0.55) windows.push({ L, b: b + sh(e2 - 0.4) + R(-0.25, 0.25) * ww, e: e2 - R(0.2, 0.6), w: ww * 0.22 });
      }
      const top2 = rng();
      if (top2 < 0.15) {
        // broken off: a jagged stump
        poly([[b - ww / 2 + sh(e), e], [b - ww * 0.1 + sh(e), e + 0.25], [b + ww * 0.15 + sh(e), e + 0.1], [b + ww / 2 + sh(e), e + 0.35], [b + ww / 2 + sh(e), e]]);
      } else if (top2 < 0.4) {
        // an onion bulb and a needle
        const r = ww * R(0.7, 1.1);
        ellipse(b + sh(e + r), e + r * 0.9, r, r * 1.1);
        poly([[b - ww * 0.12 + sh(e + r * 1.7), e + r * 1.7], [b + ww * 0.12 + sh(e + r * 1.7), e + r * 1.7], [b + sh(Math.max(tip, e + r * 2.4)), Math.max(tip, e + r * 2.4)]]);
      } else {
        poly([[b - ww / 2 + sh(e), e], [b + ww / 2 + sh(e), e], [b + sh(tip), tip]]);
        // now and then a cross-arm or a pair of horns near the top
        if (rng() < 0.2) { const ea = e + (tip - e) * 0.3; poly([[b - ww * 1.6 + sh(ea), ea], [b + ww * 1.6 + sh(ea), ea], [b + ww * 1.6 + sh(ea), ea + 0.07], [b - ww * 1.6 + sh(ea), ea + 0.07]]); }
      }
    }

    // bridges between neighbouring towers, some of them broken
    towers.sort((a, b) => a.b - b.b);
    for (let i = 0; i < towers.length - 1; i++) {
      const A = towers[i], Bt = towers[i + 1];
      const span = Bt.b - A.b;
      if (span < 0.35 * wsc || span > 2.4 * wsc || Math.min(A.h, Bt.h) < 1.6 * scale || rng() > 0.7) continue;
      const e = Math.min(A.base, Bt.base) + Math.min(A.h, Bt.h) * R(0.3, 0.6);
      const th = R(0.07, 0.14) * scale;
      const xa = A.b + (e - A.base) * A.lean, xb = Bt.b + (e - Bt.base) * Bt.lean;
      const broken = rng() < 0.25;
      const xe = broken ? xa + (xb - xa) * R(0.3, 0.7) : xb;
      const rise = Math.min(0.6, span * 0.25) * scale;
      g.beginPath();
      g.moveTo(X(xa), Y(e + th)); g.lineTo(X(xe), Y(e + th));
      g.lineTo(X(xe), Y(e - (broken ? th * 0.5 : 0)));
      g.quadraticCurveTo(X((xa + xe) / 2), Y(e + rise * 0.5), X(xa), Y(e - rise * 0.3));
      g.closePath(); g.fill();
    }
  }

  // windows: few, small, mostly on the front and middle layers right of the sun
  let lit = 0;
  for (const w of windows) {
    if (lit >= 34) break;
    if (w.b > 246 && w.b < 254 && w.e > 8.8) continue; // nothing in front of the disc anyway
    const top = (2 - w.L) * H, X = (b) => (b - B0) * sx, Y = (e) => top + (E1 - e) * sy;
    const blue = (rng() * 255) | 0;
    g.fillStyle = `rgb(255,255,${blue})`;
    const pw = Math.max(2, w.w * sx), ph = Math.max(2.5, 0.16 * sy);
    g.fillRect(Math.round(X(w.b) - pw / 2), Math.round(Y(w.e)), Math.round(pw), Math.round(ph));
    lit++;
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = THREE.ClampToEdgeWrapping; tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 4;
  return { tex, windows: lit };
}

export function buildParhelion(ctx, U, rng) {
  const segU = ctx.quality === 'high' ? 64 : 36, segV = 4;
  // three strips in one geometry, back first so they blend in order
  const pos = [], uvs = [], lay = [], idx = [];
  for (let L = 0; L < 3; L++) {
    const o = pos.length / 3;
    for (let j = 0; j <= segV; j++) for (let i = 0; i <= segU; i++) {
      pos.push(0, 0, 0); uvs.push(i / segU, j / segV); lay.push(L);
    }
    for (let j = 0; j < segV; j++) for (let i = 0; i < segU; i++) {
      const a = o + j * (segU + 1) + i, b = a + 1, c = a + segU + 1, d = c + 1;
      idx.push(a, b, d, a, d, c);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('aLayer', new THREE.Float32BufferAttribute(lay, 1));
  geo.setIndex(idx);

  const { tex, windows } = paintAtlas(rng);
  const sp = ctx.spawn;
  const anchor = new THREE.Vector3(sp.x, ctx.terrain.heightAt(sp.x, sp.z) + 1.7, sp.z);
  const mat = new THREE.ShaderMaterial({
    uniforms: withSky(U, {
      uAtlas: { value: tex }, uSolid: { value: 0 },
      uAnchor: { value: anchor },
      uDist: { value: new THREE.Vector3(...DIST) }, uRad: { value: new THREE.Vector3(...RADIUS) },
      uDark: { value: new THREE.Color('#0c080e') }, uWindow: { value: new THREE.Color('#ffb070').multiplyScalar(1.6) },
    }),
    vertexShader: VS, fragmentShader: FS,
    transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'skylife-parhelion'; mesh.frustumCulled = false; mesh.renderOrder = 1;
  mesh.matrixAutoUpdate = false;
  ctx.scene.add(mesh);

  const state = { solidity: 0, force: null };
  function update(dt) {
    const f = U.uFlicker.value;
    const target = THREE.MathUtils.clamp((0.92 - f) / 0.5, 0, 1);
    // it hardens fast as the light fails, and lets go slowly as it returns
    const rate = target > state.solidity ? 2.6 : 0.32;
    state.solidity += (target - state.solidity) * Math.min(1, dt * rate);
    if (state.force != null) state.solidity = state.force;
    mat.uniforms.uSolid.value = state.solidity;
  }
  return { mesh, update, state, tris: idx.length / 3, windows };
}
