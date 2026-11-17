// The Lappet's people (v15-P1): eight villagers, each one person doing one thing, in one draw. Who they are and where:
// src/v15/people/folk.js (and their story files, stories/README.md). The figure kit: src/v15/people/body.js.
//
// One SkinnedMesh for all of them: every figure is eight bones (its place, torso, head, two arms of two, a prop) and
// one more bone, the first, holds what lies still in the world (a cap left on a stone head). A bone's matrix is the
// part's whole world transform, written each frame by its figure (src/v7/workers/rig.js's helpers: pivot, arm2), so
// the geometry is never touched after the build; three skins it from a bone texture, in the shadow pass too. A pose
// change nudges the mesh's scale by a part in a million so the shadow cadence (src/shadows.js) redraws (rig.js's trick).
// Each figure's update runs every frame within 45 m of it and is held still beyond. No point light; nothing glows but
// the noon in a jug. Low hides the mesh from far off with the rest of the village (ctx.lappet.farHidden).
// ctx.people = { figs: [{ id, name, at, state }], mesh, stats() }. ?people=0 leaves them out.
import * as THREE from 'three';
import { clamp } from '../../noise.js';
import { angDiff, paintedMaterial } from '../../fauna/uncanny/kit.js';
import { rigPainter, pivot, arm2, waitFor } from '../../v7/workers/rig.js';
import { figure, joints, BONE, ARM } from './body.js';
import { FOLK } from './folk.js';

const I4 = new THREE.Matrix4();
const POLE_R = new THREE.Vector3(-0.6, -1, -0.4), POLE_L = new THREE.Vector3(0.6, -1, -0.4);
const _s = new THREE.Vector3(), _h = new THREE.Vector3(), _sc = new THREE.Vector3();

// A posed figure: its bones, where it stands and what its body is doing. The folk's own code sets the pose fields and
// calls apply(); the hands are in the figure's own frame (+z forward, metres, before its size).
export class Fig {
  constructor(bones, base, spec) {
    this.b = bones.slice(base, base + BONE.n).map((bone) => bone.matrixWorld);
    this.spec = spec; this.J = joints(spec);
    this.x = spec.at.x; this.y = spec.at.y; this.z = spec.at.z; this.yaw = spec.at.yaw; this.k = spec.scale || 1;
    this.lean = 0; this.twist = 0; this.roll = 0; this.hy = 0; this.hp = 0; this.hr = 0;
    this.hR = new THREE.Vector3(-0.12, this.J.sh - 0.42, 0.15); this.hL = new THREE.Vector3(0.12, this.J.sh - 0.42, 0.15);
    this.place = new THREE.Matrix4(); this.torsoL = new THREE.Matrix4(); this.propL = new THREE.Matrix4(); this.propWorld = false;
    this.lookK = 0; // 0..1: how far the head is turned to the walker
  }
  // the head toward the walker within `R` m (eased), else toward (idleYaw, idlePitch) relative to the torso
  look(cam, dt, R = 6, idleYaw = 0, idlePitch = 0, lim = 1.15) {
    const dx = cam.x - this.x, dz = cam.z - this.z, d = Math.hypot(dx, dz);
    const near = d < R;
    this.lookK = clamp(this.lookK + (near ? dt / 0.7 : -dt / 1.2), 0, 1);
    const rel = clamp(angDiff(Math.atan2(dx, dz), this.yaw + this.twist), -lim, lim);
    const headY = this.y + (this.J.head[1] + 0.05) * this.k;
    const pit = clamp(-Math.atan2(cam.y - headY, Math.max(0.5, d)), -0.5, 0.8);
    const e = this.lookK * this.lookK * (3 - 2 * this.lookK);
    this.hy = idleYaw + (rel - idleYaw) * e; this.hp = idlePitch + (pit - idlePitch) * e;
    return d;
  }
  placeNow() { return this.place.makeRotationY(this.yaw).scale(_sc.set(this.k, this.k, this.k)).setPosition(this.x, this.y, this.z); }
  apply() {
    const J = this.J, P = this.placeNow();
    this.b[BONE.place].copy(P);
    pivot(this.torsoL, I4, J.hip[0], J.hip[1], J.hip[2], this.lean, this.twist, this.roll);
    this.b[BONE.torso].multiplyMatrices(P, this.torsoL);
    pivot(this.b[BONE.head], this.b[BONE.torso], J.neck[0], J.neck[1], J.neck[2], this.hp, this.hy, this.hr);
    arm2(this.b[BONE.rU], this.b[BONE.rF], P, _s.set(-J.shx, J.sh, 0).applyMatrix4(this.torsoL), _h.copy(this.hR), ARM.up, ARM.fore, POLE_R);
    arm2(this.b[BONE.lU], this.b[BONE.lF], P, _s.set(J.shx, J.sh, 0).applyMatrix4(this.torsoL), _h.copy(this.hL), ARM.up, ARM.fore, POLE_L);
    if (this.propWorld) this.b[BONE.prop].copy(this.propL); else this.b[BONE.prop].multiplyMatrices(P, this.propL);
  }
  // a point in the figure's frame to the world
  toWorld(v, out) { return out.copy(v).applyMatrix4(this.place); }
}

