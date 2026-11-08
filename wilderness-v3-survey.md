# v3 survey: where the frame time goes (read from the code at 2009b01)

Input for the v3 stage 2 and 3 agents. Counts are for q=high and come from the code; "?" means the count is only logged at run time. Paths are relative to `src/`.

## 1. `registerUpdate` callbacks

| file:line | animates | distance gate | per-frame alloc |
|---|---|---|---|
| vegetation.js:30 | wind time, grass/plant chunk packing, tree LOD, fungus visibility, glow | plant chunks fade at 125–160 m and are frustum-tested; tree LOD 24/72 m; fungi 90 m; `stream()` scans all 729 chunks every frame (plants.js:586) | only on repack: array literal and sort closure (plants.js:369,385) |
| rocks.js:222 | repacks rock instances | only after the camera moves >6 m; boulder near/far swap at 140 m | none |
| structures.js:166 | glyph/window uniforms, banner time, tower and taverna light intensity, court pit | none | none |
| water.js:245, :262 | tarn/fen ripples; river, fall, mist, pool uniforms | none | none |
| particles.js:274 | 20 corpse-candles + reflections; picks which 2 lights to use (O(n²)) | lights only ≤36 m | none |
| particles.js:501, :702 | gust and shared uniforms | – | none |
| fauna/wings.js:158 (8) | wings | none | none |
| fauna/grazers.js:223 (herds 6+5) | herd AI | none | none |
| fauna/deodand.js:128 | stalker | none | closures every 2.2 s (:101, :116) |
| fauna/small.js:60 / :205 / :270 | moths 9 / crows 7 / fish rings 12 | moths skip >260 m; others none | fish: `[x,z]` every 5–13 s |
| fauna/life.js:77/128/185/232 | flush 6 / bats 10 / heron / eel | flush hides >70 m; bats always simulated, visible <330 m; heron none | none |
| fauna/rooks.js:208 (×2) | rooks / gibbet crows | skip >260 m | none |
| fauna/lamps.js:131 | moths at the lamps | skip >140 m | `scene.traverse` once a second until the lamps are found |
| fauna/gutterbats.js:101 (34) | bats | only while out; hidden but simulated >420 m | none |
| fauna/beetles.js:169 (26) | beetles | skip >80 m | none |
| fauna/uncanny/cloak.js:357 | eye gaze and lids | skip >160 m | none |
| fauna/uncanny/slinker.js:235, wader.js:147, tarn.js:162 | creatures | state machine only (none / gaze <260 m / none) | none |
| fauna/uncanny/biomesh.js:617 | 4 colonies | skip > radius+110; sliced ≤900 per frame | none |
| fauna/uncanny/traveller.js:403 | wagon, wheels, rope rebuilt every frame | none | none |
| audio.js:977 | audio mix | 10 Hz | `biomeAt` returns a new object (terrain.js:429) |
| skylife.js:67 | lattices, meteors, remnants, parhelion, vigilant, omens | n/a (sky) | none |
| v2/flora.js:329 | sward | player tests at 10 Hz near the sward | none |
| v2/riverlife.js:760 | 14 pedlars, glints, Wrong Colour, spray | pedlars none; spray <40 m | none |
| v2/inhabitants/galley.js:277 | hull + 306-vertex wake | none | none |
| v2/inhabitants/guest.js:213 | gaze flush | <25 m | none |
| v2/inhabitants/menology.js:415 (48) | lizards | AI skipped > R+140, but all 48 matrices still written | none |
| v2/ruins/carillon.js:129; hypogeum.js:179,250,344; cutting.js:328; util.js:202 | uniforms and trigger tests | – | none |

## 2. Point lights

No SpotLights. Three.js does not cull lights: all 7 point lights (even at intensity 0) cost every lit fragment.

| file:line | where | intensity / dist / decay | tied to flicker |
|---|---|---|---|
| structures/tower.js:68 | Armiger's Tower window (−250,−135) | 6 / 11 / 2 | yes (:71) |
| structures/taverna.js:265 ×2 (lanterns :82, :193) | Pomegranate House (95,−45) | 3.2·noise / 12 / 2 | yes (:269) |
| particles.js:207 ×2 | follow the nearest wisps, fen (70,160) | 0–30 / 18 / 2 | inverse |
| fauna/uncanny/traveller.js:246 | wagon lantern, moving | 2.6 / 9 / 2 | no; always on, no distance gate |
| v2/riverlife.js:695 | Wrong Colour eddy (171,242) | ~32–96 / 20 / 2 | inverse |

Also an AmbientLight flash at skylife/meteors.js:142.

## 3. Moving shadow casters

Sun shadow map 4096², PCFSoft, ±95 m, follows the player (main.js:72–79). `autoUpdate` is on: every caster, static or not, is redrawn each frame.

