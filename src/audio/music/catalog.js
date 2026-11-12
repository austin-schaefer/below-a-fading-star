// The tracks the walk can play, and the pool or special each belongs to (director.js: POOLS, SPECIALS). A new track is
// one import and one line here. Pure data: the director reads `length`, the glue composes `track` when it plays.
import moor from './tracks/moor.js';

const entry = (track, pool) => ({ name: track.name, pool, length: track.length, track });
export const CATALOG = [
  entry(moor, 'moor'),
];
export const BY_NAME = Object.fromEntries(CATALOG.map((c) => [c.name, c]));
