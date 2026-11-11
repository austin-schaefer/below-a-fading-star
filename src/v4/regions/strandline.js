// BV The Strandline [Proposed] (plans/wilderness-v5.md; shape and site in plans/wilderness-v4-placement.md section 2, REGIONS.strandline
// in world.js). "The south-east shore of Lees Tarn: a beach of black flint shingle sorted by size into bands, the
// coarse up top and the fine at the water, with horsetails and bogbean in the shallows and quillwort under the
// surface. Midges stand in columns over the margin; water laps though there is no wind. The boundary is the change
// from grass to shingle, abrupt as a carpet's edge. Only here: small grey sandpipers that run in and out in exact step
// with a tide the tarn has, with no moon to pull it, a hand's breadth up and down every few minutes."
// Moved round to the south shore and its new bay (placement plan); the bay and the spit are src/v4/tarn.js. No Tincture
// (decided: the brief gives none). The shingle is a ground skin (skin.js) with its pebbles drawn in the fragment;
// the lap and the tide move a wet film and a foam line up and down it, and the sandpipers keep to its edge.
import * as THREE from 'three';
import { WATER, REGIONS } from '../../world.js';
import { makeSimplex, smoothstep, clamp } from '../../noise.js';
import { spitAt, tideAt, lapAt, LAP, tarnShoreDistance } from '../tarn.js';
import { buildSkin, instanced, meshStats, meshGround } from './skin.js';

const KEY = 'strandline';
const WY = WATER.tarn.y;
const TX = WATER.tarn.x, TZ = WATER.tarn.z;
const N = makeSimplex(20261107 + 707);
const LAP_RISE = 0.17; // metres the lap's front climbs above the tide: about a metre up the shingle

// metres above the still water, and how the beach is sorted there: 0 fine at the water .. 1 coarse up top
const grade = (s) => clamp(s / 1.7, 0, 1);

// ---------------------------------------------------------------- the beach profile: a berm, cusps
// Both bumps are positive, so the coarse pass (regions.js) takes the bare slope: the skin carries the detail.
export function height(h, x, z, w, coarse) {
  if (coarse) return h;
  const s = h - WY;
  if (s < -1.2 || s > 3) return h;
  // a storm berm along the top of the shingle, and beach cusps every 7 m along the shore just above the water
  const along = Math.atan2(z - TZ, x - TX) * 70;
  const berm = 0.3 * Math.exp(-(((s - 1.15) / 0.38) ** 2)) * (0.75 + 0.25 * N.noise2(x * 0.05, z * 0.05));
  const cusp = 0.09 * (0.5 + 0.5 * Math.sin((along * 2 * Math.PI) / 7)) * Math.exp(-(((s - 0.35) / 0.4) ** 2));
  return h + smoothstep(0.35, 0.65, w) * (berm + cusp);
}

// The terrain under the skin goes dark flint, so a gap in the skin never shows green; outside the carpet, moor.
const cFlint = new THREE.Color('#1e1d22');
export function ground(col, x, z, w) {
  col.lerp(cFlint, smoothstep(0.55, 0.85, w));
}

export const cover = {
  density: { grass: 0, heather: 0, bracken: 0, flowers: 0, fleshy: 0, trees: 0, sedge: 0, reeds: 0.15 },
};
export const stone = { density: 0.06, tors: false };
export const air = null; // neutral: the brief gives the Strandline no Tincture

