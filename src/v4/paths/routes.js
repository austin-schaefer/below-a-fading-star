// The leads (v4 map, placement plan section 4): worn paths P1-P17, the old kerb K1 and the rivulets R1-R5, as
// lines on the ground computed once, deterministically, from the plan's endpoints and the terrain. Paths keep to
// a walker's line: a desire line between the plan's points, eased off water, steep ground, the landmarks' walls and
// the reserved sites, wandering a little as a sheep-track does. Rivulets run downhill only: each is traced down the
// ground from its source toward the plan's next point, never climbing, and ends where it reaches water or the
// ground gives it nowhere lower to go. The kerb is straight. Each sample knows the region it crosses, and so its
// material (MATERIALS). Shared by v4/paths.js (draws them), vegetation (wears the cover off them) and __fp.paths.
import { heightAt, slopeAt, waterLevelAt, causewayDistance } from '../../terrain.js';
import { regionAt, regionDistance } from '../regions.js';
import { LANDMARKS, SITES } from '../../world.js';
import { makeSimplex, smoothstep, clamp } from '../../noise.js';

const SN = makeSimplex(41108);

// what a lead is worn into, by the region it crosses (regionAt's primary)
export const MATERIALS = {
  moor: 'moor turf', demesne: 'Demesne turf', bletting: 'rank grass', outwash: 'Outwash gravel', saltings: 'salt crust',
  strandline: 'shingle', highLing: 'heather and clitter', lynchets: 'field-stone footings', adust: 'red clay',
  wood: 'leaf litter', fen: 'grey reeds', lattice: 'crystal grit',
};
export const MATERIAL_KEYS = Object.keys(MATERIALS);
export const materialAt = (x, z) => regionAt(x, z, _rw).primary;
const _rw = {};

