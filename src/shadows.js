// Shadow cadence (v3 stage 2). The sun never moves and most casters never move, so the shadow map is not
// redrawn every frame (renderer.shadowMap.autoUpdate off). It is redrawn when
// - the shadow camera's (texel-snapped) centre has moved more than 3 m: walking, or turning, since the
//   centre sits 40 m ahead of you; the light only moves on a redraw, so the old map stays right meanwhile;
// - 1/shadowhz seconds have passed (?shadowhz=, default 2; 0 redraws every frame, the old behaviour);
// - a dynamic caster within 40 m of you has moved more than one shadow-map texel (4.6 cm at q=high, 9.3 at
//   low) since the last redraw: then at once, so no creature's shadow ever lags its feet by more than a
//   texel; a grazer ambling at 0.75 m/s redraws ~16 times a second at high, a fleeing one every frame;
// - a near caster has only turned or changed pose, at up to ?shadowdyn= per second (default 15; 0 = every
//   frame). Dynamic casters are the shadow-casting meshes of the fauna and inhabitants2 modules (creatures,
//   the traveller and his wagon, the galley, the guest) and the vertex-animated banners.
// Beyond 40 m a dynamic caster stops casting (?shadowcull=0 keeps them), so a creature's shadow never
// steps at the slow clock. What a module writes to castShadow is kept and still obeyed within 40 m.
import * as THREE from 'three';

const NEAR = 40, MOVE = 3;

export function makeShadowCadence(ctx, url, texel = 0.05) {
  const { renderer, camera } = ctx;
  const num = (k, d) => { const v = url.searchParams.get(k); return v != null && isFinite(+v) ? +v : d; };
  const hz = num('shadowhz', 2), dynHz = num('shadowdyn', 15), cull = url.searchParams.get('shadowcull') !== '0';
  const every = !(hz > 0);
  renderer.shadowMap.autoUpdate = every;
  renderer.shadowMap.needsUpdate = true;

  // casters: { o, want(), near (this frame), banner points }
  const casters = [];
  const mods = ctx.perf._mods;
  const roots = [];
  for (const name of ['fauna', 'inhabitants2']) for (const o of mods?.get(name)?.objects || []) roots.push(o);
  const seen = new Set();
  for (const r of roots) r.traverse((o) => {
    if (!o.isMesh || seen.has(o)) return;
    seen.add(o);
    let want = o.castShadow;
    const c = { o, want: () => want, far: false, points: null, drawn: null };
    // castShadow reads what the module asked for, unless the caster is beyond 40 m
    Object.defineProperty(o, 'castShadow', { configurable: true, get: () => want && !c.far, set: (v) => { want = v; } });
    casters.push(c);
  });
  // the banners animate in the vertex shader: always moving, located by their vertices (10 m cells)
  const banners = ctx.scene.getObjectByName('structures-banners');
  if (banners) {
    const pos = banners.geometry.attributes.position, cells = new Map(), v = new THREE.Vector3();
    banners.updateWorldMatrix(true, false);
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(banners.matrixWorld);
      const k = `${Math.round(v.x / 10)},${Math.round(v.z / 10)}`;
      if (!cells.has(k)) cells.set(k, v.clone());
    }
    casters.push({ o: banners, want: () => banners.castShadow, far: false, points: [...cells.values()], always: true });
  }

  const p = new THREE.Vector3(), last = new THREE.Vector3(Infinity, 0, 0);
  let since = Infinity, sig = 0, maxMove = 0;
  let T2 = texel * texel;
  const stats = { redraws: 0, dynamic: 0, casters: casters.length, near: 0 };
  // a cheap signature of every near caster's placement; it changes when one moves, turns or shows/hides
  function scan() {
    const c0 = camera.position;
    let s = 0, near = 0, always = false;
    maxMove = 0;
    for (const c of casters) {
      const o = c.o;
      if (c.points) {
        let d = Infinity; for (const q of c.points) d = Math.min(d, q.distanceTo(c0));
        if (d < NEAR && c.want() && o.visible) { always = true; near++; }
        continue;
      }
      let d = Infinity, h = 0;
      const e = o.matrixWorld.elements;
      if (o.isInstancedMesh) {
        const a = o.instanceMatrix.array, dr = (c.drawn ||= new Float32Array(o.instanceMatrix.count * 3));
        for (let i = 0; i < o.count; i++) {
          const k = i * 16;
          p.set(a[k + 12], a[k + 13], a[k + 14]).applyMatrix4(o.matrixWorld);
          const di = p.distanceTo(c0);
          if (di < d) d = di;
          if (di < NEAR) {
            h += p.x + 3 * p.y + 7 * p.z + 11 * a[k] + 13 * a[k + 2] + 17 * a[k + 5];
            const m2 = (p.x - dr[i * 3]) ** 2 + (p.y - dr[i * 3 + 1]) ** 2 + (p.z - dr[i * 3 + 2]) ** 2;
            if (m2 > maxMove && c.want() && o.visible) maxMove = m2;
          }
        }
      } else {
        p.set(e[12], e[13], e[14]);
        d = p.distanceTo(c0);
        h = p.x + 3 * p.y + 7 * p.z + 11 * e[0] + 13 * e[2] + 17 * e[5];
        const dr = (c.drawn ||= new Float32Array(3));
        const m2 = (p.x - dr[0]) ** 2 + (p.y - dr[1]) ** 2 + (p.z - dr[2]) ** 2;
        if (d < NEAR && m2 > maxMove && c.want() && o.visible) maxMove = m2;
      }
      c.far = cull && d > NEAR;
      if (d < NEAR) { near++; if (c.want()) s += h + 19 * (o.visible ? 1 : 0); else s += 23; }
    }
    stats.near = near;
    const moved = always || s !== sig;
    sig = s;
    return moved;
  }

  // remember where every caster was when the map was drawn
  function stamp() {
    for (const c of casters) {
      if (c.points || !c.drawn) continue;
      const o = c.o;
      if (o.isInstancedMesh) {
        const a = o.instanceMatrix.array;
        for (let i = 0; i < o.count; i++) { const k = i * 16; p.set(a[k + 12], a[k + 13], a[k + 14]).applyMatrix4(o.matrixWorld); c.drawn[i * 3] = p.x; c.drawn[i * 3 + 1] = p.y; c.drawn[i * 3 + 2] = p.z; }
      } else { const e = o.matrixWorld.elements; c.drawn[0] = e[12]; c.drawn[1] = e[13]; c.drawn[2] = e[14]; }
    }
  }
  function update(dt, target) {
    since += dt;
    const dyn = scan();
    if (every) return true;
    const moved = target.distanceToSquared(last) > MOVE * MOVE;
    const dynDue = (dyn && (!(dynHz > 0) || since >= 1 / dynHz - 1e-4)) || maxMove > T2;
    if (moved || since >= 1 / hz || dynDue) {
      renderer.shadowMap.needsUpdate = true;
      since = 0; last.copy(target); stamp();
      stats.redraws++; if (dynDue && !moved) stats.dynamic++;
      return true;
    }
    return false;
  }
  const settings = { hz, dynHz, cull, every, texel };
  const setTexel = (t) => { settings.texel = t; T2 = t * t; }; // the tier's shadow map changed size
  return { update, stats, casters, settings, setTexel };
}
