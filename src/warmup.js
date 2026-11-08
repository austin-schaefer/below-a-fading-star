// Warm-up (behind the title card, after the programs are compiled). three uploads a geometry's buffers the
// first time its object is drawn and a texture the first time a drawn material binds it, and the frame that
// does so stalls: turning in the wood until the Great Span came into view uploaded 74 geometries and 7
// textures in a few frames, each frame 20-40x the median. compileAsync builds programs only; it neither
// draws nor binds, and every frame culls what is outside the view and skips what is hidden (a tree level no
// cell shows yet, a creature not yet out, the gibbet's crows). So this draws the scene once with every object
// shown and frustum culling off (per-instance culling off on the batched meshes too), into the same buffer the
// scene pass draws to (so it asks for the same programs) but only its 4x4 corner, with the shadow map drawn
// in the same pass so the shadow pass's depth-material variants compile, the far creatures casting for it
// too; then every texture a material holds, drawn or not, goes through renderer.initTexture. Everything is
// restored after. The frame after this redraws the shadow map and the scene buffer from scratch, so the
// picture is the one it would have been. ?warmup=0 leaves each upload to its first draw.
export function warmUp(ctx) {
  const { renderer, scene, camera } = ctx;
  const info = renderer.info, t0 = performance.now();
  const before = { geo: info.memory.geometries, tex: info.memory.textures, prog: info.programs.length };
  const saved = [];
  scene.traverse((o) => {
    // lights stay as they are: a light shown would change every program's light count
    if (o.visible === false && !o.isLight) { saved.push([o, 'visible', false]); o.visible = true; }
    if (o.frustumCulled === true) { saved.push([o, 'frustumCulled', true]); o.frustumCulled = false; }
    if (o.isBatchedMesh && o.perObjectFrustumCulled) { saved.push([o, 'perObjectFrustumCulled', true]); o.perObjectFrustumCulled = false; }
  });
  // the shadow cadence stops creatures beyond 40 m casting; for this pass they cast
  const casters = ctx.shadowCadence?.casters || [];
  const far = casters.map((c) => c.far);
  for (const c of casters) c.far = false;

  const rt = ctx.post.composer.readBuffer;
  const vp = rt.viewport.clone(), sc = rt.scissor.clone(), st = rt.scissorTest;
  rt.viewport.set(0, 0, 4, 4); rt.scissor.set(0, 0, 4, 4); rt.scissorTest = true;
  renderer.shadowMap.needsUpdate = true;
  renderer.setRenderTarget(rt);
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);
  rt.viewport.copy(vp); rt.scissor.copy(sc); rt.scissorTest = st;
  renderer.shadowMap.needsUpdate = true;
  casters.forEach((c, i) => { c.far = far[i]; });
  for (const [o, k, v] of saved) o[k] = v;

  // textures the draw did not bind: a material's maps and uniforms its program does not sample yet
  const seen = new Set();
  const take = (t) => { if (t?.isTexture && !t.isRenderTargetTexture && !seen.has(t)) { seen.add(t); if (t.image || t.isDataTexture) renderer.initTexture(t); } };
  scene.traverse((o) => {
    const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    for (const m of ms) {
      for (const k in m) take(m[k]);
      if (m.uniforms) for (const k in m.uniforms) { const v = m.uniforms[k]?.value; if (Array.isArray(v)) v.forEach(take); else take(v); }
    }
  });
  if (scene.background?.isTexture) take(scene.background);
  if (scene.environment?.isTexture) take(scene.environment);

  const res = { ms: +(performance.now() - t0).toFixed(0), geometries: info.memory.geometries - before.geo, textures: info.memory.textures - before.tex, programs: info.programs.length - before.prog };
  ctx.warmup = res;
  return res;
}
