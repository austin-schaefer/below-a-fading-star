// L. The Hypogeum [Proposed]: a rectangular cut four metres into the ground, a stair worn hollow going
// down to a bronze door that never opens, under a lintel with a row of glyphs. Each time the sun
// gutters and recovers, the row shifts one place along; the glyph pushed off the end sinks into the
// stone and rises again at the start. The plan and the opening in the ground come from ../ruins.js.
import * as THREE from 'three';
import { Builder, mat } from '../../structures/geo.js';
import { stoneTints, vary } from '../../structures/common.js';
import { wornBlock, recolor, reaux, Acc, stoneMesh, SKY_SHEEN } from './util.js';

const GLYPHS = 11;          // slots on the lintel
const PITCH = 0.205;        // metres between glyph centres

export function buildHypogeum(ctx, env) {
  const P = env.plan, gO = env.opened.at, rng = ctx.makeRng(7101);
  const tints = stoneTints(ctx.palette);
  const B = new Builder(ctx.noise);
  const { x0, x1, zc, HW, WT, D, n, rise, Yf, yTop } = P;
  const xe = x1 + WT;                 // outer face of the east wall
  const yb = Yf - 0.35;               // foot of all masonry
  const pale = new THREE.Color('#a39888'), col = new THREE.Color();
  env.meshes.push(env.opened.patch);

  // ---- side walls: dressed courses, each column topped at the rim it meets ----
  for (const s of [-1, 1]) {
    const zw = zc + s * (HW + WT / 2);
    for (let x = x0; x < xe - 1e-3;) {
      const len = Math.min(0.9 + rng() * 0.5, xe - x);
      const xm = x + len / 2;
      const top = Math.max(gO(x, zc + s * (HW + WT)), gO(x + len, zc + s * (HW + WT)), gO(xm, zc + s * HW)) + 0.04;
      const h = top - yb;
      B.add(B.box(len + 0.01, h, WT, { chip: 0.03, seed: x * 3 + s, uvOffset: [x - x0, 0] }), mat(xm, yb + h / 2, zw), { color: vary(tints.stone, rng, 0.06), course: 0.42, moss: 0.75, ground: Yf });
      x += len;
    }
  }
  // ---- east wall, with the doorway, jambs, lintel and a cornice ----
  const dHalf = 0.8, dTop = Yf + 2.55;
  const eastTop = (z) => Math.max(gO(x1, z), gO(xe, z)) + 0.04;
  {
    const parts = [[zc - HW - WT, zc - dHalf], [zc + dHalf, zc + HW + WT]];
    for (const [za, zb] of parts) {
      const top = Math.max(eastTop(za), eastTop(zb), eastTop((za + zb) / 2));
      B.add(B.box(WT + 0.6, top - yb, zb - za, { chip: 0.02, uvOffset: [za, 0] }), mat(x1 + (WT + 0.6) / 2, (top + yb) / 2, (za + zb) / 2), { color: vary(tints.stone, rng, 0.05), course: 0.42, moss: 0.7, ground: Yf });
    }
    const top = Math.max(eastTop(zc - dHalf), eastTop(zc + dHalf), eastTop(zc)) ;
    B.add(B.box(WT + 0.6, top - dTop, dHalf * 2, { chip: 0.02 }), mat(x1 + (WT + 0.6) / 2, (top + dTop) / 2, zc), { color: vary(tints.stone, rng, 0.05), course: 0.42, moss: 0.7, ground: Yf });
    // the back of the recess: the door is all there is
    B.add(B.box(0.4, dTop - yb, dHalf * 2 + 0.02), mat(x1 + 0.62, (dTop + yb) / 2, zc), { color: tints.dark, moss: 0.2, ground: Yf });
  }
  // jambs: square pilasters with a plain base and a cushion capital
  for (const s of [-1, 1]) {
    const zj = zc + s * (dHalf + 0.17);
    B.add(B.box(0.2, dTop - Yf, 0.34, { chip: 0.03, seed: s * 5 }), mat(x1 - 0.06, Yf + (dTop - Yf) / 2, zj), { color: vary(tints.old, rng, 0.05), moss: 0.6, ground: Yf, disp: 0.008, dispScale: 4 });
    B.add(B.box(0.3, 0.22, 0.44, { chip: 0.03 }), mat(x1 - 0.08, Yf + 0.11, zj), { color: vary(tints.old, rng, 0.05), moss: 0.9, ground: Yf });
    B.add(B.box(0.28, 0.16, 0.42, { chip: 0.02 }), mat(x1 - 0.08, dTop - 0.08, zj), { color: vary(tints.old, rng, 0.05), moss: 0.5, ground: Yf });
  }
  // the lintel: one long stone, its face dressed smooth for the glyphs
  const lintel = { x: x1 - 0.21, y: dTop + 0.31, z: zc, len: 2.75, h: 0.62 };
  B.add(B.box(0.5, lintel.h, lintel.len, { chip: 0.035, seed: 41 }), mat(x1 + 0.04, dTop + lintel.h / 2, zc), { color: vary(tints.old, rng, 0.03), moss: 0.35, ground: Yf });
  B.add(B.box(0.62, 0.14, lintel.len + 0.5, { chip: 0.04, seed: 43 }), mat(x1 + 0.0, dTop + lintel.h + 0.07, zc), { color: vary(tints.stone, rng, 0.05), moss: 0.9, ground: Yf });
  // threshold, hollowed
  {
    const { g, wear } = wornBlock(B, dHalf * 2 + 0.3, 0.3, 0.42, { wear: 0.035, nose: 0.02, seed: 91, nu: 8, nv: 3 });
    const from = B.count;
    B.add(g, mat(x1 + 0.05, Yf - 0.12, zc, 0, Math.PI / 2, 0), { color: vary(tints.old, rng, 0.04), moss: 0.3, ground: Yf });
    recolor(B, from, (x, y, z, c, i) => c.lerp(pale, wear[i - from] * 0.6));
  }

  // ---- the stair: every tread hollowed by feet, deeper toward the bottom ----
  for (let k = 0; k < n - 1; k++) {
    const top = yTop - rise * (k + 1);
    const xa = x0 + k * D;
    const h = top - yb;
    const t = k / Math.max(1, n - 2);
    const { g, wear } = wornBlock(B, HW * 2 + 0.1, h, D + 0.02, {
      wear: 0.03 + 0.035 * t + rng() * 0.012, nose: 0.03 + 0.02 * t, chip: 0.03, seed: k * 7.3, nu: ctx.quality === 'low' ? 6 : 9, nv: 3,
      off: (rng() - 0.5) * 0.3, notch: k > 2 && rng() < 0.12 ? (rng() < 0.5 ? -1 : 1) * (0.08 + rng() * 0.1) : 0,
    });
    const from = B.count;
    B.add(g, mat(xa + D / 2, yb + h / 2, zc, 0, Math.PI / 2, 0), { color: vary(tints.stone, rng, 0.07), moss: 0.45, ground: top - 0.6 });
    recolor(B, from, (x, y, z, c, i) => c.lerp(pale, wear[i - from] * 0.75));
  }
  // the sill at the head of the stair, level with the ground
  {
    let top = -Infinity;
    for (let z = zc - HW; z <= zc + HW + 1e-3; z += 0.4) top = Math.max(top, gO(x0 - 0.25, z));
    top += 0.04;
    const { g, wear } = wornBlock(B, HW * 2 + 0.1, top - (yTop - rise - 0.5), 0.5, { wear: 0.03, nose: 0.05, seed: 3, nu: 8, nv: 3 });
    const from = B.count;
    B.add(g, mat(x0 - 0.25, (top + yTop - rise - 0.5) / 2, zc, 0, Math.PI / 2, 0), { color: vary(tints.old, rng, 0.05), moss: 0.55, ground: top - 0.3 });
    recolor(B, from, (x, y, z, c, i) => c.lerp(pale, wear[i - from] * 0.6));
  }

  // ---- the floor: flags over a bed, so no gap ever shows the opening below ----
  B.add(B.box(xe - x0, Yf - 0.03 - yb, HW * 2 + WT * 2), mat((x0 + xe) / 2, (Yf - 0.03 + yb) / 2, zc), { color: tints.dark, moss: 0.9, ground: Yf });
  {
    const fx0 = x0 + (n - 1) * D;
    let x = fx0;
    let row = 0;
    while (x < x1 - 0.05) {
      const len = Math.min(0.55 + rng() * 0.45, x1 - x);
      let z = zc - HW;
      const off = (row % 2) * 0.3;
      let first = true;
      while (z < zc + HW - 0.05) {
        const w = Math.min((first ? 0.45 + off : 0.6 + rng() * 0.5), zc + HW - z);
        first = false;
        const gap = 0.025;
        B.add(B.box(len - gap, 0.12, w - gap, { chip: 0.025, seed: x * 9 + z }), mat(x + len / 2, Yf - 0.06 + (rng() - 0.5) * 0.015, z + w / 2, (rng() - 0.5) * 0.015, 0, (rng() - 0.5) * 0.015),
          { color: vary(tints.stone, rng, 0.1).multiplyScalar(0.85), moss: 0.7, ground: Yf - 0.2 });
        z += w;
      }
      x += len; row++;
    }
  }
  // a kerb stone fallen in, and a scatter of grit at the wall feet
  B.add(B.box(0.8, 0.38, 0.55, { chip: 0.08, seed: 77 }), mat(x1 - 1.9, Yf + 0.14, zc - HW + 0.45, 0.12, 0.5, 0.2), { color: vary(tints.stone, rng, 0.06), moss: 0.9, ground: Yf, disp: 0.02 });
  for (let i = 0; i < 14; i++) {
    const s = 0.06 + rng() * 0.12, along = x0 + (n - 1) * D + rng() * (x1 - x0 - (n - 1) * D), side = rng() < 0.5 ? -1 : 1;
    B.add(B.rock(s, 0), mat(along, Yf + s * 0.2, zc + side * (HW - 0.08 - rng() * 0.2), rng() * 3, rng() * 6, rng() * 3), { color: vary(tints.scree, rng, 0.2), moss: 0.9, ground: Yf, flat: true });
  }

  // ---- the kerb round the mouth: low stones on the wall heads, open only at the stair ----
  const kerbRun = (ax, az, bx, bz, w) => {
    const L = Math.hypot(bx - ax, bz - az), tx = (bx - ax) / L, tz = (bz - az) / L, yaw = Math.atan2(-tz, tx);
    let s = 0;
    while (s < L - 0.1) {
      const len = Math.min(0.55 + rng() * 0.4, L - s);
      const m = s + len / 2, x = ax + tx * m, z = az + tz * m;
      const nx = -tz, nz = tx;
      const base = Math.min(gO(x - tx * len / 2 + nx * w / 2, z - tz * len / 2 + nz * w / 2), gO(x + tx * len / 2 - nx * w / 2, z + tz * len / 2 - nz * w / 2), gO(x + tx * len / 2 + nx * w / 2, z + tz * len / 2 + nz * w / 2), gO(x - tx * len / 2 - nx * w / 2, z - tz * len / 2 - nz * w / 2), gO(x, z)) - 0.12;
      const h = 0.4 + rng() * 0.14;
      B.add(B.box(len - 0.04, h + 0.12, w, { chip: 0.05, seed: x + z }), mat(x, base + (h + 0.12) / 2, z, (rng() - 0.5) * 0.04, yaw + (rng() - 0.5) * 0.05, (rng() - 0.5) * 0.05),
        { color: vary(tints.old, rng, 0.08), moss: 0.85, ground: base + 0.12, disp: 0.012, dispScale: 3 });
      s += len;
    }
  };
  for (const s of [-1, 1]) kerbRun(x0 - 0.05, zc + s * (HW + WT / 2), xe + 0.05, zc + s * (HW + WT / 2), WT + 0.05);
  kerbRun(x1 + WT / 2, zc - HW, x1 + WT / 2, zc + HW, WT + 0.05);
  // newel blocks either side of the stair head
  for (const s of [-1, 1]) {
    const x = x0 - 0.1, z = zc + s * (HW + WT / 2), base = Math.min(gO(x - 0.4, z), gO(x + 0.4, z), gO(x, z - 0.4), gO(x, z + 0.4)) - 0.15;
    B.add(B.box(0.75, 0.95, 0.75, { chip: 0.07, seed: 12 + s }), mat(x, base + 0.47, z, 0, (rng() - 0.5) * 0.08, (rng() - 0.5) * 0.04), { color: vary(tints.old, rng, 0.05), moss: 0.9, ground: base + 0.15, course: 0.48 });
    B.add(B.box(0.85, 0.14, 0.85, { chip: 0.05 }), mat(x, base + 1.0, z, 0, 0.03 * s, 0), { color: vary(tints.old, rng, 0.05), moss: 0.9, ground: base + 0.15 });
  }
  // old flags round the mouth, sinking back into the turf
  for (let i = 0; i < 34; i++) {
    const a = rng() * Math.PI * 2, rr = 0.5 + rng() * 3.5;
    let x = (x0 + xe) / 2 + Math.cos(a) * ((xe - x0) / 2 + rr), z = zc + Math.sin(a) * (HW + WT + rr);
    if (i < 10) { x = x0 - 0.9 - rng() * 3.2; z = zc + (rng() - 0.5) * (HW * 2 + 0.4); }
    if (x > x0 - 0.75 && x < xe + 0.4 && Math.abs(z - zc) < HW + WT + 0.45) continue;
    const gy = gO(x, z), w = 0.45 + rng() * 0.45, d = 0.4 + rng() * 0.4;
    B.add(B.box(w, 0.1, d, { chip: 0.04, seed: i }), mat(x, gy - 0.035 - rng() * 0.03, z, (rng() - 0.5) * 0.08, rng() * 0.5 - 0.25, (rng() - 0.5) * 0.08), { color: vary(tints.stone, rng, 0.12).multiplyScalar(0.85), moss: 0.95, ground: gy - 0.1 });
  }
  env.meshes.push(stoneMesh(B, env.stone.mat, 'ruins-hypogeum'));

  // ---- the door ----
  env.meshes.push(buildDoor(ctx, P, dHalf, dTop));
  // ---- the glyphs ----
  const glyphs = buildGlyphs(ctx, lintel);
  env.meshes.push(glyphs.mesh);

  // ---- colliders: the cut's walls, the door, the kerb ----
  const r = 0.5;
  for (const s of [-1, 1]) for (let x = x0 - 0.2; x <= xe + 0.01; x += 0.5) ctx.addCollider({ x, z: zc + s * (HW + r), r });
  for (let z = zc - HW; z <= zc + HW + 1e-3; z += 0.5) ctx.addCollider({ x: x1 + r, z, r });
  for (const s of [-1, 1]) ctx.addCollider({ x: x0 - 0.1, z: zc + s * (HW + WT / 2), r: 0.5 });

  // ---- the gutter: shift the row one place each time the sun falters and comes back ----
  const flick = ctx.sky?.flicker || { value: 1 };
  const order = glyphs.forms.slice();               // slot -> form, left to right as you face the door
  const pub = ctx.hypogeum = {
    glyphOrder: order, shifts: 0,
    door: { x: x1 + 0.3, y: Yf + 1.27, z: zc, width: dHalf * 2, height: dTop - Yf },
    lintel: { x: lintel.x, y: lintel.y, z: zc }, floor: Yf, stairTop: { x: x0, z: zc, y: yTop },
  };
  const cuePos = { x: lintel.x, y: lintel.y, z: zc };
  const u = glyphs.uniforms;
  let armed = false, target = 0;
  ctx.registerUpdate((dt) => {
    const f = flick.value;
    if (f < 0.5) armed = true;
    else if (armed && f > 0.85) {
      armed = false; target += 1; pub.shifts += 1;
      // the last slot's glyph comes round to the first
      const last = order[GLYPHS - 1];
      for (let i = GLYPHS - 1; i > 0; i--) order[i] = order[i - 1];
      order[0] = last;
      ctx.audio?.cue?.('glyph-shift', cuePos);
    }
    if (u.uShift.value < target) u.uShift.value = Math.min(target, u.uShift.value + dt * 0.7);
  });
  return { glyphs: GLYPHS, colliders: 0 };
}

