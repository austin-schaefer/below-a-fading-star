// The crystal and the door (v10-A1): acts-test.mjs's rows for the hand on the mother crystal (src/v10/crystal.js) and
// the knock at the Hypogeum's door (src/v10/door.js), called from tools/acts-test.mjs with its browser and check().
// Each act: not offered from far off or facing away, offered at its place, done (and the answer runs: for the crystal
// the print, the climb, the gutter it draws, the thread to the door and the lintel turned blue, its crystals; for the
// door the great ring lifted, three strikes, three answers, the glyph row read and turned, the hand in the light, the
// plate pushed out with its glyph kept), remembered after a reload and offered again, forgotten on a forget. The door's
// third visit: the row turns a whole turn. ?acts=0: the old ring as it was, no plate, no thread. Every wait is on the
// page's state with a long ceiling, so a slow frame rate only makes it slower.
export async function centralRows({ browser, base, check, watch }) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const open = async (tag, url, init) => {
    const c = await browser.newContext({ viewport: { width: 640, height: 360 } });
    if (init) await c.addInitScript(init);
    const p = await c.newPage(); watch(p, tag);
    await p.goto(url, { waitUntil: 'load', timeout: 60000 });
    await p.waitForFunction(() => document.body.classList.contains('ready') && window.__fp?.acts && window.__fp.hypogeum, null, { timeout: 300000 });
    await p.evaluate(() => { const fp = window.__fp; fp.events.dispatchEvent(new CustomEvent('begin')); document.getElementById('card').classList.add('hidden'); if (fp.sky?.flicker) fp.sky.flicker.next = 1e9; });
    return { c, p };
  };
  const waitFor = async (p, fn, arg, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await p.evaluate(fn, arg)) return true; await sleep(150); } return false; };
  const offered = (p) => p.evaluate(() => window.__fp.acts.offered?.def.id ?? null);
  const settle = async (p, want, ms = 4000) => { const t0 = Date.now(); let o; do { o = await offered(p); if ((o === want) === !!want || (!want && o === null)) return o; await sleep(150); } while (Date.now() - t0 < ms); return o; };

  // ---------------------------------------------------------------- the mother crystal
  const M = { x: 40, z: -265 }, ux = 0.772, uz = 0.635;
  const standCrystal = (p, r, turn = 0) => p.evaluate(([r, turn, M, ux, uz]) => {
    const fp = window.__fp, pl = fp.player;
    fp.controls.placeAt(M.x + ux * r, M.z + uz * r); pl.yaw = Math.atan2(ux, uz) + turn; pl.pitch = 0.05; pl.vel?.set(0, 0, 0);
  }, [r, turn, M, ux, uz]);
  const cURL = `${base}/?q=low&only=vegetation,ruins2,acts&pos=60,-245`;
  let { c, p } = await open('crystal', cURL);
  let s = await p.evaluate(() => window.__fp.motherAct.state());
  check('crystal: registered, nothing remembered, no ember, no thread', s.count === 0 && s.embers === 0 && !s.threadShown && s.lintel === 0, s);
  await standCrystal(p, 30); await sleep(1500);
  check('crystal: not offered 30 m off', (await offered(p)) === null);
  await standCrystal(p, 7.6, Math.PI); await sleep(1500);
  check('crystal: not offered at its foot facing away', (await offered(p)) === null);
  await standCrystal(p, 7.6); const o1 = await settle(p, 'mother-hand');
  const words = await p.evaluate(() => document.getElementById('act-words').textContent);
  check('crystal: offered at its foot facing it, with its words', o1 === 'mother-hand' && words === 'Lay your hand', { o1, words });
  await p.keyboard.press('KeyE'); await sleep(400);
  s = await p.evaluate(() => ({ ...window.__fp.motherAct.state(), hit: window.__fp.motherAct.hit }));
  check('crystal: E lays the hand: counted, the answer running, the print where the look meets the glass', s.count === 1 && s.t > 0 && s.hit === true, s);
  const gut = await waitFor(p, () => window.__fp.motherAct.gutters > 0 && window.__fp.sky.flicker.phase > 0, null, 60000);
  check('crystal: the sun gutters as the light reaches the top', gut);
  const ran = await waitFor(p, () => { const s = window.__fp.motherAct.state(); return s.thread >= 1 && s.lintel >= 1; }, null, 180000);
  s = await p.evaluate(() => window.__fp.motherAct.state());
  check('crystal: the thread runs to the Hypogeum\'s door (over 150 m), crystals along it, and its glyphs turn blue', ran && s.threadLen > 150 && s.threadShown && s.crystals > 40, s);
  await waitFor(p, () => window.__fp.motherAct.state().t < 0, null, 120000);
  s = await p.evaluate(() => window.__fp.motherAct.state());
  check('crystal: when it is over, one ember is left in the glass and nothing more is offered this visit', s.t < 0 && s.embers === 1 && (await offered(p)) === null, s);
  await p.reload({ waitUntil: 'load' });
  await p.waitForFunction(() => document.body.classList.contains('ready') && window.__fp?.motherAct, null, { timeout: 300000 });
  await p.evaluate(() => { document.getElementById('card').classList.add('hidden'); window.__fp.events.dispatchEvent(new CustomEvent('begin')); });
  await waitFor(p, () => window.__fp.motherAct.state().threadShown, null, 8000);
  s = await p.evaluate(() => window.__fp.motherAct.state());
  check('crystal: after a reload the ember, the thread and the blue lintel are there', s.count === 1 && s.embers === 1 && s.threadShown && s.lintel === 1, s);
  await standCrystal(p, 7.6);
  check('crystal: and the hand is offered again (a new visit)', (await settle(p, 'mother-hand')) === 'mother-hand');
  await p.evaluate(() => window.__fp.acts.forget()); await sleep(200);
  s = await p.evaluate(() => window.__fp.motherAct.state());
  check('crystal: forgotten: no ember, no thread, the lintel as it was', s.embers === 0 && !s.threadShown && s.lintel === 0, s);
  await c.close();

  // ---------------------------------------------------------------- the door
  const standDoor = (p, d, yaw = -Math.PI / 2, pitch = -0.3) => p.evaluate(([d, yaw, pitch]) => {
    const fp = window.__fp, D = fp.hypogeum.door, pl = fp.player;
    fp.controls.placeAt(D.x - d, D.z); pl.yaw = yaw; pl.pitch = pitch; pl.vel?.set(0, 0, 0);
  }, [d, yaw, pitch]);
  const dURL = `${base}/?q=low&only=ruins2,acts&pos=215,-112`;
  ({ c, p } = await open('door', dURL));
  s = await p.evaluate(() => window.__fp.hypogeumAct.state());
  check('door: registered, no plate on a fresh page, the great ring hung in the old one\'s place', s.count === 0 && s.plate === false && !(await p.evaluate(() => window.__fp.hypogeum.ring.visible)) && !!(await p.evaluate(() => window.__fp.scene.getObjectByName('act-door-ring'))), { count: s.count, plate: s.plate });
  await standDoor(p, 7); await sleep(1500);
  check('door: not offered from the head of the stair', (await offered(p)) === null);
  await standDoor(p, 1.9, Math.PI / 2); await sleep(1500);
  check('door: not offered at its foot facing away', (await offered(p)) === null);
  await standDoor(p, 1.9); const o2 = await settle(p, 'hypogeum-door');
  check('door: offered in front of it, "Knock"', o2 === 'hypogeum-door' && (await p.evaluate(() => document.getElementById('act-words').textContent)) === 'Knock', o2);
  await p.keyboard.press('KeyE');
  const done = await waitFor(p, () => window.__fp.hypogeumAct.state().t < 0 && window.__fp.hypogeumAct.strikes === 3, null, 240000);
  s = await p.evaluate(() => { const s = window.__fp.hypogeumAct.state(); return { count: s.count, strikes: s.strikes, answers: s.answers, ringMax: s.ringMax, read: s.read, hand: s.hand, plate: s.plate, spun: s.spun, stored: JSON.parse(localStorage.getItem('fp-acts') || '{}').marks?.['hypogeum-door'] }; });
  check('door: E knocks: the great ring lifted, three strikes, three answers, the row read and turned one place, the hand in the light, the plate out with its glyph kept', done && s.count === 1 && s.strikes === 3 && s.answers === 3 && s.ringMax > 0.9 && s.read > 0.9 && s.spun === 1 && s.hand > 0.9 && s.plate && Number.isInteger(s.stored?.data?.glyph), s);
  await p.reload({ waitUntil: 'load' });
  await p.waitForFunction(() => document.body.classList.contains('ready') && window.__fp?.hypogeumAct, null, { timeout: 300000 });
  await p.evaluate(() => { document.getElementById('card').classList.add('hidden'); window.__fp.events.dispatchEvent(new CustomEvent('begin')); });
  await standDoor(p, 1.9);
  s = await p.evaluate(() => window.__fp.hypogeumAct.state());
  check('door: after a reload the plate lies there, and the knock is offered again', s.plate === true && (await settle(p, 'hypogeum-door')) === 'hypogeum-door', { plate: s.plate });
  await p.evaluate(() => window.__fp.acts.forget()); await sleep(200);
  check('door: forgotten: no plate', (await p.evaluate(() => window.__fp.hypogeumAct.state().plate)) === false);
  await c.close();
  // the third visit
  ({ c, p } = await open('door3', dURL, () => { try { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('fp-acts', JSON.stringify({ v: 1, marks: { 'hypogeum-door': { n: 2, last: 1, data: { glyph: 5 } } } })); sessionStorage.setItem('seeded', '1'); } } catch (e) { /* */ } }));
  s = await p.evaluate(() => window.__fp.hypogeumAct.state());
  check('door: a return after two knocks: the plate lies there', s.plate === true && s.n === 2, { plate: s.plate, n: s.n });
  await standDoor(p, 1.9); await settle(p, 'hypogeum-door');
  await p.keyboard.press('KeyE');
  await waitFor(p, () => window.__fp.hypogeumAct.state().t < 0 && window.__fp.hypogeumAct.strikes === 3, null, 240000);
  s = await p.evaluate(() => window.__fp.hypogeumAct.state());
  check('door: the third knock: the row turns a whole turn (eleven places) and the plate comes out again', s.count === 3 && s.spun === 11 && s.plate === true, { count: s.count, spun: s.spun, plate: s.plate });
  await c.close();
  // ?acts=0: the door as it was
  ({ c, p } = await open('door0', `${base}/?q=low&acts=0&only=vegetation,ruins2,acts&pos=215,-112`));
  s = await p.evaluate(() => { const fp = window.__fp, H = fp.hypogeum; return { act: !!fp.hypogeumAct, ring: H.ring.visible && H.ring.material === H.doorMesh.material, great: !!fp.scene.getObjectByName('act-door-ring'), plate: !!fp.scene.getObjectByName('act-door-plate'), thread: !!fp.scene.getObjectByName('act-crystal-thread-group')?.visible }; });
  check('?acts=0: the old ring in its own material, no great ring, no plate, no thread', !s.act && s.ring && !s.great && !s.plate && !s.thread, s);
  await c.close();
}
