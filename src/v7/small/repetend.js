// CO The Repetend [Proposed] (wilderness-v5.md, "### CO. The Repetend"): "A brown bird on the Lynchets' walls that follows
// you along the wall-tops and, a second behind, repeats your footsteps exactly, gravel or grass, walking or hurrying.
// Stop and it plays out your last few steps, then is quiet." Austin: yes.
// A brown bird 0.35 m long (v7.1: the 0.18 m model drawn at 1.94 times, to read as a bird at 25 m; body, head, tail,
// folded wings, a pale throat and breast that take the low sun) in one mesh. The wall-tops are read from the Lynchets' own
// stones (lynchets-walls' instances, along the runs region-lynchets exposes as ctx.regions.lynchetsWalls): every 0.1 m of each run
// the highest stone's top, none in a gap. While the walker is within 18 m of a wall-top it hops along its wall's top to
// keep 3-6 m from the walker (hops of 0.3 m, up to 6 a second, pauses and turns its head), and flits (under 15 m, the
// wings beating) to another wall's top when that keeps it nearer the band; it never leaves the walls. Beyond 18 m it
// goes back to, and sits on, its perch: the highest stretch of wall-top (the stones standing tallest over their ground)
// within 6 m of the leads P3 and P4 (v7.1; it was the wall-top nearest (-170, -97)).
// The echo: audio.js records each of the walker's steps as it plays (audio.steps, a ring of 16); while the bird follows,
// each is replayed 1.0 s after it with audio.echoStep(rec, pos) at the bird: the same ground kind, hurry, pitch and
// volume draws. Nothing else: the delay is the whole behaviour, and the bird makes no other sound. As each echo sounds
// the bird moves (v7.1), so the eye goes to the sound: a flick of the tail and a hop of a stone's width along the top.
import * as THREE from 'three';
import { SITES, REGIONS } from '../../world.js';
import { hyp, clamp, lerp } from '../../noise.js';
import { Mesher } from '../../fauna/geo.js';
import { leads } from '../../v4/paths/routes.js';

const HOME = SITES.repetend;            // (-170, -97)
const FOLLOW = 18, BAND = [3, 6], WANT = 4.5, HOP = 0.3, HOP_T = 1 / 6, FLIT_MAX = 15, FLIT_V = 7, DELAY = 1.0;
const SAMPLE = 0.1;
const SCALE = 0.35 / 0.18, PERCH_LEADS = ['P3', 'P4'], PERCH_NEAR = 6, FLICK = 0.32;

