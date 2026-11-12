// v8-01 roads: the gnomons, the Heliarchy's waystones (briefs/v8/brief-v8-01-roads.md; their look, v8-09). A slim
// hexagonal shaft of the Heliarchy's coursed stone (the structures' stone shader, through ctx.strata's material, so it
// weathers and mosses as the causeway's paving does), 2.2-2.7 m, leaning 3-8° toward the sun; on it a hexagonal collar
// and a head cut with the sign, the sun in the saddle: a deep V notch (half-angle 35°) wider than the shaft, so the V
// reads against the sky at 30 m (its axis along the track, and at a junction toward the crossing, so a walker on the
// way sees it face on), its cut darker than the face, and seated low in it, touching both flanks, a bead of
// ember glass whose top is level with the shoulders. The bead is glass, not a lamp: it takes the sun as a glint, glows
// only a little more as the sun gutters, and under the wood's canopy it is brighter so it still shows there. At a
// junction a low arm points down each branch; on the causeway the old waymarkers' places hold grand ones (1.3 times
// the size). Along the leads many are sunk to the shoulders, snapped with the head in the grass, or fallen flat beside
// the way. Where they stand: roads/place.js.
// One merged stone mesh (shafts, collars, heads, arms, the fallen pieces) and two instanced bead meshes (open ground,
// under the canopy); colliders on each. ctx.roads: { gnomons (each with top: the head's middle), junctions, head, stats() }.
// ?roads=0 leaves them out (and gives the causeway back its v3 waymarkers: structures/causeway.js).
import * as THREE from 'three';
import { placeGnomons, SIGHT, EYE } from './roads/place.js';
import { SUN } from '../world.js';
import { Builder } from '../structures/geo.js';
import { makeStoneMaterial } from '../structures/materials.js';

// warm grey ashlar, between the Heliarchy's grey-violet and the causeway's old stone; lichen; the damp dark
const STONE = new THREE.Color('#b4a592'), LICHEN = new THREE.Color('#6a6a4c'), DARK = new THREE.Color('#5e5650'), CUT = new THREE.Color('#2e2826');

// the head: a block with the notch cut in its top, extruded through. Its foot sits on the collar at the shaft's top.
const HEAD = (() => {
  const W = 0.31, Hh = 0.6, D = 0.28;           // half-width (the shaft's top is 0.13), height, depth
  const S = 0.36;                                // the notch's depth, apex to shoulders
  const tan = Math.tan((35 * Math.PI) / 180), half = S * tan;
  const apexY = Hh - S, beadR = 0.13;
  const beadY = apexY + beadR / Math.sin((35 * Math.PI) / 180); // touching both flanks: its top level with the shoulders
  return { W, Hh, D, S, apexY, half, beadY, beadR };
})();

function notchShape(W, Hh, apexY, half, ch = 0.04) {
  const s = new THREE.Shape();
  s.moveTo(-W, 0); s.lineTo(W, 0); s.lineTo(W, Hh - ch); s.lineTo(W - ch, Hh); s.lineTo(half, Hh); s.lineTo(0, apexY);
  s.lineTo(-half, Hh); s.lineTo(-W + ch, Hh); s.lineTo(-W, Hh - ch); s.lineTo(-W, 0);
  return s;
}
// the notch's cut: a thin dark lining on each flank, standing just proud of the face, so the V reads dark on any ground
function cutShape() {
  const { apexY, half, Hh } = HEAD, t = 0.035, k = t / Math.cos((35 * Math.PI) / 180);
  const s = new THREE.Shape();
  s.moveTo(-half, Hh); s.lineTo(0, apexY); s.lineTo(half, Hh); s.lineTo(half + k, Hh); s.lineTo(0, apexY - k * 1.2); s.lineTo(-half - k, Hh); s.lineTo(-half, Hh);
  return s;
}

