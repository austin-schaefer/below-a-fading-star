// CX The Toadstone's forms: a fat toad 0.16 m long, squat and warty, dark olive-brown, sitting, with a red stone set in
// its forehead like a cabochon (a smooth dome 1.4 cm across, deep red #7a0e1c, a sharp highlight), on a wet patch of its
// ledge 0.6 m across (darker and glossy, its edge soft). One mesh, one material (vertex colours with alpha, roughness by
// vertex, the stone's glow as emissive), and one point sprite for the glow 0.12 m across. It never moves: no breath, no
// turn (Austin dropped the turning). The glow reads the sky's flicker uniform: 0.8 x (1 - flicker)^1.5, warm red, no light.
import * as THREE from 'three';

export const TOAD = { length: 0.16, gem: 0.014, patch: 0.6, sprite: 0.12, gemColor: '#7a0e1c', glowColor: '#ff3a1e', glowK: 0.8 };
export const glowAt = (flicker) => TOAD.glowK * Math.pow(Math.max(0, 1 - Math.min(1, flicker)), 1.5);

const hash3 = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };

// local frame: +x forward (the head), +y up, +z to its left; origin on the ground under its middle
function toadParts(low) {
  const parts = [];
  const add = (geo, color, rough, gem = 0) => parts.push({ geo, color, rough, gem });
  const olive = new THREE.Color('#4a4528'), belly = new THREE.Color('#62573a'), dark = new THREE.Color('#2a281c');
  // the body: a squat sphere, high at the shoulders (it sits up on its front legs), flat beneath, warty on top
  const body = new THREE.IcosahedronGeometry(1, low ? 3 : 5);
  const p = body.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const fx = v.x, top = Math.max(0, v.y);
    let x = fx * 0.072, z = v.z * 0.058, y = v.y * (0.036 + 0.012 * (fx + 1) * 0.5);
    y = Math.max(y, -0.012) + 0.018 + 0.008 * fx;            // flat beneath, sitting up at the front
    if (fx > 0.45) { x += (fx - 0.45) * 0.006; y -= (fx - 0.45) * 0.01; } // the blunt snout
    // warts: small round bumps over the back and flanks, none on the snout or beneath
    const w = hash3(Math.round(v.x * 9), Math.round(v.y * 9), Math.round(v.z * 9));
    const cx = Math.round(v.x * 9) / 9, cy = Math.round(v.y * 9) / 9, cz = Math.round(v.z * 9) / 9;
    const dd = Math.hypot(v.x - cx, v.y - cy, v.z - cz);
    const wart = w > 0.45 ? Math.max(0, 1 - dd * 16) * (0.0025 + 0.002 * w) * top * (fx < 0.6 ? 1 : 0) : 0;
    const len = Math.hypot(x, y - 0.02, z) || 1;
    x += (x / len) * wart; y += ((y - 0.02) / len) * wart; z += (z / len) * wart;
    p.setXYZ(i, x, y, z);
  }
  body.computeVertexNormals();
  add(body, olive, 0.42);
  // the body's top at (x, z), for seating the ridges and the stone on it
  const topAt = (x, z) => { let y = 0; for (let i = 0; i < p.count; i++) if (Math.hypot(p.getX(i) - x, p.getZ(i) - z) < 0.009) y = Math.max(y, p.getY(i)); return y; };
  // the haunches folded at its sides, the front legs, the eye ridges (no eye, no mouth: the form only)
  const blob = (sx, sy, sz, x, y, z, col, r = 0.55) => { const g = new THREE.SphereGeometry(1, low ? 7 : 9, low ? 5 : 6); g.scale(sx, sy, sz); g.translate(x, y, z); add(g, col, r); };
  for (const s of [1, -1]) {
    blob(0.042, 0.026, 0.024, -0.03, 0.022, s * 0.05, olive);         // haunch
    blob(0.024, 0.01, 0.018, 0.0, 0.006, s * 0.068, dark);            // the hind foot tucked under it
    blob(0.011, 0.024, 0.011, 0.046, 0.018, s * 0.034, belly);        // front leg
    blob(0.016, 0.006, 0.014, 0.054, 0.004, s * 0.038, dark);         // its foot
    blob(0.013, 0.01, 0.011, 0.05, topAt(0.05, s * 0.022) - 0.002, s * 0.022, dark, 0.35); // eye ridge
  }
  // the stone in its forehead: a smooth dome 1.4 cm across between the ridges, set a little into the skin
  const gem = new THREE.SphereGeometry(TOAD.gem / 2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  gem.scale(1, 0.6, 1);
  const tilt = new THREE.Matrix4().makeRotationZ(-0.45); // facing up and forward
  const gemAt = [0.056, topAt(0.056, 0) - 0.0015, 0];
  gem.applyMatrix4(tilt); gem.translate(gemAt[0], gemAt[1], gemAt[2]);
  add(gem, new THREE.Color(TOAD.gemColor), 0.08, 1);
  parts.gemAt = gemAt;
  return parts;
}

