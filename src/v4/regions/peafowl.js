// The Demesne's white peafowl (plans/wilderness-v4.md, BT): "three white peafowl on the biggest blocks round (75, -15),
// turning their heads; at every gutter they raise the ragged train with its last few eyes and cry". White and
// moulted, a few last eyed feathers. Each bird is one connected body: a tube lofted along a spine in the bird's
// midplane runs bill, head, neck, breast, belly and rump in one surface; the folded wings lie on its flanks, the legs
// rise out of the belly with their toes on the block, the crest's quills rise from the skull. The train is a second
// mesh pivoting at the rump, placed every frame through the body's own matrix so it stays on the rump through the
// bob, the head-turn and the cry. Two instanced meshes for the whole set. Colours are authored as sRGB hex and
// converted (THREE.Color), so the white is an old dingy white, not a linear 0.88 that the screen shows near 1.
// Built facing +z, the feet at the origin on the perch's top.
import * as THREE from 'three';

const col = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; }; // sRGB hex → linear
const WHITE = col('#d8d3c6'), UNDER = col('#aaa497'), BACK = col('#e0dbcf'), WING = col('#cfc9bb'), QUILL = col('#a39d90');
const LEG = col('#7a6e66'), BILL = col('#a5967d'), EYE = col('#120f0d');
const EYE_C = col('#18213f'), EYE_T = col('#2c5c55'), EYE_B = col('#7e6230'), TIP = col('#9c968a');
export const RUMP = [0, 0.645, -0.31]; // where the train springs, in the body's frame

// a tiny private hash for the ragged details, so the region's shared rng stream is untouched
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

class Build {
  constructor() { this.p = []; this.c = []; this.i = []; this.parts = []; }
  get n() { return this.p.length / 3; }
  begin(name) { this.parts.push({ name, start: this.n, count: 0 }); }
  end() { const q = this.parts[this.parts.length - 1]; q.count = this.n - q.start; }
  v(x, y, z, c) { this.p.push(x, y, z); this.c.push(c[0], c[1], c[2]); return this.n - 1; }
  // a tube through pts (any direction), radii [side, normal]; colour fn(k, side angle) → rgb; closed ends
  tube(pts, radii, sides, colour) {
    const rings = [];
    for (let k = 0; k < pts.length; k++) {
      const a = pts[Math.max(0, k - 1)], b = pts[Math.min(pts.length - 1, k + 1)];
      const t = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize();
      const ref = Math.abs(t.x) > 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
      const u = new THREE.Vector3().crossVectors(t, ref).normalize(), w = new THREE.Vector3().crossVectors(u, t).normalize();
      // for a spine in the midplane (t.x = 0) w is the lateral axis (x) and u the in-plane normal
      const [rs, rn] = radii[k], ring = [];
      for (let s = 0; s < sides; s++) {
        const an = (s / sides) * Math.PI * 2, cs = Math.cos(an), sn = Math.sin(an);
        ring.push(this.v(pts[k][0] + w.x * cs * rs + u.x * sn * rn, pts[k][1] + w.y * cs * rs + u.y * sn * rn, pts[k][2] + w.z * cs * rs + u.z * sn * rn, colour(k, an, sn)));
      }
      rings.push(ring);
    }
    for (let k = 0; k < rings.length - 1; k++) for (let s = 0; s < sides; s++) {
      const s1 = (s + 1) % sides, A = rings[k][s], B = rings[k][s1], C = rings[k + 1][s1], D = rings[k + 1][s];
      this.i.push(A, D, C, A, C, B);
    }
    const capAt = (k, flip) => {
      const p = pts[k], c = this.v(p[0], p[1], p[2], colour(k, 0, 0)), r = rings[k];
      for (let s = 0; s < sides; s++) { const s1 = (s + 1) % sides; flip ? this.i.push(r[s], r[s1], c) : this.i.push(r[s1], r[s], c); }
    };
    capAt(0, false); capAt(pts.length - 1, true);
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setIndex(this.i); g.computeVertexNormals(); g.computeBoundingSphere();
    g.userData.parts = this.parts; // [{ name, start, count }] vertex ranges, read by regions-test's join check
    return g;
  }
}

const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const shade = (c, k) => [c[0] * k, c[1] * k, c[2] * k];

