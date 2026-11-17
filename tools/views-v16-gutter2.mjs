#!/usr/bin/env node
// Writes tools/views-v16-gutter2.json (v16-S2): lit and guttered pairs (flicker.hold 1, then 0.3) for the answers of
// the gutter's second round, each from a stand about 15 m off what answers (the brief: plain at a glance from 15 m).
// A view's target is found in the page at render time (an act's lure, a herd, a mesh's bounds), the walker set `d` m
// off it at bearing `a` (radians; the walker looks along -sin a, -cos a) and the camera aimed at it.
// Usage: node tools/views-v16-gutter2.mjs && node tools/views.mjs tools/views-v16-gutter2.json shots/wip v16-S2-p low
import { writeFileSync } from 'node:fs';
const T = {
  moths: "(()=>{const s=fp.acts.lure.state().find((q)=>q.id==='halt-tally');return [s.at.x,s.at.y,s.at.z];})()",
  coheirs: "[-45, fp.terrain.heightAt(-45,160)+0.8, 160]",
  rooks: "[198, fp.terrain.heightAt(198,-130)+5, -130]",
  grazers: "[fp.grazers.herd.x, fp.terrain.heightAt(fp.grazers.herd.x, fp.grazers.herd.z)+1.2, fp.grazers.herd.z]",
  tube: "(()=>{const m=fp.scene.getObjectByName('lappet-ways-glass');m.geometry.computeBoundingBox();const c=m.geometry.boundingBox.getCenter(new m.position.constructor()).applyMatrix4(m.matrixWorld);return [c.x,c.y,c.z];})()",
  halt: "[fp.waystation.globe.x, fp.waystation.globe.y, fp.waystation.globe.z]",
};
const aim = (key, d, a, dy = 0) => ({
  js: `{const fp=window.__fp,p=fp.player,[tx,ty,tz]=${T[key]},x=tx+Math.sin(${a})*${d},z=tz+Math.cos(${a})*${d};p.pos.set(x,fp.terrain.heightAt(x,z)+p.eye+${dy},z);p.yaw=${a};p.pitch=0;window.__T=[tx,ty,tz];}`,
  pre: `{const c=window.__fp.camera,[tx,ty,tz]=window.__T;c.lookAt(tx,ty,tz);c.updateMatrixWorld();}`,
});
const views = [];
const pair = (name, x, z, o) => { for (const [s, h] of [['lit', 1], ['gut', 0.3]]) { const v = { name: `${name}-${s}`, x, z, yaw: 0, pitch: 0, settle: o.settle ?? 3000, ...o }; v.js = `window.__fp.sky.flicker.hold=${h};` + (o.js || ''); delete v.settle; v.settle = o.settle ?? 3000; views.push(v); } };
pair('moths15', -61, 3.1, { ...aim('moths', 15, 1.186) });
pair('coheirs', -45, 145, { ...aim('coheirs', 7, 0) });
pair('rooks', 173, -125, { ...aim('rooks', 26, -1.4, 0) });
pair('grazers', 22, 110, { ...aim('grazers', 30, 0.3), settle: 5000 });
pair('tube', 80, -20, { ...aim('tube', 18, 1.2, 0) });
pair('halt', -63, 15, { ...aim('halt', 16, 0.4) });
pair('tarn', -35, 100, { yaw: 1.75, pitch: -0.3, dy: 4 });
pair('fen', 70, 92, { yaw: Math.PI, pitch: -0.3, dy: 5 });
pair('laidsun', 225.9, 118.56, { yaw: 2.66, pitch: -0.36, js: 'window.__fp.controls.placeAt(225.9,118.56,-28); window.__fp.player.yaw=2.66; window.__fp.player.pitch=-0.36;' });
pair('stair', 275, 0, { yaw: -0.965, pitch: 0.18 });
writeFileSync(new URL('./views-v16-gutter2.json', import.meta.url), JSON.stringify(views, null, 1));
console.log(`${views.length} views`);
