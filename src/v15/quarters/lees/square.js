// The Lees' ground (v15-Q3): the square's floor, the gutter the light runs off in, the arch the old way comes in by,
// and the worn line of flags along the shops.
//
// The Heliarchs' processional way crossed this bench from the old way's head to the stair's foot: a band of
// hexagons. The vessel's foot came down on it (the hexagons round the bowl lie dished toward it, some split), a
// third of them have been robbed since and the holes made good in cobble; either side the Late folk laid whatever
// flags they had, and where they had none it is beaten earth. Everything here is written in the north run's
// (s, D) and laid on the ground as the terrain has it.
import * as THREE from 'three';
import { L, H, V, N, E, PARTS, rngOf, ch, worn, beam, plate } from '../../houses/kit.js';
import { mat } from '../../../structures/geo.js';
import { Soup } from './light.js';
import { ro, YS } from './fountain.js';

export const WAY = { a: [14.6, 28.7], b: [30.3, 22.15], half: 1.62 }; // the processional way, (s, D) on the north run
export const ARCH = { s: WAY.a[0], D: WAY.a[1] };                      // the Wanting Arch, at its head

export function ground(Q, F) {
  const { B, G, ctx, plan, low } = Q, T = ctx.terrain, rng = rngOf(1512, 11), N2 = ctx.noise.noise2, Y0 = plan.LEVEL.bench.y;
  // the Strake's own flags reach this far out and this far east: the plan's row (STRAKE) and the row's kerb as it was built
  const SK = plan.STRAKE, ROW_EDGE = SK.D0 + SK.depth + (ctx.village?.row?.frame?.edge ?? 2.6) + 0.01, ROW_END = SK.s1 + 0.5;
  const W = (s, D) => plan.at(1, s, D), gy = (x, z) => Math.max(Y0, T.heightAt(x, z));
  const P3 = (s, D, dy = 0) => { const [x, z] = W(s, D); return [x, gy(x, z) + dy, z]; };
  const dF = (s, D) => Math.hypot(s - F.s, D - F.D);
  const sound = (s, D) => { const [x, z] = W(s, D), h = T.heightAt(x, z); return h > Y0 - 0.07 && h < Y0 + 0.36 && plan.houseOut(x, z) > 1.3; };
  const inSq = (s, D) => {
    if (s < 7.4 || s > 36.4 || D > 30.3) return false;
    if (s < ROW_END ? D < ROW_EDGE : D < 16.0) return false;
    if (s > 28.6 && s < 33.4 && D < 21.95) return false; // the Heliarch stair's foot and its bastion
    return sound(s, D);
  };
  const wl = Math.hypot(WAY.b[0] - WAY.a[0], WAY.b[1] - WAY.a[1]), wd = [(WAY.b[0] - WAY.a[0]) / wl, (WAY.b[1] - WAY.a[1]) / wl], wp = [-wd[1], wd[0]];
  const uv = (s, D) => [(s - WAY.a[0]) * wd[0] + (D - WAY.a[1]) * wd[1], (s - WAY.a[0]) * wp[0] + (D - WAY.a[1]) * wp[1]];
  const inWay = (s, D, pad = 0) => { const [u, v] = uv(s, D); return u > -1.3 - pad && u < wl + 0.5 + pad && Math.abs(v) < WAY.half + pad; };

  // ---------------------------------------------------------------- the gutter's line: from the bowl's low lip to the bench's brink
  const nf = plan.frameOf(F.notch.x, F.notch.z), ks = (nf.s - F.s) / Math.hypot(nf.s - F.s, nf.D - F.D), kD = (nf.D - F.D) / Math.hypot(nf.s - F.s, nf.D - F.D);
  const g0 = [F.s + ks * (ro(0) + 0.06), F.D + kD * (ro(0) + 0.06)], gut = [g0, [g0[0] + 0.55, g0[1] + 0.3], [g0[0] + 1.5, g0[1] + 0.32], [g0[0] + 2.5, g0[1] + 0.12]];
  { let [s, D] = gut[3], n = 0; const ds = 0.99, dD = 0.14; while (n++ < 40 && T.heightAt(...W(s + ds * 0.3, D + dD * 0.3)) > Y0 - 0.25) { s += ds * 0.1; D += dD * 0.1; } gut.push([s, D], [s + ds * 0.62, D + dD * 0.62]); }
  const nearGut = (s, D, r) => { for (let i = 0; i < gut.length - 1; i++) { const [a, b] = [gut[i], gut[i + 1]], ex = b[0] - a[0], ez = b[1] - a[1], t = Math.max(0, Math.min(1, ((s - a[0]) * ex + (D - a[1]) * ez) / (ex * ex + ez * ez))); if (Math.hypot(s - a[0] - ex * t, D - a[1] - ez * t) < r) return true; } return false; };

  // ---------------------------------------------------------------- the bed everything is laid on: beaten earth
  const earth = new Soup(), sl = [], Dl = [16.0];
  for (let s = 7.4; s < ROW_END - 0.5; s += 1.05) sl.push(s); sl.push(ROW_END); for (let s = ROW_END + 0.99; s < 36.6; s += 0.99) sl.push(s);
  for (let D = 17; D < ROW_EDGE - 0.3; D += 1) Dl.push(D); Dl.push(ROW_EDGE); for (let D = ROW_EDGE + 0.98; D < 30.6; D += 0.98) Dl.push(D);
  const dirt = V.dirt.clone().multiplyScalar(0.6);
  for (let i = 0; i < sl.length - 1; i++) for (let j = 0; j < Dl.length - 1; j++) {
    const s0 = sl[i], s1 = sl[i + 1], D0 = Dl[j], D1 = Dl[j + 1];
    if (!inSq((s0 + s1) / 2, (D0 + D1) / 2)) continue;
    const c = [[s0, D0], [s1, D0], [s1, D1], [s0, D1]].map(([s, D]) => dirt.clone().multiplyScalar(0.85 + 0.3 * (0.5 + 0.5 * N2(s * 0.7, D * 0.7))));
    earth.quad(P3(s0, D0, 0.032), P3(s1, D0, 0.032), P3(s1, D1, 0.032), P3(s0, D1, 0.032), [0, 1, 0], c);
  }
  earth.flush(B, { color: dirt, moss: 0.12, wet: 0.2, ground: Y0 - 0.3 });

  // ---------------------------------------------------------------- cobbles, wherever a hole was made good
  const cob = new Soup(), cobC = [H.dark, V.flag, E.stone.clone().multiplyScalar(0.8), N.bone.clone().multiplyScalar(0.75), H.stone];
  const cobble = (s, D, r) => {
    if (!inSq(s, D) || nearGut(s, D, 0.2 + r) || dF(s, D) < ro(0) + 0.1 + r) return;
    const c = P3(s, D, 0.068 + rng() * 0.02), col = worn(cobC[Math.floor(rng() * cobC.length)], rng, 0.2, 0.25), a0 = rng() * 6, pts = [];
    for (let k = 0; k < 5; k++) { const a = a0 + (k / 5) * Math.PI * 2 + (rng() - 0.5) * 0.4, q = r * (0.85 + rng() * 0.3); pts.push(P3(s + Math.cos(a) * q, D + Math.sin(a) * q, 0.038)); }
    for (let k = 0; k < 5; k++) cob.tri(c, pts[k], pts[(k + 1) % 5], [0, 1, 0], [col, col.clone().multiplyScalar(0.7), col.clone().multiplyScalar(0.7)]);
  };
  const cr = low ? 0.125 : 0.098, cstep = cr * 1.95;
  const cobbleRect = (s0, s1, D0, D1) => { for (let s = s0 + cr; s < s1 - cr * 0.5; s += cstep) for (let D = D0 + cr; D < D1 - cr * 0.5; D += cstep) cobble(s + (rng() - 0.5) * cr * 0.5, D + (rng() - 0.5) * cr * 0.5, cr * (0.8 + rng() * 0.3)); };
  // a ring of them round the foot, packed in where the paving broke
  for (let r = ro(0) + 0.14 + cr; r < 2.2; r += cstep) { const n = Math.floor((Math.PI * 2 * r) / cstep); for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2 + r * 3; cobble(F.s + Math.cos(a) * r, F.D + Math.sin(a) * r, cr * (0.8 + rng() * 0.3)); } }

  // ---------------------------------------------------------------- the way's hexagons
  const hex = new Soup(), Rh = 0.31, du = Rh * 1.5, dv = Rh * Math.sqrt(3);
  for (let i = -3; i * du < wl + 0.6; i++) for (let j = -4; j <= 4; j++) {
    const u = i * du, v = j * dv + (i & 1 ? dv / 2 : 0); if (Math.abs(v) > WAY.half - 0.1) continue;
    const s = WAY.a[0] + u * wd[0] + v * wp[0], D = WAY.a[1] + u * wd[1] + v * wp[1], d = dF(s, D);
    if (!inSq(s, D) || d < 2.2 + Rh || nearGut(s, D, 0.2 + Rh)) continue;
    if (N2(s * 0.23 + 5, D * 0.23) > 0.28 || rng() < 0.04) { // robbed out
      if (N2(s * 0.5 + 11, D * 0.5) > -0.35) { cobble(s, D, cr); for (let k = 0; k < (low ? 3 : 6); k++) { const a = (k / (low ? 3 : 6)) * Math.PI * 2 + rng(); cobble(s + Math.cos(a) * Rh * 0.62, D + Math.sin(a) * Rh * 0.62, cr * (0.8 + rng() * 0.3)); } }
      continue;
    }
    const lift = 0.062 + rng() * 0.014, near = Math.max(0, 1 - (d - 2.2) / 1.9), half = near > 0.2 && rng() < 0.4, col = worn(rng() < 0.28 ? H.dark : H.stone, rng, 0.1 + near * 0.12, 0.14), pts = [];
    for (let k = 0; k < (half ? 4 : 6); k++) { const a = (k / 6) * Math.PI * 2 + (half ? Math.floor(rng() * 6) * 0 : 0), hu = u + Math.cos(a) * Rh * 0.955, hv = v + Math.sin(a) * Rh * 0.955, hs = WAY.a[0] + hu * wd[0] + hv * wp[0], hD = WAY.a[1] + hu * wd[1] + hv * wp[1];
      pts.push(P3(hs, hD, lift - 0.022 * Math.max(0, 1 - (dF(hs, hD) - 2.2) / 1.9) ** 2)); } // (dished toward the bowl: what came down on them)
    hex.slab(pts, 0.045, col, col.clone().multiplyScalar(0.55));
    if (half) for (let k = 0; k < 2; k++) cobble(s + (wd[0] * -0.02 + wp[0] * -0.16) + (rng() - 0.5) * 0.2, D + (wd[1] * -0.02 + wp[1] * -0.16) + (rng() - 0.5) * 0.1, cr * 0.9);
  }
  hex.flush(B, { color: H.stone, moss: 0.4, wet: 0.12, ground: Y0 - 0.2 });

  // ---------------------------------------------------------------- the Late folk's flags, either side
  const flags = new Soup();
  const rows = (sA, sB, DA, DB) => {
    for (let D0 = DA; D0 < DB - 0.3;) {
      const dep = Math.min(DB - D0, 0.52 + rng() * 0.26), D1 = D0 + dep;
      for (let s0 = sA - rng() * 0.4; s0 < sB;) {
        const w = 0.55 + rng() * 0.6, a = Math.max(sA, s0), b = Math.min(sB, s0 + w); s0 += w;
        if (b - a < 0.3) continue;
        const cs = (a + b) / 2, cD = (D0 + D1) / 2, cn = [[a, D0], [b, D0], [b, D1], [a, D1]];
        if (!cn.every(([s, D]) => inSq(s, D)) || inWay(cs, cD, 0.36) || cn.some(([s, D]) => dF(s, D) < 2.2) || nearGut(cs, cD, 0.5)) continue;
        const nz = N2(cs * 0.3 + 40, cD * 0.3 + 7);
        if (nz > 0.5 || rng() < Math.max(0.03, (cD - 27.6) / 4)) continue; // beaten earth
        if (nz < -0.52) { cobbleRect(a, b, D0, D1); continue; }
        const lift = 0.056 + rng() * 0.014, col = worn(rng() < 0.15 ? H.stone : V.flag, rng, 0.16, 0.2);
        flags.slab(cn.map(([s, D], k) => P3(s + (k === 0 || k === 3 ? 0.016 : -0.016), D + (k < 2 ? 0.016 : -0.016), lift + (rng() - 0.5) * 0.008)), 0.04, col, col.clone().multiplyScalar(0.55));
      }
      D0 = D1;
    }
  };
  rows(7.4, 36.4, ROW_EDGE, 30.3); rows(ROW_END, 36.4, 16.0, ROW_EDGE);
  flags.flush(B, { color: V.flag, moss: 0.45, wet: 0.1, ground: Y0 - 0.2 });
  cob.flush(B, { color: V.flag, moss: 0.5, wet: 0.25, ground: Y0 - 0.1 });

  // ---------------------------------------------------------------- the gutter: two lines of kerb and the light between them
  { const st = new Soup(), len = []; let tot = 0; for (let i = 0; i < gut.length - 1; i++) { len.push(tot); tot += Math.hypot(gut[i + 1][0] - gut[i][0], gut[i + 1][1] - gut[i][1]); } len.push(tot);
    const eAt = (t) => 0.3 * (1 - t) ** 1.3 + 0.08, perp = (i) => { const a = gut[Math.max(0, i - 1)], b = gut[Math.min(gut.length - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]); return [-(b[1] - a[1]) / l, (b[0] - a[0]) / l]; };
    const off = (i, k, dy) => { const p = perp(i); return P3(gut[i][0] + p[0] * k, gut[i][1] + p[1] * k, dy); };
    const brink = gut.length - 2, yEnd = P3(...gut[brink], 0)[1], flat = (i, k, dy) => { const q = off(i, k, dy); if (i > brink) q[1] = yEnd + dy; return q; }; // (the spout runs on level past the brink)
    for (let i = 0; i < gut.length - 1; i++) {
      const t0 = len[i] / tot, t1 = len[i + 1] / tot, bed = N.milk.clone().multiplyScalar(0.45);
      st.quad(flat(i, -0.075, 0.056), flat(i + 1, -0.075, 0.056), flat(i + 1, 0.075, 0.056), flat(i, 0.075, 0.056), [0, 1, 0], bed, [eAt(t0), eAt(t1), eAt(t1), eAt(t0)]);
      for (const sd of [-1, 1]) { const col = worn(H.dark, rng, 0.15, 0.15), a = flat(i, sd * 0.075, 0.095), b = flat(i + 1, sd * 0.075, 0.095), c = flat(i + 1, sd * 0.19, 0.09), d = flat(i, sd * 0.19, 0.09), dn = (p, k) => [p[0], p[1] - k, p[2]], pp = perp(i), o = [pp[0] * sd, pp[1] * sd], ow = [plan.RUN[1].dir[0] * o[0] + plan.RUN[1].n[0] * o[1], 0, plan.RUN[1].dir[1] * o[0] + plan.RUN[1].n[1] * o[1]];
        st.quad(a, b, c, d, [0, 1, 0], col); st.quad(a, b, dn(b, 0.06), dn(a, 0.06), [-ow[0], 0, -ow[2]], col.clone().multiplyScalar(0.6), [eAt(t0) * 0.5, eAt(t1) * 0.5, eAt(t1) * 0.5, eAt(t0) * 0.5]); st.quad(d, c, dn(c, 0.07), dn(d, 0.07), ow, col.clone().multiplyScalar(0.6)); }
      // its glow, lying over it
      for (const sd of [-1, 1]) G.quad(flat(i, 0, 0.12), flat(i + 1, 0, 0.12), flat(i + 1, sd * 0.42, 0.11), flat(i, sd * 0.42, 0.11), eAt(t0) * 0.16, eAt(t1) * 0.16, 0, 0);
    }
    st.flush(B, { color: H.dark, moss: 0.3, wet: 0.3, ground: Y0 - 0.2 });
    // the spout: a trough stone a forearm out over the drop
    const a = P3(...gut[brink], 0), bq = flat(brink + 1, 0, 0), yaw = Math.atan2(bq[0] - a[0], bq[2] - a[2]), mx = (a[0] + bq[0]) / 2, mz = (a[2] + bq[2]) / 2;
    B.add(B.box(0.44, 0.27, 1.1, { seg: 9, chip: 0.03, seed: 5 }), mat(mx - Math.sin(yaw) * 0.2, yEnd - 0.1, mz - Math.cos(yaw) * 0.2, 0, yaw, 0), { color: worn(H.stone, rng, 0.12), moss: 0.5, wet: 0.3, ground: Y0 - 0.3 });
    // the light, over the lip and down the bowl's side into the gutter; and off the spout's end, going out as it falls
    const lip = [F.notch.x, F.notch.y, F.notch.z], foot = P3(...gut[0], 0.05), mid = [(lip[0] * 0.35 + foot[0] * 0.65), Q.Y + 0.3, (lip[2] * 0.35 + foot[2] * 0.65)], top = [lip[0] + (F.x - lip[0]) * 0.12, Q.Y + YS + 0.005, lip[2] + (F.z - lip[2]) * 0.12];
    const tx = -(foot[2] - lip[2]), tz = foot[0] - lip[0], tl = Math.hypot(tx, tz) || 1, side = (p, k) => [p[0] + (tx / tl) * k, p[1], p[2] + (tz / tl) * k];
    for (const [p, q, k0, k1] of [[top, lip, 0.16, 0.26], [lip, mid, 0.26, 0.24], [mid, foot, 0.24, 0.2]]) for (const sd of [-1, 1]) G.quad(p, q, side(q, sd * 0.09), side(p, sd * 0.09), k0, k1, 0, 0);
    const end = flat(brink + 1, 0, 0.045), fall = low ? 1.5 : 1.9;
    for (const [ax, az] of [[Math.cos(yaw), -Math.sin(yaw)], [Math.sin(yaw), Math.cos(yaw)]]) {
      const w = 0.03, hw = 0.2, e = (k, y) => [end[0] + ax * k, end[1] - y, end[2] + az * k];
      for (const [y0, y1, k, ww] of [[0, 0.5, 0.26, w * 2.6], [0.62, 0.92, 0.15, w * 2.2], [1.06, 1.26, 0.08, w * 1.8], [1.4, 1.5, 0.04, w * 1.5]]) if (y1 <= fall) G.quad(e(-ww, y0), e(ww, y0), e(ww * 0.7, y1), e(-ww * 0.7, y1), k, k, k * 0.5, k * 0.5); // (it falls in lengths, each fainter: a pour going out, not a line on the wall)
      for (const sd of [-1, 1]) G.quad(e(0, 0), e(0, fall * 0.8), e(sd * hw, fall * 0.8), e(sd * hw, 0), 0.07, 0, 0, 0);
    }
    Q.places.push({ what: 'the spout: the light runs off here and goes out as it falls', x: end[0], y: end[1], z: end[2] });
  }

  // ---------------------------------------------------------------- the light lying on the square: a haze a hand deep, over the Strake's flags too
  { const radii = [ro(0.1) + 0.02, 2.4, 3.3, 4.6, 6.2, 8.4], ks = [0.07, 0.055, 0.036, 0.02, 0.009, 0], nt = low ? 20 : 30;
    for (const [dy, kk, nr] of low ? [[0.085, 1.25, 6]] : [[0.075, 1, 6], [0.19, 0.5, 4]]) {
      const v = (ir, it) => { const a = (it / nt) * Math.PI * 2, s = F.s + Math.cos(a) * radii[ir], D = F.D + Math.sin(a) * radii[ir], [x, z] = W(s, D), h = T.heightAt(x, z);
        let k = ks[ir] * kk * Math.max(0.2, 0.6 + 0.7 * N2(s * 0.55 + 3, D * 0.55 - 9));
        if (h < Y0 - 0.08 || ir === nr - 1) k = 0; k *= Math.max(0, Math.min(1, (D - 21.0) / 1.2));
        return [[x, Math.max(Y0, h) + 0.04 + dy, z], k]; };
      for (let ir = 0; ir < nr - 1; ir++) for (let it = 0; it < nt; it++) { const a = v(ir, it), b = v(ir + 1, it), c = v(ir + 1, it + 1), d = v(ir, it + 1); if (a[1] + b[1] + c[1] + d[1] > 0) G.quad(a[0], b[0], c[0], d[0], a[1], b[1], c[1], d[1]); }
    }
  }

  // ---------------------------------------------------------------- the worn line of flags along the shops (the lees-street, east of the square)
  { const line = new Soup(), lane = plan.LANES.find((l) => l.name === 'lees-street').pts, endS = plan.at(1, 36.6, 22);
    let started = false, carry = 0, k = 0;
    for (let i = 0; i < lane.length - 1; i++) {
      const [ax, az] = lane[i], [bx, bz] = lane[i + 1], l = Math.hypot(bx - ax, bz - az), dx = (bx - ax) / l, dz = (bz - az) / l;
      for (let t = carry; t < l; t += 0.8) {
        const x = ax + dx * t + (rng() - 0.5) * 0.25 * -dz, z = az + dz * t + (rng() - 0.5) * 0.25 * dx;
        if (!started) { if ((x - endS[0]) * dx + (z - endS[1]) * dz < 0.4) continue; started = true; }
        if (rng() < 0.1 || T.heightAt(x, z) < Y0 - 0.05 || T.heightAt(x, z) > Y0 + 0.3) continue;
        const hw = 0.3 + rng() * 0.08, hl = 0.27 + rng() * 0.1, tw = (rng() - 0.5) * 0.3, cx = Math.cos(tw), sx = Math.sin(tw), lift = 0.05 + (k++ % 2) * 0.014 + rng() * 0.006, col = worn(rng() < 0.2 ? H.stone : V.flag, rng, 0.18, 0.2);
        const pt = (u, v) => { const ux = u * cx - v * sx, vz = u * sx + v * cx, px = x + dx * ux - dz * vz, pz = z + dz * ux + dx * vz; return [px, gy(px, pz) + lift, pz]; };
        line.slab([pt(-hl, -hw), pt(hl, -hw), pt(hl, hw), pt(-hl, hw)], 0.06, col, col.clone().multiplyScalar(0.55));
      }
      carry = 0.4;
    }
    line.flush(B, { color: V.flag, moss: 0.5, wet: 0.1, ground: Y0 - 0.2 });
  }
  // ---------------------------------------------------------------- lamps where the street turns: each on a stub of a Heliarch column
  // (the street east of the square had nothing lit to walk toward: the blind reader, round 2)
  for (const [run, s, D, glass] of [[1, 44.2, 20.9, 'amber'], [2, 5.6, 21.3, 'ruby'], [2, 21.4, 20.6, 'amber']]) {
    const [x, z] = plan.at(run, s, D), h = T.heightAt(x, z); if (Math.abs(h - Y0) > 0.2 || plan.houseOut(x, z) < 1.2) continue;
    const n = plan.RUN[run].n, m = mat(x, Y0, z, 0, Math.atan2(-n[0], -n[1]), 0), hs = 1.5 + rng() * 0.25;
    for (let k = 0, y = -0.1; k < 3; k++) { const dh = (hs + 0.1) / 3; PARTS.heliarch.drum(B, ch(m, (rng() - 0.5) * 0.04, y, (rng() - 0.5) * 0.04), { r: 0.24 - k * 0.012, h: dh, turn: rng(), moss: 0.5 }); y += dh; }
    PARTS.late.bracket(B, ch(m, 0, hs - 0.16, 0.2), { reach: 0.42 });
    const lp = new THREE.Vector3(0, hs - 0.14, 0.62).applyMatrix4(m);
    Q.extraLamps.push({ x: lp.x, y: lp.y, z: lp.z, glass });
    ctx.addCollider({ x, z, r: 0.3, y: Y0, h: hs, stand: false });
  }

  return { gut: gut.map(([s, D]) => W(s, D)) };
}

