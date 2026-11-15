// The river bay's way (v12 H1): a member of one of the Lattices that hang in the high air (src/skylife/lattices.js),
// come down and lying across the 47 m of air between the deck ends at x 122 and 169. Seen from the meadow it is a thin
// line joining the piers; at arm's length it is a built thing: a box truss 1.4 m wide and 1.5 m deep, four chords of
// old metal with round bars every half-stride across its top (a grating left on some panels, bare in others, so the
// river shows through between the bars), Warren diagonals down its sides and an X under its belly; at every node a cube
// of paler, harder metal with a seam of cold light round it, a joint nobody in the valley could make. It bows 3.2 m.
// At the west it broke off: for its last three metres only the two top chords and their bars reach the lip, and what
// is left of the sides hangs from the torn end. At the east it went into the pier: its end is bitten into the deck's
// broken edge with spalled stone heaped round it. Half-way over, at one of its nodes, the stub of a side member stands
// up beside the bars, snapped and bent over, and another goes out sideways and stops; a rag of the square web the
// Lattices string across their cells still hangs from the bottom chords. Dust and verdigris, worn copper only where the
// low sun finds it; one member in eight still polished pale.
// Draws: the metal (one mesh, vertex colours; casts no shadow on low), the seams (one), the web (one LineSegments), the
// rags (returned, for the shared cloth mesh). On low: fewer gratings, less web, the seams updated at 2 Hz. The walkable is vestigeAt (vestige-plan.js): the top face, exactly as drawn (±0.7 m).
import * as THREE from 'three';
import { SUN } from '../../world.js';
import { mergeGeometries } from '../kit/merge.js';
import { clean } from './geo.js';
import { sheet } from './cloth.js';

const HW = 0.7, CH = 0.2, DEPTH = 1.5; // half-width to the chords' outer faces; chord section; depth to the bottom chords' underside
const SC = HW - CH / 2;                 // the chords' centre lines, either side
const sunN = new THREE.Vector3(SUN.dir.x, SUN.dir.y, SUN.dir.z).normalize();

