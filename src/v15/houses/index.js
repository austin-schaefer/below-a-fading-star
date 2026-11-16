// The Lappet's houses (v15-V1): one maker a kind, each (B, M, o) into a structures Builder like a strata part.
// kit.js has the contract (the plot, the frame, the record a maker returns); world-code/modules.md how a quarter
// calls them.
import { late, LATE_FORMS, shopfront } from './late.js';
import { undercroft, UNDER_FORMS } from './undercroft.js';
import { carrier as flask } from './carrier.js';
import { vessel, VESSEL_FORMS } from './vessel.js';
import { elder, ELDER_FORMS } from './elder.js';
import { newhouse } from './newhouse.js';
import { plotMatrix } from './kit.js';
export { register, registerAll, plotMatrix, faceOf, floorAt, site } from './kit.js';
export { LATE_FORMS, UNDER_FORMS, ELDER_FORMS, shopfront };
// a carrier is never whole: a sherd, a sunk dome or a wreck (vessel.js); the flask on its tail (carrier.js) only
// when a quarter asks for it by name, once
const carrier = (B, M, o = {}) => (o.form === 'standing' ? flask(B, M, o) : vessel(B, M, o));
export const CARRIER_FORMS = VESSEL_FORMS;

// by age, oldest hand first
export const MAKERS = { elder, undercroft, carrier, late, new: newhouse };
export const KINDS = Object.keys(MAKERS);
// what each maker's `form` may be (the new house's is its `stage`, 0..2)
export const FORMS = { elder: ELDER_FORMS, undercroft: UNDER_FORMS, carrier: CARRIER_FORMS, late: [...LATE_FORMS, 'stall'], new: ['footing', 'rising', 'roofing'] };
// make(kind, B, plot, o): the maker on a plot of the plan's shape ({ x, y, z, face, w, d }); returns its record
export const make = (kind, B, plot, o = {}) => MAKERS[kind](B, plotMatrix(plot), { w: plot.w, d: plot.d, ...o });

// makePlot(B, plot, o): a plot of src/v15/plan.js built as the plan says. The plan's `kind` and `hand` choose the
// maker (house: late; shop: an undercroft where its hand is heliarch, else a Late stall or a house with a shopfront;
// new-house: new; carrier: carrier; an Elder plot by hand 'elder'); `against` and `roof` become what the maker needs:
// a house against a riser is a 'yard' whose roof is the tread above (no stair: the tread is the way onto it), a shop
// against one is the 'riser' undercroft, its face where the plan's riser is. o: { plan (the plan's module, or
// { LEVEL, RISERS }: needed for any plot with `roof` or `against`), built (ctx.lappet.built: where it holds a shop's
// vault, the undercroft is only fitted out), seed, low, E, and anything the maker takes }.
// A plot the makers cannot build (a fountain, a yard, a garden) and a plot too small for its maker throw.
export function makePlot(B, plot, o = {}) {
  const { plan, built, ...rest } = o, q = { ...rest };
  const need = () => { if (!plan || !plan.LEVEL || !plan.RISERS) throw new Error(`makePlot: ${plot.name} has a roof or stands against a riser: pass o.plan (src/v15/plan.js)`); };
  let kind;
  if (plot.kind === 'house') kind = plot.hand === 'elder' ? 'elder' : 'late';
  else if (plot.kind === 'shop') kind = plot.hand === 'heliarch' ? 'undercroft' : 'late';
  else if (plot.kind === 'new-house') kind = 'new';
  else if (plot.kind === 'carrier') kind = 'carrier';
  else if (MAKERS[plot.kind]) kind = plot.kind;
  else throw new Error(`makePlot: no maker builds a '${plot.kind}' (${plot.name})`);
  let h;
  if (plot.roof) { need(); h = plan.LEVEL[plot.roof].y - plot.y; if (!(h > 1.9)) throw new Error(`makePlot: ${plot.name}: its roof (${plot.roof}) is ${h} m over its ground`); }
  if (kind === 'late') {
    if (plot.against) { if (h === undefined) throw new Error(`makePlot: ${plot.name} stands against a riser and names no roof`); q.against = true; q.h = h; const Rz = plan.RISERS.find((r) => r.key === plot.against); if (Rz && Rz.D !== undefined && plot.D !== undefined && Math.abs(Rz.D - plot.D + plot.d / 2) < 0.5) q.backZ = Rz.D - plot.D; }
    else if (h !== undefined) q.h = h;
    if (plot.kind === 'shop') { if (plot.w < 4 || plot.d < 3) q.form = 'stall'; else q.shop = true; }
    if (plot.stair === false && q.stair === undefined && !plot.against) q.stair = 'side';
  } else if (kind === 'undercroft') {
    if (plot.against) {
      need(); const Rz = plan.RISERS.find((r) => r.key === plot.against);
      q.riser = h ?? Rz.top - Rz.foot;
      if (Rz.D !== undefined && plot.D !== undefined) q.face = Rz.D - plot.D; // the riser's face, in the plot's own frame
      const bu = o.built && o.built[plot.name]; // what src/v15/ways has built there: its vault and arch stand, ours is the fitting
      if (bu) { q.fit = true; if (bu.rad) q.arch = { aw: bu.rad * 2, sp: bu.spring - plot.y }; }
    } else if (h !== undefined) q.h = h;
  }
  const R = make(kind, B, plot, q);
  R.name = plot.name;
  return R;
}
