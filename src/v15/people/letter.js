// v16-V1, the Lappet's act: "Take his letter", at the Lagan's hatch (stories/the-dead-letters.md). The clerk holds one
// of the traveller's letters out through the hatch to every stranger; here the visitor takes it. Pressed: his arm goes
// out, the letter leaves his hand and comes up into the visitor's view, cream and sealed in red, and is put away below
// it; he bends to the book lying open in the hatch and strikes one entry through in red, with a tick in the margin,
// looks up and nods, and reaches up to the stuffed pigeonhole for the next. The red strokes are the mark that stays:
// one entry a letter taken (the count), drawn from the count at every load, cleared by "Forget my marks".
//
// letterAct(ctx, fig, at, S) is called from the clerk's init (src/v15/people/folk.js); givePose(f, S, dt, cam) from his
// update, last, while S.g >= 0 (the seconds since the press, on his own clock). The book is two small meshes (its
// boards and its pages, a 256 x 180 CanvasTexture redrawn only while he writes) and the letter in flight one more,
// hidden but for two seconds. No light. ctx.storyActs.lagan = { stand(d), inked(k), state(), book, pen(k, u) } for the tests.
import * as THREE from 'three';
import { smoothstep } from '../../noise.js';
import { ease } from '../../v7/workers/rig.js';
import { BONE, ARM } from './body.js';

const W = 256, H = 180, BW = 0.5, BD = 0.34, LINES = 9, PER = LINES * 2;
const lineY = (i) => 26 + i * 17;
const pageX = (pg) => (pg ? [W / 2 + 12, W - 12] : [12, W / 2 - 12]);
const SEPIA = 'rgba(58,40,24,0.86)', RED = '#a3201a';
const TILT = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 0.12);
const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion();

// the entries already in the book (letters received for him, in his careful hand): fixed scribbles
function scribble(g, x0, x1, y, seed) {
  let s = seed;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  g.strokeStyle = SEPIA; g.lineWidth = 1.3; g.beginPath();
  let x = x0 + 2;
  const end = x1 - 6 - r() * 26;
  while (x < end) {
    const w = 8 + r() * 16; g.moveTo(x, y);
    for (let u = 0; u < w; u += 2) g.lineTo(x + u, y - 2.2 * Math.abs(Math.sin((x + u) * 0.9 + seed)) - (r() < 0.12 ? 3 : 0));
    x += w + 4;
  }
  g.stroke();
}

