# Contrast survey: before

`node tools/contrast-survey.mjs http://localhost:8162 --q=medium`, 2026-11-11. L mean luma, S mean saturation, hue the dominant hue (°), blades the share of the lower half covered by low plants. Margins against the cropped common's downward frame: L 0.035, S 0.05, hue 20°, blades 0.15.

| place | at | region | eye L | eye S | eye hue | eye blades | down L | down S | down hue | down blades | apart from common (down) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| common | -15,50 | moor | 0.204 | 0.369 | 262.5 | 0.161 | 0.236 | 0.32 | 352.5 | 0.247 | - |
| moor | -70,-95 | moor | 0.216 | 0.327 | 262.5 | 0.255 | 0.181 | 0.328 | 262.5 | 0.269 | L, hue |
| bletting | 185,-70 | bletting | 0.272 | 0.333 | 7.5 | 0.324 | 0.223 | 0.336 | 337.5 | 0.368 | none |
| highLing | 262,-30 | highLing | 0.195 | 0.396 | 292.5 | 0.162 | 0.18 | 0.41 | 292.5 | 0.111 | L, S, hue |
| demesne | 40,-38 | demesne | 0.224 | 0.312 | 262.5 | 0.079 | 0.173 | 0.293 | 277.5 | 0.085 | L, hue, blades |
| lynchets | -180,-95 | lynchets | 0.193 | 0.306 | 247.5 | 0.109 | 0.199 | 0.242 | 322.5 | 0.074 | L, S, hue, blades |
| wood | -185,118 | wood | 0.127 | 0.47 | 247.5 | 0.018 | 0.109 | 0.507 | 247.5 | 0.011 | L, S, hue, blades |
| fen | 40,135 | fen | 0.212 | 0.391 | 247.5 | 0.13 | 0.155 | 0.447 | 247.5 | 0 | L, S, hue, blades |
| adust | -275,-15 | adust | 0.186 | 0.432 | 337.5 | 0.001 | 0.168 | 0.463 | 322.5 | 0 | L, S, hue, blades |
| saltings | 45,246 | saltings | 0.408 | 0.303 | 322.5 | 0.036 | 0.506 | 0.266 | 322.5 | 0 | L, S, hue, blades |
| outwash | 25,-192 | outwash | 0.273 | 0.374 | 262.5 | 0.015 | 0.261 | 0.389 | 262.5 | 0.012 | S, hue, blades |
| strandline | -60,166 | strandline | 0.167 | 0.45 | 247.5 | 0.063 | 0.096 | 0.554 | 247.5 | 0.017 | L, S, hue, blades |
| house | 118,-70 | bletting | 0.222 | 0.35 | 277.5 | 0.187 | 0.195 | 0.358 | 322.5 | 0.261 | L, hue |
| spawn | 2,35 | moor | 0.262 | 0.347 | 277.5 | 0.108 | 0.188 | 0.405 | 277.5 | 0.176 | - |
| stones | -150,-40 | moor | 0.244 | 0.358 | 262.5 | 0.053 | 0.263 | 0.35 | 262.5 | 0.02 | - |
| court | -40,-128 | moor | 0.185 | 0.399 | 262.5 | 0.143 | 0.179 | 0.398 | 277.5 | 0.162 | - |
| arcature | 140,48 | moor | 0.226 | 0.327 | 322.5 | 0.277 | 0.227 | 0.292 | 322.5 | 0.234 | - |
| tower | -232,-120 | moor | 0.174 | 0.411 | 247.5 | 0.33 | 0.18 | 0.383 | 262.5 | 0.298 | - |
| graves | 40,262 | moor | 0.246 | 0.327 | 262.5 | 0.185 | 0.174 | 0.371 | 262.5 | 0.242 | - |

Gate: 11 regions differ from the common in two or more numbers (needs 4): moor, highLing, demesne, lynchets, wood, fen, adust, saltings, outwash, strandline, house. Pairs of places no number tells apart: 3 (at most 1): common~bletting, bletting~house, wood~strandline. FAIL.
