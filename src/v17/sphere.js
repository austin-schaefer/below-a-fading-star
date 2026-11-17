// The man at the wheel (v17-S1, the owner's #74: "a large (30 meter?) plastisteel sphere, partly above ground, partly
// in mountain wall, partly in ground"). The Noonwrights' junction at the east wall's foot: a ball of their glass 30 m
// across, blown whole, sunk in the ground and in the wall's rising foot, banded with lime where it was joined and
// clouded in fields, clear between. Inside it the ground is cut away: earth, roots and stones pressed against the lower
// glass. Stays of spun filament run from all round to the middle, where a Noonwright sits in a sling at the junction's
// node, both hands on the valve wheel he turned shut, head bowed to it, in the last full noon in the valley, which he
// kept. A broken line of hoops leaves the side toward the Meridian Garth (src/v17/garth.js), the tube
// between them gone. stories/the-man-at-the-wheel.md. The numbers: src/v17/plan.js SPHERE.
// Draws: the glass (one, transparent, a fresnel glaze, no transmission pass), the earth (one), the parts (one: the
// keeper, his wheel, the node, the stays, the hoops), the bank (one: earth and heather over the terrain's cut edge). One PointLight
// of NOON.lightHex at the crown inside, breathing with the baked glow (one uniform).
// The terrain's triangles inside the glass are made degenerate after the bake (v5/nave.js's way; never heightAt):
// heightAt there is the old hill, kept out of by a ring of short walls fitted to where the glass meets the ground.
// ?sphere=0 leaves it out.
import * as THREE from 'three';
import { UnderBuilder, underMaterial } from '../v14/under.js';
import { NOON, NOON_PARTS as NP, GLAZES, put, strand } from '../v8/strata/noon.js';
import { SPHERE } from './plan.js';

export const SPHERE_OFF = typeof location !== 'undefined' && new URLSearchParams(location.search).get('sphere') === '0';

const [CX, CZ] = SPHERE.c, R = SPHERE.r, CY = SPHERE.y;
const ss = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
const h1 = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const n3 = (x, y, z) => { // a cheap value noise, for paint at build
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = x - ix, fy = y - iy, fz = z - iz;
  const H = (a, b, c) => h1(a * 15.7 + b * 47.3 + c * 91.1);
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
  const L = (a, b, t) => a + (b - a) * t;
  return L(L(L(H(ix, iy, iz), H(ix + 1, iy, iz), u), L(H(ix, iy + 1, iz), H(ix + 1, iy + 1, iz), u), v),
    L(L(H(ix, iy, iz + 1), H(ix + 1, iy, iz + 1), u), L(H(ix, iy + 1, iz + 1), H(ix + 1, iy + 1, iz + 1), u), v), w);
};
const C3 = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };

// the glass: milk glass, clear where it was blown thin, clouded in fields, lime crusted along its joins and at the
// ground, crazed and streaked; the noon inside lights its clouded fields from within (uBreath)
function glassMaterial(uBreath, low) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.22, metalness: 0, transparent: true, depthWrite: false, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uBreath = uBreath;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aGround; varying float vGround; varying vec3 vSW;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGround = aGround; vSW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
      varying float vGround; varying vec3 vSW; uniform float uBreath;
      float sgH(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
      float sgN(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(sgH(i), sgH(i + vec3(1,0,0)), f.x), mix(sgH(i + vec3(0,1,0)), sgH(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(sgH(i + vec3(0,0,1)), sgH(i + vec3(1,0,1)), f.x), mix(sgH(i + vec3(0,1,1)), sgH(i + vec3(1,1,1)), f.x), f.y), f.z); }
      float sgField; float sgBand;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 sgD = normalize(vSW - vec3(${CX.toFixed(1)}, ${CY.toFixed(1)}, ${CZ.toFixed(1)}));
        vec3 sgV = normalize(cameraPosition - vSW);
        float sgF = 1.0 - abs(dot(sgD, sgV));
        // fields: clouded patches where the glass was blown thick, ragged at their edges; a third of it, no more, so
        // the keeper is seen between them. Each field has its own tint: milk, a celadon gone grey, a smoke of amber
        float sgA = sgN(sgD * 1.8) * 0.7 + sgN(sgD * 5.0 + 3.0) * 0.25 + sgN(sgD * 14.0) * 0.05;
        sgField = smoothstep(0.5, 0.72, sgA); // a haze that thickens, never a hard-edged blot
        float sgTint = sgN(sgD * 1.7 + 5.0);
        // the joins: lime crusted along the courses it was blown in, which wander (it was blown by hand, not turned),
        // ragged and flaked away in stretches
        vec3 sgAx = normalize(vec3(0.18, 1.0, -0.12));
        float sgLat = asin(clamp(dot(sgD, sgAx), -1.0, 1.0)) * ${R.toFixed(1)} + 1.6 * sgN(sgD * 2.0 + 7.0) + 0.5 * sgN(sgD * 6.0);
        float sgRag = 0.1 * sgN(vSW * 1.3) + 0.06 * sgN(vSW * 5.0);
        float sgL = abs(fract(sgLat / 5.2 + 0.3) - 0.5) * 5.2;
        sgBand = 1.0 - smoothstep(0.12 + sgRag, 0.24 + sgRag, sgL);
        sgBand *= smoothstep(0.28, 0.42, sgN(sgD * 4.0 + 11.0)); // the crust flaked off in stretches
        float sgG = 1.0 - smoothstep(0.0, 0.25 + 0.3 * sgN(vSW * 0.9), vGround);
        // grime: the ground's splash and silt up the lower glass, thinning upward; lichen on the top, where rain sits
        float sgDirt = (1.0 - smoothstep(0.0, 2.2 + 1.5 * sgN(vSW * 0.6), vGround)) * (0.55 + 0.45 * sgN(vSW * 2.3));
        float sgLich = smoothstep(0.75, 0.9, sgD.y + 0.3 * sgN(vSW * 0.5)) * smoothstep(0.55, 0.7, sgN(vSW * 0.9 + 2.0));
        // streaks down from every band
        float sgS = smoothstep(0.55, 0.8, sgN(vec3(vSW.x * 2.5, vSW.y * 0.3, vSW.z * 2.5)));
        vec3 sgMilk = mix(vec3(0.62, 0.6, 0.53), vec3(0.6, 0.52, 0.4), smoothstep(0.6, 0.8, sgTint));
        sgMilk *= 0.8 + 0.3 * sgN(vSW * 3.0);
        vec3 sgLime = vec3(0.56, 0.54, 0.46) * (0.65 + 0.4 * sgN(vSW * 6.0));
        vec3 sgClear = vec3(0.28, 0.31, 0.29);
        vec3 sgCol = mix(sgClear, sgMilk, sgField);
        sgCol = mix(sgCol, sgLime, max(sgBand, sgG));
        sgCol = mix(sgCol, vec3(0.2, 0.16, 0.11), sgDirt * (1.0 - sgG) * 0.8);
        sgCol = mix(sgCol, vec3(0.4, 0.4, 0.34) * (0.7 + 0.5 * sgN(vSW * 9.0)), sgLich * 0.5);
        sgCol *= 1.0 - 0.3 * sgS * (1.0 - sgBand);
        // crazed: a fine net of dark lines in the thick glass
        float sgC = abs(sgN(vSW * 9.0) - sgN(vSW * 9.0 + 7.3));
        sgCol *= 1.0 - 0.35 * (1.0 - smoothstep(0.0, 0.03, sgC)) * sgField;
        diffuseColor.rgb = sgCol;
        float sgClearA = 0.04 + 0.4 * pow(sgF, 4.0) + 0.07 * sgS + 0.08 * smoothstep(0.45, 0.6, sgA);
        float sgAl = mix(sgClearA, 0.42 + 0.15 * sgN(vSW * 2.0), sgField);
        sgAl = mix(sgAl, 0.75, sgDirt * 0.7);
        sgAl = mix(sgAl, 0.9, max(sgLich * 0.4, max(sgBand, sgG)));
        diffuseColor.a = clamp(sgAl, 0.0, 1.0);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        // lit from inside: the clouded glass carries the noon, the clear glass barely; back faces (the far wall's inside) most
        float sgBack = gl_FrontFacing ? 0.55 : 1.0;
        totalEmissiveRadiance += vec3(1.0, 0.95, 0.82) * uBreath * sgBack * (0.012 + 0.13 * sgField * (1.0 - sgBand) + 0.02 * sgBand) * (1.0 - sgG) * (1.0 - 0.8 * sgDirt) * (1.0 - sgLich);`);
  };
  m.customProgramCacheKey = () => 'fp-sphere-glass' + (low ? '-low' : '');
  return m;
}

export async function build(ctx) {
  if (SPHERE_OFF) { ctx.sphere = { off: true }; return; }
  const t0 = performance.now();
  const low = ctx.quality === 'low';
  const T = ctx.terrain;
  await ctx.progress?.('the sphere', 0);

  // ---- the drawn ground: bilinear from the terrain mesh's own vertices (a member ends on what is drawn)
  const g = T.mesh.geometry, P = g.attributes.position.array, COL = g.attributes.color.array;
  const segs = g.parameters?.widthSegments ?? 480, size = g.parameters?.width ?? 1000, half = size / 2, cell = size / segs, row = segs + 1;
  const grid = (arr, stride, k) => (x, z) => {
    const gx = (x + half) / cell, gy = (z + half) / cell, ix = Math.floor(gx), iy = Math.floor(gy), fx = gx - ix, fy = gy - iy;
    const a = arr[(iy * row + ix) * stride + k], b = arr[(iy * row + ix + 1) * stride + k], c = arr[((iy + 1) * row + ix) * stride + k], d = arr[((iy + 1) * row + ix + 1) * stride + k];
    return (a + (b - a) * fx) + ((c + (d - c) * fx) - (a + (b - a) * fx)) * fy;
  };
  // the height on the drawn triangles themselves (PlaneGeometry's split: a cell's diagonal runs from (ix, iy + 1) to
  // (ix + 1, iy)), not bilinear across the cell: the bank's foot lies 4 cm over it and must not be crossed by a
  // triangle's flank (on low, 3.1 m cells, the two differ by more than that and the terrain showed through in teeth)
  const gy = (x, z) => {
    const gx = (x + half) / cell, gz = (z + half) / cell, ix = Math.floor(gx), iy = Math.floor(gz), fx = gx - ix, fz = gz - iy;
    const H = (i, j) => P[(j * row + i) * 3 + 1], a = H(ix, iy), b = H(ix, iy + 1), c = H(ix + 1, iy + 1), d = H(ix + 1, iy);
    return fx + fz <= 1 ? a + (d - a) * fx + (b - a) * fz : c + (b - c) * (1 - fx) + (d - c) * (1 - fz);
  };
  const gc = [grid(COL, 3, 0), grid(COL, 3, 1), grid(COL, 3, 2)];
  // is the ground at (x, y, z) inside the glass (between its lower and upper skins)?
  const inside = (x, y, z) => { const d2 = (x - CX) ** 2 + (z - CZ) ** 2; if (d2 >= R * R) return false; const s = Math.sqrt(R * R - d2); return y > CY - s - 0.05 && y < CY + s + 0.3; };

  // ---- the terrain's triangles inside the glass are not drawn (its ground is cut away)
  let cut = 0;
  {
    const idx = g.index.array;
    for (let t = 0; t < idx.length; t += 3) {
      const a = idx[t], b = idx[t + 1], c = idx[t + 2], xa = P[a * 3], za = P[a * 3 + 2];
      if (Math.abs(xa - CX) > R + 5 || Math.abs(za - CZ) > R + 5) continue;
      // a vertex inside, or the face itself dipping in (on the hill behind, a face whose corners all lie over the
      // dome or past its rim can still cross into the glass: seen through it as pale teeth along the far join)
      let hit = inside(P[a * 3], P[a * 3 + 1], P[a * 3 + 2]) || inside(P[b * 3], P[b * 3 + 1], P[b * 3 + 2]) || inside(P[c * 3], P[c * 3 + 1], P[c * 3 + 2]);
      for (let k = 0; !hit && k < 7; k++) {
        const [wa, wb] = [[1 / 3, 1 / 3], [0.5, 0.5], [0, 0.5], [0.5, 0], [0.7, 0.15], [0.15, 0.7], [0.15, 0.15]][k], wc = 1 - wa - wb;
        hit = inside(P[a * 3] * wa + P[b * 3] * wb + P[c * 3] * wc, P[a * 3 + 1] * wa + P[b * 3 + 1] * wb + P[c * 3 + 1] * wc, P[a * 3 + 2] * wa + P[b * 3 + 2] * wb + P[c * 3 + 2] * wc);
      }
      if (hit) { idx[t + 1] = a; idx[t + 2] = a; cut++; }
    }
    g.index.needsUpdate = true;
  }

  // ---- the breath: one uniform for the glass's glow, the baked noon on everything inside, and the light
  const uBreath = { value: 1 };
  const meshes = [];
  const add = (m, name) => { m.name = name; m.castShadow = false; m.receiveShadow = false; ctx.scene.add(m); meshes.push(m); return m; };

  // ---- the glass
  {
    const sg = new THREE.SphereGeometry(R, low ? 56 : 96, low ? 40 : 64);
    sg.translate(CX, CY, CZ);
    const p = sg.attributes.position.array, ag = new Float32Array(p.length / 3);
    for (let i = 0; i < ag.length; i++) ag[i] = p[i * 3 + 1] - gy(p[i * 3], p[i * 3 + 2]);
    sg.setAttribute('aGround', new THREE.BufferAttribute(ag, 1));
    const m = add(new THREE.Mesh(sg, glassMaterial(uBreath, low)), 'sphere-glass');
    m.renderOrder = 2;
  }

  // the noon inside: baked as under.js's glow (white, breathing through the material's uGlow), brightest high up
  // where the line came down, falling to the bottom of the bowl
  let glowK = 1; // the keeper takes less of it than the earth round him, so he stands dark in the light
  const noonK = (x, y, z) => (0.75 + 0.5 * ss(CY - 12, CY + 10, y)) * glowK;
  const lit = (x, y, z, out) => { out[0] = 1; out[1] = 1; out[2] = noonK(x, y, z); return out; };
  const noonHex = NOON.lightHex;
  const mats = [];
  const umat = (key, o = {}) => { const m = underMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0, ...o }), key, noonHex); mats.push(m); return m; };

  // ---- the earth: the cut ground pressed against the glass from outside, seen through it from within. A skin just
  // outside the glass wherever it lies under the drawn ground, painted in courses by depth (turf and roots, brown
  // earth, ochre clay, the wall's grey scree), with stones pressed flat against it
  {
    const E = new UnderBuilder(lit), rng = ctx.makeRng(17501);
    const nU = low ? 64 : 112, nV = low ? 40 : 64, Re = R + 0.12;
    const pt = (i, j) => { const u = (i / nU) * Math.PI * 2, v = (j / nV) * Math.PI, s = Math.sin(v); return [CX + Re * s * Math.cos(u), CY - Re * Math.cos(v), CZ + Re * s * Math.sin(u)]; };
    const TURF = C3('#2e2416'), LOAM = C3('#5a3a22'), CLAY = C3('#82562c'), SCREE = C3('#6a5c56'), ROOT = C3('#1d1610'), STONE = C3('#8a8478');
    const paint = (x, y, z) => {
      const d = gy(x, z) - y, n = n3(x * 0.6, y * 0.9, z * 0.6), w = d + (n - 0.5) * 1.2;
      let c = w < 0.5 ? TURF : w < 2.6 ? LOAM : w < 6.5 ? CLAY : SCREE;
      if (d > 0.8 && n3(x * 0.9 + 3, y * 1.1, z * 0.9) > 0.74) c = STONE; // stones in the earth, pressed to the glass
      if (w > 2.4 && w < 2.8) c = LOAM;
      const k = 0.75 + 0.4 * n3(x * 2.2, y * 3.5, z * 2.2);
      const rootish = d < 3 && n3(x * 1.6, y * 0.25, z * 1.6) > 0.72 ? 0.55 : 1; // roots hanging down through the top courses
      return [c[0] * k * rootish, c[1] * k * rootish, c[2] * k * rootish];
    };
    // each quad's two triangles clipped on the sphere to just under the drawn ground (f < 0), never squashed: the
    // skin keeps to the glass's own curve and ends on one clean line 6 cm under the ground, where the bank's foot
    // (outside the glass, down to 45 cm under) closes it. (issue-1722 pulled corners down instead: the folded faces
    // turned flat and dark and showed through the glass as a sawtooth of big blue triangles along the rim, the
    // owner's second report)
    const f = (p) => p[1] - (gy(p[0], p[2]) - 0.06);
    const onS = (p, rr) => { const dx = p[0] - CX, dy = p[1] - CY, dz = p[2] - CZ, l = Math.hypot(dx, dy, dz) || 1; return [CX + dx / l * rr, CY + dy / l * rr, CZ + dz / l * rr]; };
    const cross = (p, q) => { // where f = 0 along p..q on the sphere (a few bisections: gy is not linear)
      let lo = p, hi = q, fl = f(p);
      for (let k = 0; k < 10; k++) { const m = onS([(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2], Re), fm = f(m); if ((fm < 0) === (fl < 0)) { lo = m; fl = fm; } else hi = m; }
      return onS([(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2], Re);
    };
    const clip = (tri) => { // Sutherland-Hodgman against f < 0: 0, 3 or 4 points
      const out = [];
      for (let k = 0; k < 3; k++) { const P = tri[k], Q = tri[(k + 1) % 3], fp = f(P), fq = f(Q); if (fp < 0) out.push(P); if ((fp < 0) !== (fq < 0)) out.push(cross(P, Q)); }
      return out;
    };
    const outK = (Re + 0.015) / Re, outP = (p) => [CX + (p[0] - CX) * outK, CY + (p[1] - CY) * outK, CZ + (p[2] - CZ) * outK];
    for (let j = 0; j < nV; j++) for (let i = 0; i < nU; i++) {
      const a = pt(i, j), b = pt(i + 1, j), c = pt(i + 1, j + 1), d = pt(i, j + 1);
      if (f(a) >= 0 && f(b) >= 0 && f(c) >= 0 && f(d) >= 0) continue;
      const hint = [CX - (a[0] + c[0]) / 2, CY - (a[1] + c[1]) / 2, CZ - (a[2] + c[2]) / 2], outH = [-hint[0], -hint[1], -hint[2]]; // in; out
      for (const t of [[a, b, c], [a, c, d]]) {
        const poly = clip(t); if (poly.length < 3) continue;
        const col = paint((t[0][0] + t[1][0] + t[2][0]) / 3, (t[0][1] + t[1][1] + t[2][1]) / 3, (t[0][2] + t[1][2] + t[2][2]) / 3);
        for (let k = 1; k < poly.length - 1; k++) {
          E.tri(poly[0], poly[k], poly[k + 1], col, hint, 0.06);
          // faced outward too, 1.5 cm further out: from outside, where the opened ground falls short of the bulging
          // glass, a visitor sees down into the skin and should meet earth, not the sphere's inside through its back
          E.tri(outP(poly[0]), outP(poly[k]), outP(poly[k + 1]), col, outH, 0.06);
        }
      }
    }
    add(new THREE.Mesh(E.geometry(), umat('sphere-earth', { roughness: 0.95 })), 'sphere-earth');
  }
  await ctx.progress?.('the sphere', 0.4);

  // ---- the parts: the node, the lines, the keeper, his wheel, the sling and the stays; the hoops outside
  const B = new UnderBuilder(lit), rng = ctx.makeRng(17502);
  const V3 = (a) => new THREE.Vector3(...a);
  const along = (a, b) => { const A = V3(a), d = V3(b).sub(A), len = d.length(); d.normalize(); return { M: new THREE.Matrix4().lookAt(A, A.clone().sub(d), Math.abs(d.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)).setPosition(A), len }; };
  const [NX, NY, NZ] = SPHERE.node, [fx, fz] = SPHERE.face, yaw = Math.atan2(fx, fz), kyaw = Math.atan2(SPHERE.keeperFace[0], SPHERE.keeperFace[1]);
  // the node, and its lines: up to the crown (the sky's line came down here), out to the hoops, and two into
  // the ground (north-east, south), each a length of tube to the glass with a collar where it meets it
  NP.node(B, new THREE.Matrix4().makeTranslation(NX, NY, NZ), { r: 0.6, color: NOON.biscuit, ports: [] });
  const lines = []; // the lines that met here are gone with the tube: the node hangs on its stays, its ports empty
  for (const [k, l] of lines.entries()) {
    const d = V3(l).normalize(), a = [NX + d.x * 0.7, NY + d.y * 0.7, NZ + d.z * 0.7], b = [NX + d.x * (R - 0.15), NY + d.y * (R - 0.15), NZ + d.z * (R - 0.15)];
    const { M, len } = along(a, b);
    NP.tube(B, M, { r: k === 0 ? 0.36 : 0.3, len, rib: 1.4, collar: true, color: NOON.biscuit, seed: 30 + k });
    NP.collar(B, M.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0, len - 0.05)), { r: (k === 0 ? 0.36 : 0.3) + 0.1, t: 0.08, color: NOON.bone, band: false, seg: 24 });
  }
  // the eye: where the noon comes in, a disc of clear glass in the top of the ball over the keeper, ringed in
  // ox-blood, white with the light (not lit by anything: it is the source); and the fall of light from it onto him
  const [SX, SY, SZ] = SPHERE.seat;
  const EYE = [SX, CY + Math.sqrt(R * R - (SX - CX) ** 2 - (SZ - CZ) ** 2) - 0.35, SZ];
  {
    const n = new THREE.Vector3(SX - CX, EYE[1] - CY, SZ - CZ).normalize(), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
    const lg = new THREE.CircleGeometry(1.0, 28).applyQuaternion(q).translate(...EYE);
    const lm = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.97, 0.88), side: THREE.DoubleSide, fog: true });
    add(new THREE.Mesh(lg, lm), 'sphere-eye');
    NP.collar(B, new THREE.Matrix4().compose(new THREE.Vector3(...EYE), q, new THREE.Vector3(1, 1, 1)), { r: 1.08, t: 0.12, color: NOON.oxbloodD, band: false, seg: 32 });
  }
  {
    const top = EYE[1] - 0.1, bot = SY - 1.6, h = top - bot;
    const bg = new THREE.CylinderGeometry(0.95, 1.7, h, 32, 1, true).translate(SX, bot + h / 2, SZ);
    const bm = new THREE.ShaderMaterial({
      uniforms: { uBreath, uTop: { value: top }, uH: { value: h } },
      vertexShader: 'varying vec3 vW; varying vec3 vN; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: `uniform float uBreath; uniform float uTop; uniform float uH; varying vec3 vW; varying vec3 vN;
        void main() { vec3 v = normalize(cameraPosition - vW); float e = pow(abs(dot(normalize(vN), v)), 1.6);
          float t = clamp((uTop - vW.y) / uH, 0.0, 1.0); float a = e * (0.5 - 0.35 * t) * (1.0 - smoothstep(0.85, 1.0, t)) * smoothstep(0.0, 0.06, t);
          gl_FragColor = vec4(vec3(1.0, 0.96, 0.86) * a * 0.9 * uBreath, 1.0); }`,
      side: THREE.DoubleSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    });
    const beam = add(new THREE.Mesh(bg, bm), 'sphere-beam'); beam.renderOrder = 3;
  }

  // the keeper: a Noonwright, long in the limb, hooded, in a robe of ox-blood gone brown with lime in its folds,
  // sat in a sling with both hands on the wheel's rim and his head bowed to it. His own frame: origin at the seat,
  // +z forward (toward the Garth, down the line), +y up
  const F = new THREE.Matrix4().makeRotationY(kyaw).scale(new THREE.Vector3(1.8, 1.8, 1.8)).setPosition(...SPHERE.seat); // a Noonwright: tall
  glowK = 0.3;
  const fp = (x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(F);
  const ROBE = new THREE.Color('#4a2219'), ROBE_D = new THREE.Color('#32170f'), SKIN = new THREE.Color('#b9ad97'), WHEEL = new THREE.Color('#4f7a63'), BRONZE = new THREE.Color('#6b5a3a');
  const limb = (a, b, r, color) => { const A = fp(...a), Bv = fp(...b), d = Bv.clone().sub(A), len = d.length(); const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); put(B, new THREE.CapsuleGeometry(r, Math.max(0.01, len), 3, 8), new THREE.Matrix4().compose(A.clone().lerp(Bv, 0.5), q, new THREE.Vector3(1, 1, 1)), { color, jit: 0.04 }); };
  const blob = (c, s, color, rx = 0) => { const M = F.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(...c), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, 0, 0)), new THREE.Vector3(...s))); put(B, new THREE.SphereGeometry(1, 14, 10), M, { color, jit: 0.04 }); };
  // the wheel: in front of him, its axle on the valve body run back to the node
  const W = [0, 0.42, 0.62], WR = 0.6;
  {
    const M = F.clone().multiply(new THREE.Matrix4().makeTranslation(...W));
    put(B, new THREE.TorusGeometry(WR, 0.04, 8, 40), M, { color: WHEEL, jit: 0.08 });
    put(B, new THREE.TorusGeometry(0.09, 0.035, 6, 14), M, { color: WHEEL });
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 + 0.3; limb([W[0] + Math.cos(a) * 0.09, W[1] + Math.sin(a) * 0.09, W[2]], [W[0] + Math.cos(a) * (WR - 0.02), W[1] + Math.sin(a) * (WR - 0.02), W[2]], 0.022, WHEEL); }
    // knobs round the rim (a valve wheel's grips), and the axle to the valve's body on the node
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; blob([W[0] + Math.cos(a) * (WR + 0.035), W[1] + Math.sin(a) * (WR + 0.035), W[2]], [0.03, 0.03, 0.03], WHEEL); }
    limb([W[0], W[1], W[2]], [0, W[1], 1.35], 0.07, BRONZE);
  }
  // seated: thighs forward a little up, shins hanging, feet loose (no floor under him)
  for (const s of [-1, 1]) {
    limb([0.11 * s, 0.02, -0.02], [0.14 * s, 0.07, 0.44], 0.085, ROBE);
    limb([0.14 * s, 0.05, 0.46], [0.15 * s, -0.4, 0.5], 0.06, ROBE_D);
    blob([0.15 * s, -0.47, 0.56], [0.055, 0.045, 0.13], ROBE_D);
  }
  // the body: bent forward over the wheel (the spine from the seat to the neck), a robe falling from the shoulders
  const NECK = [0, 0.62, 0.24];
  limb([0, 0.08, -0.03], [0, 0.4, 0.1], 0.17, ROBE);
  limb([0, 0.38, 0.09], NECK, 0.15, ROBE);
  {
    // the robe's skirt: a cone from the chest over the thighs, hanging below the seat
    const prof = [[0.12, 0.62], [0.22, 0.45], [0.27, 0.2], [0.3, -0.05], [0.33, -0.32]].map(([r, y]) => new THREE.Vector2(r, y));
    const gk = new THREE.LatheGeometry(prof, 16); gk.scale(1, 1, 0.8);
    put(B, gk, F.clone().multiply(new THREE.Matrix4().makeRotationX(0.32)).multiply(new THREE.Matrix4().makeTranslation(0, 0.0, 0.02)), { color: ROBE_D, jit: 0.06 });
  }
  // shoulders, arms out and forward to the rim at a quarter past nine and a quarter to three, hands closed on it
  for (const s of [-1, 1]) {
    const sh = [0.2 * s, 0.56, 0.2], el = [0.4 * s, 0.47, 0.38], ha = [W[0] + Math.sin(s * 1.0) * WR, W[1] + Math.cos(1.0) * WR, W[2] - 0.05];
    blob(sh, [0.1, 0.09, 0.1], ROBE);
    limb(sh, el, 0.058, ROBE);
    limb(el, [ha[0] * 0.97, ha[1] - 0.03, ha[2] - 0.08], 0.05, ROBE); // the sleeve to the wrist
    blob(ha, [0.05, 0.065, 0.075], SKIN);
    for (let f = 0; f < 3; f++) limb([ha[0] + 0.02 * s, ha[1] + 0.035 - f * 0.028, ha[2]], [ha[0] - 0.01 * s, ha[1] + 0.06 - f * 0.032, ha[2] + 0.08], 0.014, SKIN); // long fingers over the rim
  }
  // the head bowed to the wheel inside a deep hood
  blob([0, 0.72, 0.36], [0.1, 0.12, 0.11], SKIN, 0.6);
  {
    const hood = new THREE.SphereGeometry(1, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.72);
    put(B, hood, F.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(0, 0.74, 0.31), new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.95, 0, 0)), new THREE.Vector3(0.16, 0.19, 0.17))), { color: ROBE_D, jit: 0.04 });
    limb([0, 0.62, 0.18], [0, 0.76, 0.22], 0.15, ROBE_D); // the hood's fall over the neck
  }
  glowK = 1;
  // the sling: a cradle of spun filament under him, laced between a rim round his seat and a ring over his head, the
  // ring hung on the stays. Every line here ends on a fitting: the ring, the rim, the node or an eye fused to the glass,
  // its end points computed from the same frame (F) and constants the keeper is built from, so they cannot drift
  const RING = fp(0, 2.25, 0.05), RR = 0.55;
  NP.collar(B, new THREE.Matrix4().makeRotationX(Math.PI / 2).setPosition(RING), { r: RR, t: 0.05, seg: 28 });
  const RIM_R = 0.36, RIM_Y = -0.14, RIM_Z = 0.02; // the seat's rim, in his frame (outside the robe's skirt)
  NP.collar(B, F.clone().multiply(new THREE.Matrix4().makeTranslation(0, RIM_Y, RIM_Z)).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)), { r: RIM_R, t: 0.03, seg: 24 });
  const rimPt = (a) => fp(Math.cos(a) * RIM_R, RIM_Y, RIM_Z + Math.sin(a) * RIM_R);
  const ringPt = (a) => new THREE.Vector3(RING.x + Math.cos(a) * RR, RING.y, RING.z + Math.sin(a) * RR);
  const eye = (p, d, r = 0.045) => NP.collar(B, along(p.toArray(), [p.x + d.x, p.y + d.y, p.z + d.z]).M, { r, t: 0.018, seg: 8 }); // a small eye on a line's end
  {
    // four hangers, ring to rim, at his sides and back (not across his front, where his arms go to the wheel); each
    // takes the ring at the point over its rim point, so it hangs straight
    for (const a of [0, Math.PI, Math.PI * 1.35, Math.PI * 1.65]) {
      const p = rimPt(a), qq = ringPt(Math.atan2(p.z - RING.z, p.x - RING.x));
      strand(B, new THREE.Matrix4(), qq.toArray(), p.toArray(), { t: 0.012 });
      eye(p, new THREE.Vector3(0, 1, 0)); eye(qq, new THREE.Vector3(0, -1, 0));
    }
    // the cradle under him: laced across the rim, sagging below the seat
    const n = 8;
    for (let i = 0; i < n; i++) { const j = (i + 3) % n; strand(B, new THREE.Matrix4(), rimPt(i / n * Math.PI * 2).toArray(), rimPt(j / n * Math.PI * 2).toArray(), { t: 0.016, sag: 0.32 }); }
  }
  // the stays: from the upper glass, all round, down to the ring over his head (so none crosses him), and from the
  // glass beside and before the node to the node (so none crosses him either). Each starts on the glass's inner face
  // in an eye fused to it and ends on the ring or on the node's skin (the node: an ellipsoid r 0.6, 0.86 high)
  {
    const C = new THREE.Vector3(CX, CY, CZ), NODE = new THREE.Vector3(NX, NY, NZ);
    const dir = (az, el) => new THREE.Vector3(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az));
    const fit = (e) => NP.collar(B, along(e.toArray(), [CX, CY, CZ]).M, { r: 0.12, t: 0.04, seg: 10 }); // where it is fused to the glass
    const toRing = low ? 5 : 6;
    for (let i = 0; i < toRing; i++) {
      const az = i / toRing * Math.PI * 2 + 0.4, el = 0.85 + 0.25 * ((i * 0.618) % 1);
      // from the ring outward and up: a ray from the ring's point on that bearing, to where it meets the glass
      const q = ringPt(az), u = dir(az, el), oc = q.clone().sub(C), bq = oc.dot(u), cq = oc.lengthSq() - (R - 0.02) ** 2, t = -bq + Math.sqrt(bq * bq - cq);
      const e = q.clone().addScaledVector(u, t);
      strand(B, new THREE.Matrix4(), e.toArray(), q.toArray(), { t: 0.016 });
      fit(e); eye(q, u.clone().negate());
    }
    // the node's stays: out of its sides and front (away from him), each leaving the node's skin straight out
    const fwd = new THREE.Vector3(fx, 0, fz), side = new THREE.Vector3(fz, 0, -fx);
    const nd = [[1, 0.25, 0], [0.55, 0.55, 0.75], [0.55, 0.55, -0.75], [0.2, -0.15, 1], [0.2, -0.15, -1], [0.35, 1, 0.1]];
    for (const [f, up, sd] of nd.slice(0, low ? 5 : 6)) {
      const u = fwd.clone().multiplyScalar(f).addScaledVector(side, sd).add(new THREE.Vector3(0, up, 0)).normalize();
      const k = 1 / Math.sqrt((u.x * u.x + u.z * u.z) / 0.36 + (u.y * u.y) / (0.6 * 0.86) ** 2); // the ellipsoid's skin along u
      const q = NODE.clone().addScaledVector(u, k), oc = q.clone().sub(C), bq = oc.dot(u), cq = oc.lengthSq() - (R - 0.02) ** 2, t = -bq + Math.sqrt(bq * bq - cq);
      const e = q.clone().addScaledVector(u, t);
      if (e.y < gy(e.x, e.z) + 0.4) continue; // a stay to the glass under the ground would end in the earth
      strand(B, new THREE.Matrix4(), e.toArray(), q.toArray(), { t: 0.018 });
      fit(e); eye(q, u, 0.06);
    }
  }

  // ---- the hoops: the line out of the glass toward the Garth, the tube between them gone. Each hoop half
  // sunk in the ground; the far ones leaning, broken, one fallen flat
  const hoopAt = [];
  // old glass out in the weather: the milk gone to a grey-green bone, lichen and silt low, lime crust in streaks
  const OLD = new THREE.Color('#5e5c4c');
  const wear = (x, y, z, ny, c, out) => { const n = n3(x * 1.3, y * 1.3, z * 1.3), low2 = 1 - ss(0, 1.6, y - gy(x, z)); out[0] = c.r !== undefined ? c.r : c[0]; out[1] = c.g !== undefined ? c.g : c[1]; out[2] = c.b !== undefined ? c.b : c[2]; const k = 0.62 + 0.3 * n; out[0] *= k; out[1] *= k; out[2] *= k; out[0] = out[0] * (1 - 0.6 * low2) + 0.16 * 0.6 * low2; out[1] = out[1] * (1 - 0.6 * low2) + 0.18 * 0.6 * low2; out[2] = out[2] * (1 - 0.6 * low2) + 0.11 * 0.6 * low2; return out; };
  {
    const sx = CX + fx * R, sz = CZ + fz * R;
    // (the tube between the hoops is gone, to its socket in the glass: a collar fused on where it left)
    NP.collar(B, along([CX + fx * (R - 0.1), CY + 0.3, CZ + fz * (R - 0.1)], [CX + fx * (R + 2), CY + 0.3, CZ + fz * (R + 2)]).M, { r: 1.4, t: 0.2, seg: 36, color: OLD, wear, band: false });
    for (const [k, s] of SPHERE.hoops.entries()) {
      const jog = (rng() - 0.5) * 1.6, x = sx + fx * s - fz * jog, z = sz + fz * s + fx * jog, gnd = gy(x, z);
      const r = SPHERE.hoopR * (0.9 + rng() * 0.2), fallen = k === 4, lean = k > 2 ? (rng() - 0.5) * 0.5 : (rng() - 0.5) * 0.12;
      const y = fallen ? gnd + 0.15 : gnd + r * (0.3 + rng() * 0.2);
      const M = new THREE.Matrix4().makeRotationY(yaw).multiply(new THREE.Matrix4().makeRotationZ(lean)).multiply(new THREE.Matrix4().makeRotationY((rng() - 0.5) * 0.3));
      if (fallen) M.multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2 - 0.08));
      M.setPosition(x, y, z);
      const broken = k >= 5, a0 = broken ? -Math.PI + 0.9 + rng() * 0.6 : -Math.PI, a1 = broken ? Math.PI - 1.6 - rng() * 0.8 : Math.PI;
      NP.collar(B, M, { r, t: 0.22, a0, a1, seg: 40, color: OLD, wear, band: false });
      hoopAt.push({ x, z, y, r, fallen, gnd });
    }
  }
  add(new THREE.Mesh(B.geometry(), umat('sphere-parts', { roughness: 0.55, side: THREE.DoubleSide })), 'sphere-parts');

  // ---- the bank: where the glass meets the ground, a low heaped bank of earth and heather laid round it on the drawn
  // ground, its inner foot down against the glass under the ground line and its outer foot out past the terrain's cut
  // edge (the cut takes whole cells), so there is one clean line where glass meets ground on every side
  const meet = []; // on each bearing: the ground's distance from the centre where it meets the glass, and its height
  {
    const nA = low ? 180 : 240, out = Math.max(cell * 1.8 + 0.6, 3.8);
    for (let i = 0; i <= nA; i++) {
      const a = i / nA * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
      let m = null;
      for (let d = R + 0.5; d > 1; d -= 0.04) { const x = CX + ca * d, z = CZ + sa * d; if (inside(x, gy(x, z), z)) { m = d; break; } }
      meet.push(m);
    }
    const HEATH = C3('#3a2a30'), EARTH = C3('#3b2c1e');
    const at = (a, d, lift) => { const x = CX + Math.cos(a) * d, z = CZ + Math.sin(a) * d; return [x, gy(x, z) + lift, z]; };
    const glassAt = (a, y) => { const rr = Math.sqrt(Math.max(0, R * R - (y - CY) ** 2)) + 0.03; return [CX + Math.cos(a) * rr, y, CZ + Math.sin(a) * rr]; };
    const tone = (p, k) => { const c = [gc[0](p[0], p[2]), gc[1](p[0], p[2]), gc[2](p[0], p[2])], n = n3(p[0] * 0.7, 0, p[2] * 0.7), h = n > 0.55 ? HEATH : EARTH, w = k * (0.5 + 0.5 * n); return [c[0] * (1 - w) + h[0] * w, c[1] * (1 - w) + h[1] * w, c[2] * (1 - w) + h[2] * w]; };
    // the profile across, from the glass out: [distance past the meet, lift over the drawn ground, how much bank-colour]
    const prof = [[0.25, 0.26, 0.9], [0.7, 0.2, 0.7], [1.3, 0.1, 0.4], [1.9, 0.07, 0.2], [2.6, 0.06, 0.1], [3.4, 0.05, 0.03], [out, 0.04, 0]]; // (close enough across that the terrain's own triangles stay under it)
    const row = (i) => {
      const a = i / nA * Math.PI * 2, m = meet[i], gm = at(a, m, 0)[1];
      const pts = [glassAt(a, gm - 0.45), glassAt(a, gm + 0.12)]; // down against the glass under the ground, then up its face
      for (const [dd, lift] of prof) { const q = at(a, m + dd + 0.06 * n3(Math.cos(a) * 9, 1, Math.sin(a) * 9), lift * (0.75 + 0.5 * n3(Math.cos(a) * 7, 2, Math.sin(a) * 7))); if (Math.hypot(q[0] - CX, q[2] - CZ) < Math.hypot(pts[pts.length - 1][0] - CX, pts[pts.length - 1][2] - CZ) + 0.05) { const r0 = Math.hypot(pts[pts.length - 1][0] - CX, pts[pts.length - 1][2] - CZ) + 0.05; q[0] = CX + Math.cos(a) * r0; q[2] = CZ + Math.sin(a) * r0; q[1] = gy(q[0], q[2]) + lift; } pts.push(q); }
      return pts.map((p, k) => [p, tone(p, k < 2 ? 1 : prof[k - 2][2])]);
    };
    // one indexed sheet, its normals smoothed across (faceted, its quads read as a fan of triangles round the glass),
    // its outer foot taking the terrain's own normal so it goes into the ground with no seam of light
    for (let i = 0; i <= nA; i++) if (meet[i] == null) meet[i] = meet[(i + nA - 1) % nA] ?? R;
    const rows = []; for (let i = 0; i <= nA; i++) rows.push(row(i % nA));
    const K = rows[0].length, pos = new Float32Array((nA + 1) * K * 3), colr = new Float32Array((nA + 1) * K * 3), ix = [];
    for (let i = 0; i <= nA; i++) for (let k = 0; k < K; k++) { const [q, c] = rows[i][k], o = (i * K + k) * 3; pos[o] = q[0]; pos[o + 1] = q[1]; pos[o + 2] = q[2]; colr[o] = c[0]; colr[o + 1] = c[1]; colr[o + 2] = c[2]; }
    for (let i = 0; i < nA; i++) for (let k = 0; k < K - 1; k++) { const a0 = i * K + k, a1 = (i + 1) * K + k; ix.push(a0, a0 + 1, a1, a1, a0 + 1, a1 + 1); }
    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); bg.setAttribute('color', new THREE.BufferAttribute(colr, 3)); bg.setIndex(ix);
    bg.computeVertexNormals();
    // facing out and up: wound so, else flipped
    { const nr = bg.attributes.normal.array; let up = 0; for (let i = 0; i < nr.length; i += 3) up += nr[i + 1]; if (up < 0) { for (let t = 0; t < ix.length; t += 3) { const q = ix[t + 1]; ix[t + 1] = ix[t + 2]; ix[t + 2] = q; } bg.setIndex(ix); bg.computeVertexNormals(); } }
    { const nr = bg.attributes.normal.array, tn = new THREE.Vector3(); for (let i = 0; i <= nA; i++) { const o = (i * K + K - 1) * 3; T.normalAt(pos[o], pos[o + 2], tn); nr[o] = tn.x; nr[o + 1] = tn.y; nr[o + 2] = tn.z; } }
    // (the seam at bearing 0: the first and last rows are the same points; give them the same normals)
    { const nr = bg.attributes.normal.array; for (let k = 0; k < K; k++) { const o0 = k * 3, o1 = (nA * K + k) * 3; for (let j = 0; j < 3; j++) { const v = (nr[o0 + j] + nr[o1 + j]) / 2; nr[o0 + j] = nr[o1 + j] = v; } } }
    // (two-sided: from inside the glass the far side's bank is seen from under, where its back was culled and the cut's
    // ragged edge showed through: a blind reader's "jagged, with holes, where the floor meets the glass")
    const lm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0, side: THREE.DoubleSide });
    const m = add(new THREE.Mesh(bg, lm), 'sphere-lip'); m.receiveShadow = true;
  }

  // ---- the noon in the air: the inside of the glass seen through it, a white haze over what lies behind the keeper
  // (additive, its far half only: depth keeps him dark against it), brightest high where the light comes in
  let haze = null;
  {
    const hg = new THREE.SphereGeometry(R - 0.35, low ? 32 : 48, low ? 20 : 32); hg.translate(CX, CY, CZ);
    const hm = new THREE.ShaderMaterial({
      uniforms: { uBreath, uC: { value: new THREE.Vector3(CX, CY, CZ) } },
      vertexShader: 'varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: `uniform float uBreath; uniform vec3 uC; varying vec3 vW;
        void main() { float h = clamp((vW.y - uC.y) / ${R.toFixed(1)} * 0.5 + 0.5, 0.0, 1.0);
          gl_FragColor = vec4(vec3(1.0, 0.95, 0.84) * (0.08 + 0.26 * h * h) * uBreath, 1.0); }`,
      side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    });
    haze = add(new THREE.Mesh(hg, hm), 'sphere-haze'); haze.renderOrder = 1;
  }

  // ---- the light: one PointLight at the crown inside, the noon coming down the line, breathing slowly
  const light = new THREE.PointLight(NOON.lightHex, 0, 34, 1.4);
  light.position.set(SX, EYE[1] - 2.2, SZ); light.name = 'sphere-noon';
  ctx.scene.add(light);
  const baseI = low ? 55 : 70;
  ctx.registerUpdate((dt, t) => {
    // a breath of about nine seconds, never a flicker: slow and shallow, with a slower swell under it
    const b = 1 + 0.12 * Math.sin(t * 0.7) + 0.05 * Math.sin(t * 0.23 + 1.3);
    uBreath.value = b;
    light.intensity = baseI * b;
    for (const m of mats) m.userData.uGlow.value.set(noonHex).multiplyScalar(0.9 * b);
  }, { pos: new THREE.Vector3(CX, CY, CZ), near: 400, hz: 4 });

  // ---- the walker goes round it, not into it: the glass, and each standing hoop's feet
  let sphereRing = null;
  if (ctx.addCollider) {
    // the glass and nothing more: a ring of short walls round it, each corner where a walker's eye column (feet on the
    // ground there, up to the eye) comes to 0.55 m from the glass on that bearing, less the body's 0.45 and the wall's
    // own r. Not one disc of the equator's radius: half sunk on a slope, the glass meets the ground on a circle smaller
    // than its equator on the uphill side, and a disc kept the walker metres off it there (the owner, 2026-11-17)
    const nW = 48, WR = 0.25, BODY = 0.45, CLEAR = 0.55, ring = [];
    const clearAt = (x, z) => { const f = T.heightAt(x, z); let m = Infinity; for (let h = 0.1; h <= 1.75; h += 0.15) { const y = f + h; m = Math.min(m, Math.hypot(x - CX, y - CY, z - CZ) - R); } return m; };
    for (let i = 0; i < nW; i++) {
      const a = i / nW * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
      let d = R + 3;
      while (d > 1 && clearAt(CX + ca * d, CZ + sa * d) > CLEAR) d -= 0.02;
      ring.push([CX + ca * (d - BODY - WR), CZ + sa * (d - BODY - WR)]);
    }
    for (let i = 0; i < nW; i++) { const [x1, z1] = ring[i], [x2, z2] = ring[(i + 1) % nW]; ctx.addCollider({ x1, z1, x2, z2, r: WR, y: CY - R, h: 2 * R + 2, stand: false }); }
    sphereRing = ring;
    for (const h of hoopAt) if (!h.fallen) ctx.addCollider({ x: h.x, z: h.z, r: 0.35, y: h.gnd - 1, h: h.r * 2 + 1, stand: false });
  }

  // ---- the pebbles: rocks.js keeps its pebbles off no claim (they cost nothing to walk on), so those that lay on the
  // old ground inside the glass, or on the hill behind it seen through the glass, would hang in the air: put away here
  let pebbles = 0;
  if (await ctx.built?.('rocks')) {
    const m4 = new THREE.Matrix4(), zero = new THREE.Matrix4().makeScale(0, 0, 0);
    ctx.scene.traverse((o) => {
      if (!o.isInstancedMesh || !/rocks-pebble/.test(o.name)) return;
      let n = 0;
      for (let i = 0; i < o.count; i++) {
        o.getMatrixAt(i, m4); const e = m4.elements, dx = e[12] - CX, dz = e[14] - CZ, d = Math.hypot(dx, dz);
        if (d < R + 1.5 || (dx * SPHERE.arrive[0] + dz * SPHERE.arrive[1] < 4 && d < R + 26)) { o.setMatrixAt(i, zero); n++; }
      }
      if (n) { o.instanceMatrix.needsUpdate = true; pebbles += n; }
    });
  }

  ctx.sphere = { meshes, light, cut, pebbles, hoops: hoopAt, uBreath, ring: sphereRing, ms: Math.round(performance.now() - t0) };
  await ctx.progress?.('the sphere', 1);
}
