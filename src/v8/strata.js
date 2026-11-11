// The three hands (v8-03): who built this country, as a kit the other v8 work calls. installStrata(ctx) puts it on
// ctx.strata (main.js does, beside the v4 kit, before any module builds). The bible is briefs/v8/index.md.
//
//   elder     cyclopean blocks 2 m and up, triangles, no ornament but the etch, nothing at human scale
//   heliarch  coursed ashlar, round arches, hexagons, bronze gone to verdigris, ember glass; formal and symmetrical
//   late      lime plaster (cream, rose, saffron), tile (turquoise, pomegranate, cobalt), painted timber, cloth, lamps
//
// ctx.strata = {
//   on                     false under ?strata=0 (the v7 world: no placements, the Pomegranate House in grey stone)
//   HANDS                  ['elder', 'heliarch', 'late']
//   colors                 each hand's colours (parts.js COLORS)
//   parts[hand][name](B, M, o)   add a part into a structures Builder (src/structures/geo.js) at Matrix4 M, local frame:
//                          origin at the foot, +y up, +z out of the face. elder: notch, block. heliarch: roundel, drum,
//                          capital, slab. late: sign, finial, wall, screen, bracket, lamp, awning, bench, tiles.
//   sign(hand, B, M, o)    the hand's rendering of the sun in the saddle (elder notch, heliarch roundel, late sign)
//   builder()              a fresh Builder
//   mesh(B, hand, name)    B's geometry as a Mesh in the hand's material (elder: the kit's cyclopean stone, etched with
//                          the Span's triangles at block scale; heliarch and late: the structures' stone shader, whose
//                          vertex colours carry the plaster and tile), shadowed, not yet added to the scene
//   place(rec)             record a placement for the strata test: { hand, kind: 'sign' | 'spolia', name, x, y, z,
//                          face: [fx, fz] (the way it looks; for a wall mount), mount: 'ground' | 'wall' | 'top',
//                          foot (y it stands at, for 'ground'), from (the hand reused, for spolia) }
//   placements             every placement recorded so far
//   tick(t, flicker)       the shared stone material's glow (called by the strata module each frame)
// }
import * as THREE from 'three';
import { Builder } from '../structures/geo.js';
import { makeStoneMaterial } from '../structures/materials.js';
import { etch } from '../v4/span/etch.js';
import { PARTS, SIGNS, COLORS, SIGN } from './strata/parts.js';

export const HANDS = ['elder', 'heliarch', 'late'];

export function installStrata(ctx, url = new URL(location.href)) {
  let elderMat = null, stone = null;
  const materials = () => {
    if (!elderMat) {
      const m = ctx.kit.masonry({ color: '#8c7f70', course: 2.6, joint: 0.004, slab: 9, wear: 0.75, moss: 0.35 });
      etch(m.mat, { size: 1.7, amount: 0.62 });
      elderMat = m.mat;
      stone = makeStoneMaterial(ctx);
    }
    return { elder: elderMat, stone };
  };
  const placements = [];
  const S = {
    on: url.searchParams.get('strata') !== '0',
    HANDS, colors: COLORS, parts: PARTS, SIGN,
    sign: (hand, B, M, o) => SIGNS[hand](B, M, o),
    builder: () => new Builder(ctx.noise),
    materials,
    mesh(B, hand, name) {
      const m = materials();
      const mesh = new THREE.Mesh(B.build(), hand === 'elder' ? m.elder : m.stone.mat);
      mesh.name = name || `strata-${hand}`;
      mesh.castShadow = true; mesh.receiveShadow = true;
      return mesh;
    },
    place(rec) { placements.push(rec); return rec; },
    placements,
    tick(t, f) {
      if (!stone) return;
      stone.uniforms.uSTime.value = t;
      stone.uniforms.uGlyph.value = (0.8 + 0.2 * Math.sin(t * 0.21)) * (1 + (1 - f) * 1.6); // the ember glass flares as the sun gutters
      stone.uniforms.uWindow.value = (0.85 + 0.1 * Math.sin(t * 1.7) + 0.05 * Math.sin(t * 5.3)) * (0.7 + 0.3 * f);
    },
  };
  ctx.strata = S;
  return S;
}