- fauna/grazers.js:47: 4 instanced meshes per herd (6/6/24/24 and 5/5/20/20)
- fauna/deodand.js:36
- fauna/life.js:156–157 (heron body and legs)
- fauna/uncanny/tarn.js:82, :107; wader.js:80, :145; slinker.js:92, :228; cloak.js:208
- fauna/uncanny/traveller.js:232 (body/head/arm/wagon), :242 (wheels), :264 (rope)
- v2/inhabitants/galley.js:165 (hull)
- structures.js:137 (banners: vertex-animated, alpha-tested depth material)

## 4. Alpha-tested and transparent materials

- alphaTest: tree leaves/batch (vegetation/trees.js:843, count ?); banners (structures/materials.js:198, depth :251).
- Dither `discard`: wader.js:75, slinker.js:80.
- Grass, reeds and other plants are opaque Lambert (plants.js:228). Instance caps: grass 60k, heather 24k, bracken 16k, flowers 12k, fleshy 6k, reeds 20k.
- Particles (particles.js:29, all transparent, frustumCulled off): dust 1400, ash 1100, wisps 40, fireflies 140, mist 84 large billboards (:395, two taps each, heavy overdraw), frost 600, seeds 110, midges 700, moths 48, bubbles 70, litter 120.
- Water (transparent + discard): water.js:233/99 (tarn, fen); river.js:355/69–77 (ribbon), :443 (fall), :472 (14 mist quads), :235; pool.js:163/81.
- v2/riverlife.js: pedlars (:144, 14, transparent MeshStandard); glints (:542, 62); Wrong Colour (:675); halo (:686); spray (:732, 600); discards at :253, :296, :383.
- Other: lattice filaments (vegetation/lattice.js:262); tarn rings (3); fish rings (small.js:214, 12); biomesh runners (biomesh.js:405, 240); galley wake (:150); full-screen guest flush (guest.js:133); ruins haze (v2/ruins/util.js:185).
- Skylife: lattices.js:223, meteors.js:122/135 (16+10), omens.js:51 (10 + belt 1100), parhelion.js:249, remnants.js:348/364, vigilant.js:200.

## 5. Post chain and render targets

- post.js: RenderPass → UnrealBloom (0.38/0.55/0.9, full resolution) → grade ShaderPass → OutputPass.
- The grade pass's god-ray loop takes 40 samples and only runs when the sun is in view.
- `uResolution` is set without the pixel ratio.
- No other render targets: no `renderer.render` outside the composer, no reflections, CubeCamera or PMREM.

## 6. Expensive fragment shaders

- sky.js:49: 5-octave fbm called 6 times over the whole dome, ungated (sun mottle and spots run on every sky pixel), plus 2 star layers: about 30 value-noise calls per pixel.
- skylife/common.js:32: 5-octave `sl_fbm` per fragment through `sl_air`/`sl_trans`, used in lattices.js:45,71, meteors.js:48,90, omens.js:36, remnants.js:51,169,188.
- terrain.js:594–658: colour uses 3 triplanar calls (9 fetches); bump `fpBumpWorld` does 4 heights × 2 triplanar = 24 more. About 33 fetches per pixel over all terrain; the bump runs even past 60 m where its strength is 0. Distance is only a scale, never a branch.
- rocks.js:50–71: `rfbm` (3 octaves of 3D value noise) called 5 times, about 120 hashes per pixel; no distance term.
- structures/materials.js:20: `fpFbm` (3 octaves) ×3–4, about 6 `fpVn`, a 12-slot rust loop (:112); `sNear` 18–70 m used only for the bump. materials.js:314: court pit interior, 14-step loop.
- Water: water.js:109 ripple loop ×6 and :172 3×3 pads; river.js:131 rock-wake loop ×16; pool.js:41 3×3 cells.
- atmosphere.js fog_fragment: extra exp and pow on every fogged fragment.

## 7. Per-frame `needsUpdate`

No textures update per frame. Full-buffer uploads (no update range) marked *.

- Repack or event only: plants.js:385; rocks.js:218 (moves >6 m)*; flora.js:363 (10 Hz, dirty range); meteors.js:205,223; vigilant.js:223.
- Biggest: biomesh.js:610–612, up to 2400 instances per colony* every frame while in range; runners 240 (:538).
- Every frame: particles.js:247 (40); lamps.js:129 (≤32); gutterbats.js:99 (34); rooks.js:206 (12); wings.js:156 (8); small.js:58/203/267 (9/7/12); life.js:74/126 (6/10); grazers.js:220 (60+50); beetles.js:167 (26); tarn.js:160 (3); traveller.js:379 (4 wheels), :400 (rope, 105 vertices); cloak.js:355 (?); menology.js:413 (48); galley.js:275 (306 vertices); riverlife.js:634 (14+62); remnants.js:321 (22), :415 (3); omens.js:200 (10), belt :191 (1100 while visible).
