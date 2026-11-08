// BP The Saltings [Proposed] (wilderness-v5.md; shape and site in wilderness-v4-placement.md section 2,
// REGIONS.saltings in world.js). "What the Wrong Colour has been doing to the land for a long time: a salt-flat ...
// a white crust cracked into plates with pink gypsum roses at the joints, glasswort gone blood-red along the
// runnels, a margin of the same grey brittle reeds that ring the eddy. No stone at all, only crust and a few
// bleached stumps. Heat shimmer lies on it; the crust creaks underfoot and the wind lifts a fine salt that stings
// the light. The boundary is a tideline of grey reeds and a step of a metre down from the moor. Only here: the
// halite crabs, pale and sideways, their backs crusted the colour of the flat, that drop into holes in the plates
// when you come near and leave star-patterns of pellets round each hole."
// Per Austin, "snaky": a strip along the fen's and the river mouth's rim (placement plan), not the brief's plate.
// Kept clear for later releases: the Discontinued Track's line from (170, 150) to (215, 160) (DC), the pit's block
// and the causeway's new route (CAUSEWAY_V4) through the east lobe.
import * as THREE from 'three';
import { REGIONS, SITES, CAUSEWAY_V4, LANDMARKS } from '../../world.js';
import { makeSimplex, smoothstep, lerp, clamp, hyp } from '../../noise.js';
import { groundOf, instanced, airMotes, meshStats, compose } from './common.js';

const KEY = 'saltings';
// the slabs' distance field (set by build): the crust raises its lip round them, and the stone material
// (structures/materials.js) keeps moss off their tops, salt-bleached, where they lie on the crust
export const CRUST_PAVE = { uPave: { value: null }, uPaveBox: { value: new THREE.Vector4(0, 0, 0, 0) } };
const SPINE = REGIONS.saltings.shape.strip;
const FEN = LANDMARKS.fen;
const SN = makeSimplex(8811);
const DROP = 1.0;

// the runnels: shallow drainage lines wandering across the flat (the same function on the CPU, for the
// glasswort, and in the crust's shader)
const runnel = (x, z) => Math.abs(Math.sin(x * 0.11 + z * 0.07 + 1.7 * Math.sin(x * 0.031 + z * 0.023)));
const RUNNEL_GLSL = 'abs(sin(p.x * 0.11 + p.y * 0.07 + 1.7 * sin(p.x * 0.031 + p.y * 0.023)))';

// a metre's step down from the moor at the tideline, the flat's own small relief smoothed; never below the fen's
// water where the strip runs along its rim
export function height(h, x, z, w) {
  const s = smoothstep(0.3, 0.7, w);
  let h2 = h - DROP * s - SN.fbm2(x * 0.08, z * 0.08, 2) * 0.12 * s;
  h2 -= (1 - smoothstep(0.06, 0.16, runnel(x, z))) * 0.12 * s; // the runnels, a hand deep
  if (hyp(x - FEN.x, z - FEN.z) < 84) h2 = Math.max(h2, Math.min(h, -2.25));
  return h2;
}

const C = (h) => new THREE.Color(h);
const cCrust = C('#cfc4c0'), cPink = C('#c8a0a0'), cDamp = C('#8a7e78');
const _gc = new THREE.Color();
export function ground(col, x, z, w) {
  const n = SN.fbm2(x * 0.05 + 3, z * 0.05, 3) * 0.5 + 0.5;
  _gc.copy(cCrust).lerp(cPink, smoothstep(0.55, 0.8, n) * 0.35);
  _gc.lerp(cDamp, (1 - smoothstep(0.05, 0.25, runnel(x, z))) * 0.5);
  col.lerp(_gc, smoothstep(0.2, 0.8, w));
}

// no grass, heather, bracken, flowers or trees on the crust; a little sedge and reed at the fen's side
export const cover = {
  density: { grass: 0, sedge: 0.25, heather: 0, bracken: 0, flowers: 0, fleshy: 0, reeds: 0.35, trees: 0 },
};
export const stone = { density: 0, tors: false }; // "no stone at all"
export const air = { tint: '#f4dede', strength: 1 }; // "rose-white glare" (DI)

