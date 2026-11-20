# Critic brief

Hand this to a fresh agent before every release to `main`, and between milestones when choosing what to build. Use a strong model. Do not tell it what the milestone was meant to do: it judges what is there. Fill in the bracketed parts. **Its time has a floor, not a ceiling:** 30 minutes, plus 10 for every 25 m of walkable route new since the last release (v14's 25-minute critic over a stair, a hall and a 121 m passage let five glitches through within the hour; #64), and a second, shorter pass over anything changed after its report. Give it the new places' names in `tools/geometry/places.mjs`, not what they are meant to be.

---

You are a critic visiting "Below a Fading Star", a first-person walk served at `http://localhost:[port]` from `[worktree path]`. You did not build it and you owe it nothing. Your report decides what gets fixed before release and what gets built next, so a kind report is a useless one.

Load the `wilderness` skill (serving, the render tools, where renders go) and keep `AGENTS.md`'s pace rules: one headless browser at a time, `nice -n 10` on every call. Name your renders `critic-[label]-<view>.png`. Change no code.

1. **Arrive as a visitor.** Render the loading card and the first view after "Go out". What does someone who knows nothing see, and would they stay?
2. **Walk it.** Use `tools/views.mjs` to take at least thirty views: a route out from the spawn along the road, each region, each named place (the settings menu's teleport list has them), and ten places nobody would think to check (a far corner, underwater, behind a ruin, straight up, straight down). Look at every render with the Read tool.
2b. **Walk what is new on foot, a metre at a time.** For each new walkable place named in `[places]`, run `tools/route-frames.mjs <base> <place> medium critic` and read its contact sheet, then every frame where something looks wrong: stripes that change from one metre to the next (faces fighting), a hole onto what should be behind a wall, a strut or chain whose end you can see past. The stands are not where the glitches are.
3. **Check it on a phone.** Repeat six views at `?q=low` in a portrait viewport (`tools/shot.mjs <url> <out.png> 390 844`).
3b. **Read the study sheets** (local only: `study.html` is not on the live site). Run `node tools/study-shots.mjs <base> critic` (one load a sheet: every figure and creature close and moving under two lights, every recipe at six seeds) and read every sheet. Name the five stiffest or crudest figures and creatures, and every recipe whose six seeds look like one thing six times. The sheets show form and range; judge everything else in the world.
4. **Listen.** Run the audio survey (`sound-design` skill, `harness.md`) and read the numbers and the band tables at four poses (`--poses=`; `--images` only if the text leaves a question).
5. **Look for stories, then check.** While walking, note every find that seemed to be about someone and made you want to look further, and where you went next. Only after the walk, open `stories/README.md`: which of its stories did you notice unprompted, which beats did you walk past? For the plain ones you missed, go back to two and say what would have made you see them. For the deep ones, say only whether their surface read as anything.
6. **Do what is offered.** At some places the walk offers a visitor something to do: a few words rise at the bottom of the view when they stand close and face a thing (`E`, a click with the pointer captured, a tap on a phone). You are not told where. Note every offer you meet on your walk, and go looking where a visitor would (the ends of roads, the middle of named places, anything that looks made to be touched). For each one found, do it as a visitor does: a short Playwright script on the served page (load, click "Go out", stand there, press `E`), **with no look input after the press**, screenshots at 0, 0.5, 1, 2, 4, 8, 15, 30 and 60 s, read in order. Say for each: did you see the thing being done, and by what; what happened next because of it; did it give you somewhere to go or something more to do, and when you went, what was there; what a second visit (reload, go back) shows. A frame that is the same picture as the one before the press is a failure to report. Count also the places where you expected an offer and got none.
7. **Compare with last time** if a previous report exists at `[path or "none"]`: what got better, what got worse, what is still there.

Report, in under 800 words:

- **Blocking** (must be fixed before release): broken things. Holes in the world, things floating or buried, a view that is black or blown out, text that is wrong or unreadable, a place where the frame rate collapses, a sound that hurts. Give the position, yaw and render for each.
- **Familiar** (should become work): list the things you saw that could sit unchanged in any fantasy game (a grey tower, bulrushes, a market stall), and the two or three that could exist nowhere else. The second list is what to build on.
- **Weak** (should become work): what is dull, repetitive, incoherent, unfinished or out of character with the rest. Be specific about where and why.
- **Strong:** the three best things here, and what makes them work. The next milestone should build on these.
- **Acts:** each thing you were offered to do, in one or two lines: seen being done or not, what followed, where it led, and the weakest moment in it. Which you would show a friend, which you would not.
- **Stories:** which you found without being told, which you could not, and why, by story file.
- **Missing:** what a visitor would expect or wish for and not find.
- **One suggestion** for the most valuable thing to build next, and one for something to cut.

Leave your renders in `shots/wip/`; the curator decides what is kept.
