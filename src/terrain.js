// Terrain: a single heightfield over the whole region, bounded by impassable mountains,
// with a glacier tongue coming down from the north. Everything else samples heightAt().
import * as THREE from 'three';
import { mulberry32, clamp, lerp, smoothstep } from './noise.js';
import { setRegionsCoarse } from './v4/regions.js'; // v4 regions: the mesh's coarse pass
import { WORLD, PALETTE, SUN } from './world.js';
import { prepareMap } from './v4/paths/ground.js'; // v4 map: trace the leads before the mesh
import { M_START, PROFILE as MTN_PROFILE, MASSIFS, WALL_SAMPLE, faceNoise } from './v4/mountains.js'; // v4 systems: the walls
import { regionsGround } from './v4/regions.js'; // v4 systems: the regions' ground hooks
import { ground as placesGround } from './v8/places.js'; // v8-02: the common, the wood's litter, the fen's mud
import { glacierFloorIce, glacierCoords, GLACIER_GLSL } from './v4/glacier.js'; // v4 regions: the glacier rebuilt
import { injectOccultation } from './v5/occultation.js'; // v5 wonders: AR the Occultation's shadow on the walls
import { injectAnnals } from './v5/annals.js'; // v5 wonders: AK the Annals, a frieze in this material's fragment shader
// the heightfield and its queries (v13 L2: src/height/field.js, three-free, so a worker can import it), re-exported
import {
  heightAt, normalAt as normalField, slopeAt, biomeAt, waterLevelAt, waterDepthAt, isUnderwater, causewayDistance, glacierMask,
  riverAt, riverSpeed, RIVER, BAKE_KIT,
} from './height/field.js';
export { heightAt, slopeAt, biomeAt, waterLevelAt, waterDepthAt, isUnderwater, causewayDistance, glacierMask, riverAt, riverSpeed, RIVER };
const { SX, riverSection, cs: _cs, biomeWith, POOL, POOL_R, GULLY_BED, IMPACT } = BAKE_KIT;
// normalAt into a THREE.Vector3 unless given out (any { x, y, z })
const _n = new THREE.Vector3();
export function normalAt(x, z, out = _n, eps = 0.6) { return normalField(x, z, out, eps); }

// --- the massifs' bands (begin): the shader's copy of the massifs' bedding planes (MASSIFS in v4/mountains.js,
// blended across the cols the same way), which tilt the wall's faint bedding, and the sun's direction across the
// ground, for the snow's lee. Empty under ?mountains=v4, whose bands are as they were.
function massifGLSL() {
  if (MTN_PROFILE === 'v4') return '';
  const f = (v) => v.toFixed(4);
  const terms = MASSIFS.map(([b0, b1, dx, dz]) => `fpMassifAdd(acc, b, ${f((b0 + b1) / 2)}, ${f((b1 - b0) / 2)}, vec2(${f(dx)}, ${f(dz)}));`).join(' ');
  return `#define FP_MASSIFS 1
        const vec2 FP_SUN_XZ = vec2(${f(Math.cos(SUN.azimuth))}, ${f(Math.sin(SUN.azimuth))});
        void fpMassifAdd(inout vec3 acc, float b, float mid, float hw, vec2 v) {
          float d = abs(mod(b - mid + 540.0, 360.0) - 180.0);
          float k = pow(max(1e-3, 1.0 - smoothstep(hw, hw + 14.0, d)), 2.0) + 1e-6 / (1.0 + d);
          acc += vec3(v * k, k);
        }
        vec2 fpMassifBed(vec2 p) {
          float b = mod(degrees(atan(p.y, p.x)) + 450.0, 360.0);
          vec3 acc = vec3(0.0);
          ${terms}
          return acc.xy / acc.z;
        }`;
}
// --- the massifs' bands (end)

