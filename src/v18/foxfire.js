// v18-F1: foxfire, the only mark of the wood's three spurs (routes.js P57-P59; the owner's #18: "little spur trails off
// the main road, dark and twisty things"). Pale green-white bracket fungus glowing on old trunks and on rotten stumps: a
// knot of it at each spur's head, on both sides of the mouth and on the trunks round it, seen from the wood way in either
// direction, then one clump at a time along the spur, each one in sight from the last (the line between them misses
// every trunk), so a visitor who goes to the first is led round each bend to the next. No signpost, no gnomon.
//
// One InstancedMesh of shelves (a drooping half-disc each, unlit, fogged), one of stumps (lit as the wood is) and one
// Points of faint halos round each clump (additive, fogged, never brighter far off than near); a dim point light at
// each spur's head (the three slots take it only when it is near: lights.js). They breathe slowly and glow brighter as
// the sun gutters, as the wood's own fungi do. ctx.foxfire: { clumps: [{ spur, x, y, z, host, at }], heads } for
// foxfire-test. ?foxfire=0.
import * as THREE from 'three';
import { leads, nearestLead } from '../v4/paths/routes.js';
import { SPUR_IDS } from './wood-reach.js';
import { fogPars, fogAtten } from '../particles/shaderParts.js';

const STEP_MIN = 6, STEP_MAX = 12; // m along a spur between clumps
const HOST_R = 3.2; // m from the line a trunk may be to carry a clump
const COL = new THREE.Color('#bff2cf'), COL2 = new THREE.Color('#e4f7d2'); // pale green to pale white