// The plan's table. pts are the plan's points, nudged where a point is a building's centre or a reserved site (the
// lead stops at its edge) or inside a block another agent owns (the Span's stair feet: the lead stops at the
// block's edge). w: half-width of the worn line in metres. parts: extra branches of the same lead.
export const LEADS = [
  { id: 'P1', kind: 'path', cls: 'way', w: 1.0, brief: 'sheep-track, Demesne turf to moor', pts: [[6, 36], [-14, 41], [-36, 44]] },
  { id: 'P2', kind: 'path', cls: 'way', w: 1.0, brief: 'worn path, moor; ends at the Scriveners\' shallows', pts: [[-90, 4], [-95, 30], [-101, 50], [-122, 60], [-135, 62]] },
  { id: 'P3', kind: 'path', cls: 'trod', w: 0.5, brief: 'sheep-track along the Lynchets\' east wall (the Thurifer\'s track), drystone footings', near: { region: 'lynchets', within: 6 },
    pts: [[-110.5, -124], [-135, -120], [-157, -113], [-178, -79], [-166, -66], [-156, -60], [-152, -44]] }, // v8-09: off the shrine's apse at its head, and east of the Stones' fallen uprights
  { id: 'P4', kind: 'path', cls: 'trod', w: 0.5, brief: 'gap in a wall, Lynchets field-stone (the Link-Boy\'s post)', pts: [[-110, -124], [-128, -113], [-148, -107], [-168.2, -101.3]] }, // v8-09: through the wall's gap, not into the wall
  { id: 'P5', kind: 'path', cls: 'trod', w: 0.5, brief: 'worn path, moor', pts: [[-106, -131], [-90, -141], [-72, -149]] },
  { id: 'P6', kind: 'path', cls: 'way', w: 1.0, brief: 'gravel trod across the Outwash\'s channels', pts: [[-8, -181], [10, -188], [22, -214]] },
  { id: 'P7', kind: 'path', cls: 'trod', w: 0.5, brief: 'gap in the blackthorn, Bletting grass', pts: [[100, -195], [102, -184], [110, -174], [118, -170], [130, -150], [128.6, -144], [131, -120], [130, -100]] }, // v8-09: round the ruin and the boulder below the blackthorn, past the field wall's end, not over it
  { id: 'P8', kind: 'path', cls: 'trod', w: 0.5, brief: 'orchard track, honey-stone wall gaps', pts: [[148, -100], [178.7, -115.1], [184, -118], [212, -102], [216, -114], [222, -119], [230, -119.5], [238, -118], [270, -160]] }, // v8-09: through Medlar Close's wicket, and south round the Hypogeum's cut
  { id: 'P9', kind: 'path', cls: 'way', w: 1.0, brief: 'worn path, Demesne turf then Bletting grass', pts: [[73, -26], [69, -42], [67, -52], [76, -62], [92, -66], [112, -82]] },
  { id: 'K1', kind: 'kerb', w: 0.22, brief: 'old kerb (the Leerie\'s row)', pts: [[110, -25], [145, 35]] },
  { id: 'P10', kind: 'path', cls: 'trod', w: 0.5, brief: 'heather track with clitter', pts: [[230, -100], [233, -60], [236, -36]], parts: [[[234, -62], [261, -77]]] },
  { id: 'P11', kind: 'path', cls: 'trod', w: 0.5, brief: 'sheep-track, heather to moor', pts: [[250, 5], [240, 12], [226, 28], [204, 46], [182, 57]] },
  { id: 'P12', kind: 'path', cls: 'trod', w: 0.5, brief: 'worn crust', pts: [[216, 176], [219.5, 168]] },
  // v8-09: the canyon's rim joined: from the worn crust's head (P12, P44) up the bank east of the pit, under the Span
  // between its last two piers, and along the rim to the lip over the Wrong Colour and the Cutting; a branch to the
  // brink over the Speculum
  { id: 'P13', kind: 'path', cls: 'trod', w: 0.5, brief: 'rim path, shingle', pts: [[219.5, 168], [220, 178], [220, 190], [217, 198], [210, 204], [204, 210], [197, 217], [190, 224], [184, 229], [180, 231.5]], parts: [[[197, 217], [210, 224], [216, 232], [215, 238], [214, 242], [213.6, 244.2]], [[190, 224], [190, 232.5]]] },
  { id: 'P14', kind: 'path', cls: 'way', w: 1.0, slabs: true, brief: 'gap in the grey reeds, then salt crust along the fen\'s south rim', pts: [[125, 205], [118, 196], [104, 197], [95, 212], [94, 226], [92, 236], [86, 240], [70, 258], [40, 261], [9, 252]] }, // v8-09: under the Span between its piers, not through one
  { id: 'P15', kind: 'path', cls: 'way', w: 1.0, brief: 'worn path, moor to shingle', pts: [[-36, 246], [-44, 238], [-52, 235], [-47, 226], [-46, 215], [-48, 200], [-50, 166]] }, // v8-09: by the traveller's approach (it looks along it to him), then under the Span between piers -70 and -22, not through the fallen bay
  { id: 'P16', kind: 'path', cls: 'way', w: 1.0, brief: 'track through the wood\'s southern fringe', pts: [[-122, 172], [-150, 182], [-175, 192], [-194, 196]] },
  { id: 'P17', kind: 'path', cls: 'way', w: 1.0, brief: 'sheep-track, to the spit', pts: [[-40, 62], [-30, 82], [-28, 110], [-33, 134], [-42, 150]] },
  { id: 'R1', kind: 'rivulet', w: 0.16, brief: 'meltwater rivulet, Outwash gravel', pts: [[40, -219], [0, -195], [-7, -188]] },
  { id: 'R2', kind: 'rivulet', w: 0.15, brief: 'runnel, heather to moor to red glasswort', pts: [[232, -20], [212, 34]], parts: [[[214, 76], [198, 136]]] },
  { id: 'R3', kind: 'rivulet', w: 0.14, brief: 'runnel, Bletting grass to the Demesne\'s ditch', pts: [[130, -92], [100, -20], [108, -16]], parts: [[[104, 62], [80, 92]]] },
  { id: 'R4', kind: 'rivulet', w: 0.14, brief: 'runnel, field-stone then moor', pts: [[-182, -78], [-165, -28], [-140, 55], [-130, 75]] },
  { id: 'R5', kind: 'rivulet', w: 0.13, brief: 'runnel, moor', pts: [[-65, 17], [-55, 40], [-50, 70]] },
  // v8-01, roads that go somewhere (briefs/v8/brief-v8-01-roads.md): the leads joined into one network with the
  // causeway as its trunk. Ways (cls 'way', w 1.0: a 2 m tread) run to the big places; trods (w 0.5) do the rest.
  // Appended, never inserted: a lead's wander seed is its index. slabs: where it crosses open water it goes on
  // stepping slabs (paths.js lays them).
  { id: 'P18', kind: 'path', cls: 'way', w: 1.0, brief: 'the north way, causeway to the Outwash', pts: [[20, -19], [20, -38], [18, -52], [20, -80], [22, -105], [12, -150], [-6, -180]] },
  { id: 'P19', kind: 'path', cls: 'way', w: 1.0, brief: 'trod over the Lattice\'s moraine above the scarp, round to the blackthorn', pts: [[-6, -226], [20, -232], [45, -233], [72, -229], [100, -226], [106, -212], [96, -205], [100, -195]] },
  { id: 'P20', kind: 'path', cls: 'trod', w: 0.5, brief: 'trod to the Plinth Road', pts: [[100, -195], [116, -203], [127, -207]] },
  { id: 'P21', kind: 'path', cls: 'trod', w: 0.5, brief: 'trod to where the Hawser comes down', pts: [[22, -214], [10, -212], [0, -216], [-6, -226], [-20, -238], [-40, -254], [-68, -264]] },
  { id: 'P22', kind: 'path', cls: 'trod', w: 0.5, brief: 'heather trod, the Prospect to the Nave\'s rim', pts: [[236, -36], [243, -28], [248, -12], [251, 4], [254, 11]] },
  { id: 'P23', kind: 'path', cls: 'trod', w: 0.5, brief: 'trod down the tarn\'s west shore, the wood way to the bay', pts: [[-162, 88], [-160, 120], [-142, 150], [-122, 172]] },
  { id: 'P24', kind: 'path', cls: 'trod', w: 0.5, brief: 'trod, the old kerb to the causeway', pts: [[145, 35], [134, 47], [127, 58]] },
  { id: 'P25', kind: 'path', cls: 'trod', w: 0.5, brief: 'trod round the Arcature to the old kerb', pts: [[182, 57], [180, 40], [160, 33], [145, 35]] },
  { id: 'P26', kind: 'path', cls: 'trod', w: 0.5, brief: 'orchard trod joining the gaps', pts: [[112, -82], [130, -100], [148, -100]] },
  { id: 'P27', kind: 'path', cls: 'trod', w: 0.5, brief: 'trod to the Leaning Yard\'s gate', pts: [[184, -118], [194, -117]] },
  { id: 'P28', kind: 'path', cls: 'trod', w: 0.5, brief: 'trod to the Gradine\'s foot', pts: [[270, -160], [274, -166]] },
  { id: 'P29', kind: 'path', cls: 'trod', w: 0.5, brief: 'trod to the tower\'s lit door', pts: [[-237, -110], [-245, -118]] },
  { id: 'P30', kind: 'path', cls: 'trod', w: 0.5, brief: 'trod, the Link-Boy\'s post to the causeway', pts: [[-168.2, -101.3], [-185, -98], [-201, -90]] }, // v8-09: from the wall's gap
  { id: 'P31', kind: 'path', cls: 'trod', w: 0.5, brief: 'red clay trod to the Galleries\' foot', pts: [[-264, -48], [-282, -58], [-298, -67]] },
  { id: 'P32', kind: 'path', cls: 'way', w: 1.0, brief: 'the wood way, the byre through the Deodand Wood to the Span\'s west stair', pts: [[-135, 62], [-160, 86], [-188, 112], [-212, 140], [-214, 172], [-205, 176], [-195, 180], [-194, 196]] },
  { id: 'P33', kind: 'path', cls: 'trod', w: 0.5, brief: 'trod out of the wood to the Thrones and the causeway\'s west end', pts: [[-214, 172], [-240, 140], [-268, 118], [-298, 100]] },
  { id: 'P34', kind: 'path', cls: 'trod', w: 0.5, brief: 'shingle trod down to the bay\'s strand', pts: [[-122, 172], [-117, 186], [-113, 193]] },
  { id: 'P35', kind: 'path', cls: 'way', w: 1.0, brief: 'the shore way, the spit to the bay', pts: [[-42, 150], [-50, 166]] },
  { id: 'P36', kind: 'path', cls: 'trod', w: 0.5, brief: 'trod out along the spit', pts: [[-42, 150], [-55, 148], [-66, 143]] },
  { id: 'P37', kind: 'path', cls: 'way', w: 1.0, brief: 'the shore way, the Sward to the tarn', pts: [[-36, 44], [-40, 62]] },
  { id: 'P38', kind: 'path', cls: 'trod', w: 0.5, brief: 'trod past the Menology', pts: [[9, 252], [2, 237], [-18, 231], [-36, 246]] },
  { id: 'P39', kind: 'path', cls: 'trod', w: 0.5, brief: 'salt trod, the reed gap north round the Span\'s pier to the rim way', slabs: true, pts: [[125, 205], [133, 186], [150, 166], [176, 146]] },
  { id: 'P40', kind: 'path', cls: 'trod', w: 0.5, brief: 'trod to the foot of the Span\'s fallen bay, looking over the canyon (the rim beyond is reached by P13, from the worn crust)', pts: [[176, 146], [170, 162], [166, 176]] },
  { id: 'P41', kind: 'path', cls: 'trod', w: 0.5, brief: 'the lawn walk, through the parterre from the north way to the Pomegranate House\'s bank', pts: [[20, -38], [24, -38], [56, -38], [66, -32], [73, -26]] },
  { id: 'P42', kind: 'path', cls: 'way', w: 1.0, slabs: true, brief: 'the fen way on stepping slabs, the Demesne to the Saltings', pts: [[110, 40], [95, 80], [80, 120], [70, 160], [56, 184], [48, 193], [42, 200], [41, 207], [44, 214], [46, 221], [48, 228], [52, 242], [56, 259]] },
  { id: 'P43', kind: 'path', cls: 'trod', w: 0.5, brief: 'trod across the Sunken Court\'s floor, between the piers, south of the shaft and round the fallen pier\'s end', pts: [[-72, -149], [-64, -153], [-56, -153], [-48, -153], [-40, -153], [-32, -153], [-27, -151.5], [-23.5, -144], [-23.5, -141], [-17.5, -141], [-10, -141], [0, -143], [12, -146]] },
  { id: 'P44', kind: 'path', cls: 'trod', w: 0.5, brief: 'salt trod, the worn crust round the Discontinued Track to the rim way', pts: [[219.5, 168], [226, 150], [205, 140], [178, 141]] },
  { id: 'P45', kind: 'path', cls: 'trod', w: 0.5, brief: 'orchard trod to the Collation\'s table', pts: [[148, -100], [150, -84]] },
  { id: 'P46', kind: 'path', cls: 'trod', w: 0.5, brief: 'field trod below the ha-ha, the north way to the Pomegranate House', pts: [[18, -54], [45, -63], [67, -53]] },
  { id: 'P47', kind: 'path', cls: 'trod', w: 0.5, brief: 'trod past the Collation\'s table to the orchard (v8-04\'s twelfth chair)', pts: [[112, -82], [126, -72], [136, -69], [150, -84]] },
  { id: 'P48', kind: 'path', cls: 'trod', w: 0.5, brief: 'trod down to the Sexton\'s open grave (v8-04\'s twelfth chair)', pts: [[40, 261], [36, 268], [38, 276.5]] },
  { id: 'P49', kind: 'path', cls: 'trod', w: 0.5, brief: 'trod to the Pomegranate House\'s south side', pts: [[92, -66], [88, -61]] },
  { id: 'P50', kind: 'path', cls: 'trod', w: 0.5, brief: 'trod from the tower\'s lit door down to the lift\'s station under the Galleries (v12-H4)', pts: [[-237, -110], [-252, -92], [-268, -68], [-279, -42], [-285, -19]] },
];

