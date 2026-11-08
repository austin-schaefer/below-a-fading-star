// Point lights that only exist near you (v3 stage 2). three.js evaluates every visible PointLight in
// every lit fragment wherever it is, and recompiles every lit shader when the count changes. So after
// the modules build, each PointLight in the scene becomes a source: it moves to a layer the camera does
// not see (three skips lights on other layers), while its world matrix still updates, so parented lights
// such as the wagon lantern keep tracking, and its own `visible` stays the module's on/off. A fixed number of
// slot lights (?lights=, default 3) copy position, colour, intensity, distance and decay from the
// nearest live sources within their reach + 20 m each frame, intensity 0 when there are none. The light
// count never changes, so nothing recompiles. Modules keep animating their own light objects.
// ?lights=off leaves every light as it was.
import * as THREE from 'three';

const MARGIN = 20;
export const SOURCE_LAYER = 31; // never enabled on the camera

export function makeLightSlots(ctx, n) {
  const { scene, camera } = ctx;
  const sources = [];
  scene.traverse((o) => { if (o.isPointLight) sources.push(o); });
  for (const s of sources) s.layers.set(SOURCE_LAYER);
  const slots = [];
  for (let i = 0; i < n; i++) {
    const l = new THREE.PointLight(0xffffff, 0, 1, 2);
    l.name = `light-slot-${i}`;
    scene.add(l);
    slots.push(l);
  }
  // a source is live when it and every ancestor is visible (a hidden wagon hides its lantern)
  const live = (s) => {
    if (s.intensity <= 0) return false;
    for (let p = s; p; p = p.parent) if (!p.visible) return false;
    return true;
  };
  const wp = sources.map(() => new THREE.Vector3());
  const near = []; // indices of candidates, nearest first
  const dist = new Float32Array(sources.length);
  const nearest = (a, b) => dist[a] - dist[b];
  function update() {
    near.length = 0;
    const c = camera.position;
    for (let i = 0; i < sources.length; i++) {
      const s = sources[i];
      if (!live(s)) continue;
      s.updateWorldMatrix(true, false);
      wp[i].setFromMatrixPosition(s.matrixWorld);
      const d = wp[i].distanceTo(c);
      const reach = s.distance > 0 ? s.distance + MARGIN : Infinity;
      if (d > reach) continue;
      dist[i] = d;
      near.push(i);
    }
    near.sort(nearest);
    for (let k = 0; k < slots.length; k++) {
      const l = slots[k];
      if (k >= near.length) { l.intensity = 0; continue; }
      const s = sources[near[k]];
      l.position.copy(wp[near[k]]);
      l.color.copy(s.color); l.intensity = s.intensity; l.distance = s.distance; l.decay = s.decay;
    }
  }
  return { sources, slots, update, active: () => Math.min(near.length, slots.length) };
}
