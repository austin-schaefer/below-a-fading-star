// Fog tiers (v4 systems, BI: the Recession of Ranges). The walls read as range behind range: on top of the
// ordinary distance fog, everything beyond the bowl's floor takes a step of extra haze by how far out from
// the bowl's centre it stands, toward the colour of the sky low in that direction. The front range and the
// floor get none, the main wall one step, the far ranges two, the farthest three, so each is paler than the
// one in front of it and the farthest is nearly the sky. The tiers go by world radius, not by distance from
// the eye, so the steps stay where the ranges are wherever you stand. atmosphere.js puts FOG_TIER_GLSL into
// every fogged material; fogTierAt() is the same sum in JS, for anything that wants to match it (a wonder
// on the wall choosing its own emissive, the map tool).
export const FOG_TIERS = [
  { name: 'front', r0: 0, r1: 0, amount: 0 },             // the floor and the front range: distance fog only
  { name: 'main', r0: 395, r1: 440, amount: 0.12 },       // the main wall and its crest
  { name: 'far', r0: 580, r1: 700, amount: 0.24 },        // the first far range (src/v4/mountains.js, tier 2)
  { name: 'farthest', r0: 1080, r1: 1200, amount: 0.22 }, // the last range (tier 3): nearly the sky
];
// Distance fog never goes past this, so the far ranges keep a little of their own shading under the tiers.
export const FOG_CAP = 0.62;

const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// Extra haze (0..1) at radius r from the bowl's centre: the sum of every tier's step that r has passed.
export function fogTierAmount(r) {
  let a = 0;
  for (let i = 1; i < FOG_TIERS.length; i++) a += FOG_TIERS[i].amount * ss(FOG_TIERS[i].r0, FOG_TIERS[i].r1, r);
  return a;
}
// Which tier a point stands in (0 front .. 3 farthest) and its extra haze.
export function fogTierAt(x, z, out = { tier: 0, amount: 0 }) {
  const r = Math.sqrt(x * x + z * z);
  let t = 0;
  for (let i = 1; i < FOG_TIERS.length; i++) if (r >= (FOG_TIERS[i].r0 + FOG_TIERS[i].r1) / 2) t = i;
  out.tier = t; out.amount = fogTierAmount(r);
  return out;
}

const f = (v) => v.toFixed(1);
export const FOG_TIER_GLSL = /* glsl */`
  float fpTierAmt(vec3 wp) {
    float r = length(wp.xz);
    return ${FOG_TIERS.slice(1).map((t) => `${t.amount.toFixed(3)} * smoothstep(${f(t.r0)}, ${f(t.r1)}, r)`).join(' + ')};
  }`;