// ---------------------------------------------------------------- what the leads keep off
// Landmarks' walls (not their grounds), every reserved floor site of the plan's section 5 (v5 and v7), the blocks
// other agents own. A lead may come to a site it is led to (one within reach of its own points) but no other.
const AVOID = [
  ...[['castle', 36] /* v5: the keep's corners reach 35 m */, ['tower', 17] /* v5: the lens mount's fins */, ['stones', 10], ['byre', 13], ['court', LANDMARKS.court.r] /* v5: the piers' shoes reach 39 m */, ['taverna', 14], ['graveyard', 11], ['hypogeum', 9], ['arcature', LANDMARKS.arcature.r] /* v5: the armillary's trunnions */, ['cutting', 8], ['eddy', 5], ['gradine', 12]]
    .map(([k, r]) => ({ x: LANDMARKS[k].x, z: LANDMARKS[k].z, r })),
  ...['keptFire', 'collation', 'prospect', 'tallestTor', 'lightPost', 'lightDoor', 'lightMoss', 'lightEmbers', 'nave', 'postern'].map((k) => ({ x: SITES[k].x, z: SITES[k].z, r: SITES[k].r })),
  // v7 (section 5): the Taker, the Coheirs, the Long Sleeper, the Bather's pool, the Sexton's graves, the Accrescent,
  // the moles, the Scriveners, the Simulacrum, the Toadstone
  { x: -255, z: 10, r: 4 }, { x: -45, z: 160, r: 6 }, { x: 180, z: -40, r: 6 }, { x: 158, z: 228, r: 10 }, { x: 55, z: 274, r: 18 },
  { x: 60, z: -180, r: 3 }, { x: 75, z: 0, r: 12 }, { x: -100, z: 58, r: 8 }, { x: 20, z: -205, r: 5 }, { x: 180, z: 230, r: 2 },
];
const BLOCKS = ['spanWest', 'spanEast', 'fallLip', 'nave'].map((k) => SITES[k].block);
// the set-dressing strips (section 4's table): the Discontinued Track, 2 m, and the Surveyor's Pegs, 1 m
export const STRIPS = [{ a: [170, 150], b: [215, 160], half: 1.0 }, { a: [-80, -285], b: [-80, 285], half: 0.5 }];
function stripDist(x, z, S) {
  const [ax, az] = S.a, [bx, bz] = S.b, ex = bx - ax, ez = bz - az;
  const t = clamp(((x - ax) * ex + (z - az) * ez) / (ex * ex + ez * ez), 0, 1);
  return Math.hypot(x - ax - ex * t, z - az - ez * t) - S.half;
}
export function inStrip(x, z, pad = 0) { for (const S of STRIPS) if (stripDist(x, z, S) < pad) return true; return false; }

