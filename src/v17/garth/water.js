// The Garth's rills (v17-U2): the valley's water, come in by the aqueduct, runs out of a spout-stone in the wall north
// of the door (a coursed block standing proud, a lipped trough out of a slot in it, a thin fall to the rill's head) into a ring of stone rills round the garden (both ways round to a grate opposite), and in by three
// feeders to a ring at the light's edge. Kerbs of Heliarch stone into the hall's builder; the water one mesh of its own,
// moving: streaks carried along each channel at its own speed, the noon glinting on it where the beam falls, rings
// spreading where the can drips. The water's face is a hand over the soil, brimming between its kerbs.
import * as THREE from 'three';
import { COLORS } from '../../v8/strata/parts.js';
import { CX, CZ, FLOOR, RILL, RADIALS, INLET, DRAIN, DOOR_A, R, SPOUT, SPOUTS, at } from './plan.js';
import { U } from './noon.js';

const H = COLORS.heliarch, rgb = (c, k = 1) => [c.r * k, c.g * k, c.b * k];

// the channels as polylines with a flow coordinate: [{ pts: [[x, z, s], ...] }]: s rises downstream
export function channels(low) {
  const out = [];
  const arc = (r, b0, b1) => { const n = Math.max(4, Math.ceil(Math.abs(b1 - b0) * r / (low ? 0.9 : 0.6))), pts = []; let s = 0, prev = null; for (let i = 0; i <= n; i++) { const [x, z] = at(r, b0 + (b1 - b0) * i / n); if (prev) s += Math.hypot(x - prev[0], z - prev[1]); pts.push([x, z, s]); prev = [x, z]; } return pts; };
  // the outer ring: from the inlet both ways round to the drain
  out.push({ pts: arc(RILL.outer, INLET, DRAIN), w: RILL.w, v: 0.55, dy: 0 });
  out.push({ pts: arc(RILL.outer, INLET, INLET - (Math.PI * 2 - (DRAIN - INLET))), w: RILL.w, v: 0.55, dy: 0.009 });
  // the feeders, in from the outer ring to the inner
  for (const b of RADIALS) { const pts = []; for (let r = RILL.outer, s = 0; r >= RILL.inner - 0.01; r -= 0.8, s += 0.8) { const [x, z] = at(Math.max(r, RILL.inner), b); pts.push([x, z, s]); } out.push({ pts, w: RILL.w * 0.8, v: 0.4, dy: -0.009 }); }
  // the inner ring, at the light's edge, slow
  out.push({ pts: arc(RILL.inner, -Math.PI, Math.PI), w: RILL.w * 0.8, v: 0.18, dy: 0.009 });
  // from the spout-stone at the wall to the ring
  for (const b of SPOUTS) { const pts = []; for (let r = SPOUT.face - 0.01, s = 0; r >= RILL.outer - 0.01; r -= 0.5, s += 0.5) { const [x, z] = at(Math.max(r, RILL.outer), b); pts.push([x, z, s]); } out.push({ pts, w: RILL.w, v: 0.7, dy: -0.009 }); }
  return out;
}

