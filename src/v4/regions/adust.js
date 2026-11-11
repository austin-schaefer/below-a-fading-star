// BW The Adust [Proposed] (plans/wilderness-v5.md; shape and site in plans/wilderness-v4-placement.md section 2, REGIONS.adust in
// world.js). "The apron under the west wall, nearest the sun and burnt by it for ages: clay cracked into hexagons,
// small drifts of red sand, sandstone pavements varnished black on the sun side, and plants that are only rosettes
// and cushions, everything leaning a little east as if from heat. The air is dust lit red; stones tick as they
// expand. The boundary is colour: the moor's green fails over a few metres into ochre and rust, with a last line of
// dead heather. Only here: beetles that stand on their heads facing the sun, rows of them on each pavement, and step
// down all at once when it gutters."
// The clay and the drifts are a ground skin (skin.js) with the cracks drawn in its fragment; the pavements are
// jointed slabs you can stand on; the beetles stand in rows on their tops.
import * as THREE from 'three';
import { SUN, CAUSEWAY_V4 } from '../../world.js';
import { makeSimplex, smoothstep, clamp } from '../../noise.js';
import { buildSkin, instanced, meshStats, leanShader, skinGround } from './skin.js';

const KEY = 'adust';
const N = makeSimplex(20261107 + 808);
// the sun's direction on the ground (toward it), for the varnish and the beetles
const SUNX = SUN.dir.x / Math.hypot(SUN.dir.x, SUN.dir.z), SUNZ = SUN.dir.z / Math.hypot(SUN.dir.x, SUN.dir.z);
const SUN_YAW = Math.atan2(SUNX, SUNZ); // a mesh built facing +z, turned by this, faces the sun

// where the red sand drifts (else cracked clay)
const sandAt = (x, z) => smoothstep(0.62, 0.8, N.fbm2(x * 0.035 + 7, z * 0.035 - 3, 3) * 0.5 + 0.5 + 0.08 * N.noise2(x * 0.2, z * 0.2));
// the drifts' ripples and small dunes: crests run north-south, a long west face and a short steep lee to the east
function dune(x, z) {
  const u = (x + N.noise2(x * 0.03, z * 0.05) * 9 + z * 0.12) / 6.5, f = u - Math.floor(u);
  return (f < 0.78 ? f / 0.78 : (1 - f) / 0.22) ** 1.4;
}

// ---------------------------------------------------------------- relief: small dunes in the drifts (positive: the
// coarse pass leaves them to the skin)
export function height(h, x, z, w, coarse) {
  if (coarse) return h;
  const s = sandAt(x, z) * smoothstep(0.3, 0.8, w);
  return s > 0 ? h + s * 0.42 * dune(x, z) : h;
}

// the terrain under and round the skin: green failing into ochre and rust over the boundary
const cOchre = new THREE.Color('#6a4a30'), cRust = new THREE.Color('#5a2e1c');
export function ground(col, x, z, w) {
  const k = smoothstep(0.04, 0.5, w);
  col.lerp(cOchre, k).lerp(cRust, k * 0.4 * (0.5 + 0.5 * N.noise2(x * 0.05, z * 0.05)));
}

export const cover = { density: { grass: 0, sedge: 0, heather: 0, bracken: 0, flowers: 0, fleshy: 0, reeds: 0, trees: 0 } };
export const stone = { density: 0.2, tors: false };
export const air = { tint: '#b84a2a', strength: 1 }; // "red dust"

