// The sketches (v17.1, issue #23, round one): four 30-second pieces written note by note for the owner's ear, each
// for a place, each with its own metre, key, opening and instruments. They are not tracks: the director never plays
// them and nothing in the walk imports this folder; listen.html does, and tools/sketch-render.mjs.
//
//   SKETCHES            the four, in the page's order: { name, place, line, bpm, meter, tempo?, voices } (notation.js)
//   instrumentsOf(s)    the sampled instruments its voices need
//   playSketch(ac, dest, s, variant)   → the player's handle, after its samples are loaded ('sampled'), or at once ('osc')
//   renderSketch(name, o)              the same through an OfflineAudioContext → { channels, sr, seconds, info }
// Both go through the real player (player.js play) with a pool of 24 (plucked notes ring over each other) and the
// tape's lowpass at 5 kHz, where the walk's tracks have 3: recorded instruments lose their attack under 3.
import { play, allocate } from '../player.js';
import { instrumentOf, loadSamples } from '../sampler.js';
import { eventsOf, partText } from './notation.js';
import { makeRoom, ROOM_TAIL } from './room.js';
import moor from './moor.js';
import keep from './keep.js';
import garden from './garden.js';
import dry from './dry.js';

export const SKETCHES = [moor, keep, garden, dry];
export const BY_NAME = Object.fromEntries(SKETCHES.map((s) => [s.name, s]));
export const AB = 'moor'; // the sketch every voice of which has an oscillator patch: the page's A/B pair
export const PLAY = { pool: 24, tapeLp: 5000, quality: 'high' };
export { eventsOf, partText, makeRoom };

export const instrumentsOf = (sketch) => [...new Set(sketch.voices.map((v) => instrumentOf(v.patch)).filter(Boolean))];

export async function playSketch(ac, dest, sketch, variant = 'sampled') {
  if (variant === 'sampled') await loadSamples(ac, instrumentsOf(sketch));
  const { events, voices } = eventsOf(sketch, variant);
  return play(events, { ac, dest, voices, at: ac.currentTime + 0.15, ...PLAY });
}

// o: { variant, sr, room (true: through the page's room and gain, what the owner hears; false: the bare stem), solo: [voice ids] }
export async function renderSketch(name, { variant = 'sampled', sr = 48000, room = true, solo = null } = {}) {
  const sketch = BY_NAME[name];
  let { events, voices, seconds } = eventsOf(sketch, variant);
  if (solo) events = events.filter((e) => solo.includes(e.voice));
  const plan = allocate(events, voices, PLAY.pool);
  const frames = Math.ceil((plan.length + 0.5 + (room ? ROOM_TAIL : 0)) * sr);
  const ac = new OfflineAudioContext(2, frames, sr);
  if (variant === 'sampled') await loadSamples(ac, instrumentsOf(sketch));
  const h = play(events, { ac, dest: room ? makeRoom(ac, ac.destination).input : ac.destination, voices, at: 0, ...PLAY });
  const buf = await ac.startRendering();
  return { channels: [buf.getChannelData(0), buf.getChannelData(1)], sr, seconds: frames / sr,
    info: { name, variant, written: seconds, notes: events.length, plan: h.plan, dropped: h.dropped, stolen: h.stolen, ids: voices.map((v) => [v.id, v.patch]) } };
}