// The Wanting Arch: the way's gate, standing at the head of the old way's bank. Two piers, a ring of eleven
// voussoirs with one gone from its shoulder and lying in the turf, the spandrel left on one side only with the sign
// still in it, and the Late folk's prop under the stone that should have fallen with it. It is turned so that a
// walker coming up the bank sees the fountain through it.
export function arch(Q, F) {
  const { B, ctx, plan, low } = Q, rng = rngOf(1512, 17), [cx, cz] = plan.at(1, ARCH.s, ARCH.D), y0 = Math.max(plan.LEVEL.bench.y, ctx.terrain.heightAt(cx, cz));
  const dx = F.x - cx, dz = F.z - cz, yaw = Math.atan2(-dx, -dz), M = mat(cx, y0, cz, 0, yaw, 0);
  const r1 = 1.3, r2 = 1.86, sp = 2.25, dep = 0.8, st = (k = 0.06, c = H.stone) => ({ color: worn(c, rng, k, 0.08), course: 0.42, moss: 0.5, ground: y0 });
  for (const sx of [-1, 1]) {
    const px = sx * (r1 + 0.42);
    B.add(B.box(1.04, 0.6, 1.06, { seg: 2.5, chip: 0.05, seed: 3 + sx }), ch(M, px, 0.02, 0), st(0.1, H.dark));
    B.add(B.box(0.84, sp + 0.1, 0.84, { seg: 2.5, chip: 0.04, seed: 9 + sx }), ch(M, px, sp / 2 + 0.05, 0), st());
    B.add(B.box(1.0, 0.2, 0.98, { seg: 2.5, chip: 0.03, seed: 5 + sx }), ch(M, px + sx * 0.02, sp - 0.02, 0), st(0.06, H.dark));
    ctx.addCollider({ x: cx + Math.cos(yaw) * px, z: cz - Math.sin(yaw) * px, r: 0.56, y: y0 - 0.5, h: 5.5, stand: false });
  }
  const nv = 11, GONE = 8;
  for (let i = 0; i < nv; i++) {
    if (i === GONE) continue;
    const a0 = (i / nv) * Math.PI + 0.004, a1 = ((i + 1) / nv) * Math.PI - 0.004, key = i === 5, ro2 = key ? r2 + 0.2 : r2, pts = [];
    for (const [an, r] of [[a0, r1], [(a0 + a1) / 2, r1 - 0.004], [a1, r1], [a1, ro2], [(a0 + a1) / 2, ro2 + 0.012], [a0, ro2]]) pts.push([Math.cos(an) * r, sp + 0.09 + Math.sin(an) * r]);
    plate(B, ch(M, 0, 0, (i % 2) * 0.012), pts, dep + (key ? 0.1 : 0), { color: worn(i % 2 ? H.stone : H.dark, rng, 0.06, 0.07), moss: 0.45, ground: y0, course: 0 });
  }
  B.add(B.cyl(0.14, 0.14, 0.03, 6, 1), ch(M, 0, sp + 0.09 + r2 - 0.06, dep / 2 + 0.062, Math.PI / 2, 0, 0), { color: H.cut, moss: 0.2, ground: y0 }); // the socket its bronze sat in
  // the spandrel left on the west side, a cornice stub on it, the sign in its face
  B.add(B.box(0.98, 1.72, dep - 0.03, { seg: 2.5, chip: 0.05, seed: 21 }), ch(M, r1 + 0.5, sp + 0.08 + 0.86, 0), st());
  B.add(B.box(1.3, 0.2, dep + 0.2, { seg: 2.5, chip: 0.04, seed: 22 }), ch(M, r1 + 0.42, sp + 1.9, 0), st(0.08, H.dark));
  PARTS.heliarch.roundel(B, ch(M, r1 + 0.52, sp + 0.42, dep / 2 - 0.03), { size: 0.66, disc: 'bronze' });
  ctx.strata.place?.({ hand: 'heliarch', kind: 'sign', name: 'lees-arch', x: cx + Math.cos(yaw) * (r1 + 0.52) + Math.sin(yaw) * 0.4, y: y0 + sp + 0.9, z: cz - Math.sin(yaw) * (r1 + 0.52) + Math.cos(yaw) * 0.4, face: [Math.sin(yaw), Math.cos(yaw)], mount: 'wall', size: 0.66 });
  // the prop: a raw pole and a pad under the stone beyond the gap
  { const a = ((GONE - 0.45) / nv) * Math.PI, tx = Math.cos(a) * (r1 - 0.02), ty = sp + 0.09 + Math.sin(a) * (r1 - 0.02), wood = { color: worn(V.rawWood, rng, 0.3), moss: 0.1, ground: y0 };
    beam(B, M, [tx - 0.12, -0.25, 0.05], [tx, ty - 0.07, 0], 0.13, { ...wood, round: 6 });
    B.add(B.box(0.36, 0.07, 0.3, { seg: 9 }), ch(M, tx, ty - 0.035, 0, 0, 0, -0.28), wood);
    ctx.addCollider({ x: cx + Math.cos(yaw) * (tx - 0.1), z: cz - Math.sin(yaw) * (tx - 0.1), r: 0.14, y: y0 - 0.3, h: 2.4, stand: false });
  }
  // the one that went: in the turf beside the east pier, half sunk
  { const fx = -(r1 + 1.5), fz = 0.9; B.add(B.box(0.55, 0.5, dep, { seg: 9, chip: 0.06, seed: 31 }), ch(M, fx, 0.08, fz, 0.2, 0.7, 0.35), { color: worn(H.dark, rng, 0.15), moss: 0.75, ground: y0, course: 0 });
    ctx.addCollider({ x: cx + Math.cos(yaw) * fx + Math.sin(yaw) * fz, z: cz - Math.sin(yaw) * fx + Math.cos(yaw) * fz, r: 0.45, y: y0 - 0.3, h: 0.75 }); }
  void L; void low; void THREE;
  return { x: cx, z: cz, y: y0, yaw, top: y0 + sp + r2 + 0.3 };
}
