// The traveller on the floating cushion: a robed figure sitting cross-legged on a fat tasselled cushion that
// rides a metre above the causeway, his face a gilt mask under a towering wrapped headdress. Behind him,
// on a sagging rope, a covered wagon heaped with treasure floats on a cushion of its own, its useless wheels
// turning anyway, a lantern swinging from its pole. They go the length of the causeway and back, very
// slowly, stopping a moment on the Carillon Flags each time he crosses them. Come within 20 m and he turns his head to you and raises one hand, once; then looks ahead again.
import * as THREE from 'three';
import { clamp, smoothstep } from '../geo.js';
import { Painter, paintedMaterial, makeGround, approach, angDiff } from './kit.js';

const GOLD = '#8a6a30', GOLD_D = '#5e4622', ROBE = '#0f0c0e', VEIL = '#151113', VELVET = '#3a1416', CANOPY = '#17201d', WOOD = '#1c130d', GLOVE = '#070606';
const TAU = Math.PI * 2;

function travellerParts(low) {
  const sides = low ? 10 : 14;
  // ---- body: cushion, a hunched robed mound, sleeves joined in front, a canopy on four poles
  const B = new Painter(['aSway']);
  B.paint(VELVET, 0, 0.92);
  B.lathe(0, 0, 0, [[0.0, 0], [0.5, 0.0], [0.62, 0.05], [0.66, 0.15], [0.62, 0.26], [0.5, 0.3], [0.0, 0.31]], low ? 18 : 24);
  B.paint(GOLD_D, 0.7, 0.5);
  B.ring(0, 0.15, 0, 0.665, 0.012, low ? 24 : 32, 4);
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2, x = Math.cos(a) * 0.66, z = Math.sin(a) * 0.66;
    B.set('aSway', 0.4);
    B.loft([[x, 0.15, z], [x * 1.02, 0.03, z * 1.02], [x * 1.03, -0.07, z * 1.03]], [0.006, 0.006, 0.006], 4);
    B.set('aSway', 1);
    B.lathe(x * 1.03, -0.1, z * 1.03, [[0.0, -0.17], [0.04, -0.15], [0.025, -0.02], [0.012, 0]], 6);
    B.set('aSway', 0);
  }
  // the robe: pools on the cushion, rises narrow, and bows forward at the top; heavy vertical folds
  B.paint(ROBE, 0, 0.97);
  B.grid(low ? 28 : 40, 16, (u, v, o) => {
    const a = u * TAU, y = 0.28 + v * 1.02;
    const r = (0.5 - 0.3 * smoothstep(0, 0.35, v) - 0.08 * smoothstep(0.5, 0.92, v) - 0.06 * smoothstep(0.92, 1, v));
    const fold = 1 + (0.12 * (1 - v) + 0.04) * Math.pow(Math.abs(Math.sin(a * 5 + 0.6 * Math.sin(a * 2))), 0.6) - 0.05;
    const cz = 0.04 + 0.2 * v * v;
    B.set('aSway', smoothstep(0.25, 0, v) * 0.5);
    o[0] = Math.cos(a) * r * fold * 0.95; o[1] = y + (v < 0.02 ? 0.01 * Math.sin(a * 7) : 0); o[2] = cz + Math.sin(a) * r * fold * 0.85;
  }, true, true);
  B.set('aSway', 0);
  // the left sleeve, long, laid across to meet the right in front; nothing shows at the cuffs
  B.loft([[-0.17, 1.2, 0.2], [-0.25, 0.95, 0.32], [-0.18, 0.72, 0.46], [-0.02, 0.66, 0.52]], [0.07, 0.085, 0.1, 0.12], sides);
  // the canopy: four black poles with tarnished finials, a sagging verdigris-black cloth, a ragged valance
  B.paint('#0d0b0a', 0.2, 0.8);
  const C = 0.55, H = 2.45;
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2, x = Math.cos(a) * 0.62, z = Math.sin(a) * 0.62;
    B.loft([[x, 0.2, z], [x, H, z]], [0.018, 0.015], 5);
  }
  B.paint(GOLD_D, 0.7, 0.45);
  for (let k = 0; k < 4; k++) { const a = Math.PI / 4 + (k * Math.PI) / 2; B.blob(Math.cos(a) * 0.62, H + 0.05, Math.sin(a) * 0.62, 0.03, 0.05, 0.03, 6, 4); }
  B.paint(CANOPY, 0, 0.95);
  const ext = 0.44 / 0.62 * 0.62 / Math.SQRT2 * 1.42;
  B.sheet(10, 10, (u, v, o) => {
    const x = (u - 0.5) * 2 * ext, z = (v - 0.5) * 2 * ext;
    o[0] = x; o[1] = H - 0.12 * (1 - (2 * u - 1) ** 2) * (1 - (2 * v - 1) ** 2) + 0.01; o[2] = z;
  });
  const edges = [[-1, -1, 1, -1], [1, -1, 1, 1], [1, 1, -1, 1], [-1, 1, -1, -1]];
  for (const [x0, z0, x1, z1] of edges) {
    B.sheet(16, 3, (u, v, o) => {
      B.set('aSway', v * 1.2);
      o[0] = (x0 + (x1 - x0) * u) * ext; o[2] = (z0 + (z1 - z0) * u) * ext;
      o[1] = H + 0.01 - v * (0.26 + 0.07 * Math.sin(u * 23 + x0 * 3) + 0.04 * Math.sin(u * 51));
    });
  }
  B.set('aSway', 0);
  const body = B.geometry();

  // ---- right arm, about the shoulder: a long sleeve; inside it a black-gloved hand, too long, ringed
  const A = new Painter();
  A.paint(ROBE, 0, 0.97);
  A.loft([[0, 0, 0], [0.08, -0.25, 0.12], [0.01, -0.48, 0.26], [-0.15, -0.54, 0.32]], [0.07, 0.085, 0.1, 0.12], sides);
  A.paint(GLOVE, 0.15, 0.55);
  const hc = [-0.2, -0.55, 0.34], d = [-0.85, -0.1, 0.5];
  A.loft([[-0.1, -0.53, 0.31], hc], [0.03, 0.028], 6);
  for (let f = 0; f < 4; f++) {
    const off = (f - 1.5) * 0.02;
    const b0 = [hc[0], hc[1] + off * 0.3, hc[2] + off];
    A.loft([b0, [b0[0] + d[0] * 0.08, b0[1] + d[1] * 0.08 - 0.01, b0[2] + d[2] * 0.08], [b0[0] + d[0] * 0.17, b0[1] + d[1] * 0.17 - 0.03, b0[2] + d[2] * 0.17], [b0[0] + d[0] * 0.24, b0[1] + d[1] * 0.24 - 0.06, b0[2] + d[2] * 0.24]], [0.009, 0.008, 0.007, 0.003], 4);
  }
  A.paint('#c8a050', 0.95, 0.18, 0.5);
  { const b0 = [hc[0], hc[1] - 0.005, hc[2] - 0.01]; const r = [b0[0] + d[0] * 0.09, b0[1] + d[1] * 0.09 - 0.01, b0[2] + d[2] * 0.09];
    A.xf(new THREE.Matrix4().makeTranslation(r[0], r[1], r[2]).multiply(new THREE.Matrix4().makeRotationY(Math.atan2(d[0], d[2]))).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)));
    A.ring(0, 0, 0, 0.012, 0.0045, 10, 4); A.xf(null); }
  const arm = A.geometry();

  // ---- head, on a neck too long, bowed: a narrow veiled shape, the veil falling to the chest. No face.
  const Hd = new Painter(['aSway']);
  Hd.paint(VEIL, 0, 0.96);
  Hd.grid(low ? 16 : 22, 12, (u, v, o) => {
    const a = u * TAU, y = 0.4 - v * 1.05;
    const head = Math.sin(Math.min(1, v / 0.28) * Math.PI * 0.5);
    const r = v < 0.28 ? 0.1 * head : 0.1 + 0.13 * smoothstep(0.28, 1, v);
    const fold = 1 + 0.1 * v * Math.abs(Math.sin(a * 5));
    Hd.set('aSway', smoothstep(0.35, 1, v));
    o[0] = Math.cos(a) * r * fold; o[1] = y; o[2] = 0.05 + 0.1 * v + Math.sin(a) * r * fold * 1.1;
  }, true, false);
  const head = Hd.geometry();
  return { body, arm, head };
}

