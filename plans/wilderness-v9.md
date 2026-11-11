# Wilderness v9: the music

Austin, 2026-11-11 (issue #2, "Environmental music"): "v7.2 added a leveled-up soundscape, but our sounds are all environmental cues: they're the literal sound of things in the environment. Let's create subtle music to heighten mood and immersion. The music should be ambient, low-key. Think dungeon synth, not high fantasy. Music shouldn't be omnipresent, either: take inspiration from Minecraft, where music shows up intermittently and is punctuated by significant periods of pure environmental sound. Ideally, we have music tracks for each bioregion, plus perhaps a couple special music tracks for the most notable locations like the big bridge, the gates that frame the setting sun, the keep. Just as 7.2 created an agent harness for sound, this release should also research and integrate an agent harness for music. One caution: the sound harness seems to be slow and expensive to run. So let's not repro that system too literally. (In fact, we might want to change that sound harness as well.)"

**v9 comes after v8.** Austin, 2026-11-11, in session: "let's treat music as a v9 after the CCC v8 :)". Until v8 (`plans/wilderness-v8.md`) is released, v8 is the current milestone even though this file has the higher number: a cold session works v8 and dispatches nothing from here. Briefs and the design, ready for then: `briefs/v9/index.md`.

## Status

**Planned, not started (2026-11-11, 14:08 PST).** A research and design agent read the sound code and harness and searched for how programs compose without hearing; its findings are the design in `briefs/v9/index.md`, and the first brief (M0: the score format, the text harness, one reference track, the `music` skill) is written. Nothing is dispatched and nothing will be until v8's release is on `main`. Then: M0 alone first, because every later brief builds on its score format.

## What a visitor should notice

A minute or two into the walk, with nothing announcing it, a slow piece begins under the wind: a few voices, old and plain, in the key the bells and the gutter already share. It lasts two or three minutes and ends. Then, for a long while, only the land. Somewhere else, later, a different piece that belongs to that ground. On the Span, in the keep's court and between the colossi at the sun's gates, a piece that plays there and nowhere else, once a visit. When the sun gutters the music gets out of its way. A visitor who dislikes it can turn it down or off.

## Done when

- A track for each of six region pools and three special places, each passing the score gates and the one audio check.
- The director's ten simulated hours show silence at least 70% of the time, no start during a gutter, every pool reached.
- The owner has a WAV of every track and a URL that plays any of them at once (`?music=<track>`), before the release.
- An agent can change a track and know whether it still passes in seconds, reading text, with no browser.
- The sound harness's full gate is cheaper by a stated, measured amount, and the `sound-design` skill says so.
- `tools/suite.sh` green.