// ---------------------------------------------------------------- the walker's cost of a spot (cached on a 2 m grid)
const COST = new Map();
function cellCost(ix, iz) {
  const k = ix * 4096 + iz;
  let c = COST.get(k);
  if (c !== undefined) return c;
  const x = ix * 2 + 1, z = iz * 2 + 1;
  c = 0;
  const wl = waterLevelAt(x, z);
  if (wl !== null && heightAt(x, z) < wl + 0.05) c += 60;
  const s = slopeAt(x, z);
  c += Math.max(0, s - 0.32) * 60;
  if (Math.hypot(x, z) > 292) c += 40;
  COST.set(k, c);
  return c;
}
function siteCost(x, z, avoid) {
  let c = 0;
  for (const A of avoid) { const d = Math.hypot(x - A.x, z - A.z); if (d < A.r + 2) c += 40 * (1 - smoothstep(A.r - 2, A.r + 2, d)) + 10; }
  for (const b of BLOCKS) if (x > b[0] - 1 && x < b[1] + 1 && z > b[2] - 1 && z < b[3] + 1) c += 50;
  for (const S of STRIPS) { const d = stripDist(x, z, S); if (d < 3) c += 6 * (1 - d / 3); } // cross a strip, never run along it
  return c;
}
const costAt = (x, z, avoid) => cellCost(Math.floor(x / 2), Math.floor(z / 2)) + siteCost(x, z, avoid);