// ---------------------------------------------------------------- sound: water lapping with no wind, the shingle's drag
// Each lap runs up the beach with a soft rush and draws back through the stones with a rattle; positional on the
// waterline nearest you, in step with lapAt() (so the sandpipers and the foam line keep the same time). Footsteps
// on shingle crunch.
const SPINE = REGIONS.strandline.shape.strip;
function nearestShore(px, pz, out) {
  let best = Infinity;
  for (let i = 0; i < SPINE.length - 1; i++) {
    const [ax, az] = SPINE[i], [bx, bz] = SPINE[i + 1], ex = bx - ax, ez = bz - az, l2 = ex * ex + ez * ez;
    let t = ((px - ax) * ex + (pz - az) * ez) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
    const qx = ax + ex * t, qz = az + ez * t, d = (px - qx) ** 2 + (pz - qz) ** 2;
    if (d < best) { best = d; out.x = qx; out.z = qz; }
  }
  // the spine runs 4.5 m inland of the water: step toward the tarn's middle
  const dx = TX - out.x, dz = TZ - out.z, l = Math.sqrt(dx * dx + dz * dz) || 1;
  out.x += (dx / l) * 5; out.z += (dz / l) * 5;
  return out;
}
export const sound = {
  start(k) {
    const { ac, master, pink, white, filt, setPos, panner, send } = k;
    const rng = k.makeRng(7311);
    const bus = ac.createGain(); bus.gain.value = 0;
    const pl = k.placed({ ref: 6, roll: 1.1, range: 120, air: 60, verb: 0.15 }); // the nearest shore, with the air between
    bus.connect(pl.in);
    const at = { x: 0, z: 0 };
    let lastLap = -1, level = 0;
    function lap(t0) {
      // the run up: a soft rising rush
      const s = ac.createBufferSource(); s.buffer = pink; s.start(t0, rng() * 3, 2.2);
      const bp = filt('bandpass', 380, 0.8); bp.frequency.setValueAtTime(320, t0); bp.frequency.linearRampToValueAtTime(900, t0 + 1.4);
      const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.5, t0 + 0.9); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.1);
      s.connect(bp); bp.connect(g); g.connect(bus);
      // the draw back through the shingle: a falling rattle of tiny stones
      const d0 = t0 + LAP.period * 0.35, n = 34 + Math.floor(rng() * 14);
      for (let i = 0; i < n; i++) {
        const tt = d0 + Math.pow(rng(), 1.6) * 2.6, f = 1800 + rng() * 2800, a = 0.05 + 0.12 * Math.pow(1 - (tt - d0) / 2.6, 1.5);
        const b = ac.createBufferSource(); b.buffer = white; b.start(tt, rng() * 2.5, 0.03);
        const hp = filt('bandpass', f, 3), gg = ac.createGain();
        gg.gain.setValueAtTime(0.0001, tt); gg.gain.linearRampToValueAtTime(a, tt + 0.003); gg.gain.exponentialRampToValueAtTime(0.0001, tt + 0.025);
        b.connect(hp); hp.connect(gg); gg.connect(bus);
      }
      const hiss = ac.createBufferSource(); hiss.buffer = pink; hiss.start(d0, rng() * 3, 2.4);
      const hb = filt('highpass', 1800, 0.5), hg = ac.createGain();
      hg.gain.setValueAtTime(0.0001, d0); hg.gain.linearRampToValueAtTime(0.18, d0 + 0.3); hg.gain.exponentialRampToValueAtTime(0.0001, d0 + 2.3);
      hiss.connect(hb); hb.connect(hg); hg.connect(bus);
    }
    return {
      tick(w, x, z, step, t, now) {
        // heard from the beach and a little way up it (the weight is the Tinctures' 25 m blend)
        level += ((w > 0 ? 0.35 + 0.65 * w : 0) - level) * 0.3;
        bus.gain.setTargetAtTime(level * 0.5, now, 0.3);
        if (level < 0.01) { lastLap = -1; return; }
        nearestShore(x, z, at);
        pl.at(at.x, WY + 0.2, at.z);
        const n = Math.floor(t / LAP.period);
        if (n !== lastLap) {
          if (lastLap >= 0) lap(now + k.lead() + Math.max(0, (n + 1) * LAP.period - t - LAP.period));
          lastLap = n;
        }
      },
      // shingle underfoot: a crunch of small stones shifting, and a low knock
      step(x, z, t0, vol, pitch, out) {
        for (let i = 0; i < 6; i++) {
          const tt = t0 + i * (0.008 + rng() * 0.016);
          const b = ac.createBufferSource(); b.buffer = white; b.start(tt, rng() * 2, 0.05);
          const bp = filt('bandpass', (1700 + rng() * 2600) * pitch, 3), g = ac.createGain();
          g.gain.setValueAtTime(0.0001, tt); g.gain.linearRampToValueAtTime(0.12 * vol, tt + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.04 + rng() * 0.03);
          b.connect(bp); bp.connect(g); g.connect(out);
        }
        const o = ac.createOscillator(); o.frequency.setValueAtTime(140 * pitch, t0); o.frequency.exponentialRampToValueAtTime(70, t0 + 0.06);
        const og = ac.createGain(); og.gain.setValueAtTime(0.0001, t0); og.gain.linearRampToValueAtTime(0.08 * vol, t0 + 0.004); og.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.08);
        o.connect(og); og.connect(out); o.start(t0); o.stop(t0 + 0.1);
        return true;
      },
    };
  },
};

