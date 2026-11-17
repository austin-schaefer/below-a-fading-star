// The Meridian Garth's views (v17-U2), written as views.json for tools/views.mjs: each stands on the hall's floor
// (placeAt with y) at a radius and bearing from the hall's middle (bearing 0 toward the west door, garth/plan.js)
// and looks at a bearing and radius. node tools/views-v17-garth.mjs > tools/views-v17-garth.json
import { at, FLOOR, CX, CZ } from '../src/v17/garth/plan.js';
const yawTo = (x, z, tx, tz) => -Math.atan2(tz - z, tx - x) - Math.PI / 2;
const V = (name, r, b, lr, lb, pitch = 0.04, extra = {}) => {
  const [x, z] = at(r, b), [tx, tz] = lr === null ? [CX, CZ] : at(lr, lb), yaw = +yawTo(x, z, tx, tz).toFixed(4);
  const js = `(() => { const fp = window.__fp, p = fp.player; fp.controls.placeAt(${x.toFixed(2)}, ${z.toFixed(2)}, ${FLOOR + 0.02}); p.yaw = ${yaw}; p.pitch = ${pitch}; p.vel?.set(0, 0, 0); fp.camera.position.copy(p.pos); })()`;
  return { name, x: +x.toFixed(2), z: +z.toFixed(2), yaw, pitch, js, pre: js, ...extra };
};
const views = [
  V('door', 18.6, 0, null, 0, 0.1),
  V('edge', 5.3, 0.55, 3.5, -2.2, -0.02),
  V('under-out', 0.6, Math.PI, 18, 0.0, 0.03),
  V('under-up', 1.2, Math.PI, 0.5, 0, 1.15),
  V('ring-side', 14.8, 1.9, 2, -0.6, 0.02),
];
console.log(JSON.stringify(views, null, 1));