function resample(pts, step) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(L / step));
    for (let k = 0; k < n; k++) out.push([ax + (bx - ax) * (k / n), az + (bz - az) * (k / n), k === 0 ? 1 : 0]);
  }
  out.push([...pts[pts.length - 1], 1]);
  return out;
}

// a path: the plan's points joined, then eased sideways off what a walker would go round, smoothed, and given a
// sheep-track's wander (none for the kerb)
function routePath(L, pts, avoid) {
  const P = resample(pts, 2.0), n = P.length;
  if (L.kind !== 'kerb') {
    const offs = [-6, -3, -1.5, 0, 1.5, 3, 6];
    for (let it = 0; it < 14; it++) {
      for (let i = 1; i < n - 1; i++) {
        if (P[i][2]) continue; // the plan's own points hold
        const [px, pz] = P[i - 1], [qx, qz] = P[i + 1];
        let tx = qx - px, tz = qz - pz; const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
        const mx = (px + qx) / 2, mz = (pz + qz) / 2;
        let best = Infinity, bx = P[i][0], bz = P[i][1];
        for (const o of offs) {
          const x = P[i][0] - tz * o, z = P[i][1] + tx * o;
          const c = costAt(x, z, avoid) + 0.9 * ((x - mx) ** 2 + (z - mz) ** 2);
          if (c < best) { best = c; bx = x; bz = z; }
        }
        P[i][0] = bx * 0.6 + mx * 0.4; P[i][1] = bz * 0.6 + mz * 0.4;
      }
    }
    // the wander: a long sway and a short one, fading to nothing at the plan's points
    let s = 0;
    for (let i = 1; i < n - 1; i++) {
      const [px, pz] = P[i - 1], [qx, qz] = P[i + 1];
      let tx = qx - px, tz = qz - pz; const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
      s += 2;
      let near = Infinity; for (let j = Math.max(0, i - 6); j <= Math.min(n - 1, i + 6); j++) if (P[j][2]) near = Math.min(near, Math.abs(j - i) * 2);
      const o = (SN.noise2(s * 0.035, L.seed) * 1.4 + SN.noise2(s * 0.14, L.seed + 9) * 0.45) * smoothstep(0, 10, near);
      P[i][0] -= tz * o; P[i][1] += tx * o;
    }
  }
  return P.map(([x, z]) => [x, z]);
}

