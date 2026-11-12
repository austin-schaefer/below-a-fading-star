// v8-01 roads: the gnomons, the Heliarchy's waystones (briefs/v8/brief-v8-01-roads.md). A slim hexagonal shaft of
// grey-violet ashlar, 2.2-2.7 m, leaning a few degrees toward the sun; on it a head cut with the sign, the sun in the
// saddle: a V notch (half-angle 35°) holding a bead of ember glass, the bead's lower third below the notch's
// shoulders, its diameter 0.6 of the notch's width at its centre. The bead takes the sun and glows a little with
// the sky's flicker; it is not a light. At a junction a low arm points down each branch; on the causeway the old
// waymarkers' places hold grand ones (1.3 times the size). Along the leads many are sunk to the shoulders, snapped
// with the head in the grass, or fallen flat beside the way. Where they stand: roads/place.js.
// Four instanced meshes (shafts, heads, beads, arms), colliders on each. ctx.roads: { gnomons, junctions, stats() }.
// ?roads=0 leaves them out (and gives the causeway back its v3 waymarkers: structures/causeway.js).
import * as THREE from 'three';
import { placeGnomons, SIGHT, EYE } from './roads/place.js';
import { SUN } from '../world.js';

const STONE = new THREE.Color('#948c98'), LICHEN = new THREE.Color('#5c6448'), DARK = new THREE.Color('#4a4450');

// the head: a block with the notch cut in its top, extruded through; the sign's proportions (briefs/v8/index.md)
const HEAD = (() => {
  const W = 0.26, Hh = 0.5, D = 0.26;
  const c = 0.28;                       // the bead's centre above the notch's apex
  const shoulder = 0.86 * c;            // the shoulders: the bead's lower third below them
  const apexY = Hh - shoulder, half = shoulder * Math.tan((35 * Math.PI) / 180);
  return { W, Hh, D, apexY, half, beadY: apexY + c, beadR: (0.6 * 2 * c * Math.tan((35 * Math.PI) / 180)) / 2 };
})();

function headGeometry() {
  const { W, Hh, D, apexY, half } = HEAD;
  const s = new THREE.Shape();
  s.moveTo(-W, 0); s.lineTo(W, 0); s.lineTo(W, Hh - 0.04); s.lineTo(W - 0.04, Hh); s.lineTo(half, Hh); s.lineTo(0, apexY);
  s.lineTo(-half, Hh); s.lineTo(-W + 0.04, Hh); s.lineTo(-W, Hh - 0.04); s.lineTo(-W, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: D, bevelEnabled: false, curveSegments: 1 });
  g.translate(0, 0, -D / 2);
  // a collar where it meets the shaft
  const collar = new THREE.CylinderGeometry(0.2, 0.17, 0.09, 6).translate(0, 0.02, 0);
  const merged = mergeTwo(g.toNonIndexed(), collar.toNonIndexed());
  merged.computeVertexNormals();
  return merged;
}
function mergeTwo(a, b) {
  const g = new THREE.BufferGeometry();
  const pa = a.attributes.position.array, pb = b.attributes.position.array;
  const p = new Float32Array(pa.length + pb.length); p.set(pa); p.set(pb, pa.length);
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  return g;
}

