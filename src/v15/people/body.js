// The Lappet's people (v15-P1): the figure kit. The Pomegranate House's folk (src/v8/house/folk.js) cut down to what
// eight figures in one draw need: cloth bodies of revolution with folds, patches and worn hems (src/v7/workers/body.js),
// two ways of holding the body (standing, seated), sleeves, heads, hats, aprons. Every vertex
// carries its bone (aBone): the figure's eight bones start at `o.base` (see BONE). A figure is built in its own frame:
// origin on the ground under the feet or the seat, +z forward, its right hand at -x; its place, its size (a child is a
// grown body at 0.62) and its pose are all in the bone matrices (src/v15/people/index.js).
import { smoothstep } from '../../noise.js';
import { angDiff } from '../../fauna/uncanny/kit.js';
import { rgb, tone, mix3, clothBody, head, sleeve } from '../../v7/workers/body.js';
import { LIVERY, wrongSign } from '../../v8/livery.js';

export const BONE = { place: 0, torso: 1, head: 2, rU: 3, rF: 4, lU: 5, lF: 6, prop: 7, n: 8 };
export const ARM = { up: 0.29, fore: 0.28 };
// the joints in the figure's frame, by how it holds itself: hip (the torso's pivot), neck, shoulder height and half-width
export function joints(o) {
  if (o.pose === 'stand') return { hip: [0, 0.95, 0], neck: [0, 1.47, 0.01], head: [0, 1.585, 0.02], sh: 1.405, shx: 0.2 };
  const hs = o.hs;
  return { hip: [0, hs + 0.08, 0], neck: [0, hs + 0.56, 0.01], head: [0, hs + 0.675, 0.02], sh: hs + 0.5, shx: 0.19 };
}

// the Late folk's cloths and the skins, hair and leather of the kit
export const C = {
  skin: rgb('#a07a62'), skinD: rgb('#7a5844'), skinP: rgb('#b88e74'), hair: rgb('#1e1612'), grey: rgb('#8a8278'), white: rgb('#c8c0b2'),
  saffron: rgb(LIVERY.late.saffron), pom: rgb(LIVERY.late.pom), turq: rgb(LIVERY.late.turq), undyed: rgb(LIVERY.late.undyed), rose: rgb(LIVERY.late.rose),
  ox: rgb('#8a2a22'), cream: rgb('#d8ccb0'), cobalt: rgb('#2c4f9a'), green: rgb('#4a7a3a'), madder: rgb('#8a2e22'), leather: rgb('#5a3a22'),
  dark: rgb('#2a2018'), shoe: rgb('#6a3a22'), wood: rgb('#5a3c24'), woodP: rgb('#9a7a52'), rope: rgb('#8a7454'), lime: rgb('#d6d2c4'),
};
const PATCHES = [C.saffron, C.turq, C.ox, C.cream, C.cobalt, C.green, C.rose];
const tab = (T, v) => { for (let k = 0; k < T.length - 1; k++) if (v <= T[k + 1][0]) { const t = smoothstep(T[k][0], T[k + 1][0], v); return T[k].slice(1).map((a, i) => a + (T[k + 1][i + 1] - a) * t); } return T[T.length - 1].slice(1); };
const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };

// a garment's colour: the cloth by its folds, patches of other cloth, a hem worn dark (or whitened: `hemC`), an apron
// down the front (`apron`: [colour, half-width in radians, top y]) and dust (`dust`: [colour, amount] from the hem up)
function robeColour(o, prof) {
  return (v, ridge, a) => {
    const [y] = prof(v);
    let base = mix3(o.dark, o.cloth, 0.35 + 0.65 * ridge);
    const ca = Math.floor((a / (Math.PI * 2)) * 7 + o.seed), cv = Math.floor(y * 4.5 + o.seed * 3);
    if (hash(ca, cv) < (o.patch ?? 0.2)) { const pc = PATCHES[Math.floor(hash(cv, ca) * PATCHES.length)]; base = mix3(mix3(pc, [0, 0, 0], 0.35), pc, 0.4 + 0.6 * ridge); }
    if (o.apron && Math.abs(angDiff(a, Math.PI / 2)) < o.apron[1] && y < o.apron[2]) base = mix3(mix3(o.apron[0], [0, 0, 0], 0.3), o.apron[0], 0.5 + 0.5 * ridge);
    if (o.hem != null && y < o.hem) base = mix3(base, o.hemC || C.dark, 0.55 * (1 - y / o.hem));
    if (o.dust) base = mix3(base, o.dust[0], o.dust[1] * Math.max(0, 1 - y / 1.4));
    return base;
  };
}