// a rivulet: the cheapest way from its source to each of the plan's points in turn on a 1.5 m grid, where any
// climb above the lowest ground the water has reached so far costs dearly (so it goes round rises, along the
// hollows, and only where nothing else serves cuts a little into the ground: CUT). It ends at water; the water's
// level along it is the running minimum of the ground, so it never runs uphill.
const CUT = 0.8, G = 1.5;
function heapPush(H, item) { H.push(item); let i = H.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (H[p][0] <= H[i][0]) break; [H[p], H[i]] = [H[i], H[p]]; i = p; } }
function heapPop(H) { const top = H[0], last = H.pop(); if (H.length) { H[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < H.length && H[l][0] < H[m][0]) m = l; if (r < H.length && H[r][0] < H[m][0]) m = r; if (m === i) break; [H[m], H[i]] = [H[i], H[m]]; i = m; } } return top; }
export function rivuletLeg(x0, z0, wy0, gx, gz, seed) {
  const pad = 40, bx0 = Math.min(x0, gx) - pad, bz0 = Math.min(z0, gz) - pad;
  const nx = Math.ceil((Math.max(x0, gx) + pad - bx0) / G) + 1, nz = Math.ceil((Math.max(z0, gz) + pad - bz0) / G) + 1;
  const H = new Float32Array(nx * nz).fill(NaN), dist = new Float64Array(nx * nz).fill(Infinity), wy = new Float32Array(nx * nz), prev = new Int32Array(nx * nz).fill(-1);
  const hAt = (k) => { if (Number.isNaN(H[k])) { const x = bx0 + (k % nx) * G, z = bz0 + Math.floor(k / nx) * G; H[k] = heightAt(x, z) + SN.noise2(x * 0.09 + seed, z * 0.09) * 0.04; } return H[k]; };
  const at = (x, z) => clamp(Math.round((z - bz0) / G), 0, nz - 1) * nx + clamp(Math.round((x - bx0) / G), 0, nx - 1);
  const s = at(x0, z0), goal = at(gx, gz);
  dist[s] = 0; wy[s] = Math.min(wy0, hAt(s));
  const heap = [[0, s]];
  const D8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  let reach = -1;
  while (heap.length) {
    const [d, k] = heapPop(heap);
    if (d > dist[k]) continue;
    const kx = k % nx, kz = Math.floor(k / nx), x = bx0 + kx * G, z = bz0 + kz * G;
    if (Math.hypot(x - gx, z - gz) < 5 || k === goal) { reach = k; break; }
    const wl = waterLevelAt(x, z);
    if (wl !== null && hAt(k) < wl && k !== s) { reach = k; break; } // it has found water on the way
    for (const [dx, dz] of D8) {
      const jx = kx + dx, jz = kz + dz;
      if (jx < 0 || jz < 0 || jx >= nx || jz >= nz) continue;
      const j = jz * nx + jx, hj = hAt(j);
      // under the causeway it runs through a culvert: the road's bank is no climb
      const climb = causewayDistance(bx0 + jx * G, bz0 + jz * G) < 6 ? 0 : Math.max(0, hj - wy[k]);
      if (climb > CUT) continue;
      const step = Math.hypot(dx, dz) * G, nd = d + step * (1 + 0.6 * Math.abs(hj - H[k]) / step) + climb * climb * 400 + climb * 40;
      if (nd < dist[j]) { dist[j] = nd; wy[j] = climb === 0 && hj > wy[k] ? wy[k] : Math.min(wy[k], hj); prev[j] = k; heapPush(heap, [nd, j]); }
    }
  }
  if (reach < 0) return null;
  const path = [];
  for (let k = reach; k >= 0; k = prev[k]) path.push([bx0 + (k % nx) * G, bz0 + Math.floor(k / nx) * G, wy[k]]);
  path.reverse();
  return { path, water: (() => { const x = bx0 + (reach % nx) * G, z = bz0 + Math.floor(reach / nx) * G, wl = waterLevelAt(x, z); return wl !== null && heightAt(x, z) < wl; })() };
}
function routeRivulet(L, pts) {
  let x = pts[0][0], z = pts[0][1], wyc = heightAt(x, z);
  const out = [[x, z]];
  L.ended = 'reaches its end';
  for (let t = 1; t < pts.length; t++) {
    const leg = rivuletLeg(x, z, wyc, pts[t][0], pts[t][1], L.seed);
    if (!leg) { // the ground will not let it get there downhill: it makes for the plan's next point instead
      (L.skipped || (L.skipped = [])).push(pts[t]);
      if (t === pts.length - 1) L.ended = `stops short of (${pts[t][0]}, ${pts[t][1]})`;
      continue;
    }
    for (const [px, pz, w] of leg.path.slice(1)) { out.push([px, pz]); wyc = w; }
    x = out[out.length - 1][0]; z = out[out.length - 1][1];
    if (leg.water) { L.ended = 'reaches water'; break; }
  }
  // ease the grid's corners (three passes of a small average; the ends hold)
  for (let it = 0; it < 3; it++) for (let i = 1; i < out.length - 1; i++) { out[i][0] = (out[i - 1][0] + out[i][0] * 2 + out[i + 1][0]) / 4; out[i][1] = (out[i - 1][1] + out[i][1] * 2 + out[i + 1][1]) / 4; }
  // and the meander a runnel has on flat ground
  let s = 0;
  for (let i = 1; i < out.length - 1; i++) {
    const tx = out[i + 1][0] - out[i - 1][0], tz = out[i + 1][1] - out[i - 1][1], tl = Math.hypot(tx, tz) || 1; s += G;
    const o = SN.noise2(s * 0.09, L.seed + 3) * 0.7 * smoothstep(0, 6, Math.min(i, out.length - 1 - i));
    out[i][0] -= (tz / tl) * o; out[i][1] += (tx / tl) * o;
  }
  return out;
}