// the bird: body, head, tail and folded wings (aW marks the wings for the flap; aH the head for its turn), 0.18 m long
function birdGeometry() {
  const m = new Mesher();
  m.blob(0, 0.045, 0.0, 0.026, 0.026, 0.05, 7, 5, 0);      // body, z forward
  m.blob(0, 0.08, 0.045, 0.019, 0.019, 0.021, 6, 4, 0);    // head
  m.blob(0, 0.077, 0.068, 0.004, 0.003, 0.009, 4, 2, 0);   // bill
  m.blob(0, 0.05, -0.07, 0.012, 0.005, 0.04, 4, 3, 0);     // tail, cocked a little
  for (const sx of [-1, 1]) {
    const L = [[sx * 0.02, 0.062, 0.025], [sx * 0.06, 0.064, -0.0], [sx * 0.1, 0.062, -0.03]];
    const T = [[sx * 0.02, 0.056, -0.035], [sx * 0.06, 0.058, -0.045], [sx * 0.09, 0.058, -0.055]];
    m.strip(L, T, 2, 0.003, (x) => Math.min(1, Math.abs(x) / 0.09), sx < 0);
  }
  for (const sx of [-1, 1]) m.loft([[sx * 0.008, 0.026, 0.005], [sx * 0.009, 0.0, 0.008]], [0.0025, 0.002], 3, 0, false); // legs
  const g = m.geometry();
  const p = g.attributes.position, c = new Float32Array(p.count * 3), h = new Float32Array(p.count), tl = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    // brown all over: a darker, streaked back and wings, a pale buff throat and breast (v7.1: pale enough to take the
    // low sun at 25 m), a dark bill and legs
    let col = [0.16, 0.1, 0.06];
    if (y < 0.042 && z > -0.03) col = [0.5, 0.4, 0.27];
    if (z > 0.012 && y < 0.06 && y > 0.02) col = [0.66, 0.55, 0.38];
    if (z > 0.032 && y < 0.078 && y > 0.055) col = [0.7, 0.6, 0.43];
    if (Math.abs(x) > 0.02 && y > 0.05) col = [0.12, 0.075, 0.045].map((v) => v * (0.85 + 0.3 * ((Math.sin(z * 260) > 0.3) ? 1 : 0)));
    if (z > 0.062 || y < 0.012) col = [0.06, 0.05, 0.04];
    c[i * 3] = col[0]; c[i * 3 + 1] = col[1]; c[i * 3 + 2] = col[2];
    h[i] = z > 0.026 && y > 0.058 ? 1 : 0;
    tl[i] = z < -0.03 && Math.abs(x) < 0.014 && y > 0.035 ? 1 : 0; // the tail, for its flick
  }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  g.setAttribute('aH', new THREE.BufferAttribute(h, 1));
  g.setAttribute('aT', new THREE.BufferAttribute(tl, 1));
  return g;
}
function birdMaterial(U) {
  const m = new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.8 });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        attribute float aW; attribute float aH; attribute float aT; uniform float uFlap, uFold, uHead, uTail;
        vec3 fpPitch(vec3 p, vec3 o, float th) { vec3 q = p - o; float c = cos(th), s = sin(th); return o + vec3(q.x, q.y * c - q.z * s, q.y * s + q.z * c); }
        vec3 fpRot(vec3 p, float th) { float c = cos(th), s = sin(th); return vec3(p.x * c - p.y * s, p.x * s + p.y * c, p.z); }
        vec3 fpYaw(vec3 p, vec3 o, float th) { vec3 q = p - o; float c = cos(th), s = sin(th); return o + vec3(q.x * c + q.z * s, q.y, -q.x * s + q.z * c); }`)
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
        if (aW > 0.0) objectNormal = fpRot(objectNormal, uFlap * aW * (position.x < 0.0 ? -1.0 : 1.0));`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        if (aW > 0.0) { float sx = position.x < 0.0 ? -1.0 : 1.0; transformed.x *= mix(1.0, 0.25, uFold); transformed = fpRot(transformed, uFlap * aW * sx); }
        if (aH > 0.0) transformed = fpYaw(transformed, vec3(0.0, 0.07, 0.03), uHead);
        if (aT > 0.0) transformed = fpPitch(transformed, vec3(0.0, 0.05, -0.032), -uTail);`);
  };
  m.customProgramCacheKey = () => 'small-repetend';
  return m;
}

export function buildRepetend(ctx, mesh) {
  const { scene, player } = ctx;
  const runs = ctx.regions?.lynchetsWalls;
  if (!runs?.length || !mesh) return null;
  const poly = REGIONS.lynchets.shape.poly;

  // ---- the stones' tops, binned by 1 m cells
  const geo = mesh.geometry.attributes.position, nv = geo.count;
  const M = new THREE.Matrix4(), v = new THREE.Vector3(), cells = new Map();
  for (let i = 0; i < mesh.count; i++) {
    mesh.getMatrixAt(i, M);
    let top = -Infinity, cx = 0, cz = 0;
    for (let k = 0; k < nv; k++) { v.fromBufferAttribute(geo, k).applyMatrix4(M); if (v.y > top) top = v.y; }
    cx = M.elements[12]; cz = M.elements[14];
    const key = `${Math.floor(cx)},${Math.floor(cz)}`;
    let c = cells.get(key); if (!c) cells.set(key, (c = []));
    c.push(cx, cz, top);
  }
  const topNear = (x, z, r) => {
    let best = -Infinity;
    const x0 = Math.floor(x - r), x1 = Math.floor(x + r), z0 = Math.floor(z - r), z1 = Math.floor(z + r);
    for (let gx = x0; gx <= x1; gx++) for (let gz = z0; gz <= z1; gz++) {
      const c = cells.get(`${gx},${gz}`); if (!c) continue;
      for (let j = 0; j < c.length; j += 3) if (hyp(c[j] - x, c[j + 1] - z) < r && c[j + 2] > best) best = c[j + 2];
    }
    return best;
  };
  // ---- the wall-tops: every 0.1 m along each run, the highest stone within 0.3 m (NaN in a gap)
  const walls = runs.map((r, wi) => {
    const len = Math.hypot(r.bx - r.ax, r.bz - r.az), n = Math.floor(len / SAMPLE) + 1;
    const dx = (r.bx - r.ax) / len, dz = (r.bz - r.az) / len, top = new Float32Array(n);
    let any = 0;
    for (let i = 0; i < n; i++) { const y = topNear(r.ax + dx * i * SAMPLE, r.az + dz * i * SAMPLE, 0.3); top[i] = y > -Infinity ? y : NaN; if (y > -Infinity) any++; }
    return { i: wi, ax: r.ax, az: r.az, dx, dz, len, n, top, any };
  }).filter((w) => w.any > 10);
  const W = walls.length;
  const posOf = (w, i, o) => { o.x = w.ax + w.dx * i * SAMPLE; o.z = w.az + w.dz * i * SAMPLE; o.y = w.top[i]; return o; };
  // the nearest standing sample on a wall to a point: along the run's projection, then the nearest sample with a top
  function nearestOn(w, x, z) {
    const t = clamp((x - w.ax) * w.dx + (z - w.az) * w.dz, 0, w.len);
    let i = Math.round(t / SAMPLE);
    for (let k = 0; k < w.n; k++) { const a = i + k, b = i - k; if (a < w.n && w.top[a] === w.top[a]) return a; if (b >= 0 && w.top[b] === w.top[b]) return b; }
    return -1;
  }
  const lineDist = (w, x, z) => { const t = clamp((x - w.ax) * w.dx + (z - w.az) * w.dz, 0, w.len); return hyp(x - w.ax - w.dx * t, z - w.az - w.dz * t); };
  // home (v7.1): the perch nearest the leads, so a walker on P3 or P4 finds it: of the standing samples within 6 m of
  // either lead, the one where the wall stands tallest over its ground (its top averaged over a stone's width either
  // side); failing any, the standing sample nearest (-170, -97)
  const leadPts = [];
  for (const L of leads().list) if (PERCH_LEADS.includes(L.id)) for (const S of L.lines) for (let k = 0; k < S.length - 1; k++) leadPts.push(S[k].x, S[k].z, S[k + 1].x, S[k + 1].z);
  const leadD = (x, z) => {
    let d = Infinity;
    for (let k = 0; k < leadPts.length; k += 4) {
      const ax = leadPts[k], az = leadPts[k + 1], ex = leadPts[k + 2] - ax, ez = leadPts[k + 3] - az, l2 = ex * ex + ez * ez || 1;
      const t = clamp(((x - ax) * ex + (z - az) * ez) / l2, 0, 1); d = Math.min(d, hyp(x - ax - ex * t, z - az - ez * t));
    }
    return d;
  };
  let home = { w: 0, i: 0 }, hd = Infinity, best = -Infinity;
  const pp = { x: 0, y: 0, z: 0 };
  for (const w of walls) for (let i = 3; i < w.n - 3; i++) {
    let sum = 0, ok = true;
    for (let k = -3; k <= 3; k++) { const y = w.top[i + k]; if (y !== y) { ok = false; break; } sum += y; }
    if (!ok) continue;
    posOf(w, i, pp);
    if (leadD(pp.x, pp.z) > PERCH_NEAR) continue;
    const tall = sum / 7 - ctx.terrain.heightAt(pp.x, pp.z);
    if (tall > best) { best = tall; home = { w: w.i, i }; }
  }
  if (best === -Infinity) for (const w of walls) { const i = nearestOn(w, HOME.x, HOME.z); if (i < 0) continue; const p = posOf(w, i, {}); const d = hyp(p.x - HOME.x, p.z - HOME.z); if (d < hd) { hd = d; home = { w: w.i, i }; } }
  const wallBy = new Map(walls.map((w) => [w.i, w]));
  // at its perch it sits facing the lead, its pale breast toward whoever comes along it
  let homeYaw = 0;
  { const hw = wallBy.get(home.w), hp = posOf(hw, home.i, {}); let bd = Infinity, bx = hp.x, bz = hp.z;
    for (let k = 0; k < leadPts.length; k += 2) { const d = hyp(leadPts[k] - hp.x, leadPts[k + 1] - hp.z); if (d < bd && d > 0.5) { bd = d; bx = leadPts[k]; bz = leadPts[k + 1]; } }
    homeYaw = Math.atan2(bx - hp.x, bz - hp.z); }

  // ---- the bird
  const U = { uFlap: { value: 0 }, uFold: { value: 1 }, uHead: { value: 0 }, uTail: { value: 0 } };
  const bird = new THREE.Mesh(birdGeometry(), birdMaterial(U));
  bird.scale.setScalar(SCALE);
  bird.name = 'small-repetend'; bird.castShadow = true; bird.receiveShadow = true;
  scene.add(bird);
  const rng = ctx.makeRng(7505);
  const b = {
    w: home.w, i: home.i, x: 0, y: 0, z: 0, yaw: (rng(), homeYaw) /* the draw kept, so the stream after it is as before */, state: 'sit', following: false,
    hopT: 0, hopFrom: 0, hopTo: 0, pause: 0, headT: 0, head: 0, headTo: 0,
    fly: { t: 0, dur: 1, fx: 0, fy: 0, fz: 0, tx: 0, ty: 0, tz: 0, w: 0, i: 0 }, flits: 0, hops: 0, echoes: 0, walkerD: 0, wallD: 0,
    flicks: 0, echoHops: 0, tailT: 9, hopDir: 1,
  };
  // the echoes' sounding times (audio clock), so the bird moves as each sounds, not when it is scheduled
  const due = new Float64Array(8); let dueN = 0;
  { const p = posOf(wallBy.get(b.w), b.i, {}); b.x = p.x; b.y = p.y; b.z = p.z; }
  const tmp = { x: 0, y: 0, z: 0 };
  const echoPos = { x: 0, y: 0, z: 0 };
  let seqNext = -1;

  // the best standing sample on wall w for the walker at (x, z): nearest the band's middle, then nearest the bird
  function bestOn(w, x, z, fromI) {
    let best = -1, bs = Infinity;
    for (let i = 0; i < w.n; i++) {
      if (w.top[i] !== w.top[i]) continue;
      posOf(w, i, tmp);
      const d = hyp(tmp.x - x, tmp.z - z), off = d < BAND[0] ? BAND[0] - d + 2 : d > BAND[1] ? d - BAND[1] + 2 : Math.abs(d - WANT) * 0.2;
      const sc = off + (fromI >= 0 ? Math.abs(i - fromI) * SAMPLE * 0.02 : 0);
      if (sc < bs) { bs = sc; best = i; }
    }
    bestOut.i = best; bestOut.score = bs; return bestOut;
  }
  function flitTo(w, i) {
    const f = b.fly; posOf(w, i, tmp);
    f.fx = b.x; f.fy = b.y; f.fz = b.z; f.tx = tmp.x; f.ty = tmp.y; f.tz = tmp.z; f.w = w.i; f.i = i; f.t = 0;
    f.dur = Math.max(0.35, hyp(tmp.x - b.x, tmp.z - b.z) / FLIT_V);
    b.state = 'fly'; b.flits++;
  }
  // a leg of at most 15 m toward a sample (on any wall) nearest a goal point; null if nothing within reach is nearer
  const legOut = { w: null, i: -1 }, bestOut = { i: -1, score: Infinity };
  function legToward(gx, gz, scoreFn) {
    let bw = null, bi = -1, bs = scoreFn(b.x, b.z) - 0.25;
    for (const w of walls) {
      if (lineDist(w, b.x, b.z) > FLIT_MAX) continue;
      for (let i = 0; i < w.n; i += 5) {
        if (w.top[i] !== w.top[i]) continue;
        posOf(w, i, tmp);
        if (hyp(tmp.x - b.x, tmp.z - b.z) > FLIT_MAX || hyp(tmp.x - b.x, tmp.z - b.z) < 1) continue;
        const s = scoreFn(tmp.x, tmp.z); if (s < bs) { bs = s; bw = w; bi = i; }
      }
    }
    void gx; void gz;
    if (!bw) return null;
    legOut.w = bw; legOut.i = bi; return legOut;
  }
  // the two goals a leg is scored by (no closures made per decision): the walker's band, and home
  let bpx = 0, bpz = 0;
  const bandScore = (x, z) => { const d = hyp(x - bpx, z - bpz); return d < BAND[0] ? BAND[0] - d + 2 : d > BAND[1] ? d - BAND[1] + 2 : Math.abs(d - WANT) * 0.2; };
  const homeP = posOf(wallBy.get(home.w), home.i, {});
  const homeScore = (x, z) => hyp(x - homeP.x, z - homeP.z);

  function update(dt, t) {
    if (dt <= 0) return;
    const px = player.pos.x, pz = player.pos.z;
    // the wall-top nearest the walker
    let nw = null, nd = Infinity;
    for (const w of walls) { const d = lineDist(w, px, pz); if (d < nd) { nd = d; nw = w; } }
    b.wallD = nd;
    b.following = nd < FOLLOW;
    b.walkerD = hyp(b.x - px, b.z - pz);
    const w = wallBy.get(b.w);
    if (b.state === 'fly') {
      const f = b.fly; f.t += dt;
      const u = Math.min(1, f.t / f.dur);
      const nx = lerp(f.fx, f.tx, u), nz = lerp(f.fz, f.tz, u);
      if (hyp(nx - b.x, nz - b.z) > 1e-4) b.yaw = Math.atan2(nx - b.x, nz - b.z);
      b.x = nx; b.z = nz;
      b.y = lerp(f.fy, f.ty, u) + Math.sin(u * Math.PI) * Math.min(1.2, f.dur * 0.9) - Math.abs(Math.sin(u * Math.PI * 2.5)) * 0.15;
      U.uFlap.value = Math.sin(t * 46) * 0.95 * (Math.sin(u * Math.PI * 2.5) > -0.2 ? 1 : 0.15);
      U.uFold.value = 0;
      if (u >= 1) { b.state = 'sit'; b.w = f.w; b.i = f.i; b.x = f.tx; b.y = f.ty; b.z = f.tz; b.pause = 0.6 + rng() * 0.8; U.uFlap.value = 0; U.uFold.value = 1; }
    } else if (b.state === 'hop') {
      b.hopT += dt;
      const u = Math.min(1, b.hopT / HOP_T);
      const s = lerp(b.hopFrom, b.hopTo, u);
      const i0 = Math.floor(s), i1 = Math.min(w.n - 1, i0 + 1), f = s - i0;
      const y0 = w.top[i0], y1 = w.top[i1];
      b.x = w.ax + w.dx * s * SAMPLE; b.z = w.az + w.dz * s * SAMPLE;
      b.y = lerp(y0, y1 === y1 ? y1 : y0, f) + Math.sin(u * Math.PI) * 0.06;
      if (u >= 1) { b.i = b.hopTo; posOf(w, b.i, tmp); b.y = tmp.y; b.state = 'sit'; b.hops++; }
    } else {
      // sitting: pause, turn the head, decide
      U.uFold.value = 1; U.uFlap.value = 0;
      b.pause -= dt;
      if (b.pause <= 0) {
        if (b.following) {
          const own = bestOn(w, px, pz, b.i);
          const ownOk = own.i >= 0 && own.score < 1.5;
          if (!ownOk || (nw !== w && lineDist(w, px, pz) > lineDist(nw, px, pz) + 4)) {
            bpx = px; bpz = pz;
            const leg = legToward(px, pz, bandScore);
            if (leg) flitTo(leg.w, leg.i);
            else b.pause = 0.3;
          }
          if (b.state === 'sit') {
            if (own.i >= 0 && Math.abs(own.i - b.i) * SAMPLE > 0.25) {
              // a hop of 0.3 m along the top toward it, over standing stones only (a gap is flown)
              const dir = own.i > b.i ? 1 : -1, to = clamp(b.i + dir * Math.round(HOP / SAMPLE), 0, w.n - 1);
              if (w.top[to] === w.top[to]) { b.state = 'hop'; b.hopT = 0; b.hopFrom = b.i; b.hopTo = to; b.yaw = Math.atan2(w.dx * dir, w.dz * dir); }
              else flitTo(w, own.i);
            } else { b.pause = 0.8 + rng() * 1.6; b.headTo = (rng() - 0.5) * 1.6; b.yaw += (rng() - 0.5) * 0.3; }
          }
        } else if (b.w !== home.w || Math.abs(b.i - home.i) > 2) {
          // back home along the walls, a leg at a time
          const hw = wallBy.get(home.w);
          if (hyp(homeP.x - b.x, homeP.z - b.z) <= FLIT_MAX) flitTo(hw, home.i);
          else { const leg = legToward(homeP.x, homeP.z, homeScore); if (leg) flitTo(leg.w, leg.i); else b.pause = 2; }
        } else { b.pause = 1.5 + rng() * 3; b.headTo = (rng() - 0.5) * 1.6; b.yaw = homeYaw + (rng() - 0.5) * 0.5; }
      }
    }
    // ---- at each echo as it sounds: the tail flicks and, if it sits, it hops a stone's width along the top
    const ac = ctx.audio?.ctx;
    if (dueN && ac) {
      const now = ac.currentTime;
      let k = 0;
      while (k < dueN && due[k] <= now) k++;
      if (k) {
        for (let j = k; j < dueN; j++) due[j - k] = due[j];
        dueN -= k;
        b.tailT = 0; b.flicks++;
        if (b.state === 'sit') {
          const w = wallBy.get(b.w); // the wall it sits on now (a flit may have ended this frame)
          // toward where it wants to be if that is along this wall, else back and forth
          const own = b.following ? bestOn(w, px, pz, b.i) : bestOut;
          let dir = b.following && own.i >= 0 && Math.abs(own.i - b.i) * SAMPLE > 0.25 ? (own.i > b.i ? 1 : -1) : b.hopDir;
          let to = clamp(b.i + dir * Math.round(HOP / SAMPLE), 0, w.n - 1);
          if (to === b.i || w.top[to] !== w.top[to]) { dir = -dir; to = clamp(b.i + dir * Math.round(HOP / SAMPLE), 0, w.n - 1); }
          if (to !== b.i && w.top[to] === w.top[to]) {
            b.state = 'hop'; b.hopT = 0; b.hopFrom = b.i; b.hopTo = to; b.yaw = Math.atan2(w.dx * dir, w.dz * dir); b.hopDir = -dir; b.echoHops++;
            b.pause = Math.max(b.pause, 0.4);
          }
        }
      }
    }
    b.tailT += dt;
    U.uTail.value = b.tailT < FLICK ? Math.sin((b.tailT / FLICK) * Math.PI) * 0.75 : 0;
    // the head: turned, glancing toward the walker now and then while it follows
    b.head += (b.headTo - b.head) * Math.min(1, dt * 9);
    U.uHead.value = b.state === 'fly' ? 0 : b.head;
    bird.position.set(b.x, b.y, b.z);
    bird.rotation.set(0, b.yaw, 0);
    bird.updateMatrix();
    // ---- the echo: each step, 1.0 s after it, at the bird, while it follows
    const a = ctx.audio, S = a?.steps;
    if (S && a.echoStep && a.ctx) {
      if (seqNext < 0) seqNext = S.seq;
      const now = a.ctx.currentTime;
      while (seqNext < S.seq) {
        const r = S.ring[seqNext % S.ring.length];
        if (r.seq !== seqNext) { seqNext++; continue; }       // overwritten: the ring has gone round
        const at = r.t + DELAY;
        if (at - now > 0.15) break;                           // not yet: schedule it a little ahead
        if (at > now && b.following) {
          echoPos.x = b.x; echoPos.y = b.y + 0.05 * SCALE; echoPos.z = b.z;
          if (a.echoStep(r, echoPos, DELAY)) { b.echoes++; if (dueN < due.length) due[dueN++] = at; }
        }
        seqNext++;
      }
    }
  }
  bird.matrixAutoUpdate = false;
  bird.position.set(b.x, b.y, b.z); bird.updateMatrix();

  const inPoly = (x, z) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, zi] = poly[i], [xj, zj] = poly[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
  return {
    mesh: bird, update, walls, home,
    at: () => b,
    state: () => {
      const wl = wallBy.get(b.state === 'fly' ? b.fly.w : b.w);
      const top = b.state === 'fly' ? NaN : (() => { const s = (b.state === 'hop' ? lerp(b.hopFrom, b.hopTo, Math.min(1, b.hopT / HOP_T)) : b.i); const i0 = Math.floor(s); return wl.top[i0]; })();
      return { x: b.x, y: b.y, z: b.z, state: b.state, following: b.following, walkerD: b.walkerD, wallD: b.wallD, top, flits: b.flits, hops: b.hops, echoes: b.echoes, flicks: b.flicks, echoHops: b.echoHops, wall: b.w, inPoly: inPoly(b.x, b.z), polyD: polyEdgeD(poly, b.x, b.z) };
    },
    topAt: (x, z) => { let best = NaN, bd = Infinity; for (const w of walls) { const i = nearestOn(w, x, z); if (i < 0) continue; posOf(w, i, tmp); const d = hyp(tmp.x - x, tmp.z - z); if (d < bd) { bd = d; best = tmp.y; } } return { y: best, d: bd }; },
    tris: () => bird.geometry.index.count / 3,
  };
}
function polyEdgeD(poly, x, z) {
  let d = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const [ax, az] = poly[i], [bx, bz] = poly[(i + 1) % poly.length], ex = bx - ax, ez = bz - az, l2 = ex * ex + ez * ez;
    const t = clamp(((x - ax) * ex + (z - az) * ez) / l2, 0, 1);
    d = Math.min(d, hyp(x - ax - ex * t, z - az - ez * t));
  }
  return d;
}
