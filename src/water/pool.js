// The Speculum: the pool at the fall's foot. Still and clear, pale stones on its floor; its surface does
// not mirror this sky but one long gone (a small yellow-white sun, a blue horizon, a few white clouds),
// blended in under the fresnel, so at a grazing angle it is a mirror of a lost sky and from above it is
// clear dark water. It reflects no one standing at its edge. Rings from the fall touch only its far side.
import * as THREE from 'three';
import { meshHeightSampler } from './river.js';

const VERT = /* glsl */`
  attribute float depth;
  varying float vDepth; varying vec3 vWorld;
  #include <fog_pars_vertex>
  void main() {
    vec3 transformed = position;
    vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
    vDepth = depth;
    vWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }`;

const FRAG = /* glsl */`
  precision highp float;
  uniform sampler2D uTex;
  uniform float uTime, uFlicker;
  uniform vec3 uCenter;     // x, z, radius of the bowl
  uniform vec2 uImpact;     // where the fall strikes
  uniform vec3 uYoungSun;   // direction to the sun it remembers
  uniform vec3 uSunDir, uSunLight;
  varying float vDepth; varying vec3 vWorld;
  #include <fog_pars_fragment>

  vec2 hash2(vec2 p) {
    vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    q += dot(q, q.yzx + 33.33);
    return fract((q.xx + q.yz) * q.zy);
  }
  // pale stones on the floor: a cell pattern with dark joints between rounded stones
  vec3 stones(vec2 p) {
    vec2 g = p / 0.16, i = floor(g), f = fract(g);
    float d1 = 8.0, d2 = 8.0; vec2 id = vec2(0.0);
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
      vec2 o = vec2(float(x), float(y));
      vec2 h = hash2(i + o);
      vec2 r = o + 0.15 + 0.7 * h - f;
      float d = dot(r, r);
      if (d < d1) { d2 = d1; d1 = d; id = i + o; } else if (d < d2) d2 = d;
    }
    float joint = smoothstep(0.0, 0.35, sqrt(d2) - sqrt(d1));
    vec2 h = hash2(id * 1.7 + 3.1);
    vec3 c = mix(vec3(0.42, 0.40, 0.36), vec3(0.62, 0.60, 0.55), h.x * h.x);
    c = mix(c, vec3(0.30, 0.32, 0.31), step(0.75, h.y) * 0.8);
    // silt in the hollows, dimming toward the middle of the pool
    float silt = texture2D(uTex, p * 0.21).a;
    c *= 0.55 + 0.45 * joint;
    return mix(c, vec3(0.16, 0.15, 0.13), smoothstep(0.45, 0.75, silt) * 0.6);
  }
  // the lost sky: blue, a young sun, a few slow white clouds over a low blue-green horizon
  vec3 lostSky(vec3 R) {
    float up = clamp(R.y, 0.0, 1.0);
    vec3 zen = vec3(0.10, 0.25, 0.62), hor = vec3(0.60, 0.74, 0.90);
    vec3 col = mix(zen, hor, pow(1.0 - up, 3.0));
    float ds = max(dot(R, uYoungSun), 0.0);
    col += vec3(1.0, 0.92, 0.72) * (pow(ds, 18.0) * 0.18 + pow(ds, 120.0) * 0.45);
    col += vec3(2.6, 2.45, 2.0) * smoothstep(0.99955, 0.99975, ds);
    // clouds on a plane overhead
    vec2 cuv = R.xz / (R.y + 0.09) * 0.11 + vec2(uTime * 0.0035, uTime * 0.0012);
    float cn = texture2D(uTex, cuv).a * 0.62 + texture2D(uTex, cuv * 2.7 + 0.3).a * 0.38;
    float cl = smoothstep(0.58, 0.74, cn) * smoothstep(0.03, 0.14, up) * (1.0 - smoothstep(0.55, 0.85, up));
    vec3 cloud = mix(vec3(0.70, 0.73, 0.80), vec3(0.97, 0.96, 0.94), smoothstep(0.6, 0.8, cn)) + vec3(0.25, 0.2, 0.1) * pow(ds, 6.0);
    col = mix(col, cloud, cl * 0.9);
    // far hills, blue with distance
    float az = atan(R.z, R.x);
    float hill = 0.028 + 0.014 * sin(az * 3.0 + 1.0) + 0.008 * sin(az * 7.0 + 2.2) + 0.004 * sin(az * 17.0);
    col = mix(col, mix(hor, vec3(0.30, 0.40, 0.44), 0.55), (1.0 - smoothstep(hill - 0.004, hill + 0.004, R.y)) * 0.85);
    return col;
  }

  void main() {
    vec3 P = vWorld;
    vec2 p = P.xz;
    if (distance(p, uCenter.xy) > uCenter.z) discard;
    float dep = vDepth;
    float edge = smoothstep(0.0, 0.14, dep);
    if (edge <= 0.002) discard;
    vec3 toCam = cameraPosition - P;
    float dist = length(toCam);
    vec3 V = toCam / dist;

    // the fall's rings: they die out within a few metres, so the near water is flat calm
    vec2 di = p - uImpact; float ri = max(length(di), 0.01);
    float w = sin(ri * 4.6 - uTime * 1.9) * exp(-ri * 0.62) + 0.45 * sin(ri * 8.3 - uTime * 3.1 + 1.3) * exp(-ri * 1.2);
    vec2 sl = di / ri * w * 0.045;
    sl += (texture2D(uTex, p * 0.3 + vec2(uTime * 0.004, -uTime * 0.003)).rg - 0.5) * 0.006;
    vec3 N = normalize(vec3(-sl.x, 1.0, -sl.y));
    float NV = max(dot(N, V), 0.0);
    float F = 0.02 + 0.98 * pow(1.0 - NV, 3.6);

    vec3 R = reflect(-V, N); R.y = abs(R.y);
    vec3 refl = lostSky(R);

    // through the water to the stones: refracted, absorbed (red first), dimly lit by this world's light
    vec3 rd = refract(-V, N, 0.752);
    float path = dep / max(-rd.y, 0.25);
    vec2 bed = p + rd.xz * path;
    vec3 st = stones(bed);
    vec3 absorb = exp(-path * vec3(0.9, 0.38, 0.3));
    float light = 0.09 + 0.13 * uFlicker;
    vec3 body = st * absorb * light * vec3(1.0, 0.82, 0.72) + vec3(0.002, 0.006, 0.008) * (1.0 - absorb.g);

    vec3 col = mix(body, refl, F);
    // foam where the fall strikes, churning outward
    float ang = atan(di.y, di.x);
    float churn = texture2D(uTex, vec2(ang * 0.32 + uTime * 0.02, ri * 0.45 - uTime * 0.35)).a * 0.6 + texture2D(uTex, p * 0.9 + vec2(0.0, -uTime * 0.2)).a * 0.4;
    float foam = (1.0 - smoothstep(0.4, 2.4, ri)) * smoothstep(0.2, 0.75, churn + 0.3 * (1.0 - smoothstep(0.0, 1.0, ri)));
    col = mix(col, vec3(0.62, 0.58, 0.56) * (0.35 + 0.65 * uFlicker), foam * 0.7);
    // the rim of the pool softens into its beach
    float rimFade = 1.0 - smoothstep(uCenter.z - 0.7, uCenter.z, distance(p, uCenter.xy));
    col = mix(col, body * 0.6, (1.0 - rimFade) * 0.5);
    float alpha = edge * mix(0.55, 1.0, rimFade);
    gl_FragColor = vec4(col, alpha);
    vec3 preFog = gl_FragColor.rgb;
    #include <fog_fragment>
    // the lost sky does not sit under this world's haze
    gl_FragColor.rgb = mix(gl_FragColor.rgb, preFog, 0.6 * (1.0 - smoothstep(30.0, 160.0, dist)));
  }`;