// ---------------------------------------------------------------- the build
function onSpit(x, z, pad = 0) {
  const s = spitAt(x, z);
  return s.t > -0.25 && s.t < 1.1 && s.d < s.w + 2.5 + pad;
}

export async function build(ctx) {
  const { THREE: T, terrain, scene } = ctx;
  const low = ctx.quality === 'low';
  const rng = ctx.makeRng(7300);
  const meshes = [];
  const R = ctx.regions;
  const wAt = (x, z) => R.regionAt(x, z)[KEY];
  const meshH = meshGround(terrain);

  // ---- the shingle: a skin over the strip and the spit, its pebbles sorted by height above the water
  const uSwash = { value: WY }, uTideY = { value: WY };
  const edgeN = (x, z) => 0.5 + 0.2 * N.noise2(x * 0.35, z * 0.35) + 0.12 * N.noise2(x * 1.9, z * 1.9);
  const cBand = [new T.Color('#2a282d'), new T.Color('#18171b'), new T.Color('#34302e'), new T.Color('#202024')];
  const skin = buildSkin(ctx, {
    name: KEY, box: [-135, -20, 118, 218], step: low ? 0.8 : 0.6, lift: 0.025,
    keep: (x, z) => {
      const w = wAt(x, z), sp = onSpit(x, z);
      if (w < 0.2 && !sp) return false;
      return terrain.heightAt(x, z) > WY - 1.3;
    },
    color: (x, z, y, c) => {
      const s = y - WY, g = grade(s), band = Math.floor(s / 0.32 + 0.4 * N.noise2(x * 0.08, z * 0.08));
      c.copy(cBand[((band % 4) + 4) % 4]);
      c.multiplyScalar(0.85 + 0.3 * g); // the coarse stones up top are paler with salt and weather
      // the drift line: a dark band of wrack and grit along the berm's foot
      const wrack = Math.exp(-(((s - 0.78) / 0.07) ** 2)) * (0.5 + 0.5 * N.noise2(x * 0.3, z * 0.3));
      c.lerp(_wr, clamp(wrack, 0, 1) * 0.7);
    },
    // y: 1 on the carpet, its edge at 0.5 (with a pebbly fringe), z: the bands' wander
    attr: (x, z) => {
      const w = onSpit(x, z, -2) ? 1 : wAt(x, z);
      return [0, w / (2 * edgeN(x, z)), 0.4 * N.noise2(x * 0.08, z * 0.08), 0];
    },
    uniforms: { uSwash, uTideY },
    decl: /* glsl */`
      uniform float uSwash, uTideY;
      vec4 gPeb; vec3 gTone;
      const float WY = ${WY.toFixed(2)};
      float pHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      vec2 pHash2(vec2 p) { return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }`,
    // the pebbles (Voronoi cells sized by the band), worked out before the normal so each stone can be domed
    frag: /* glsl */`
      {
        if (vSkin.y < 0.5) discard; // the carpet's edge: grass to shingle in a stride
        // sorted by size into bands up the beach: each band one size, so the seams between them show
        float band = clamp(floor((vTPos.y - WY) / 0.32 + vSkin.z), 0.0, 5.0);
        float size = 0.045 * pow(1.4, band);
        vec2 P = vTPos.xz / size;
        // pebbles fade to their mean tone once one spans under a few pixels, so they never shimmer
        float fade = 1.0 - smoothstep(0.22, 0.5, length(fwidth(vTPos.xz)) / size);
        gPeb = vec4(0.0); gTone = vec3(1.0);
        if (fade > 0.0) {
          vec2 ip = floor(P), fp = fract(P);
          float d1 = 8.0, d2 = 8.0; vec2 best = vec2(0.0), off = vec2(0.0);
          for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
            vec2 g = vec2(float(i), float(j));
            vec2 r = g + 0.15 + 0.7 * pHash2(ip + g) - fp;
            float d = dot(r, r);
            if (d < d1) { d2 = d1; d1 = d; best = ip + g; off = r; } else if (d < d2) d2 = d;
          }
          float edge = sqrt(d2) - sqrt(d1), h = pHash(best);
          vec3 flint = mix(vec3(0.5), vec3(1.5), h * h);
          flint = mix(flint, vec3(4.2, 3.9, 3.5), step(0.96, h));                 // a white-cortexed nodule
          flint = mix(flint, vec3(2.0, 1.25, 0.85), step(0.91, h) * step(h, 0.96)); // iron-stained
          float gap = 1.0 - smoothstep(0.04, 0.2, edge);
          gTone = mix(vec3(1.0), flint * (1.0 - 0.8 * gap), fade);
          gPeb.xy = -off * 0.7 * (1.0 - gap) * fade;
          gPeb.w = h;
        }
        // the tide's dark line and the lap's wet film, a thin foam line at its front
        float film = 1.0 - smoothstep(uSwash - 0.004, uSwash + 0.01, vTPos.y);
        float damp = 1.0 - smoothstep(uTideY + 0.03, uTideY + 0.3, vTPos.y);
        gTone *= 1.0 - 0.5 * max(film, damp * 0.6);
        gPeb.z = max(film, damp * 0.5);
        float foam = (1.0 - smoothstep(0.0, 0.012, abs(vTPos.y - uSwash))) * step(uTideY + 0.02, uSwash);
        gTone = mix(gTone, vec3(2.6), foam * 0.5);
      }`,
    normal: /* glsl */`normal = normalize(normal + mat3(viewMatrix) * vec3(gPeb.x, 0.0, gPeb.y));`,
    // black flint, not the moor's grain: the vertex colour (band and drift line) by the stones' own tone
    post: /* glsl */`
      diffuseColor.rgb = vColor * gTone * 0.8;
      roughnessFactor = mix(0.8 + 0.15 * gPeb.w, 0.3, gPeb.z);`,
  });
  meshes.push(skin);

  // ---- cobbles: the biggest flints, loose on the berm
  const cobGeo = new T.IcosahedronGeometry(1, 0);
  {
    const p = cobGeo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * (1 + 0.25 * Math.sin(i * 1.7)), p.getY(i) * 0.55, p.getZ(i) * (1 + 0.2 * Math.cos(i * 2.3)));
    cobGeo.computeVertexNormals();
  }
  const cobMat = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45, metalness: 0.05 });
  const cobs = [];
  for (let k = 0; k < (low ? 2500 : 5000) && cobs.length < (low ? 450 : 900); k++) {
    const x = -130 + rng() * 108, z = 120 + rng() * 95;
    const w = wAt(x, z); if (w < 0.6 && !onSpit(x, z)) continue;
    const y = terrain.heightAt(x, z), s = y - WY;
    if (s < 0.1 || rng() > grade(s) * 0.9 + 0.05) continue;
    const r = (0.05 + 0.13 * rng() * grade(s)) * (rng() < 0.05 ? 2.2 : 1);
    cobs.push({ x, y: y + r * 0.2, z, s: r, ry: rng() * 6.28, rx: (rng() - 0.5) * 0.4, pale: rng() < 0.06 });
  }
  const pale = new T.Color('#7a736a'), dark = new T.Color('#1e1d22');
  meshes.push(instanced(ctx, cobGeo, cobMat, cobs, { name: 'strandline-cobbles', color: (it) => (it.pale ? pale : dark) }));

  // ---- plants of the shallows: water horsetail stands, bogbean, quillwort under the surface
  const plants = buildShallows(ctx, rng, wAt, low);
  meshes.push(...plants.meshes);

  // ---- midges: columns standing over the margin
  const midges = buildMidges(ctx, rng, wAt, low);
  meshes.push(midges.mesh);

  // ---- the sandpipers
  const birds = buildSandpipers(ctx, rng, low);
  meshes.push(...birds.meshes);

  // the lap and the tide, shared by the shingle's film, the birds and the sound (all from game time)
  ctx.registerUpdate((dt, t) => {
    const tide = WY + tideAt(t);
    uTideY.value = tide;
    uSwash.value = tide + LAP_RISE * lapAt(t);
    midges.update(t);
  });
  ctx.registerUpdate((dt, t) => birds.update(dt, t, uSwash.value), { pos: birds.centre, near: 140, hz: 0 });

  R.stats[KEY] = () => ({ ...meshStats(meshes), creature: birds.count });
  ctx.log(`region strandline: skin ${skin.geometry.index.count / 3} tris, ${cobs.length} cobbles, ${plants.count} shallows plants, ${birds.count} sandpipers`);
  void scene; void meshH;
}
const _wr = new THREE.Color('#151311');