export async function build(ctx) {
  const t0 = performance.now();
  if (new URL(location.href).searchParams.get('roads') === '0') { ctx.log('roads: off (?roads=0)'); return; }
  const { scene, terrain } = ctx;
  const low = ctx.quality === 'low';
  const P = placeGnomons();
  const G = P.gnomons;

  // geometry: the shaft (unit height, base at 0, a slight taper), the head, the bead (a lens), an arm
  const shaftG = new THREE.CylinderGeometry(0.135, 0.17, 1, 6, low ? 1 : 3).translate(0, 0.5, 0);
  { // the arrises worn: a little wobble on the faces, the same for every shaft
    const p = shaftG.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i); const k = 1 + 0.04 * Math.sin(y * 9.1 + Math.atan2(p.getZ(i), p.getX(i)) * 3); p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); }
    shaftG.computeVertexNormals();
  }
  const headG = headGeometry();
  const beadG = new THREE.IcosahedronGeometry(HEAD.beadR, low ? 1 : 2).scale(1, 1, 0.55).translate(0, HEAD.beadY, 0);
  const armG = new THREE.BoxGeometry(0.11, 0.1, 0.62).translate(0, 0, 0.31);
  { // the arm's end cut to a point
    const p = armG.attributes.position;
    for (let i = 0; i < p.count; i++) if (p.getZ(i) > 0.6) { p.setX(i, p.getX(i) * 0.35); p.setY(i, p.getY(i) * 0.6); }
    armG.computeVertexNormals();
  }
  const stoneM = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.88, metalness: 0 });
  const flick = ctx.sky?.flicker || { value: 1 };
  const beadM = new THREE.MeshStandardMaterial({ color: '#c8501e', emissive: '#ff4a10', emissiveIntensity: 1.6, roughness: 0.18, metalness: 0.1 });

  // instances
  const shafts = [], heads = [], arms = [];
  const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _m = new THREE.Matrix4(), _m2 = new THREE.Matrix4();
  const UP = new THREE.Vector3(0, 1, 0), _ax = new THREE.Vector3(), _d = new THREE.Vector3();
  const sunH = new THREE.Vector3(SUN.dir.x, 0, SUN.dir.z).normalize();
  const leanAxis = new THREE.Vector3().crossVectors(UP, sunH).normalize(); // rotating +y about it tips the top toward the sun
  const col = new THREE.Color();
  const tint = (g, k) => col.copy(STONE).lerp(DARK, (g.seed * 7.3) % 1 * 0.35).lerp(LICHEN, k).multiplyScalar(0.92 + ((g.seed * 13.1) % 1) * 0.16);
  let colliders = 0;
  const lying = (g, x, z, len, dx, dz, r, out, headToo) => {
    // a piece lying on the ground from (x, z) along (dx, dz): its axis tipped from up to that line
    const y0 = terrain.heightAt(x, z), y1 = terrain.heightAt(x + dx * len, z + dz * len);
    _d.set(dx * len, y1 - y0, dz * len).normalize();
    _q.setFromUnitVectors(UP, _d);
    _q2.setFromAxisAngle(_d, g.seed * 6.28); _q.premultiply(_q2);
    _p.set(x, y0 + r * 0.7, z);
    out.push({ m: new THREE.Matrix4().compose(_p, _q, _s.set(g.sc, len, g.sc)), c: tint(g, 0.45).clone() });
    if (headToo) heads.push({ m: new THREE.Matrix4().compose(_p.clone().addScaledVector(_d, len + 0.02), _q.clone(), _s.set(g.sc, g.sc, g.sc)), c: tint(g, 0.4).clone() });
    if (ctx.addCollider) { const r = 0.24 * g.sc; ctx.addCollider({ x1: x + dx * r, z1: z + dz * r, x2: x + dx * (len - r), z2: z + dz * (len - r), r, y: y0 - 0.2, h: 0.2 + 1.7 * r, dh: (y1 - y0) * (1 - 2 * r / len) }); colliders++; } // v8-10: one capsule along it, at its top
  };
  for (const g of G) {
    const y = terrain.heightAt(g.x, g.z);
    if (g.state === 'fallen') {
      // fallen along the way, its foot still by its socket
      const a = Math.atan2(g.tx, g.tz) + (g.seed - 0.5) * 0.8;
      lying(g, g.x, g.z, g.H, Math.sin(a), Math.cos(a), 0.17, shafts, true);
      continue;
    }
    const lean = g.grand ? 0.03 + g.seed * 0.03 : 0.05 + g.seed * 0.07; // 2-7° toward the sun
    _q.setFromAxisAngle(UP, g.yaw);
    _q2.setFromAxisAngle(leanAxis, lean); _q.premultiply(_q2);
    const H = g.state === 'snapped' ? g.H * (0.38 + g.seed * 0.25) : g.H;
    const base = new THREE.Vector3(g.x, y - 0.3 - g.sink, g.z);
    _m.compose(base, _q, _s.set(g.sc, H + 0.3, g.sc));
    shafts.push({ m: _m.clone(), c: tint(g, g.state === 'snapped' ? 0.3 : 0.12).clone() });
    if (g.state === 'snapped') {
      // the rest of it in the grass beside, the head at its end
      const a = g.yaw + Math.PI / 2 + (g.seed - 0.5) * 1.2, dx = Math.sin(a), dz = Math.cos(a);
      lying(g, g.x + dx * 0.5, g.z + dz * 0.5, g.H - H, dx, dz, 0.15, shafts, true);
    } else {
      const top = new THREE.Vector3(0, H + 0.3, 0).applyQuaternion(_q).add(base);
      heads.push({ m: new THREE.Matrix4().compose(top, _q, _s.set(g.sc, g.sc, g.sc)), c: tint(g, 0.08).clone() });
      // the arms: at 1.55 m, level, one down each branch
      for (const a of g.arms) {
        _q2.setFromAxisAngle(UP, a);
        const at = new THREE.Vector3(0, 0.3 + 1.55 * g.sc, 0).applyQuaternion(_q).add(base);
        arms.push({ m: new THREE.Matrix4().compose(at, _q2, _s.set(g.sc, g.sc, g.sc)), c: tint(g, 0.1).clone() });
      }
    }
    if (ctx.addCollider) { ctx.addCollider({ x: g.x, z: g.z, r: 0.3 * g.sc }); colliders++; }
  }
  const instanced = (geo, mat, list, name, shadow) => {
    const im = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
    im.count = list.length;
    list.forEach((it, i) => { im.setMatrixAt(i, it.m); if (it.c) im.setColorAt(i, it.c); });
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.castShadow = shadow; im.receiveShadow = true; im.name = name;
    im.computeBoundingSphere();
    scene.add(im);
    return im;
  };
  const meshes = [
    instanced(shaftG, stoneM, shafts, 'roads-gnomon-shafts', true),
    instanced(headG, stoneM, heads, 'roads-gnomon-heads', true),
    instanced(beadG, beadM, heads.map((h) => ({ m: h.m })), 'roads-gnomon-beads', false),
    instanced(armG, stoneM, arms, 'roads-gnomon-arms', true),
  ];
  ctx.registerUpdate(() => { beadM.emissiveIntensity = 0.45 + 1.15 * flick.value; });

  const tris = meshes.reduce((a, m) => a + (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3 * m.count, 0);
  const counts = G.reduce((a, g) => { a[g.state] = (a[g.state] || 0) + 1; return a; }, {});
  ctx.roads = {
    SIGHT, EYE,
    gnomons: G.map((g) => ({ x: +g.x.toFixed(2), z: +g.z.toFixed(2), y: +g.y.toFixed(2), top: +g.top.toFixed(2), state: g.state, kind: g.kind, visible: g.visible, arms: g.arms.length, lead: g.lead || null })),
    junctions: P.junctions,
    head: { ...HEAD },
    stats: () => ({ gnomons: G.length, ...counts, junctions: P.junctions.length, arms: arms.length, calls: meshes.length, tris: Math.round(tris), colliders, ms: Math.round(performance.now() - t0) }),
  };
  ctx.log(`roads: ${G.length} gnomons (${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', ')}), ${P.junctions.length} junctions, ${arms.length} arms in ${(performance.now() - t0).toFixed(0)} ms`);
}
