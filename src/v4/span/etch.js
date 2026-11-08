// The Span's etching (W: "the whole thing etched with the recursive triangular spirals at a scale readable
// from spawn"): each triangle holds three more. Chained onto a kit masonry material, on its steep faces only,
// in world space, so a fallen piece keeps the pattern it was cut with. A lattice of equilateral triangles of
// side S is cut as grooves; each upright triangle is split into four (three upright and the inverted middle)
// and the split is cut again inside the upright ones, three levels deep, the finest only near the eye. The
// grooves are antialiased and fade where they would be thinner than a pixel.
const GLSL = /* glsl */`
  float fpTriD(vec2 p, float s) { float h = s * 0.8660254; float a = p.y / h; float b = p.x / s - a * 0.5;
    vec3 f = abs(fract(vec3(a, b, a + b)) - 0.5); return (0.5 - max(f.x, max(f.y, f.z))) * h; }
  float fpTriUp(vec2 p, float s) { float h = s * 0.8660254; float a = p.y / h; float b = p.x / s - a * 0.5; return step(fract(a) + fract(b), 1.0); }
  float fpLine(float d, float w) { float aa = max(fwidth(d), 1e-3); return (1.0 - smoothstep(w - aa, w + aa, d)) * clamp(w / aa, 0.0, 1.0); }
  float fpEtch(vec2 p, float S, float dist) {
    float g = fpLine(fpTriD(p, S), S * 0.014);
    float k = fpTriUp(p, S);
    g = max(g, k * fpLine(fpTriD(p, S * 0.5), S * 0.010));
    k *= fpTriUp(p, S * 0.5);
    g = max(g, k * fpLine(fpTriD(p, S * 0.25), S * 0.007));
    k *= fpTriUp(p, S * 0.25);
    g = max(g, k * fpLine(fpTriD(p, S * 0.125), S * 0.005) * (1.0 - smoothstep(30.0, 60.0, dist)));
    return g;
  }
`;

// etch(mat, { size (m, the largest triangle's side), x0, y0 (the lattice's origin), amount (0..1) })
export function etch(mat, o = {}) {
  const u = { uEtchS: { value: o.size ?? 24 }, uEtchX: { value: o.x0 ?? 0 }, uEtchY: { value: o.y0 ?? 0 }, uEtchAmt: { value: o.amount ?? 0.55 } };
  const base = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    base(sh, r);
    Object.assign(sh.uniforms, u);
    sh.fragmentShader = sh.fragmentShader
      .replace('varying vec3 vCyW; varying vec3 vCyN;', `varying vec3 vCyW; varying vec3 vCyN;\nuniform float uEtchS, uEtchX, uEtchY, uEtchAmt;\n${GLSL}`)
      .replace('diffuseColor.rgb = cyC;', `{
          float eV = 1.0 - smoothstep(0.55, 0.85, abs(cyN.y));
          if (eV > 0.0) {
            vec2 ep = vec2((abs(cyN.z) > abs(cyN.x) ? cyP.x : cyP.z) - uEtchX, cyP.y - uEtchY);
            cyC *= 1.0 - fpEtch(ep, uEtchS, length(vViewPosition)) * uEtchAmt * eV;
          }
        }
        diffuseColor.rgb = cyC;`);
  };
  mat.customProgramCacheKey = () => 'fp-cyclopean-v1-etch';
  return u;
}