// the wet patch: a disc draped on the drawn ground, darkening it, glossy, soft at the edge
function patchGeometry(heightAt, cx, cz, groundY, low) {
  const rings = low ? 6 : 9, segs = low ? 18 : 28, R = TOAD.patch / 2;
  const pos = [], col = [], idx = [];
  const put = (x, z, a) => { pos.push(x, heightAt(cx + x, cz + z) - groundY + 0.006, z); col.push(0.03, 0.028, 0.024, a); };
  put(0, 0, 0.78);
  for (let r = 1; r <= rings; r++) for (let s = 0; s < segs; s++) {
    const a = (s / segs) * Math.PI * 2, rr = R * (r / rings) * (1 + 0.12 * Math.sin(a * 3 + 1.1) + 0.06 * Math.sin(a * 7));
    const t = r / rings;
    put(Math.cos(a) * rr, Math.sin(a) * rr, 0.78 * (1 - t * t * (3 - 2 * t)));
  }
  const at = (r, s) => (r === 0 ? 0 : 1 + (r - 1) * segs + (s % segs));
  for (let s = 0; s < segs; s++) idx.push(0, at(1, s + 1), at(1, s));
  for (let r = 1; r < rings; r++) for (let s = 0; s < segs; s++) idx.push(at(r, s), at(r, s + 1), at(r + 1, s), at(r, s + 1), at(r + 1, s + 1), at(r + 1, s));
  return { pos, col, idx };
}

export function buildToad(ctx, spot, heightAt, low) {
  const parts = toadParts(low);
  const patch = patchGeometry(heightAt, spot.x, spot.z, spot.y, low);
  // merge: the toad's parts turned to its heading, then the patch (in world axes about the spot)
  const c = Math.cos(spot.yaw), s = Math.sin(spot.yaw);
  const P = [], N = [], C = [], R = [], G = [], I = [];
  for (const part of parts) {
    const g = part.geo.index ? part.geo.toNonIndexed() : part.geo;
    const pp = g.attributes.position, nn = g.attributes.normal, base = P.length / 3;
    for (let i = 0; i < pp.count; i++) {
      const x = pp.getX(i), y = pp.getY(i), z = pp.getZ(i), nx = nn.getX(i), ny = nn.getY(i), nz = nn.getZ(i);
      // local +x forward -> world heading yaw (x' = x c + z s, z' = -x s + z c)
      P.push(x * c + z * s, y + spot.lift, -x * s + z * c);
      N.push(nx * c + nz * s, ny, -nx * s + nz * c);
      C.push(part.color.r, part.color.g, part.color.b, 1); R.push(part.rough); G.push(part.gem);
      I.push(base + i);
    }
  }
  const base = P.length / 3;
  for (let i = 0; i < patch.pos.length / 3; i++) {
    P.push(patch.pos[i * 3], patch.pos[i * 3 + 1], patch.pos[i * 3 + 2]); N.push(0, 1, 0);
    C.push(patch.col[i * 4], patch.col[i * 4 + 1], patch.col[i * 4 + 2], patch.col[i * 4 + 3]); R.push(0.12); G.push(0);
  }
  for (const k of patch.idx) I.push(base + k);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(C, 4));
  geo.setAttribute('aRough', new THREE.Float32BufferAttribute(R, 1));
  geo.setAttribute('aGem', new THREE.Float32BufferAttribute(G, 1));
  geo.setIndex(I);
  geo.computeBoundingSphere();

  const flicker = ctx.sky?.flicker || { value: 1 };
  const uGlowCol = { value: new THREE.Color(TOAD.glowColor) };
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, roughness: 0.5, metalness: 0 });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uFlicker = flicker; sh.uniforms.uGlowCol = uGlowCol;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aRough; attribute float aGem; varying float vRough; varying float vGem;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRough = aRough; vGem = aGem;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uFlicker; uniform vec3 uGlowCol; varying float vRough; varying float vGem;')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = vRough;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += uGlowCol * vGem * ${TOAD.glowK.toFixed(2)} * pow(max(0.0, 1.0 - min(uFlicker, 1.0)), 1.5) * 2.2;`);
  };
  mat.customProgramCacheKey = () => 'fp-canyon-toad';
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(spot.x, spot.y, spot.z);
  mesh.name = 'living-canyon-toad';
  mesh.renderOrder = 3;

  // the glow: one point sprite over the stone, sized in metres, additive
  const ga = parts.gemAt, gemLocal = new THREE.Vector3(ga[0] * c, ga[1] + 0.006 + spot.lift, -ga[0] * s);
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.Float32BufferAttribute([gemLocal.x, gemLocal.y, gemLocal.z], 3));
  pg.boundingSphere = new THREE.Sphere(gemLocal.clone(), 0.2);
  const pm = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uSize: { value: TOAD.sprite }, uScale: { value: 360 } }]),
    vertexShader: /* glsl */`
      uniform float uSize, uScale, uFlicker; varying float vG;
      #include <fog_pars_vertex>
      void main() {
        vec3 transformed = position;
        vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
        vG = ${TOAD.glowK.toFixed(2)} * pow(max(0.0, 1.0 - min(uFlicker, 1.0)), 1.5);
        gl_PointSize = max(2.0, uSize * uScale / max(-mvPosition.z, 0.05)) * step(0.002, vG);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uGlowCol; varying float vG;
      #include <fog_pars_fragment>
      void main() {
        float r = length(gl_PointCoord - 0.5) * 2.0;
        float a = exp(-r * r * 6.0) * (1.0 - smoothstep(0.75, 1.0, r)) * vG;
        if (a < 0.003) discard;
        gl_FragColor = vec4(uGlowCol * a, 1.0);
        vec3 fpRaw = gl_FragColor.rgb;
        #include <fog_fragment>
        gl_FragColor.rgb = min(gl_FragColor.rgb, fpRaw); // additive: the haze may dim it, never add to it
      }`,
    fog: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  pm.uniforms.uFlicker = flicker; pm.uniforms.uGlowCol = uGlowCol;
  const glow = new THREE.Points(pg, pm);
  glow.position.copy(mesh.position);
  glow.name = 'living-canyon-toadglow';
  glow.renderOrder = 14;
  return { mesh, glow, gemWorld: gemLocal.clone().add(mesh.position), tris: geo.index.count / 3, uScale: pm.uniforms.uScale };
}
