// Bloom's bright pass with a ceiling (v6-00). UnrealBloomPass's separable blur sets each mip's sigma equal to
// its kernel radius and stops at the radius, so its taps fall only to about 0.6 of the centre: in effect a box.
// Around ordinary highlights that reads as a glow, but one pixel far brighter than its neighbours (a tiny light
// at hundreds, or an Inf or NaN) comes out of the five mips as five nested soft-edged squares. Chrome's scene
// target tops out near 10 at the lanterns and the sun; on WebKit and Firefox some small lights go far past it,
// and the squares are what Austin sees there. The bright pass here drops NaN and Inf, floors at zero and scales
// any colour whose brightest channel is over the ceiling back down to it, keeping its hue, before the blur.
// ?bloomcap=<n> sets the ceiling (default 16, above anything the scene draws on desktop); ?bloomcap=0 is three's.
export const BLOOM_CAP = (() => {
  const v = parseFloat(new URL(location.href).searchParams.get('bloomcap'));
  return Number.isFinite(v) && v >= 0 ? v : 16;
})();

export function capBloom(bloom, cap = BLOOM_CAP) {
  if (!(cap > 0)) return bloom;
  const m = bloom.materialHighPassFilter;
  m.defines = { ...(m.defines || {}), BLOOM_CAP: cap.toFixed(4) };
  m.fragmentShader = /* glsl */`
    uniform sampler2D tDiffuse;
    uniform vec3 defaultColor;
    uniform float defaultOpacity;
    uniform float luminosityThreshold;
    uniform float smoothWidth;
    varying vec2 vUv;
    void main() {
      vec4 texel = texture2D( tDiffuse, vUv );
      vec3 c = texel.rgb;
      if ( any( isnan( c ) ) || any( isinf( c ) ) ) c = vec3( 0.0 );
      c = max( c, vec3( 0.0 ) );
      float peak = max( c.r, max( c.g, c.b ) );
      if ( peak > BLOOM_CAP ) c *= BLOOM_CAP / peak;
      float v = luminance( c );
      vec4 outputColor = vec4( defaultColor.rgb, defaultOpacity );
      float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v );
      gl_FragColor = mix( outputColor, vec4( c, texel.a ), alpha );
    }`;
  m.needsUpdate = true;
  return bloom;
}
