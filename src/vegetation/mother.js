// The Lattice's mother crystal (v5 recast, the awe audit; wilderness-v4.md: "one mother crystal 60 m tall at the
// moraine's heart, the small ones its litter"; site in wilderness-v4-placement.md section 5). One crystal standing
// out of the glacier's tongue at the Lattice's seed (LANDMARKS.moraine, 40, -265): a six-sided prism 60 m from the
// ice to its apex, two parallel crystals grown into its flanks and stopped short of it (one terminated at 41 m, one
// left open at 29 m, its growth face stepped and unfinished), a ring of offshoots leaning out of its lower third, and
// a druse of crystals at its foot that runs out into the litter. Its faces carry growth terraces every two to three
// metres, so the one ledge repeats up the prism until the haze takes the count; the top 20 m go into the far haze
// (lattice.js's fog hook), so the apex is never seen whole.
// It is built in metres, then scaled down by K into the shards' local units: every piece shares one instance origin
// at the foot and one scale, so position.y runs -0.2 to 3 up the whole crystal and the shards' band of light climbs
// through it continuously (three bands at once, 18 m apart). Faces are wound outward (the shards' bodies are wound
// inward; on a crystal this size the near wall must hide what is behind it).
// ?lattice=v2 (lattice.js) builds the Lattice without it.
import * as THREE from 'three';

export const MOTHER_H = 60; // metres from the ice at its foot to its apex
export const MOTHER_FOOT = 9; // metres from the seed to the outside of the trunk and its twins: rocks and trees keep off
export const K = 20;        // metres per shard unit (the instance's scale)
const TAU = Math.PI * 2;

// One crystal: a prism of `sides` faces from `sink` m below its base to its shoulder, stepped at growth terraces, then a
// termination to an apex (or, open, a stepped flat face). Pushed into P in the mother's frame (metres from the foot).
function crystal(P, rng, o) {
  const n = o.sides ?? 6;
  const rr = [], aa = [];
  const a0 = rng() * TAU;
  for (let s = 0; s < n; s++) { rr.push(0.86 + rng() * 0.28); aa.push(a0 + ((s + (rng() - 0.5) * 0.22) / n) * TAU); }
  const len = o.len, yS = len * (1 - (o.term ?? 0.2));
  const rings = [[-(o.sink ?? 0), o.r * 1.02, 0, 0]]; // [y, r, x offset, z offset]
  let r = o.r;
  const steps = Math.max(1, o.steps ?? 0);
  const taper = o.taper ?? 0.85;
  // growth terraces: at each, the face steps in on a narrow upward ledge, then flares back out a little less than it
  // stepped in as it rises to the next, so the prism tapers by `taper` over its height in a sawtooth
  const ts = (o.r * (1 - taper)) / steps, e0 = o.ledge ?? o.r * 0.045;
  for (let k = 1; k <= steps; k++) {
    const y = (yS * (k - 0.5 + (rng() - 0.5) * 0.6)) / (steps + 0.5);
    rings.push([y, r, 0, 0]);
    const e = e0 * (0.5 + rng());
    rings.push([y + e * 0.7, r - e, 0, 0]);
    r -= ts;
  }
  rings.push([yS, r, 0, 0]);
  const sk = o.skew ?? 0;
  const ring = ([y, rad, ox, oz], f) => rr.map((q, s) => [Math.cos(aa[s]) * rad * q * (f ? f[s] : 1) + ox, y, Math.sin(aa[s]) * rad * q * (f ? f[s] : 1) + oz]);
  const R = rings.map((g) => ring(g));
  const tris = [];
  for (let i = 0; i < R.length - 1; i++) {
    const A = R[i], B = R[i + 1];
    for (let s = 0; s < n; s++) { const s1 = (s + 1) % n; tris.push([A[s], B[s], B[s1]], [A[s], B[s1], A[s1]]); }
  }
  const T = R[R.length - 1];
  if (o.open) {
    // unfinished: no apex, the growth face flat and stepped up twice toward its middle, as if the next courses
    // of the crystal had been begun and not laid
    let prev = T;
    for (const [f, dy] of [[0.78, 0], [0.78, 1.3], [0.5, 1.3], [0.5, 2.1]]) {
      const cur = ring([yS + dy, r * f, 0, 0]);
      for (let s = 0; s < n; s++) { const s1 = (s + 1) % n; tris.push([prev[s], cur[s], cur[s1]], [prev[s], cur[s1], prev[s1]]); }
      prev = cur;
    }
    const c = [0, yS + 2.1, 0];
    for (let s = 0; s < n; s++) tris.push([prev[s], c, prev[(s + 1) % n]]);
  } else {
    // the termination: a ring of rhombs alternately large and small, then the apex
    const f = rr.map((_, s) => (s % 2 ? 0.48 : 0.66) + rng() * 0.06);
    const M = ring([yS + (len - yS) * 0.42, r, sk * 0.45, 0], f);
    const apex = [sk, len, 0];
    for (let s = 0; s < n; s++) { const s1 = (s + 1) % n; tris.push([T[s], M[s], M[s1]], [T[s], M[s1], T[s1]]); }
    for (let s = 0; s < n; s++) tris.push([M[s], apex, M[(s + 1) % n]]);
  }
  // wind every face outward from the crystal's axis, then place it: twist about the axis, tilt to dir, move to base
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), o.dir);
  const v = new THREE.Vector3();
  const put = (p) => { v.set(p[0], p[1], p[2]).applyQuaternion(q); return [v.x + o.base[0], v.y + o.base[1], v.z + o.base[2]]; };
  for (const [a, b, c] of tris) {
    const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const nx = e1[1] * e2[2] - e1[2] * e2[1], ny = e1[2] * e2[0] - e1[0] * e2[2], nz = e1[0] * e2[1] - e1[1] * e2[0];
    const cy = (a[1] + b[1] + c[1]) / 3, ax = sk * Math.max(0, cy - yS) / Math.max(1e-3, len - yS);
    const ox = (a[0] + b[0] + c[0]) / 3 - ax, oy = cy - Math.min(cy, yS * 0.98), oz = (a[2] + b[2] + c[2]) / 3;
    const out = nx * ox + ny * oy + nz * oz >= 0;
    const pa = put(a), pb = put(out ? b : c), pc = put(out ? c : b);
    P.push(...pa, ...pb, ...pc);
  }
  return tris.length;
}