// Bronze: green-black patina, darker in the recesses, verdigris weeping down from the rails, and a few
// bright scrapes at hand height and at the foot where something was dragged or kicked. Two leaves,
// rails and studs, a boss on each leaf and a ring that has not been pulled.
function buildDoor(ctx, P, dHalf, dTop) {
  const { x1, zc, Yf } = P;
  const xd = x1 + 0.3;                  // the door's face
  const H = dTop - Yf - 0.03;
  const rng = ctx.makeRng(7102);
  const W = 256, Hh = 512;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = Hh;
  const cm = document.createElement('canvas'); cm.width = W; cm.height = Hh;
  const c = cv.getContext('2d'), m = cm.getContext('2d');
  c.fillStyle = '#18241d'; c.fillRect(0, 0, W, Hh);
  m.fillStyle = 'rgb(0,215,40)'; m.fillRect(0, 0, W, Hh); // G roughness, B metalness
  for (let i = 0; i < 900; i++) {
    const x = rng() * W, y = rng() * Hh, r = 2 + rng() * 14;
    const k = rng();
    c.fillStyle = k < 0.45 ? 'rgba(8,12,10,0.35)' : k < 0.8 ? 'rgba(34,52,40,0.3)' : `rgba(${60 + rng() * 20},${105 + rng() * 25},${82 + rng() * 15},${0.12 + 0.25 * (y / Hh)})`;
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  }
  // weeping verdigris below the rails
  for (const ry of [0.06, 0.36, 0.66, 0.95]) for (let i = 0; i < 26; i++) {
    const x = rng() * W, y0 = (1 - ry) * Hh, len = 20 + rng() * 90;
    const gr = c.createLinearGradient(0, y0, 0, y0 + len);
    gr.addColorStop(0, 'rgba(78,134,104,0.4)'); gr.addColorStop(1, 'rgba(78,134,104,0)');
    c.fillStyle = gr; c.fillRect(x, y0, 1 + rng() * 2.5, len);
  }
  // scrapes: bright metal through the patina
  const scrape = (x, y, len, ang, wdt) => {
    for (const [ctx2, col] of [[c, `rgba(${200 + rng() * 30},${140 + rng() * 25},${85 + rng() * 20},0.9)`], [m, 'rgb(0,80,225)']]) {
      ctx2.strokeStyle = col; ctx2.lineWidth = wdt; ctx2.lineCap = 'round';
      ctx2.beginPath(); ctx2.moveTo(x, y); ctx2.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len); ctx2.stroke();
    }
  };
  for (let i = 0; i < 9; i++) scrape(W * (0.3 + rng() * 0.4), Hh * (0.48 + rng() * 0.12), 18 + rng() * 60, (rng() - 0.5) * 0.7, 1 + rng() * 1.6);
  for (let i = 0; i < 5; i++) scrape(W * (0.1 + rng() * 0.8), Hh * (0.9 + rng() * 0.07), 10 + rng() * 40, (rng() - 0.5) * 0.4, 1 + rng());
  scrape(W * 0.08, Hh * 0.3, 70, 1.2, 2.2);
  // where hands go: two dull polished patches by the rings
  for (const px of [0.42, 0.58]) {
    const gr = c.createRadialGradient(W * px, Hh * 0.55, 2, W * px, Hh * 0.55, 26);
    gr.addColorStop(0, 'rgba(150,104,58,0.55)'); gr.addColorStop(1, 'rgba(150,104,58,0)');
    c.fillStyle = gr; c.fillRect(0, 0, W, Hh);
  }
  const map = new THREE.CanvasTexture(cv); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4;
  const orm = new THREE.CanvasTexture(cm);
  const uniforms = { uSheen: { value: 0.35 }, uSheenFlicker: { value: 1 }, uSheenSun: { value: new THREE.Vector3(ctx.sun.dir.x, ctx.sun.dir.y, ctx.sun.dir.z) } };
  const mt = new THREE.MeshStandardMaterial({ map, roughnessMap: orm, metalnessMap: orm, roughness: 1, metalness: 1 });
  mt.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uSheen, uSheenFlicker; uniform vec3 uSheenSun;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' + SKY_SHEEN.replace('uSheen *', 'uSheen * (0.25 + metalnessFactor) *'));
  };
  mt.customProgramCacheKey = () => 'fp-ruins-bronze-door';
  const flick = ctx.sky?.flicker || { value: 1 };
  ctx.registerUpdate(() => { uniforms.uSheenFlicker.value = 0.4 + 0.6 * flick.value; });

  // uv: planar across the opening, u along +z, v up
  const A = new Acc((x, y, z) => [(z - (zc - dHalf)) / (dHalf * 2), (y - Yf) / H]);
  const box = (w, h, d, x, y, z, seg = 1) => { const g = new THREE.BoxGeometry(w, h, d, seg, seg, seg); g.translate(x, y, z); A.add(g); };
  const t = 0.1;
  for (const s of [-1, 1]) {
    const zc2 = zc + s * dHalf / 2;
    box(t, H, dHalf - 0.012, xd + t / 2, Yf + 0.02 + H / 2, zc2);
    // stiles and rails, standing proud of the leaf
    const zo = zc + s * (dHalf - 0.05), zi = zc + s * 0.05;
    box(0.035, H - 0.02, 0.08, xd - 0.0175, Yf + 0.02 + H / 2, zo);
    box(0.035, H - 0.02, 0.07, xd - 0.0175, Yf + 0.02 + H / 2, zi);
    for (const fy of [0.03, 0.34, 0.66, 0.97]) {
      const y = Yf + 0.02 + H * fy;
      box(0.035, 0.08, dHalf - 0.06, xd - 0.0175, y, zc2);
      for (let k = 0; k < 6; k++) {
        const g = new THREE.CylinderGeometry(0.016, 0.022, 0.03, 6); g.rotateZ(Math.PI / 2);
        g.translate(xd - 0.045, y, zc + s * (0.12 + k * (dHalf - 0.22) / 5)); A.add(g);
      }
    }
    // the boss: a disc with a ring of short rays, low and worn
    const by = Yf + 0.02 + H * 0.82;
    { const g = new THREE.CylinderGeometry(0.13, 0.15, 0.04, 16); g.rotateZ(Math.PI / 2); g.translate(xd - 0.02, by, zc2); A.add(g); }
    for (let k = 0; k < 10; k++) {
      const a = k / 10 * Math.PI * 2;
      const g = new THREE.BoxGeometry(0.02, 0.07, 0.02); g.translate(0, 0.19, 0); g.rotateX(a); g.translate(xd - 0.015, by, zc2); A.add(g);
    }
    // the ring and its boss
    const ry = Yf + 1.16, rz = zc + s * 0.17;
    { const g = new THREE.CylinderGeometry(0.045, 0.06, 0.05, 10); g.rotateZ(Math.PI / 2); g.translate(xd - 0.025, ry + 0.11, rz); A.add(g); }
    { const g = new THREE.TorusGeometry(0.11, 0.017, 6, 18); g.rotateY(Math.PI / 2); g.rotateZ(0.12 * s); g.translate(xd - 0.07, ry, rz); A.add(g); }
  }
  const mesh = new THREE.Mesh(A.build(), mt);
  mesh.castShadow = true; mesh.receiveShadow = true; mesh.name = 'ruins-hypogeum-door';
  return mesh;
}