function bodyGeometry() {
  const B = new Build();
  // the spine, rump to bill tip, in the midplane (z forward, y up), and its half-widths [side, up]
  const key = [
    [-0.34, 0.655, 0.02, 0.02], [-0.3, 0.645, 0.065, 0.055], [-0.22, 0.63, 0.11, 0.1], [-0.1, 0.615, 0.14, 0.14],
    [0.02, 0.615, 0.15, 0.155], [0.12, 0.645, 0.125, 0.14], [0.19, 0.7, 0.092, 0.097], [0.225, 0.77, 0.066, 0.068],
    [0.25, 0.85, 0.052, 0.054], [0.268, 0.93, 0.044, 0.045], [0.282, 0.99, 0.039, 0.04], [0.3, 1.028, 0.042, 0.04],
    [0.335, 1.04, 0.041, 0.036], [0.365, 1.032, 0.026, 0.022], [0.39, 1.024, 0.012, 0.01], [0.41, 1.018, 0.003, 0.003],
  ];
  const curve = new THREE.CatmullRomCurve3(key.map((k) => new THREE.Vector3(0, k[1], k[0])), false, 'centripetal');
  const n = 34, pts = [], rad = [], at = [];
  for (let k = 0; k <= n; k++) {
    const u = k / n, p = curve.getPoint(u), f = u * (key.length - 1), i = Math.min(key.length - 2, Math.floor(f)), t = f - i;
    const sm = t * t * (3 - 2 * t);
    pts.push([0, p.y, p.z]); rad.push([key[i][2] + (key[i + 1][2] - key[i][2]) * sm, key[i][3] + (key[i + 1][3] - key[i][3]) * sm]); at.push(p.z);
  }
  B.begin('body');
  // white over grey underparts, a faint scallop of feather rows on the back, the bill horn-coloured
  B.tube(pts, rad, 14, (k, an, sn) => {
    const z = at[k], up = sn; // sn > 0 toward the in-plane normal: up along the back, forward-up on the neck
    if (z > 0.36) return BILL;
    let c = mix(UNDER, BACK, 0.5 + 0.5 * up);
    const scallop = 0.5 + 0.5 * Math.sin(z * 70 + Math.cos(an) * 5);
    c = shade(c, 0.95 + 0.06 * scallop * Math.max(0, up) + 0.04 * (hash(k * 31 + an * 7) - 0.5));
    if (z < -0.25) c = mix(c, QUILL, 0.35); // the rump's coverts, worn
    return c;
  });
  B.end();
  // the folded wings: long shells lying on the flanks, sunk into the body, their primaries crossing over the rump
  for (const sd of [-1, 1]) {
    B.begin(sd < 0 ? 'wing-r' : 'wing-l');
    const wpts = [], wr = [];
    for (let k = 0; k <= 9; k++) {
      const u = k / 9, z = 0.13 - u * 0.42, y = 0.66 + 0.05 * Math.sin(u * 3.1) - u * 0.02;
      wpts.push([sd * (0.105 - 0.05 * u * u), y - 0.015, z]);
      const s = Math.sin(Math.min(1, 0.12 + u * 1.05) * Math.PI);
      wr.push([0.03 * s + 0.004, 0.085 * s + 0.006]);
    }
    B.tube(wpts, wr, 8, (k, an) => shade(mix(WING, QUILL, k / 9 * 0.6), 0.96 + 0.08 * (0.5 + 0.5 * Math.sin(k * 2.3 + an * 3))));
    B.end();
  }
  // legs: a feathered thigh out of the belly, the bare shank to the block, three toes forward and one back
  for (const sd of [-1, 1]) {
    B.begin(sd < 0 ? 'leg-r' : 'leg-l');
    const x = sd * 0.055;
    B.tube([[x, 0.6, 0.0], [x * 1.05, 0.5, -0.015], [x * 1.1, 0.4, -0.02]], [[0.05, 0.05], [0.04, 0.04], [0.024, 0.024]], 7, () => UNDER);
    B.tube([[x * 1.1, 0.42, -0.02], [x * 1.12, 0.3, -0.015], [x * 1.1, 0.15, 0.0], [x * 1.08, 0.025, 0.01]], [[0.016, 0.016], [0.012, 0.012], [0.011, 0.011], [0.012, 0.012]], 6, () => LEG);
    for (const [dx, dz] of [[0, 1], [0.5, 0.86], [-0.5, 0.86], [0, -0.7]]) {
      const len = dz < 0 ? 0.045 : 0.075, ex = x * 1.08 + dx * len, ez = 0.01 + dz * len;
      B.tube([[x * 1.08, 0.022, 0.01], [(x * 1.08 + ex) / 2, 0.014, (0.01 + ez) / 2], [ex, 0.006, ez]], [[0.008, 0.007], [0.006, 0.005], [0.003, 0.003]], 4, () => shade(LEG, 0.85));
    }
    B.end();
  }
  // the crest: a fan of bare quills out of the crown, each ending in a small flag
  B.begin('crest');
  for (let i = -2; i <= 2; i++) {
    const a = i * 0.16, bx = Math.sin(a) * 0.012, tx = Math.sin(a) * 0.035, tz = 0.305 - Math.abs(i) * 0.006;
    B.tube([[bx, 1.062, 0.315], [tx * 0.6, 1.1, tz], [tx, 1.135, tz - 0.004]], [[0.003, 0.003], [0.0022, 0.0022], [0.002, 0.002]], 4, () => QUILL);
    B.tube([[tx, 1.128, tz], [tx * 1.08, 1.142, tz - 0.004], [tx * 1.1, 1.152, tz - 0.006]], [[0.011, 0.003], [0.012, 0.0035], [0.002, 0.002]], 5, () => WHITE);
  }
  B.end();
  // the eyes, set into the head's flanks
  B.begin('eyes');
  for (const sd of [-1, 1]) B.tube([[sd * 0.03, 1.046, 0.338], [sd * 0.036, 1.046, 0.342], [sd * 0.042, 1.046, 0.344]], [[0.006, 0.006], [0.007, 0.007], [0.004, 0.004]], 5, () => EYE);
  B.end();
  return B.geometry();
}