// ---------------------------------------------------------------- sound: stones ticking as they expand
// Dry ticks and the odd double tick from the pavements round you, quicker the deeper in; clay crackles underfoot and
// the pavements knock.
let PAVE = null; // the slabs, set by build() for the sound and the walkable floor
export const sound = {
  start(k) {
    const { ac, white, filt } = k;
    const rng = k.makeRng(8311);
    // the clay ticking as it cools: runs of ticks from one patch, then a rest (craft.md's phrasing), each from its place
    // with the air between (placed: a lowpass by distance)
    const pans = [0, 1, 2, 3].map(() => k.placed({ ref: 3, roll: 1.4, range: 60, air: 60, verb: 0.25 }));
    let pi = 0, cx = 0, cz = 0, cw = 0, now0 = 0;
    function tick(x, z, at, loud) {
      const p = pans[pi++ % pans.length]; p.at(x, k.terrain.heightAt(x, z) + 0.3, z);
      const n = rng() < 0.2 ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const tt = at + i * (0.05 + rng() * 0.06);
        const b = ac.createBufferSource(); b.buffer = white; b.start(tt, rng() * 2.5, 0.025);
        const bp = filt('bandpass', 2200 + rng() * 2400, 3), g = ac.createGain();
        g.gain.setValueAtTime(0.0001, tt); g.gain.linearRampToValueAtTime(loud * (0.5 + rng() * 0.5), tt + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.02);
        b.connect(bp); bp.connect(g); g.connect(p.in);
      }
    }
    // a run's patch: a pavement near you if there is one, else the clay
    let rx = 0, rz = 0;
    const runs = k.caller(rng, { bout: [3, 8], gap: [0.12, 0.5], rest: [4, 0.7, 1.5, 30], first: [0.5, 3], when: () => {
      if (cw <= 0.02) return false;
      rx = cx + (rng() - 0.5) * 24; rz = cz + (rng() - 0.5) * 24;
      if (PAVE && PAVE.length && rng() < 0.75) { const s = PAVE[Math.floor(rng() * PAVE.length)]; if (Math.hypot(s.x - cx, s.z - cz) < 30) { rx = s.x; rz = s.z; } }
      return true;
    } }, () => tick(rx + (rng() - 0.5) * 2, rz + (rng() - 0.5) * 2, now0 + k.lead() + rng() * 0.04, 0.22 * cw));
    return {
      tick(w, x, z, step, t, now) {
        cx = x; cz = z; cw = w; now0 = now;
        runs.tick(step);
      },
      step(x, z, t0, vol, pitch, out) {
        const onPave = PAVE && paveAt(x, z) !== null;
        if (onPave) { // stone: a hard knock and grit
          const o = ac.createOscillator(); o.frequency.setValueAtTime(210 * pitch, t0); o.frequency.exponentialRampToValueAtTime(95, t0 + 0.05);
          const og = ac.createGain(); og.gain.setValueAtTime(0.0001, t0); og.gain.linearRampToValueAtTime(0.13 * vol, t0 + 0.002); og.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.07);
          o.connect(og); og.connect(out); o.start(t0); o.stop(t0 + 0.1);
        }
        // the clay's crust breaking: a dry crackle
        const n = onPave ? 3 : 9;
        for (let i = 0; i < n; i++) {
          const tt = t0 + rng() * (onPave ? 0.03 : 0.09);
          const b = ac.createBufferSource(); b.buffer = white; b.start(tt, rng() * 2.5, 0.02);
          const bp = filt('bandpass', (onPave ? 2600 : 1400 + rng() * 2400) * pitch, 4), g = ac.createGain();
          g.gain.setValueAtTime(0.0001, tt); g.gain.linearRampToValueAtTime((onPave ? 0.05 : 0.09) * vol, tt + 0.001); g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.018);
          b.connect(bp); bp.connect(g); g.connect(out);
        }
        return true;
      },
    };
  },
};

// the pavements' slabs in a 2 m grid: the top under (x, z), or null
const PG = new Map(), PGS = 2;
function paveAt(x, z) {
  const list = PG.get(Math.floor(x / PGS) * 4096 + Math.floor(z / PGS));
  if (!list) return null;
  for (const s of list) {
    const dx = x - s.x, dz = z - s.z, lx = dx * s.c + dz * s.s, lz = -dx * s.s + dz * s.c;
    if (Math.abs(lx) <= s.hx && Math.abs(lz) <= s.hz) return s.top;
  }
  return null;
}