// The shallows: water horsetail (unbranched, black-jointed stems in stands), bogbean (three leaflets on a stalk
// above the water, a spike of fringed white flowers) and quillwort (a little rosette of quills on the bed).
function buildShallows(ctx, rng, wAt, low) {
  const { THREE: T, terrain } = ctx;
  const meshes = [];
  const quad = (P, C, ax, ay, az, bx, by, bz, w, col0, col1) => {
    // a ribbon from a to b, w wide, facing across x and z both (two crossed quads)
    for (const [ux, uz] of [[1, 0], [0, 1]]) {
      const o = P.length / 3;
      P.push(ax - ux * w, ay, az - uz * w, ax + ux * w, ay, az + uz * w, bx + ux * w, by, bz + uz * w, bx - ux * w, by, bz - uz * w);
      C.push(...col0, ...col0, ...col1, ...col1);
      meshIdx.push(o, o + 1, o + 2, o, o + 2, o + 3);
    }
  };
  let meshIdx = [];
  const geoOf = (P, C) => {
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(P, 3));
    g.setAttribute('color', new T.Float32BufferAttribute(C, 3));
    g.setIndex(meshIdx); meshIdx = [];
    g.computeVertexNormals();
    return g;
  };
  // horsetail: seven stems, jointed every 9 cm with a black band
  const hP = [], hC = [], green = [0.16, 0.2, 0.12], black = [0.03, 0.03, 0.03];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * 6.28 + rng(), r = 0.03 + rng() * 0.09, x = Math.cos(a) * r, z = Math.sin(a) * r;
    const hgt = 0.55 + rng() * 0.45, lean = (rng() - 0.5) * 0.08, segs = Math.round(hgt / 0.09);
    for (let s = 0; s < segs; s++) {
      const y0 = (s / segs) * hgt, y1 = ((s + 1) / segs) * hgt, k0 = y0 / hgt, k1 = y1 / hgt;
      const top = s === segs - 1 ? [0.22, 0.17, 0.1] : green;
      quad(hP, hC, x + lean * k0, y0, z + lean * k0 * 0.5, x + lean * k1, y1 - 0.012, z + lean * k1 * 0.5, 0.006 * (1 - 0.5 * k1), green, top);
      quad(hP, hC, x + lean * k1, y1 - 0.012, z + lean * k1 * 0.5, x + lean * k1, y1, z + lean * k1 * 0.5, 0.007, black, black);
    }
  }
  const hGeo = geoOf(hP, hC);
  // bogbean: a stalk and three oval leaflets held flat just above the water, one white flower spike
  const bP = [], bC = [];
  const leafG = [0.14, 0.2, 0.11], stalk = [0.2, 0.22, 0.12], white = [0.78, 0.72, 0.74], pink = [0.6, 0.38, 0.42];
  const leaf = (cx, cy, cz, ang, len) => {
    const o = bP.length / 3, dx = Math.cos(ang), dz = Math.sin(ang), wx = -dz * len * 0.32, wz = dx * len * 0.32;
    bP.push(cx, cy, cz, cx + dx * len * 0.5 + wx, cy + 0.01, cz + dz * len * 0.5 + wz, cx + dx * len, cy + 0.02, cz + dz * len, cx + dx * len * 0.5 - wx, cy + 0.01, cz + dz * len * 0.5 - wz);
    bC.push(...leafG, ...leafG, ...leafG, ...leafG);
    meshIdx.push(o, o + 1, o + 2, o, o + 2, o + 3, o, o + 2, o + 1, o, o + 3, o + 2);
  };
  quad(bP, bC, 0, -0.3, 0, 0, 0.12, 0, 0.005, stalk, stalk);
  for (let i = 0; i < 3; i++) leaf(0, 0.12, 0, (i / 3) * 6.28 + 0.4, 0.09);
  quad(bP, bC, 0.05, -0.3, 0.03, 0.05, 0.26, 0.03, 0.004, stalk, stalk);
  for (let i = 0; i < 6; i++) { const y = 0.18 + i * 0.016; quad(bP, bC, 0.05, y, 0.03, 0.05 + (i % 2 ? 0.02 : -0.02), y + 0.012, 0.03, 0.009, pink, white); }
  const bGeo = geoOf(bP, bC);
  // quillwort: twelve stiff quills in a rosette
  const qP = [], qC = [], quill = [0.1, 0.16, 0.12];
  for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.28, l = 0.08 + (i % 3) * 0.02; quad(qP, qC, 0, 0, 0, Math.cos(a) * l * 0.6, l, Math.sin(a) * l * 0.6, 0.004, quill, quill); }
  const qGeo = geoOf(qP, qC);

  const mat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, side: T.DoubleSide });
  const hs = [], bs = [], qs = [];
  const tries = low ? 9000 : 16000;
  for (let k = 0; k < tries; k++) {
    const x = -130 + rng() * 108, z = 120 + rng() * 95;
    if (Math.abs(tarnShoreDistance(x, z)) > 9) continue;
    const y = terrain.heightAt(x, z), dep = WY - y;
    if (wAt(x, z) < 0.15 && !onSpit(x, z, 3)) continue;
    // stands: horsetail in clumps a little way out, bogbean in the margin, quillwort on the bed
    const stand = N.noise2(x * 0.09 + 3, z * 0.09 - 7);
    if (dep > 0.05 && dep < 0.7 && stand > 0.25 && hs.length < (low ? 160 : 300)) hs.push({ x, y, z, s: 0.8 + rng() * 0.5, ry: rng() * 6.28 });
    else if (dep > -0.05 && dep < 0.35 && stand < -0.2 && bs.length < (low ? 120 : 240)) bs.push({ x, y: WY + 0.015, z, s: 0.9 + rng() * 0.5, ry: rng() * 6.28 });
    else if (dep > 0.12 && dep < 0.45 && rng() < 0.3 && qs.length < (low ? 80 : 180)) qs.push({ x, y, z, s: 0.9 + rng() * 0.6, ry: rng() * 6.28 });
  }
  meshes.push(instanced(ctx, hGeo, mat, hs, { name: 'strandline-horsetail' }));
  meshes.push(instanced(ctx, bGeo, mat, bs, { name: 'strandline-bogbean' }));
  meshes.push(instanced(ctx, qGeo, mat, qs, { name: 'strandline-quillwort' }));
  return { meshes, count: hs.length + bs.length + qs.length };
}

