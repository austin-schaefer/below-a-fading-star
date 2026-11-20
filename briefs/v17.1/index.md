# v17.1: dispatch

One batch, four agents at once, no dependencies but one seam (the panel's focus: Q1 builds it, Q2 drives it).

| Brief | Issue | Branch | Port | Model | Owns |
|---|---|---|---|---|---|
| Q1 the map | #70 | `issue-1751-map` | 8161 | opus | `src/settings.js`, the panel |
| Q2 a controller | #72 | `issue-1752-gamepad` | 8162 | opus | `src/controls.js`, input, hints |
| Q3 the study page | #77 | `issue-1753-study` | 8163 | opus | `study.html`, `src/study/`, registration |
| Q4 music sketches | #23 | `issue-1754-music-sketches` | 8164 | fable | `src/audio/music/`, `listen.html`, `vendor/samples/` |

Merge order: Q3 and Q4 as they come (they touch nothing shared); Q1 before Q2, then Q2 merges `next` and its test drives the map. Then the suite on `next`, whole (controls are shared code), and the release.

After it is live: v18, the forest (#18), opened as its own milestone.