export function letterAct(ctx, f, at, S) {
  if (!at.ledger || !at.hatch || !ctx.acts || ctx.acts.off) return;
  const low = ctx.quality === 'low';
  // the book: boards and pages, lying open in the hatch, written for the clerk (its head away from him)
  const book = new THREE.Group(); book.name = 'lagan-book';
  book.position.set(at.ledger.x, at.ledger.y, at.ledger.z); book.rotation.y = f.yaw + Math.PI;
  const boards = new THREE.Mesh(new THREE.BoxGeometry(BW + 0.024, 0.014, BD + 0.016), new THREE.MeshLambertMaterial({ color: '#3a2216' }));
  boards.position.y = 0.007; boards.receiveShadow = true;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d'), tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = low ? 1 : 4;
  const pg = new THREE.PlaneGeometry(BW, BD, 8, 1); pg.rotateX(-Math.PI / 2);
  { const p = pg.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setY(i, 0.006 * Math.abs(Math.sin((x / BW) * Math.PI * 2)) + (Math.abs(x) < 0.01 ? -0.004 : 0)); } pg.computeVertexNormals(); }
  const pages = new THREE.Mesh(pg, new THREE.MeshLambertMaterial({ map: tex, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.22 })); // the lit room behind him, on its pages
  pages.position.y = 0.016; pages.receiveShadow = true;
  book.add(boards, pages); ctx.scene.add(book); book.updateMatrixWorld(true);
  ctx.lappet?.farHidden?.push(book);

  const red = (k, frac) => { // entry k struck through in red, `frac` of the way (the tick last)
    const pgN = Math.floor(k / LINES) % 2, [x0, x1] = pageX(pgN), y = lineY(k % LINES) - 2;
    const a = Math.min(1, frac / 0.8), b = Math.max(0, (frac - 0.8) / 0.2);
    g.strokeStyle = RED; g.lineCap = 'round'; g.lineWidth = 7;
    if (a > 0) { g.beginPath(); g.moveTo(x0 + 4, y + 0.5); g.lineTo(x0 + 4 + (x1 - x0 - 6) * a, y - 1.2 * a); g.stroke(); }
    if (b > 0) { g.beginPath(); g.moveTo(x0 - 6, y - 3); g.lineTo(x0 - 6 + 3 * Math.min(1, b * 2), y + 1 - (b > 0.5 ? 0 : 4 * (0.5 - b))); if (b > 0.5) g.lineTo(x0 - 3 + 7 * (b - 0.5) * 2, y - 8 * (b - 0.5) * 2); g.stroke(); }
  };
  const draw = (n, part = -1) => { // n entries struck, and the n-th (0-based) `part` of the way
    g.fillStyle = '#d8c9a4'; g.fillRect(0, 0, W, H);
    const sh = g.createLinearGradient(W / 2 - 18, 0, W / 2 + 18, 0); sh.addColorStop(0, 'rgba(70,50,30,0)'); sh.addColorStop(0.5, 'rgba(70,50,30,0.45)'); sh.addColorStop(1, 'rgba(70,50,30,0)');
    g.fillStyle = sh; g.fillRect(W / 2 - 18, 0, 36, H);
    g.strokeStyle = 'rgba(120,96,70,0.35)'; g.lineWidth = 1;
    for (let p = 0; p < 2; p++) { const [x0, x1] = pageX(p); for (let i = 0; i < LINES; i++) { g.beginPath(); g.moveTo(x0, lineY(i) + 1.5); g.lineTo(x1, lineY(i) + 1.5); g.stroke(); } }
    for (let p = 0; p < 2; p++) { const [x0, x1] = pageX(p); for (let i = 0; i < LINES; i++) scribble(g, x0, x1, lineY(i), 1 + p * 31 + i * 7); }
    for (let k = 0; k < Math.min(n, PER); k++) red(k, 1);
    if (part >= 0 && n < PER) red(n, part);
    tex.needsUpdate = true;
  };
  // the pen's point on the page for entry k, `u` along its stroke, in the world
  const pen = (k, u, out = new THREE.Vector3()) => {
    const pgN = Math.floor(k / LINES) % 2, [x0, x1] = pageX(pgN), cx = u < 0.8 ? x0 + 4 + (x1 - x0 - 6) * (u / 0.8) : x0 - 4, cy = lineY(k % LINES);
    out.set((cx / W - 0.5) * BW, 0.03, -(0.5 - cy / H) * BD);
    return book.localToWorld(out);
  };

  // the letter that comes to the visitor
  const fly = new THREE.Group(); fly.name = 'lagan-letter'; fly.visible = false;
  { const paper = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.006), new THREE.MeshLambertMaterial({ color: '#e2d6b8' }));
    const seal = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.021, 0.007, 10), new THREE.MeshLambertMaterial({ color: '#8e2318' }));
    seal.rotation.x = Math.PI / 2; seal.position.z = 0.005;
    const flap = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.004, 0.001), new THREE.MeshLambertMaterial({ color: '#6a5a44' }));
    const flap2 = flap.clone(); flap.position.set(-0.048, 0.022, 0.0035); flap.rotation.z = -0.55; flap2.position.set(0.048, 0.022, 0.0035); flap2.rotation.z = 0.55;
    fly.add(paper, seal, flap, flap2); }
  ctx.scene.add(fly);

  const cam = ctx.camera, F = { t: -1, from: new THREE.Vector3(), q0: new THREE.Quaternion() };
  S.g = -1; S.n = 0;
  let writing = -1; // the entry being written, while he writes
  const h = ctx.acts.add({
    id: 'lagan-letter', words: 'Take his letter', every: 'visit',
    at: at.hatch, face: { x: at.face[0], z: at.face[1] }, reach: 2.4, rise: 1.6, cone: 0.7,
    lure: { x: at.ledger.x, y: at.ledger.y + 0.03, z: at.ledger.z, face: null },
    show(n) { S.n = n; draw(n); },
    do(n) {
      S.g = 0; S.n = n; S.hand = null; S.phase = 'give'; writing = n - 1;
      F.t = 0; // the letter leaves his hand at 0.1 s
      return 6.6;
    },
  });
  // the flight and the writing, on the walk's own clock; nothing while the act is not being done
  ctx.registerUpdate((dt) => {
    if (S.g < 0 && F.t < 0) return;
    dt = Math.min(dt, 0.1);
    if (F.t >= 0) {
      F.t += dt;
      if (F.t < 0.1) { fly.visible = false; }
      else if (F.t < 2.1) {
        if (!fly.visible) { // take it from his hand: where it hangs from his wrist (his forearm bone)
          _m.copy(f.b[BONE.rF]); F.from.set(0, -ARM.fore - 0.1, 0.03).applyMatrix4(_m);
          _m.decompose(_w, F.q0, _v); fly.visible = true;
        }
        const k = ease((F.t - 0.1) / 0.6), drop = smoothstep(1.55, 2.1, F.t);
        _v.set(0.03, -0.07 - 0.32 * drop, -0.36 + 0.1 * drop); cam.localToWorld(_v);
        fly.position.lerpVectors(F.from, _v, k);
        _q.copy(cam.quaternion).multiply(TILT);
        fly.quaternion.slerpQuaternions(F.q0, _q, k);
        fly.rotateX(-0.35 * drop);
      } else { fly.visible = false; F.t = -1; }
    }
    if (writing >= 0) {
      const u = (S.g - 1.6) / 2.0;
      if (u > 0) { draw(writing, Math.min(1, u)); if (u >= 1) { writing = -1; draw(S.n); } }
    }
  }, { pos: { x: at.hatch.x, z: at.hatch.z }, near: 60, hz: 0 });
  S.pen = pen; S.handle = h;
  ctx.storyActs = ctx.storyActs || {};
  const stand = (d) => ({ x: at.hatch.x + at.face[0] * d, z: at.hatch.z + at.face[1] * d, yaw: Math.atan2(at.face[0], at.face[1]), pitch: -0.12 });
  const inked = (k) => { const pgN = Math.floor(k / LINES) % 2, [x0, x1] = pageX(pgN), px = g.getImageData(Math.round((x0 + x1) / 2), lineY(k % LINES) - 2, 1, 1).data; return px[0] > 120 && px[1] < 80; };
  ctx.storyActs.lagan = { book, fly, pen, stand, inked, at: at.hatch, face: at.face, state: () => ({ g: S.g, n: h.count, flying: fly.visible, held: !(S.g >= 0.1 && S.g < 5.5), writing, phase: S.phase }) };
}

