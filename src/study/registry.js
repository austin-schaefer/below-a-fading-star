// The study page's registry (#77): every figure and creature module, each of which exports `study`, a list of
//   { id, name, kind: 'figure'|'creature', h (m, how tall: the camera frames it), at: [x, z] (about where it stands in
//     the walk), looker: 'far' (optional: the looker a long way off, for a thing that runs from or hides from whoever
//     is close), fly (optional: it is not on the ground), build(ctx) }
// where build(ctx) builds one of it with its module's own builder against the study's flat ctx (src/study/ctx.js),
// registering its updates with ctx.registerUpdate as in the walk, and returns { at(out) → out set to its feet (or its
// middle, flying), face() → its heading (atan2(dx, dz) of where it looks; omitted: a fixed view), h, floor }.
// Nothing in the walk reads `study`: an export costs the walk nothing.
//
// tools/study-test.mjs fails when a file in FIGURE_DIRS, or a file anywhere under src/ that imports a figure kit
// (FIGURE_KITS), is neither here nor in NOT_FIGURES with its reason; and when a module here has no `study` export.
export const STUDY_MODULES = [
  'src/fauna/grazers.js', 'src/fauna/wings.js', 'src/fauna/deodand.js', 'src/fauna/life.js', 'src/fauna/small.js', 'src/fauna/rooks.js', 'src/fauna/lamps.js', 'src/fauna/gutterbats.js', 'src/fauna/beetles.js',
  'src/fauna/uncanny/cloak.js', 'src/fauna/uncanny/slinker.js', 'src/fauna/uncanny/biomesh.js', 'src/fauna/uncanny/traveller.js', 'src/fauna/uncanny/tarn.js', 'src/fauna/uncanny/wader.js',
  'src/v7/workers/taker.js', 'src/v7/workers/coheirs.js', 'src/v7/workers/sexton.js',
  'src/v7/still/sleeper.js', 'src/v7/still/stylite.js', 'src/v7/still/accrescent.js',
  'src/v7/small/repetend.js', 'src/v7/small/simulacrum.js',
  'src/v7/canyon/bather.js', 'src/v7/canyon/toad.js',
  'src/v7/glyphs/scriveners.js', 'src/v7/glyphs/moles.js',
  'src/v15/people/index.js',
  'src/v2/inhabitants/guest.js', 'src/v2/inhabitants/galley.js', 'src/v2/inhabitants/menology.js',
  'src/v2/riverlife.js', 'src/v8/twk/model.js', 'src/v8/house/folk.js',
  'src/v4/regions/high-ling.js', 'src/v4/regions/outwash.js', 'src/v4/regions/lynchets.js', 'src/v4/regions/strandline.js', 'src/v4/regions/adust.js', 'src/v4/regions/peafowl.js',
  'src/v8/threads/painter.js', 'src/v8/threads/traveller.js',
  'src/v7/walkers/thurifer.js', 'src/v7/walkers/leerie.js', 'src/v7/walkers/linkboy.js',
];

// where figures and creatures are built
export const FIGURE_DIRS = ['src/fauna', 'src/fauna/uncanny', 'src/v7/walkers', 'src/v7/workers', 'src/v7/still', 'src/v7/small', 'src/v7/canyon', 'src/v7/glyphs', 'src/v15/people', 'src/v2/inhabitants', 'src/v8/twk', 'src/v8/threads'];
// the rig kits: a module that imports one builds a figure or a creature
export const FIGURE_KITS = ['v7/walkers/gait.js', 'v7/workers/rig.js', 'v7/workers/body.js', 'v15/people/body.js', 'fauna/geo.js', 'fauna/uncanny/kit.js'];
// files in those places, or importing those kits, that build no figure or creature of their own, and why
export const NOT_FIGURES = {
};
