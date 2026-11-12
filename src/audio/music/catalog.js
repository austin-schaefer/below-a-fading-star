// The tracks the walk can play, and the pool or special each belongs to (director.js: POOLS, SPECIALS). A new track is
// one import and one line here, and its name in index.js's TRACK_NAMES (the debug panel's list, read without loading
// this file; tools/music-test.mjs checks the two agree). Pure data: the director reads `length`, the glue composes
// `track` when it plays.
import moor from './tracks/moor.js';
import wood from './tracks/wood.js';
import wet from './tracks/wet.js';
import cold from './tracks/cold.js';
import garden from './tracks/garden.js';
import dry from './tracks/dry.js';
import span from './tracks/span.js';
import keep from './tracks/keep.js';
import gates from './tracks/gates.js';

const entry = (track, pool) => ({ name: track.name, pool, length: track.length, track });
export const CATALOG = [
  entry(moor, 'moor'),
  entry(wood, 'wood'),
  entry(wet, 'wet'),
  entry(cold, 'cold'),
  entry(garden, 'garden'),
  entry(dry, 'dry'),
  entry(span, 'span'),
  entry(keep, 'keep'),
  entry(gates, 'gates'),
];
export const BY_NAME = Object.fromEntries(CATALOG.map((c) => [c.name, c]));