export async function build(ctx) {
  const url = new URL(location.href);
  if (url.searchParams.get('people') === '0') { ctx.people = { off: true }; return; }
  const lappet = await waitFor(() => ctx.lappet, 60000);
  if (!lappet || lappet.on === false) { ctx.people = { off: true }; return; }
  // the quarters build in parallel with this module: their places are what the folk stand by
  const Q = {};
  for (const k of ['quarrels', 'rungs', 'lees', 'pennyworth']) Q[k] = await waitFor(() => ctx[k], 60000);
  const low = ctx.quality === 'low', plan = ctx.lappet.plan;
  const folk = FOLK.map((F) => ({ F, at: F.place(ctx, plan, Q) })).filter((f) => f.at);
  const nb = 1 + folk.length * BONE.n;
  const bones = Array.from({ length: nb }, () => { const b = new THREE.Bone(); b.matrixAutoUpdate = false; b.matrixWorldAutoUpdate = false; return b; });
  const P = rigPainter();
  const figs = [];
  folk.forEach(({ F, at }, i) => {
    const base = 1 + i * BONE.n, spec = { ...F.body, at, base };
    figure(P, spec, low);
    const fig = new Fig(bones, base, spec);
    fig.id = F.id; fig.name = F.name;
    F.props?.(P, base, fig, at, low);  // what they hold and what lies by them, painted on their bones
    P.bone(0); F.still?.(P, at, low, plan);   // what they left lying in the world
    fig.state = F.init ? F.init(fig, at, ctx) : {};
    figs.push({ F, fig, at });
  });
  const geo = P.geometry(), n = geo.attributes.position.count, ab = geo.attributes.aBone.array;
  const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) { si[i * 4] = ab[i]; sw[i * 4] = 1; }
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  geo.deleteAttribute('aBone');
  const mat = paintedMaterial({ side: THREE.DoubleSide });
  const mesh = new THREE.SkinnedMesh(geo, mat);
  mesh.name = 'lappet-people'; mesh.frustumCulled = false; mesh.castShadow = true; mesh.receiveShadow = true;
  const skeleton = new THREE.Skeleton(bones, bones.map(() => new THREE.Matrix4()));
  mesh.bind(skeleton, new THREE.Matrix4());
  ctx.scene.add(mesh);
  ctx.lappet.farHidden.push(mesh);
  let flip = 0;
  const posed = () => { flip ^= 1; mesh.scale.x = 1 + flip * 1e-6; };
  const cam = ctx.camera.position;
  for (const { F, fig } of figs) {
    F.update(fig, 0, 0, cam, fig.state); fig.apply();
    for (const c of F.colliders?.(fig) || []) ctx.addCollider(c);
    ctx.registerUpdate((dt, t) => { F.update(fig, Math.min(dt, 0.25), t, cam, fig.state); fig.apply(); posed(); }, { pos: { x: fig.x, z: fig.z }, near: 45, hz: 0 });
  }
  const tris = (geo.index ? geo.index.count : n) / 3;
  ctx.people = { figs: figs.map(({ F, fig }) => ({ id: F.id, name: F.name, story: F.story, at: { x: fig.x, y: fig.y, z: fig.z, yaw: fig.yaw }, state: fig.state, fig })), mesh, stats: () => ({ draws: 1, triangles: tris, figures: figs.length, bones: nb, lights: 0 }) };
  ctx.log?.(`people: ${figs.length} figures, ${tris} triangles, ${nb} bones, one draw`);
}
