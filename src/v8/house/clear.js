// v8-05: where the ground cover keeps off at the Pomegranate House (vegetation/ground.js asks, for ground cover only):
// the court, swept, except a ring round each pomegranate; and the trampled ground before the gate, its edge ragged.
// ?house=0: nowhere.
import { TAVERNA } from '../../structures/taverna.js';

const OFF = typeof location !== 'undefined' && new URLSearchParams(location.search).get('house') === '0';
export const BARE = { x: TAVERNA.x - 1.5, z: TAVERNA.z - TAVERNA.half - 4.0, rx: 10, rz: 4.6 };

export function houseClear(x, z) {
  if (OFF) return false;
  const dx = x - TAVERNA.x, dz = z - TAVERNA.z;
  if (Math.abs(dx) < 10 && Math.abs(dz) < 10) return !(Math.abs(Math.abs(dx) - 5.5) < 1.3 && Math.abs(Math.abs(dz) - 5.5) < 1.3);
  const e = Math.hypot((x - BARE.x) / BARE.rx, (z - BARE.z) / BARE.rz);
  if (e >= 1) return false;
  if (e < 0.7) return true;
  const h = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return (h - Math.floor(h)) < (1 - e) / 0.3 + 0.05;
}
