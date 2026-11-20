// v18-F1: what the Deodand Wood grows past its old line, placed by buildTrees (src/vegetation/trees.js) after all of its
// own passes and from streams of its own, so nothing placed before moves:
//   - the north lobe (src/v18/reach.js's shape, read here as biomeAt's wood less wood0, the old wood's weight): the same
//     deodands, thinner and older toward its rim (hollow dead trunks and crooked trees among them), thorn under them and a
//     few fallen trunks;
//   - the rim's skyline, all round the wood and the lobe: outliers standing off the edge alone or in pairs, and a few rim
//     giants (the moor's buttressed variants) where the edge is thin; reachGap(), asked by the old wood's own pass, makes
//     gaps in its rim (a gap is a tree placed and hidden, so the pass's spacing and its draws hold);
//   - along the three spurs (routes.js P57-P59), fallen trunks lying beside the tread with their root plates near it,
//     to be stepped round.
// The trees are the batch's own variants, so the lobe costs no draw call; its triangles are paid for in trees.js's LOD.
import { makeSimplex } from '../noise.js';
import { leads } from '../v4/paths/routes.js';
import { LANDMARKS } from '../world.js';
import { LOBE_WEST } from './reach.js';

const GN = makeSimplex(18015);
// a gap in the old wood's rim: a slow noise, only where the wood is thin
export const reachGap = (x, z, w0) => w0 < 0.48 && GN.noise2(x * 0.075 + 3.3, z * 0.075 - 1.7) > 0.32;
export const SPUR_IDS = ['P57', 'P58', 'P59'];

