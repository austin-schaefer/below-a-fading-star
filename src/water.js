// Water: Lees Tarn and Corpse-Candle Fen as two subdivided discs with a custom shader.
// Near-black body, fresnel-weighted analytic reflection of the sky (same gradient as sky.js),
// the sun's disc reflected through animated normals (so it breaks into a glittering path),
// shore fade from a per-vertex depth attribute, scum line, ripple rings, and on the fen duckweed
// and a faint methane sheen. Two draw calls. Exposes ctx.waterSurface.
import * as THREE from 'three';
import { makeWaterTexture } from './water/textures.js';

const MAX_RIPPLES = 6;

function discGeometry(ctx, body, rings, segs) {
  const n = 1 + rings * segs;
  const pos = new Float32Array(n * 3), depth = new Float32Array(n);
  const idx = [];
  const put = (i, x, z) => {
    pos[i * 3] = x - body.x; pos[i * 3 + 1] = 0; pos[i * 3 + 2] = z - body.z;
    depth[i] = body.y - ctx.terrain.heightAt(x, z);
  };
  put(0, body.x, body.z);
  for (let r = 1; r <= rings; r++) {
    const rad = body.r * (r / rings);
    for (let s = 0; s < segs; s++) {
      const a = (s / segs) * Math.PI * 2;
      put(1 + (r - 1) * segs + s, body.x + Math.cos(a) * rad, body.z + Math.sin(a) * rad);
    }
  }
  const at = (r, s) => (r === 0 ? 0 : 1 + (r - 1) * segs + (s % segs));
  for (let s = 0; s < segs; s++) idx.push(0, at(1, s + 1), at(1, s));
  for (let r = 1; r < rings; r++) for (let s = 0; s < segs; s++) {
    const a = at(r, s), b = at(r, s + 1), c = at(r + 1, s), d = at(r + 1, s + 1);
    idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('depth', new THREE.BufferAttribute(depth, 1));
  g.setIndex(idx);
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), body.r * 1.05);
  return g;
}

