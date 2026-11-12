# Brief: v11.1 W3, the Escarpment Lamps near to

Goal: from far off the Lamps are a lit city climbing a ravine, and that works. Inside about 150 m the windows are small flat lit squares and the string of lights along the ledges reads as beads. Up close a visitor should see openings in old stone with warm light inside them: a reveal with depth, a sill or a lintel, the light uneven (brighter low, a shadow of something within, some shuttered, some guttering), varied sizes and a few arches or slots. The ledge string becomes what it is: lamps on posts or brackets along a path, unevenly spaced, some dark. Not the first idea; something worth the walk to the foot of the ravine.

Read: `plans/wilderness-v11.md` Status (M3, F2), `briefs/v11/brief-v11-M3-squares.md`, `visual-art` (architecture and light references). Keep F2's caps: ember and amber, dimmer and smaller inside 250 m, no lilac-white.
Files: `src/v5/lamps.js` only. Budget: say draw calls and triangles before and after; no new point lights.
Done when: views at 400, 150, 60 and 20 m, before and after (`tools/views-v5-lamps*.json` and the Lamps' Go-to entry); the far view not worse; `ONLY=perf,settings,edges tools/suite.sh <port>` green.