export function growReach(ctx, ground, K) {
  const { place, near, variants, woodV, crookV, thornV, deadV, fallenV, giantV, low } = K;
  const b = {}, W = LANDMARKS.wood;
  const stats = { lobe: 0, lobeDead: 0, lobeCrooked: 0, lobeThorn: 0, lobeFallen: 0, outliers: 0, rimGiants: 0, spurFallen: 0 };
  const coverOk = (x, z) => !ctx.regions || ctx.regions.coverAt(x, z).d.trees >= 0.5;
  // the lobe: where the lobe's line gives more wood than the old circle
  {
    const rng = ctx.makeRng(18010);
    for (let k = 0; k < (low ? 1500 : 2300); k++) {
      const x = LOBE_WEST - 2 + rng() * 54, z = -3 + rng() * 68;
      ground.biomeAt(x, z, b);
      if (b.wood < 0.2 || b.wood - b.wood0 < 0.03 || rng() > Math.pow(b.wood, 1.1) * 1.2) continue;
      if (ground.excluded(x, z, 2)) continue;
      const gap = (low ? 8.3 : 6.6) - b.wood * 2.6; // (on low a metre sparser than the old wood: part of what pays for it)
      if (near(x, z, gap, true)) continue;
      const rim = b.wood < 0.5, r = rng(), rot = rng() * Math.PI * 2, tint = 0.8 + rng() * 0.3, u = rng();
      if (rim && r < 0.24) { place(x, z, deadV[Math.floor(u * deadV.length)], 0.75 + rng() * 0.35, gap, rot, tint, 'dead'); stats.lobeDead++; }
      else if (rim && r < 0.42) { place(x, z, crookV[Math.floor(u * crookV.length)], 0.85 + rng() * 0.35, gap, rot, tint * 0.95, 'rim'); stats.lobeCrooked++; }
      else { place(x, z, woodV[Math.floor(u * woodV.length)], (0.75 + rng() * 0.45 * (0.5 + b.wood)) * (rim ? 0.92 : 1), gap, rot, tint, 'wood'); stats.lobe++; }
    }
    for (let k = 0; k < 600 && stats.lobeThorn < (low ? 10 : 18); k++) {
      const x = LOBE_WEST + rng() * 52, z = -2 + rng() * 64;
      ground.biomeAt(x, z, b);
      if (b.wood < 0.3 || b.wood - b.wood0 < 0.03 || ground.excluded(x, z, 1) || near(x, z, 3, true)) continue;
      place(x, z, thornV[stats.lobeThorn % 3], 0.8 + rng() * 0.6, 3, rng() * 6.28, 0.7 + rng() * 0.2, 'thorn', false); stats.lobeThorn++;
    }
    for (let k = 0; k < 400 && stats.lobeFallen < (low ? 3 : 5); k++) {
      const x = LOBE_WEST + rng() * 52, z = -2 + rng() * 64, rot = rng() * 6.28;
      ground.biomeAt(x, z, b);
      if (b.wood < 0.35 || b.wood - b.wood0 < 0.03) continue;
      if (lay(x, z, fallenV[stats.lobeFallen % 3], rot, 0.85 + rng() * 0.2)) stats.lobeFallen++;
    }
  }
  // the rim's outliers: alone or in pairs, off the edge of the old wood and the lobe
  {
    const rng = ctx.makeRng(18011);
    for (let k = 0; k < 3000 && stats.outliers < (low ? 22 : 32); k++) {
      const lobe = rng() < 0.3;
      const a = rng() * Math.PI * 2, rr = 72 + rng() * 50;
      const x = lobe ? LOBE_WEST - 4 + rng() * 60 : W.x + Math.cos(a) * rr, z = lobe ? -8 + rng() * 60 : W.z + Math.sin(a) * rr;
      ground.biomeAt(x, z, b);
      if (b.wood < 0.025 || b.wood > 0.19 || b.marsh > 0.3 || b.rock > 0.35 || ground.slopeAt(x, z) > 0.45) continue;
      if (ground.excluded(x, z, 3) || !coverOk(x, z) || near(x, z, 9)) continue;
      const n = rng() < 0.4 ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const px = x + (i ? (rng() - 0.5) * 8 : 0), pz = z + (i ? (rng() - 0.5) * 8 : 0);
        if (i && (ground.excluded(px, pz, 3) || near(px, pz, 3))) continue;
        place(px, pz, woodV[Math.floor(rng() * woodV.length)], 0.9 + rng() * 0.35, 5, rng() * 6.28, 0.78 + rng() * 0.25, 'rim');
        stats.outliers++;
      }
    }
  }
  // the rim's giants: a few buttressed crowns over the thin edge, the wood's skyline from the moor
  {
    const rng = ctx.makeRng(18012), at = [[-231, -54]]; // (and clear of the moor's own giant nearest the wood)
    for (let k = 0; k < 2500 && stats.rimGiants < (low ? 4 : 5); k++) {
      const lobe = rng() < 0.25;
      const a = rng() * Math.PI * 2, rr = 66 + rng() * 34;
      const x = lobe ? LOBE_WEST + rng() * 50 : W.x + Math.cos(a) * rr, z = lobe ? -2 + rng() * 50 : W.z + Math.sin(a) * rr;
      ground.biomeAt(x, z, b);
      if (b.wood < 0.12 || b.wood > 0.42 || ground.slopeAt(x, z) > 0.22) continue;
      if (ground.excluded(x, z, 8) || !coverOk(x, z) || near(x, z, 6) || at.some(([gx, gz]) => (gx - x) ** 2 + (gz - z) ** 2 < 58 * 58)) continue;
      place(x, z, giantV[stats.rimGiants % giantV.length], 0.82 + rng() * 0.16, 12, rng() * 6.28, 0.86 + rng() * 0.14, 'rimgiant');
      at.push([x, z]); stats.rimGiants++;
    }
  }
  // the spurs: fallen trunks beside the tread, their root plates toward it
  {
    const rng = ctx.makeRng(18013), list = leads().list;
    for (const id of SPUR_IDS) {
      const L = list.find((l) => l.id === id); if (!L) continue;
      const S = L.lines[0], len = S[S.length - 1].s;
      for (let s = 9 + rng() * 5; s < len - 7; s += 15 + rng() * 9) {
        let j = 0; while (j < S.length - 2 && S[j + 1].s < s) j++;
        const p = S[j], q = S[j + 1], tl = Math.hypot(q.x - p.x, q.z - p.z) || 1, tx = (q.x - p.x) / tl, tz = (q.z - p.z) / tl;
        for (let tries = 0; tries < 5; tries++) { // (a few slants and sides till one lies clear)
          const side = rng() < 0.5 ? -1 : 1, off = 1.4 + rng() * 0.5;
          const x = p.x - tz * side * off, z = p.z + tx * side * off;
          // lying away from the tread at a slant (0.7-1.2 rad off the way, ahead or behind), its root plate at the verge
          const th = 0.7 + rng() * 0.5, fw = rng() < 0.5 ? 1 : -1, ux = fw * Math.cos(th) * tx - Math.sin(th) * tz * side, uz = fw * Math.cos(th) * tz + Math.sin(th) * tx * side;
          const rot = Math.atan2(-uz, ux); // (lay's trunk runs along (cos rot, -sin rot))
          if (lay(x, z, fallenV[Math.floor(rng() * 3)], rot, 0.85 + rng() * 0.2, L.w + 0.9)) { stats.spurFallen++; break; }
        }
      }
    }
  }
  // the thresholds (round three): what a visitor reads as made at each mouth, different at each. The Florilegium's (P57): a
  // pair of fallen trunks lining its mouth like kerbs, from the road's edge into the wood. The north spur's
  // (P59): one piece on its left, a rotten post on its right (foxfire.js sets the posts). The Beds' (P58): two posts.
  // Each piece lies along the road from the gap's edge, 2.9 m out from the road's middle, clear of the way's verge.
  const thresholds = [];
  {
    const list = leads().list, rng = ctx.makeRng(18014);
    for (const [id, sides] of [['P57', [-1, 1]], ['P59', [-1]]]) {
      const L = list.find((l) => l.id === id); if (!L) continue;
      const S = L.lines[0], h = S[0], q = S.find((p) => p.s >= 4) || S[S.length - 1], ul = Math.hypot(q.x - h.x, q.z - h.z) || 1, ux = (q.x - h.x) / ul, uz = (q.z - h.z) / ul;
      for (const sd of sides) {
        // the Florilegium's: two trunks lining the mouth like kerbs, from the road's edge into the wood (along the road
        // they read as a wall closing the side off); the north's: one along the road from the gap's edge
        const kerb = id === 'P57';
        const tx = kerb ? ux : -uz * sd, tz = kerb ? uz : ux * sd;
        const x = kerb ? h.x + ux * 1.9 - uz * sd * 1.6 : h.x + ux * 2.9 + tx * 1.25, z = kerb ? h.z + uz * 1.9 + ux * sd * 1.6 : h.z + uz * 2.9 + tz * 1.25;
        const sc = kerb ? 0.62 : 1; // (a kerb's trunks shorter: the mouth's straight is 7 m and they must end before it bends)
        const v = fallenV[Math.floor(rng() * fallenV.length)], len = variants[v].len * sc, rot = Math.atan2(-tz, tx);
        const t = place(x, z, v, sc, 0, rot, 0.8 + rng() * 0.15, 'fallen', false);
        t.fullTilt = true; t.hidden = false; // (a made thing at the mouth, set where the mouth's own claim would refuse a tree)
        for (let s = 0; s <= len; s += 1.6) ctx.addCollider({ x: x + tx * s, z: z + tz * s, r: variants[v].trunkR * sc * 1.1, y: t.y - 1, h: variants[v].trunkR * sc * 2 + 1 });
        thresholds.push({ spur: id, x, z, tx, tz, len, r: variants[v].trunkR * sc, y: t.y });
      }
    }
  }
  return { stats, thresholds };

  // a standing tree whose trunk is within d of (x, z) (near() keeps a tree's spacing, half the sum of two gaps: too wide
  // for a log laid between trunks)
  function nearTrunk(x, z, d) { return near(x, z, 2 * d, true, true); }
  // a fallen trunk from (x, z) along rot, if all of it lies on open ground and (clear > 0) that far off every lead
  function lay(x, z, v, rot, tint, clear = 0) {
    const len = variants[v].len, dx = Math.cos(rot), dz = -Math.sin(rot); // object +x after rotation about y
    for (let t = 0; t <= 1; t += 0.2) {
      const px = x + dx * len * t, pz = z + dz * len * t;
      // (beside a spur, the root plate may lie on the worn verge: excluded()'s woody margin keeps the rest 2 m off the line)
      if (ground.excluded(px, pz, clear > 0 && t === 0 ? -0.01 : 1) || ground.slopeAt(px, pz) > 0.35 || nearTrunk(px, pz, clear > 0 ? 0.9 : 2.8)) return false;
      if ((clear > 0 && ground.wornAt(px, pz) > 0.8) || ground.hiddenAt(px, pz, 0.4)) return false; // (off the tread and its worn verge; no part of it across a claimed site)
    }
    const t = place(x, z, v, 1, 0, rot, tint, 'fallen', false);
    t.fullTilt = true;
    if (!t.hidden) for (let s = 0; s <= len; s += 1.6) ctx.addCollider({ x: x + dx * s, z: z + dz * s, r: variants[v].trunkR * 1.1, y: t.y - 1, h: variants[v].trunkR * 2 + 1 });
    return true;
  }
}