// Nine glyph forms from simple strokes, none of them letters: stepped bars under a dot; an eye with a
// tail; two chevrons on a bar; a hook holding a dot; a fringe; a pierced lozenge; an arc over two dots;
// a zigzag on a ledge; a guttered sun.
function glyphStrokes(f) {
  const S = [];
  const seg = (a, b, c, d) => S.push(['s', a, b, c, d]);
  const ring = (x, y, r) => S.push(['r', x, y, r]);
  const dot = (x, y) => S.push(['d', x, y]);
  const arc = (x, y, r, a0, a1, n = 5) => { for (let k = 0; k < n; k++) { const p = a0 + (a1 - a0) * k / n, q = a0 + (a1 - a0) * (k + 1) / n; seg(x + Math.cos(p) * r, y + Math.sin(p) * r, x + Math.cos(q) * r, y + Math.sin(q) * r); } };
  switch (f) {
    case 0: seg(-0.06, -0.12, -0.06, -0.02); seg(0, -0.12, 0, 0.05); seg(0.06, -0.12, 0.06, 0.12); dot(-0.06, 0.05); break;
    case 1: ring(0, 0.03, 0.068); dot(-0.028, 0.03); dot(0.028, 0.03); seg(0, -0.04, 0.03, -0.125); break;
    case 2: seg(-0.075, 0.1, -0.02, 0.03); seg(-0.02, 0.03, -0.075, -0.04); seg(-0.005, 0.1, 0.05, 0.03); seg(0.05, 0.03, -0.005, -0.04); seg(-0.08, -0.105, 0.08, -0.105); break;
    case 3: seg(-0.06, 0.12, -0.06, -0.1); seg(-0.06, -0.1, 0.06, -0.1); seg(0.06, -0.1, 0.06, 0.02); dot(0.0, -0.015); seg(0.02, 0.12, 0.07, 0.12); break;
    case 4: seg(-0.08, 0.1, 0.08, 0.1); seg(-0.055, 0.1, -0.055, -0.02); seg(0, 0.1, 0, -0.12); seg(0.055, 0.1, 0.055, 0.035); dot(-0.055, -0.07); break;
    case 5: seg(0, 0.11, 0.06, 0.03); seg(0.06, 0.03, 0, -0.05); seg(0, -0.05, -0.06, 0.03); seg(-0.06, 0.03, 0, 0.11); seg(0, 0.0, 0, -0.13); break;
    case 6: arc(0, -0.01, 0.075, 0, Math.PI, 6); dot(-0.035, -0.08); dot(0.035, -0.08); dot(0, 0.11); break;
    case 7: seg(-0.05, 0.12, 0.05, 0.06); seg(0.05, 0.06, -0.05, 0.0); seg(-0.05, 0.0, 0.05, -0.06); seg(0.05, -0.06, -0.05, -0.115); seg(-0.08, -0.115, 0.0, -0.115); break;
    default: ring(0, -0.02, 0.05); seg(0, 0.045, 0, 0.12); seg(-0.04, 0.035, -0.075, 0.09); seg(0.04, 0.035, 0.075, 0.09); seg(-0.06, -0.11, 0.06, -0.11); break;
  }
  return S;
}

