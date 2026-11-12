// v8-07 where the salt lies, pure and computed once, so the ground cover can keep off it (vegetation/ground.js asks
// twkClear before twk.js is built). The pile: outside the Pomegranate House's gate, east of the spur and clear of the
// frontage. The spill: on the Salt-Pedlars' road P42 (the Saltings to the house), on the last dry, level stretch of the
// moor before the fen, coming from the house, the sack 1.5 m off the tread and its fan of salt across it; the Twk-men's
// heap 7 m nearer the house and 3.4 m off. ?twk=0 clears nothing.
import { tracks } from '../roads/place.js';
import { heightAt, waterLevelAt, slopeAt } from '../../terrain.js';
import { TAVERNA } from '../../structures/taverna.js';

const OFF = typeof location !== 'undefined' && new URL(location.href).searchParams.get('twk') === '0';
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export function pointOn(T, s, out = {}) {
  const P = T.pts;
  s = clamp(s, 0, P[P.length - 1].s);
  let j = 0; while (j < P.length - 2 && P[j + 1].s < s) j++;
  const a = P[j], b = P[j + 1], l = Math.max(1e-6, b.s - a.s), u = clamp((s - a.s) / l, 0, 1);
  const L = Math.sqrt((b.x - a.x) ** 2 + (b.z - a.z) ** 2) || 1;
  out.x = a.x + (b.x - a.x) * u; out.z = a.z + (b.z - a.z) * u; out.dx = (b.x - a.x) / L; out.dz = (b.z - a.z) / L;
  return out;
}
const dry = (x, z) => { const w = waterLevelAt(x, z); return w === null || heightAt(x, z) > w + 0.6; };

let plan = null;
export function saltPlan() {
  if (plan) return plan;
  const gate = { x: TAVERNA.x, z: TAVERNA.z - TAVERNA.half };
  plan = { gate, pile: { x: gate.x + 2.6, z: gate.z - 6.2 }, spill: null, cache: null, fan: null };
  const p42 = tracks().find((t) => t.id === 'P42');
  if (p42) {
    const L = p42.pts[p42.pts.length - 1].s, o = {};
    for (let f = 0.15; f < 0.9; f += 0.01) {
      pointOn(p42, L * f, o);
      const nx = -o.dz, nz = o.dx, sx = o.x + nx * 1.5, sz = o.z + nz * 1.5, c = pointOn(p42, L * f - 7, {});
      if (dry(sx, sz) && dry(o.x, o.z) && dry(c.x + nx * 3.4, c.z + nz * 3.4) && slopeAt(sx, sz) < 0.25 && slopeAt(c.x + nx * 3.4, c.z + nz * 3.4) < 0.3) {
        const yaw = Math.atan2(-nx, -nz) - Math.PI / 2;
        plan.spill = { x: sx, z: sz, yaw, s: L * f };
        plan.fan = { x: sx + Math.sin(yaw + Math.PI / 2) * 0.95, z: sz + Math.cos(yaw + Math.PI / 2) * 0.95 };
        plan.cache = { x: c.x + nx * 3.4, z: c.z + nz * 3.4 };
        break;
      }
    }
  }
  return plan;
}

// the ground cover keeps off the pile, the spill and the line of grains to the heap
export function twkClear(x, z) {
  if (OFF) return false;
  const P = saltPlan(), d2 = (p) => (x - p.x) ** 2 + (z - p.z) ** 2;
  if (d2(P.pile) < 2.2 * 2.2) return true;
  if (!P.spill) return false;
  if (d2(P.spill) < 1.4 * 1.4 || d2(P.fan) < 1.9 * 1.9 || d2(P.cache) < 0.9 * 0.9) return true;
  const ex = P.cache.x - P.fan.x, ez = P.cache.z - P.fan.z, l2 = ex * ex + ez * ez, t = clamp(((x - P.fan.x) * ex + (z - P.fan.z) * ez) / l2, 0, 1);
  return (x - P.fan.x - ex * t) ** 2 + (z - P.fan.z - ez * t) ** 2 < 0.7 * 0.7;
}
