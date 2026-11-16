#!/usr/bin/env node
// The geometry check (#64): what flickers, floats or shows its back, in every walkable place. One page load on low;
// for each place in tools/geometry/places.mjs (and src/v15/plan.js's GEOMETRY_PLACES when it exists) the walker is
// stood there, every drawn face within the place's region is taken from the page in world space
// (tools/geometry/extract.js) and judged in node (tools/geometry/analyze.mjs):
//   coplanar  faces of two meshes (or of one, facing the same way) lying in one plane and overlapping: flicker
//   floating  a group of touching pieces that touches neither the ground, water, nor anything big enough to hang from:
//             a strut or chain end attached to nothing (what is meant to hang in air is exempt by name, below)
//   backs     from standing eyes every metre along the route, rays round the head whose first face is the back of a
//             single-sided face (a hole you see through), or that meet nothing from a place marked sealed
// Each finding prints its kind, mesh names, world position and a ?pos=x,z,y URL that stands you on its floor. Before
// the world, a fixture is planted in the air over the spawn (never in the world's
// files) with one fault of each kind beside sound parts of each kind: each fault must be found and the sound parts not.
// Known findings are in tools/geometry-baseline.json, by group (kind, place, mesh) with each finding's position rounded
// to 0.5 m and the issue or the reason beside the group. A place fails on a finding the baseline does not hold (within
// a metre, in its group) and on a baseline finding no longer found (a fix: lower the baseline). GEOMETRY_RECORD=1
// rewrites it from the run, keeping every reason. The page runs on Playwright's clock so runs repeat exactly.
// A place with no faces to judge, no usable stands or a truncated take fails; so does a src/v15/plan.js that exists
// but will not import or exports no GEOMETRY_PLACES.
//   node tools/geometry-test.mjs [base=http://localhost:8123] [place,place]   (env ONLY_PLACES= too)
//   GEOM_LIST=1 prints each place's parts and triangle counts; GEOM_JSON=path writes every finding as JSON;
//   GEOM_ALL=1 prints every finding, not only the new ones and the worst ten; GEOM_DUMP=dir writes each place's faces
//   as JSON there (for a closer look in node with tools/geometry/analyze.mjs).
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { coplanar, floating, backs, TOL } from './geometry/analyze.mjs';
import { PLACES } from './geometry/places.mjs';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const here = dirname(fileURLToPath(import.meta.url));
const base = (process.argv[2] || process.env.FP_BASE || 'http://localhost:8123').replace(/\/?(\?.*)?$/, '');
const only = (process.argv[3] || process.env.ONLY_PLACES || '').split(',').filter(Boolean);
const t0 = Date.now();