export async function build(ctx) {
  const t0 = performance.now();
  if (new URL(location.href).searchParams.get('roads') === '0') { ctx.log('roads: off (?roads=0)'); return; }
  const { scene, terrain } = ctx;
  const low = ctx.quality === 'low';
  const P = placeGnomons();
  const G = P.gnomons;

  // geometry, each in its own unit frame (cloned into the Builder per piece): the shaft (unit height, base at 0, a
  // slight taper), the collar, the head and its cut, the bead, an arm
  const shaftG = new THREE.CylinderGeometry(0.13, 0.165, 1, 6, low ? 1 : 3).translate(0, 0.5, 0);
  { // the arrises worn: a little wobble on the faces, the same for every shaft
    const p = shaftG.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i); const k = 1 + 0.04 * Math.sin(y * 9.1 + Math.atan2(p.getZ(i), p.getX(i)) * 3); p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); }
  }
  const collarG = new THREE.CylinderGeometry(0.2, 0.15, 0.1, 6, 1).translate(0, 0.01, 0);
  const headG = new THREE.ExtrudeGeometry(notchShape(HEAD.W, HEAD.Hh, HEAD.apexY, HEAD.half), { depth: HEAD.D, bevelEnabled: false, curveSegments: 1 }).translate(0, 0.05, -HEAD.D / 2);
  headG.deleteAttribute('uv');
  const cutG = new THREE.ExtrudeGeometry(cutShape(), { depth: HEAD.D + 0.012, bevelEnabled: false, curveSegments: 1 }).translate(0, 0.05, -HEAD.D / 2 - 0.006);
  cutG.deleteAttribute('uv');
  const beadG = new THREE.IcosahedronGeometry(HEAD.beadR, low ? 1 : 2).scale(1, 1, 0.7).translate(0, 0.05 + HEAD.beadY, 0);
  const armG = new THREE.BoxGeometry(0.11, 0.1, 0.62).translate(0, 0, 0.31);
  { // the arm's end cut to a point
    const p = armG.attributes.position;
    for (let i = 0; i < p.count; i++) if (p.getZ(i) > 0.6) { p.setX(i, p.getX(i) * 0.35); p.setY(i, p.getY(i) * 0.6); }
  }
  const stone = ctx.strata?.materials ? ctx.strata.materials().stone : makeStoneMaterial(ctx);
  const flick = ctx.sky?.flicker || { value: 1 };
  // the bead: dark ember glass that takes the sun (low roughness, a little metal for the glint); its own glow small by
  // day, a little more in a gutter, and under the canopy (where no sun reaches it) a small light by day as well
  const beadM = new THREE.MeshStandardMaterial({ color: '#8a2a0c', emissive: '#ff4a10', emissiveIntensity: 0.12, roughness: 0.12, metalness: 0.35 });
  const beadWoodM = beadM.clone();

  const B = new Builder(ctx.noise);
  const beads = [], beadsWood = [];
  const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _m = new THREE.Matrix4();
  const UP = new THREE.Vector3(0, 1, 0), _d = new THREE.Vector3();
  const sunH = new THREE.Vector3(SUN.dir.x, 0, SUN.dir.z).normalize();
  const leanAxis = new THREE.Vector3().crossVectors(UP, sunH).normalize(); // rotating +y about it tips the top toward the sun
  const col = new THREE.Color();
  const tint = (g, k) => col.copy(STONE).lerp(DARK, (g.seed * 7.3) % 1 * 0.35).lerp(LICHEN, k).multiplyScalar(0.92 + ((g.seed * 13.1) % 1) * 0.16).clone();
  const put = (geo, m, c, ground, moss = 0.55) => B.add(geo.clone(), m, { color: c, moss, ground, disp: 0 , flat: true });
  const woodAt = (x, z) => (ctx.regions?.regionAt ? ctx.regions.regionAt(x, z).wood || 0 : 0);
  const head = (m, g, ground, c, standing) => {
    put(collarG, m, c, ground);
    put(headG, m, c, ground, 0.35);
    put(cutG, m, CUT, ground, 0.1);
    if (standing) (woodAt(g.x, g.z) > 0.35 ? beadsWood : beads).push(m.clone());
  };
  let colliders = 0;
  const lying = (g, x, z, len, dx, dz, r, headToo) => {
    // a piece lying on the ground from (x, z) along (dx, dz): its axis tipped from up to that line
    const y0 = terrain.heightAt(x, z), y1 = terrain.heightAt(x + dx * len, z + dz * len);
    _d.set(dx * len, y1 - y0, dz * len).normalize();
    _q.setFromUnitVectors(UP, _d);
    _q2.setFromAxisAngle(_d, g.seed * 6.28); _q.premultiply(_q2);
    _p.set(x, y0 + r * 0.7, z);
    put(shaftG, _m.compose(_p, _q, _s.set(g.sc, len, g.sc)), tint(g, 0.45), y0 - 0.4, 0.9);
    if (headToo) head(new THREE.Matrix4().compose(_p.clone().addScaledVector(_d, len + 0.02), _q.clone(), _s.set(g.sc, g.sc, g.sc)), g, y0 - 0.4, tint(g, 0.4), false);
    if (ctx.addCollider) for (let t = 0.2; t < 1; t += 0.4) { ctx.addCollider({ x: x + dx * len * t, z: z + dz * len * t, r: 0.24 * g.sc, y: y0 - 0.2, h: 0.6 }); colliders++; }
  };
  let arms = 0;
  for (const g of G) {
    const y = terrain.heightAt(g.x, g.z);
    if (g.state === 'fallen') {
      // fallen along the way, its foot still by its socket
      const a = Math.atan2(g.tx, g.tz) + (g.seed - 0.5) * 0.8;
      lying(g, g.x, g.z, g.H, Math.sin(a), Math.cos(a), 0.17, true);
      continue;
    }
    const lean = g.grand ? 0.05 + g.seed * 0.04 : 0.06 + g.seed * 0.08; // 3-8° toward the sun
    _q.setFromAxisAngle(UP, g.yaw);
    _q2.setFromAxisAngle(leanAxis, lean); _q.premultiply(_q2);
    const H = g.state === 'snapped' ? g.H * (0.38 + g.seed * 0.25) : g.H;
    const base = new THREE.Vector3(g.x, y - 0.3 - g.sink, g.z);
    put(shaftG, _m.compose(base, _q, _s.set(g.sc, H + 0.3, g.sc)), tint(g, g.state === 'snapped' ? 0.3 : 0.12), y);
    if (g.state === 'snapped') {
      // the rest of it in the grass beside, the head at its end
      const a = g.yaw + Math.PI / 2 + (g.seed - 0.5) * 1.2, dx = Math.sin(a), dz = Math.cos(a);
      lying(g, g.x + dx * 0.5, g.z + dz * 0.5, g.H - H, dx, dz, 0.15, true);
    } else {
      const top = new THREE.Vector3(0, H + 0.3, 0).applyQuaternion(_q).add(base);
      head(new THREE.Matrix4().compose(top, _q, _s.set(g.sc, g.sc, g.sc)), g, y, tint(g, 0.08), true);
      // the arms: at 1.55 m, level, one down each branch
      for (const a of g.arms) {
        _q2.setFromAxisAngle(UP, a);
        const at = new THREE.Vector3(0, 0.3 + 1.55 * g.sc, 0).applyQuaternion(_q).add(base);
        put(armG, new THREE.Matrix4().compose(at, _q2, _s.set(g.sc, g.sc, g.sc)), tint(g, 0.1), y);
        arms++;
      }
    }
    if (ctx.addCollider) { ctx.addCollider({ x: g.x, z: g.z, r: 0.3 * g.sc }); colliders++; }
  }
  const stoneMesh = new THREE.Mesh(B.build(), stone.mat);
  stoneMesh.name = 'roads-gnomons'; stoneMesh.castShadow = true; stoneMesh.receiveShadow = true;
  scene.add(stoneMesh);
  const instanced = (geo, mat, list, name) => {
    const im = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
    im.count = list.length;
    list.forEach((m, i) => im.setMatrixAt(i, m));
    im.instanceMatrix.needsUpdate = true;
    im.castShadow = false; im.receiveShadow = true; im.name = name;
    im.computeBoundingSphere();
    scene.add(im);
    return im;
  };
  const meshes = [stoneMesh, instanced(beadG, beadM, beads, 'roads-gnomon-beads'), instanced(beadG, beadWoodM, beadsWood, 'roads-gnomon-beads-wood')];
  ctx.registerUpdate(() => {
    const gut = 1 - flick.value; // 0 by day, toward 0.8 at a gutter's floor
    beadM.emissiveIntensity = 0.12 + 0.75 * gut;
    beadWoodM.emissiveIntensity = 2.4 + 1.6 * gut;
  });
  const beadN = beads.length + beadsWood.length;

  const tris = meshes.reduce((a, m) => a + (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3 * (m.isInstancedMesh ? m.count : 1), 0);
  const counts = G.reduce((a, g) => { a[g.state] = (a[g.state] || 0) + 1; return a; }, {});
  ctx.roads = {
    SIGHT, EYE,
    gnomons: G.map((g) => ({ x: +g.x.toFixed(2), z: +g.z.toFixed(2), y: +g.y.toFixed(2), top: +g.top.toFixed(2), state: g.state, kind: g.kind, visible: g.visible, arms: g.arms.length, lead: g.lead || null })),
    junctions: P.junctions,
    head: { ...HEAD },
    stats: () => ({ gnomons: G.length, ...counts, junctions: P.junctions.length, arms, beads: beadN, calls: meshes.length, tris: Math.round(tris), colliders, ms: Math.round(performance.now() - t0) }),
  };
  ctx.log(`roads: ${G.length} gnomons (${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', ')}), ${P.junctions.length} junctions, ${arms} arms in ${(performance.now() - t0).toFixed(0)} ms`);
}