// ---------------------------------------------------------------- the computed leads, and a grid to find them by
let BUILT = null;
const CELL = 4;
export function leads() {
  if (BUILT) return BUILT;
  const t0 = performance.now();
  const out = [];
  LEADS.forEach((D, li) => {
    const L = { ...D, seed: li * 7.31 + 3.7, lines: [] };
    const own = [D.pts, ...(D.parts || [])].flat();
    const avoid = AVOID.filter((A) => !own.some(([x, z]) => Math.hypot(x - A.x, z - A.z) < A.r + 4));
    for (const pts of [D.pts, ...(D.parts || [])]) {
      const line = D.kind === 'rivulet' ? routeRivulet(L, pts) : routePath(L, pts, avoid);
      // each sample: x, z, arc length, ground height, material key; the strips and the sites the lead keeps off
      // become gaps (open: 0)
      let s = 0;
      let wy = Infinity;
      const S = line.map(([x, z], i) => {
        if (i) s += Math.hypot(x - line[i - 1][0], z - line[i - 1][1]);
        const open = inStrip(x, z, D.w + 0.3) || (D.kind === 'rivulet' && causewayDistance(x, z) < 3.4) ? 0 : 1, y = heightAt(x, z);
        if (open || D.kind !== 'rivulet') wy = Math.min(wy, y); // a rivulet's water: the lowest ground it has reached (paths ignore it); in a culvert it holds
        // a lead that runs along a region's edge (P3 along the Lynchets' wall) is worn into that region's ground
        const mat = D.near && regionDistance(D.near.region, x, z) < D.near.within ? D.near.region : materialAt(x, z);
        return { x, z, s, y, wy, mat, open };
      });
      L.lines.push(S);
    }
    L.length = L.lines.reduce((a, S) => a + S[S.length - 1].s, 0);
    L.ends = L.lines.map((S) => [[S[0].x, S[0].z], [S[S.length - 1].x, S[S.length - 1].z]]);
    out.push(L);
  });
  // the grid: every segment in each 4 m cell it passes within reach of
  const grid = new Map();
  out.forEach((L, li) => L.lines.forEach((S, si) => {
    for (let i = 0; i < S.length - 1; i++) {
      const a = S[i], b = S[i + 1], r = Math.max(L.w * 2 + 1.5, L.w + VERGE + 0.6);
      const x0 = Math.floor((Math.min(a.x, b.x) - r) / CELL), x1 = Math.floor((Math.max(a.x, b.x) + r) / CELL);
      const z0 = Math.floor((Math.min(a.z, b.z) - r) / CELL), z1 = Math.floor((Math.max(a.z, b.z) + r) / CELL);
      for (let gx = x0; gx <= x1; gx++) for (let gz = z0; gz <= z1; gz++) {
        const k = gx * 4096 + gz; let c = grid.get(k); if (!c) grid.set(k, (c = [])); c.push(li, si, i);
      }
    }
  }));
  BUILT = { list: out, grid, ms: performance.now() - t0 };
  return BUILT;
}