// kerbs into the hall's builder (two low stones a side of each channel), and the spout and the grate
export function buildKerbs(B, chans) {
  const ky = FLOOR + 0.055, col = rgb(H.stone, 0.82), top = rgb(H.stone, 0.95);
  for (const c of chans) {
    const P = c.pts, hw = c.w / 2;
    for (let i = 0; i < P.length - 1; i++) {
      const [ax, az] = P[i], [bx, bz] = P[i + 1], dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz) || 1, nx = -dz / l, nz = dx / l;
      for (const s of [-1, 1]) {
        const o0 = hw * s, o1 = (hw + RILL.kerb) * s;
        const A0 = [ax + nx * o0, az + nz * o0], B0 = [bx + nx * o0, bz + nz * o0], A1 = [ax + nx * o1, az + nz * o1], B1 = [bx + nx * o1, bz + nz * o1];
        B.quad([A0[0], ky, A0[1]], [B0[0], ky, B0[1]], [B1[0], ky, B1[1]], [A1[0], ky, A1[1]], top, [0, 1, 0], 0.06);
        B.quad([A0[0], FLOOR - 0.02, A0[1]], [B0[0], FLOOR - 0.02, B0[1]], [B0[0], ky, B0[1]], [A0[0], ky, A0[1]], col, [-nx * s, 0, -nz * s], 0.04);
        B.quad([A1[0], FLOOR - 0.02, A1[1]], [B1[0], FLOOR - 0.02, B1[1]], [B1[0], ky, B1[1]], [A1[0], ky, A1[1]], col, [nx * s, 0, nz * s], 0.04);
      }
      // the bed, dark, under the water
      B.quad([ax + nx * hw, FLOOR + 0.01, az + nz * hw], [bx + nx * hw, FLOOR + 0.01, bz + nz * hw], [bx - nx * hw, FLOOR + 0.01, bz - nz * hw], [ax - nx * hw, FLOOR + 0.01, az - nz * hw], rgb(H.cut, 1.4), [0, 1, 0], 0);
    }
  }
  for (const b of SPOUTS) spout(B, b);
  // the grate opposite, where the water leaves
  const [gx, gz] = at(RILL.outer, DRAIN);
  for (let k = -3; k <= 3; k++) { const ox = Math.cos(DOOR_A + DRAIN) * k * 0.08, oz = Math.sin(DOOR_A + DRAIN) * k * 0.08; B.beam([gx + ox - Math.sin(DOOR_A + DRAIN) * 0.3, FLOOR + 0.065, gz + oz + Math.cos(DOOR_A + DRAIN) * 0.3], [gx + ox + Math.sin(DOOR_A + DRAIN) * 0.3, FLOOR + 0.065, gz + oz - Math.cos(DOOR_A + DRAIN) * 0.3], 0.018, rgb(H.bronzeDull, 0.7), 0); }
}

// a spout-stone at bearing b, into the hall's builder: one function for every place the water comes out of the wall.
// A coursed block from the floor to above the lip, bedded in the drum and standing proud of the plinth, a cap-stone over
// it; a slot cut in its face; out of the slot a stone trough on a corbel, its floor dark and wet; a wet stain down the
// face under it. Every piece a closed box or a face laid on stone: nothing hangs in the air.
function spout(B, b) {
  const yaw = -(DOOR_A + b); // (box's yaw: its local x along the radius, outward)
  const [mx, mz] = at(0, b), ux = Math.cos(DOOR_A + b), uz = Math.sin(DOOR_A + b), vx = -uz, vz = ux;
  const P = (r, v, y) => [mx + ux * r + vx * v, y, mz + uz * r + vz * v];
  const box = (r0, r1, hv, y0, y1, col, top = col, jit = 0.05) => { const [x, , z] = P((r0 + r1) / 2, 0, 0); B.box(x, (y0 + y1) / 2, z, (r1 - r0) / 2, (y1 - y0) / 2, hv, yaw, col, top, jit); };
  const stone = (k) => rgb(H.stone, k), F = SPOUT.face, L = SPOUT.lip, y = SPOUT.y;
  // the block, in two courses (the lower to the slot's foot, the upper over it), a hair's step between them
  box(F, R + 0.25, SPOUT.half, FLOOR, y - 0.08, rgb(H.dark, 0.78), rgb(H.dark, 0.9));
  box(F + 0.015, R + 0.25, SPOUT.half - 0.02, y - 0.08, SPOUT.top - 0.006, rgb(H.dark, 0.9), rgb(H.dark, 1.0)); // (the darker stone of the plinth: it stands out of the wall's paler courses)
  // the cap: a moulded stone a hand wider and prouder, its underside in shadow
  box(F - 0.06, R + 0.25, SPOUT.half + 0.06, SPOUT.top, SPOUT.top + 0.14, stone(1.08), stone(1.15));
  box(F - 0.03, R + 0.25, SPOUT.half + 0.03, SPOUT.top - 0.05, SPOUT.top - 0.003, rgb(H.dark, 0.9)); // (its top and the course's stop short of the cap's underside: no two paints in one plane)
  // the slot: a dark mouth laid on the upper course's face (its jambs the course's stone)
  const fz = F + 0.015 - 0.004;
  B.quad(P(fz, -0.12, y - 0.075), P(fz, 0.12, y - 0.075), P(fz, 0.12, y + 0.12), P(fz, -0.12, y + 0.12), rgb(H.cut, 1.0), [-ux, 0, -uz], 0);
  // the trough: a stone floor out of the slot with a cheek each side, on a corbel
  box(L, F + 0.06, 0.12, y - 0.06, y, stone(1.05), stone(1.1));
  for (const s of [-1, 1]) { const [x, , z] = P((L + F + 0.06) / 2, s * 0.1, 0); B.box(x, y + 0.03, z, (F + 0.06 - L) / 2, 0.03, 0.02, yaw, stone(0.92), stone(1.0), 0.05); }
  box(F - 0.13, F + 0.02, 0.08, y - 0.24, y - 0.06, stone(0.75));
  // the trough's floor, wet: dark, a little green of old slime where the water runs
  B.quad(P(L + 0.002, -0.08, y + 0.002), P(L + 0.002, 0.08, y + 0.002), P(F + 0.01, 0.08, y + 0.002), P(F + 0.01, -0.08, y + 0.002), [0.05, 0.07, 0.06], [0, 1, 0], 0.1);
  // the stain: the face below the corbel darkened by centuries of splash, wider toward the floor
  const fs = F - 0.003;
  B.quad(P(fs, -0.09, y - 0.24), P(fs, 0.09, y - 0.24), P(fs, 0.2, FLOOR + 0.06), P(fs, -0.2, FLOOR + 0.06), rgb(H.dark, 0.55), [-ux, 0, -uz], 0.15);
}