// --- the wall close up (v11.1 W1, begin). The mesh is 2-3 m a cell, so under ~200 m the wall's rock is the shader's:
// joints that break it into blocks of ~3 m and ~0.9 m, each block a facet tilted its own way (the bump), with thin
// beds inside it that stop at its joints, a joint on only some edges (so blocks merge into masses), lichen in
// patches, and on the aprons and fans scree: boulders, stones and grit, each stone its own gap, value and tilt. All of it is cells of a jittered grid (Voronoi), drawn in three charts like a triplanar (the arc round
// the bowl and height; the radius and height, for faces turned along the arc; plan, for the shoulders and the
// scree), blended by the normal. Every line is a filtered line: where a joint is thinner than the pixel's footprint
// (half the larger of its two ways, or their mean if more, so a grazing view is filtered along its length) it widens and pales, and a whole layer
// fades out before its cells are a few pixels, so nothing rings or shimmers. The arc chart's cells repeat a whole
// number of times round the circle (FP_NL, FP_NS), so atan's wrap has no seam. Bounded by vRock (the bake: the
// wall's rock and its scree), so the bowl's ground is untouched; past 250 m none of it runs.
const CLOSE_ROCK_GLSL = `#ifdef FP_MASSIFS
        const float FP_NL = 704.0, FP_NS = 2512.0; // cells round the circle at r 360: 3.21 m and 0.90 m
        const vec3 FP_LICHEN = vec3(1.25, 1.45, 1.15), FP_LICHEN_RUST = vec3(1.9, 1.05, 0.55); // as tints of the rock
        uvec2 fpPcg(uvec2 v) {
          v = v * 1664525u + 1013904223u; v.x += v.y * 1664525u; v.y += v.x * 1664525u; v ^= v >> 16u;
          v.x += v.y * 1664525u; v.y += v.x * 1664525u; v ^= v >> 16u; return v;
        }
        vec4 fpCellHash(ivec2 c, int per) {
          if (per > 0) c.x -= per * int(floor(float(c.x) / float(per)));
          uvec2 v = fpPcg(uvec2(c + 65536));
          return vec4(float(v.x & 65535u), float(v.x >> 16u), float(v.y & 65535u), float(v.y >> 16u)) / 65535.0;
        }
        // the nearest cell of a jittered grid at p (in cells): returns the distance to its edge (the bisector with the
        // second nearest), in cells; off is p from the cell's point, h the cell's hash (xy placed the point), h2's
        // .z and .w the second nearest's (so a joint can be there or not, the same seen from either side)
        float fpVoro(vec2 p, int per, out vec2 off, out vec4 h, out vec2 h2) {
          vec2 c0 = floor(p), f = p - c0; ivec2 ic = ivec2(c0);
          float d1 = 1e9, d2 = 1e9; vec2 o1 = vec2(0.0), o2 = vec2(1.0); h = vec4(0.0); h2 = vec2(0.0);
          for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
            vec4 hh = fpCellHash(ic + ivec2(i, j), per);
            vec2 o = f - (vec2(float(i), float(j)) + 0.5 + (hh.xy - 0.5) * 0.95);
            float d = dot(o, o);
            if (d < d1) { d2 = d1; o2 = o1; h2 = h.zw; d1 = d; o1 = o; h = hh; } else if (d < d2) { d2 = d; o2 = o; h2 = hh.zw; }
          }
          off = o1;
          return (d2 - d1) / (2.0 * max(length(o1 - o2), 1e-4));
        }
        // a line w cells wide along an edge e cells off, filtered by the footprint fc (cells): wider and paler, never thinner
        float fpLine(float e, float w, float fc) { float ww = max(w, fc * 1.5); return (1.0 - smoothstep(0.0, ww, e)) * (w / ww); }
        // a smooth warp, so no joint is a straight polygon side for long
        vec2 fpWarp(vec2 p, float a) { return p + a * vec2(sin(p.y * 1.37 + sin(p.x * 0.61) * 1.9), sin(p.x * 1.13 + sin(p.y * 0.73) * 2.1)); }
        // the face in one chart: uv in metres (u across, v up the beds), per = cells round the circle (0: no wrap); fp
        // the footprint in metres; gr (x: a fine grain, y: a coarse one) for the lichen. Adds the darkening (o.x), the
        // albedo's shift (o.y), the lichen (o.z), its rust share (o.w); t the facets' slope in the chart. A joint is
        // drawn on a little over half the cells' edges (the pair decides), so the blocks merge into irregular masses
        // with fractures that start and stop, not a crazy paving.
        void fpFace(vec2 uv, int perL, int perS, float fp, vec2 gr, float dry, inout vec4 o, inout vec2 t, float w) {
          vec2 off, h2; vec4 h;
          float cL = perL > 0 ? 6.2831853 * 360.0 / FP_NL : 3.21, cS = perS > 0 ? 6.2831853 * 360.0 / FP_NS : 0.9;
          float fcL = fp / cL, fadeL = 1.0 - smoothstep(0.06, 0.16, fcL);
          if (fadeL > 0.0) {
            // taller than wide: the joints run down the face, the beds across (perL wraps u; the warp is periodic in it
            // only approximately, but its amplitude is a fraction of a cell, under the jitter)
            vec2 pL = fpWarp(vec2(uv.x / cL, uv.y / (cL * 1.5)), 0.22);
            float e = fpVoro(pL, perL, off, h, h2);
            float keep = step(0.42, fract((h.z + h2.x) * 7.13 + h.z * h2.x * 3.1));
            float open = 0.35 + 0.95 * h.w * h2.y;
            o.x += w * fadeL * keep * fpLine(e, 0.02 + 0.04 * h.w * h2.y, fcL) * 0.7 * open;
            // most blocks weathered dark; one in six a fresh scar where a block fell, pale, the face's lightest value
            // most blocks weathered dark; one in ten a fresh scar where a block fell: pale, a hard upper edge (the
            // joint it broke from), fading down the block in streaks where the dust washed out of it
            float scar = step(0.9, fract(h.z * 5.37 + h.w));
            float tail = off.y > 0.0 ? 1.0 : smoothstep(-0.45, 0.05, off.y) * (0.55 + 0.45 * sin(off.x * 17.0 + h.x * 6.3)) * (1.0 - smoothstep(0.1, 0.2, fcL));
            o.y += w * fadeL * ((h.z - 0.5) * 0.16 + scar * max(tail, 0.0) * 0.35);
            // each block turned a few degrees its own way (at most ~6): a step of value from its neighbour, the crack
            // carrying the line. (Slopes of 0.4-0.65 swung whole 3 m blocks past the light into flat black polygons.)
            t += w * fadeL * (vec2(h.z, h.w) - 0.5) * 0.2;
            // beds inside the block, 0.3-0.7 m, tilted its own way: they stop at its joints
            float bp = 0.3 + 0.4 * fract(h.z * 7.31), bs = uv.y / bp + h.w * 9.0 + uv.x * (h.x - 0.5) * 0.15 / bp;
            float fb = fp / bp, fadeB = (1.0 - smoothstep(0.12, 0.35, fb)) * step(0.35, h.x);
            o.x += w * fadeL * fadeB * fpLine(abs(fract(bs + 0.5) - 0.5), 0.04, fb) * 0.3;
            o.y += w * fadeL * fadeB * (fract(floor(bs) * 0.618 + h.x) - 0.5) * 0.14;
          }
          float fcS = fp / cS, fadeS = 1.0 - smoothstep(0.06, 0.16, fcS);
          if (fadeS > 0.0) {
            vec2 pS = fpWarp(vec2(uv.x / cS, uv.y / (cS * 1.3)) + 17.0, 0.25);
            float e = fpVoro(pS, perS, off, h, h2);
            float keep = step(0.5, fract((h.z + h2.x) * 5.71 + h.z * h2.x * 2.3));
            o.x += w * fadeS * keep * fpLine(e, 0.025, fcS) * 0.5;
            o.y += w * fadeS * (h.z - 0.5) * 0.18;
            t += w * fadeS * (vec2(h.z, h.w) - 0.5) * 0.14;
            // lichen: in patches where the coarse grain says so, on the dry rock, a ragged crust over some of the
            // small blocks; one patch in twenty-five the rust kind
            float zone = smoothstep(0.5, 0.64, gr.y) * dry;
            if (zone > 0.0) {
              float m = smoothstep(0.56, 0.68, gr.x + (h.w - 0.5) * 0.3 - length(off) * 0.15) * fadeS * w * zone;
              o.z += m; o.w += m * step(0.94, h.z);
            }
          }
        }
        // one layer of loose stones in plan: cells of c metres, a stone in a share occ of them (scaled by den, so the
        // scree thins out into the plain apron), each a rounded block of its own size, squash and tone, domed (its
        // slope feeds the normal, so the low sun lights its sunward shoulder) and darker on its far side, with a soft
        // shadow cast on the grit behind it. Between the stones nothing is drawn: the apron's grit. Returns its cover.
        float fpStones(vec2 p, float c, float occ, float den, float fp, float gF, inout vec4 o, inout vec2 t, float w) {
          float fc = fp / c, fade = 1.0 - smoothstep(0.06, 0.16, fc);
          if (fade <= 0.0 || w <= 0.0) return 0.0;
          vec2 off, h2; vec4 h;
          float e = fpVoro(p / c, 0, off, h, h2);
          float on = step(1.0 - occ * den, h.z), edge = smoothstep(0.0, 0.12, e); // nothing reaches its cell's edge (no straight cut)
          if (on <= 0.0) return 0.0;
          float rad = 0.15 + 0.2 * h.w;                                 // its size, in cells (kept inside its cell, with its shadow)
          // an angular block: five faces round a flat top, at angles of its own; d is how far out, 1 at its edge
          float ang = h.x * 6.2831853, d = 0.0; vec2 nf = vec2(1.0, 0.0);
          for (int k = 0; k < 5; k++) {
            float a = ang + float(k) * 1.2566371 + (fract(h.y * float(k + 3) * 3.7) - 0.5) * 0.7;
            vec2 nk = vec2(cos(a), sin(a));
            float dk = dot(off, nk) / (rad * (0.8 + 0.4 * fract(h.w * float(k + 2) * 5.3)));
            if (dk > d) { d = dk; nf = nk; }
          }
          d += 0.08 * (gF - 0.5);                                       // its edge a little ragged
          float soft = 0.1 + 1.5 * fc / rad;
          float inside = (1.0 - smoothstep(1.0 - soft, 1.0, d)) * fade * edge;
          // flat-faced: the top tilted a little its own way, the sides steep, each face one slope (lit or not by the low sun)
          float side = smoothstep(0.4, 0.68, d);
          // (a big block's sides stay gentle: at the small stones' 1.3 a 2 m block's far side went black as a slab)
          vec2 sd = mix((vec2(h.y, h.w) - 0.5) * 0.3, nf * (c > 1.0 ? 0.45 : 1.3), side);
          t += w * inside * sd;
          float away = dot(nf, FP_SUN_XZ) * side;                      // > 0 on its sunward side
          o.x += w * inside * (smoothstep(0.0, -0.9, away) * 0.22 + 0.1 * (1.0 - gF));
          o.y += w * inside * ((fract(h.z * 13.1 + h.w) - 0.5) * 0.7 + 0.12 + smoothstep(0.0, 0.8, away) * 0.35 + (1.0 - side) * 0.1);
          // its shadow on the grit, thrown away from the sun, soft-edged
          float ds = length(off + FP_SUN_XZ * rad * 0.35) / (rad * 1.05);
          o.x += w * (1.0 - inside) * (1.0 - smoothstep(0.6, 1.0 + soft, ds)) * fade * edge * 0.32;
          return inside;
        }
        // scree in plan (x, z metres), den its density 0..1: a few big blocks, stones, and many small ones, the
        // larger hiding the smaller; the fine grit between is the apron's own grain, a little darker
        void fpScree(vec2 p, float fp, float gF, float den, inout vec4 o, inout vec2 t, float w) {
          float c1 = fpStones(p + 31.0, 2.4, 0.3, den, fp, gF, o, t, w);
          float c2 = fpStones(p + 7.0, 0.7, 0.6, den, fp, gF, o, t, w * (1.0 - c1));
          float c3 = fpStones(p, 0.2, 0.75, den, fp, gF, o, t, w * (1.0 - max(c1, c2)));
          float fg = fp / 0.05;
          o.x += w * (1.0 - max(c1, max(c2, c3))) * (1.0 - smoothstep(0.3, 1.0, fg)) * (0.08 + 0.14 * gF) * den;
        }
        // all of it at p (n the normal, fp the footprint, rk the face's and the scree's weights, gr the grains, dry
        // where no water runs): returns (albedo factor, lichen, the bump's weight, the lichen's rust share); g gets
        // the slope in world space
        vec4 fpCloseRock(vec3 p, vec3 n, float fp, vec2 rk, vec2 gr, float dry, inout vec3 g) {
          float r = max(length(p.xz), 1.0); vec2 R = p.xz / r, T = vec2(-R.y, R.x);
          vec3 w3 = pow(abs(vec3(dot(n.xz, R), dot(n.xz, T), n.y)), vec3(4.0)); w3 /= (w3.x + w3.y + w3.z);
          vec2 mb = fpMassifBed(p.xz);
          float v = p.y + dot(p.xz, mb); // up the beds
          vec4 o = vec4(0.0); vec2 t;
          if (rk.x > 0.002) {
            if (w3.x > 0.08) { // the arc chart: faces turned to the bowl
              t = vec2(0.0); fpFace(vec2(atan(p.z, p.x) * 360.0, v), int(FP_NL), int(FP_NS), fp, gr, dry, o, t, w3.x * rk.x);
              g += t.x * vec3(T.x, 0.0, T.y) + vec3(0.0, t.y, 0.0);
            }
            if (w3.y > 0.08) { // the radial chart: the sides of spurs and couloirs
              t = vec2(0.0); fpFace(vec2(r, v), 0, 0, fp, gr, dry, o, t, w3.y * rk.x);
              g += t.x * vec3(R.x, 0.0, R.y) + vec3(0.0, t.y, 0.0);
            }
            if (w3.z > 0.08) { // plan: the shoulders and ledges
              t = vec2(0.0); fpFace(p.xz, 0, 0, fp, gr, dry, o, t, w3.z * rk.x);
              g += vec3(t.x, 0.0, t.y);
            }
          }
          if (rk.y > 0.002) {
            float ws = smoothstep(0.0, 0.2, rk.y) * smoothstep(0.45, 0.7, n.y); // talus spills a little onto the moor at the foot
            t = vec2(0.0); fpScree(p.xz, fp, gr.x, smoothstep(0.02, 0.5, rk.y), o, t, ws);
            g += vec3(t.x, 0.0, t.y);
          }
          float lich = clamp(o.z, 0.0, 1.0);
          return vec4(max(0.2, (1.0 - clamp(o.x, 0.0, 0.8)) * max(0.3, 1.0 + o.y)), lich * 0.8, max(rk.x, rk.y), lich > 0.0 ? clamp(o.w / max(o.z, 1e-3), 0.0, 1.0) : 0.0);
        }
        #endif`;