// ---------------------------------------------------------------- the build
export async function build(ctx) {
  const { THREE: T, terrain } = ctx;
  const low = ctx.quality === 'low';
  const rng = ctx.makeRng(8300);
  const R = ctx.regions;
  const wAt = (x, z) => R.regionAt(x, z)[KEY];
  const meshes = [];
  const roadD = (x, z) => { // the v4 causeway runs through from the saddle north: nothing of ours on it
    let d = Infinity;
    for (let i = 0; i < 6; i++) { const a = CAUSEWAY_V4[i], b = CAUSEWAY_V4[i + 1], ex = b.x - a.x, ez = b.z - a.z, l2 = ex * ex + ez * ez; let t = ((x - a.x) * ex + (z - a.z) * ez) / l2; t = clamp(t, 0, 1); d = Math.min(d, Math.hypot(x - a.x - ex * t, z - a.z - ez * t)); }
    return d;
  };

  // ---- the clay and the drifts: a skin over the region, cracks and ripples in its fragment
  const edgeN = (x, z) => 0.5 + 0.18 * N.noise2(x * 0.3, z * 0.3) + 0.1 * N.noise2(x * 1.5, z * 1.5);
  const cClay = new T.Color('#7a5c42'), cClay2 = new T.Color('#6c4a34'), cSand = new T.Color('#8a4428'), cSand2 = new T.Color('#9a5434'), cBurn = new T.Color('#3a2418');
  const skin = buildSkin(ctx, {
    name: KEY, box: [-302, -244, -82, 50], step: low ? 0.9 : 0.7, lift: 0.02,
    keep: (x, z) => wAt(x, z) > 0.2 && terrain.slopeAt(x, z) < 0.75,
    color: (x, z, y, c) => {
      const s = sandAt(x, z), n = N.fbm2(x * 0.06, z * 0.06, 3) * 0.5 + 0.5;
      c.copy(cClay).lerp(cClay2, n);
      // scorch: darker, redder ground in the lee of the pavements and toward the wall
      c.lerp(cBurn, smoothstep(0.6, 0.85, N.fbm2(x * 0.03 - 40, z * 0.03 + 12, 3) * 0.5 + 0.5) * 0.45);
      c.lerp(_t.copy(cSand).lerp(cSand2, dune(x, z)), s);
    },
    // x: clay (1) or drift (0), y: the colour boundary at 0.5, z: dune phase for the ripples
    attr: (x, z) => [1 - sandAt(x, z), wAt(x, z) / (2 * edgeN(x, z)), dune(x, z), 0],
    decl: /* glsl */`
      vec4 gCrk;
      float aHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      // distance to the edge of a jittered hexagonal cell (0 on the crack), and the cell's id
      vec3 hexCrack(vec2 p) {
        p += 0.22 * vec2(sin(p.y * 1.9 + 1.3 * sin(p.x * 0.7)), sin(p.x * 2.1 + 1.1 * sin(p.y * 0.9)));
        const vec2 s = vec2(1.0, 1.7320508);
        vec4 hc = floor(vec4(p, p - vec2(0.5, 1.0)) / s.xyxy) + 0.5;
        vec4 h = vec4(p - hc.xy * s, p - (hc.zw + 0.5) * s);
        vec4 r = dot(h.xy, h.xy) < dot(h.zw, h.zw) ? vec4(h.xy, hc.xy) : vec4(h.zw, hc.zw + 0.5);
        vec2 q = abs(r.xy);
        return vec3(0.5 - max(dot(q, s * 0.5), q.x), r.zw);
      }`,
    frag: /* glsl */`
      {
        if (vSkin.y < 0.5) discard; // where the moor's green has failed
        gCrk = vec4(1.0, 0.0, 0.0, 0.0);
        float clay = smoothstep(0.35, 0.75, vSkin.x);
        vec2 fw = fwidth(vTPos.xz);
        // small plates (0.55 m) inside big polygons (2.4 m), each plate's rim curled up and paler
        float fadeS = 1.0 - smoothstep(0.035, 0.09, length(fw) / 0.55);
        float fadeB = 1.0 - smoothstep(0.035, 0.09, length(fw) / 2.4);
        if (clay > 0.0 && fadeB > 0.0) {
          vec3 b = hexCrack(vTPos.xz / 2.4);
          float crackB = (1.0 - smoothstep(0.012, 0.03, b.x)) * fadeB;
          float crackS = 0.0, rim = 0.0, tone = 1.0;
          if (fadeS > 0.0) {
            vec3 sm = hexCrack(vTPos.xz / 0.55 + 7.3);
            crackS = (1.0 - smoothstep(0.02, 0.05, sm.x)) * fadeS;
            rim = (1.0 - smoothstep(0.05, 0.14, sm.x)) * fadeS;
            tone = 0.85 + 0.3 * aHash(sm.yz);
          }
          gCrk.x = mix(1.0, (1.0 - 0.8 * max(crackB, crackS)) * (1.0 + 0.25 * rim) * tone, clay);
          gCrk.y = rim * clay; // the rims lift: the normal tilts out of the cracks
        }
        // ripples on the drifts, across the wind
        float sand = 1.0 - clay;
        if (sand > 0.0) {
          float rp = sin((vTPos.x + 0.6 * sin(vTPos.z * 0.35)) * 9.0) * (1.0 - smoothstep(0.02, 0.06, length(fw)));
          gCrk.x *= 1.0 + 0.08 * rp * sand;
          gCrk.z = rp * sand;
        }
      }`,
    normal: /* glsl */`normal = normalize(normal + mat3(viewMatrix) * vec3(gCrk.z * 0.25, 0.0, gCrk.y * 0.2));`,
    post: /* glsl */`
      diffuseColor.rgb = vColor * gCrk.x;
      roughnessFactor = 0.93;`,
  });
  meshes.push(skin);

  // ---- the pavements: jointed sandstone slabs, varnished black on the sun side
  const paves = [], slabs = [];
  for (let k = 0; k < 600 && paves.length < (low ? 10 : 14); k++) {
    const x = -296 + rng() * 46, z = -72 + rng() * 112;
    if (wAt(x, z) < 0.85 || sandAt(x, z) > 0.4 || terrain.slopeAt(x, z) > 0.18 || roadD(x, z) < 9) continue;
    if (paves.some((p) => Math.hypot(p.x - x, p.z - z) < 13)) continue;
    paves.push({ x, z, rx: 2.5 + rng() * 3, rz: 2 + rng() * 2.5, rot: rng() * Math.PI, y: terrain.heightAt(x, z) });
  }
  const P = [], C = [], I = [];
  const vSide = new T.Color('#4a2418'), vTop = new T.Color('#8a4c34'), vTop2 = new T.Color('#a46044'), vVarn = new T.Color('#120c0a'), tc = new T.Color();
  const box = (cx, cy, cz, hx, hy, hz, rot, tilt, top) => {
    const c = Math.cos(rot), s = Math.sin(rot);
    const corner = (lx, ly, lz) => [cx + lx * c - lz * s, cy + ly + (lx * tilt[0] + lz * tilt[1]) * (ly > 0 ? 1 : 0), cz + lx * s + lz * c];
    const faces = [ // [normal in local, 4 corners]
      [[0, 1, 0], [[-hx, hy, -hz], [-hx, hy, hz], [hx, hy, hz], [hx, hy, -hz]]],
      [[1, 0, 0], [[hx, -hy, -hz], [hx, hy, -hz], [hx, hy, hz], [hx, -hy, hz]]],
      [[-1, 0, 0], [[-hx, -hy, hz], [-hx, hy, hz], [-hx, hy, -hz], [-hx, -hy, -hz]]],
      [[0, 0, 1], [[hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz], [-hx, -hy, hz]]],
      [[0, 0, -1], [[-hx, -hy, -hz], [-hx, hy, -hz], [hx, hy, -hz], [hx, -hy, -hz]]],
    ];
    for (const [n, q] of faces) {
      const o = P.length / 3, wx = n[0] * c - n[2] * s, wz = n[0] * s + n[2] * c;
      const sunward = wx * SUNX + wz * SUNZ;
      if (n[1] > 0) tc.copy(top); else tc.copy(vSide).lerp(vVarn, smoothstep(-0.2, 0.45, sunward)); // the varnish
      for (const v of q) {
        const p = corner(...v); P.push(...p);
        // the top darkens toward its sun edge too
        if (n[1] > 0) { const ex = (p[0] - cx) * SUNX + (p[2] - cz) * SUNZ; const k2 = smoothstep(0.2, 1.0, ex / Math.max(hx, hz)); C.push(...tc.clone().lerp(vVarn, k2 * 0.85).toArray()); }
        else C.push(tc.r, tc.g, tc.b);
      }
      I.push(o, o + 1, o + 2, o, o + 2, o + 3);
    }
  };
  for (const pv of paves) {
    // jointed like a natural pavement: courses of uneven depth, blocks of uneven length breaking joint, each
    // a little askew, a few missing
    const c = Math.cos(pv.rot), s = Math.sin(pv.rot), joint = 0.05;
    for (let lz = -pv.rz; lz < pv.rz;) {
      const rh = 0.6 + rng() * 0.9;
      for (let lx = -pv.rx - rng() * 0.9; lx < pv.rx;) {
        const cw = 0.55 + rng() * 1.4, cx = lx + cw / 2, cz = lz + rh / 2;
        lx += cw;
        if ((cx / pv.rx) ** 2 + (cz / pv.rz) ** 2 > 1 + 0.3 * (rng() - 0.5) || rng() < 0.08) continue;
        const x = pv.x + cx * c - cz * s, z = pv.z + cx * s + cz * c, rot = pv.rot + (rng() - 0.5) * 0.12;
        const hx = cw / 2 - joint * (1 + rng() * 1.5), hz = rh / 2 - joint * (1 + rng() * 1.5);
        const g = Math.max(terrain.heightAt(x - hx, z - hz), terrain.heightAt(x + hx, z + hz), terrain.heightAt(x - hx, z + hz), terrain.heightAt(x + hx, z - hz));
        const lift = 0.1 + rng() * 0.18, top = g + lift, tilt = [(rng() - 0.5) * 0.07, (rng() - 0.5) * 0.07];
        const topC = new T.Color().copy(vTop).lerp(vTop2, rng()).multiplyScalar(0.85 + rng() * 0.3);
        box(x, (top + g - 0.25) / 2, z, hx, (top - g + 0.25) / 2, hz, rot, tilt, topC);
        const sl = { x, z, c: Math.cos(rot), s: Math.sin(rot), hx, hz, top, pave: pv };
        slabs.push(sl);
        for (let gx = Math.floor((x - 1.5) / PGS); gx <= Math.floor((x + 1.5) / PGS); gx++) for (let gz = Math.floor((z - 1.5) / PGS); gz <= Math.floor((z + 1.5) / PGS); gz++) {
          const kk = gx * 4096 + gz; if (!PG.has(kk)) PG.set(kk, []); PG.get(kk).push(sl);
        }
      }
      lz += rh;
    }
  }
  PAVE = slabs;
  const paveGeo = new T.BufferGeometry();
  paveGeo.setAttribute('position', new T.Float32BufferAttribute(P, 3));
  paveGeo.setAttribute('color', new T.Float32BufferAttribute(C, 3));
  paveGeo.setIndex(I); paveGeo.computeVertexNormals(); paveGeo.computeBoundingSphere();
  // desert varnish is glossy: the black faces shine
  const paveMat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0.0 });
  // sandstone: bedding lines, a coarse grain and wind-pitting, from the world position (no texture)
  paveMat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vWP;
      float sHash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      float sNoise(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(sHash(i), sHash(i + vec3(1,0,0)), f.x), mix(sHash(i + vec3(0,1,0)), sHash(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(sHash(i + vec3(0,0,1)), sHash(i + vec3(1,0,1)), f.x), mix(sHash(i + vec3(0,1,1)), sHash(i + vec3(1,1,1)), f.x), f.y), f.z); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          float fw = length(fwidth(vWP));
          float bed = sin(vWP.y * 38.0 + sNoise(vWP * 1.3) * 5.0) * (1.0 - smoothstep(0.01, 0.03, fw));
          float grain = sNoise(vWP * 14.0) * (1.0 - smoothstep(0.02, 0.06, fw));
          float pit = smoothstep(0.72, 0.8, sNoise(vWP * 6.0 + 3.0)) * (1.0 - smoothstep(0.02, 0.05, fw));
          float blot = sNoise(vWP * 0.9);
          diffuseColor.rgb *= (0.86 + 0.1 * bed + 0.2 * grain) * (1.0 - 0.45 * pit) * (0.8 + 0.4 * blot);
        }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      roughnessFactor = mix(0.3, 0.9, smoothstep(0.03, 0.12, vColor.r));`);
  };
  const paveMesh = new T.Mesh(paveGeo, paveMat);
  paveMesh.name = 'adust-pavements'; paveMesh.castShadow = true; paveMesh.receiveShadow = true;
  ctx.scene.add(paveMesh);
  meshes.push(paveMesh);
  ctx.addWalkable?.((x, z) => paveAt(x, z));

  // ---- the beetles: rows on each pavement's top, facing the sun, standing on their heads
  const beetles = buildBeetles(ctx, rng, slabs, low);
  meshes.push(...beetles.meshes);

  // ---- rosettes and cushions, all leaning a little east; a last line of dead heather at the boundary
  const plants = buildPlants(ctx, rng, wAt, skinGround(terrain, skin.userData.covers, skin.userData.lift), roadD, low); // on the skin where it lies
  meshes.push(...plants.meshes);

  // ---- red dust in the air
  const dust = buildDust(ctx, rng, low);
  meshes.push(dust.mesh);
  ctx.registerUpdate((dt, t) => dust.update(dt, t));

  R.stats[KEY] = () => ({ ...meshStats(meshes), creature: beetles.count });
  R.creatures = Object.assign(R.creatures || {}, { beetles: beetles.list });
  ctx.log(`region adust: skin ${skin.geometry.index.count / 3} tris, ${paves.length} pavements (${slabs.length} slabs), ${beetles.count} beetles, ${plants.count} plants`);
}
const _t = new THREE.Color();

// Beetles, built facing +z: a domed black body with a ridge, a small head, six stilt legs. Standing on its head it
// pitches nose-down about 50 degrees with its rear lifted to the sun's side... facing the sun, so its back is to
// the bowl. When the sun gutters every one steps down at the same instant; when the light comes back they climb up
// again, a few at a time.
function buildBeetles(ctx, rng, slabs, low) {
  const { THREE: T } = ctx;
  const g = new T.SphereGeometry(1, 6, 4);
  g.scale(0.011, 0.008, 0.019); g.translate(0, 0.012, 0);
  const head = new T.SphereGeometry(1, 4, 3); head.scale(0.006, 0.005, 0.006); head.translate(0, 0.01, 0.02);
  const parts = [g, head];
  // three pairs of stilt legs, each pair one splayed bar under the body
  for (let i = 0; i < 3; i++) {
    const leg = new T.BoxGeometry(0.05, 0.0016, 0.0016);
    leg.rotateY((i - 1) * 0.55); leg.rotateZ(0.0);
    leg.translate(0, 0.004, (i - 1) * 0.011);
    parts.push(leg);
  }
  const geo = mergeGeos(T, parts);
  const mat = new T.MeshStandardMaterial({ color: 0x0b0a0a, roughness: 0.22, metalness: 0.15 });
  // rows across each pavement's top, square to the sun, every beetle facing it
  const list = [];
  const pavesSeen = new Set();
  for (const s of slabs) {
    if (pavesSeen.has(s.pave) && rng() < 0.6) continue;
    pavesSeen.add(s.pave);
    if (s.hx < 0.35 || s.hz < 0.3) continue;
    const rows = 1 + Math.floor(rng() * 3), per = 4 + Math.floor(rng() * 7);
    for (let r = 0; r < rows; r++) for (let i = 0; i < per; i++) {
      // a row runs across the sun's line; rows step back from the sun edge
      const across = (i - (per - 1) / 2) * 0.055, back = -0.15 + r * 0.12;
      const x = s.x - SUNZ * across - SUNX * back, z = s.z + SUNX * across - SUNZ * back;
      const dx = x - s.x, dz = z - s.z, lx = dx * s.c + dz * s.s, lz = -dx * s.s + dz * s.c;
      if (Math.abs(lx) > s.hx - 0.05 || Math.abs(lz) > s.hz - 0.05) continue;
      list.push({ x, y: s.top, z, yaw: SUN_YAW + (rng() - 0.5) * 0.12, s: (low ? 1.4 : 1.25) * (0.85 + rng() * 0.3), lag: rng() * 2.5, up: 1 });
      if (list.length >= (low ? 200 : 320)) break;
    }
    if (list.length >= (low ? 200 : 320)) break;
  }
  const mesh = new T.InstancedMesh(geo, mat, Math.max(1, list.length));
  mesh.name = 'adust-beetles'; mesh.castShadow = false; mesh.receiveShadow = true;
  ctx.scene.add(mesh);
  const m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), p = new T.Vector3(), sc = new T.Vector3();
  function set(i) {
    const b = list[i], k = b.up; // 1: on its head, 0: down on its feet
    e.set(0.95 * k, b.yaw, 0, 'YXZ'); q.setFromEuler(e); // pitch nose-down: rear up
    sc.setScalar(b.s);
    p.set(b.x, b.y + 0.004 + k * 0.011 * b.s, b.z);
    mesh.setMatrixAt(i, m.compose(p, q, sc));
  }
  for (let i = 0; i < list.length; i++) set(i);
  mesh.count = list.length; mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere();
  // the gutter: all at once down; once the light has held a moment, back up a few at a time
  const flick = ctx.sky?.flicker || { value: 1 };
  let down = false, held = 0, tUp = 0, moving = false;
  ctx.registerUpdate((dt) => {
    const f = flick.value;
    if (!down && f < 0.5) { down = true; moving = true; held = 0; }
    else if (down && f > 0.85) { held += dt; if (held > 1.2) { down = false; tUp = 0; moving = true; } }
    if (!moving) return;
    if (!down) tUp += dt;
    let still = true;
    for (let i = 0; i < list.length; i++) {
      const b = list[i], target = down ? 0 : tUp >= b.lag ? 1 : b.up;
      const v = b.up + clamp(target - b.up, -dt * 7, dt * 2.2);
      if (v !== b.up) { b.up = v; set(i); still = false; }
    }
    if (still && (down || tUp > 3)) moving = false;
    mesh.instanceMatrix.needsUpdate = true;
  }, { pos: { x: -273, z: -15 }, near: 220, hz: 0 });
  return { meshes: [mesh], count: list.length, list };
}

function mergeGeos(T, list) {
  let n = 0, ni = 0;
  for (const g of list) { n += g.attributes.position.count; ni += g.index.count; }
  const P = new Float32Array(n * 3), Nn = new Float32Array(n * 3), I = new Uint32Array(ni);
  let o = 0, oi = 0;
  for (const g of list) {
    P.set(g.attributes.position.array, o * 3); Nn.set(g.attributes.normal.array, o * 3);
    const ix = g.index.array; for (let i = 0; i < ix.length; i++) I[oi + i] = ix[i] + o;
    o += g.attributes.position.count; oi += ix.length;
  }
  const out = new T.BufferGeometry();
  out.setAttribute('position', new T.BufferAttribute(P, 3)); out.setAttribute('normal', new T.BufferAttribute(Nn, 3));
  out.setIndex(new T.BufferAttribute(I, 1));
  return out;
}

// Rosettes (a flat star of thick leaves), cushions (tight domes), and dead heather in a line along the boundary.
function buildPlants(ctx, rng, wAt, meshH, roadD, low) {
  const { THREE: T } = ctx;
  // cushion: a lumpy dome, grey-green to rust, vertex coloured paler at the crown
  const cush = new T.IcosahedronGeometry(1, 1);
  {
    const p = cush.attributes.position, col = [];
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const k = 1 + 0.12 * Math.sin(x * 7 + z * 5) * Math.cos(y * 6);
      y = Math.max(y, -0.15) * 0.55; p.setXYZ(i, x * k, y * k, z * k);
      const c = 0.7 + 0.5 * Math.max(0, y); col.push(c, c, c);
    }
    cush.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    cush.computeVertexNormals();
  }
  // rosette: ten thick pointed leaves, cupped
  const ros = (() => {
    const P = [], I = [], Cc = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * 6.283 + (i % 2) * 0.3, l = i % 2 ? 0.75 : 1, ca = Math.cos(a), sa = Math.sin(a), w = 0.22;
      const o = P.length / 3;
      P.push(0, 0.05, 0, ca * l * 0.5 - sa * w, 0.12, sa * l * 0.5 + ca * w, ca * l, 0.2, sa * l, ca * l * 0.5 + sa * w, 0.12, sa * l * 0.5 - ca * w, ca * l * 0.45, 0.2, sa * l * 0.45);
      Cc.push(0.6, 0.6, 0.6, 0.85, 0.85, 0.85, 1.1, 1.1, 1.1, 0.85, 0.85, 0.85, 1, 1, 1);
      I.push(o, o + 1, o + 4, o + 1, o + 2, o + 4, o, o + 4, o + 3, o + 4, o + 2, o + 3);
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.setAttribute('color', new T.Float32BufferAttribute(Cc, 3));
    g.setIndex(I); g.computeVertexNormals();
    return g;
  })();
  // dead heather: a twiggy clump of grey-brown sticks
  const heath = (() => {
    const P = [], I = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * 6.283 + i, r = 0.08 + (i % 4) * 0.05, h = 0.25 + (i % 5) * 0.06, w = 0.012;
      const x = Math.cos(a) * r, z = Math.sin(a) * r, tx = x * 1.8, tz = z * 1.8;
      for (const [ux, uz] of [[1, 0], [0, 1]]) {
        const o = P.length / 3;
        P.push(x - ux * w, 0, z - uz * w, x + ux * w, 0, z + uz * w, tx + ux * w * 0.3, h, tz + uz * w * 0.3, tx - ux * w * 0.3, h, tz - uz * w * 0.3);
        I.push(o, o + 1, o + 2, o, o + 2, o + 3);
      }
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.setIndex(I); g.computeVertexNormals();
    return g;
  })();
  const cushMat = leanShader(new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }), 0.6);
  const rosMat = leanShader(new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, side: T.DoubleSide }), 0.25);
  const heathMat = new T.MeshStandardMaterial({ color: 0x4a3c30, roughness: 1, side: T.DoubleSide });
  const cs = [], rs = [], hs = [];
  const cCush = [new T.Color('#8a8c66'), new T.Color('#9a6a44'), new T.Color('#7a7c60'), new T.Color('#a87a4c')];
  const cRos = [new T.Color('#6a7a5e'), new T.Color('#9a4a34'), new T.Color('#7a6a50')];
  const N2 = makeSimplex(20261107 + 809);
  for (let k = 0; k < (low ? 9000 : 16000); k++) {
    const x = -300 + rng() * 54, z = -80 + rng() * 128, w = wAt(x, z);
    if (w <= 0.02 || roadD(x, z) < 4 || paveAt(x, z) !== null) continue;
    const y = meshH(x, z) + 0;
    if (w < 0.42 && w > 0.1) { // the last line of dead heather
      if (hs.length < (low ? 220 : 420) && rng() < 0.75) hs.push({ x, y, z, s: 0.8 + rng() * 0.6, ry: rng() * 6.28, c: 0 });
      continue;
    }
    if (w < 0.6) continue;
    const sand = sandAt(x, z), clump = N2.noise2(x * 0.15, z * 0.15);
    if (sand > 0.6 && rng() < 0.85) continue; // few on the drifts
    if (clump > 0.1 && cs.length < (low ? 260 : 520)) cs.push({ x, y: y - 0.02, z, s: 0.12 + rng() * rng() * 0.35, sy: 1, ry: rng() * 6.28, c: cCush[Math.floor(rng() * 4)] });
    else if (clump < -0.15 && rs.length < (low ? 360 : 700)) rs.push({ x, y: y + 0.005, z, s: 0.06 + rng() * 0.12, ry: rng() * 6.28, c: cRos[Math.floor(rng() * 3)] });
  }
  const meshes = [
    instanced(ctx, cush, cushMat, cs, { name: 'adust-cushions', color: (it) => it.c }),
    instanced(ctx, ros, rosMat, rs, { name: 'adust-rosettes', color: (it) => it.c }),
    instanced(ctx, heath, heathMat, hs, { name: 'adust-dead-heather' }),
  ];
  return { meshes, count: cs.length + rs.length + hs.length };
}

// Red dust: motes drifting east through the air round you, lit by the sun, shown by how deep in the Adust you are.
function buildDust(ctx, rng, low) {
  const { THREE: T, camera } = ctx;
  const n = low ? 500 : 1100, pos = new Float32Array(n * 3), seed = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) { pos[i * 3] = rng() * 40; pos[i * 3 + 1] = rng() * 9; pos[i * 3 + 2] = rng() * 40; seed[i * 2] = rng(); seed[i * 2 + 1] = rng(); }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new T.BufferAttribute(seed, 2));
  const uT = { value: 0 }, uC = { value: new T.Vector3() }, uA = { value: 0 }, uG = { value: 0 };
  const mat = new T.ShaderMaterial({
    uniforms: { ...T.UniformsUtils.clone(T.UniformsLib.fog), uT, uC, uA, uG, uSun: { value: new T.Vector3(SUN.dir.x, SUN.dir.y, SUN.dir.z) } },
    vertexShader: /* glsl */`
      uniform float uT, uA; uniform vec3 uC; attribute vec2 aSeed; varying float vA; varying float vS;
      uniform vec3 uSun;
      #include <fog_pars_vertex>
      void main() {
        // a 40 m box of motes wrapped round the camera, drifting east and lifting in the heat
        vec3 transformed = position;
        transformed.x += uT * (0.35 + aSeed.x * 0.5);
        transformed.y += sin(uT * 0.4 + aSeed.y * 30.0) * 0.4 + uT * 0.05 * aSeed.y;
        transformed.z += sin(uT * 0.23 + aSeed.x * 20.0) * 0.6;
        transformed = uC + mod(transformed - uC + vec3(20.0, 1.6, 20.0), vec3(40.0, 4.5, 40.0)) - vec3(20.0, 1.6, 20.0);
        vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        float d = -mvPosition.z;
        gl_PointSize = clamp(40.0 / d, 1.0, 3.0);
        // brighter looking toward the sun (forward scatter), gone at the box's edge
        vec3 v = normalize(transformed - cameraPosition);
        vS = 0.35 + 0.65 * pow(max(dot(v, uSun), 0.0), 4.0);
        vA = uA * (1.0 - smoothstep(12.0, 20.0, length(transformed.xz - uC.xz)));
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */`
      uniform float uG; varying float vA; varying float vS;
      #include <fog_pars_fragment>
      void main() {
        vec2 c = gl_PointCoord - 0.5; float r = dot(c, c);
        if (r > 0.25 || vA < 0.01) discard;
        gl_FragColor = vec4(vec3(0.9, 0.34, 0.16) * vS * uG, vA * (1.0 - r * 4.0) * 0.35);
        #include <fog_fragment>
      }`,
    transparent: true, depthWrite: false, fog: true, blending: T.AdditiveBlending,
  });
  const mesh = new T.Points(geo, mat);
  mesh.name = 'adust-dust'; mesh.frustumCulled = false;
  ctx.scene.add(mesh);
  const flick = ctx.sky?.flicker || { value: 1 };
  let a = 0;
  return {
    mesh,
    update(dt, t) {
      const cp = camera.position;
      const w = ctx.regions.regionAt(cp.x, cp.z, undefined, 3)[KEY];
      a += (w - a) * Math.min(1, dt * 2);
      uA.value = a; uT.value = t; uC.value.copy(cp); uG.value = 0.35 + 0.65 * flick.value;
      mesh.visible = a > 0.01;
    },
  };
}