function buildGlyphs(ctx, lintel) {
  const rng = ctx.makeRng(7103);
  // the first nine slots hold each form once, in a shuffled order; the last two repeat
  const forms = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  for (let i = forms.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [forms[i], forms[j]] = [forms[j], forms[i]]; }
  while (forms.length < GLYPHS) forms.push(Math.floor(rng() * 9));
  const A = new Acc(null, 'aGlyph');
  const TH = 0.024, DEP = 0.016;
  for (let gi = 0; gi < GLYPHS; gi++) {
    for (const st of glyphStrokes(forms[gi])) {
      let g;
      if (st[0] === 's') {
        const [, a, b, c2, d] = st, L = Math.hypot(c2 - a, d - b) + TH * 0.8;
        g = new THREE.BoxGeometry(L, TH, DEP, 2, 1, 1);
        g.rotateZ(Math.atan2(d - b, c2 - a)); g.translate((a + c2) / 2, (b + d) / 2, DEP / 2);
      } else if (st[0] === 'r') {
        g = new THREE.TorusGeometry(st[3], TH * 0.55, 4, 16); g.scale(1, 1, DEP / (TH * 1.1)); g.translate(st[1], st[2], DEP / 2);
      } else {
        g = new THREE.CylinderGeometry(TH * 0.85, TH * 0.95, DEP, 8); g.rotateX(Math.PI / 2); g.translate(st[1], st[2], DEP / 2);
      }
      // worn: a little sag and unevenness
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) * (0.75 + 0.25 * Math.sin(p.getX(i) * 61 + gi) * Math.cos(p.getY(i) * 47)));
      A.add(g, null, gi);
    }
  }
  const geo = A.build();
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), PITCH * GLYPHS);
  const uniforms = { uShift: { value: 0 }, uN: { value: GLYPHS }, uPitch: { value: PITCH } };
  const mt = new THREE.MeshStandardMaterial({ color: new THREE.Color('#9a8c7c'), roughness: 0.9, metalness: 0 });
  mt.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aGlyph; uniform float uShift, uN, uPitch;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        {
          float gBase = mod(aGlyph + floor(uShift), uN);
          float gF = fract(uShift);
          gF = gF * gF * (3.0 - 2.0 * gF);
          float gSlot = gBase + gF, gSink = 1.0;
          if (gBase > uN - 1.5) {
            // the glyph pushed off the end sinks into the stone and rises again at the start
            if (gF < 0.5) { gSlot = uN - 1.0; gSink = 1.0 - gF * 2.0; } else { gSlot = 0.0; gSink = gF * 2.0 - 1.0; }
          }
          transformed.z = transformed.z * gSink - 0.006 * (1.0 - gSink);
          transformed.x += (gSlot - (uN - 1.0) * 0.5) * uPitch;
        }`);
  };
  mt.customProgramCacheKey = () => 'fp-ruins-glyphs';
  const mesh = new THREE.Mesh(geo, mt);
  // local x runs along the lintel toward +z (left to right as you face the door), local z out of its face (-x)
  mesh.position.set(lintel.x, lintel.y, lintel.z);
  mesh.rotation.y = -Math.PI / 2;
  mesh.castShadow = false; mesh.receiveShadow = true; mesh.name = 'ruins-hypogeum-glyphs';
  return { mesh, uniforms, forms };
}