// the fall from a spout's lip: a thin arc out and down to the rill (horizontal speed 0.5 m/s), as points [r, y]
const FALL_N = 8;
function fallPath() {
  const h = SPOUT.y + 0.02 - RILL.y, T = Math.sqrt(2 * h / 9.8), out = [];
  for (let i = 0; i <= FALL_N; i++) { const t = T * i / FALL_N; out.push([SPOUT.lip - 0.02 - 0.5 * t, SPOUT.y + 0.02 - 4.9 * t * t]); }
  return out;
}
// where each spout's fall meets the rill (x, z): the boil and its rings
export const fallFoot = (b) => at(fallPath()[FALL_N][0], b);

// the water: strips over the channels and a falling ribbon from the spout, one mesh, its own shader
export function waterMesh(chans, drip) {
  const pos = [], fl = [], idx = [];
  let base = 0;
  for (const c of chans) {
    const P = c.pts, hw = c.w / 2;
    for (let i = 0; i < P.length; i++) {
      const [x, z, s] = P[i], j = Math.min(i, P.length - 2), dx = P[j + 1][0] - P[j][0], dz = P[j + 1][1] - P[j][1], l = Math.hypot(dx, dz) || 1, nx = -dz / l, nz = dx / l;
      for (const v of [-1, 1]) { pos.push(x + nx * hw * v, RILL.y + c.dy, z + nz * hw * v); fl.push(s, v, c.v, 0); }
    }
    for (let i = 0; i < P.length - 1; i++) { const a = base + i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    base += P.length * 2;
  }
  // the falls from the spouts: two crossed ribbons each (one across the wall, one along the arc), narrower than the
  // slot, their s running down; aFlow.w 1 marks them (the shader makes them thin, broken and see-through)
  for (const b of SPOUTS) {
    const ux = Math.cos(DOOR_A + b), uz = Math.sin(DOOR_A + b), vx = -uz, vz = ux, [mx, mz] = at(0, b), path = fallPath();
    for (const cross of [0, 1]) {
      for (let i = 0; i <= FALL_N; i++) {
        const [r, y] = path[i], t = i / FALL_N, hw = 0.062 - 0.016 * t + 0.035 * t * t * t; // narrows as it falls, spreads where it lands
        const [a, c] = i < FALL_N ? [path[i], path[i + 1]] : [path[i - 1], path[i]], tr = c[0] - a[0], ty = c[1] - a[1], tl = Math.hypot(tr, ty);
        for (const v of [-1, 1]) {
          const ox = cross ? ux * (-ty / tl) * hw * v : vx * hw * v, oy = cross ? (tr / tl) * hw * v : 0, oz = cross ? uz * (-ty / tl) * hw * v : vz * hw * v;
          pos.push(mx + ux * r + ox, y + oy, mz + uz * r + oz); fl.push((SPOUT.y - y), v, 2.6, 1 + t);
        }
      }
      for (let i = 0; i < FALL_N; i++) { const a = base + i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
      base += (FALL_N + 1) * 2;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aFlow', new THREE.Float32BufferAttribute(fl, 4));
  g.setIndex(idx); g.computeBoundingSphere();
  const m = new THREE.ShaderMaterial({
    uniforms: { uNoon: U.uNoon, uNoonA: U.uNoonA, uNoonB: U.uNoonB, uNoonCol: U.uNoonCol, uNoonT: U.uNoonT, uDrip: drip, uFall: { value: new THREE.Vector2(...fallFoot(SPOUTS[0])) } },
    vertexShader: `attribute vec4 aFlow; varying vec4 vF; varying vec3 vW;
      void main() { vF = aFlow; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform vec4 uNoon, uNoonA, uDrip; uniform vec2 uNoonB, uFall; uniform vec3 uNoonCol; uniform float uNoonT; varying vec4 vF; varying vec3 vW;
      float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      void main() {
        float s = vF.x - uNoonT * vF.z, v = vF.y;
        // streaks carried down the channel: long along it, narrow across, two scales
        float st = n2(vec2(s * 2.2, v * 3.0 + 7.0)) * 0.6 + n2(vec2(s * 6.0, v * 7.0)) * 0.4;
        float r = length(vW.xz - uNoonA.xz);
        float inBeam = 1.0 - smoothstep(uNoon.y - 0.15, uNoon.y + 0.15, r);
        // the water's own: dark, a little of the dome's dim gold on it, more near the light; the noon glinting in the beam
        vec3 col = vec3(0.02, 0.03, 0.035) + uNoonCol * (0.02 + 0.05 * exp(-max(0.0, r - uNoon.y) / 4.0)) * (0.5 + 0.9 * st);
        col += uNoonCol * inBeam * (0.25 + 1.6 * pow(st, 4.0)) * uNoon.x / 2.6;
        // the edges, where it meets the kerb, a thin bright line moving
        col += uNoonCol * 0.035 * smoothstep(0.8, 1.0, abs(v)) * (0.5 + st);
        // the fall's foot: a small boil where it strikes, rings running out from it over the channel
        float df = length(vW.xz - uFall);
        float boil = (1.0 - smoothstep(0.02, 0.13, df)) * (0.4 + 0.6 * n2(vec2(df * 30.0 - uNoonT * 6.0, atan(vW.z - uFall.y, vW.x - uFall.x) * 3.0)));
        float rings = smoothstep(0.55, 0.95, sin(df * 55.0 - uNoonT * 9.0)) * exp(-df * 7.0) * step(0.06, df);
        col += uNoonCol * (0.16 * boil + 0.07 * rings);
        float alpha = 1.0;
        if (vF.w > 0.5) {
          // the fall: a thin rope of water, its edges soft, broken into strands sliding down, see-through; a bright core
          // where the hall's light catches its round, fraying and paling as it drops
          float t = vF.w - 1.0, ft = vF.x - uNoonT * vF.z;
          float strands = n2(vec2(v * 4.0 + 3.0, ft * 9.0)) * 0.55 + n2(vec2(v * 9.0, ft * 22.0)) * 0.45;
          float edge = 1.0 - smoothstep(0.35 - 0.15 * t, 1.0, abs(v));
          float core = exp(-v * v * 9.0);
          col = uNoonCol * (0.035 + 0.11 * core * (0.6 + strands) + 0.08 * t * strands);
          alpha = edge * (0.32 + 0.5 * strands) * (0.55 + 0.45 * core) * smoothstep(0.0, 0.08, t + 0.02) * (1.0 - 0.45 * smoothstep(0.75, 1.0, t));
        }
        gl_FragColor = vec4(col, alpha);
      }`,
    // (no fog chunks: under the ground the haze is nil, as under.js's own materials mix it out)
    fog: false, side: THREE.DoubleSide, transparent: true, depthWrite: false, // (the falls are see-through; the rills are alpha 1, on the floor, under nothing else see-through)
  });
  const mesh = new THREE.Mesh(g, m); mesh.name = 'garth-water'; mesh.renderOrder = -1; // (first of the see-through things, as when it was opaque: the beam's light still lies over it)
  return mesh;
}