// a box member from A to B (THREE.Vector3), w across (along `side`), h deep; `side` a hint for its across axis
const _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3(), _m = new THREE.Matrix4();
function member(A, B, w, h, side = new THREE.Vector3(0, 0, 1)) {
  _z.subVectors(B, A); const len = _z.length(); _z.divideScalar(len);
  _x.copy(side).addScaledVector(_z, -side.dot(_z)).normalize();
  _y.crossVectors(_z, _x);
  const g = new THREE.BoxGeometry(w, h, len);
  _m.makeBasis(_x, _y, _z).setPosition((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
  g.applyMatrix4(_m);
  return clean(g);
}

// the metal: vertex colours (copper sunward, dust up, darker under) broken by world-space noise in the shader: mottling,
// verdigris in drifts, rust streaks running down the sides, pitting; the pits and the verdigris rougher
function strutMaterial() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.4, roughness: 0.55 });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vSW;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vSW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vSW;
float sHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float sNoise(vec3 x) {
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(sHash(i), sHash(i + vec3(1,0,0)), f.x), mix(sHash(i + vec3(0,1,0)), sHash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(sHash(i + vec3(0,0,1)), sHash(i + vec3(1,0,1)), f.x), mix(sHash(i + vec3(0,1,1)), sHash(i + vec3(1,1,1)), f.x), f.y), f.z);
}`).replace('#include <color_fragment>', `#include <color_fragment>
  float sm = sNoise(vSW * 1.3) * 0.6 + sNoise(vSW * 4.1) * 0.4;
  float streak = sNoise(vec3(vSW.x * 7.0, vSW.y * 0.8, vSW.z * 7.0));
  float pit = smoothstep(0.7, 0.95, sNoise(vSW * 9.0 + 4.0) * 0.6 + sNoise(vSW * 23.0) * 0.4);
  float verd = smoothstep(0.5, 0.78, sNoise(vSW * 0.7 + 9.0) * 0.55 + sm * 0.45);
  diffuseColor.rgb *= 0.62 + 0.62 * sm;
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.10, 0.20, 0.16), verd * 0.8);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.13, 0.08, 0.05), smoothstep(0.55, 0.9, streak) * 0.35);
  diffuseColor.rgb *= 1.0 - 0.3 * pit;
  float sRough = 0.12 * pit + 0.25 * verd;`).replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n  roughnessFactor = min(1.0, roughnessFactor + sRough);');
  };
  return m;
}

// a round bar from A to B
const _up = new THREE.Vector3(0, 1, 0), _q = new THREE.Quaternion();
function rod(A, B, r, seg = 7) {
  _z.subVectors(B, A); const len = _z.length();
  const g = new THREE.CylinderGeometry(r, r, len, seg, 1);
  _q.setFromUnitVectors(_up, _z.divideScalar(len));
  g.applyQuaternion(_q); g.translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
  return clean(g);
}

export function buildStrut(K, R) {
  const { ctx, rng, jit, addCol, hi } = K;
  const metal = [], seams = [], web = [], rags = [];
  const polished = new Set();
  const V = (x, side = 0, down = 0) => new THREE.Vector3(x, R.y(x) - down, R.zc(x) + side);
  const add = (g, list = metal, tag = 0) => { g.userData.tag = tag; list.push(g); return g; };
  const MEMBERS = { chord: 1, bar: 2, plate: 3, side: 4, stub: 5, torn: 6, node: 7 };

  const xT = 124.4;            // the torn end of the truss proper; west of it only the top chords and bars go on
  const xW = R.a - 0.9, xE = R.b + 1.6; // the chords lie a little into the west deck, and bite 1.6 m into the east one
  const NODE = 2.35;
  const nodes = []; for (let x = xT; x < R.b + 0.01; x += NODE) nodes.push(x);
  nodes.push(xE);

  // ---------------------------------------------------------------- the four chords, in sections between nodes
  const tops = [xW, xT, ...nodes.slice(1)];
  for (const s of [-1, 1]) {
    for (let i = 0; i < tops.length - 1; i++) {
      const x0 = tops[i], x1 = tops[i + 1];
      // each section in three straight pieces so it follows the bow
      for (let k = 0; k < 3; k++) {
        const a = x0 + (x1 - x0) * k / 3, b = x0 + (x1 - x0) * (k + 1) / 3;
        const g = add(member(V(a, s * SC, CH / 2 + 0.002), V(b, s * SC, CH / 2 + 0.002), CH, CH), metal, MEMBERS.chord);
        if (i % 8 === 3 && s > 0) polished.add(g);
      }
    }
    // bottom chords, from the torn end to the bite
    for (let i = 0; i < nodes.length - 1; i++) {
      const x0 = nodes[i], x1 = nodes[i + 1];
      for (let k = 0; k < 3; k++) {
        const a = x0 + (x1 - x0) * k / 3, b = x0 + (x1 - x0) * (k + 1) / 3;
        add(member(V(a, s * SC, DEPTH - CH / 2), V(b, s * SC, DEPTH - CH / 2), CH, CH), metal, MEMBERS.chord);
      }
    }
  }

  // ---------------------------------------------------------------- the nodes: where the Lattice's members meet, a cube on
  // each chord, flush with the top, wider than the chord, a seam of the sky's cold light round its middle (no one here
  // makes a joint like it)
  const NB = 0.36; // (its outer face 0.07 m past the walkable's edge, below the top)
  for (const x of nodes.slice(0, -1)) for (const s of [-1, 1]) for (const dn of [NB / 2, DEPTH - NB / 2]) {
    add(member(V(x - NB / 2, s * SC, dn), V(x + NB / 2, s * SC, dn), NB, NB), metal, MEMBERS.node);
    for (const o of [-0.09, 0.09]) seams.push(member(V(x + o - 0.007, s * SC, dn), V(x + o + 0.007, s * SC, dn), NB + 0.01, NB + 0.01));
  }

  // ---------------------------------------------------------------- the bars across the top, and what plating is left
  const bars = [];
  for (let x = xW + 0.35, i = 0; x < R.b + 0.4; x += 0.5, i++) {
    // gone here and there, a stride of air between two bars; never two together, never on the lips
    const gone = x > R.a + 1.5 && x < R.b - 1.5 && ((i * 7) % 17 === 3 || (i * 5) % 23 === 11);
    if (gone) continue;
    bars.push(x);
    add(rod(V(x, -SC + CH / 2, 0.055), V(x, SC - CH / 2, 0.055), 0.055), metal, MEMBERS.bar);
  }
  // a grating over some panels: lengthwise slats with slots of air between, some slats gone, their ends torn ragged
  // (their top level with the chords', so the feet see what they stand on)
  for (let i = 0; i < nodes.length - 1; i++) {
    const x0 = nodes[i], x1 = nodes[i + 1];
    if (x1 > R.b - 0.5) continue;
    if (rng() < (hi ? 0.45 : 0.7)) continue; // bare bars: the river under them (more of them on low)
    const inner = SC - CH / 2, n = 5, w = (2 * inner) / n;
    for (let k = 0; k < n; k++) {
      if (rng() < 0.25) continue;
      const z = -inner + w * (k + 0.5);
      const a = x0 + 0.05 + rng() * 0.6, b = x1 - 0.05 - rng() * 0.6;
      add(member(V(a, z, 0.012), V(b, z, 0.012), w - 0.07, 0.024), metal, MEMBERS.plate);
    }
  }

  // ---------------------------------------------------------------- the sides: verticals at the nodes, Warren diagonals
  for (const s of [-1, 1]) for (let i = 0; i < nodes.length - 1; i++) {
    const x0 = nodes[i], x1 = nodes[i + 1];
    if (x0 > R.b) break;
    add(member(V(x0, s * SC, CH), V(x0, s * SC, DEPTH - CH), 0.12, 0.12, new THREE.Vector3(1, 0, 0)), metal, MEMBERS.side);
    const broken = (i === 5 && s > 0) || (i === 13 && s < 0);
    const [ta, tb] = i % 2 ? [x0, x1] : [x1, x0];
    if (broken) { // snapped half-way: the upper half hangs from its top joint
      const A = V(ta, s * SC, CH), M = V((ta + tb) / 2, s * SC, DEPTH / 2);
      const hang = V(ta + (tb - ta) * 0.12, s * (SC + 0.25), DEPTH * 0.62);
      add(member(A, hang, 0.1, 0.1, new THREE.Vector3(1, 0, 0)), metal, MEMBERS.torn); void M;
    } else add(member(V(ta, s * SC, CH), V(tb, s * SC, DEPTH - CH), 0.1, 0.1, new THREE.Vector3(1, 0, 0)), metal, MEMBERS.side);
  }
  // the belly: a bar at each node and an X between
  for (let i = 0; i < nodes.length - 1; i++) {
    const x0 = nodes[i], x1 = nodes[i + 1];
    if (x0 > R.b) break;
    add(member(V(x0, -SC, DEPTH - CH / 2), V(x0, SC, DEPTH - CH / 2), 0.1, 0.1, new THREE.Vector3(1, 0, 0)), metal, MEMBERS.side);
    if (i % 3 !== 1) add(member(V(x0, -SC, DEPTH - CH / 2 + 0.06), V(x1, SC, DEPTH - CH / 2 + 0.06), 0.07, 0.07, new THREE.Vector3(0, 1, 0)), metal, MEMBERS.side);
    if (i % 4 !== 2) add(member(V(x0, SC, DEPTH - CH / 2 + 0.06), V(x1, -SC, DEPTH - CH / 2 + 0.06), 0.07, 0.07, new THREE.Vector3(0, 1, 0)), metal, MEMBERS.side);
  }

  // ---------------------------------------------------------------- the torn end: what hangs from it
  {
    for (const s of [-1, 1]) {
      // the bottom chord broke and swung down; the side's last diagonal with it
      const A = V(xT, s * SC, DEPTH - CH / 2), B = A.clone().add(new THREE.Vector3(-0.7, -1.9 - 0.3 * s, s * 0.35));
      add(member(A, B, CH, CH), metal, MEMBERS.torn);
      add(member(V(xT, s * SC, CH), B.clone().lerp(A, 0.3), 0.1, 0.1, new THREE.Vector3(1, 0, 0)), metal, MEMBERS.torn);
      // the side's top joint, wrenched: a stub of diagonal pointing back the way the strut went on
      add(member(V(xT, s * SC, CH), V(xT - 1.2, s * (SC + 0.18), 1.05), 0.1, 0.1, new THREE.Vector3(1, 0, 0)), metal, MEMBERS.torn);
    }
    // a plate from the belly, hanging off one corner, curled
    const P = V(xT - 0.05, -0.2, DEPTH);
    const g = new THREE.PlaneGeometry(1.2, 1.6, 3, 4), p = g.attributes.position;
    for (let q = 0; q < p.count; q++) { const u = p.getX(q), v = p.getY(q); p.setZ(q, 0.25 * Math.sin((v + 0.8) * 1.6) + 0.12 * u * u); }
    g.rotateY(Math.PI / 2 + 0.25); g.rotateZ(0.18); g.translate(P.x - 0.15, P.y - 0.8, P.z);
    g.computeVertexNormals(); add(clean(g), metal, MEMBERS.plate);
  }

  // ---------------------------------------------------------------- the node half-way: a stub up, a stub out, a web between
  const xn = nodes[Math.round(nodes.length / 2) - 1];
  {
    const s = 1; // the south side: the meadow sees it against the sky, the walker has it at their left hand going east
    const base = V(xn, s * (HW + 0.25), 0.1);
    // up: a solid square member, snapped 3.1 m up and bent over to the south-east, its end in splinters
    const up = 3.1, bend = base.clone().add(new THREE.Vector3(0.08, up, 0.12));
    add(member(V(xn, s * (HW + 0.25), DEPTH - 0.05), bend, 0.46, 0.46, new THREE.Vector3(1, 0, 0)), metal, MEMBERS.stub);
    const tip = bend.clone().add(new THREE.Vector3(0.55, 0.55, 0.9));
    add(member(bend, tip, 0.4, 0.4, new THREE.Vector3(1, 0, 0)), metal, MEMBERS.stub);
    for (let k = 0; k < 5; k++) { // splinters off the snapped end
      const d = new THREE.Vector3(jit(0.4) + 0.3, jit(0.4) + 0.3, jit(0.4) + 0.5).normalize().multiplyScalar(0.3 + rng() * 0.45);
      const o = tip.clone().add(new THREE.Vector3(jit(0.14), jit(0.14), jit(0.14)));
      add(member(o, o.clone().add(d), 0.05 + rng() * 0.05, 0.05 + rng() * 0.04, new THREE.Vector3(1, 0, 0)), metal, MEMBERS.torn);
    }
    seams.push(member(bend.clone().add(new THREE.Vector3(0, -0.03, 0)), bend.clone().add(new THREE.Vector3(0, 0.03, 0)), 0.48, 0.48, new THREE.Vector3(1, 0, 0)));
    // a collar where it joins the chords
    add(member(V(xn - 0.35, s * (HW + 0.12), 0.34), V(xn + 0.35, s * (HW + 0.12), 0.34), 0.12, 0.6), metal, MEMBERS.side); // (clear of the walkable: its inner face 0.06 m out, its top 0.04 m under)
    // out: from the bottom chords' node, south and a little down, 5.5 m, then nothing
    const o0 = V(xn, s * (HW + 0.1), DEPTH - 0.3), o1 = o0.clone().add(new THREE.Vector3(0.3, -0.95, 5.5 * s));
    add(member(o0, o1, 0.5, 0.5, new THREE.Vector3(1, 0, 0)), metal, MEMBERS.stub);
    for (let k = 0; k < 4; k++) {
      const o = o1.clone().add(new THREE.Vector3(jit(0.15), jit(0.15), 0.05));
      add(member(o, o.clone().add(new THREE.Vector3(jit(0.25), jit(0.25), s * (0.25 + rng() * 0.4))), 0.06, 0.06, new THREE.Vector3(1, 0, 0)), metal, MEMBERS.torn);
    }
    // a rag of the square web the Lattices string across their cells, still tied to the bottom chords, sagging under the
    // belly over a few panels (on low, two)
    const wb = [];
    for (let i = 3; i < (hi ? 7 : 5); i++) {
      const x0 = nodes[i], x1 = nodes[i + 1];
      for (let k = 0; k <= 8; k++) {
        const x = x0 + (x1 - x0) * k / 8;
        if (rng() < 0.2) continue;
        const a = V(x, -SC, DEPTH), b = V(x, SC, DEPTH), m = V(x, 0, DEPTH + 0.25 + 0.15 * Math.sin(k));
        wb.push(a.x, a.y, a.z, m.x, m.y, m.z, m.x, m.y, m.z, b.x, b.y, b.z);
      }
      for (let k = -3; k <= 3; k++) {
        if (rng() < 0.3) continue;
        const z = (k / 3) * SC;
        for (let q = 0; q < 6; q++) {
          const xa = x0 + (x1 - x0) * q / 6, xb = x0 + (x1 - x0) * (q + 1) / 6;
          const sa = 0.25 * (1 - (z / SC) ** 2), A = V(xa, z, DEPTH + sa), B = V(xb, z, DEPTH + sa);
          wb.push(A.x, A.y, A.z, B.x, B.y, B.z);
        }
      }
    }
    web.push(wb);
    // rags of the traveller's people's cloth, tied round the stub at hand height: somebody crossed and marked it
    for (const [h, w, l, a0] of [[1.25, 0.24, 0.9, 0.5], [1.42, 0.16, 0.6, 2.4]]) {
      const ox = base.x + Math.cos(a0) * 0.27, oz = base.z + Math.sin(a0) * 0.27, ph = rng() * 6;
      rags.push(sheet((u, v) => { // hung from the knot, twisting as it falls, the hem blown a little east
        const d = 1 - v, tw = a0 + 0.9 * d + 0.3 * Math.sin(ph + d * 4);
        const across = (u - 0.5) * w * (1 - 0.3 * d);
        return [ox + Math.cos(tw + 1.57) * across + 0.18 * d * d, base.y + h - l * d, oz + Math.sin(tw + 1.57) * across + 0.05 * Math.sin(d * 5 + ph)];
      }, 2, 6));
      // the knot: a band round the stub
      add(member(base.clone().add(new THREE.Vector3(0, h - 0.04, 0)), base.clone().add(new THREE.Vector3(0, h + 0.05, 0)), 0.5, 0.5, new THREE.Vector3(1, 0, 0)), metal, 9);
    }
    // the stub stands outside the way: a post to steady a hand on, not a thing to walk through
    addCol({ x: base.x, z: base.z, r: 0.26, y: R.y(xn) - 1.5, h: 4.5, stand: false });
  }

  // ---------------------------------------------------------------- the east end, bitten into the deck's broken edge
  const spall = [];
  {
    const x = R.b, z = R.zc(x), y = R.y(x);
    // stones spalled off round the bite: the lip's own blocks, cracked off and lying askew either side of the way and below it
    for (let k = 0; k < 9; k++) {
      const side = k % 2 ? 1 : -1, d = 1.05 + rng() * 1.4;
      const sx = 0.35 + rng() * 0.5, sy = 0.25 + rng() * 0.35, sz = 0.3 + rng() * 0.5;
      const g = new THREE.BoxGeometry(sx, sy, sz); g.rotateX(jit(0.5)); g.rotateY(rng() * 3); g.rotateZ(jit(0.5));
      if (k < 6) { const sx0 = x + 0.3 + rng() * 1.8; g.translate(sx0, y + sy * 0.3, z + side * d); addCol({ x: sx0, z: z + side * d, r: Math.max(sx, sz) * 0.5, y: y - 0.2, h: sy * 0.8 + 0.2 }); } // on the deck, off the way; a walker steps up on or round them
      else g.translate(x - 0.3 - rng() * 0.6, y - DEPTH - 0.3 - rng() * 1.2, z + side * (0.5 + rng() * 0.8)); // wedged under the bite
      spall.push(clean(g));
    }
    // the stone of the lip round the bite, broken back in a ragged collar
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2, r = 1.05 + rng() * 0.3;
      const zz = z + Math.cos(a) * r, yy = y - DEPTH / 2 + Math.sin(a) * (DEPTH / 2 + 0.25);
      if (yy > y - 0.05) continue;
      const g = new THREE.BoxGeometry(0.5, 0.5 + rng() * 0.3, 0.45); g.rotateX(a); g.rotateZ(jit(0.3));
      g.translate(x - 0.15, yy, zz); spall.push(clean(g));
    }
  }

  // ---------------------------------------------------------------- colour: old metal; copper where the sun finds it
  const dark = new THREE.Color('#3b3a37'), verd = new THREE.Color('#4f7d6b'), dust = new THREE.Color('#77715f'), copper = new THREE.Color('#8f5d3e'), polish = new THREE.Color('#c4bea6'), nodeMetal = new THREE.Color('#8e9796'), c = new THREE.Color();
  const n3 = new THREE.Vector3(), A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
  for (const g of metal) {
    const p = g.attributes.position, col = new Float32Array(p.count * 3);
    for (let t = 0; t < p.count; t += 3) {
      A.fromBufferAttribute(p, t); B.fromBufferAttribute(p, t + 1); C.fromBufferAttribute(p, t + 2);
      n3.subVectors(C, B).cross(B.clone().sub(A)).normalize().negate();
      const mx = (A.x + B.x + C.x) / 3, my = (A.y + B.y + C.y) / 3, mz = (A.z + B.z + C.z) / 3;
      const vg = 0.5 + 0.5 * Math.sin(mx * 0.71 + mz * 2.3) * Math.sin(mx * 0.23 + my * 1.7 + 0.8);
      c.copy(dark).lerp(verd, Math.min(0.85, Math.max(0, vg - 0.25) * 1.4));
      if (g.userData.tag === MEMBERS.node) c.lerp(nodeMetal, 0.55);   // the nodes: a paler, harder metal, barely worn
      if (n3.y > 0.6) c.lerp(dust, 0.6);                        // dust on what faces up
      if (n3.y < -0.6) c.multiplyScalar(0.7);                   // the undersides darker
      const sunw = Math.max(0, n3.dot(sunN));
      c.lerp(polished.has(g) ? polish : copper, Math.min(1, sunw * 1.1) * (polished.has(g) ? 0.9 : 0.35));
      if (g.userData.tag === 9) c.set('#6b5530');               // the bronze band under the rags
      for (let q = 0; q < 3; q++) { col[(t + q) * 3] = c.r; col[(t + q) * 3 + 1] = c.g; col[(t + q) * 3 + 2] = c.b; }
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }

  const meshes = [];
  const mk = (geos, mat, name, shadow) => {
    const g = mergeGeometries(geos); for (const q of geos) q.dispose(); g.computeBoundingSphere();
    const m = new THREE.Mesh(g, mat); m.name = name; m.castShadow = shadow; m.receiveShadow = true;
    m.matrixAutoUpdate = false; m.updateMatrix(); ctx.scene.add(m); meshes.push(m); return m;
  };
  mk(metal, strutMaterial(), 'span-strut', hi); // (no shadow on low)
  const seamMat = new THREE.MeshStandardMaterial({ color: '#1c2630', emissive: new THREE.Color('#4f86b8'), emissiveIntensity: 0.3, roughness: 0.6 });
  mk(seams, seamMat, 'span-strut-seams', false);
  // like the Lattices overhead, the seams breathe a little, and give back light when the sun gutters
  ctx.registerUpdate((dt, t) => {
    const f = ctx.sky?.flicker?.value ?? 1, gut = Math.min(1, Math.max(0, (0.88 - f) / 0.5));
    seamMat.emissiveIntensity = 0.24 + 0.08 * Math.sin(t * 0.8) + 0.9 * gut;
  }, { pos: { x: 145.5, z: 215 }, near: hi ? 120 : 0, hz: hi ? 4 : 2 });
  for (const s of spall) K.body.push(s);
  const wpos = web.flat();
  const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wpos, 3)); wg.computeBoundingSphere();
  const wl = new THREE.LineSegments(wg, new THREE.LineBasicMaterial({ color: '#8aa0b0', transparent: true, opacity: 0.32, fog: true, depthWrite: false }));
  wl.name = 'span-strut-web'; wl.matrixAutoUpdate = false; ctx.scene.add(wl); meshes.push(wl);
  return { meshes, rags };
}
