// v7, the living: the Hypogeum's glyphs where they turn up outside the tomb (wilderness-v5.md, "### CP. The Scriveners",
// "### The glyph motif", "### CT. The Tesserine Moles"). World module `living-glyphs`.
//   glyphs/scriveners.js  CP the Scriveners: a shoal in Lees Tarn's north shallows that forms the door's last glyph
//   glyphs/moles.js       CT the Tesserine Moles: heaps of tesserae on the Demesne's lawn, one tessera carrying a glyph
//   glyphs/erratic.js     the glyph scratched on the erratic at (75, -200)
//   glyphs/engrave.js     the incised glyphs on the Surveyor's brass caps (called from v4/dressing/pegs.js) and the tessera
//   glyphs/forms.js       the lintel's forms and order, shared
// ctx.glyphs = { scriveners, moles, erratic, stats() }; test hooks on __fp.glyphs. ?glyphs=0 leaves all of it out (the caps
// stay plain); ?scriveners=0, ?moles=0 and ?glyphmotif=0 (the caps, the tessera's glyph and the erratic) each on its own.
import { flags, lintelForms } from './glyphs/forms.js';
import { buildScriveners } from './glyphs/scriveners.js';
import { buildMoles } from './glyphs/moles.js';
import { buildErraticGlyph } from './glyphs/erratic.js';

// the erratic belongs to region-outwash, which builds alongside this module: wait for its mesh (unless it is not loading)
async function erraticMesh(ctx) {
  const q = new URLSearchParams(location.search), only = q.get('only'), skip = (q.get('skip') || '').split(',');
  if ((only && !only.split(',').includes('region-outwash')) || skip.includes('region-outwash')) return null;
  for (let k = 0; k < 1200; k++) {
    const m = ctx.scene.getObjectByName('outwash-erratics');
    if (m) return m;
    await new Promise((r) => setTimeout(r, 50));
  }
  return null;
}

export async function build(ctx) {
  const F = flags();
  const pub = { scriveners: null, moles: null, erratic: null, flags: F };
  ctx.glyphs = pub;
  if (!F.all) return;
  if (F.scriveners) pub.scriveners = buildScriveners(ctx);
  if (F.moles) pub.moles = buildMoles(ctx, { motif: F.motif });
  if (F.motif) {
    const m = await erraticMesh(ctx);
    if (m) pub.erratic = buildErraticGlyph(ctx, m, lintelForms(ctx)[6]);
  }
  pub.stats = () => {
    const parts = [pub.scriveners?.fish, pub.scriveners?.marks, pub.moles?.heaps, pub.moles?.tesserae, pub.erratic?.mesh].filter(Boolean);
    const tris = (pub.scriveners?.tris() || 0) + (pub.moles?.tris() || 0) + (pub.erratic?.tris || 0);
    return { calls: parts.length, tris, lights: 0, fish: pub.scriveners?.N || 0, heaps: pub.moles?.state().heaps || 0, tesserae: pub.moles?.count || 0 };
  };
  ctx.log?.(`living-glyphs: ${pub.scriveners ? pub.scriveners.N + ' scriveners' : 'no shoal'}, ${pub.moles ? pub.moles.state().heaps + ' heaps' : 'no heaps'}, ${pub.erratic ? 'the erratic\'s glyph' : 'no erratic glyph'}; ${JSON.stringify(pub.stats())}`);
}
