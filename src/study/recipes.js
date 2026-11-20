// The study page's seed rows (#77): modules whose recipes take an rng (or a seed) and export `studyRecipes`, a list of
//   { id, name, build(rng, seed, ctx) → an Object3D (or a promise of one) standing at the origin on y 0 }
// The page builds each at SEEDS seeds side by side under one framing, so their range of size and plan shows. A new
// recipe worth judging this way adds an export and a line here. Nothing in the walk reads `studyRecipes`.
export const RECIPE_MODULES = [
  'src/vegetation/trees.js',
  'src/v7/still/medlar.js',
  'src/vegetation/plants.js',
  'src/v4/regions/common.js',
  'src/v12/icefall/crystals.js',
  'src/v15/houses/index.js',
];
