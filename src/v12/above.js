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
// - (H5) Height over the ground (`over`): the eye over the terrain under it, wherever the feet are. On a top (the Span's
//   deck, the Diffident Stair's, a gallery) `alt` is a walker's but `over` is 56 to 135 m: the haze and the box's size
//   read it (the box at `over` less 30 m, never less than by `alt`), so the valley under a top is seen through thinner
//   air and has its shadows; throttling (main.js) still reads `alt`. It is eased (0.5 s), so a narrow deep gap crossed
//   on a bridge (the icefall's crevasse, the Span's crack) does not step the haze, the grade (post.js) or the box; a
//   jump of more than 3 m across the ground in a frame (a teleport, a render placed) takes the new height at once.
// - The haze: the distance fog (FogExp2) is the air near the ground; an eye high over it looks down through thinner
//   air, so its density is scaled by the mean of an exponential atmosphere (scale height 90 m) over `over` less 20 m.
//   The wall's cool air (atmosphere.js) eases off by the same scaled density, so the two always agree.
const STEPS = [[25, 95], [70, 140], [140, 200], [Infinity, 280]];
const HS = 90, FREE = 20, EASE = 0.5;

export function shadowFrame(ctx, url, light, sunDir, sb0, light0 = 260) {
  if (url.searchParams.get('above') === '0') return null;
  const cam = ctx.camera, T = ctx.terrain, fog = ctx.scene.fog, density0 = fog.density;
  const sc = light.shadow.camera, far0 = sc.far;
  let sb = sb0, lx = NaN, lz = NaN, lt = 0;
  const out = {
    alt: 0, over: 0, lightDist: light0, stepped: false,
    // main.js: true once after a step in size (move the light to the new centre now)
    take() { const s = out.stepped; out.stepped = false; return s; },
    frame(target, fwd) {
      const p = ctx.player;
      const ground = T.heightAt(cam.position.x, cam.position.z);
      const under = p.carried || !Number.isFinite(p.floorBelow) ? ground : p.floorBelow;
      const alt = out.alt = cam.position.y - under;
      // (H5) the air below: on a deck, a stair or a gallery the eye still looks down through the height to the ground
      const raw = cam.position.y - ground, now = performance.now(), cx = cam.position.x, cz = cam.position.z;
      const jx = cx - lx, jz = cz - lz, dt = Math.min(0.1, (now - lt) / 1000);
      out.over = !(jx * jx + jz * jz < 9) ? raw : out.over + (raw - out.over) * (1 - Math.exp(-dt / EASE));
      lx = cx; lz = cz; lt = now;
      const over = out.over;
      // the haze
      const a = over - FREE;
      fog.density = a > 1 ? density0 * Math.sqrt(HS * (1 - Math.exp(-a / HS)) / a) : density0;
      // the box: its size by the height, stepped (with 10 m of hysteresis going down); on a floor high over the ground a
      // step or two less than that height asks (the floor's own shadows stay fine: 0.14 m a texel on the Span's deck,
      // 0.2 m on the stair's), so the valley under a top has the sun's shadows
      const hb = Math.max(alt, over - 30);
      const up = STEPS.find(([h]) => hb < h)[1], down = STEPS.find(([h]) => hb + 10 < h)[1];
      const want = up > sb ? up : down < sb ? down : sb;
      if (want === sb0 && sb === sb0) return sb; // at walking height: exactly as before
      if (want !== sb) {
        sb = want;
        sc.left = -sb; sc.right = sb; sc.top = sb; sc.bottom = -sb;
        out.lightDist = light0 + (sb - sb0) * 1.4;
        sc.far = far0 + (sb - sb0) * 2.8;
        sc.updateProjectionMatrix();
        ctx.renderer.shadowMap.needsUpdate = true;
        out.stepped = true;
      }
      if (sb === sb0) return sb;
      // toward where the view's centre line meets the ground, the eye kept well inside; snapped to a fifth of the box
      const pitch = p.pitch, lead = sb - 60;
      const d = pitch < -0.05 ? Math.min(lead, Math.max(40, over / Math.tan(-pitch))) : lead;
      const g = sb * 0.2;
      const tx = Math.round((cam.position.x + fwd.x * d) / g) * g, tz = Math.round((cam.position.z + fwd.z * d) / g) * g;
      target.set(tx, T.heightAt(tx, tz), tz);
      return sb;
    },
  };
  return out;
}