export function buildPool(ctx, tex, impact) {
  const { scene, terrain } = ctx;
  const RV = terrain.river, pool = RV.pool, R = RV.poolR;
  const meshH = meshHeightSampler(terrain);
  const rings = 22, segs = 72;
  const n = 1 + rings * segs;
  const pos = new Float32Array(n * 3), depth = new Float32Array(n), idx = [];
  const put = (i, x, z) => { pos[i * 3] = x - pool.x; pos[i * 3 + 2] = z - pool.z; depth[i] = pool.y - meshH(x, z); };
  put(0, pool.x, pool.z);
  for (let r = 1; r <= rings; r++) for (let s = 0; s < segs; s++) {
    const a = (s / segs) * Math.PI * 2, rad = (R + 0.15) * (r / rings);
    put(1 + (r - 1) * segs + s, pool.x + Math.cos(a) * rad, pool.z + Math.sin(a) * rad);
  }
  const at = (r, s) => (r === 0 ? 0 : 1 + (r - 1) * segs + (s % segs));
  for (let s = 0; s < segs; s++) idx.push(0, at(1, s + 1), at(1, s));
  for (let r = 1; r < rings; r++) for (let s = 0; s < segs; s++) { const a = at(r, s), b = at(r, s + 1), c = at(r + 1, s), d = at(r + 1, s + 1); idx.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('depth', new THREE.BufferAttribute(depth, 1));
  g.setIndex(idx);
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), R + 0.5);

  // the remembered sun: a little south of where you stand to look into the pool from the canyon, 21° up,
  // so its reflection lies in the calm near half of the water
  const az = Math.atan2(RV.back.z, RV.back.x) - 0.42, el = (21 * Math.PI) / 180;
  const young = new THREE.Vector3(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az));
  const flick = ctx.sky && ctx.sky.flicker ? ctx.sky.flicker : { value: 1 };
  const mat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uTex: { value: tex }, uTime: { value: 0 }, uFlicker: { value: 1 },
      uCenter: { value: new THREE.Vector3(pool.x, pool.z, R) },
      uImpact: { value: new THREE.Vector2(impact.x, impact.z) },
      uYoungSun: { value: young },
      uSunDir: { value: new THREE.Vector3(ctx.sun.dir.x, ctx.sun.dir.y, ctx.sun.dir.z) },
      uSunLight: { value: new THREE.Color(ctx.palette.sunLight) },
    }]),
    vertexShader: VERT, fragmentShader: FRAG, fog: true, transparent: true, depthWrite: false,
  });
  const mesh = new THREE.Mesh(g, mat);
  mesh.position.set(pool.x, pool.y, pool.z);
  mesh.renderOrder = 10; mesh.name = 'water-speculum';
  scene.add(mesh);
  return {
    mesh, youngSun: young,
    update: (dt, t) => { mat.uniforms.uTime.value = t; mat.uniforms.uFlicker.value = flick.value; },
  };
}
