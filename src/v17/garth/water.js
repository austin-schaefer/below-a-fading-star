// The Garth's rills (v17-U2): the valley's water, come in by the aqueduct, runs out of a spout in the wall north of
// the door into a ring of stone rills round the garden (both ways round to a grate opposite), and in by three
// feeders to a ring at the light's edge. Kerbs of Heliarch stone into the hall's builder; the water one mesh of its own,
// moving: streaks carried along each channel at its own speed, the noon glinting on it where the beam falls, rings
// spreading where the can drips. The water's face is a hand over the soil, brimming between its kerbs.
import * as THREE from 'three';
import { COLORS } from '../../v8/strata/parts.js';
import { CX, CZ, FLOOR, RILL, RADIALS, INLET, DRAIN, DOOR_A, R, at } from './plan.js';
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
  // from the spout at the wall to the ring
  { const pts = []; for (let r = R - 0.35, s = 0; r >= RILL.outer - 0.01; r -= 0.5, s += 0.5) { const [x, z] = at(Math.max(r, RILL.outer), INLET); pts.push([x, z, s]); } out.push({ pts, w: RILL.w, v: 0.7, dy: -0.009 }); }
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
  // the spout: a bronze lip out of the wall at the inlet, over a basin; the grate opposite
  const [sx, sz] = at(R - 0.05, INLET), ux = Math.cos(DOOR_A + INLET), uz = Math.sin(DOOR_A + INLET), vx = -uz, vz = ux;
  const Q = (u, v, y) => [sx - ux * u + vx * v, y, sz - uz * u + vz * v];
  const bz = rgb(H.bronzeDull, 1), g = rgb(H.bronze, 0.9);
  B.quad(Q(0, -0.22, FLOOR + 1.25), Q(0, 0.22, FLOOR + 1.25), Q(0.55, 0.16, FLOOR + 1.12), Q(0.55, -0.16, FLOOR + 1.12), bz, [0, -1, 0], 0.05);
  for (const s of [-1, 1]) B.quad(Q(0, s * 0.22, FLOOR + 1.25), Q(0.55, s * 0.16, FLOOR + 1.12), Q(0.55, s * 0.16, FLOOR + 1.24), Q(0, s * 0.22, FLOOR + 1.4), g, [vx * s, 0, vz * s], 0.05);
  B.quad(Q(0, -0.3, FLOOR + 1.4), Q(0, 0.3, FLOOR + 1.4), Q(0, 0.3, FLOOR + 1.62), Q(0, -0.3, FLOOR + 1.62), g, [-ux, 0, -uz], 0.05);
  const [gx, gz] = at(RILL.outer, DRAIN);
  for (let k = -3; k <= 3; k++) { const ox = Math.cos(DOOR_A + DRAIN) * k * 0.08, oz = Math.sin(DOOR_A + DRAIN) * k * 0.08; B.beam([gx + ox - Math.sin(DOOR_A + DRAIN) * 0.3, FLOOR + 0.065, gz + oz + Math.cos(DOOR_A + DRAIN) * 0.3], [gx + ox + Math.sin(DOOR_A + DRAIN) * 0.3, FLOOR + 0.065, gz + oz - Math.cos(DOOR_A + DRAIN) * 0.3], 0.018, rgb(H.bronzeDull, 0.7), 0); }
}

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
  // the fall from the spout to the basin: a ribbon, its s running down
  {
    const [sx, sz] = at(R - 0.6, INLET), ux = Math.cos(DOOR_A + INLET), uz = Math.sin(DOOR_A + INLET), vx = -uz, vz = ux;
    for (let i = 0; i <= 6; i++) { const t = i / 6, y = FLOOR + 1.12 - t * 1.1, o = -0.08 * t * t; for (const v of [-1, 1]) { pos.push(sx + ux * o + vx * 0.11 * v, y, sz + uz * o + vz * 0.11 * v); fl.push(t * 1.1, v, 2.2, 1); } }
    for (let i = 0; i < 6; i++) { const a = base + i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aFlow', new THREE.Float32BufferAttribute(fl, 4));
  g.setIndex(idx); g.computeBoundingSphere();
  const m = new THREE.ShaderMaterial({
    uniforms: { uNoon: U.uNoon, uNoonA: U.uNoonA, uNoonB: U.uNoonB, uNoonCol: U.uNoonCol, uNoonT: U.uNoonT, uDrip: drip },
    vertexShader: `attribute vec4 aFlow; varying vec4 vF; varying vec3 vW;
      void main() { vF = aFlow; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform vec4 uNoon, uNoonA, uDrip; uniform vec2 uNoonB; uniform vec3 uNoonCol; uniform float uNoonT; varying vec4 vF; varying vec3 vW;
      float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      void main() {
        float s = vF.x - uNoonT * vF.z, v = vF.y;
        // streaks carried down the channel: long along it, narrow across, two scales
        float st = n2(vec2(s * 2.2, v * 3.0 + 7.0)) * 0.6 + n2(vec2(s * 6.0, v * 7.0)) * 0.4;
        float r = length(vW.xz - uNoonA.xz);
        float inBeam = 1.0 - smoothstep(uNoon.y - 0.15, uNoon.y + 0.15, r);
        // the water's own: dark, a little of the dome's dim gold on it, more near the light; the noon glinting in the beam
        vec3 col = vec3(0.025, 0.035, 0.04) + uNoonCol * (0.05 + 0.12 * exp(-max(0.0, r - uNoon.y) / 4.0)) * (0.6 + 0.6 * st);
        col += uNoonCol * inBeam * (0.25 + 1.6 * pow(st, 4.0)) * uNoon.x / 2.6;
        // the edges, where it meets the kerb, a thin bright line moving
        col += uNoonCol * 0.08 * smoothstep(0.75, 1.0, abs(v)) * (0.5 + st);
        // the fall: paler, broken
        if (vF.w > 0.5) col = mix(col, uNoonCol * (0.18 + 0.3 * st), 0.6);
        // where the can drips: rings spreading from the drop (uDrip: x, z, its age, on)
        float dd = length(vW.xz - uDrip.xy), age = uDrip.z;
        col += uNoonCol * uDrip.w * 0.5 * exp(-age * 2.5) * smoothstep(0.03, 0.0, abs(dd - age * 0.35)) * step(dd, 0.45);
        gl_FragColor = vec4(col, 1.0);
      }`,
    // (no fog chunks: under the ground the haze is nil, as under.js's own materials mix it out)
    fog: false, side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(g, m); mesh.name = 'garth-water';
  return mesh;
}
