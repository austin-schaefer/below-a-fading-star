// The view from above (v12 H0, part 4): what the engine assumed about an eye near the ground, made to hold for an
// eye high over it. Called once a frame from main.js's frame loop, before the shadow box is snapped.
// - The height that counts (`alt`): the eye over the floor under the walker's feet (player.floorBelow: the ground, a
//   deck, a stair, a stacked floor) while they walk, hop or fall; over the terrain only while carried (a lift, a seat,
//   a render held in the air). So on the Great Span's deck, 56 m over the valley, the walker is at walking height and
//   everything here is exactly as on the ground; a climb on foot keeps the box about the climber.
// - The sun's shadow box: under 25 m, as it always was (±95 m about a point 40 m ahead of the eye). Higher, it grows in
//   steps with the height (140, 200, 280 m half-size), the light set back and its depth deepened to match, and its
//   centre goes out toward the ground the eye looks at, but never more than the box less 60 m from the eye, so the eye's
//   own surroundings are always in it. The centre is snapped to a world grid a fifth of the box wide, so turning in
//   place does not move it (and redraw the map) until the look has swept that far over the ground. A step in size
//   moves the light at once (main.js reads `stepped`) and redraws once. ?above=0 keeps the old box and haze.
// - The haze: the distance fog (FogExp2) is the air near the ground; an eye high over it looks down through thinner
//   air, so its density is scaled by the mean of an exponential atmosphere (scale height 90 m) over `alt` less 20 m.
//   The wall's cool air (atmosphere.js) eases off by the same scaled density, so the two always agree.
const STEPS = [[25, 95], [70, 140], [140, 200], [Infinity, 280]];
const HS = 90, FREE = 20;

export function shadowFrame(ctx, url, light, sunDir, sb0) {
  if (url.searchParams.get('above') === '0') return null;
  const cam = ctx.camera, T = ctx.terrain, fog = ctx.scene.fog, density0 = fog.density;
  const sc = light.shadow.camera, far0 = sc.far;
  let sb = sb0;
  const out = {
    alt: 0, lightDist: 260, stepped: false,
    // main.js: true once after a step in size (move the light to the new centre now)
    take() { const s = out.stepped; out.stepped = false; return s; },
    frame(target, fwd) {
      const p = ctx.player;
      const under = p.carried || !Number.isFinite(p.floorBelow) ? T.heightAt(cam.position.x, cam.position.z) : p.floorBelow;
      const alt = out.alt = cam.position.y - under;
      // the haze
      const a = alt - FREE;
      fog.density = a > 1 ? density0 * Math.sqrt(HS * (1 - Math.exp(-a / HS)) / a) : density0;
      // the box: its size by the height, stepped (with 10 m of hysteresis going down)
      const up = STEPS.find(([h]) => alt < h)[1], down = STEPS.find(([h]) => alt + 10 < h)[1];
      const want = up > sb ? up : down < sb ? down : sb;
      if (want === sb0 && sb === sb0) return sb; // at walking height: exactly as before
      if (want !== sb) {
        sb = want;
        sc.left = -sb; sc.right = sb; sc.top = sb; sc.bottom = -sb;
        out.lightDist = 260 + (sb - sb0) * 1.4;
        sc.far = far0 + (sb - sb0) * 2.8;
        sc.updateProjectionMatrix();
        ctx.renderer.shadowMap.needsUpdate = true;
        out.stepped = true;
      }
      if (sb === sb0) return sb;
      // toward where the view's centre line meets the ground, the eye kept well inside; snapped to a fifth of the box
      const pitch = p.pitch, lead = sb - 60;
      const d = pitch < -0.05 ? Math.min(lead, Math.max(40, alt / Math.tan(-pitch))) : lead;
      const g = sb * 0.2;
      const tx = Math.round((cam.position.x + fwd.x * d) / g) * g, tz = Math.round((cam.position.z + fwd.z * d) / g) * g;
      target.set(tx, T.heightAt(tx, tz), tz);
      return sb;
    },
  };
  return out;
}