// ---------------------------------------------------------------- sound: the crust creaking underfoot
export const sound = {
  start(k) {
    const { ac, panner, setPos, filt, gainOf, chain, white, camera } = k;
    const rng = k.makeRng(8101);
    // and now and then out on the flat, a plate settling as it cools
    const bus = gainOf(0); bus.connect(k.master); k.send(bus, 0.3);
    const pan = panner('equalpower', 5, 1.1, 120); pan.connect(bus);
    let next = 3;
    function creak(dest, at, vol, pitch, crackles = 5) {
      // a brittle crackle of crust plates breaking, and under it a short dry creak
      for (let i = 0; i < crackles; i++) {
        const tt = at + i * (0.008 + rng() * 0.022), g = gainOf(0); k.env(g, tt, (0.06 + rng() * 0.06) * vol, 0.0006, 0.012 + rng() * 0.02);
        const s = ac.createBufferSource(); s.buffer = white; s.start(tt, rng() * 2, 0.05);
        chain(s, filt('highpass', (2400 + rng() * 3500) * pitch, 0.8), g, dest);
      }
      const o = ac.createOscillator(); o.type = 'sawtooth';
      const f0 = (95 + rng() * 60) * pitch; o.frequency.setValueAtTime(f0, at + 0.01); o.frequency.linearRampToValueAtTime(f0 * (0.8 + rng() * 0.5), at + 0.11);
      const og = gainOf(0); k.env(og, at + 0.01, 0.07 * vol, 0.01, 0.1);
      chain(o, filt('bandpass', f0 * 4, 4), og, dest); o.start(at); o.stop(at + 0.2);
    }
    return {
      step(x, z, at, vol, pitch, out) { creak(out, at, vol * 1.6, pitch, 4 + (rng() * 4 | 0)); return true; },
      tick(w, x, z, step, t, now) {
        bus.gain.setTargetAtTime(w > 0.02 ? w : 0, now, 0.5);
        if (w <= 0.1) return;
        next -= step;
        if (next <= 0) {
          const a = rng() * 6.283, r = 8 + rng() * 30;
          setPos(pan, x + Math.cos(a) * r, camera.position.y - 1.7, z + Math.sin(a) * r);
          creak(pan, now + k.lead() + 0.02, 0.5, 0.8 + rng() * 0.3, 2 + (rng() * 3 | 0));
          next = (2 + rng() * 5) / w;
        }
      },
    };
  },
};

