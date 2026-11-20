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
  'src/v18/florilegium.js',
  'src/v7/walkers/thurifer.js', 'src/v7/walkers/leerie.js', 'src/v7/walkers/linkboy.js',
];

// where figures and creatures are built: every .js file directly in these is one, or is in NOT_FIGURES
export const FIGURE_DIRS = ['src/fauna', 'src/fauna/uncanny', 'src/v7/walkers', 'src/v7/workers', 'src/v7/still', 'src/v7/small', 'src/v7/canyon', 'src/v7/glyphs', 'src/v15/people', 'src/v2/inhabitants', 'src/v8/twk', 'src/v8/threads', 'src/v8/house', 'src/v4/regions'];
// files elsewhere known to draw a figure as part of a place
export const FIGURE_FILES = ['src/v2/riverlife.js', 'src/v17/sphere.js', 'src/v9/waystation.js', 'src/v10/halt-seat.js', 'src/v5/thrones.js', 'src/v5/plinths.js', 'src/v14/noon-road.js'];
// the rig kits, and the names in them that make a body: a file anywhere under src/ that imports one of these names builds
// a figure or a creature
// ('*': any name, and `import * as`, counts)
export const FIGURE_KITS = {
  'v7/walkers/gait.js': '*',
  'v7/workers/rig.js': ['rigPainter', 'rigMesh', 'makeBones'],
  'v7/workers/body.js': '*',
  'v15/people/body.js': '*',
  'fauna/geo.js': ['Mesher', 'flapMaterial', 'flapInstanced'],
  'fauna/uncanny/kit.js': ['Painter', 'paintedMaterial'],
  'v7/still/kit.js': '*',
};
// files in those places, or importing those names, that build no figure or creature of their own (or one the page does
// not stand alone yet), and why
export const NOT_FIGURES = {
  'src/fauna/geo.js': 'the kit (Mesher, the flapping wings)',
  'src/fauna/uncanny.js': 'builds the six in src/fauna/uncanny/ in turn',
  'src/fauna/uncanny/kit.js': 'the kit (Painter, the ground, the rules)',
  'src/v7/walkers/flames.js': 'the walkers\' fire and smoke (each walker\'s study builds them)',
  'src/v7/walkers/gait.js': 'the walkers\' rig',
  'src/v7/walkers/shadow.js': 'the Link-Boy\'s drawn shadows (his study carries them)',
  'src/v7/workers/body.js': 'the workers\' body kit',
  'src/v7/workers/rig.js': 'the workers\' rig',
  'src/v7/workers/cut.js': 'the Sexton\'s ground (his study carries it)',
  'src/v7/workers/graves.js': 'the Sexton\'s plan',
  'src/v7/still/kit.js': 'the still figures\' kit',
  'src/v7/still/clear.js': 'clearances',
  'src/v7/still/medlar.js': 'the Sleeper\'s tree: a recipe (src/study/recipes.js)',
  'src/v7/small/face.js': 'the Simulacrum\'s face points',
  'src/v7/canyon/nets.js': 'surface nets, the Bather\'s mesher',
  'src/v7/glyphs/engrave.js': 'incised glyphs on stone',
  'src/v7/glyphs/erratic.js': 'a glyph on a stone',
  'src/v7/glyphs/forms.js': 'the glyphs\' forms',
  'src/v15/people/body.js': 'the villagers\' body kit',
  'src/v15/people/folk.js': 'the villagers\' specs (registered through people/index.js)',
  'src/v15/people/letter.js': 'the clerk\'s act',
  'src/v8/twk/plan.js': 'the Twk-men\'s stations', 'src/v8/twk/salt.js': 'their salt', 'src/v8/twk/voice.js': 'their voices',
  'src/v8/threads/chair.js': 'a chair', 'src/v8/threads/gold.js': 'the court\'s gold', 'src/v8/threads/kit.js': 'the threads\' kit', 'src/v8/threads/plan.js': 'the threads\' plan',
  'src/v8/twk.js': 'the Twk-men\'s flights (their model: twk/model.js)',
  'src/v8/house/clear.js': 'clearances', 'src/v8/house/kept.js': 'the house\'s kept arrays', 'src/v8/house/lamps.js': 'lamps', 'src/v8/house/props.js': 'props', 'src/v8/house/sound.js': 'sound',
  'src/v4/regions/bletting.js': 'no creature', 'src/v4/regions/common.js': 'the regions\' kit', 'src/v4/regions/demesne.js': 'its peafowl are peafowl.js\'s', 'src/v4/regions/saltings.js': 'no creature', 'src/v4/regions/skin.js': 'the ground skins', 'src/v4/regions/yews.js': 'no creature',
  'src/v5/plinths.js': 'stone feet on plinths: statuary, not a figure',
  'src/v14/noon-road.js': 'the Noonwrights\' carriers: glass vessels, not figures',
  'src/v8/livery/props.js': 'the liveries\' props (a slate, a peg)',
  'src/v18/florilegium/likeness.js': 'the likenesses\' builder (registered through florilegium.js)',
  'src/v18/florilegium/house.js': 'the glasshouse: stone, iron and glass',
};
// real figures not on the page yet, each part of a place's build: lifting the figure out into a function of its own puts
// it on the page. tools/study-test.mjs fails if this list grows past DEFERRED_MAX: it may only shrink.
export const DEFERRED = {
  'src/v17/sphere.js': 'the Noonwright at the wheel, built inside the sphere\'s build',
  'src/v9/waystation.js': 'the Lantern Halt\'s sleeper, built inside the waystation\'s build',
  'src/v10/halt-seat.js': 'the same sleeper\'s answer to the seat',
  'src/v5/thrones.js': 'the Acephalous Thrones, 150 m colossi carved from the wall (a sheet cell cannot hold them; judged in the world)',
};
export const DEFERRED_MAX = 4;