// ---------------------------------------------------------------- the two ways of holding a body
function standing(P, o, low, B) {
  const nu = low ? 12 : 20, nv = low ? 4 : 7;
  const SK = [[0, 0.02, 0.26 * o.girth, 0.24 * o.girth, 0, 0], [0.5, 0.5, 0.23 * o.girth, 0.2 * o.girth, 0, 0], [1, 0.97, 0.185, 0.155, 0, 0]];
  const TO = [[0, 0.93, 0.185, 0.155, 0, 0], [0.4, 1.12, 0.205 + 0.02 * o.belly, 0.19 + 0.02 * o.belly, 0, 0.05 * o.belly], [0.78, 1.36, 0.2, 0.13, 0, 0], [1, 1.47, 0.06, 0.06, 0, 0.01]];
  const sk = (v) => tab(SK, v), to = (v) => tab(TO, v);
  P.bone(B + BONE.place);
  tone(P, o.shoe || C.shoe, 1, 0, 0.8);
  for (const s of [-1, 1]) P.blob(s * 0.1, 0.035, 0.1, 0.05, 0.035, 0.11, 6, 3);
  clothBody(P, nu, nv, sk, { folds: 9, amp: (v) => 0.05 * (1 - v * 0.6), colour: robeColour({ ...o.robe, hem: 0.2 }, sk), seed: o.robe.seed, capTop: false, rough: 0.88 });
  P.bone(B + BONE.torso);
  clothBody(P, nu, nv, to, { folds: 5, amp: () => 0.015, colour: robeColour({ ...o.robe, apron: o.apron ? [o.apron, 0.9, 1.3] : null }, to), seed: o.robe.seed + 1, capBottom: false, rough: 0.88 });
  if (o.sash) { tone(P, o.sash, 1, 0, 0.75); P.ring(0, 0.98, 0.015, 0.195 + 0.02 * o.belly, 0.032, low ? 9 : 14, 4, 1, 0.82 + 0.1 * o.belly); }
  if (o.sign) wrongSign(P, [0.07, 1.25, 0.2], [0, 1, -0.1], [0, 0, 1], 0.09);
  headAndHat(P, o, joints(o), low, B);
}
// seated on something `hs` high: thighs forward, shins down (or hanging, `dangle`)
function seated(P, o, low, B) {
  const hs = o.hs, nu = low ? 12 : 18;
  P.bone(B + BONE.place);
  const HP = [[0, hs - 0.04, 0.19, 0.17, 0, 0.02], [1, hs + 0.12, 0.185, 0.155, 0, 0]], hp = (v) => tab(HP, v);
  clothBody(P, nu, 2, hp, { folds: 7, amp: () => 0.03, colour: robeColour(o.robe, hp), seed: o.robe.seed, capTop: false, rough: 0.88 });
  for (const s of [-1, 1]) {
    tone(P, mix3(o.robe.dark, o.robe.cloth, 0.75), 1, 0, 0.88);
    P.loft([[s * 0.1, hs + 0.02, 0.02], [s * 0.11, hs + 0.04, 0.42]], [0.085, 0.07], low ? 6 : 8, 0, true);
    const foot = o.dangle ? [s * 0.12 + s * 0.02, hs - 0.4, 0.5 + (s > 0 ? 0.05 : -0.02)] : [s * 0.12, 0.08, 0.47];
    tone(P, o.legs || C.undyed, 0.85, 0, 0.9);
    P.loft([[s * 0.11, hs + 0.03, 0.42], foot], [0.058, 0.045], low ? 5 : 7, 0, true);
    tone(P, o.shoe || C.shoe, 1, 0, 0.8);
    if (o.bare) tone(P, o.skin || C.skin, 1, 0, 0.75);
    P.blob(foot[0], foot[1] - 0.04, foot[2] + 0.06, 0.045, 0.035, 0.1, 6, 3);
  }
  seatedTorso(P, o, low, B);
}
function seatedTorso(P, o, low, B) {
  const hs = o.hs, nu = low ? 12 : 18;
  P.bone(B + BONE.torso);
  const TO = [[0, hs + 0.06, 0.18, 0.155, 0, 0], [0.4, hs + 0.26, 0.2 + 0.02 * o.belly, 0.18 + 0.02 * o.belly, 0, 0.04 * o.belly], [0.78, hs + 0.48, 0.19, 0.13, 0, 0], [1, hs + 0.56, 0.06, 0.06, 0, 0.01]], to = (v) => tab(TO, v);
  clothBody(P, nu, low ? 4 : 6, to, { folds: 5, amp: () => 0.015, colour: robeColour({ ...o.robe, apron: o.apron ? [o.apron, 0.9, hs + 0.4] : null }, to), seed: o.robe.seed + 1, capBottom: false, rough: 0.88 });
  if (o.sign) wrongSign(P, [0.07, hs + 0.36, 0.19], [0, 1, -0.1], [0, 0, 1], 0.09);
  headAndHat(P, o, joints(o), low, B);
}
function headAndHat(P, o, J, low, B) {
  P.bone(B + BONE.head);
  const [hx, hy, hz] = J.head, r = o.headR || 0.1;
  head(P, hx, hy, hz, r, { skin: o.skin || C.skin, hair: o.hair === false ? null : (o.hairC || C.hair), beard: o.beard ? (o.beardC || o.hairC || C.hair) : null, bun: o.bun, sides: low ? 8 : 10 });
  if (o.mask) { tone(P, o.mask, 1, 0, 0.9); P.grid(low ? 8 : 10, 1, (u, v, out) => { const a = Math.PI * 0.05 + u * Math.PI * 0.9; out[0] = hx + Math.cos(a) * r * 1.0; out[1] = hy - r * 0.62 + v * r * 0.5; out[2] = hz + Math.sin(a) * r * 1.06; }, false, false); }
  hat(P, o.hat, hx, hy, hz, r, low, o.hatC);
  arms(P, o, low, B);
}
function arms(P, o, low, B) {
  const sc = o.sleeve || mix3(o.robe.dark, o.robe.cloth, 0.7), sides = low ? 5 : 7, hand = o.hand || o.skin || C.skin;
  for (const [b, fore] of [[BONE.rU, false], [BONE.rF, true], [BONE.lU, false], [BONE.lF, true]]) {
    P.bone(B + b);
    if (fore && o.rolled) { // the sleeve rolled to the elbow: a bare forearm (stained, a dyer's) and a cuff of cloth
      tone(P, sc, 0.9, 0, 0.9); P.loft([[0, 0.02, 0], [0, -0.06, 0.004]], [0.06, 0.062], sides, 0, true);
      tone(P, o.forearm || hand, 1, 0, 0.75); P.loft([[0, -0.04, 0.004], [0, -ARM.fore + 0.04, 0]], [0.042, 0.034], sides, 0, true);
      P.blob(0, -ARM.fore + 0.02, 0.008, 0.028, 0.045, 0.02, 6, 3);
    } else if (fore) sleeve(P, ARM.fore, 0.055, 0.07, sc, { hand, sides });
    else sleeve(P, ARM.up, 0.06, 0.058, sc, { sides });
  }
}
// hats: a tall felt cap, a kerchief, a hood, a broad hat of plaited straw, a skull-cap
function hat(P, kind, hx, hy, hz, r, low, hc) {
  const s = low ? 8 : 10;
  if (kind === 'cap') {
    tone(P, hc || C.ox, 1, 0, 0.9); P.loft([[hx, hy + r * 0.45, hz - 0.01], [hx, hy + r * 2.2, hz - 0.04]], [r * 0.92, r * 0.72], s, 0, true);
  } else if (kind === 'kerchief') {
    tone(P, hc || C.turq, 1, 0, 0.88); P.blob(hx, hy + r * 0.3, hz - 0.02, r * 1.13, r * 0.95, r * 1.15, s, 5);
    P.loft([[hx, hy - r * 0.2, hz - r * 1.05], [hx, hy - r * 1.6, hz - r * 1.25]], [r * 0.5, r * 0.15], 5, 0, true); // its knot's tails
  } else if (kind === 'hood') {
    tone(P, hc || C.undyed, 0.8, 0, 0.92);
    P.grid(s, 4, (u, v, out) => { const a = u * Math.PI * 2, front = Math.max(0, Math.sin(a)); const rr = r * (1.2 - 0.25 * v) * (1 - 0.35 * front * v); out[0] = hx + Math.cos(a) * rr; out[1] = hy - r * 0.9 + v * r * 2.1; out[2] = hz - 0.03 + Math.sin(a) * rr * 0.95 - front * 0.0; }, false, true);
  } else if (kind === 'straw') {
    tone(P, rgb('#b89a5a'), 1, 0, 0.95); P.lathe(hx, hy + r * 0.5, hz - 0.01, [[r * 2.4, 0], [r * 2.3, r * 0.15], [r * 0.95, r * 0.35], [r * 0.85, r * 1.1], [0.001, r * 1.25]], s + 2);
    tone(P, C.madder, 1, 0, 0.8); P.ring(hx, hy + r * 0.95, hz - 0.01, r * 0.9, 0.012, s + 2, 3);
  } else if (kind === 'skull') {
    tone(P, hc || C.dark, 1, 0, 0.9); P.blob(hx, hy + r * 0.45, hz - 0.01, r * 1.04, r * 0.7, r * 1.04, s, 4);
  }
}

// one figure's geometry into P, its bones from o.base
export function figure(P, o, low) {
  const B = o.base;
  o = { girth: 1, belly: 0, ...o };
  if (o.pose === 'stand') standing(P, o, low, B);
  else seated(P, o, low, B);
}