// The train: long ragged feathers fanning back from the rump (pivot at the origin), each a narrow vane on a shaft that
// sags along its length; most plain and gapped, three still carrying an eye. A covert mound at the root sits inside the
// rump, so the fan grows out of the bird.
function trainGeometry() {
  const B = new Build();
  B.begin('coverts');
  B.tube([[0, 0.012, 0.06], [0, 0.0, -0.06], [0, -0.012, -0.22], [0, -0.022, -0.36]], [[0.05, 0.035], [0.1, 0.03], [0.12, 0.016], [0.07, 0.004]], 8, (k) => mix(WHITE, QUILL, k / 3 * 0.5));
  B.end();
  B.begin('feathers');
  const n = 15;
  for (let i = 0; i < n; i++) {
    if (i % 4 === 2) continue; // moulted gaps
    const a = (i / (n - 1) - 0.5) * 1.1, ragged = hash(i + 3);
    const len = 1.1 + 0.35 * Math.cos(a * 2) - (i % 3) * 0.12 - (ragged > 0.75 ? 0.25 : 0);
    const dx = Math.sin(a), dz = -Math.cos(a), px = -dz, pz = dx;
    const eyed = i === 4 || i === 8 || i === 13;
    // a bare shaft at the root, the vane widening to a rounded tip, frayed where barbs have gone
    const segs = 10, rows = [], lift = i * 0.0008, sagAt = (u) => -0.07 * u * u - 0.01 * u;
    for (let s = 0; s <= segs; s++) {
      const u = s / segs, d = 0.03 + u * len, fray = hash(i * 13 + s) > 0.78 ? 0.45 : 1 - 0.2 * hash(i * 7 + s);
      const tipK = s === segs ? 0.25 : s === segs - 1 ? 0.75 : 1;
      const w = (0.004 + 0.028 * Math.min(1, Math.max(0, (u - 0.08) / 0.62)) ** 1.5) * fray * tipK;
      const cx = dx * d, cz = dz * d, y = sagAt(u) + lift, c = mix(WHITE, TIP, u * 0.8);
      rows.push([B.v(cx - px * w, y, cz - pz * w, c), B.v(cx, y + 0.002, cz, shade(c, 0.88)), B.v(cx + px * w, y, cz + pz * w, c)]);
    }
    for (let s = 0; s < segs; s++) for (let m = 0; m < 2; m++) { const A = rows[s][m], Bq = rows[s][m + 1], C = rows[s + 1][m + 1], D = rows[s + 1][m]; B.i.push(A, D, C, A, C, Bq); }
    if (eyed) { // the eye: a dark blue heart, a teal ring, a bronze rim, lying just above the vane near the tip
      const dE = len - 0.055;
      const at = (along, across, c) => { const d = dE + along, u = (d - 0.03) / len; return B.v(dx * d + px * across, sagAt(u) + lift + 0.005, dz * d + pz * across, c); };
      const ring = (r, c) => { const o = B.n; for (let k = 0; k < 10; k++) { const t = (k / 10) * 6.283; at(Math.sin(t) * r * 1.25, Math.cos(t) * r * 0.8, c); } return o; };
      const e0 = at(0, 0, EYE_C), r1 = ring(0.022, EYE_T), r2 = ring(0.038, EYE_B);
      for (let k = 0; k < 10; k++) { const k1 = (k + 1) % 10; B.i.push(e0, r1 + k, r1 + k1, r1 + k, r2 + k, r2 + k1, r1 + k, r2 + k1, r1 + k1); }
    }
  }
  B.end();
  return B.geometry();
}

