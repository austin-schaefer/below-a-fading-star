// BG, the Postern (v4): a door of human size in the foot of the Great Span's shut west gate, ajar; plainly made
// later and smaller by someone else. One familiar measure, and everything above it jumps in size.
import * as THREE from 'three';
import { SPAN } from './plan.js';
import { box } from './geo.js';

const Y = SPAN.deckY, Z = SPAN.z, Z0 = SPAN.z0, Z1 = SPAN.z1;

export function buildPostern(K) {
  const { metals, posterns, paint } = K;
  // ---------------------------------------------------------------- BG, the Postern
  // A door of human size in the foot of the west gate, ajar; its surround of small dressed stones set in the
  // great leaf by someone later and smaller. Behind it, dark.
  {
    const x = -SPAN.gateX, sill = Y + 0.25, z0 = 211.45, z1 = 212.55, y1 = sill + 2.3, t = 0.3;
    posterns.push(box(x + 0.0, x + 0.28, sill, y1 + t, z0 - t, z0), box(x + 0.0, x + 0.28, sill, y1 + t, z1, z1 + t));
    posterns.push(box(x + 0.0, x + 0.32, y1, y1 + t + 0.08, z0 - t - 0.05, z1 + t + 0.05));
    posterns.push(box(x - 0.2, x + 0.38, sill - 0.12, sill + 0.06, z0 - 0.1, z1 + 0.1)); // its own worn step
    // the opening's reveal through the leaf, lined with the same stone
    posterns.push(box(x - 2, x, sill, y1, z0, z0 + 0.06), box(x - 2, x, sill, y1, z1 - 0.06, z1), box(x - 2, x, y1 - 0.06, y1, z0, z1));
    // the leaf: a plain dark plate on its hinge at the north jamb, swung inward
    const leaf = box(0, 0.07, 0, 2.26, 0, 1.06);
    leaf.applyMatrix4(new THREE.Matrix4().makeRotationY(-0.62)).translate(x - 0.1, sill + 0.02, z0 + 0.02);
    metals.push(paint(leaf, '#4a4138'));
    metals.push(paint(box(x - 6, x - 2, sill, y1, z0, z1), '#020202')); // the dark behind it
  }
}
