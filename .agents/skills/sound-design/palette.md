# The palette: what this world sounds like

"Below a Fading Star" is Vance's Dying Earth over a HoMM overworld: baroque and worn, never cartoon or generic fantasy. The sun is a swollen red ember low in the west that gutters every minute or so. The air is thick, the land is old and was once rich, nothing is new. The sound follows the same rules as the picture: colour from a few sources against a dark ground; silhouettes over texture; a few unnatural lights.

## The ground tone

- **Dark and far.** The bed is the sound of a huge, empty, cooling land: low wind over heather, air that carries far calls as diffuse murmurs with the top rolled off. No bright noise. No insects buzzing at your ear unless you are standing in the fen.
- **Breathing, not droning.** The wind gusts and rests; the rests are long enough to notice. Between gusts you hear your own steps and the nearest small thing.
- **The gutter is the downbeat.** When the sun dips, the bed sinks, a low drone comes up and detunes slightly, the living react (the peafowl cry, the bats leave, the Leerie's row lights). It is the only global event; everything else belongs to a place.
- **Minor, old, slightly out of true.** The tonal centre is D (the Carillon Flags' just minor pentatonic on D3: D, F, G, A, C). Every pitched sound sits in it or on its fifth: the drone on D and A (an octave or two down), the Lattice hum on the fifth or the octave, the stones' chord within it. Bells, hums and cries are a little out of true (a few cents, per object, fixed), because everything here is worn. Beating is slow (0.5–3 Hz), never a buzz.
- **Metal and stone, not wood and plastic.** Struck things ring inharmonically and long; moving things grind and groan (stick-slip: the glyph lintel, the hawser); flames breathe and tick. The materials are bronze, iron, basalt, glass, ice.

## The emitters (what exists, where it sounds from)

Every region has its own small life, and its own reverb:

| place | space | detail (place-bound, intermittent) | punctuation (rare) |
|---|---|---|---|
| open moor, heath | open: short dark reverb, wind fullest | a far call from a specific tor or wood edge once a minute or less; the grouse flush when you walk into it | the deodand's counting click; the rooks lifting |
| the wood | wood: very short, dense, dark; wind almost gone, high and distant | leaves, a twig, something small moving once in a while, the Repetend echoing your step | the slinker seen |
| fen, marsh, Saltings | open but wet: a short bright slap on top | frogs and bubbles in bouts with rests, waders leaving, reeds | the guest's heartbeat when you look |
| the tarn, Lees Tarn | open, water | lapping locked to the waves, fish, the scriveners' shoal breaking | the woman in the tarn's hum |
| the Lattice, the glacier | open, cold, a touch of stone | the harmonic hum within 130 m, ice ticks | the Accrescent's step |
| the Demesne, the keep, the court, the Hypogeum | stone: long, clear | peafowl, the moles' heaves, the lamps, the Leerie's row | the carillon peal, the hawser groan, the galley drum |
| the canyon, the fall, the Reach | stone and water: the fall's rumble fills it | the Bather's pour, drips | the fall's rumble entering |
| the Lynchets, Adust, Outwash, Bletting, High Ling, Strandline | their own hooks (`src/v4/regions/*.js`) | the dock rattle, the gate, ticks, drops, the tor moan, laps, the living at their tasks | the Sexton's spade, the Taker's murmur |

The living (`src/audio/living.js`) each have a signature made of two or three events (the Thurifer's chain and hiss, the Sexton's bite and throw, the Coheirs' knot and hum) heard from 20–60 m, not 5.

## What it is not

- Not a nature documentary: no birdsong chorus, no crickets at the ear, no cheerful water.
- Not a horror drone: the drone is a floor you forget, not a wall.
- Not musical: no melody, no chord progression, no pulse. The carillon is the one thing that nearly is, and only when you run its row.
- Not a crowd: never more than two or three things at once that are not the bed.

## Levels, in words

At a quiet moor pose with the volume at 100, the wind between gusts is barely there; a gust is clearly a gust and never loud; your steps are the loudest regular thing; a far call is quieter than your steps and clearly far (dull, diffuse); the gutter's drone is felt more than heard; a punctuation (the carillon, the hawser, the rooks) is the loudest thing you hear in a minute and still leaves headroom.
