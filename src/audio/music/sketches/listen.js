// listen.html's script: one play button a sketch and the A/B pair, each played live through the real player
// (index.js playSketch) into the page's room (room.js). One piece sounds at a time; pressing the one that is
// playing stops it. Nothing is fetched until a button is pressed: then the AudioContext is made (inside the press,
// as phones require) and that sketch's samples are loaded. window.__listen is for tools/listen-test.mjs.
import { SKETCHES, BY_NAME, AB, playSketch, makeRoom } from './index.js';

const $ = (sel, el = document) => el.querySelector(sel);
const list = $('#sketches'), pair = $('#pair'), status = $('#status');
let ac = null, room = null, current = null; // current: { h, button }
const state = (window.__listen = { ac: null, tap: null, playing: null, error: null });

function row(sketch, variant, label) {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'play'; b.dataset.sketch = sketch.name; b.dataset.variant = variant;
  b.innerHTML = '<span class="word">play</span><span class="bar"><i></i></span><span class="time"></span>';
  b.setAttribute('aria-label', `Play ${label}`);
  b.addEventListener('click', () => press(b, sketch, variant, label));
  return b;
}

for (const s of SKETCHES) {
  const li = document.createElement('li');
  li.innerHTML = `<h2>${s.place}</h2><p>${s.line}</p>`;
  li.append(row(s, 'sampled', s.place));
  list.append(li);
}
for (const [variant, name, text] of [['osc', 'A', 'the oscillator instruments the walk’s music uses now'], ['sampled', 'B', 'recorded instruments']]) {
  const li = document.createElement('li');
  li.innerHTML = `<h2>${name}</h2><p>${text[0].toUpperCase() + text.slice(1)}.</p>`;
  li.append(row(BY_NAME[AB], variant, `${name}, ${text}`));
  pair.append(li);
}

function idle(b) { b.classList.remove('on', 'wait'); $('.word', b).textContent = 'play'; $('i', b).style.width = '0'; $('.time', b).textContent = ''; }
const clock = (s) => `0:${String(Math.max(0, Math.floor(s))).padStart(2, '0')}`;
function stop() {
  if (!current) return;
  const { h, button } = current; current = null; state.playing = null;
  idle(button);
  h?.stop(0.4);
}
async function press(b, sketch, variant, label) {
  const same = current && current.button === b;
  stop();
  if (same) return;
  if (!ac) {
    ac = state.ac = new (window.AudioContext || window.webkitAudioContext)();
    room = makeRoom(ac, ac.destination); state.tap = room.tap;
  }
  ac.resume();
  const mine = (current = { h: null, button: b });
  b.classList.add('wait'); $('.word', b).textContent = 'a moment';
  status.textContent = '';
  try {
    const h = await playSketch(ac, room.input, sketch, variant);
    if (current !== mine) { h.stop(0.05); return; } // another button was pressed while the samples loaded
    mine.h = h; state.playing = `${sketch.name}/${variant}`;
    b.classList.remove('wait'); b.classList.add('on'); $('.word', b).textContent = 'stop';
    const fill = $('i', b), time = $('.time', b);
    let shown = -1;
    const tick = () => {
      if (current !== mine) return;
      fill.style.width = `${Math.max(0, Math.min(1, h.t / h.length)) * 100}%`;
      const sec = Math.floor(h.t); if (sec !== shown) { shown = sec; time.textContent = clock(h.length - h.t); } // what is left
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    h.done.then(() => { if (current === mine) { current = null; state.playing = null; idle(b); } });
  } catch (e) {
    if (current === mine) current = null;
    idle(b); state.error = String(e);
    status.textContent = `${label} would not play: ${e.message || e}`;
  }
}