// --- the wall close up (end)

// A small procedural detail texture: periodic value-noise fbm so it tiles with no seam or banding.
function makeDetailTexture(size = 256) {
  const data = new Uint8Array(size * size * 4);
  const rnd = mulberry32(991);
  const lat = new Float32Array(64 * 64);
  for (let i = 0; i < lat.length; i++) lat[i] = rnd();
  const pv = (x, y, period) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    let fx = x - xi, fy = y - yi;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    const x0 = ((xi % period) + period) % period, y0 = ((yi % period) + period) % period;
    const x1 = (x0 + 1) % period, y1 = (y0 + 1) % period;
    const idx = (xx, yy) => lat[((yy * 7 + xx * 13) % 4096 + 4096) % 4096];
    const a = idx(x0, y0), b = idx(x1, y0), c = idx(x0, y1), d = idx(x1, y1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
  const fbm = (u, v, base, oct) => {
    let sum = 0, amp = 0.5, norm = 0, per = base;
    for (let o = 0; o < oct; o++) { sum += amp * pv(u * per, v * per, per); norm += amp; amp *= 0.5; per *= 2; }
    return sum / norm;
  };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, v = y / size;
    const f = fbm(u, v, 4, 5);
    const g = fbm(u + 0.37, v + 0.11, 8, 4);
    const h = fbm(u + 0.71, v + 0.53, 16, 3);
    const i = (y * size + x) * 4;
    data[i] = f * 255; data[i + 1] = g * 255; data[i + 2] = h * 255; data[i + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, size, size);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true; tex.needsUpdate = true;
  // the texture's mean (its last mip level): what the finest detail averages to at a distance
  const mean = [0, 0, 0];
  for (let i = 0; i < data.length; i += 4) { mean[0] += data[i]; mean[1] += data[i + 1]; mean[2] += data[i + 2]; }
  tex.userData.mean = mean.map((m) => m / (255 * size * size));
  return tex;
}

// Distance bands (v3 stage 3; ?bands=0 computes everything everywhere, as before): the bump's 24
// texture reads are skipped past 60 m, where its strength is already 0, and the finest detail layer
// (2.1 cycles a metre, already mip-averaged to its mean on open ground past ~30 m) fades to that mean
// between 90 and 120 m and is not sampled beyond.
const BANDS = new URL(location.href).searchParams.get('bands') !== '0';

const C = (hex) => new THREE.Color(hex);
const REGIONS_DEBUG = new URL(location.href).searchParams.get('regions') === '1';
const MESH_SLOPE = new URL(location.href).searchParams.get('bakeslope') === 'mesh';

export function buildTerrain(ctx) {
  const { scene } = ctx;
  const size = WORLD.size, segs = ctx.quality === 'low' ? 320 : 480;
  const geo = new THREE.PlaneGeometry(size, size, segs, segs);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const iceArr = new Float32Array(pos.count);
  const glacArr = new Float32Array(pos.count * 3), gc = [0, 0, 0];
  const wetArr = new Float32Array(pos.count);
  const wallArr = new Float32Array(pos.count); // the wall's water (v4/mountains.js drainage): the couloirs and their gullies
  const rockArr = new Float32Array(pos.count * 3); // (v11.1) how much of the colour is the wall's bare rock, its scree (the shader's close detail), and the face's convexity over ~12 m (ribs +, couloirs -)
  const rsec = { ..._cs };
  const cShingle = C('#48443e'), cPale = C('#8a8274'), cSilt = C('#2c2a24');
  const col = new THREE.Color();
  // Ground reads olive, peat and moss under the red sun, not rust dust: the dry grass is dun-olive, not tan,
  // and the mountain rock is cool slate so the haze can layer the ridges against each other.
  const cMoor = C('#4a5329'), cDry = C('#6b6a3c'), cHeath = C(PALETTE.heather), cMud = C(PALETTE.mud);
  const cRock = C('#3c3838'), cRockD = C('#1f1c20'), cScree = C('#4a4644'), cIce = C(PALETTE.ice);
  const cWood = C('#2a3220'), cShore = C('#3a3832'), cOrch = C('#544a2c'), cCrys = C('#56727e'), cRoad = C('#5e5650'), cPeat = C('#1c1a16'), cMoss = C('#38542c');
  const tmp = new THREE.Color();
  const MASSIF_BANDS = MTN_PROFILE !== 'v4', cScreeL = C('#5c5752'), tmp2 = new THREE.Color(); // the massifs' bands
  // the wall's rock masses (v11): slate, a rust-brown, a dark basalt, a cold lichen-grey; and the damp of the couloirs
  const cRust = C('#5a4232'), cBasalt = C('#242226'), cLichen = C('#3d453a'), cDamp = C('#141618'), cHard = C('#8a7f70'), cSlate = C('#3e3d44'), cFan = C('#7a736a');
  prepareMap(); // v4 map: trace the leads before the mesh, so it carries the runnels' cuts
  setRegionsCoarse(size / segs); // v4 regions: the mesh takes fine relief's lower envelope (regions.js)
  // the heights first, so the wall's colour classes can read its slope over 4 cells (below); with them the wall's
  // water and its fans' mouths (v4/mountains.js WALL_SAMPLE, read straight after each heightAt)
  const mouthArr = new Float32Array(pos.count), hardArr = new Float32Array(pos.count), stepArr = new Float32Array(pos.count), nV = segs + 1, cellW = size / segs;
  for (let i = 0; i < pos.count; i++) {
    WALL_SAMPLE.water = 0; WALL_SAMPLE.mouth = 0; WALL_SAMPLE.hard = 0; WALL_SAMPLE.step = 0;
    pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)));
    wallArr[i] = WALL_SAMPLE.water; mouthArr[i] = WALL_SAMPLE.mouth; hardArr[i] = WALL_SAMPLE.hard; stepArr[i] = WALL_SAMPLE.step;
  }
  // the wall's slope from the mesh over ±2 cells (4-6 m): biomeAt's reads a 0.6 m step, so on a face near the scree's
  // angle the colour classes flipped from vertex to vertex in the pattern of the finest noise, stretched up the face
  // (the herringbone fur on the faces)
  const slopeW = (i) => {
    const ci = i % nV, cj = (i - ci) / nV;
    const i0 = Math.max(0, ci - 2), i1 = Math.min(segs, ci + 2), j0 = Math.max(0, cj - 2), j1 = Math.min(segs, cj + 2);
    const gx = (pos.getY(cj * nV + i1) - pos.getY(cj * nV + i0)) / ((i1 - i0) * cellW);
    const gz = (pos.getY(j1 * nV + ci) - pos.getY(j0 * nV + ci)) / ((j1 - j0) * cellW);
    return Math.atan(Math.hypot(gx, gz));
  };
  // ?bakeslope=mesh (v13 L2, a trial, off): the biome's slope from the mesh's own heights a cell either side, as
  // slopeAt's normal is from 0.6 m either side, so the bake makes no heightAt of its own for it. It is not the same
  // slope (a 2-3 m baseline smooths what 0.6 m sees), so the colours move: the orchestrator's call, not a default.
  const slopeMesh = (i) => {
    const ci = i % nV, cj = (i - ci) / nV;
    const i0 = Math.max(0, ci - 1), i1 = Math.min(segs, ci + 1), j0 = Math.max(0, cj - 1), j1 = Math.min(segs, cj + 1);
    const gx = (pos.getY(cj * nV + i0) - pos.getY(cj * nV + i1)) / ((i1 - i0) * cellW), gz = (pos.getY(j0 * nV + ci) - pos.getY(j1 * nV + ci)) / ((j1 - j0) * cellW);
    return Math.acos(clamp(1 / Math.sqrt(gx * gx + 1 + gz * gz), -1, 1));
  };
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const y = pos.getY(i);
    const wWater = wallArr[i], wMouth = mouthArr[i];
    // the biome's slope (four heightAt at 0.6 m) feeds its rock, the ice's hold and the shingle; on the wall the rock is
    // read from the mesh instead (sW, below), so where that rock is whole (it covers the moor's colours) and there is
    // no ice or shingle, the biome takes slope 0 and nothing baked changes
    const r = riverSection(x, z, rsec);
    const rW = Math.hypot(x, z), mmW = MASSIF_BANDS ? smoothstep(300, 334, rW) : 0, sW = mmW > 0 ? slopeW(i) : 0;
    const wallRock = clamp(smoothstep(0.55, 0.95, sW) + smoothstep(WORLD.regionRadius, WORLD.regionRadius + 60, rW) * 0.6, 0, 1);
    let b = mmW === 1 && wallRock === 1 && !(r.shingle > 0) ? biomeWith(x, z, y, 0, r) : null;
    if (!b || b.ice > 0) b = biomeWith(x, z, y, MESH_SLOPE ? slopeMesh(i) : slopeAt(x, z), r);
    // base: moor grass to dry grass by noise, heather patches
    const dry = SX.warped2(x * 0.01 + 3, z * 0.01 + 1, 3) * 0.5 + 0.5;
    col.copy(cMoor).lerp(cDry, dry);
    col.lerp(cHeath, b.heath * 0.55 * b.moor);
    // peat hags and moss cushions break up the moor
    const peat = smoothstep(0.35, 0.6, SX.warped2(x * 0.02 + 70, z * 0.02 + 33, 3));
    col.lerp(cPeat, peat * 0.7 * b.moor);
    const mossLow = smoothstep(2, -2, y); // (0 at y 2 and above: the lerp by +0 leaves the colour, so no noise)
    if (mossLow !== 0) col.lerp(cMoss, smoothstep(0.3, 0.55, SX.warped2(x * 0.05 - 40, z * 0.05 + 12, 3)) * mossLow * 0.5);
    col.lerp(cWood, b.wood * 0.8);
    col.lerp(cOrch, b.orchard * 0.5);
    col.lerp(cMud, b.marsh * 0.85);
    col.lerp(cShore, b.shore * 0.8);
    col.lerp(cCrys, b.crystal * 0.5);
    // slope → rock; height → scree then dark rock (on the massifs' wall, by the slope over 4 cells)
    const rockMix = lerp(clamp(b.rock, 0, 1), wallRock, mmW);
    tmp.copy(cScree).lerp(cRock, smoothstep(10, 60, y)).lerp(cRockD, smoothstep(60, 160, y));
    // --- the massifs' bands (begin): on the walls (not ?mountains=v4) the colour goes by what the rock is and where
    // water runs, not by height, in three values a face: dark (the couloirs, damp; the basalt; the crags' risers),
    // middle (slate and rust masses, two or three to a massif, tilted so they lie across the face like beds) and
    // pale (the hard beds outcropping in pieces, the scree of the aprons and the fans at the couloirs' mouths)
    if (MASSIF_BANDS) {
      const mm = mmW;
      if (mm > 0) {
        // (in the face's chart, tilted along the massif's beds: xz noise hangs in vertical smears on a steep face)
        const azW = Math.atan2(z, x), yb = y + 0.07 * x - 0.05 * z;
        const mass = faceNoise(azW, yb, 0.0035, 0.007, 11.3, 4.2, 3), mass2 = faceNoise(azW, yb, 0.008, 0.012, 31, 17, 3);
        tmp2.copy(cSlate).lerp(cRust, smoothstep(0.0, 0.3, mass)).lerp(cBasalt, smoothstep(0.12, 0.4, -mass) * 0.85).lerp(cLichen, smoothstep(0.2, 0.55, mass2) * 0.4);
        tmp2.lerp(cHard, hardArr[i] * 0.85).multiplyScalar(1 - 0.45 * stepArr[i]);
        tmp2.lerp(cDamp, Math.min(1, wWater * 1.2) * 0.85).lerp(cLichen, wWater * smoothstep(0.2, 0.6, mass2 + 0.3) * 0.2);
        // (scree lies at the foot, on the aprons and the fans; the high shoulders' gentler ground is the rock masses'
        // own colour, frost-broken, not the aprons' pale: M4, the upper faces read pale and plain)
        const scree = (1 - smoothstep(0.62, 0.86, sW - 0.12 * wMouth)) * (1 - smoothstep(70, 140, y) * (1 - wMouth));
        tmp2.lerp(cScreeL, scree).lerp(cFan, scree * Math.min(1, wMouth * 1.5) * 0.8);
        tmp.lerp(tmp2, mm);
        const rf = mm * clamp(rockMix, 0, 1);
        rockArr[i * 3] = rf * (1 - scree); rockArr[i * 3 + 1] = rf * scree;
      }
    }
    // --- the massifs' bands (end)
    col.lerp(tmp, rockMix);
    // ice lies on the glacier floor, not plastered up the notch's cliff walls
    const ice = glacierFloorIce(b.ice, b.slope, x, z); // v4 regions: ice holds on the snout's face too
    col.lerp(cIce, ice);
    iceArr[i] = ice;
    if (ice > 0) { rockArr[i * 3] *= 1 - ice; rockArr[i * 3 + 1] *= 1 - ice; }
    if (ice > 0) { glacierCoords(x, z, gc); glacArr[i * 3] = gc[0]; glacArr[i * 3 + 1] = gc[1]; glacArr[i * 3 + 2] = gc[2]; }
    // the river: shingle banks and bed, pale stones in the pool, a wet band along the water and spray-soaked
    // rock round the fall
    {
      let wet = 0;
      if (r.cut < Infinity || r.gully) {
        const prp = Math.hypot(x - POOL.x, z - POOL.z);
        const lvl = r.gully ? GULLY_BED(r.gs) + 0.25 : prp < 8 ? POOL.y : r.W;
        const above = y - lvl;
        const near = r.gully ? 1 : prp < 9 ? 1 : 1 - smoothstep(r.bank + 1, r.bank + 4, Math.abs(r.d));
        wet = (1 - smoothstep(0.05, 1.3 + SX.noise2(x * 0.3, z * 0.3) * 0.5, above)) * near;
        const sh = r.shingle * (1 - smoothstep(0.6, 0.95, b.slope));
        col.lerp(cShingle, sh * 0.85);
        col.lerp(cSilt, r.slow * 0.5);
        if (prp < POOL_R + 0.6) col.lerp(cPale, (1 - smoothstep(POOL_R - 1.5, POOL_R + 0.6, prp)) * (0.6 + 0.4 * SX.noise2(x * 1.3, z * 1.3)));
      }
      // spray from the fall soaks the cirque walls
      const spray = 1 - smoothstep(5, 19, Math.hypot(x - IMPACT.x, z - IMPACT.z, (y - POOL.y) * 0.5));
      wetArr[i] = Math.max(wet, spray);
    }
    // causeway paving colour
    const cd = causewayDistance(x, z);
    col.lerp(cRoad, 1 - smoothstep(2.6, 4.2, cd));
    regionsGround(col, x, z, b); // v4 systems: the regions' ground hooks (and the ?regions=1 tint)
    if (!REGIONS_DEBUG) placesGround(col, x, z, cd); // v8-02
    // a little per-vertex variation so the moor isn't flat
    const v = SX.noise2(x * 0.11, z * 0.11) * 0.06 * (1 - 0.85 * mmW); // (on the wall the shader's grain does this)
    col.r = clamp(col.r + v, 0, 1); col.g = clamp(col.g + v, 0, 1); col.b = clamp(col.b + v, 0, 1);
    colors[i * 3] = col.r; colors[i * 3 + 1] = col.g; colors[i * 3 + 2] = col.b;
  }
  setRegionsCoarse(0);
  // Crevices and ridges on the mountains: grid curvature darkens gullies and lifts crests, so the wall
  // reads as folded rock from a distance instead of a smooth dune.
  {
    const n = segs + 1, cell = size / segs;
    for (let j = 1; j < segs; j++) for (let i = 1; i < segs; i++) {
      const k = j * n + i;
      const x = pos.getX(k), z = pos.getZ(k);
      const r = Math.hypot(x, z);
      const m = smoothstep(WORLD.regionRadius - 20, WORLD.regionRadius + 40, r) * (1 - iceArr[k]);
      if (m <= 0) continue;
      const lap = (pos.getY(k - 1) + pos.getY(k + 1) + pos.getY(k - n) + pos.getY(k + n) - 4 * pos.getY(k)) / (cell * cell);
      // lap > 0: concave (gully), < 0: convex (crest)
      const crev = clamp(lap * 1.6, -0.6, 1);
      let f = crev > 0 ? 1 - 0.72 * crev * m : 1 - crev * 0.45 * m;
      // the massifs' wall (v11): the one-cell curvature outlined every crease the mesh holds (it drew the old ledges
      // as ruled lines); on the wall the curvature is read over ~4 cells, so it shades gullies and ribs, gently
      const mw = MASSIF_BANDS ? smoothstep(M_START + 10, M_START + 40, r) : 0;
      if (mw > 0 && j > 5 && i > 5 && j < segs - 5 && i < segs - 5) {
        const lap2 = (pos.getY(k - 2) + pos.getY(k + 2) + pos.getY(k - 2 * n) + pos.getY(k + 2 * n) - 4 * pos.getY(k)) / (4 * cell * cell);
        const c2 = clamp(lap2 * 2.2, -0.6, 1);
        // and over ~12 m, the couloirs dark and the ribs between them light: the cold side's light is mostly the
        // sky's, which the normals barely vary, so the drainage has to show in the colour
        const lap6 = (pos.getY(k - 6) + pos.getY(k + 6) + pos.getY(k - 6 * n) + pos.getY(k + 6 * n) - 4 * pos.getY(k)) / (36 * cell * cell);
        const c6 = clamp(lap6 * 8, -0.8, 1);
        rockArr[k * 3 + 2] = clamp(-(lap6 * 8 + lap2 * 1.5), -1, 1);
        const fw = (c2 > 0 ? 1 - 0.3 * c2 : 1 - c2 * 0.25) * (c6 > 0 ? 1 - 0.5 * c6 : 1 - c6 * 0.5);
        f = lerp(f, 1 - (1 - fw) * m, mw);
      }
      colors[k * 3] *= f; colors[k * 3 + 1] *= f; colors[k * 3 + 2] *= f;
    }
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('aIce', new THREE.BufferAttribute(iceArr, 1));
  geo.setAttribute('aWet', new THREE.BufferAttribute(wetArr, 1));
  geo.setAttribute('aWall', new THREE.BufferAttribute(wallArr, 1));
  geo.setAttribute('aRock', new THREE.BufferAttribute(rockArr, 3));
  geo.setAttribute('aGlac', new THREE.BufferAttribute(glacArr, 3));
  geo.computeVertexNormals();
  geo.computeBoundingSphere();

  const detail = makeDetailTexture();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0.0 });
  // one set of uniform objects, shared by every program built from this material (the ground skins compile it again,
  // v4/regions/skin.js), so a toggle through userData.shader.uniforms reaches them all
  const uniforms = {
    uDetail: { value: detail },
    uBumpFar: { value: BANDS ? 60 : 1e9 },
    uFineBand: { value: new THREE.Vector2(BANDS ? 90 : 1e9, BANDS ? 120 : 2e9) },
    uFineMean: { value: new THREE.Vector3(...detail.userData.mean) },
  };
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    mat.userData.shader = shader; // the bands' uniforms, for A/B timing from the console
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aIce; attribute float aWet; attribute float aWall; attribute vec3 aRock; attribute vec3 aGlac; varying vec3 vTPos; varying vec3 vTNormal; varying float vIce; varying float vWet; varying float vWallW; varying vec3 vRock; varying vec3 vGlac;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvTPos = (modelMatrix * vec4(position,1.0)).xyz; vTNormal = normalize(mat3(modelMatrix) * normal); vIce = aIce; vWet = aWet; vWallW = aWall; vRock = aRock; vGlac = aGlac;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform sampler2D uDetail; uniform float uBumpFar; uniform vec2 uFineBand; uniform vec3 uFineMean; varying vec3 vTPos; varying vec3 vTNormal; varying float vIce; varying float vWet; varying float vWallW; varying vec3 vRock; varying vec3 vGlac;
        ${GLACIER_GLSL}
        vec3 triplanar(sampler2D t, vec3 p, vec3 n, float s) {
          vec3 w = abs(n); w = pow(w, vec3(4.0)); w /= (w.x + w.y + w.z);
          return texture2D(t, p.yz * s).rgb * w.x + texture2D(t, p.xz * s).rgb * w.y + texture2D(t, p.xy * s).rgb * w.z;
        }
        ${massifGLSL()}
        float fpHeight(vec3 p, vec3 n) {
          vec3 a = triplanar(uDetail, p, n, 0.3);
          vec3 b = triplanar(uDetail, p, n, 1.6);
          return a.r * 0.3 + b.g * 0.6 + a.b * 0.2;
        }
        // Perturb the world-space normal from the detail height so grazing light picks out the ground
        vec3 fpBumpWorld(vec3 p, vec3 n, float strength) {
          float e = 0.12;
          float h0 = fpHeight(p, n);
          vec3 g = vec3(fpHeight(p + vec3(e, 0.0, 0.0), n) - h0, fpHeight(p + vec3(0.0, e, 0.0), n) - h0, fpHeight(p + vec3(0.0, 0.0, e), n) - h0) / e;
          g -= n * dot(g, n);
          return normalize(n - g * strength);
        }
        // the wall's chart (v11): arc round the bowl and height, so a pattern lies on the faces as on a cylinder and
        // can run down the fall line (the triplanar's two side projections cross on a face turned 45° to the axes and
        // draw herringbone). K whole tiles go round the circle, so the seam at atan's wrap is invisible; the
        // gradients come from the position's own derivatives (dp, at the top of main), so the wrap has no mip line.
        vec4 fpWallTex(vec3 p, float K, float sy, vec3 dpx, vec3 dpy) {
          float r2 = max(dot(p.xz, p.xz), 1.0), k = K * 0.15915494;
          vec2 uv = vec2(atan(p.z, p.x) * k, p.y * sy);
          vec2 gx = vec2((p.x * dpx.z - p.z * dpx.x) / r2 * k, dpx.y * sy), gy = vec2((p.x * dpy.z - p.z * dpy.x) / r2 * k, dpy.y * sy);
          return textureGrad(uDetail, uv, gx, gy);
        }
        // the slope in world space of one of the wall's relief maps, as a height in metres (v11-F1). The slope is a difference
        // in the chart a footprint wide (the texel at least), read through the same mips, so it is the slope of what
        // the pixel shows: band-limited by construction, with nothing the screen-space dFdx of a magnified 8-bit
        // texture gave (the bilinear filter's sub-texel stairs, the 2x2 quads), which drew moire rings round every
        // swell of the apron and blocks on the face from close by. One map: K tiles round the circle, sy up; its
        // channel (sel) is shaped by smoothstep(a, b) when a >= 0, else taken as it is, then scaled by amp.
        vec3 fpWallSlope(vec3 p, float K, float sy, vec3 dpx, vec3 dpy, vec4 c0, vec4 sel, float a, float b, float amp) {
          float r2 = max(dot(p.xz, p.xz), 1.0), k = K * 0.15915494;
          vec2 uv = vec2(atan(p.z, p.x) * k, p.y * sy);
          vec2 gx = vec2((p.x * dpx.z - p.z * dpx.x) / r2 * k, dpx.y * sy), gy = vec2((p.x * dpy.z - p.z * dpy.x) / r2 * k, dpy.y * sy);
          float eu = max(1.0 / 256.0, max(abs(gx.x), abs(gy.x))), ev = max(1.0 / 256.0, max(abs(gx.y), abs(gy.y)));
          float h0 = dot(c0, sel), hu = dot(textureGrad(uDetail, uv + vec2(eu, 0.0), gx, gy), sel);
          float hv = dot(textureGrad(uDetail, uv + vec2(0.0, ev), gx, gy), sel);
          if (a >= 0.0) { h0 = smoothstep(a, b, h0); hu = smoothstep(a, b, hu); hv = smoothstep(a, b, hv); }
          // d(uv)/d(world): u = atan(z, x) k, v = y sy
          return amp * ((hu - h0) / eu * vec3(-p.z, 0.0, p.x) * (k / r2) + (hv - h0) / ev * vec3(0.0, sy, 0.0));
        }
        ${CLOSE_ROCK_GLSL}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 fpDpx = dFdx(vTPos), fpDpy = dFdy(vTPos); // the wall chart's gradients, outside any branch
        float fpCav = 0.5, fpHW = 0.0; vec3 fpHG = vec3(0.0);
        #ifdef FP_MASSIFS
        {
          // the wall's relief finer than its 2-3 m mesh (v11): blocks of ~10 m, smaller ones, and flutes down the fall
          // line, as a height in metres (bumped below by its slope from fpWallSlope, so it holds at 400 m and the mips
          // quiet it beyond) and as a cavity term (the hollows between the blocks darker). The reads have explicit
          // gradients, so the branch on wm is safe.
          float rW0 = length(vTPos.xz);
          float wm = smoothstep(290.0, 330.0, rW0) * smoothstep(0.82, 0.5, vTNormal.y) * (1.0 - vIce);
          vec4 tBlk = fpWallTex(vTPos, 60.0, 0.03, fpDpx, fpDpy), tSml = fpWallTex(vTPos, 128.0, 0.05, fpDpx, fpDpy);
          vec4 tFlu = fpWallTex(vTPos, 84.0, 0.006, fpDpx, fpDpy);
          float blk = tBlk.r, sml = tSml.g, flu = tFlu.b;
          fpCav = blk * 0.6 + sml * 0.25 + flu * 0.15;
          fpHW = wm; // the bump's weight: where it is 0 the normal is left alone
          if (wm > 0.0) { // explicit gradients, so the branch is safe
            // (v11.1) the blocks' height is shaped by a smoothstep that reads as blocks from afar; within ~150 m its
            // steep shoulders, magnified, turned 30 m of face into hard-edged light and dark terraces (camouflage), so
            // close to, the shaping widens to a gentle swell and the close rock below carries the blocks
            float fpFarW = smoothstep(60.0, 180.0, length(vTPos - cameraPosition));
            fpHG = wm * (fpWallSlope(vTPos, 60.0, 0.03, fpDpx, fpDpy, tBlk, vec4(1.0, 0.0, 0.0, 0.0), mix(0.1, 0.35, fpFarW), mix(0.9, 0.65, fpFarW), 1.8)
                       + fpWallSlope(vTPos, 128.0, 0.05, fpDpx, fpDpy, tSml, vec4(0.0, 1.0, 0.0, 0.0), -1.0, 0.0, 0.6)
                       + fpWallSlope(vTPos, 84.0, 0.006, fpDpx, fpDpy, tFlu, vec4(0.0, 0.0, 1.0, 0.0), -1.0, 0.0, 0.5));
          }
          // the wall close up (v11.1): joints, blocks, beds, lichen and scree under ~200 m (CLOSE_ROCK_GLSL)
          float fpNearW = (1.0 - smoothstep(170.0, 250.0, length(vTPos - cameraPosition))) * (1.0 - vIce);
          if (fpNearW * (vRock.x + vRock.y) > 0.002) {
            // metres a pixel: half the larger way, or the mean of the two if more (a grazing view is filtered along its
            // length, but not so hard that the ground at 30 m goes plain)
            float fpL1 = length(fpDpx), fpL2 = length(fpDpy), fpFoot = max(0.5 * max(fpL1, fpL2), sqrt(fpL1 * fpL2));
            vec3 g = vec3(0.0);
            vec4 gT = fpWallTex(vTPos, 640.0, 0.18, fpDpx, fpDpy); // fine grain (3.5 m tiles): the lichen's ragged edge, the gravel
            vec4 cl = fpCloseRock(vTPos, normalize(vTNormal), fpFoot, vRock.xy * fpNearW, vec2(gT.b, sml), 1.0 - smoothstep(0.1, 0.4, vWallW), g);
            float gl = length(g); if (gl > 0.35) g *= 0.35 / gl; // the close relief never tilts the face more than ~19 degrees
            diffuseColor.rgb *= cl.x;
            diffuseColor.rgb *= mix(vec3(1.0), mix(FP_LICHEN, FP_LICHEN_RUST, cl.w), cl.y); // lichen tints the rock it crusts
            fpHG += g; fpHW = max(fpHW, cl.z);
          }
        }
        #endif
        {
          vec3 d1 = triplanar(uDetail, vTPos, vTNormal, 0.35);
          vec3 d2 = triplanar(uDetail, vTPos, vTNormal, 0.045);
          vec3 d3 = uFineMean;
          float fineW = 1.0 - smoothstep(uFineBand.x, uFineBand.y, length(vTPos - cameraPosition));
          if (fineW > 0.0) d3 = mix(uFineMean, triplanar(uDetail, vTPos, vTNormal, 2.1), fineW);
          float grain = (d1.r - 0.5) * 0.55 + (d2.g - 0.5) * 0.4 + (d3.b - 0.4) * 0.25;
          // bare earth patches where the detail noise is low on flat ground
          float bare = smoothstep(0.62, 0.78, d2.r) * smoothstep(0.6, 0.9, vTNormal.y);
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.7, 0.64, 0.56), bare * 0.6);
          // rock faces get stratified streaks
          float rocky = smoothstep(0.75, 0.45, vTNormal.y);
          // strata bands alias into streaks at distance, so fade them out past 80 m
          float strataFade = 1.0 - smoothstep(60.0, 160.0, length(vTPos - cameraPosition));
          // sheer faces (cliffs, canyon walls) show their bedding harder
          float sheer = smoothstep(0.5, 0.15, vTNormal.y);
          float strata = (sin(vTPos.y * 1.7 + d2.r * 4.0) * 0.5 + 0.5) * (0.12 + 0.2 * sheer) * rocky * strataFade
                       + smoothstep(0.42, 0.5, abs(fract(vTPos.y * 0.55 + d1.g * 0.8) - 0.5)) * 0.25 * sheer * strataFade;
          float mtn = smoothstep(280.0, 340.0, length(vTPos.xz)) * (1.0 - vIce);
          #ifdef FP_MASSIFS
          strata *= 1.0 - mtn; // the massifs' wall has its own bedding below, not level lines
          if (mtn > 0.0) { // and its grain in its own chart, not the triplanar's herringbone, on the steep rock
            float gw = mtn * smoothstep(0.85, 0.6, vTNormal.y);
            float gA = fpWallTex(vTPos, 236.0, 0.083, fpDpx, fpDpy).r, gB = fpWallTex(vTPos, 72.0, 0.025, fpDpx, fpDpy).g;
            grain = mix(grain, (gA - 0.5) * 0.4 + (gB - 0.5) * 0.35, gw);
          }
          #endif
          diffuseColor.rgb *= 1.0 + grain - strata;
          #ifndef FP_MASSIFS
          // far strata: broad bedding planes on the mountain walls, anti-aliased by their own screen
          // derivative so they fade instead of shimmering, plus darker bands of harder rock
          float sy = vTPos.y * 0.14 + d2.r * 2.5 + vTPos.x * 0.01;
          float aa = clamp(fwidth(sy) * 1.5, 0.0, 1.0);
          float bed = (smoothstep(0.35, 0.5, abs(fract(sy) - 0.5)) - 0.5) * (1.0 - aa);
          float hard = smoothstep(0.55, 0.75, sin(vTPos.y * 0.035 + d2.g * 3.0) * 0.5 + 0.5);
          #endif
          #ifdef FP_MASSIFS
          // --- the massifs' bands (begin), v11: nothing on the wall is ruled. The bedding is lenses of rock stretched
          // along each massif's tilted plane (MASSIFS in v4/mountains.js) and broken by their own noise, faint; streaks
          // of water-stain and salt run down the fall line, darker in the couloirs (vWallW, the heightfield's drainage);
          // snow lies on the flats and in the high couloirs, thinner where the low sun reaches
          float snow = 0.0;
          if (mtn > 0.0) { // the floor (mtn 0 inside r 280) pays nothing for the wall
            vec2 mb = fpMassifBed(vTPos.xz);
            vec3 pb = vec3(vTPos.x, vTPos.y + dot(vTPos.xz, mb.xy), vTPos.z); // up the bedding, not the level
            vec3 pbx = vec3(fpDpx.x, fpDpx.y + dot(fpDpx.xz, mb.xy), fpDpx.z), pby = vec3(fpDpy.x, fpDpy.y + dot(fpDpy.xz, mb.xy), fpDpy.z);
            float lens = fpWallTex(pb, 10.0, 0.02, pbx, pby).r - 0.5;
            float stk = fpWallTex(vTPos, 56.0, 0.003, fpDpx, fpDpy).r;
            // bare rock, not the aprons; high up (M4) the shoulders' gentler ground carries the rock's lenses and cavities too
            float rockW = mtn * max(smoothstep(0.78, 0.5, vTNormal.y), smoothstep(110.0, 180.0, vTPos.y) * smoothstep(0.95, 0.7, vTNormal.y) * 0.8);
            float streak = smoothstep(0.5, 0.78, stk);
            float salt = smoothstep(0.32, 0.18, stk) * (1.0 - vWallW);
            // the streaks gather where water runs and fade on the dry ribs, so they do not hang evenly like a curtain
            float wetS = 0.35 + 0.65 * smoothstep(0.0, 0.5, vWallW + lens);
            diffuseColor.rgb *= 1.0 + rockW * (lens * 0.25 - streak * wetS * (0.05 + 0.22 * vWallW) + salt * 0.08 + (fpCav - 0.5) * 0.7);
            // (v11.1) toward the sun (the southern and western massifs seen from the bowl) the faces have the sky's light
            // and the sun's at a graze, and the warm haze laid over them buried their values: there, seen from afar,
            // the dry rock between the couloirs is paler and the couloirs darker, so the erosion shows through the
            // glare. A face the sun strikes full is left alone (it would blow out); the cold side is as it was.
            vec3 fpV = vTPos - cameraPosition; float fpVl = length(fpV.xz);
            float fpVs = dot(fpV.xz / max(fpVl, 1e-3), FP_SUN_XZ); // (close round the disc the ranges stay soft silhouettes)
            float shadeS = rockW * smoothstep(-0.1, 0.6, fpVs) * (1.0 - 0.6 * smoothstep(0.88, 0.98, fpVs)) * smoothstep(150.0, 300.0, fpVl)
                         * (1.0 - smoothstep(0.35, 0.65, dot(normalize(vTNormal), vec3(FP_SUN_XZ.x * 0.972, 0.233, FP_SUN_XZ.y * 0.972))));
            // the ribs from the mesh's convexity over ~12 m (the bake's vRock.z), broken by the rock's masses
            float fpRib = smoothstep(0.05, 0.4, vRock.z + (fpCav - 0.5) * 0.8 + lens * 0.4) * (1.0 - smoothstep(0.15, 0.6, vWallW));
            float fpGut = max(smoothstep(0.0, -0.45, vRock.z), min(1.0, vWallW * 1.5));
            diffuseColor.rgb = mix(diffuseColor.rgb, max(diffuseColor.rgb, vec3(0.34, 0.29, 0.235)), shadeS * fpRib) * (1.0 - shadeS * fpGut * 0.75);
            float hi = smoothstep(150.0, 245.0, vTPos.y + (d2.r - 0.5) * 40.0);
            float flt = smoothstep(0.58, 0.82, vTNormal.y);
            float lee = 1.0 - 0.45 * smoothstep(0.0, 0.6, dot(normalize(vTNormal.xz + 1e-4), FP_SUN_XZ));
            snow = mtn * hi * clamp(flt * lee + vWallW * smoothstep(0.3, 0.55, vTNormal.y) * 0.8, 0.0, 1.0) * smoothstep(0.22, 0.42, d1.g + 0.25 * hi);
          }
          // --- the massifs' bands (end)
          #else
          diffuseColor.rgb *= 1.0 - mtn * (bed * 0.4 + hard * 0.4 * rocky);
          // snow and rime on the high ground, holding on ledges and shadowed north-facing faces
          float snowH = smoothstep(90.0, 160.0, vTPos.y + (d2.r - 0.5) * 50.0);
          float holds = smoothstep(0.42, 0.7, vTNormal.y + max(-vTNormal.z, 0.0) * 0.35);
          float snow = snowH * holds * mtn * smoothstep(0.35, 0.55, d1.g + 0.2 * snowH);
          #endif
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.58, 0.6, 0.68) * (0.85 + 0.15 * d3.b), snow * 0.85);
          // dampness darkens low ground
          float wet = max(smoothstep(-1.0, -3.2, vTPos.y), vWet * (0.75 + 0.5 * d1.g));
          diffuseColor.rgb *= 1.0 - clamp(wet, 0.0, 1.0) * 0.38;
          // glacier ice (v4 regions: src/v4/glacier.js): flow lines, crevasses that follow the slope, the snout's face
          diffuseColor.rgb = fpGlacier(diffuseColor.rgb, vTPos, normalize(vTNormal), vIce * 0.92, vGlac, d1, d2);
        }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.6, smoothstep(-1.0, -3.2, vTPos.y));
        roughnessFactor = mix(roughnessFactor, 0.38, clamp(vWet, 0.0, 1.0));
        roughnessFactor = mix(roughnessFactor, 0.7, vIce); // v4 regions: glacier ice, not a mirror for the violet sky`)
      .replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
        {
          float camD = length(vTPos - cameraPosition);
          float bumpStrength = 0.07 * (1.0 - smoothstep(10.0, 60.0, camD));
          vec3 nW = normalize(vTNormal);
          if (camD < uBumpFar) nW = fpBumpWorld(vTPos, nW, bumpStrength);
          #ifdef FP_MASSIFS
          if (fpHW > 0.0) nW = normalize(nW - (fpHG - nW * dot(fpHG, nW))); // the wall's bump: its height's slope along the surface (above)
          #endif
          normal = normalize(mat3(viewMatrix) * nW);
        }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += vec3(0.02, 0.04, 0.07) * vIce;`);
    injectAnnals(shader); // v5 wonders: AK the Annals round the wall, 110-130 m up (src/v5/annals.js)
    injectOccultation(shader); // v5 wonders: AR the Occultation's shadow across the walls (src/v5/occultation.js)
  };
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  mesh.name = 'terrain';
  scene.add(mesh);

  return {
    mesh, heightAt, normalAt, slopeAt, biomeAt, waterLevelAt, waterDepthAt, isUnderwater, causewayDistance, glacierMask,
    riverAt, river: RIVER,
    size, regionRadius: WORLD.regionRadius,
  };
}
