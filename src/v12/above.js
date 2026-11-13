// The view from above (v12 H0, part 4): what the engine assumed about an eye near the ground, made to hold for an
// eye high over it. Called once a frame from main.js's frame loop, before the shadow box is snapped.
// - The sun's shadow box: within 25 m of the ground it is as it always was (±95 m about a point 40 m ahead of the
//   eye). Higher, it sits on the ground the eye looks at (where the view's centre line meets the ground, at most a
//   box and a half out) and grows in steps with the height (140, 200, 280 m half-size), the light set back and its
//   depth deepened to match, so the ground 100 m and more below keeps its long shadows. The map's size is the tier's:
//   a bigger box is coarser texels, which from that height is what the eye resolves anyway. Each step change is one
//   redraw. ?above=0 keeps the old box and haze (for a before/after and the perf comparison).
// - The haze: the distance fog (FogExp2) is the air near the ground; an eye high over it looks down through thinner
//   air, so its density is scaled by the mean of an exponential atmosphere (scale height 90 m) over the eye's height
//   above the ground under it, less the first 20 m. At walking height (and on the Span's deck, 56 m over the floor,
//   at about 0.83) the change is nothing or small.
// The wall's cool air (atmosphere.js) eases off for a high eye in its own shader by cameraPosition.y.
const STEPS = [[25, 95], [70, 140], [140, 200], [Infinity, 280]];
const HS = 90, FREE = 20;

export function shadowFrame(ctx, url, light, sunDir, sb0) {
  if (url.searchParams.get('above') === '0') return null;
  const cam = ctx.camera, T = ctx.terrain, fog = ctx.scene.fog, density0 = fog.density;
  const sc = light.shadow.camera, far0 = sc.far;
  let sb = sb0;
  const out = {
    alt: 0, lightDist: 260,
    frame(target, fwd) {
      const g = T.heightAt(cam.position.x, cam.position.z);
      const alt = out.alt = cam.position.y - g;
      // the haze
      const a = alt - FREE;
      fog.density = a > 1 ? density0 * Math.sqrt(HS * (1 - Math.exp(-a / HS)) / a) : density0;
      // the box: its size by the height, stepped (with 10 m of hysteresis going down)
      const up = STEPS.find(([h]) => alt < h)[1], down = STEPS.find(([h]) => alt + 10 < h)[1];
      const want = up > sb ? up : down < sb ? down : sb;
      if (alt < 25 && sb === sb0) return sb; // at walking height: exactly as before
      if (want !== sb) {
        sb = want;
        sc.left = -sb; sc.right = sb; sc.top = sb; sc.bottom = -sb;
        out.lightDist = 260 + (sb - sb0) * 1.4;
        sc.far = far0 + (sb - sb0) * 2.8;
        sc.updateProjectionMatrix();
        ctx.renderer.shadowMap.needsUpdate = true;
      }
      if (sb === sb0) return sb;
      // where the view's centre line meets the ground (the ground under the eye, as a plane), at most 1.5 boxes out
      const p = ctx.player.pitch;
      const d = p < -0.05 ? Math.min(sb * 1.5, Math.max(40, alt / Math.tan(-p))) : sb * 1.2;
      const tx = cam.position.x + fwd.x * d, tz = cam.position.z + fwd.z * d;
      target.set(tx, T.heightAt(tx, tz), tz);
      return sb;
    },
  };
  return out;
}