const VERT = /* glsl */`
  attribute float depth;
  varying float vDepth;
  varying vec3 vWorld;
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
  uniform float uTime, uFlicker, uFen;
  uniform vec3 uSunDir, uSunCore, uSunLight, uHorizonSun, uHorizonAway, uZenith, uWater, uWisp;
  uniform vec4 uRipples[${MAX_RIPPLES}];
  varying float vDepth;
  varying vec3 vWorld;
  #include <fog_pars_fragment>

  vec3 skyCol(vec3 d) {
    float up = clamp(d.y, 0.0, 1.0);
    float toSun = max(dot(d, uSunDir), 0.0);
    float band = pow(1.0 - up, 3.5);
    vec3 horizon = mix(uHorizonAway, uHorizonSun, pow(toSun, 1.6));
    vec3 sky = mix(uZenith, horizon, band);
    float glow = pow(toSun, 6.0) * 0.55 + pow(toSun, 24.0) * 0.7 + pow(toSun, 90.0) * 1.2;
    sky += uSunLight * glow * uFlicker * (0.6 + 0.4 * (1.0 - smoothstep(0.0, 0.35, up)));
    return sky;
  }
  vec3 hash3(vec2 p) {
    vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    q += dot(q, q.yxz + 33.33);
    return fract((q.xxy + q.yzz) * q.zyx);
  }
  vec2 slopeAt(vec2 p, float scale, vec2 vel) {
    return (texture2D(uTex, p * scale + vel * uTime).rg - 0.5) * 2.0;
  }

  void main() {
    vec3 P = vWorld;
    vec3 toCam = cameraPosition - P;
    float dist = length(toCam);
    vec3 V = toCam / dist;
    vec2 p = P.xz;

    // shore: alpha from depth, ragged by noise
    float rag = texture2D(uTex, p * 0.09).a;
    float d = vDepth + (rag - 0.5) * 0.25;
    float shore = smoothstep(0.0, 0.32, d);
    if (shore <= 0.002) discard;

    // animated normal: three scrolling octaves, a slow swell, and ripple rings
    float far = 1.0 / (1.0 + dist * 0.004);
    vec2 s = slopeAt(p, 0.060, vec2(0.012, 0.007)) * 0.085
           + slopeAt(p, 0.19, vec2(-0.021, 0.015)) * 0.060
           + slopeAt(p, 0.57, vec2(0.034, -0.05)) * 0.040 * far;
    s += vec2(sin(p.x * 0.11 + uTime * 0.31), sin(p.y * 0.09 - uTime * 0.23)) * 0.02;
    // ripples
    float ringShade = 0.0;
    for (int i = 0; i < ${MAX_RIPPLES}; i++) {
      vec4 rp = uRipples[i];
      float age = uTime - rp.z;
      if (age > 0.0 && age < 9.0 && rp.w > 0.0) {
        vec2 dv = p - rp.xy; float r = length(dv);
        float front = age * 0.55;
        float env = exp(-pow((r - front) / (0.9 + age * 0.25), 2.0)) * (1.0 - age / 9.0) * rp.w;
        float w = sin((r - front) * 5.5) * env;
        s += dv / max(r, 0.01) * w * 0.05;
        ringShade += abs(w);
      }
    }

    // duckweed on the fen
    float weedN = texture2D(uTex, p * 0.045 + 3.7).a * 0.45 + texture2D(uTex, p * 0.21 + 1.3).a * 0.55;
    float speck = texture2D(uTex, p * 1.7).a;
    float weed = uFen * smoothstep(0.6, 0.66, weedN) * smoothstep(0.38, 0.55, speck) * smoothstep(0.3, 0.6, d);
    s *= 1.0 - weed * 0.85;

    vec3 N = normalize(vec3(-s.x, 1.0, -s.y));
    float NV = max(dot(N, V), 0.0);
    float fres = 0.04 + 0.96 * pow(1.0 - NV, 4.0);
    fres = clamp(fres * 1.1, 0.0, 1.0);

    vec3 R = reflect(-V, N);
    R.y = abs(R.y);
    vec3 refl = skyCol(R) * 0.8;
    // the ring of mountains mirrored as a black band low in the reflection, ragged along its top,
    // open only where the sun sits in the western saddle: this is what makes the tarn read as black water
    {
      float az = atan(R.z, R.x);
      float crest = 0.13 + 0.07 * sin(az * 7.0 + 1.3) + 0.04 * sin(az * 19.0 + 0.4) + 0.025 * sin(az * 41.0);
      vec2 rh = normalize(R.xz + 1e-4), sh = normalize(uSunDir.xz);
      crest *= 1.0 - 0.75 * pow(max(dot(rh, sh), 0.0), 40.0);
      float mtn = 1.0 - smoothstep(crest - 0.02, crest + 0.02, R.y);
      refl = mix(refl, vec3(0.010, 0.008, 0.014) + uHorizonAway * 0.05, mtn * 0.9);
    }
    // the sun's disc, broken by the ripples into a path of glitter
    float sd = dot(R, uSunDir);
    float disc = smoothstep(0.9948, 0.9972, sd);
    float tw = 0.55 + 0.45 * texture2D(uTex, p * 0.9 + vec2(uTime * 0.05, -uTime * 0.03)).a * 2.0;
    refl += uSunCore * disc * 3.2 * uFlicker * tw;
    refl += uSunLight * pow(max(sd, 0.0), 220.0) * 0.8 * uFlicker;

    // body: near black, slightly lifted toward the sky tint in deep water
    vec3 body = uWater * (0.7 + 0.3 * NV) + vec3(0.002, 0.0015, 0.004);
    vec3 col = mix(body, refl, fres);

    // methane sheen on the fen: oily hue by view angle
    float oil = texture2D(uTex, p * 0.07 + vec2(uTime * 0.004, 0.0)).a;
    vec3 sheen = 0.5 + 0.5 * cos(6.2832 * (vec3(0.0, 0.33, 0.67) + (1.0 - NV) * 1.6 + oil * 1.5));
    col += uFen * sheen * vec3(0.02, 0.018, 0.028) * (0.2 + fres) * smoothstep(0.45, 0.75, oil);

    float alpha = shore * mix(0.93, 1.0, fres);

    // duckweed: sickly green-brown, opaque
    vec3 weedCol = mix(vec3(0.02, 0.03, 0.01), vec3(0.05, 0.04, 0.015), texture2D(uTex, p * 0.8).a);
    col = mix(col, weedCol, weed * 0.85);

    // lily-like pads on the fen pools: dark discs with a notch, now and then a pale bloom
    float pads = 0.0, bloom = 0.0;
    if (uFen > 0.5) {
      vec2 cell = floor(p / 3.2);
      for (int ix = -1; ix <= 1; ix++) {
        for (int iy = -1; iy <= 1; iy++) {
          vec2 id = cell + vec2(float(ix), float(iy));
          vec3 h = hash3(id);
          float on = step(0.45, h.x);
          vec2 ctr = (id + 0.2 + 0.6 * h.yz) * 3.2;
          vec2 dv = p - ctr;
          float rr = length(dv);
          float rad = 0.3 + 0.3 * fract(h.x * 13.7);
          float ang = atan(dv.y, dv.x + 1e-4);
          float da = abs(mod(ang - h.y * 6.28 + 3.14159, 6.28318) - 3.14159);
          float notch = (1.0 - smoothstep(0.0, 0.14, da)) * step(0.08, rr);
          float disc = (1.0 - smoothstep(rad - 0.06, rad, rr)) * (1.0 - notch);
          pads = max(pads, on * disc);
          bloom = max(bloom, on * step(0.93, fract(h.x * 31.0)) * (1.0 - smoothstep(0.05, 0.09, rr)));
        }
      }
      pads *= smoothstep(0.5, 0.9, d);
    }
    vec3 padCol = mix(vec3(0.006, 0.011, 0.005), vec3(0.016, 0.02, 0.008), texture2D(uTex, p * 1.3).a);
    col = mix(col, padCol, pads * 0.9);
    col = mix(col, vec3(0.3, 0.25, 0.26), bloom * pads);
    alpha = max(alpha, pads * shore);

    // pale scum line at the water's edge
    float line = smoothstep(0.0, 0.05, d) * (1.0 - smoothstep(0.08, 0.2, d));
    float scumN = texture2D(uTex, p * 0.35).a;
    col = mix(col, vec3(0.22, 0.19, 0.17), line * smoothstep(0.35, 0.65, scumN) * 0.55);
    col += vec3(0.05, 0.045, 0.045) * ringShade * 0.3 * (1.0 - fres);

    alpha = max(alpha, weed * shore);
    gl_FragColor = vec4(col, alpha);
    vec3 preFog = gl_FragColor.rgb;
    #include <fog_fragment>
    // still water swallows some of the low mist that lies over the land, so it stays black under haze
    gl_FragColor.rgb = mix(gl_FragColor.rgb, preFog, 0.4 * (1.0 - smoothstep(40.0, 260.0, dist)) * (1.0 - uFen * 0.5));
  }`;