// What is meant to hang in air, or is not solid: never floating, never a face that hides or fights. Exact mesh names
// (the last part of the path, or the whole path), or a prefix ending in '*', each with its reason. A place adds its own
// with `exempt: { name: reason }`; keep this list to what is true everywhere.
export const EXEMPT = [
  ['sky', "the sky's dome"],
  ['skylife/*', "the sky's furniture (lattices, webbing, trains, threads, meteors, the parhelion): it hangs in the sky"],
  ['vigilant*', 'the Vigilant hangs in the sky'],
  ['pit-stars', "the Nadir's stars hang in the dark under the world on purpose"],
  ['act-lures', "an act's tally-moths: they fly"],
  ['lamp-moths', 'moths round the lamps: they fly'],
  ['twk-insects', "the Twk's insects: they fly"],
  ['twk-wings', "the Twk riders' dragonfly wings: they fly"],
  ['bletting-wasps', 'wasps over the windfalls: they fly'],
  ['adust-beetles', 'beetles: they crawl on their own clock'],
  ['house-glows', "the house lamps' halos: light made visible, not a solid"],
  ['local-lights-glows', "the local lamps' halos: light made visible, not a solid"],
];
// What everything else may rest on: the ground, what is laid flat on it, and water. Same matching, each with its reason.
export const ANCHOR = [
  ['terrain', 'the ground'],
  ['skin-*', "a region's ground skin, laid on the ground"],
  ['saltings-crust', 'the salt crust laid on the ground'],
  ['house-bare-ground', "the house's swept court, laid on the ground"],
  ['paths-leads-*', 'the leads: tracks drawn on the ground'],
  ['structures-pavers', 'paving laid on the ground'],
  ['nave-water', "the Nave's water: the carriers float in it"],
  ['pit-floor', "the Pit's floor: the ground down there"],
];
const nameHit = (pat, name) => {
  const full = name.replace(/#\d+$/, ''), last = full.split('/').pop();
  if (pat.endsWith('*')) { const q = pat.slice(0, -1); return full.startsWith(q) || last.startsWith(q); }
  return full === pat || last === pat;
};

const places = PLACES.slice();
const v15 = join(here, '..', 'src', 'v15', 'plan.js');
// the village's places: src/v15/plan.js exports GEOMETRY_PLACES (the shape of PLACES). Absent file: no village yet.
// A file that will not import, or that has no GEOMETRY_PLACES, fails: the village must never go unchecked quietly.
let hook = null;
if (existsSync(v15)) {
  try {
    const m = await import(pathToFileURL(v15).href);
    if (!Array.isArray(m.GEOMETRY_PLACES) || !m.GEOMETRY_PLACES.length) hook = 'src/v15/plan.js exports no GEOMETRY_PLACES (a list of places, the shape of tools/geometry/places.mjs)';
    else for (const p of m.GEOMETRY_PLACES) places.push(p);
  } catch (e) { hook = `src/v15/plan.js will not import in node (it must import nothing): ${e.message}`; }
}
const run = places.filter((p) => !only.length || only.includes(p.name));

const baseFile = join(here, 'geometry-baseline.json');
const baseline = existsSync(baseFile) ? JSON.parse(readFileSync(baseFile, 'utf8')) : { known: {} };

const browser = await chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
page.setDefaultTimeout(600000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
// the page runs on Playwright's clock, paused once the scene is up and moved only by runFor: the lift, the wings and
// everything else that moves on its own are where the same steps put them on every run, so the counts repeat
await page.clock.install();
await page.goto(`${base}/?q=low`, { waitUntil: 'load', timeout: 120000 });
for (let i = 0; i < 6000 && !(await page.evaluate(() => document.body.classList.contains('ready'))); i++) { await page.clock.runFor(100); await new Promise((r) => setTimeout(r, 30)); }
await page.evaluate(() => { const fp = window.__fp; fp.events.dispatchEvent(new CustomEvent('begin')); document.getElementById('card')?.classList.add('hidden'); fp.sky.flicker.next = 1e9; });
await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
await page.clock.runFor(500);

const dec = (s, T) => { const b = Buffer.from(s, 'base64'); return new T(b.buffer, b.byteOffset, b.byteLength / T.BYTES_PER_ELEMENT); };
const f2 = (v) => v.toFixed(2), f1 = (v) => v.toFixed(1);
async function take(place) {
  const st = await page.evaluate(async (place) => (await import('/tools/geometry/extract.js')).stand(window.__fp, place), place);
  if (st.missing) return null;
  if (!place.stands) await page.clock.runFor(900); // what hides below the moor, what drops far, settles round the walker
  const r = await page.evaluate(async (place) => (await import('/tools/geometry/extract.js')).extract(window.__fp, place), place);
  if (r.missing) return null;
  const soup = { P: dec(r.P, Float32Array), S: dec(r.S, Float32Array), part: dec(r.part, Uint32Array), parts: r.parts, spheres: r.spheres, stands: r.stands, L: r.L, tris: r.tris, truncated: r.truncated, skipped: r.skipped, near: !!place.near };
  const ex = [...Object.entries(place.exempt || {}), ...EXEMPT], an = [...Object.entries(place.anchor || {}), ...ANCHOR];
  for (const p of soup.parts) {
    const hit = ex.find(([pat]) => nameHit(pat, p.name));
    p.exempt = hit ? hit[1] : null;
    p.anchor = an.some(([pat]) => nameHit(pat, p.name));
  }
  return soup;
}

// a stand from which to look at `at`: the nearest standing eye, and the yaw and pitch from it
function lookFrom(soup, at, from) {
  let s = from;
  if (!s) { let best = Infinity; for (const q of soup.stands) { const d = (q.x - at[0]) ** 2 + (q.y - at[1]) ** 2 + (q.z - at[2]) ** 2; if (d < best) { best = d; s = [q.x, q.y, q.z]; } } }
  const dx = at[0] - s[0], dy = at[1] - s[1], dz = at[2] - s[2];
  const yaw = Math.atan2(-dx, -dz), pitch = Math.atan2(dy, Math.hypot(dx, dz));
  return { s, yaw, pitch };
}
const standOf = (soup, at, from) => { const { s, yaw, pitch } = lookFrom(soup, at, from); return { x: +f2(s[0]), y: +f2(s[1] - 1.6), z: +f2(s[2]), yaw: +f2(yaw), pitch: +f2(pitch) }; };
function where(soup, at, from) {
  const { s, yaw, pitch } = lookFrom(soup, at, from);
  const feet = s[1] - 1.6;
  return `${base}/?q=medium&pos=${f1(s[0])},${f1(s[2])},${f2(feet + 0.05)}&yaw=${f2(yaw)}&pitch=${f2(pitch)}`;
}
const nm = (soup, i) => (i < 0 ? '(sky)' : soup.parts[i].name + (soup.parts[i].inst >= 0 ? `[${soup.parts[i].inst}]` : ''));
const groupOf = (f) => `${f.kind}${/one end/.test(f.info) ? '-end' : ''}|${f.place}|${f.names[0].replace(/\[\d+\]/g, '').replace(/#\d+$/, '')}`;
const key = (kind, place, names, at) => `${kind}|${place}|${names.join('+')}|${Math.round(at[0])},${Math.round(at[1])},${Math.round(at[2])}`;

function judge(place, soup) {
  const out = [];
  const tc = Date.now();
  for (const f of coplanar(soup)) {
    const names = [nm(soup, f.a), nm(soup, f.b)].sort();
    // stand 2.5 m off the face, on its drawn side, unless a standing eye is nearer
    out.push({ kind: 'coplanar', place: place.name, names, at: f.at, score: f.area, info: `${f2(f.area)} m² over ${f.pairs} face pairs`, url: where(soup, f.at), stand: standOf(soup, f.at), key: key('coplanar', place.name, names, f.at) });
  }
  const tf = Date.now();
  for (const f of floating(soup)) {
    const names = f.parts.map((i) => nm(soup, i)).sort();
    out.push({ kind: 'floating', place: place.name, names: names.slice(0, 4).concat(names.length > 4 ? [`+${names.length - 4}`] : []), at: f.at, score: f.size, info: f.end ? `one end held, the other (here) touching nothing; ${f2(f.size)} m long, ${f.tris} faces` : `${f.pieces} piece(s), ${f2(f.size)} m across, ${f.tris} faces, y ${f2(f.lo[1])} to ${f2(f.hi[1])}`, url: where(soup, f.at), stand: standOf(soup, f.at), key: key('floating', place.name, names.slice(0, 4), f.at) });
  }
  const tb = Date.now();
  // the back findings by part and a 3 m cell (one bad face seen from forty stands is one finding)
  const bk = new Map(), B = backs(soup);
  soup.insideStands = B.insideStands;
  for (const f of B) {
    const k2 = `${f.part}|${Math.floor(f.at[0] / 3)},${Math.floor(f.at[1] / 3)},${Math.floor(f.at[2] / 3)}`;
    const g = bk.get(k2);
    if (!g) bk.set(k2, { ...f }); else { g.rays += f.rays; g.stands = Math.max(g.stands, f.stands); }
  }
  for (const f of bk.values()) {
    if (f.rays < 2) continue; // one ray in 320 from one stand: a sliver at a seam, not a hole
    const names = [nm(soup, f.part)];
    out.push({ kind: f.sky ? 'sky' : 'backs', place: place.name, names, at: f.at, score: f.rays, info: f.sky ? `${f.rays} rays from a sealed stand meet nothing` : `${f.rays} rays from ${f.stands} stand(s) meet its back, nearest ${f2(f.d)} m`, url: where(soup, f.at, f.from), stand: standOf(soup, f.at, f.from), key: key(f.sky ? 'sky' : 'backs', place.name, names, f.at) });
  }
  const te = Date.now();
  return { out, ms: { coplanar: tf - tc, floating: tb - tf, backs: te - tb } };
}

let pass = 0, fail = 0;
const check = (ok, name, info = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  ' + info : ''}`); ok ? pass++ : fail++; };

// ---------------------------------------------------------------- the fixture: one fault of each kind, and sound parts
const fixture = await page.evaluate(() => {
  const fp = window.__fp, THREE = fp.THREE, g = new THREE.Group(); g.name = 'geometry-fixture';
  const X = 0, Y = 600, Z = 0, mat = new THREE.MeshLambertMaterial({ color: 0x777777 }), both = new THREE.MeshLambertMaterial({ color: 0x777777, side: THREE.DoubleSide });
  const box = (name, w, h, d, x, y, z, m = mat) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.name = name; o.position.set(X + x, Y + y, Z + z); g.add(o); return o; };
  const plane = (name, w, h, x, y, z, rx, ry, m = mat) => { const o = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); o.name = name; o.position.set(X + x, Y + y, Z + z); o.rotation.set(rx, ry, 0); g.add(o); return o; };
  box('fixture-slab', 16, 1, 16, 0, -0.5, 0); // the floor, its top at Y (big: an anchor)
  // coplanar: a plate lying exactly on a plinth's top (fault); a mat 1 cm over the slab (sound)
  box('fixture-plinth', 1, 0.6, 1, 4, 0.3, 4);
  plane('fixture-plate-fault', 0.8, 0.8, 4, 0.6, 4, -Math.PI / 2, 0, new THREE.MeshLambertMaterial({ color: 0x995533 }));
  plane('fixture-mat-sound', 1, 1, -4, 0.01, 4, -Math.PI / 2, 0);
  // floating: a strut a metre over the slab, touching nothing (fault); a post standing on it with a bracket into it (sound)
  box('fixture-strut-fault', 0.1, 1, 0.1, 4, 1.5, -4);
  box('fixture-post-sound', 0.2, 2, 0.2, -4, 1, -4);
  box('fixture-bracket-sound', 0.6, 0.08, 0.08, -3.75, 1.8, -4); // a level arm held at one end: a bracket, meant
  // a loose end: a stay from the post's side reaching down and ending in air (fault); one reaching down to the slab (sound)
  box('fixture-stay-fault', 0.06, 0.85, 0.06, -4, 0.9, -3.7).rotation.x = -Math.PI / 4;
  box('fixture-brace-sound', 0.06, 1.7, 0.06, -4, 0.6, -4.6).rotation.x = Math.PI / 4;
  // backs: a one-sided wall facing away from the stand (fault); a two-sided one (sound); a one-sided one facing it (sound)
  plane('fixture-wall-fault', 2, 2, 0, 1, -2.5, 0, Math.PI); // faces -z, away from the stand at z 0
  plane('fixture-wall-sound2', 2, 2, 2.5, 1, 0, 0, Math.PI / 2, both);
  plane('fixture-wall-sound1', 2, 2, -2.5, 1, 0, 0, Math.PI / 2); // faces +x, toward the stand
  // sky: two rooms 2 m square, walls facing in, each with a sealed stand at its middle; one roofed (sound), one open (fault)
  const room = (name, x, z, roof) => {
    const k = (n, w, h, px, py, pz, rx, ry) => plane(`${name}-${n}`, w, h, x + px, py, z + pz, rx, ry, both); // two-sided: the outside is seen from the other stands
    k('floor', 2, 2, 0, 0.02, 0, -Math.PI / 2, 0); k('n', 2, 2, 0, 1.02, -1, 0, 0); k('s', 2, 2, 0, 1.02, 1, 0, Math.PI);
    k('w', 2, 2, -1, 1.02, 0, 0, Math.PI / 2); k('e', 2, 2, 1, 1.02, 0, 0, -Math.PI / 2);
    if (roof) k('roof', 2, 2, 0, 2.02, 0, Math.PI / 2, 0);
  };
  room('fixture-room-sound', -5.5, 0, true);
  room('fixture-room-fault', 5.5, 0, false);
  fp.scene.add(g); g.updateMatrixWorld(true);
  return { X, Y, Z };
});
{
  const F = fixture;
  const soup = await take({ name: 'fixture', stands: [[F.X, F.Y, F.Z], [F.X - 5.5, F.Y + 0.02, F.Z, true], [F.X + 5.5, F.Y + 0.02, F.Z, true]], region: [[F.X, F.Y, F.Z, 14]] });
  const { out } = judge({ name: 'fixture' }, soup);
  await page.evaluate(() => { const fp = window.__fp, g = fp.scene.getObjectByName('geometry-fixture'); fp.scene.remove(g); });
  const has = (kind, re) => out.some((f) => f.kind === kind && f.names.some((n) => re.test(n)));
  check(has('coplanar', /plate-fault/), 'fixture: a plate laid in a plinth\'s top face is found coplanar', out.filter((f) => f.kind === 'coplanar').map((f) => f.names.join('+')).join('; '));
  check(has('floating', /strut-fault/), 'fixture: a strut touching nothing is found floating', out.filter((f) => f.kind === 'floating').map((f) => f.names.join('+')).join('; '));
  check(out.some((f) => f.kind === 'floating' && /one end held/.test(f.info) && f.names.some((n) => /stay-fault/.test(n))), 'fixture: a stay held at its top and ending in air is found (a loose end)', out.filter((f) => f.kind === 'floating').map((f) => f.names.join('+')).join('; '));
  check(out.some((f) => f.kind === 'sky' && Math.abs(f.at[0] - (F.X + 5.5)) < 3), 'fixture: a sealed room with no roof is found open to the sky', out.filter((f) => f.kind === 'sky').map((f) => f.at.map(f1).join(',')).join('; '));
  check(has('backs', /wall-fault/), 'fixture: a one-sided wall seen from behind is found', out.filter((f) => f.kind === 'backs').map((f) => f.names.join('+')).join('; '));
  const loud = out.filter((f) => (f.names.some((n) => /sound|slab/.test(n)) && !f.names.some((n) => /fault/.test(n))) || (f.kind === 'sky' && Math.abs(f.at[0] - (F.X - 5.5)) < 3));
  check(!loud.length, 'fixture: the sound parts (a mat 1 cm up, a post, its bracket and a brace to the slab, a two-sided wall, a wall faced, a roofed room) are quiet', loud.map((f) => `${f.kind} ${f.names.join('+')}`).join('; '));
}

// ---------------------------------------------------------------- the places
if (existsSync(v15) || hook) check(!hook, "the village's places come in from src/v15/plan.js", hook || `${places.length - PLACES.length} places`);
// the baseline: per group (kind, place, the first mesh's name without its instance) the findings' positions, rounded to
// 0.5 m. A finding with no baseline position within a metre in its group is new; a baseline position no finding meets
// is fixed, and fails too until the baseline is lowered (GEOMETRY_RECORD=1 rewrites it from the run, keeping every
// reason), so a fix never leaves room for a new fault
const r5 = (v) => Math.round(v * 2) / 2;
const posOf = (f) => f.at.map(r5).join(',');
const near = (a, b) => a.split(',').every((v, i) => Math.abs(+v - +b.split(',')[i]) <= 1.01);
const all = [];
const recorded = {};
for (const place of run) {
  const tp = Date.now();
  const soup = await take(place);
  if (!soup) { check(false, `${place.name}: the place is found (its ascent or stair registered)`); continue; }
  if (process.env.GEOM_LIST) {
    const cnt = new Map();
    for (let t = 0; t < soup.part.length; t++) { const p = soup.parts[soup.part[t]]; const k = p.name + (p.exempt ? '  [exempt]' : '') + (p.anchor ? '  [anchor]' : '') + (p.side === 2 ? ' [double]' : p.side === 1 ? ' [back]' : '') + (p.ghost ? ' [ghost]' : ''); cnt.set(k, (cnt.get(k) || 0) + 1); }
    console.log(`--- ${place.name} parts`); for (const [k, v] of [...cnt].sort((a, b) => b[1] - a[1])) console.log(`   ${String(v).padStart(7)}  ${k}`);
  }
  if (process.env.GEOM_DUMP) writeFileSync(join(process.env.GEOM_DUMP, `${place.name}.json`), JSON.stringify({ ...soup, P: Array.from(soup.P), S: Array.from(soup.S), part: Array.from(soup.part) }));
  const ex = Date.now() - tp;
  const { out, ms } = judge(place, soup);
  // an empty place passes nothing: it must have faces to judge (beyond the ground and the exempt), stands a visitor
  // could use, and be taken whole
  let body = 0;
  for (let t = 0; t < soup.part.length; t++) { const p = soup.parts[soup.part[t]]; if (!p.anchor && !p.exempt) body++; }
  const usable = soup.stands.length - soup.insideStands;
  const whole = body >= 100 && usable >= Math.min(2, soup.stands.length) && usable > 0 && !soup.truncated;
  check(whole, `${place.name}: the place is there to judge (faces, stands, taken whole)`, `${body} faces beyond ground and exempt, ${usable} of ${soup.stands.length} stands usable${soup.truncated ? ', TRUNCATED' : ''}`);
  const groups = new Map();
  for (const f of out) { all.push(f); const g = groupOf(f); if (!groups.has(g)) groups.set(g, []); groups.get(g).push(f); }
  for (const [g, list] of groups) recorded[g] = list.map(posOf).sort();
  const fresh = [], fixed = [];
  for (const [g, list] of groups) {
    const left = (baseline.known[g]?.at || []).slice();
    // exact positions first (the scene repeats, so they nearly always meet), then the nearest within a metre
    const rest = [];
    for (const f of list) { const i = left.indexOf(posOf(f)); if (i >= 0) left.splice(i, 1); else rest.push(f); }
    for (const f of rest) { const i = left.findIndex((b) => near(b, posOf(f))); if (i >= 0) left.splice(i, 1); else fresh.push({ ...f, group: g }); }
    for (const b of left) fixed.push(`${g} at ${b}`);
  }
  for (const [g, k] of Object.entries(baseline.known)) if (g.split('|')[1] === place.name && !groups.has(g)) for (const b of k.at || []) fixed.push(`${g} at ${b}`);
  const by = (k) => out.filter((f) => f.kind === k).length;
  console.log(`--- ${place.name}: ${soup.tris} faces, ${soup.parts.length} parts, ${soup.stands.length} stands (${soup.insideStands} inside something, left out)${soup.truncated ? ' (TRUNCATED)' : ''}; coplanar ${by('coplanar')}, floating ${by('floating')}, backs ${by('backs')}, sky ${by('sky')}; ${groups.size} groups; ${fresh.length} new, ${fixed.length} fixed; ${((Date.now() - tp) / 1000).toFixed(1)} s (take ${(ex / 1000).toFixed(1)}, coplanar ${(ms.coplanar / 1000).toFixed(1)}, floating ${(ms.floating / 1000).toFixed(1)}, backs ${(ms.backs / 1000).toFixed(1)})`);
  const show = process.env.GEOM_ALL ? out : fresh;
  for (const f of show) console.log(`   ${fresh.includes(f) ? 'NEW  ' : 'known'} ${f.kind.padEnd(8)} ${f.names.join(' + ')}  at ${f.at.map(f1).join(', ')}  ${f.info}\n         ${f.url}`);
  for (const x of fixed) console.log(`   FIXED ${x} (lower the baseline: GEOMETRY_RECORD=1)`);
  check(!fresh.length, `${place.name}: no geometry fault beyond the baseline`, `${out.length} found in ${groups.size} groups, ${fresh.length} new`);
  check(!fixed.length || !!process.env.GEOMETRY_RECORD, `${place.name}: the baseline is no looser than the place`, fixed.length ? `${fixed.length} baseline findings no longer found: lower it (GEOMETRY_RECORD=1)` : '');
}
await browser.close();

const worst = { coplanar: [], floating: [], backs: [], sky: [] };
for (const f of all) worst[f.kind].push(f);
console.log('=== by kind');
for (const [k, list] of Object.entries(worst)) {
  console.log(`${k}: ${list.length}`);
  for (const f of list.sort((a, b) => b.score - a.score).slice(0, 10)) console.log(`   ${f.place}  ${f.names.join(' + ')}  at ${f.at.map(f1).join(', ')}  ${f.info}\n      ${f.url}`);
}
if (process.env.GEOMETRY_RECORD) {
  const ran = new Set(run.map((p) => p.name)), known = {};
  for (const [g, at] of Object.entries(recorded).sort()) known[g] = { n: at.length, why: baseline.known[g]?.why || 'on next when the check was written; not yet judged', at };
  for (const [g, k] of Object.entries(baseline.known)) if (!ran.has(g.split('|')[1])) known[g] = k;
  const rows = Object.entries(known).sort().map(([g, k]) => `  ${JSON.stringify(g)}: ${JSON.stringify(k)}`); // one line a group
  writeFileSync(baseFile, `{\n "about": ${JSON.stringify(baseline.about || '')},\n "known": {\n${rows.join(',\n')}\n }\n}\n`);
  console.log(`wrote ${Object.keys(known).length} groups to ${baseFile}`);
}
if (process.env.GEOM_JSON) writeFileSync(process.env.GEOM_JSON, JSON.stringify(all, null, 1));
check(!errors.length, 'no page errors', errors.slice(0, 3).join(' | '));
const secs = (Date.now() - t0) / 1000;
check(secs < 300, 'the check runs in under five minutes', `${secs.toFixed(0)} s, ${run.length} places`);
console.log(`${pass} passed, ${fail} failed; tolerances ${JSON.stringify(TOL)}`);
process.exit(fail ? 1 : 0);
