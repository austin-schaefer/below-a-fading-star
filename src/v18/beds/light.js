// The glasshouse's light through the grate (v18-F3): what falls into the chamber from the Florilegium overhead, in bars
// of its panes' colours between the grate's irons, slanting west onto the open tomb and moving a little as the light
// above breathes. One additive mesh: the four sides of the slanting shaft of air and the patch it lays on the floor.
//   grateLight({ x, z, half, top, floor, slant: [dx, dz], hues }) -> { mesh, uniforms }   (uTime is the page's clock)
import * as THREE from 'three';

export function grateLight({ x, z, half, top, floor, slant, hues }) {
  const [sx, sz] = slant, H = top - floor;
  const g0 = [[x - half, z - half], [x + half, z - half], [x + half, z + half], [x - half, z + half]];
  const pos = [], kind = [];
  const P = (k, t) => [g0[k][0] + sx * t, top - H * t, g0[k][1] + sz * t];
  for (let k = 0; k < 4; k++) { const a = P(k, 0), b = P((k + 1) % 4, 0), c = P((k + 1) % 4, 1), d = P(k, 1); pos.push(...a, ...b, ...c, ...a, ...c, ...d); kind.push(0, 0, 0, 0, 0, 0); }
  { const y = floor + 0.015, a = P(0, 1), b = P(1, 1), c = P(2, 1), d = P(3, 1), m = 0.35; // the patch, a little larger than the shaft's foot (it spreads)
    const e = (p, cx2, cz2) => [p[0] + Math.sign(p[0] - cx2) * m, y, p[2] + Math.sign(p[2] - cz2) * m];
    const cx2 = x + sx, cz2 = z + sz, A = e(a, cx2, cz2), B = e(b, cx2, cz2), C = e(c, cx2, cz2), D = e(d, cx2, cz2);
    pos.push(...A, ...C, ...B, ...A, ...D, ...C); kind.push(1, 1, 1, 1, 1, 1); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('aKind', new THREE.Float32BufferAttribute(kind, 1));
  geo.computeBoundingSphere();
  const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
    uTime: { value: 0 }, uI: { value: 1 }, uG: { value: new THREE.Vector4(x, z, half, top) }, uS: { value: new THREE.Vector3(sx, -H, sz) },
    uH0: { value: new THREE.Color(hues[0]) }, uH1: { value: new THREE.Color(hues[1]) }, uH2: { value: new THREE.Color(hues[2]) }, uH3: { value: new THREE.Color(hues[3]) },
  }]);
  const mat = new THREE.ShaderMaterial({
    uniforms, fog: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: /* glsl */`
      attribute float aKind; varying float vKind; varying vec3 vW;
      #include <fog_pars_vertex>
      void main() { vKind = aKind; vec3 transformed = position; vec4 w = modelMatrix * vec4(transformed, 1.0); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uI; uniform vec4 uG; uniform vec3 uS, uH0, uH1, uH2, uH3; varying float vKind; varying vec3 vW;
      #include <fog_pars_fragment>
      float h2(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5); }
      void main() {
        // back along the slant to the grate's plane: where this light came through
        float t = clamp((uG.w - vW.y) / -uS.y, 0.0, 1.0);
        vec2 sway = vec2(sin(uTime * 0.37), cos(uTime * 0.29)) * 0.05;
        vec2 g = (vW.xz - uS.xz * t - uG.xy + sway) / uG.z;            // -1..1 across the grate
        float edge = smoothstep(1.05, 0.85, max(abs(g.x), abs(g.y)));
        // the irons: six bars each way throw dark lines; the panes above: a colour a cell
        vec2 c = (g + 1.0) * 3.0, f = fract(c);
        float bars = smoothstep(0.0, 0.12, f.x) * smoothstep(1.0, 0.88, f.x) * smoothstep(0.0, 0.1, f.y) * smoothstep(1.0, 0.9, f.y);
        vec2 cell = floor((g + 1.0) * 1.5 + sway * 2.0);
        float k = h2(cell);
        vec3 col = k < 0.25 ? uH0 : k < 0.5 ? uH1 : k < 0.75 ? uH2 : uH3;
        float breathe = 0.85 + 0.15 * sin(uTime * 0.5 + k * 6.0);
        float a = vKind > 0.5 ? 0.55 : 0.07 * (1.0 - 0.6 * t);
        gl_FragColor = vec4(col * a * bars * edge * breathe * uI, 1.0);
        #include <fog_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 5;
  return { mesh, uniforms };
}