// ---------------------------------------------------------------- the crust, glasswort, reeds, stumps, crabs
export async function build(ctx) {
  const { scene, terrain, regions } = ctx;
  const low = ctx.quality === 'low';
  const rng = ctx.makeRng(8100);
  const G = groundOf(terrain);
  const W = {};
  const wAt = (x, z) => regions.regionAt(x, z, W).saltings;
  const meshes = [];
  const keepOut = (x, z, m = 0) => {
    // the Discontinued Track's strip, the pit's block, the causeway's new route
    const ex = 215 - 170, ez = 160 - 150, t = clamp(((x - 170) * ex + (z - 150) * ez) / (ex * ex + ez * ez), 0, 1);
    if (hyp(x - 170 - ex * t, z - 150 - ez * t) < 3 + m) return true;
    const b = SITES.pit.block; if (x > b[0] - m && x < b[1] + m && z > b[2] - m && z < b[3] + m) return true;
    for (let i = 0; i < CAUSEWAY_V4.length - 1; i++) {
      const a = CAUSEWAY_V4[i], c = CAUSEWAY_V4[i + 1], fx = c.x - a.x, fz = c.z - a.z, u = clamp(((x - a.x) * fx + (z - a.z) * fz) / (fx * fx + fz * fz), 0, 1);
      if (hyp(x - a.x - fx * u, z - a.z - fz * u) < 5 + m) return true;
    }
    return terrain.isUnderwater(x, z);
  };

  // the crust: a skin on the terrain's own triangles (the same vertices, so it lies exactly on the ground), drawn with
  // plates, cracks, gypsum roses and the runnels; its edge dissolves into the ground colour at the tideline
  const crustGeo = (() => {
    const { segs, half, step, row, P, N } = G;
    const map = new Map(), pos = [], nor = [], wts = [], idx = [];
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const [x, z, hw] of SPINE) { x0 = Math.min(x0, x - hw - 6); x1 = Math.max(x1, x + hw + 6); z0 = Math.min(z0, z - hw - 6); z1 = Math.max(z1, z + hw + 6); }
    const i0 = Math.max(0, Math.floor((x0 + half) / step)), i1 = Math.min(segs - 1, Math.ceil((x1 + half) / step));
    const j0 = Math.max(0, Math.floor((z0 + half) / step)), j1 = Math.min(segs - 1, Math.ceil((z1 + half) / step));
    const vid = (k) => {
      let v = map.get(k);
      if (v === undefined) {
        v = pos.length / 3; map.set(k, v);
        pos.push(P[k * 3], P[k * 3 + 1], P[k * 3 + 2]); nor.push(N[k * 3], N[k * 3 + 1], N[k * 3 + 2]);
        wts.push(wAt(P[k * 3], P[k * 3 + 2]));
      }
      return v;
    };
    for (let iz = j0; iz <= j1; iz++) for (let ix = i0; ix <= i1; ix++) {
      const cx = ix * step - half + step / 2, cz = iz * step - half + step / 2;
      if (wAt(cx, cz) < 0.04) continue;
      const a = iz * row + ix, b = (iz + 1) * row + ix, c = (iz + 1) * row + ix + 1, d = iz * row + ix + 1;
      const va = vid(a), vb = vid(b), vc = vid(c), vd = vid(d);
      idx.push(va, vb, vd, vb, vc, vd);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('aSalt', new THREE.Float32BufferAttribute(wts, 1));
    g.setIndex(idx);
    g.computeBoundingSphere();
    return g;
  })();
  // the road's slabs on the lobe (laid by structures/causeway.js, which builds alongside the regions, so this waits
  // for the first frames): a distance field to the nearest slab's edge, so the crust can raise a lip round each one
  // where it laps up its sides
  const pavedField = (im) => {
    if (!im) return null;
    const M = new THREE.Matrix4(), Inv = new THREE.Matrix4(), v = new THREE.Vector3(), list = [];
    for (let i = 0; i < im.count; i++) {
      im.getMatrixAt(i, M); v.setFromMatrixPosition(M);
      if (wAt(v.x, v.z) > 0.15) list.push({ x: v.x, y: v.y, z: v.z, inv: Inv.copy(M).invert().clone() });
    }
    if (!list.length) return null;
    const TX = 0.1, R = 0.66 * 0.9, AP = R * Math.cos(Math.PI / 6), FAR = 0.3, PAD = 1;
    let bx0 = Infinity, bx1 = -Infinity, bz0 = Infinity, bz1 = -Infinity;
    for (const q of list) { bx0 = Math.min(bx0, q.x - PAD); bx1 = Math.max(bx1, q.x + PAD); bz0 = Math.min(bz0, q.z - PAD); bz1 = Math.max(bz1, q.z + PAD); }
    const w = Math.ceil((bx1 - bx0) / TX) + 1, h = Math.ceil((bz1 - bz0) / TX) + 1, data = new Uint8Array(w * h).fill(255);
    const NX = [0.5, 1, 0.5], NZ = [0.866, 0, -0.866]; // the lathe's hexagon: a corner on +z, its edges' normals
    for (const q of list) {
      const i0 = Math.max(0, Math.floor((q.x - PAD - bx0) / TX)), i1 = Math.min(w - 1, Math.ceil((q.x + PAD - bx0) / TX));
      const j0 = Math.max(0, Math.floor((q.z - PAD - bz0) / TX)), j1 = Math.min(h - 1, Math.ceil((q.z + PAD - bz0) / TX));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        v.set(bx0 + i * TX, q.y, bz0 + j * TX).applyMatrix4(q.inv); // at the slab's own height (its tilt)
        let d = -Infinity;
        for (let k = 0; k < 3; k++) d = Math.max(d, Math.abs(v.x * NX[k] + v.z * NZ[k]));
        const b = Math.round(clamp((d - AP) / FAR, 0, 1) * 255), o = j * w + i;
        if (b < data[o]) data[o] = b;
      }
    }
    const tex = new THREE.DataTexture(data, w, h, THREE.RedFormat, THREE.UnsignedByteType);
    tex.magFilter = tex.minFilter = THREE.LinearFilter; tex.needsUpdate = true;
    return { tex, box: new THREE.Vector4(bx0, bz0, 1 / (w * TX), 1 / (h * TX)), n: list.length };
  };
  const { uPave, uPaveBox } = CRUST_PAVE;
  uPaveBox.value.set(0, 0, 0, 0);
  let paveTries = 0;
  ctx.registerUpdate(() => {
    if (paveTries < 0 || paveTries++ > 900 || paveTries % 10 !== 1) return; // done, or no road after ~15 s (?only=, ?skip=structures); look every 10th update, structures may build late
    const im = ctx.scene.getObjectByName('structures-pavers');
    if (!im) return;
    paveTries = -1;
    const pave = pavedField(im);
    if (pave) { uPave.value = pave.tex; uPaveBox.value.copy(pave.box); }
  });
  const crustMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.82, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
  crustMat.onBeforeCompile = (sh) => {
    sh.uniforms.uPave = uPave; sh.uniforms.uPaveBox = uPaveBox;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aSalt; varying float vSalt; varying vec3 vSP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSalt = aSalt; vSP = (modelMatrix * vec4(position, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying float vSalt; varying vec3 vSP;
      uniform sampler2D uPave; uniform vec4 uPaveBox;
      vec2 sHash2(vec2 p) { p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p) * 43758.5453); }
      float sNoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(sHash2(i).x, sHash2(i + vec2(1.0, 0.0)).x, f.x), mix(sHash2(i + vec2(0.0, 1.0)).x, sHash2(i + vec2(1.0)).x, f.x), f.y); }
      // plates: x the distance to the nearest plate's edge (cell units, the true bisector distance), y to the nearest
      // triple joint's neighbour (third cell), zw the nearest cell's offset from the point; sId its cell
      vec2 sId;
      vec4 sVoronoi(vec2 x) {
        vec2 n = floor(x), f = fract(x), mr = vec2(0.0), mg = vec2(0.0); float md = 8.0;
        for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
          vec2 g = vec2(float(i), float(j)), r = g + sHash2(n + g) * 0.9 + 0.05 - f; float d = dot(r, r);
          if (d < md) { md = d; mr = r; mg = g; }
        }
        float e1 = 8.0, e2 = 8.0;
        for (int j = -2; j <= 2; j++) for (int i = -2; i <= 2; i++) {
          vec2 g = mg + vec2(float(i), float(j)), r = g + sHash2(n + g) * 0.9 + 0.05 - f;
          if (dot(mr - r, mr - r) > 1e-5) { float e = dot(0.5 * (mr + r), normalize(r - mr)); if (e < e1) { e2 = e1; e1 = e; } else if (e < e2) e2 = e; }
        }
        sId = n + mg;
        return vec4(e1, e2, mr);
      }`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
        // the crust's edge dissolves at the tideline (screen-door, no blending)
        float sDither = fract(sin(dot(floor(gl_FragCoord.xy), vec2(12.9898, 78.233))) * 43758.5453);
        if (sDither > smoothstep(0.15, 0.85, vSalt)) discard;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        // salt plates of 0.6 to 2 m, irregular (a warped cell field; about half the big plates cracked again in two
        // or three), each tilted its own way, with rims curled up a few centimetres and pink gypsum in the cracks
        float sH = 0.0; // the crust's relief (m), for the normal below
        {
          vec2 p = vSP.xz;
          float sc = 1.5 + 0.5 * sHash2(floor(p / 11.0)).x;                     // plates of 1.5 to 2 m, by patches
          vec2 q = p / sc + 0.2 * vec2(sNoise(p * 0.45), sNoise(p * 0.45 + 17.0)) + 0.1 * vec2(sNoise(p * 1.9 + 5.0), sNoise(p * 1.9 - 9.0));
          vec4 v = sVoronoi(q);
          vec2 id = sId, h = sHash2(id + 0.37);
          float fw = fwidth(q.x) + fwidth(q.y);
          float near = 1.0 - smoothstep(0.12, 0.45, fw);                          // detail that would shimmer fades out
          float e = v.x * sc, ej = (v.y - v.x) * sc;                               // metres to the edge, and how near a joint
          // the plate cracked again: a finer cell field inside it (only where its hash says so)
          if (h.x > 0.45) {
            vec4 w = sVoronoi(q * 2.1 + id * 3.1);
            e = min(e, w.x * sc / 2.1 + 0.004);
            id += sId * 0.013;
          }
          float t = sHash2(id + 0.71).x, ta = 6.2832 * sHash2(id + 1.3).y;
          vec2 off = -v.zw * sc;                                                   // from the plate's centre, metres
          vec2 tdir = vec2(cos(ta), sin(ta)); float slope = 0.012 + 0.05 * t;
          float tilt = slope * dot(off, tdir);                                     // each plate settled its own way
          float rim = 0.035 * smoothstep(0.16, 0.02, e) * (0.6 + 0.4 * h.y);       // the edges curl up
          float crack = 1.0 - smoothstep(0.004, 0.012 + fw * sc * 0.6, e);
          sH = (tilt + rim - 0.03 * crack) * near;
          float grain = sHash2(floor(p * 37.0)).x * 0.5 + sHash2(floor(p * 11.0) + 3.0).y * 0.5;
          vec3 crust = vec3(0.8, 0.77, 0.75) * (0.9 + 0.16 * mix(0.5, grain, near));   // a grainy white
          // the low sun (from the west-south-west) finds each plate's tilt: lighter facing it, greyer turned away;
          // the rims' faces turned to it catch it, and the crack between two rims is a little shaded
          vec2 sunD = vec2(-0.94, 0.34);
          crust *= 1.0 - 3.2 * slope * dot(tdir, sunD) * near;
          vec2 eg = normalize(v.zw + 1e-4);                                        // toward the plate's centre: the rim faces it
          float rimLit = dot(eg, sunD);
          crust *= 1.0 + (0.18 * rimLit * smoothstep(0.1, 0.03, e) * smoothstep(0.008, 0.02, e) - 0.12 * smoothstep(0.035, 0.015, e) * (1.0 - crack)) * near;
          crust = mix(crust, vec3(0.9, 0.88, 0.86), smoothstep(0.1, 0.02, e) * 0.5 * near); // the rims dried whitest
          vec3 gyp = vec3(0.78, 0.55, 0.56);
          float joint = (1.0 - smoothstep(0.05, 0.22, ej)) * smoothstep(0.08, 0.0, e);
          crust = mix(crust, gyp, crack * (0.55 + 0.25 * sNoise(p * 4.0)) * near);  // pink gypsum veining the cracks
          crust = mix(crust, gyp * 0.95, joint * 0.7 * near);                      // and its roses at the joints
          float rn = 1.0 - smoothstep(0.05, 0.22, ${RUNNEL_GLSL});
          crust = mix(crust, vec3(0.32, 0.24, 0.22), rn * 0.6);                    // damp along the runnels
          sH *= 1.0 - rn;
          // round the road's slabs the crust rises in a lip up their sides, white and unbroken
          vec2 pu = (p - uPaveBox.xy) * uPaveBox.zw;
          if (uPaveBox.z > 0.0 && pu.x > 0.0 && pu.y > 0.0 && pu.x < 1.0 && pu.y < 1.0) {
            float pd = texture2D(uPave, pu).r * 0.3;                              // metres to the nearest slab's edge
            float lip = smoothstep(0.12, 0.0, pd);
            sH = mix(sH, 0.05 * smoothstep(0.12, 0.01, pd), lip);
            crust = mix(crust, vec3(0.88, 0.86, 0.84) * (0.95 + 0.1 * grain), lip * 0.85);
          }
          crust *= 0.93 + 0.1 * sHash2(floor(p * 0.25)).x;                        // brighter where it dried last
          diffuseColor.rgb = crust;
        }`)
      .replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
        {
          // the plates' tilt and the curled rims, as a bump on the view-space normal (screen derivatives of sH)
          vec3 sX = dFdx(-vViewPosition), sY = dFdy(-vViewPosition);
          vec3 r1 = cross(sY, normal), r2 = cross(normal, sX);
          float det = dot(sX, r1) * faceDirection;
          vec3 gr = sign(det) * (dFdx(sH) * r1 + dFdy(sH) * r2);
          normal = normalize(abs(det) * normal - gr);
        }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(0.55, 0.9, smoothstep(0.0, 0.5, vSalt * 0.5));`);
  };
  crustMat.customProgramCacheKey = () => 'fp-saltings-crust';
  const crust = new THREE.Mesh(crustGeo, crustMat);
  crust.name = 'saltings-crust'; crust.receiveShadow = true;
  scene.add(crust); meshes.push(crust);

  // scatter helper: points inside the strip, by its spine
  const spineLen = [];
  let total = 0;
  for (let i = 0; i < SPINE.length - 1; i++) { const l = hyp(SPINE[i + 1][0] - SPINE[i][0], SPINE[i + 1][1] - SPINE[i][1]); spineLen.push(l); total += l; }
  function along(u, side) { // u 0..1 along the spine, side -1..1 across its half-width
    let d = u * total, i = 0;
    while (i < spineLen.length - 1 && d > spineLen[i]) { d -= spineLen[i]; i++; }
    const a = SPINE[i], b = SPINE[i + 1], t = d / spineLen[i], hw = lerp(a[2], b[2], t);
    const tx = (b[0] - a[0]) / spineLen[i], tz = (b[1] - a[1]) / spineLen[i];
    return [lerp(a[0], b[0], t) - tz * side * hw, lerp(a[1], b[1], t) + tx * side * hw];
  }

  // glasswort, blood-red, in beds along the runnels: a bushy clump of jointed succulent stems, each a stack of short
  // fleshy segments that widen to their tops (two crossed strips per segment), green at the base reddening upward,
  // the joints paler where the light comes through
  const gwGeo = (() => {
    const P = [], Nn = [], A = [], I = [];
    // [lean (rad), bearing (rad), segments, segment length]: a straight middle stem, three leaning out and curving up,
    // and three short ones low down for the bushy base
    const STEMS = [[0.05, 0, 4, 0.05], [0.55, 0.4, 4, 0.037], [0.5, 2.5, 4, 0.034], [0.62, 4.4, 4, 0.036], [0.95, 1.5, 2, 0.03], [0.9, 3.5, 2, 0.028], [1.0, 5.5, 2, 0.03]];
    for (const [lean, bear, nseg, len] of STEMS) {
      const bx = Math.cos(bear), bz = Math.sin(bear);
      let x = bx * 0.012, y = 0, z = bz * 0.012, k = 0;
      for (let sg = 0; sg < nseg; sg++) {
        const l = lean * (1 - sg / nseg) ** 1.5;                                 // curving up toward the tip
        const dx = Math.sin(l) * bx, dy = Math.cos(l), dz = Math.sin(l) * bz;
        const x2 = x + dx * len, y2 = y + dy * len, z2 = z + dz * len;
        const w0 = 0.009 - sg * 0.0006, w1 = 0.013 - sg * 0.0007;            // narrow at the joint, swelling to the top
        const h0 = (k * len) / 0.2, h1 = ((k + 1) * len) / 0.2;
        for (const [px, pz] of nseg > 2 ? [[1, 0], [0, 1]] : [[bz, -bx]]) {      // two crossed strips (the short ones one, face on)
          const o = P.length / 3;
          P.push(x - px * w0, y, z - pz * w0, x + px * w0, y, z + pz * w0, x2 + px * w1, y2, z2 + pz * w1, x2 - px * w1, y2, z2 - pz * w1);
          const nx = pz * 0.8, nz = -px * 0.8; // the strip's face, tipped up so the flesh reads round
          for (let q = 0; q < 4; q++) Nn.push(nx, 0.6, nz);
          A.push(h0, 0, h0, 0, h1, 1, h1, 1);
          I.push(o, o + 1, o + 2, o, o + 2, o + 3);
        }
        x = x2; y = y2; z = z2; k++;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(Nn, 3));
    g.setAttribute('aGw', new THREE.Float32BufferAttribute(A, 2));
    g.setIndex(I);
    return g;
  })();
  const gwMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5, side: THREE.DoubleSide });
  gwMat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 aGw; varying vec2 vGw;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGw = aGw;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vGw;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        // the instance's red at the tips, a waxy green low down; each segment paler toward its swollen top
        diffuseColor.rgb = mix(vec3(0.2, 0.27, 0.09), diffuseColor.rgb, smoothstep(0.1, 0.65, vGw.x));
        diffuseColor.rgb *= 0.8 + 0.45 * vGw.y * vGw.y;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += diffuseColor.rgb * 0.16; // light through the flesh`);
  };
  gwMat.customProgramCacheKey = () => 'fp-saltings-glasswort';
  const glasswort = [];
  for (let k = 0; k < 40000 && glasswort.length < (low ? 700 : 1200); k++) {
    const [x, z] = along(rng(), rng() * 2 - 1);
    const rn = runnel(x, z);
    if (rn > 0.3 || rng() > 1 - rn / 0.3) continue;
    if (wAt(x, z) < 0.5 || keepOut(x, z)) continue;
    const s = 0.75 + rng() * 0.75, r = rng(); // 15 to 30 cm
    glasswort.push({ x, y: G.heightAt(x, z) - 0.01, z, s, sy: s * (0.85 + rng() * 0.3), ry: rng() * 6.28, c: new THREE.Color(lerp(0.5, 0.7, r), lerp(0.04, 0.09, r), lerp(0.04, 0.06, r)) });
  }
  const gwMesh = instanced(gwGeo, gwMat, glasswort, { name: 'saltings-glasswort', colors: true });
  scene.add(gwMesh); meshes.push(gwMesh);

  // the tideline: grey brittle reeds, as round the eddy, broken and bleached, along the strip's outer edge
  const reedGeo = (() => {
    const P = [], I = [];
    for (let i = 0; i < 7; i++) {
      const a = i * 0.9 + 0.3, r = 0.05 + (i % 3) * 0.04, x = Math.cos(a) * r, z = Math.sin(a) * r;
      const h = 0.9 + ((i * 37) % 7) / 7 * 0.8, broken = i % 3 === 0 ? 0.55 : 1, lean = 0.12 + (i % 2) * 0.1;
      const top = h * broken, tx = x + Math.cos(a) * lean * top, tz = z + Math.sin(a) * lean * top;
      const w = 0.012, b = P.length / 3;
      P.push(x - w, 0, z, x + w, 0, z, tx - w * 0.4, top, tz, tx + w * 0.4, top, tz);
      I.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I); g.computeVertexNormals();
    return g;
  })();
  const reedMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85, side: THREE.DoubleSide });
  const reeds = [];
  for (let k = 0; k < 30000 && reeds.length < (low ? 700 : 1300); k++) {
    const side = rng() < 0.5 ? -1 : 1, [x, z] = along(rng(), side * (0.92 + rng() * 0.22));
    const ww = wAt(x, z);
    if (ww < 0.15 || ww > 0.75 || keepOut(x, z, -3)) continue;
    if (hyp(x - FEN.x, z - FEN.z) < 82) continue; // the fen's side keeps its own reeds
    const s = 0.75 + rng() * 0.5, g = 0.4 + rng() * 0.12;
    reeds.push({ x, y: G.heightAt(x, z) - 0.03, z, s, sy: s * (0.8 + rng() * 0.4), ry: rng() * 6.28, rx: (rng() - 0.5) * 0.15, c: new THREE.Color(g, g, g * 1.02) });
  }
  const reedMesh = instanced(reedGeo, reedMat, reeds, { name: 'saltings-reeds', colors: true });
  scene.add(reedMesh); meshes.push(reedMesh);

  // a few bleached stumps
  const stumpGeo = (() => {
    const g = new THREE.CylinderGeometry(0.16, 0.24, 1, 7, 3, true);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i), a = Math.atan2(p.getZ(i), p.getX(i)); if (y > 0.3) p.setY(i, y - 0.35 * (0.5 + 0.5 * Math.sin(a * 3 + 1))); } // a broken top
    g.translate(0, 0.45, 0); g.computeVertexNormals();
    return g;
  })();
  const stumpMat = new THREE.MeshStandardMaterial({ color: '#a8a49a', roughness: 0.9, side: THREE.DoubleSide });
  const stumps = [];
  for (let k = 0; k < 400 && stumps.length < 14; k++) {
    const [x, z] = along(rng(), (rng() * 2 - 1) * 0.7);
    if (wAt(x, z) < 0.7 || keepOut(x, z, 2) || stumps.some((s) => hyp(s.x - x, s.z - z) < 14)) continue;
    const s = 0.7 + rng() * 0.8;
    stumps.push({ x, y: G.heightAt(x, z) - 0.1, z, sx: s, sy: s * (0.6 + rng() * 0.8), sz: s, ry: rng() * 6.28, rx: (rng() - 0.5) * 0.25, rz: (rng() - 0.5) * 0.25 });
    ctx.addCollider({ x, z, r: 0.3 * s });
  }
  const stumpMesh = instanced(stumpGeo, stumpMat, stumps, { name: 'saltings-stumps', shadow: false });
  scene.add(stumpMesh); meshes.push(stumpMesh);

  // the wind's salt, glinting low over the crust
  const motes = airMotes(ctx, KEY, { count: 260, color: '#fff0f0', size: 0.025, drift: [0.9, 0.05, 0.3], sway: 0.3, opacity: 0.55, low: 0.05, high: 1.4 });
  meshes.push(motes);

  // the halite crabs ------------------------------------------------------
  // each keeps to its hole on the east lobe, idling and sidling; when you come within nine metres it runs sideways
  // to the hole and drops in, and comes out again a while after you have gone
  const LOBE = { x: 190, z: 160 };
  const holes = [];
  for (let k = 0; k < 2000 && holes.length < (low ? 9 : 13); k++) {
    const x = LOBE.x + (rng() - 0.5) * 44, z = LOBE.z + (rng() - 0.5) * 40;
    if (wAt(x, z) < 0.85 || keepOut(x, z, 2) || holes.some((h) => hyp(h.x - x, h.z - z) < 5)) continue;
    holes.push({ x, z, y: G.heightAt(x, z) });
  }
  const holeGeo = new THREE.CircleGeometry(1, 9); holeGeo.rotateX(-Math.PI / 2);
  const holeMat = new THREE.MeshStandardMaterial({ color: '#141010', roughness: 1, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 });
  const holeMesh = instanced(holeGeo, holeMat, holes.map((h) => ({ x: h.x, y: h.y + 0.005, z: h.z, sx: 0.07, sy: 1, sz: 0.06, ry: rng() * 6.28 })), { name: 'saltings-holes' });
  scene.add(holeMesh); meshes.push(holeMesh);
  // pellets in a star round each hole: rays of little balls of sifted crust
  const pellets = [];
  for (const h of holes) {
    const rays = 6 + (rng() * 3 | 0), a0 = rng() * 6.28;
    for (let r = 0; r < rays; r++) {
      const a = a0 + (r / rays) * 6.283 + (rng() - 0.5) * 0.15, n = 4 + (rng() * 4 | 0);
      for (let i = 0; i < n; i++) {
        const d = 0.12 + i * 0.045 + rng() * 0.01, x = h.x + Math.cos(a) * d, z = h.z + Math.sin(a) * d, s = 0.009 + rng() * 0.004;
        pellets.push({ x, y: h.y + s * 0.6, z, s });
      }
    }
  }
  const pelletMesh = instanced(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#d8ccc4', roughness: 0.9 }), pellets, { name: 'saltings-pellets' });
  scene.add(pelletMesh); meshes.push(pelletMesh);

  const crabGeo = (() => {
    const parts = [];
    const body = new THREE.SphereGeometry(1, 8, 4); body.scale(0.07, 0.025, 0.05); body.translate(0, 0.035, 0); parts.push(body);
    for (const sx of [-1, 1]) {
      for (let i = 0; i < 4; i++) { // legs: two segments, splayed sideways
        const z = -0.03 + i * 0.02, up = new THREE.BoxGeometry(0.06, 0.006, 0.008); up.rotateZ(sx * 0.5); up.translate(sx * 0.085, 0.045, z); parts.push(up);
        const dn = new THREE.BoxGeometry(0.006, 0.05, 0.007); dn.rotateZ(sx * -0.35); dn.translate(sx * 0.125, 0.025, z); parts.push(dn);
      }
      const claw = new THREE.SphereGeometry(1, 5, 3); claw.scale(0.022, 0.012, 0.03); claw.translate(sx * 0.05, 0.03, 0.065); parts.push(claw);
      const eye = new THREE.CylinderGeometry(0.003, 0.003, 0.025, 3); eye.translate(sx * 0.02, 0.06, 0.04); parts.push(eye);
    }
    const flat = parts.map((g) => g.toNonIndexed());
    let n = 0; for (const p of flat) n += p.attributes.position.count;
    const P = new Float32Array(n * 3); let o = 0; for (const p of flat) { P.set(p.attributes.position.array, o * 3); o += p.attributes.position.count; }
    const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.BufferAttribute(P, 3)); m.computeVertexNormals();
    return m;
  })();
  const crabMat = new THREE.MeshStandardMaterial({ color: '#d4c8c2', roughness: 0.95 });
  crabMat.onBeforeCompile = (sh) => { // the back crusted like the flat
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vCP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvCP = position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vCP;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        diffuseColor.rgb *= 0.8 + 0.3 * fract(sin(dot(floor(vCP * 260.0), vec3(12.99, 78.23, 37.72))) * 43758.55);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.55, 0.45, 0.42), smoothstep(0.03, 0.0, vCP.y) * 0.6);`);
  };
  const NC = low ? 10 : 16;
  const crabs = [];
  for (let i = 0; i < NC && holes.length; i++) {
    const h = holes[i % holes.length], a = rng() * 6.28, r = 0.8 + rng() * 2.5;
    crabs.push({ hole: h, x: h.x + Math.cos(a) * r, z: h.z + Math.sin(a) * r, y: 0, yaw: rng() * 6.28, state: 'idle', t: rng() * 3, dir: 1, sink: 0, out: 0, tx: 0, tz: 0, ph: rng() * 6.28 });
  }
  const crabMesh = new THREE.InstancedMesh(crabGeo, crabMat, Math.max(1, crabs.length));
  crabMesh.count = crabs.length; crabMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); crabMesh.name = 'saltings-crabs';
  crabMesh.castShadow = false; crabMesh.receiveShadow = true; crabMesh.frustumCulled = false;
  scene.add(crabMesh); meshes.push(crabMesh);
  const M4 = new THREE.Matrix4(), it = { x: 0, y: 0, z: 0, s: 1.3, ry: 0 };
  const cam = ctx.camera.position;
  ctx.registerUpdate((dt, t) => {
    const px = cam.x, pz = cam.z;
    for (let i = 0; i < crabs.length; i++) {
      const c = crabs[i], h = c.hole;
      const dp = hyp(px - c.x, pz - c.z), dh = hyp(px - h.x, pz - h.z);
      if (c.state !== 'hidden' && c.state !== 'flee' && dp < 9) { c.state = 'flee'; }
      if (c.state === 'idle') {
        // sidle: a few quick sideways steps, a pause, back again
        c.t -= dt;
        if (c.t <= 0) { c.t = 0.6 + rng() * 2.5; c.dir = rng() < 0.5 ? -1 : 1; if (rng() < 0.3) c.yaw += (rng() - 0.5) * 1.2; c.go = rng() < 0.6 ? 0.35 + rng() * 0.4 : 0; }
        if (c.go > 0) {
          const sx = Math.cos(c.yaw) * c.dir, sz = -Math.sin(c.yaw) * c.dir, v = 0.6 * dt;
          let nx = c.x + sx * v, nz = c.z + sz * v;
          if (hyp(nx - h.x, nz - h.z) > 4) { c.yaw += Math.PI; nx = c.x; nz = c.z; }
          c.x = nx; c.z = nz; c.go -= dt;
        }
      } else if (c.state === 'flee') {
        // sideways to the hole, fast; turned so its side leads
        const dx = h.x - c.x, dz = h.z - c.z, d = hyp(dx, dz);
        c.yaw = Math.atan2(dx, dz) + Math.PI / 2;
        if (d < 0.06) { c.x = h.x; c.z = h.z; c.sink = Math.min(1, c.sink + dt * 4); if (c.sink >= 1) { c.state = 'hidden'; c.out = 4 + rng() * 6; } }
        else { const v = Math.min(d, 2.2 * dt); c.x += dx / d * v; c.z += dz / d * v; }
      } else if (c.state === 'hidden') {
        if (dh > 15) c.out -= dt;
        if (c.out <= 0) { c.sink = Math.max(0, c.sink - dt * 1.5); if (c.sink <= 0) { c.state = 'idle'; c.t = 1; } }
      }
      it.x = c.x; it.z = c.z; it.ry = c.yaw;
      it.y = G.heightAt(c.x, c.z) - c.sink * 0.14 + (c.state === 'flee' ? Math.abs(Math.sin(t * 40 + c.ph)) * 0.004 : 0);
      crabMesh.setMatrixAt(i, compose(it, M4));
    }
    crabMesh.instanceMatrix.needsUpdate = true;
  }, { pos: LOBE, near: 70, hz: 1 });

  regions.stats[KEY] = () => ({ ...meshStats(meshes), creature: crabs.length, at: crabs.map((c) => [Math.round(c.x), Math.round(c.z)]), holes: holes.length, crustTris: crustGeo.index.count / 3, glasswort: glasswort.length, reeds: reeds.length });
  ctx.log(`region-saltings: crust ${crustGeo.index.count / 3} tris, ${glasswort.length} glasswort, ${reeds.length} reeds, ${stumps.length} stumps, ${holes.length} holes, ${crabs.length} crabs`);
}