function wagonParts(low, noise) {
  const W = new Painter();
  const sides = low ? 12 : 18;
  // cushion: an elliptical pillow
  W.paint(VELVET, 0, 0.92);
  const pts = [], rad = [];
  for (let k = 0; k <= 12; k++) {
    const z = -1.84 + (k / 12) * 3.68, e = Math.sqrt(Math.max(0.001, 1 - (z / 1.85) ** 2));
    pts.push([0, 0, z]); rad.push([1.15 * e, 0.24 * Math.sqrt(e)]);
  }
  W.loft(pts, rad, sides, 0, true);
  W.paint(GOLD, 0.85, 0.35);
  W.ring(0, 0, 0, 1, 0.025, 48, 5, 1.15, 1.85);
  for (const a of [0.7, Math.PI - 0.7, Math.PI + 0.7, -0.7]) {
    const x = Math.cos(a) * 1.15, z = Math.sin(a) * 1.85;
    W.loft([[x, 0, z], [x * 1.01, -0.14, z * 1.01], [x * 1.02, -0.22, z * 1.02]], [0.012, 0.012, 0.012], 4);
    W.blob(x * 1.02, -0.24, z * 1.02, 0.04, 0.04, 0.04, 6, 4);
    W.lathe(x * 1.02, -0.26, z * 1.02, [[0.0, -0.26], [0.08, -0.23], [0.045, -0.02], [0.03, 0]], 8);
  }
  // bed
  W.paint(WOOD, 0, 0.82);
  W.box(0, 0.42, 0, 1.3, 0.4, 2.6);
  W.paint('#100a06', 0, 0.9);
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) W.box(s * 0.655, 0.29 + k * 0.13, 0, 0.012, 0.02, 2.5);
  W.paint(GOLD, 0.85, 0.35);
  for (const s of [-1, 1]) { W.box(s * 0.665, 0.625, 0, 0.04, 0.05, 2.64); W.box(0, 0.625, s * 1.32, 1.36, 0.05, 0.04); }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    W.paint(GOLD_D, 0.6, 0.5);
    W.box(sx * 0.66, 0.42, sz * 1.31, 0.11, 0.44, 0.11);
    W.paint(GOLD, 0.85, 0.35);
    W.blob(sx * 0.66, 0.7, sz * 1.31, 0.055, 0.055, 0.055, 8, 5);
  }
  // the tarpaulin, heaped over whatever is under it, roped down
  const lumps = [[-0.3, 0.6, 0.32], [0.25, -0.5, 0.38], [0.1, 0.05, 0.22], [-0.35, -0.9, 0.25], [0.3, 1.0, 0.2]];
  const tarp = (u, v, o) => {
    const x = (u - 0.5) * 1.52, z = (v - 0.5) * 2.84;
    const au = Math.abs(2 * u - 1), av = Math.abs(2 * v - 1);
    let h = 0.78 * Math.pow(Math.max(0, 1 - Math.pow(au, 2.6)), 0.7) * Math.pow(Math.max(0, 1 - Math.pow(av, 3)), 0.6);
    for (const [lx, lz, a] of lumps) h += a * Math.exp(-((x - lx) ** 2 + (z - lz) ** 2) / 0.12) * (h > 0.2 ? 1 : h / 0.2);
    h += noise.noise2(x * 2.6, z * 2.6) * 0.05 * smoothstep(0, 0.3, h);
    const drape = smoothstep(0.86, 1, au) * 0.2 + smoothstep(0.9, 1, av) * 0.16;
    o[0] = x; o[1] = 0.63 + h - drape; o[2] = z;
    return o;
  };
  W.paint('#221f1a', 0, 0.95);
  W.sheet(low ? 18 : 26, low ? 24 : 34, tarp);
  W.paint('#120e0a', 0, 0.95);
  const tp = [0, 0, 0];
  for (const vz of [0.18, 0.42, 0.62, 0.84]) {
    const rp = [], rr = [];
    for (let k = 0; k <= 14; k++) { tarp(0.02 + (k / 14) * 0.96, vz, tp); rp.push([tp[0], tp[1] + 0.012, tp[2]]); rr.push(0.014); }
    W.loft(rp, rr, 4, 0, false);
  }
  // what pokes out from under it: a rolled carpet, the gilt corner of a frame
  W.paint('#2a0e12', 0, 0.9);
  W.loft([[-0.78, 0.76, -1.24], [0.92, 0.8, -1.28]], [0.095, 0.095], 10);
  W.paint(GOLD, 0.85, 0.35);
  W.box(0.55, 0.95, -1.36, 0.46, 0.38, 0.05, 0.35);
  W.paint('#1a1210', 0.1, 0.6);
  W.box(0.55, 0.95, -1.385, 0.36, 0.28, 0.01, 0.35);
  // spilled on the cushion: a chalice on its side, a jewelled box with its lid ajar, a long case, coins
  const m = new THREE.Matrix4(), r = new THREE.Matrix4();
  W.paint('#a07a38', 0.9, 0.32);
  W.xf(m.makeTranslation(0.88, 0.16, 0.45).multiply(r.makeRotationZ(1.45)).multiply(new THREE.Matrix4().makeRotationY(0.6)));
  W.lathe(0, -0.12, 0, [[0.055, 0], [0.018, 0.025], [0.014, 0.11], [0.03, 0.13], [0.065, 0.19], [0.072, 0.25], [0.05, 0.24]], 12);
  W.xf(null);
  for (let k = 0; k < 6; k++) W.lathe(0.75 + Math.sin(k * 2.3) * 0.12, 0.2 + k * 0.004, 0.68 + Math.cos(k * 1.7) * 0.14, [[0.022, 0], [0.022, 0.006]], 8);
  W.paint('#24080c', 0.3, 0.6);
  W.box(-0.88, 0.25, -0.55, 0.22, 0.12, 0.16, 0.4);
  W.xf(m.makeTranslation(-0.88, 0.33, -0.55).multiply(r.makeRotationY(0.4)).multiply(new THREE.Matrix4().makeRotationX(-0.5)).multiply(new THREE.Matrix4().makeTranslation(0, 0.02, -0.07)));
  W.box(0, 0, 0, 0.23, 0.04, 0.17);
  W.xf(null);
  W.paint(GOLD, 0.85, 0.35);
  W.box(-0.88, 0.315, -0.55, 0.235, 0.012, 0.172, 0.4);
  for (const [col, ox] of [['#ff2040', -0.06], ['#30ff90', 0], ['#4080ff', 0.06]]) {
    W.paint(col, 0.2, 0.15, 0.5);
    W.blob(-0.88 + Math.cos(0.4) * ox + Math.sin(0.4) * 0.082, 0.25, -0.55 - Math.sin(0.4) * ox + Math.cos(0.4) * 0.082, 0.014, 0.014, 0.01, 6, 3);
  }
  W.paint('#1c0e0b', 0.1, 0.8);
  W.box(0.42, 0.2, 1.5, 0.17, 0.12, 1.1, 0.55);
  W.paint(GOLD, 0.85, 0.35);
  for (const o of [-0.3, 0.3]) W.box(0.42 + Math.sin(0.55) * o, 0.2, 1.5 + Math.cos(0.55) * o, 0.18, 0.125, 0.04, 0.55);
  // the lantern pole, with a curled arm reaching forward; the shaft the rope is tied to
  W.paint(WOOD, 0, 0.8);
  W.loft([[-0.58, 0.6, 1.2], [-0.58, 2.9, 1.2]], [0.035, 0.03], 6);
  W.loft([[-0.58, 2.86, 1.2], [-0.58, 2.96, 1.5], [-0.58, 2.94, 1.75], [-0.58, 2.86, 1.82], [-0.58, 2.82, 1.76]], [0.025, 0.022, 0.02, 0.016, 0.012], 5);
  W.loft([[0, 0.38, 1.25], [0, 0.34, 2.55]], [0.045, 0.035], 6);
  W.paint(GOLD, 0.85, 0.35);
  W.loft([[0, 0.34, 2.5], [0, 0.34, 2.62]], [0.045, 0.04], 6);
  W.blob(-0.58, 2.93, 1.2, 0.05, 0.05, 0.05, 6, 4);
  // axles under the bed
  W.paint('#1e140c', 0.3, 0.6);
  for (const z of [-0.85, 0.85]) W.loft([[-1.12, 0.35, z], [1.12, 0.35, z]], [0.03, 0.03], 5);
  const wagon = W.geometry();

  // wheels: built about the x axis
  const R = new Painter();
  const rm = new THREE.Matrix4().makeRotationZ(Math.PI / 2);
  R.xf(rm);
  R.paint(WOOD, 0, 0.8);
  R.ring(0, 0, 0, 0.48, 0.035, low ? 20 : 28, 5);
  R.paint(GOLD_D, 0.8, 0.4);
  R.ring(0, 0, 0, 0.5, 0.012, low ? 20 : 28, 4);
  R.lathe(0, -0.07, 0, [[0.07, 0], [0.08, 0.07], [0.06, 0.14], [0.0, 0.15]], 10);
  R.paint(WOOD, 0, 0.8);
  for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; R.loft([[Math.cos(a) * 0.07, 0, Math.sin(a) * 0.07], [Math.cos(a) * 0.46, 0, Math.sin(a) * 0.46]], [0.018, 0.013], 4); }
  R.xf(null);
  const wheel = R.geometry();

  // lantern, hanging from its hook (pivot at origin)
  const Lt = new Painter();
  Lt.paint(GOLD_D, 0.8, 0.45);
  Lt.loft([[0, 0, 0], [0, -0.12, 0]], [0.006, 0.006], 4);
  Lt.ring(0, -0.015, 0, 0.018, 0.005, 10, 4);
  Lt.lathe(0, -0.2, 0, [[0.1, 0], [0.04, 0.06], [0.015, 0.09], [0.0, 0.1]], 8);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) Lt.box(sx * 0.068, -0.31, sz * 0.068, 0.018, 0.22, 0.018);
  Lt.box(0, -0.43, 0, 0.17, 0.03, 0.17);
  Lt.paint('#ffb466', 0, 0.3, 3.2);
  Lt.box(0, -0.31, 0, 0.12, 0.2, 0.12);
  const lantern = Lt.geometry();
  return { wagon, wheel, lantern };
}