// Midges: a few columns over the margin, each a slow churning pillar of specks, one Points draw.
function buildMidges(ctx, rng, wAt, low) {
  const { THREE: T, terrain } = ctx;
  const cols = [];
  for (let k = 0; k < 400 && cols.length < (low ? 7 : 12); k++) {
    const x = -125 + rng() * 100, z = 125 + rng() * 85;
    if (Math.abs(tarnShoreDistance(x, z) - 1.5) > 3 || wAt(x, z) < 0.5) continue;
    if (cols.some((c) => Math.hypot(c.x - x, c.z - z) < 9)) continue;
    cols.push({ x, z, y: Math.max(terrain.heightAt(x, z), WY) });
  }
  const per = low ? 40 : 70, pos = [], seed = [];
  for (const c of cols) for (let i = 0; i < per; i++) { pos.push(c.x, c.y + 0.6, c.z); seed.push(rng(), rng(), rng(), 1.2 + rng() * 2.2); }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new T.Float32BufferAttribute(seed, 4));
  const uT = { value: 0 };
  const mat = new T.ShaderMaterial({
    uniforms: { ...T.UniformsUtils.clone(T.UniformsLib.fog), uT },
    vertexShader: /* glsl */`
      uniform float uT; attribute vec4 aSeed; varying float vA;
      #include <fog_pars_vertex>
      void main() {
        float ph = aSeed.x * 6.283, sp = 0.6 + aSeed.y * 1.4;
        vec3 transformed = position;
        // a column: each midge rises and falls through its height, circling tightly, jinking
        float hgt = aSeed.w;
        transformed.y += hgt * (0.5 + 0.5 * sin(uT * sp * 0.7 + ph));
        transformed.x += sin(uT * sp * 3.1 + ph * 2.0) * 0.18 + sin(uT * 13.0 * sp + ph) * 0.03;
        transformed.z += cos(uT * sp * 2.7 + ph * 3.0) * 0.18 + cos(uT * 11.0 * sp + ph) * 0.03;
        vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = clamp(42.0 / -mvPosition.z, 1.0, 3.0);
        vA = clamp(1.0 - (-mvPosition.z - 25.0) / 35.0, 0.0, 1.0);
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */`
      varying float vA;
      #include <fog_pars_fragment>
      void main() {
        if (vA <= 0.01) discard;
        gl_FragColor = vec4(0.05, 0.045, 0.05, 0.85 * vA);
        #include <fog_fragment>
      }`,
    transparent: true, depthWrite: false, fog: true,
  });
  const mesh = new T.Points(geo, mat);
  mesh.name = 'strandline-midges';
  geo.computeBoundingSphere();
  ctx.scene.add(mesh);
  return { mesh, update: (t) => { uT.value = t; } };
}

// The sandpipers: small grey waders on the margin round (-80, 180), each holding its own spot along the shore and
// running in and out with the lap's front in exact step with one another (and with the tide under it), pecking
// when it stands. Height profiles along each bird's line down the beach are sampled once at build.
function buildSandpipers(ctx, rng, low) {
  const { THREE: T, terrain } = ctx;
  // body: a plump grey-brown back, a white belly, a dark bill; built along +z (the bird faces +z)
  const P = [], C = [], I = [];
  const ell = (cx, cy, cz, rx, ry, rz, top, bot, seg = 7) => {
    const o = P.length / 3;
    for (let j = 0; j <= 4; j++) for (let i = 0; i < seg; i++) {
      const v = (j / 4) * Math.PI, u = (i / seg) * 6.283, sy = Math.cos(v), r = Math.sin(v);
      P.push(cx + Math.cos(u) * r * rx, cy + sy * ry, cz + Math.sin(u) * r * rz);
      const c = sy > -0.15 ? top : bot; C.push(...c);
    }
    for (let j = 0; j < 4; j++) for (let i = 0; i < seg; i++) {
      const a = o + j * seg + i, b = o + j * seg + ((i + 1) % seg), c = a + seg, d = b + seg;
      I.push(a, c, b, b, c, d);
    }
  };
  const grey = [0.2, 0.185, 0.17], white = [0.7, 0.68, 0.66], bill = [0.05, 0.05, 0.05];
  ell(0, 0.11, 0, 0.045, 0.04, 0.075, grey, white);
  ell(0, 0.155, 0.06, 0.027, 0.027, 0.03, grey, white, 6);
  ell(0, 0.152, 0.105, 0.005, 0.005, 0.025, bill, bill, 4);
  ell(0, 0.12, -0.075, 0.02, 0.01, 0.04, grey, grey, 5); // the tail
  const bodyGeo = new T.BufferGeometry();
  bodyGeo.setAttribute('position', new T.Float32BufferAttribute(P, 3));
  bodyGeo.setAttribute('color', new T.Float32BufferAttribute(C, 3));
  bodyGeo.setIndex(I); bodyGeo.computeVertexNormals();
  const legGeo = new T.BoxGeometry(0.008, 0.075, 0.008); legGeo.translate(0, -0.0375, 0);
  const bodyMat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 });
  const legMat = new T.MeshStandardMaterial({ color: 0x14120f, roughness: 0.7 });

  // spots: along the south shore and the bay's mouth, on gentle shingle
  const spots = [];
  const centre = { x: -84, z: 180 };
  for (let k = 0; k < 3000 && spots.length < (low ? 7 : 11); k++) {
    const a = rng() * 6.283, r = 6 + rng() * 26, x = centre.x + Math.cos(a) * r, z = centre.z + Math.sin(a) * r;
    const sd = tarnShoreDistance(x, z);
    if (Math.abs(sd) > 1.5 || ctx.regions.regionAt(x, z)[KEY] < 0.5) continue;
    if (spots.some((s) => Math.hypot(s.x - x, s.z - z) < 2.2)) continue;
    // the line down the beach: the steepest descent, by the heightfield
    const e = 0.8, gx = terrain.heightAt(x + e, z) - terrain.heightAt(x - e, z), gz = terrain.heightAt(x, z + e) - terrain.heightAt(x, z - e);
    const gl = Math.hypot(gx, gz); if (gl < 0.05) continue;
    const ux = gx / gl, uz = gz / gl; // uphill
    // heights along it from 2 m down (in the water) to 4 m up, every 5 cm
    const prof = new Float32Array(121);
    for (let i = 0; i <= 120; i++) { const o = -2 + i * 0.05; prof[i] = terrain.heightAt(x + ux * o, z + uz * o); }
    if (prof[0] > WY || prof[120] < WY + 0.25) continue;
    spots.push({ x, z, ux, uz, prof, o: 0, v: 0, peck: rng() * 10, ph: rng() * 6.28, yaw: 0, lean: 0 });
  }
  const n = spots.length;
  const bodies = new T.InstancedMesh(bodyGeo, bodyMat, Math.max(1, n));
  const legs = new T.InstancedMesh(legGeo, legMat, Math.max(1, n * 2));
  bodies.name = 'strandline-sandpipers'; legs.name = 'strandline-sandpiper-legs';
  bodies.castShadow = false; legs.castShadow = false; bodies.receiveShadow = true;
  bodies.frustumCulled = false; legs.frustumCulled = false;
  ctx.scene.add(bodies, legs);
  const m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), p = new T.Vector3(), sc = new T.Vector3(1.35, 1.35, 1.35), lm = new T.Matrix4(), off = new T.Vector3();
  const frontAt = (s, y) => { // metres along the line where the ground meets the water's front
    const pr = s.prof;
    for (let i = 0; i < 120; i++) if (pr[i + 1] >= y) { const f = (y - pr[i]) / Math.max(1e-4, pr[i + 1] - pr[i]); return -2 + (i + clamp(f, 0, 1)) * 0.05; }
    return 4;
  };
  const yAt = (s, o) => { const f = clamp((o + 2) / 0.05, 0, 119.999), i = f | 0; return s.prof[i] + (s.prof[i + 1] - s.prof[i]) * (f - i); };
  function update(dt, t, swashY) {
    dt = Math.min(dt, 0.1);
    for (let k = 0; k < n; k++) {
      const s = spots[k];
      // in exact step: every bird keeps 0.35 m above the front, whichever way it is going
      const target = frontAt(s, swashY) + 0.35;
      const d = target - s.o, want = clamp(d * 6, -2.6, 2.6);
      s.v += (want - s.v) * Math.min(1, dt * 14);
      s.o += s.v * dt;
      const running = Math.abs(s.v) > 0.15;
      s.peck = running ? 0 : s.peck + dt;
      const bob = running ? Math.abs(Math.sin(t * 38 + s.ph)) * 0.008 : 0;
      const peckA = !running && (s.peck % 1.7) < 0.35 ? Math.sin(((s.peck % 1.7) / 0.35) * Math.PI) * 0.7 : 0;
      // face along the shore, turned a little toward where it runs
      const yaw = Math.atan2(-s.uz, s.ux) + (s.v > 0.15 ? 0.5 : s.v < -0.15 ? -0.5 : 0) + 0.2 * Math.sin(s.ph);
      s.yaw += (yaw - s.yaw) * Math.min(1, dt * 8);
      const x = s.x + s.ux * s.o, z = s.z + s.uz * s.o, y = yAt(s, s.o);
      e.set(peckA, s.yaw, 0, 'YXZ'); q.setFromEuler(e);
      p.set(x, y + 0.097 + bob, z);
      bodies.setMatrixAt(k, m.compose(p, q, sc));
      for (let l = 0; l < 2; l++) {
        const sw = running ? Math.sin(t * 38 + s.ph + l * Math.PI) * 0.7 : 0;
        e.set(sw, s.yaw, 0, 'YXZ'); q.setFromEuler(e);
        off.set(l ? 0.02 : -0.02, 0, 0).applyAxisAngle(_up, s.yaw);
        lm.compose(p.set(x + off.x, y + 0.1 + bob, z + off.z), q, sc);
        legs.setMatrixAt(k * 2 + l, lm);
      }
    }
    bodies.instanceMatrix.needsUpdate = true; legs.instanceMatrix.needsUpdate = true;
  }
  update(0, 0, WY);
  ctx.regions.creatures = Object.assign(ctx.regions.creatures || {}, { sandpipers: spots }); // for views and tests
  return { meshes: [bodies, legs], update, count: n, centre: { x: centre.x, z: centre.z } };
}
const _up = new THREE.Vector3(0, 1, 0);