// The nearest lead at (x, z), if (x, z) is on it: { id, kind, material (key), name (MATERIALS), d, s, along } or null
const _hit = { id: '', kind: '', material: '', name: '', d: 0, s: 0, w: 0, open: 1 };
export function nearestLead(x, z, pad = 0, out = _hit) {
  const B = leads(), c = B.grid.get(Math.floor(x / CELL) * 4096 + Math.floor(z / CELL));
  if (!c) return null;
  let best = Infinity, bl = -1, bs = 0, bi = 0, bt = 0;
  for (let k = 0; k < c.length; k += 3) {
    const L = B.list[c[k]], S = L.lines[c[k + 1]], a = S[c[k + 2]], b = S[c[k + 2] + 1];
    const ex = b.x - a.x, ez = b.z - a.z, l2 = ex * ex + ez * ez || 1;
    const t = clamp(((x - a.x) * ex + (z - a.z) * ez) / l2, 0, 1);
    const d = Math.hypot(x - a.x - ex * t, z - a.z - ez * t) - L.w;
    if (d < best) { best = d; bl = c[k]; bs = c[k + 1]; bi = c[k + 2]; bt = t; }
  }
  if (bl < 0 || best > pad) return null;
  const L = B.list[bl], a = L.lines[bs][bi], b = L.lines[bs][bi + 1], m = bt < 0.5 ? a : b;
  out.id = L.id; out.kind = L.kind; out.material = m.mat; out.name = MATERIALS[m.mat]; out.d = best + L.w; out.s = a.s + (b.s - a.s) * bt; out.w = L.w;
  out.open = Math.min(a.open, b.open);
  return out;
}

const VERGE = 1.6;
// How worn the cover is at (x, z), 0..1: bare down a path's middle, thinning out over its shoulders; a rivulet's
// line only. For vegetation (cheap where no lead is near: one grid lookup).
export function wornAt(x, z) {
  const h = nearestLead(x, z, VERGE, _w2);
  if (!h || !h.open) return 0;
  if (h.kind === 'rivulet') return 1 - smoothstep(h.w * 1.2, h.w * 3.5, h.d);
  // v8-01: a verge worn wider than the tread, as if mown: bare to 0.8 m past it, the cover back by 1.6 m
  return 1 - smoothstep(h.w + 0.8, h.w + VERGE, h.d);
}
const _w2 = { ..._hit };
// whether any lead passes within a 2 m cell's reach of (x, z) (vegetation's cell-level test)
export function leadNear(x, z) {
  const B = leads();
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) if (B.grid.has((Math.floor(x / CELL) + dx) * 4096 + Math.floor(z / CELL) + dz)) return true;
  return false;
}

// The runnel's own cut (terrain.js, through v4/paths/ground.js's mapHeight): where the plan's rivulet has to pass a
// rise (never more than CUT), the ground along it is cut down a hand below its water, so it runs downhill all the
// way; elsewhere a slight groove. 0 until the leads are built (they are traced on the uncut ground).
export function runnelCut(h, x, z) {
  if (!BUILT) return h;
  const c = BUILT.grid.get(Math.floor(x / CELL) * 4096 + Math.floor(z / CELL));
  if (!c) return h;
  let best = Infinity, wy = 0;
  for (let k = 0; k < c.length; k += 3) {
    const L = BUILT.list[c[k]];
    if (L.kind !== 'rivulet') continue;
    const S = L.lines[c[k + 1]], a = S[c[k + 2]], b = S[c[k + 2] + 1];
    const ex = b.x - a.x, ez = b.z - a.z, l2 = ex * ex + ez * ez || 1, t = clamp(((x - a.x) * ex + (z - a.z) * ez) / l2, 0, 1);
    const d = Math.hypot(x - a.x - ex * t, z - a.z - ez * t);
    if (d < best) { best = d; wy = a.wy + (b.wy - a.wy) * t; }
  }
  if (best > 1.8) return h;
  const bed = Math.min(h, wy) - 0.06 - 0.08 * Math.max(0, 1 - (best / 0.45) ** 2);
  return Math.min(h, bed + (h - bed) * smoothstep(0.35, 1.8, best));
}