export function buildTraveller(ctx, U) {
  const { scene, camera, causeway, noise } = ctx;
  const ground = makeGround(ctx);
  const low = ctx.quality === 'low';
  const T = travellerParts(low), Wg = wagonParts(low, noise);
  const mat = paintedMaterial({ side: THREE.DoubleSide }, undefined, true);
  const matD = paintedMaterial({ side: THREE.DoubleSide }, undefined, true);
  const matL = paintedMaterial();
  const mk = (g, m, name, shadow = true) => { const o = new THREE.Mesh(g, m); o.name = name; o.castShadow = shadow; o.receiveShadow = true; return o; };

  const trav = new THREE.Group();
  trav.add(mk(T.body, mat, 'uncanny-traveller'));
  const headPivot = new THREE.Group(); headPivot.position.set(0, 1.5, 0.32); headPivot.add(mk(T.head, mat, 'uncanny-traveller-head'));
  const armPivot = new THREE.Group(); armPivot.position.set(0.17, 1.2, 0.2); armPivot.add(mk(T.arm, mat, 'uncanny-traveller-arm'));
  trav.add(headPivot, armPivot);
  const wagon = new THREE.Group();
  wagon.add(mk(Wg.wagon, matD, 'uncanny-wagon'));
  const wheels = new THREE.InstancedMesh(Wg.wheel, mat, 4);
  wheels.name = 'uncanny-wagon-wheels'; wheels.castShadow = true; wheels.receiveShadow = true;
  wagon.add(wheels);
  const lanternPivot = new THREE.Group(); lanternPivot.position.set(-0.58, 2.84, 1.76);
  lanternPivot.add(mk(Wg.lantern, matL, 'uncanny-wagon-lantern', false));
  const light = new THREE.PointLight(new THREE.Color('#ffa65a'), 2.6, 9, 2);
  light.position.set(0, -0.31, 0);
  lanternPivot.add(light);
  wagon.add(lanternPivot);
  scene.add(trav, wagon);

  // the rope: a tube rebuilt in place every frame
  const RS = 20, RD = 5;
  const ropeGeo = new THREE.BufferGeometry();
  const rpos = new Float32Array((RS + 1) * RD * 3), rnor = new Float32Array((RS + 1) * RD * 3), ridx = [];
  for (let k = 0; k < RS; k++) for (let s = 0; s < RD; s++) {
    const a = k * RD + s, b = k * RD + (s + 1) % RD, c = (k + 1) * RD + (s + 1) % RD, d = (k + 1) * RD + s;
    ridx.push(a, d, c, a, c, b);
  }
  ropeGeo.setAttribute('position', new THREE.BufferAttribute(rpos, 3).setUsage(THREE.DynamicDrawUsage));
  ropeGeo.setAttribute('normal', new THREE.BufferAttribute(rnor, 3).setUsage(THREE.DynamicDrawUsage));
  ropeGeo.setIndex(ridx);
  const rope = new THREE.Mesh(ropeGeo, new THREE.MeshStandardMaterial({ color: 0x5a4a30, roughness: 0.95 }));
  rope.name = 'uncanny-wagon-rope'; rope.frustumCulled = false; rope.castShadow = true; rope.receiveShadow = true;
  scene.add(rope);

  // ---- the route: out along one side of the causeway, a slow loop at the far end, back along the other
  const ctrl = [];
  const OFF = 0.9;
  const segDir = (i) => { const a = causeway[i], b = causeway[i + 1], l = Math.hypot(b.x - a.x, b.z - a.z); return [(b.x - a.x) / l, (b.z - a.z) / l]; };
  const side = (sgn) => {
    const out = [];
    for (let i = 0; i < causeway.length - 1; i++) {
      const a = causeway[i], b = causeway[i + 1], [dx, dz] = segDir(i), l = Math.hypot(b.x - a.x, b.z - a.z);
      const n = Math.max(2, Math.round(l / 6));
      for (let k = (i === 0 ? 1 : 0); k < n; k++) {
        const t = k / n; out.push(new THREE.Vector3(a.x + (b.x - a.x) * t - dz * OFF * sgn, 0, a.z + (b.z - a.z) * t + dx * OFF * sgn));
      }
    }
    return out;
  };
  const loopAt = (end, dir, inward) => {
    // centre pulled back from the road's end; swing round through the verge
    const cx = end.x - dir[0] * inward, cz = end.z - dir[1] * inward, R = 3.4, out = [];
    const a0 = Math.atan2(dir[0], -dir[1]); // the +normal side, (-dz, dx)
    for (let k = 1; k < 8; k++) { const a = a0 - (k / 8) * Math.PI; out.push(new THREE.Vector3(cx + Math.cos(a) * R, 0, cz + Math.sin(a) * R)); }
    return out;
  };
  const nC = causeway.length;
  const outward = side(1);
  const endDir = segDir(nC - 2), startDir = segDir(0);
  ctrl.push(...outward.slice(0, -1));
  ctrl.push(...loopAt(causeway[nC - 1], endDir, 6));
  ctrl.push(...side(-1).reverse().slice(1, -1));
  ctrl.push(...loopAt(causeway[0], [-startDir[0], -startDir[1]], -3));
  const curve = new THREE.CatmullRomCurve3(ctrl, true, 'centripetal');
  const L = curve.getLength();
  const NP = Math.ceil(L / 0.5);
  const route = curve.getSpacedPoints(NP); // route[k] at arc length k*L/NP
  const step = L / NP;
  const routeAt = (s, out) => {
    s = ((s % L) + L) % L;
    const f = s / step, k = Math.floor(f), t = f - k, a = route[k], b = route[(k + 1) % NP];
    out.x = a.x + (b.x - a.x) * t; out.z = a.z + (b.z - a.z) * t; return out;
  };
  const p0 = { x: 0, z: 0 }, p1 = { x: 0, z: 0 };
  const headingAt = (s) => { routeAt(s - 1.2, p0); routeAt(s + 1.2, p1); return Math.atan2(p1.x - p0.x, p1.z - p0.z); };

  const S = { s: 60, speed: 0.8, yawT: 0, yawW: 0, headYaw: 0, arm: 0, greet: 'idle', greetT: 0, greeted: false, spin: 0, hold: false };
  S.yawT = headingAt(S.s); S.yawW = headingAt(S.s - 5.0);
  const colT = { x: 0, z: 0, r: 0.75 }, colW = { x: 0, z: 0, r: 1.4 };
  ctx.addCollider(colT); ctx.addCollider(colW);
  const pub = ctx.traveller = { position: trav.position, wagonPosition: wagon.position, greeting: false };
  const cam = camera.position;
  const tmp = { x: 0, z: 0 }, A = new THREE.Vector3(), Bv = new THREE.Vector3(), Pm = new THREE.Vector3(), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(1, 1, 1), pv = new THREE.Vector3();
  const GAP = 5.0;

  function place(dt, t) {
    routeAt(S.s, tmp);
    const gT = ground.at(tmp.x, tmp.z);
    trav.position.set(tmp.x, gT + 1.02 + Math.sin(t * 0.6) * 0.035, tmp.z);
    S.yawT += angDiff(headingAt(S.s), S.yawT) * Math.min(1, dt * 1.5);
    trav.rotation.set(0, S.yawT, 0);
    routeAt(S.s - GAP, tmp);
    const gW = ground.at(tmp.x, tmp.z);
    wagon.position.set(tmp.x, gW + 0.98 + Math.sin(t * 0.7 + 1.3) * 0.07, tmp.z);
    S.yawW += angDiff(headingAt(S.s - GAP), S.yawW) * Math.min(1, dt * 1.2);
    // pitch to the lie of the ground under its length
    const fx = Math.sin(S.yawW), fz = Math.cos(S.yawW);
    const pitch = Math.atan2(ground.at(tmp.x - fx * 1.5, tmp.z - fz * 1.5) - ground.at(tmp.x + fx * 1.5, tmp.z + fz * 1.5), 3) * 0.7;
    wagon.rotation.set(pitch + Math.sin(t * 0.6) * 0.02, S.yawW, Math.sin(t * 0.47 + 2) * 0.035, 'YXZ');
    colT.x = trav.position.x; colT.z = trav.position.z; colW.x = wagon.position.x; colW.z = wagon.position.z;
  }
  // the Carillon Flags (built by ruins2, perhaps after us): he stops a moment on them, as if listening
  let flags = null, flagsT = 0, pauseT = 0, pausedHere = false;
  function flagsCentre() {
    const caps = ctx.carillon?.caps;
    if (!caps || !caps.length) return null;
    let x = 0, z = 0; for (const c of caps) { x += c.x; z += c.z; }
    return { x: x / caps.length, z: z / caps.length };
  }
  const ROPE_NEAR = 60;
  function update(dt, t) {
    const dx = cam.x - trav.position.x, dz = cam.z - trav.position.z, dist = Math.hypot(dx, dz);
    if (!flags && (flagsT -= dt) <= 0) { flagsT = 2; flags = flagsCentre(); }
    if (flags) {
      const fd = Math.hypot(trav.position.x - flags.x, trav.position.z - flags.z);
      if (fd > 14) pausedHere = false;
      else if (!pausedHere && fd < 1.6) { pausedHere = true; pauseT = 3.2; }
    }
    if (pauseT > 0) pauseT -= dt;
    S.pausing = pauseT > 0;
    // wait for anyone standing in the way
    const ahead = (dx * Math.sin(S.yawT) + dz * Math.cos(S.yawT));
    const blocked = dist < 2.6 && ahead > 0;
    const target = S.hold || blocked || pauseT > 0 ? 0 : 0.8;
    mat.userData.uT.value = t; matD.userData.uT.value = t;
    S.speed = approach(S.speed, target, 1.2, dt);
    S.s += S.speed * dt;
    place(dt, t);
    // greeting: once per encounter
    if (dist > 40) S.greeted = false;
    S.greetT += dt;
    if (S.greet === 'idle' && !S.greeted && dist < 20) { S.greet = 'look'; S.greetT = 0; }
    let lookAt = false;
    if (S.greet === 'look') { lookAt = true; if (S.greetT > 1.0) { S.greet = 'raise'; S.greetT = 0; ctx.audio?.cue?.('traveller-greet', trav.position); } }
    else if (S.greet === 'raise') { lookAt = true; S.arm = smoothstep(0, 1.3, S.greetT); if (S.greetT > 3.2) { S.greet = 'lower'; S.greetT = 0; } }
    else if (S.greet === 'lower') { lookAt = S.greetT < 0.8; S.arm = 1 - smoothstep(0, 1.3, S.greetT); if (S.greetT > 2.2) { S.greet = 'idle'; S.greeted = true; S.arm = 0; } }
    pub.greeting = S.greet !== 'idle';
    const want = lookAt ? clamp(angDiff(Math.atan2(dx, dz), S.yawT), -1.5, 1.5) : 0;
    S.headYaw = approach(S.headYaw, want, 2.2, dt);
    headPivot.rotation.set(0.12, S.headYaw, 0, 'YXZ');
    armPivot.rotation.set(-2.4 * S.arm, 0, -0.5 * S.arm, 'ZYX');
    // wheels turn though they touch nothing
    S.spin += (S.speed / 0.48) * dt;
    for (let i = 0; i < 4; i++) {
      e.set(S.spin + i * 0.7, 0, 0); q.setFromEuler(e); pv.set(i < 2 ? -1.16 : 1.16, 0.35, i % 2 ? 0.85 : -0.85);
      m4.compose(pv, q, sc); wheels.setMatrixAt(i, m4);
    }
    wheels.instanceMatrix.needsUpdate = true;
    // lantern: a pendulum, kicked by the bobbing
    lanternPivot.rotation.set(Math.sin(t * 1.9) * 0.16 * (0.4 + S.speed) + Math.sin(t * 0.7) * 0.05, 0, Math.sin(t * 1.33 + 1) * 0.08);
    const fl = 0.92 + 0.08 * Math.sin(t * 13.1) * Math.sin(t * 7.7);
    light.intensity = 2.6 * fl; matL.userData.uEmit.value = fl;
    // rope: from the back of his cushion to the tip of the wagon's shaft, sagging as the gap closes. A 3 cm
    // rope is under a pixel past 60 m: there it is hidden and not rebuilt (v3 stage 2; ?throttle=0 keeps it)
    rope.visible = dist < ROPE_NEAR || ctx.throttle === false;
    if (!rope.visible) return;
    trav.updateMatrixWorld(); wagon.updateMatrixWorld();
    A.set(0, 0.13, -0.6).applyMatrix4(trav.matrixWorld); // (scaled with him)
    Bv.set(0, 0.34, 2.6).applyMatrix4(wagon.matrixWorld);
    const span = A.distanceTo(Bv), sag = 0.12 + Math.max(0, 1.6 - span) * 0.5 + Math.sin(t * 1.1) * 0.02;
    for (let k = 0; k <= RS; k++) {
      const u = k / RS;
      Pm.lerpVectors(A, Bv, u); Pm.y -= sag * 4 * u * (1 - u);
      // tangent-free ring: the rope is thin, a ring in the plane perpendicular to the span is close enough
      const tx = Bv.x - A.x, tz = Bv.z - A.z, tl = Math.hypot(tx, tz) || 1, nx = -tz / tl, nz = tx / tl;
      for (let s2 = 0; s2 < RD; s2++) {
        const an = (s2 / RD) * Math.PI * 2, c = Math.cos(an), sn = Math.sin(an), o = (k * RD + s2) * 3;
        rnor[o] = nx * c; rnor[o + 1] = sn; rnor[o + 2] = nz * c;
        rpos[o] = Pm.x + nx * c * 0.016; rpos[o + 1] = Pm.y + sn * 0.016; rpos[o + 2] = Pm.z + nz * c * 0.016;
      }
    }
    ropeGeo.attributes.position.needsUpdate = true; ropeGeo.attributes.normal.needsUpdate = true;
  }
  place(0, 0);
  ctx.registerUpdate(update, { at: () => trav.position, near: 120, hz: 5 }); // v3: 5 Hz beyond 120 m

  U.traveller = Object.assign(pub, {
    state: S, route, length: L,
    // test hook: move the pair so the traveller is at the route point nearest (x, z), and optionally hold them there
    teleportTo(x, z, hold = true) {
      let best = 0, bd = 1e9;
      for (let k = 0; k < NP; k++) { const d = (route[k].x - x) ** 2 + (route[k].z - z) ** 2; if (d < bd) { bd = d; best = k; } }
      S.s = best * step; S.hold = hold; S.yawT = headingAt(S.s); S.yawW = headingAt(S.s - GAP); place(0, ctx.time.t);
      return { x: trav.position.x, z: trav.position.z, yaw: S.yawT };
    },
    greetNow(phase = 'raise', at = 2.0) { S.greet = phase; S.greetT = at; S.headYaw = clamp(angDiff(Math.atan2(cam.x - trav.position.x, cam.z - trav.position.z), S.yawT), -1.5, 1.5); },
    release() { S.hold = false; },
  });
  const tris = (g) => (g.index ? g.index.count : g.attributes.position.count) / 3;
  return { drawCalls: 7, tris: tris(T.body) + tris(T.arm) + tris(T.head) + tris(Wg.wagon) + tris(Wg.wheel) * 4 + tris(Wg.lantern) + RS * RD * 2 };
}
