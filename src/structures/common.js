// Shared helpers for the ruins: stone colours, rubble, collider chains, banners, the hex paving grid.
import * as THREE from 'three';
import { mat } from './geo.js';

// Stone tints (linear). Built from the shared palette so the ruins agree with the terrain's rock.
export function stoneTints(palette) {
  const c = (h) => new THREE.Color(h);
  return {
    stone: c(palette.stone),
    old: c(palette.stoneOld),
    dark: c(palette.rockDark),
    rock: c(palette.rock),
    scree: c(palette.scree),
    slate: c('#33353a'),
    wood: c('#2a1d15'),
    woodGrey: c('#3d3530'),
    iron: c('#1c1714'),
    black: c('#050404'),
    carve: c('#1a1512'),
  };
}

// A tint varied a little per part: brightness and a nudge warm or cold.
export function vary(base, rng, amt = 0.14, out = new THREE.Color()) {
  const k = 1 + (rng() - 0.5) * 2 * amt;
  const w = (rng() - 0.5) * amt * 0.5;
  return out.setRGB(base.r * k * (1 + w), base.g * k, base.b * k * (1 - w));
}

// A heap of fallen stone: rough rocks and a few dressed blocks, mounded toward the middle.
export function rubblePile(B, env, x, z, r, n, o = {}) {
  const { rng, ground, tints } = env;
  const height = o.height ?? r * 0.35;
  const sizeMax = o.size ?? 0.75;
  const tint = o.tint || tints.stone;
  const dirX = o.dirX || 0, dirZ = o.dirZ || 0; // bias the spill one way
  for (let i = 0; i < n; i++) {
    const a = rng() * Math.PI * 2, d = Math.sqrt(rng()) * r;
    let px = x + Math.cos(a) * d + dirX * d * 0.6, pz = z + Math.sin(a) * d + dirZ * d * 0.6;
    const t = 1 - d / r;
    const s = (0.18 + rng() * sizeMax) * (0.55 + 0.6 * t);
    const gy = ground.groundAt(px, pz);
    const y = gy + height * t * t * (0.6 + 0.4 * rng()) + s * 0.15;
    const col = vary(tint, rng, 0.2);
    if (rng() < (o.blocks ?? 0.35)) {
      const g = B.box(s * 1.5, s * 0.9, s * 1.1, { chip: s * 0.12, seed: i });
      B.add(g, mat(px, y, pz, (rng() - 0.5) * 0.9, rng() * 6.28, (rng() - 0.5) * 0.9), { color: col, moss: 0.8, ground: gy, disp: s * 0.05, dispScale: 2.2 });
    } else {
      const g = B.rock(s, s > 0.45 ? 1 : 0, 1 + rng() * 0.4, 0.55 + rng() * 0.3, 1 + rng() * 0.3);
      B.add(g, mat(px, y, pz, rng() * 3, rng() * 6.28, rng() * 3), { color: col, moss: 0.9, ground: gy, disp: s * 0.12, dispScale: 1.8 / Math.max(0.3, s), flat: true });
    }
  }
}

// Colliders every `step` metres from a to b, skipping where skip(t, x, z) says so.
export function colliderChain(ctx, ax, az, bx, bz, r, step = 1.5, skip = null, cap = null) {
  const L = Math.hypot(bx - ax, bz - az);
  const n = Math.max(1, Math.round(L / step));
  let count = 0;
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
    if (skip && skip(t * L, x, z)) continue;
    ctx.addCollider(cap ? { x, z, r, y: cap.y, h: cap.h } : { x, z, r });
    count++;
  }
  return count;
}