const _p = new THREE.Vector3(), _inv = new THREE.Matrix4();
const OUT = new THREE.Vector3(-0.02, 1.38, 0.72), UP = new THREE.Vector3(-0.22, 1.74, -0.28), REST = new THREE.Vector3(-0.14, 1.0, 0.16);
// his body while he gives it (S.g seconds in): out, let go, down to the book, the stroke, up, a nod, up for the next
export function givePose(f, S, dt, cam) {
  const g = (S.g += dt);
  if (!S.hand) S.hand = f.hR.clone();
  let want;
  if (g < 0.1) want = OUT;
  else if (g < 1.1) want = _p.copy(OUT).lerp(REST, ease((g - 0.1) / 1.0) * 0.3);
  else if (g < 3.7) { // the pen's point, in his own frame
    const u = Math.max(0, Math.min(1, (g - 1.6) / 2.0));
    S.pen(S.n - 1, u, _p); f.placeNow(); _inv.copy(f.place).invert(); _p.applyMatrix4(_inv); _p.y += 0.04; _p.z -= 0.04; want = _p;
  } else if (g < 4.9) want = REST;
  else if (g < 6.0) want = UP;
  else want = REST;
  S.hand.lerp(want, 1 - Math.exp(-dt * (g < 0.1 ? 18 : 7)));
  f.hR.copy(S.hand);
  const bow = smoothstep(1.0, 1.5, g) * (1 - smoothstep(3.6, 4.1, g));
  f.lean = 0.04 + 0.3 * (1 - smoothstep(0.4, 1.0, g)) + 0.26 * bow; f.twist = -0.3 * smoothstep(4.9, 5.3, g) * (1 - smoothstep(5.8, 6.3, g));
  f.hp = f.hp * (1 - bow) + 0.75 * bow;
  const nod = smoothstep(3.8, 4.0, g) * (1 - smoothstep(4.5, 4.8, g));
  f.hp += 0.2 * nod * Math.max(0, Math.sin((g - 3.8) * 9));
  if (g > 5.0 && g < 5.9) f.hp -= 0.35 * smoothstep(5.0, 5.3, g);
  if (g > 6.6) { S.g = -1; S.hand = null; S.phase = 'sort'; S.pt = 0; S.armed = false; }
}
