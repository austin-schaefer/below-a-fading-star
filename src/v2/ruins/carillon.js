// Z. The Carillon Flags [Proposed]: on one twelve-metre stretch of the causeway, nine hex flags carry
// bronze caps. Each rings its own note underfoot. The caps step down in size as the notes rise, so the
// big dull ones are the low notes; the ones down the crown of the road are polished bright by feet, the
// ones at the edges have gone green. The flags are laid on the causeway's own hex cells, a touch proud
// of the pavers there, so the caps sit on real flags.
import * as THREE from 'three';
import { Builder } from '../../structures/geo.js';
import { stoneTints, vary, HEX_R, hexCellsIn } from '../../structures/common.js';
import { Acc, stoneMesh, SKY_SHEEN } from './util.js';

const SITE = { x: -65, z: 12, half: 6 };
// notes by position: down the crown in walking order (from the keep gate westward), then the edges
const CROWN_NOTES = [4, 2, 5, 3, 1, 0];
const EDGE_NOTES = [6, 8, 7];

export function caps(causeway, causewayDistance) {
  // the causeway segment through the site, as a frame: along (westward from the gate), across
  let best = null;
  for (let i = 0; i < causeway.length - 1; i++) {
    const a = causeway[i], b = causeway[i + 1], L = Math.hypot(b.x - a.x, b.z - a.z);
    const dx = (b.x - a.x) / L, dz = (b.z - a.z) / L;
    const t = Math.max(0, Math.min(L, (SITE.x - a.x) * dx + (SITE.z - a.z) * dz));
    const d = Math.hypot(a.x + dx * t - SITE.x, a.z + dz * t - SITE.z);
    if (!best || d < best.d) best = { d, ox: a.x + dx * t, oz: a.z + dz * t, dx, dz };
  }
  const { ox, oz, dx, dz } = best;
  const cand = [];
  hexCellsIn(SITE.x - 8, SITE.z - 8, SITE.x + 8, SITE.z + 8, (x, z, i, j) => {
    const along = (x - ox) * dx + (z - oz) * dz, across = -(x - ox) * dz + (z - oz) * dx;
    if (Math.abs(along) > SITE.half || Math.abs(across) > 1.3) return;
    if (causewayDistance && causewayDistance(x, z) > 1.5) return;
    cand.push({ x, z, i, j, along, across });
  });
  const crown = cand.filter((c) => Math.abs(c.across) < 0.6).sort((a, b) => a.along - b.along);
  const edge = cand.filter((c) => Math.abs(c.across) >= 0.6);
  const out = [];
  for (let k = 0; k < CROWN_NOTES.length; k++) {
    const c = crown[Math.round(k * (crown.length - 1) / (CROWN_NOTES.length - 1))];
    out.push({ ...c, note: CROWN_NOTES[k], crown: true });
  }
  [[-3.6, -1], [0.7, 1], [4.4, -1]].forEach(([at, side], k) => {
    let pick = null;
    for (const c of edge) if (Math.sign(c.across) === side && (!pick || Math.abs(c.along - at) < Math.abs(pick.along - at))) pick = c;
    if (pick) out.push({ ...pick, note: EDGE_NOTES[k], crown: false });
  });
  return out;
}