// Banners: collected as specs, merged into one mesh. hoist: the top of the pole edge (Vector3).
export class BannerSet {
  constructor() { this.P = []; this.N = []; this.B = []; this.A = []; this.I = []; this.count = 0; }
  add(hoist, along, length, height, phase, style, segU = 18, segV = 10) {
    const A = along.clone().setY(0).normalize();
    const S = new THREE.Vector3().crossVectors(A, new THREE.Vector3(0, 1, 0)).normalize();
    const base = this.count;
    for (let j = 0; j <= segV; j++) {
      const v = j / segV;
      for (let i = 0; i <= segU; i++) {
        const u = i / segU;
        this.P.push(hoist.x + A.x * u * length, hoist.y - height + v * height, hoist.z + A.z * u * length);
        this.N.push(S.x, S.y, S.z);
        this.B.push(u, v, phase, style);
        this.A.push(A.x, A.y, A.z);
      }
    }
    const row = segU + 1;
    for (let j = 0; j < segV; j++) for (let i = 0; i < segU; i++) {
      const a = base + j * row + i, b = a + 1, c = a + row, d = c + 1;
      // wound so the face normal is +S (A × up)
      this.I.push(a, c, b, b, c, d);
    }
    this.count += row * (segV + 1);
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.P), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(this.N), 3));
    g.setAttribute('aBan', new THREE.BufferAttribute(new Float32Array(this.B), 4));
    g.setAttribute('aAlong', new THREE.BufferAttribute(new Float32Array(this.A), 3));
    g.setIndex(this.I);
    g.computeBoundingSphere();
    g.boundingSphere.radius += 2; // room for the ripple
    return g;
  }
}

// The hex grid every paving stone in the region is laid on (vertex toward ±z, flat sides to ±x).
export const HEX_R = 0.66;
const HX = Math.sqrt(3) * HEX_R, HZ = 1.5 * HEX_R;
export function hexCellsIn(x0, z0, x1, z1, fn) {
  const j0 = Math.floor(z0 / HZ) - 1, j1 = Math.ceil(z1 / HZ) + 1;
  for (let j = j0; j <= j1; j++) {
    const off = (j & 1) ? HX / 2 : 0;
    const i0 = Math.floor((x0 - off) / HX) - 1, i1 = Math.ceil((x1 - off) / HX) + 1;
    for (let i = i0; i <= i1; i++) fn(i * HX + off, j * HZ, i, j);
  }
}

// A deterministic spot on open ground: off the water, the causeway, steep slopes and the landmarks.
// Place a feature at its own landmark's coordinates if the ground there is fit (slope under
// o.slope, not in water), else fall back to a findSpot search with the landmark allowed.
export function pinSpot(env, L, size, o = {}) {
  const T = env.ctx.terrain;
  const taken = env.taken || (env.taken = []);
  if (L && T.slopeAt(L.x, L.z) <= (o.slope ?? 0.8) && T.heightAt(L.x, L.z) >= -2.2) {
    taken.push([L.x, L.z, size]);
    return { x: L.x, z: L.z };
  }
  return findSpot(env, o);
}

export function findSpot(env, o = {}) {
  const { ctx, rng } = env;
  const T = ctx.terrain;
  const rMax = o.rMax ?? 265, rMin = o.rMin ?? 0;
  const slopeMax = o.slope ?? 0.8, cwMin = o.causeway ?? 7, lmPad = o.landmarkPad ?? 8;
  const taken = env.taken || (env.taken = []);
  for (let tries = 0; tries < 400; tries++) {
    let x, z;
    if (o.near) { const a = rng() * Math.PI * 2, d = (o.nearMin ?? 0) + rng() * (o.near.r - (o.nearMin ?? 0)); x = o.near.x + Math.cos(a) * d; z = o.near.z + Math.sin(a) * d; }
    else { const a = rng() * Math.PI * 2, d = rMin + Math.sqrt(rng()) * (rMax - rMin); x = Math.cos(a) * d; z = Math.sin(a) * d; }
    if (Math.hypot(x, z) > 285) continue;
    if (T.causewayDistance(x, z) < cwMin) continue;
    if (T.slopeAt(x, z) > slopeMax) continue;
    let bad = false;
    for (const w of Object.values(ctx.water)) if (Math.hypot(x - w.x, z - w.z) < w.r + (o.waterPad ?? 6)) { bad = true; break; }
    if (bad) continue;
    if (T.heightAt(x, z) < -2.2) continue; // low wet ground: the fen's and tarn's margins
    for (const [k, L] of Object.entries(ctx.landmarks)) {
      if (o.allow && o.allow.includes(k)) continue;
      const pad = k === 'wood' ? (o.inWood ? -1e9 : -30) : lmPad;
      if (Math.hypot(x - L.x, z - L.z) < L.r + pad) { bad = true; break; }
    }
    if (bad) continue;
    const sep = o.sep ?? 6;
    for (const t of taken) if (Math.hypot(x - t[0], z - t[1]) < sep + t[2]) { bad = true; break; }
    if (bad) continue;
    taken.push([x, z, o.size ?? 2]);
    return { x, z };
  }
  return null;
}
