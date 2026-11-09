// Bloom without squares (v6-00, v6.2). Three things in UnrealBloomPass turn a small or thin bright thing into
// soft-edged squares, and this module replaces each:
//
// - The blur (v6.2). Each mip's separable blur sets sigma equal to its kernel radius and stops at the radius, so
//   its taps fall only to about 0.6 of the centre: in effect a box, 5 to 21 texels wide. Anything much brighter
//   than its surroundings comes out of the five mips as nested boxes, whatever its absolute brightness: a water
//   glint at 5 against ground at 0.3 is as square as a light at 500. Here every mip's blur is a true Gaussian with
//   the old kernel's variance (sigma 1.36, 2.45, 3.53, 4.62, 5.70 texels, so the glow reaches as far as before),
//   its taps running to 3 sigma, where it is 1% of the centre; the shader is three's, normalised by its weight
//   sum. ?bloomkernel=box is three's kernel.
// - The bright pass's sampling (v6.2). The bright pass draws at a quarter of the render per axis and read the
//   scene with one bilinear tap per texel, which sees 2×2 of the 4×4 pixels under it. A line one pixel wide (a
//   rivulet's glint, a chain's edge) came out as a dotted line of isolated bright texels, a row of boxes after
//   the blur, and the dots crawl as the camera moves. Here four bilinear taps cover the whole 4×4 footprint (2×2
//   at ?bloomres=1), so a thin line enters the blur as a line. ?bloomprefilter=0 is the one tap.
// - The ceiling (v6-00). One pixel far brighter than its neighbours (a tiny light at hundreds, or an Inf or NaN,
//   as WebKit and Firefox drew some small lights) is dropped if not finite, floored at zero and scaled back to the
//   ceiling by its brightest channel, keeping its hue, before the threshold. ?bloomcap=<n> sets it (default 16);
//   ?bloomcap=0 is three's bright pass entirely (no ceiling, one tap).
const params = new URL(location.href).searchParams;
export const BLOOM_CAP = (() => {
  const v = parseFloat(params.get('bloomcap'));
  return Number.isFinite(v) && v >= 0 ? v : 16;
})();
export const BLOOM_KERNEL = params.get('bloomkernel') === 'box' ? 'box' : 'gauss';
export const BLOOM_PREFILTER = params.get('bloomprefilter') !== '0';

// the old kernel's taps run over -(R-1)..R-1 with weights exp(-i²/2R²); its standard deviation in texels
export function boxSigma(R) {
  let s = 0, v = 0;
  for (let i = 1 - R; i < R; i++) { const w = Math.exp(-0.5 * i * i / (R * R)); s += w; v += w * i * i; }
  return Math.sqrt(v / s);
}
// a Gaussian with that sigma: the centre and one side's taps out to 3 sigma (three's shader mirrors them)
export function gaussTaps(R) {
  const sigma = boxSigma(R), n = Math.ceil(3 * sigma) + 1, w = [];
  for (let i = 0; i < n; i++) w.push(Math.exp(-0.5 * i * i / (sigma * sigma)));
  return w;
}

export function gaussBloom(bloom) {
  if (BLOOM_KERNEL === 'box') return bloom;
  for (const m of bloom.separableBlurMaterials) {
    const R = m.defines.KERNEL_RADIUS;
    const w = gaussTaps(R);
    m.defines = { ...m.defines, KERNEL_RADIUS: w.length };
    m.uniforms.gaussianCoefficients.value = w;
    m.needsUpdate = true;
  }
  return bloom;
}

export function capBloom(bloom, cap = BLOOM_CAP) {
  gaussBloom(bloom);
  if (!(cap > 0)) return bloom;
  const m = bloom.materialHighPassFilter;
  m.defines = { ...(m.defines || {}), BLOOM_CAP: cap.toFixed(4) };
  if (BLOOM_PREFILTER) m.defines.BLOOM_PREFILTER = 1;
  m.fragmentShader = /* glsl */`
    uniform sampler2D tDiffuse;
    uniform vec3 defaultColor;
    uniform float defaultOpacity;
    uniform float luminosityThreshold;
    uniform float smoothWidth;
    varying vec2 vUv;
    vec3 tap( vec2 uv ) {
      vec3 c = texture2D( tDiffuse, uv ).rgb;
      if ( any( isnan( c ) ) || any( isinf( c ) ) ) c = vec3( 0.0 );
      c = max( c, vec3( 0.0 ) );
      float peak = max( c.r, max( c.g, c.b ) );
      if ( peak > BLOOM_CAP ) c *= BLOOM_CAP / peak;
      return c;
    }
    void main() {
      #ifdef BLOOM_PREFILTER
        // a quarter of this target's texel either way: four bilinear taps tile the source footprint exactly
        // (4×4 scene pixels per texel at bloomres 0.5, 2×2 at 1)
        vec2 d = 0.25 * vec2( dFdx( vUv.x ), dFdy( vUv.y ) );
        vec3 c = 0.25 * ( tap( vUv + vec2( -d.x, -d.y ) ) + tap( vUv + vec2( d.x, -d.y ) ) + tap( vUv + vec2( -d.x, d.y ) ) + tap( vUv + vec2( d.x, d.y ) ) );
      #else
        vec3 c = tap( vUv );
      #endif
      float v = luminance( c );
      vec4 outputColor = vec4( defaultColor.rgb, defaultOpacity );
      float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v );
      gl_FragColor = mix( outputColor, vec4( c, 1.0 ), alpha );
    }`;
  m.needsUpdate = true;
  return bloom;
}