export function buildCarillon(ctx, env) {
  const G = env.ground, rng = ctx.makeRng(7401), tints = stoneTints(ctx.palette);
  const list = caps(ctx.causeway, ctx.terrain.causewayDistance);
  const B = new Builder(ctx.noise);
  const A = new Acc(null, 'aPolish');
  const colors = [];
  const cPatina = new THREE.Color('#24473a'), cDark = new THREE.Color('#13201a'), cBright = new THREE.Color('#c08a52');
  const up = new THREE.Vector3(0, 1, 0), n = new THREE.Vector3(), q = new THREE.Quaternion(), qy = new THREE.Quaternion(), m4 = new THREE.Matrix4(), s1 = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
  const R = 0.62;                                // a touch larger than the causeway pavers, so it covers one
  const TOP = 0.068;                             // the paver profile's crown
  const pub = [];
  for (const c of list) {
    const gy = G.at(c.x, c.z);
    G.normal(c.x, c.z, n, 0.55);
    q.setFromUnitVectors(up, n).multiply(qy.setFromAxisAngle(up, (rng() - 0.5) * 0.03));
    const y = gy + 0.1 - TOP;
    m4.compose(p.set(c.x, y, c.z), q, s1);
    // the flag: the causeway paver's own profile
    const prof = [[R, -0.2], [R, 0.02], [R - 0.035, 0.06], [0.0, TOP]].map(([a, b]) => new THREE.Vector2(a, b));
    const fg = new THREE.LatheGeometry(prof, 6).toNonIndexed();
    B.add(fg, m4.clone(), { color: vary(tints.stone, rng, 0.12).multiplyScalar(0.85), moss: 0.35, ground: gy, flat: true });
    // the cap: bigger for the lower notes, domed, worn flatter where it is trodden
    const rc = 0.3 - c.note * 0.019;
    const polish = c.crown ? 0.8 + rng() * 0.2 : 0.1 + rng() * 0.2;
    const dome = c.crown ? 0.006 : 0.014;
    const cp = [[0, TOP + 0.008 + dome], [rc * 0.5, TOP + 0.008 + dome * 0.75], [rc * 0.85, TOP + 0.007], [rc, TOP + 0.002], [rc + 0.012, TOP - 0.004], [rc + 0.012, TOP - 0.04]]
      .map(([a, b]) => new THREE.Vector2(a, b));
    const cg = new THREE.LatheGeometry(cp, 24);
    // a ring of worn studs round the rim, one per note (the low notes count more)
    const studs = 9 - c.note + 3;
    const base = A.count;
    A.add(cg, m4, (x, yy, z) => {
      const d = Math.hypot(x - c.x, z - c.z) / rc;
      return polish * (1 - 0.75 * Math.max(0, Math.min(1, (d - 0.55) / 0.45)));
    });
    for (let k = 0; k < studs; k++) {
      const a = k / studs * Math.PI * 2;
      const sg = new THREE.CylinderGeometry(0.011, 0.014, 0.012, 6);
      sg.translate(Math.cos(a) * rc * 0.72, TOP + 0.008 + dome * 0.4, Math.sin(a) * rc * 0.72);
      A.add(sg, m4, polish * 0.6);
    }
    for (let i = base; i < A.count; i++) {
      const pl = A.X[i];
      const col = new THREE.Color().copy(cDark).lerp(cPatina, 0.6 + 0.4 * rng()).lerp(cBright, pl);
      colors.push(col.r, col.g, col.b);
    }
    const capY = gy + 0.1 + 0.01;
    pub.push({ x: c.x, z: c.z, y: capY, note: c.note, r: +rc.toFixed(3), polished: c.crown });
  }
  env.meshes.push(stoneMesh(B, env.stone.mat, 'ruins-carillon-flags'));

  const geo = A.build();
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));
  const uniforms = { uSheen: { value: 0.8 }, uSheenFlicker: { value: 1 }, uSheenSun: { value: new THREE.Vector3(ctx.sun.dir.x, ctx.sun.dir.y, ctx.sun.dir.z) } };
  const mt = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.5 });
  mt.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aPolish; varying float vPolish;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPolish = aPolish;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vPolish; uniform float uSheen, uSheenFlicker; uniform vec3 uSheenSun;')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(0.82, 0.28, vPolish);')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = mix(0.15, 0.9, vPolish);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' + SKY_SHEEN.replace('uSheen *', 'uSheen * (0.1 + vPolish) *'));
  };
  mt.customProgramCacheKey = () => 'fp-ruins-bronze-caps';
  const mesh = new THREE.Mesh(geo, mt);
  mesh.receiveShadow = true; mesh.castShadow = false; mesh.name = 'ruins-carillon-caps';
  env.meshes.push(mesh);

  // ---- ringing: the player's feet, and the traveller's, crossing onto a cap ----
  const K = pub.length;
  const cx = new Float32Array(K), cz = new Float32Array(K), cy = new Float32Array(K);
  const inP = new Uint8Array(K), inT = new Uint8Array(K);
  const pos = [], loud = [], quiet = [];
  pub.forEach((c, k) => { cx[k] = c.x; cz[k] = c.z; cy[k] = c.y; pos.push({ x: c.x, y: c.y, z: c.z }); loud.push({ note: c.note }); quiet.push({ note: c.note, quiet: true }); });
  const R2 = 0.52 * 0.52;                         // inside the flag's hex
  const state = ctx.carillon = { caps: pub, rings: 0, lastNote: -1, lastBy: null };
  const flick = ctx.sky?.flicker || { value: 1 };
  ctx.registerUpdate(() => {
    uniforms.uSheenFlicker.value = 0.4 + 0.6 * flick.value;
    const pl = ctx.player;
    if (pl) {
      const px = pl.pos.x, pz = pl.pos.z, feet = pl.pos.y - (pl.eye ?? 1.72);
      for (let k = 0; k < K; k++) {
        const dx = px - cx[k], dz = pz - cz[k];
        const on = dx * dx + dz * dz < R2 && Math.abs(feet - cy[k]) < 0.7 ? 1 : 0;
        if (on && !inP[k]) { state.rings++; state.lastNote = loud[k].note; state.lastBy = 'player'; ctx.audio?.cue?.('carillon', pos[k], loud[k]); }
        inP[k] = on;
      }
    }
    const tr = ctx.traveller?.position;
    if (tr) {
      for (let k = 0; k < K; k++) {
        const dx = tr.x - cx[k], dz = tr.z - cz[k];
        const on = dx * dx + dz * dz < R2 ? 1 : 0;
        if (on && !inT[k]) { state.rings++; state.lastNote = quiet[k].note; state.lastBy = 'traveller'; ctx.audio?.cue?.('carillon', pos[k], quiet[k]); }
        inT[k] = on;
      }
    }
  });
  return { caps: K, notes: pub.map((c) => c.note).join(',') };
}
