// v7, the living: three little characters on the edge of perception (wilderness-v5.md, "### CM. The Indistinct",
// "### CO. The Repetend", "### CQ. The Simulacrum"). World module `living-small`.
//   small/indistinct.js  CM the Indistinct: a blur that keeps seven metres from you along the ha-ha's ditch (a shader and a constraint)
//   small/repetend.js    CO the Repetend: a brown bird on the Lynchets' walls that repeats your footsteps a second late (audio.echoStep)
//   small/simulacrum.js  CQ the Simulacrum: gnat columns on the Outwash, one drawing into a face in the gutter (small/face.js)
// ctx.small = { indistinct, repetend, simulacrum, stats() }; test hooks on __fp.small. ?small=0 leaves all three out;
// ?indistinct=0, ?repetend=0 and ?simulacrum=0 each on its own; ?simulacrum=face forces the face on, ?simulacrum=noface off.
import { SITES } from '../world.js';
import { buildIndistinct } from './small/indistinct.js';
import { buildRepetend } from './small/repetend.js';
import { buildSimulacrum } from './small/simulacrum.js';

const FACE_DEFAULT = true; // the face is built (the time-box's verdict: wilderness-v5.md, "### CQ. The Simulacrum")

function flags() {
  const q = new URLSearchParams(location.search), off = (k) => q.get(k) === '0';
  const sim = q.get('simulacrum');
  return { all: !off('small'), indistinct: !off('indistinct'), repetend: !off('repetend'), simulacrum: sim !== '0', face: sim === 'face' ? true : sim === 'noface' ? false : FACE_DEFAULT };
}
// region-lynchets builds alongside this module: wait for its wall stones and runs (unless it is not loading)
async function lynchetsWalls(ctx) {
  const q = new URLSearchParams(location.search), only = q.get('only'), skip = (q.get('skip') || '').split(',');
  if ((only && !only.split(',').includes('region-lynchets')) || skip.includes('region-lynchets')) return null;
  for (let k = 0; k < 1200; k++) {
    const m = ctx.scene.getObjectByName('lynchets-walls');
    if (m && ctx.regions?.walls) return m;
    await new Promise((r) => setTimeout(r, 50));
  }
  return null;
}

export async function build(ctx) {
  const F = flags();
  const pub = { indistinct: null, repetend: null, simulacrum: null, flags: F, stats: () => ({ calls: 0, tris: 0, lights: 0 }) };
  ctx.small = pub;
  if (!F.all) return;
  if (F.indistinct) {
    pub.indistinct = buildIndistinct(ctx);
    // its distance is the whole effect: every frame within 30 m of the ditch (r 78 from the keep: 110 from it covers that), held beyond
    ctx.registerUpdate(pub.indistinct.update, { pos: { x: 40, z: 30 }, near: 112, hz: 0 });
  }
  if (F.simulacrum) {
    pub.simulacrum = buildSimulacrum(ctx, { face: F.face });
    ctx.registerUpdate(pub.simulacrum.update, { pos: { x: SITES.simulacrum.x, z: SITES.simulacrum.z }, near: 60, hz: 10 });
  }
  if (F.repetend) {
    const m = await lynchetsWalls(ctx);
    pub.repetend = m ? buildRepetend(ctx, m) : null;
    if (pub.repetend) { const b = pub.repetend.at(); ctx.registerUpdate(pub.repetend.update, { at: () => b, near: 40, hz: 2 }); }
  }
  pub.stats = () => {
    const parts = [pub.indistinct?.mesh, pub.indistinct?.shadow, pub.repetend?.mesh, pub.simulacrum?.points].filter(Boolean);
    const tris = (pub.indistinct?.tris() || 0) + (pub.repetend?.tris() || 0);
    return { calls: parts.length, tris, lights: 0, gnats: pub.simulacrum?.N || 0, walls: pub.repetend?.walls.length || 0 };
  };
  ctx.log?.(`living-small: ${pub.indistinct ? 'the Indistinct' : 'no Indistinct'}, ${pub.repetend ? 'the Repetend on ' + pub.repetend.walls.length + ' walls' : 'no Repetend'}, ${pub.simulacrum ? pub.simulacrum.N + ' gnats' + (F.face ? ' and the face' : '') : 'no gnats'}; ${JSON.stringify(pub.stats())}`);
}
