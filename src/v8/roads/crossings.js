// v8-01 roads: where the ways cross the Demesne's ha-ha on a bank (as the causeway does at (120, 52)), so a walker
// can come back up onto the lawn. Read by v4/regions/demesne.js's roadD (one marked line); the leads' plan points
// (v4/paths/routes.js, P18 and P9) pass straight over each. No imports: demesne.js loads before the routes.
export const HAHA_CROSSINGS = [
  [[20, -38], [18, -52]], // P18, the north way
  [[72, -30], [67, -52]], // P9, to the Pomegranate House
];
export function crossingDistance(x, z) {
  let d = Infinity;
  for (const [[ax, az], [bx, bz]] of HAHA_CROSSINGS) {
    const ex = bx - ax, ez = bz - az, l2 = ex * ex + ez * ez;
    const t = Math.max(0, Math.min(1, ((x - ax) * ex + (z - az) * ez) / l2));
    d = Math.min(d, Math.hypot(x - ax - ex * t, z - az - ez * t));
  }
  return d;
}