export async function build(ctx) {
  const { scene, terrain, palette, sky } = ctx;
  const rng = ctx.makeRng(7001);
  const tex = makeWaterTexture(rng, 256);
  const high = ctx.quality === 'high';
  const C = (h) => new THREE.Color(h);
  const meshes = [];
  const bodies = [];

  for (const [name, body] of Object.entries(ctx.water)) {
    const fen = name === 'fen';
    const geo = discGeometry(ctx, body, high ? (fen ? 150 : 130) : 90, high ? 260 : 180);
    const mat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
        uTex: { value: tex }, uTime: { value: 0 }, uFlicker: { value: 1 }, uFen: { value: fen ? 1 : 0 },
        uSunDir: { value: new THREE.Vector3(ctx.sun.dir.x, ctx.sun.dir.y, ctx.sun.dir.z) },
        uSunCore: { value: C(palette.sunCore) }, uSunLight: { value: C(palette.sunLight) },
        uHorizonSun: { value: C(palette.skyHorizonSun) }, uHorizonAway: { value: C(palette.skyHorizonAway) },
        uZenith: { value: C(palette.skyZenith) }, uWater: { value: C(palette.water) }, uWisp: { value: C(palette.wisp) },
        uRipples: { value: Array.from({ length: MAX_RIPPLES }, () => new THREE.Vector4(0, 0, -100, 0)) },
      }]),
      vertexShader: VERT, fragmentShader: FRAG,
      fog: true, transparent: true, depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(body.x, body.y, body.z);
    mesh.renderOrder = 10;
    mesh.name = 'water-' + name;
    scene.add(mesh);
    meshes.push(mesh);
    bodies.push({ body, mat, next: 1 + rng() * 3, slot: 0, rng: ctx.makeRng(7100 + (fen ? 1 : 0)) });
  }

  const flick = sky && sky.flicker ? sky.flicker : { value: 1 };
  ctx.registerUpdate((dt, t) => {
    for (const b of bodies) {
      const u = b.mat.uniforms;
      u.uTime.value = t; u.uFlicker.value = flick.value;
      b.next -= dt;
      if (b.next <= 0) {
        b.next = 2.5 + b.rng() * 6;
        const a = b.rng() * Math.PI * 2, r = Math.sqrt(b.rng()) * b.body.r * 0.8;
        u.uRipples.value[b.slot].set(b.body.x + Math.cos(a) * r, b.body.z + Math.sin(a) * r, t, 0.5 + b.rng() * 0.5);
        b.slot = (b.slot + 1) % MAX_RIPPLES;
      }
    }
  });

  // A tiny surface API for other modules (the level plus a faint swell).
  ctx.waterSurface = {
    heightAt(x, z, t = ctx.time.t) {
      const y = terrain.waterLevelAt(x, z);
      return y === null ? null : y + Math.sin(x * 0.11 + t * 0.31) * 0.01;
    },
    bodies: ctx.water,
  };
  ctx.log('water: 2 bodies');
}
