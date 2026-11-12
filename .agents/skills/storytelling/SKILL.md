---
name: storytelling
description: How stories are found, written down and built into the walk. Load when planning a milestone, brainstorming or writing a brief for anything a visitor finds (a place, a prop, a figure, a creature, a sound, a piece of music), and when reviewing such work, on top of `wilderness`. Covers what makes a find a story and not a prop, how a story is told in a world with no text and no dialogue, the shared library in `stories/` that every agent reads before inventing and adds to after, and how stories are made to touch each other.
---

# Storytelling

Nothing in this world explains itself. There is no text on screen beyond a place's name, nobody speaks, and the visitor is not asked to do anything. So a story here is something a visitor **works out**: they find a thing, it makes them wonder, they find another thing somewhere else, and the two together tell them what happened. The pleasure is the working out. The world is backed by a growing library of these, in `stories/`, and part of every agent's creative work is to read it, add to it, and build from it.

The owner's test, from the first milestone that tried this: the traveller on the Span works ("a cloak and rucksack on the tall bridge, a splayed body below"), the abandoned paintings work, and the twelfth chair does not: "it's just a missing chair with some drag marks". The chair had an ending (it stands at the head of a fresh grave with a place setting on it), but a visitor at the table saw only a gap, and nothing made them want the rest. Learn from that one more than from the two that worked.

## What makes it a story

A prop is a thing that is there. A story has all of these:

1. **Someone.** A person, a creature or a people the visitor can picture from what is left: his boots, her slipper, the painter's five tries at the sun. "A chair" is not someone. "Whoever sat here, whose coat this is" is.
2. **A want.** What they were after, legible from the things: he laid out his cup, his book and his rope in a row as if choosing; the painter wanted the sun to hold still. Petty wants are best here (vanity, appetite, spite, a wager, saving face). This is the Dying Earth: people at the end of the world still cheat at dice.
3. **A turn.** Something happened and it was not what they wanted, or it was and it cost them. The turn is the story. With no turn you have a tableau.
4. **An ending the visitor reaches.** The last beat answers the question the first beat raised, and ideally asks a smaller, stranger one.

Then the rules of telling it in this medium:

- **Every beat stands alone.** A visitor finds beats in any order and most find only one. Each beat must be a small story on its own (who, and that something went wrong) and must make them want the next. The gap at the table failed this: it showed an absence, with nobody in it. The fix is at the table, not at the grave: his plate still laid and the food on it untouched and old while the other eleven are eaten clean; his glass full; the others' chairs pushed back in a hurry.
- **Every beat points.** Something in it leads the eye or the feet to the next: a road, a line of sight, a trail a visitor would actually follow (bright things at walking intervals, not four dents in the turf), a colour repeated (the cloak upstairs and the coat below are the same saffron), a sound. If a visitor would not get from one beat to the next without being told, there is no story, only two props.
- **Three beats or more, two places or more.** A hook, a turn, an ending. Two beats make a riddle and its answer; the third is what makes it a story (the hat on the thorn, further than the body: the wind had him first).
- **Show the moment before or the moment after, never the moment.** Boots set neatly side by side with their toes at the edge.
- **Leave one thing out on purpose.** Write down what the visitor never learns (did he jump, or reach for the rope?). A story with nothing withheld is a diagram.
- **Readable at walking pace, from the path.** A beat nobody can find is not a beat (the traveller's body is a few pixels from the deck: that is this library's standing example of a beat that fails by being unfindable). Give every beat a view it reads from and check it in a render.
- **Comedy counts.** A jackdaw wearing stolen gold on a saint's head is a story. Contrast in tone is part of the world: next to something grim put something vain, greedy or absurd.
- **Time is a tool.** Some beats can happen: a figure who walks to the grave at the gutter, a light that goes out. A story that is all still props is the weakest kind; one beat that moves or sounds is worth three that do not.

## The library: `stories/`

One file a story, `stories/<slug>.md`, in the shape of `stories/_template.md`. `stories/README.md` is the index: every story, its state, its places, and who it touches. It is the world's memory of what has happened in it, and it is shared: any agent may add a story, add a beat to someone else's story, or deepen one, and says so in the story's Log.

**Read before you invent.** Before brainstorming anything a visitor will find, read `stories/README.md` and the stories that touch your place or your figures. The cheapest good idea is the next beat of a story that already exists, or a second story that crosses one (the same person seen earlier, the other side of the same quarrel, what the thief did with the rest).

**Write before you build.** A new place, prop, figure or creature arrives with a story or joins one. Write the story file first, as plain prose a person could read aloud, then the beats. If you cannot say in two sentences who wanted what and what happened, you do not have a story yet; keep the idea in `plans/IDEAS.md` until you do.

**Keep it true.** A story's file says what is built and what is only written (each beat has a state). When a beat is built, moved, weakened or cut, the file changes in the same commit. A story marked `built` has been walked in renders, beat to beat, by someone who did not write it.

States: `seed` (an idea with a someone and a want, no beats placed), `written` (all four parts and the beats placed on the map, nothing built), `partial` (some beats built), `built` (every beat built and it reads), `weak` (built, and a critic or the owner could not read it; the file says why).

## Making them touch

A library of unrelated anecdotes is a list. The stories are one history:

- **Shared people.** A figure in one story appears, earlier or later, in another. Before inventing a person, look for one who could be the same person.
- **Shared things.** The same cloth, the same coin, the same sign of the sun in its notch, the same gold. An object that travels between stories is a beat in both.
- **Cause.** One story's ending is another's beginning: the chair is at the grave because of what the fen did; the salt is spilt because the pedlar was looking at the body under the Span.
- **The peoples.** The Elder builders, the Heliarchy and the folk here now (`briefs/v8/index.md`) are the long story every short one sits inside. A short story says something about which of them someone is.
- **No contradictions without a reason.** If your story needs another to be different, change that one openly, in its file and its Log, or make the disagreement the point (two accounts of one event is a very Vancean thing).

Every story file lists its **Connections** and its **Open threads**: loose ends left on purpose for the next agent. Leave at least one.

## In the working process

- **Planning a milestone** (`orchestrator`, `autonomous-run`): the milestone doc names the stories it adds, deepens or repairs, and at least one `weak` or `partial` story is repaired in any milestone that adds new ones.
- **Writing a brief:** a brief for anything findable names its story file. The implementer may improve the beats and keeps the someone, the want and the turn; it updates the file.
- **Reviewing and the critic:** walk a story as a stranger, starting from each beat in turn. At each: who is this about, what went wrong, where would I go next? A beat that cannot answer the first two is a prop. Record a failure as `weak` with the reason; do not leave it marked `built`.
- **Other crafts:** the music's specials, a creature's behaviour, a sound heard once at a place are all beats. A story can be carried by a sound.
