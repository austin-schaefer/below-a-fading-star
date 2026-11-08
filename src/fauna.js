// Fauna: things that move. Wings over the tower and fen, grazers on the moor, the deodand at the tree line,
// and small life (moths, crows, fish rings). Everything is procedural and deterministic via ctx.makeRng.
import { buildWings } from './fauna/wings.js';
import { buildGrazers } from './fauna/grazers.js';
import { buildDeodand } from './fauna/deodand.js';
import { buildFlush, buildBats, buildWader, buildEel } from './fauna/life.js';
import { buildMoths, buildCrows, buildFishRings } from './fauna/small.js';
import { buildUncanny } from './fauna/uncanny.js';

export async function build(ctx) {
  const parts = [['wings', buildWings], ['grazers', (c) => buildGrazers(c, { n: 6, home: [22, 78] })], ['orchardHerd', (c) => buildGrazers(c, { salt: 212, n: 5, home: [183, -76] })], ['deodand', buildDeodand], ['moths', buildMoths], ['crows', buildCrows], ['fish', buildFishRings], ['flush', buildFlush], ['bats', buildBats], ['wader', buildWader], ['eel', buildEel], ['uncanny', buildUncanny]];
  for (const [name, fn] of parts) {
    try { fn(ctx); } catch (e) { console.error(`[fp] fauna.${name} failed:`, e); }
  }
  ctx.log('fauna: built');
}
