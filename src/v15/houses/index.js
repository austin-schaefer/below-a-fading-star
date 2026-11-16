// The Lappet's houses (v15-V1): one maker a kind, each (B, M, o) into a structures Builder like a strata part.
// kit.js has the contract (the plot, the frame, the record a maker returns); world-code/modules.md how a quarter
// calls them.
import { late, LATE_FORMS, shopfront } from './late.js';
import { undercroft } from './undercroft.js';
import { carrier } from './carrier.js';
import { elder } from './elder.js';
import { newhouse } from './newhouse.js';
import { plotMatrix } from './kit.js';
export { register, plotMatrix, faceOf, floorAt, site } from './kit.js';
export { LATE_FORMS, shopfront };

// by age, oldest hand first
export const MAKERS = { elder, undercroft, carrier, late, new: newhouse };
export const KINDS = Object.keys(MAKERS);
// make(kind, B, plot, o): the maker on a plot of the plan's shape ({ x, y, z, face, w, d }); returns its record
export const make = (kind, B, plot, o = {}) => MAKERS[kind](B, plotMatrix(plot), { w: plot.w, d: plot.d, ...o });