export async function build(ctx) {
  if (new URLSearchParams(location.search).get('foxfire') === '0') return;
  const T = ctx.terrain, rng = ctx.makeRng(18020);
  const veg = (await ctx.built('vegetation')) ? ctx.trunks : null;
  const all = veg ? veg.list.filter((t) => !t.hidden && t.kind !== 'thorn' && t.kind !== 'mound' && t.kind !== 'fallen') : [];
  // what blocks a sight: every collider that stands above the knee (the trunks, the stones), as foxfire-test reads them
  await ctx.built('rocks');
  const blockers = ctx.controls.state.colliders.filter((c) => c.x != null && c.r != null && c.x1 == null && !(c.h != null && c.y != null && c.y + c.h < T.heightAt(c.x, c.z) + 0.6));
  const clear = (ax, az, bx, bz, skip) => {
    const ex = bx - ax, ez = bz - az, l2 = ex * ex + ez * ez || 1;
    const x0 = Math.min(ax, bx) - 3, x1 = Math.max(ax, bx) + 3, z0 = Math.min(az, bz) - 3, z1 = Math.max(az, bz) + 3;
    for (const o of blockers) {
      if (o.x < x0 || o.x > x1 || o.z < z0 || o.z > z1 || skip.includes(o)) continue;
      const t = Math.max(0, Math.min(1, ((o.x - ax) * ex + (o.z - az) * ez) / l2));
      if ((o.x - ax - ex * t) ** 2 + (o.z - az - ez * t) ** 2 < o.r * o.r) return false;
    }
    return true;
  };
  const blockerOf = (t) => blockers.find((o) => Math.abs(o.x - t.x) < 1e-6 && Math.abs(o.z - t.z) < 1e-6);
  const clumps = [], stumps = [], heads = [];
  const list = leads().list;
  for (const id of SPUR_IDS) {
    const L = list.find((l) => l.id === id); if (!L) continue;
    const S = L.lines[0], len = S[S.length - 1].s;
    const at = (s) => { let j = 0; while (j < S.length - 2 && S[j + 1].s < s) j++; const a = S[j], b = S[j + 1], f = Math.max(0, Math.min(1, (s - a.s) / Math.max(1e-6, b.s - a.s))), l = Math.hypot(b.x - a.x, b.z - a.z) || 1; return { x: a.x + (b.x - a.x) * f, z: a.z + (b.z - a.z) * f, tx: (b.x - a.x) / l, tz: (b.z - a.z) / l }; };
    // a clump on a trunk: on its side toward the line, a hand to a forearm above the ground
    const onTrunk = (t, px, pz, n, s) => {
      const r = veg.trunk(t) * 0.92, dx = px - t.x, dz = pz - t.z, d = Math.hypot(dx, dz) || 1;
      const x = t.x + (dx / d) * r, z = t.z + (dz / d) * r, y = T.heightAt(x, z) + (n >= 4 ? 0.7 + rng() * 0.8 : 0.35 + rng() * 0.9); // (a head's knots at the eye, over the ferns)
      clumps.push({ spur: id, x, y, z, nx: dx / d, nz: dz / d, n, host: 'trunk', at: s, tree: t });
      return clumps[clumps.length - 1];
    };
    // a stump: a rotten one beside the line, foxfire on its side toward the line
    const onStump = (px, pz, nx, nz, n, s) => {
      // (off every other lead's tread, off claimed ground and out of the water)
      if (nearestLead(px, pz, 0.6) && (nearestLead(px, pz, 0.6).id !== id || nearestLead(px, pz, 0.6).d < 1.05)) return null; // (its own line too, where it bends back on itself)
      if (ctx.claims?.at(px, pz, 0.4, 'trees') && !/the lead/.test(ctx.claims.at(px, pz, 0.4, 'trees')) || T.isUnderwater(px, pz) || T.slopeAt(px, pz) > 0.6) return null;
      const r = 0.26 + rng() * 0.14, h = n >= 4 ? 0.45 + rng() * 0.12 : 0.4 + rng() * 0.4, y = T.heightAt(px, pz); // (the mouth's stay under the knee: they never hide the next clump)
      stumps.push({ x: px, y, z: pz, r, h, rot: rng() * 6.28, tilt: (rng() - 0.5) * 0.2 });
      if (h > 0.55) blockers.push({ x: px, z: pz, r }); // (a tall one stands in a later sight, as its collider will)
      clumps.push({ spur: id, x: px + nx * r * 0.95, y: y + Math.min(h - 0.08, 0.15 + rng() * 0.3), z: pz + nz * r * 0.95, nx, nz, n, host: 'stump', at: s, top: y + h, r });
      return clumps[clumps.length - 1];
    };
    const trunksNear = (x, z, R) => all.filter((t) => (t.x - x) ** 2 + (t.z - z) ** 2 < R * R).sort((a, b) => ((a.x - x) ** 2 + (a.z - z) ** 2) - ((b.x - x) ** 2 + (b.z - z) ** 2));
    // the head: both sides of the mouth, and the trunks round it, thickest here
    const h0 = at(0);
    heads.push({ spur: id, x: h0.x, z: h0.z });
    const c0 = clumps.length;
    for (const sd of [-1, 1]) for (const sm of [2.2, 3.2, 4.5, 6]) { const m = at(sm); if (onStump(m.x - m.tz * sd * 1.3, m.z + m.tx * sd * 1.3, m.tz * sd, -m.tx * sd, 5 + Math.floor(rng() * 3), sm)) break; }
    let headN = 0;
    for (const t of trunksNear(h0.x, h0.z, 9)) { if (headN >= 4) break; if (t.kind === 'giant' || t.kind === 'rimgiant') continue; onTrunk(t, h0.x, h0.z, 5 + Math.floor(rng() * 3), 0); headN++; }
    // along: the farthest host within reach that the last clump can see; failing that, a stump at the nearest step
    // (the walk starts from the mouth's farther stump, or the head's nearest trunk)
    const mouth = clumps.slice(c0).filter((c) => c.host === 'stump').sort((a, b) => b.at - a.at)[0];
    let last = mouth || clumps[c0] || { x: h0.x, z: h0.z, at: 0 }, s = last.at;
    let lastBlk = [];
    while (s < len - 3) {
      let placed = null;
      for (let s2 = Math.min(len - 1, s + STEP_MAX); s2 >= s + STEP_MIN && !placed; s2 -= 1) {
        const p = at(s2);
        for (const t of trunksNear(p.x, p.z, HOST_R)) {
          if (t.kind === 'giant' || t.kind === 'rimgiant') continue;
          const b = blockerOf(t), r = veg.trunk(t) * 0.92, dx = p.x - t.x, dz = p.z - t.z, d = Math.hypot(dx, dz) || 1;
          const fx = t.x + (dx / d) * r, fz = t.z + (dz / d) * r;
          if (!clear(last.x, last.z, fx, fz, [b, ...lastBlk])) continue;
          placed = onTrunk(t, p.x, p.z, 2 + Math.floor(rng() * 3), s2); lastBlk = [b]; break;
        }
      }
      if (!placed) {
        // a stump at the step's near end, on the side the last clump sees
        for (let s2 = s + STEP_MIN; s2 >= s + 2 && !placed; s2 -= 1) {
          const p = at(s2);
          for (const sd of [1, -1]) {
            const x = p.x - p.tz * sd * 1.3, z = p.z + p.tx * sd * 1.3;
            if (!clear(last.x, last.z, x, z, lastBlk)) continue;
            placed = onStump(x, z, p.tz * sd, -p.tx * sd, 2 + Math.floor(rng() * 2), s2); lastBlk = []; if (placed) break;
          }
        }
        if (!placed) { const p = at(s + 3); placed = onStump(p.x - p.tz * 1.3, p.z + p.tx * 1.3, p.tz, -p.tx, 2, s + 3) || onStump(p.x + p.tz * 1.3, p.z - p.tx * 1.3, -p.tz, p.tx, 2, s + 3); lastBlk = []; }
      }
      if (placed) last = placed;
      s = placed ? placed.at : s + 3;
    }
  }
  // no stump stands in a tread or on claimed ground: the spurs' own lines ruled them, but another lead may cross
  ctx.foxfire = { clumps, heads, stumps };
  if (!clumps.length) return;

  // shelves: a drooping half-disc, its flat edge on the bark, glowing brightest at the rim
  const shelf = (() => {
    const P = [0, 0, 0], C = [0.55], I = [], n = 7;
    for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + (i / n) * Math.PI; P.push(Math.sin(a) * 0.5, -0.12 - 0.1 * Math.cos(a) ** 2 * 0, Math.cos(a) * 0.5); C.push(1); }
    for (let i = 1; i <= n; i++) I.push(0, i, i + 1);
    // the underside, a touch dimmer
    const o = P.length / 3; P.push(0, -0.05, 0); C.push(0.4);
    for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + (i / n) * Math.PI; P.push(Math.sin(a) * 0.5, -0.14, Math.cos(a) * 0.5); C.push(0.8); }
    for (let i = 1; i <= n; i++) I.push(o, o + i + 1, o + i);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute('glow', new THREE.Float32BufferAttribute(C, 1));
    g.setIndex(I);
    return g;
  })();
  const nShelf = clumps.reduce((a, c) => a + c.n, 0);
  const sMat = new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: false, fog: true, side: THREE.DoubleSide });
  const uGlow = { value: 1 };
  sMat.onBeforeCompile = (sh) => {
    sh.uniforms.uGlow = uGlow;
    sh.vertexShader = 'attribute float glow;\nvarying float vGlow;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvGlow = glow;');
    sh.fragmentShader = 'uniform float uGlow;\nvarying float vGlow;\n' + sh.fragmentShader.replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'vec4 diffuseColor = vec4( diffuse * (0.35 + 0.65 * vGlow) * uGlow, opacity );');
  };
  sMat.customProgramCacheKey = () => 'v18-foxfire';
  const shelves = new THREE.InstancedMesh(shelf, sMat, nShelf);
  shelves.name = 'v18-foxfire';
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v3 = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
  let k = 0;
  const halo = [], haloI = [];
  for (const c of clumps) {
    const yaw = Math.atan2(c.nx, c.nz);
    for (let i = 0; i < c.n; i++) {
      // stacked up the bark in a loose run, the lower ones larger; on a stump some on its top
      const onTop = c.host === 'stump' && i === c.n - 1;
      const dy = onTop ? c.top - c.y + 0.01 : i * (0.09 + rng() * 0.08) - 0.05, side = (rng() - 0.5) * 0.35;
      const sz = (c.n >= 4 ? 0.16 + rng() * 0.16 : 0.12 + rng() * 0.13) * (1 - i * 0.06);
      const ox = Math.cos(yaw) * side, oz = -Math.sin(yaw) * side;
      v3.set(c.x + ox + (onTop ? -c.nx * c.r * 0.5 : 0), c.y + dy, c.z + oz + (onTop ? -c.nz * c.r * 0.5 : 0));
      e.set(onTop ? 0 : (rng() - 0.5) * 0.25, yaw + (rng() - 0.5) * 0.5, (rng() - 0.5) * 0.2, 'YXZ'); q.setFromEuler(e);
      sc.set(sz, sz * (0.8 + rng() * 0.5), sz * (0.75 + rng() * 0.3));
      m4.compose(v3, q, sc); shelves.setMatrixAt(k, m4);
      col.copy(COL).lerp(COL2, rng()).multiplyScalar(0.8 + rng() * 0.35); shelves.setColorAt(k, col); k++;
    }
    halo.push(c.x + c.nx * 0.12, c.y + 0.12 * c.n * 0.5, c.z + c.nz * 0.12); haloI.push(c.n >= 4 ? 3.2 : 1.1, rng()); // (a head's knot reads from 20 m down the road)
  }
  shelves.instanceMatrix.needsUpdate = true; shelves.instanceColor.needsUpdate = true;
  shelves.computeBoundingSphere();
  ctx.scene.add(shelves);

  // stumps: a short rotten cylinder, ragged at the top, the wood's dead colour
  let stumpMesh = null;
  if (stumps.length) {
    // tapering, flared at the foot, its top broken off in splinters, its sides ridged: rotten wood, not a post
    const g = new THREE.CylinderGeometry(0.7, 1.15, 1, 9, 3, false);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), rib = 1 + 0.12 * Math.sin(a * 5 + 1.3);
      p.setX(i, x * rib); p.setZ(i, z * rib);
      if (y > 0.4) p.setY(i, 0.5 - 0.32 * Math.abs(Math.sin(a * 2.5 + 0.7)) - (Math.hypot(x, z) < 0.05 ? 0.25 : 0)); // splinters round a rotted hollow
    }
    g.translate(0, 0.5, 0); g.computeVertexNormals();
    const mat = new THREE.MeshLambertMaterial({ color: new THREE.Color('#3a2f26'), fog: true });
    stumpMesh = new THREE.InstancedMesh(g, mat, stumps.length);
    stumps.forEach((st, i) => { e.set(st.tilt, st.rot, st.tilt * 0.5); q.setFromEuler(e); m4.compose(v3.set(st.x, st.y - 0.06, st.z), q, sc.set(st.r, st.h + 0.06, st.r)); stumpMesh.setMatrixAt(i, m4); });
    stumpMesh.name = 'v18-foxfire-stumps'; stumpMesh.receiveShadow = true; stumpMesh.castShadow = false;
    stumpMesh.computeBoundingSphere();
    ctx.scene.add(stumpMesh);
    for (const st of stumps) ctx.addCollider({ x: st.x, z: st.z, r: st.r, y: st.y - 1, h: st.h + 1 });
  }

  // halos: a faint pale breath round each clump, so it reads at 20 m in the dark without lighting the wood
  const hg = new THREE.BufferGeometry();
  hg.setAttribute('position', new THREE.Float32BufferAttribute(halo, 3));
  hg.setAttribute('aI', new THREE.Float32BufferAttribute(haloI, 2));
  const hMat = new THREE.ShaderMaterial({
    name: 'v18.foxfire.halo', fog: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uGlow: { value: 1 }, uTime: { value: 0 }, uScale: { value: 400 }, uCol: { value: COL.clone() } }]),
    vertexShader: /* glsl */`
      attribute vec2 aI; uniform float uTime, uScale, uGlow; varying float vI;
      #include <fog_pars_vertex>
      void main() {
        vec3 transformed = position;
        vec4 mvPosition = viewMatrix * vec4(transformed, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        float d = max(-mvPosition.z, 0.5);
        vI = aI.x * uGlow * (0.85 + 0.15 * sin(uTime * 0.37 + aI.y * 6.283)) * smoothstep(1.0, 4.0, d); // (none in the face)
        gl_PointSize = clamp(1.2 * uScale / d, 3.0, 110.0);
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uCol; varying float vI;
      ${fogPars}
      void main() {
        ${fogAtten}
        vec2 c = (gl_PointCoord - 0.5) * 2.0; float r2 = dot(c, c);
        float a = (exp(-r2 * 4.0) * 0.22 + exp(-r2 * 26.0) * 0.2) * (1.0 - smoothstep(0.6, 1.0, r2)); // (round, nothing at the square's rim)
        gl_FragColor = vec4(uCol * a * vI * fogAtten, 1.0); // (additive: dims into the haze, adds none of its colour)
      }`,
  });
  const halos = new THREE.Points(hg, hMat);
  halos.name = 'v18-foxfire-halos'; halos.frustumCulled = false; halos.renderOrder = 21;
  ctx.scene.add(halos);

  // a dim light at each head, low on the mouth's trunks: the ground and the bark there take a little of the green
  const lamps = heads.map((h) => { const l = new THREE.PointLight(COL, 2.6, 11, 2); l.position.set(h.x, T.heightAt(h.x, h.z) + 0.7, h.z); ctx.scene.add(l); return l; });

  const W = ctx.landmarks.wood;
  ctx.registerUpdate((dt, t) => {
    const f = ctx.sky.flicker.value, g = 0.75 + 0.9 * Math.max(0, 1 - f); // the wood's fungi brighten in the gutter
    const breath = 0.92 + 0.08 * Math.sin(t * 0.29);
    uGlow.value = g * breath; hMat.uniforms.uGlow.value = g * breath; hMat.uniforms.uTime.value = t;
    hMat.uniforms.uScale.value = ctx.renderer.domElement.height * 0.5 / Math.tan((ctx.camera.fov * Math.PI) / 360);
    for (const l of lamps) l.intensity = 2.6 * g * breath;
  }, { pos: new THREE.Vector3(W.x, 0, W.z - 40), near: 180, hz: 0 });
  ctx.log?.(`foxfire: ${clumps.length} clumps (${nShelf} shelves, ${stumps.length} stumps) on ${heads.length} spurs`);
}