export function buildPeafowl(ctx, rng, perches) {
  const { THREE: T } = ctx;
  const bodyGeo = bodyGeometry(), trainGeo = trainGeometry();
  const mat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, side: T.DoubleSide });
  // perches: the biggest blocks nearest (75, -15)
  const ps = perches.slice().sort((a, b) => Math.hypot(a.x - 75, a.z + 15) - Math.hypot(b.x - 75, b.z + 15)).slice(0, 3);
  const list = ps.map((b) => ({ x: b.x, y: b.y + b.sy * 0.5, z: b.z, yaw: rng() * 6.28, look: 0, next: 1 + rng() * 3, cry: 0, ph: rng() * 6 }));
  const body = new T.InstancedMesh(bodyGeo, mat, Math.max(1, list.length));
  const train = new T.InstancedMesh(trainGeo, mat, Math.max(1, list.length));
  body.name = 'demesne-peafowl'; train.name = 'demesne-peafowl-trains';
  for (const m of [body, train]) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; ctx.scene.add(m); }
  const m4 = new T.Matrix4(), mt = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), p = new T.Vector3(), one = new T.Vector3(1, 1, 1);
  const rump = new T.Vector3(...RUMP), s = new T.Vector3();
  const flick = ctx.sky?.flicker || { value: 1 };
  let wasG = false;
  function update(dt, t) {
    dt = Math.min(dt, 0.3);
    const g = flick.value < 0.5;
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      if (g && !wasG) b.cry = 2.6 + i * 0.7;
      b.cry = Math.max(0, b.cry - dt);
      b.next -= dt;
      if (b.next <= 0) { b.look = (rng() - 0.5) * 1.6; b.next = 1.5 + rng() * 4; }
      b.yaw += (b.look * 0.25) * dt;
      b.cs = (b.cs || 0) + ((b.cry > 0.3 ? 1 : 0) - (b.cs || 0)) * Math.min(1, dt * 6);
      const cr = b.cs; // up while crying
      // the body: a slight bob, the head raised (whole bird pitches back a little) while it cries
      e.set(-0.18 * cr + 0.03 * Math.sin(t * 1.3 + b.ph), b.yaw + 0.25 * Math.sin(t * 0.5 + b.ph) * (1 - cr), 0, 'YXZ'); q.setFromEuler(e);
      p.set(b.x, b.y, b.z);
      body.setMatrixAt(i, m4.compose(p, q, one));
      // the train, in the body's frame at the rump: trailing and drooping, half raised and spread at the cry
      e.set(-0.25 + 1.33 * cr, 0, 0, 'YXZ'); q.setFromEuler(e);
      mt.compose(rump, q, s.set(1 + 0.4 * cr, 1, 1 - 0.15 * cr));
      train.setMatrixAt(i, mt.premultiply(m4));
    }
    wasG = g;
    body.instanceMatrix.needsUpdate = true; train.instanceMatrix.needsUpdate = true;
  }
  update(0, 0);
  return { meshes: [body, train], update, count: list.length, list };
}