// The mother crystal, as four pieces (the trunk, the two parallel crystals, the offshoots, the foot's druse), each a
// geometry in shard units to be drawn with one shared instance matrix (matrix). inside(x, z): whether a point of the
// ground lies under the crystal (the litter's shards there are not drawn). colliders, foot: for the caller.
export function motherCrystal(ctx, ground, M) {
  const rng = ctx.makeRng(7741); // its own stream: the litter keeps its places
  const low = ctx.quality === 'low';
  const g0 = ground.heightAt(M.x, M.z);
  const up = (x, y, z) => new THREE.Vector3(x, y, z).normalize();
  // the trunk leans 4 degrees away from the glacier's source (south, down the ice) and a little west
  const lean = up(-0.02, 1, 0.07);
  const pieces = { trunk: [], twins: [], shoots: [], druse: [] };
  let tris = 0;
  const RA = 6.2;
  tris += crystal(pieces.trunk, rng, { base: [0, 0, 0], dir: lean, len: MOTHER_H, r: RA, sink: 5, steps: low ? 14 : 24, term: 0.2, taper: 0.86, skew: 0.8 });
  // the parallel crystals: grown into the trunk's east and north-west flanks, on the same axis
  const twins = [
    { at: [4.6, -1.4], r: 3.9, len: 41, term: 0.24, steps: low ? 9 : 16 },
    { at: [-4.1, 2.3], r: 3.3, len: 29, term: 0.06, steps: low ? 7 : 12, open: true },
  ];
  for (const t of twins) tris += crystal(pieces.twins, rng, { base: [t.at[0], 0, t.at[1]], dir: lean, len: t.len, r: t.r, sink: 5, steps: t.steps, term: t.term, open: t.open, taper: 0.88, skew: t.open ? 0 : 0.3 });
  // offshoots: out of the lower third, leaning 30-65 degrees from upright, 8-24 m long
  const nShoot = low ? 7 : 11;
  const lowShoots = [];
  for (let k = 0; k < nShoot; k++) {
    const phi = (k / nShoot) * TAU + (rng() - 0.5) * 0.5;
    const hb = 1 + Math.pow(rng(), 1.4) * 22;
    const th = 0.5 + rng() * 0.6;
    const len = 8 + rng() * 16 * (1 - hb / 40);
    const dir = up(Math.cos(phi) * Math.sin(th), Math.cos(th), Math.sin(phi) * Math.sin(th));
    const br = RA * 0.55;
    const base = [Math.cos(phi) * br, hb, Math.sin(phi) * br];
    tris += crystal(pieces.shoots, rng, { base, dir, len, r: len * (0.13 + rng() * 0.05), sink: 2, steps: low ? 2 : 4, term: 0.22, taper: 0.9, skew: 0.2 });
    if (hb < 1.7) lowShoots.push({ phi, hb, th, len }); // only a shoot that leaves the trunk below head height is walked into
  }
  // the druse at the foot: crystals of 2-9 m leaning out of the ice round the trunk, thinning outward into the litter
  const nDruse = low ? 22 : 40;
  const druse = [];
  for (let k = 0; k < nDruse; k++) {
    const phi = rng() * TAU, d = RA * (0.75 + Math.pow(rng(), 1.3) * 1.0) + rng() * 2.5;
    const x = Math.cos(phi) * d, z = Math.sin(phi) * d;
    const y = ground.heightAt(M.x + x, M.z + z) - g0;
    const len = (2 + rng() * 7) * (1.2 - Math.min(1, (d - RA) / 10) * 0.5);
    const th = 0.3 + rng() * 0.55;
    const dir = up(Math.cos(phi) * Math.sin(th), Math.cos(th), Math.sin(phi) * Math.sin(th));
    tris += crystal(pieces.druse, rng, { base: [x, y, z], dir, len, r: len * (0.12 + rng() * 0.06), sink: len * 0.25, steps: low ? 0 : 2, term: 0.24, taper: 0.9, skew: 0.1 });
    druse.push({ x, z, r: len * 0.15, d });
  }

  const geos = {};
  for (const k in pieces) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pieces[k], 3));
    g.scale(1 / K, 1 / K, 1 / K);
    g.computeVertexNormals();
    g.computeBoundingSphere();
    geos[k] = g;
  }
  const matrix = new THREE.Matrix4().compose(new THREE.Vector3(M.x, g0, M.z), new THREE.Quaternion(), new THREE.Vector3(K, K, K));

  // the ground it stands on: the trunk and its twins, and the druse's inner ring
  const circles = [{ x: M.x, z: M.z, r: RA * 1.1 }, ...twins.map((t) => ({ x: M.x + t.at[0], z: M.z + t.at[1], r: t.r * 1.1 }))];
  const inside = (x, z) => circles.some((c) => (x - c.x) ** 2 + (z - c.z) ** 2 < c.r * c.r) || druse.some((d) => d.d < RA + 2 && (x - M.x - d.x) ** 2 + (z - M.z - d.z) ** 2 < (d.r + 0.6) ** 2);
  const colliders = [...circles.map((c) => ({ x: c.x, z: c.z, r: c.r * 0.95 })), ...druse.filter((d) => d.r > 0.5).map((d) => ({ x: M.x + d.x, z: M.z + d.z, r: d.r }))];
  for (const s of lowShoots) {
    // an offshoot low enough to walk into: a collider where it crosses head height
    const t = Math.max(0, (1.7 - s.hb) / Math.cos(s.th)), rx = RA * 0.55 + Math.sin(s.th) * Math.max(t, 2);
    colliders.push({ x: M.x + Math.cos(s.phi) * rx, z: M.z + Math.sin(s.phi) * rx, r: 1.2 });
  }
  return { geos, matrix, inside, colliders, tris, g0, foot: RA, top: g0 + MOTHER_H };
}
