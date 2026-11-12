---
name: storytelling
description: How stories are found, written down and built into the walk. Load when planning a milestone, brainstorming or writing a brief for anything a visitor finds (a place, a prop, a figure, a creature, a sound, a piece of music), and when reviewing such work, on top of `wilderness`. Covers the two jobs a story does (for the visitor, and for the agents designing the world), plain stories and deep ones, what makes a find a story and not a prop, the shared library in `stories/` that every agent reads before inventing and adds to after, and how stories are made to touch each other.
---

# Storytelling

Stories here do two jobs, and the second matters as much as the first.

**For the visitor.** Nothing in this world explains itself: there is no text beyond a place's name, nobody speaks, and the visitor is not asked to do anything. A story is something they **work out**: they find a thing, it makes them wonder, they find another somewhere else, and the two together tell them what happened.

**For the agents who make the world.** A world built by many agents over many sessions drifts toward a variety box: a hundred separate good ideas that have nothing to do with each other. The library in `stories/` is the cure. An agent that reads what has already happened here before inventing makes things that belong to it: the same person seen again, the other side of a quarrel, the thing somebody lost. A story earns its place in the library even if no visitor ever pieces it together, as long as the things built from it hang together. So part of every agent's creative work is to read the library, add to it, and build from it.

## Plain stories and deep ones

The bigger risk is not a story that is too simple. It is one that is too baroque: impenetrable unless you already know it.

- **A plain story** can be read from what is there, by anyone, in a moment. "A man fell off the bridge and died": boots and a pack at the edge, a body below. The owner's example of what works; so are the painter's abandoned canvases.
- **A deep story** needs context the visitor may never have. The twelfth chair is one: a table laid for twelve, a chair gone, and that chair at the head of a fresh grave with a place setting on it. It is a nice story and hard to discern from the things alone; the owner's first reading was "just a missing chair with some drag marks".

That is not a dealbreaker. The world wants a mix of both. Plain stories are what most visitors take home; deep ones reward the few who look hard, and do the second job (they tie things together) even when unread. What to watch:

- **Know which you are writing,** and say so in its file. A deep story is a choice, not an accident.
- **Keep enough plain ones.** If the last few stories added were deep, the next is plain.
- **Give a deep story a plain surface where you can.** Whatever the full truth, a thing a visitor finds is better if it reads as *something* on its own (somebody is still being served who is not here). The surface can be simpler than the truth.
- **Test by telling it back.** Describe only what a visitor sees at one beat. If nothing at all follows from it without the file open, you have decoration there; decide whether that is what you meant.

## What makes it a story

A prop is a thing that is there. A story has:

1. **Someone.** A person, a creature or a people the visitor can picture from what is left: his boots, her slipper, the painter's five tries at the sun. "A chair" is not someone. "Whoever sat here, whose coat this is" is.
2. **A want.** What they were after: he laid out his cup, his book and his rope in a row as if choosing; the painter wanted the sun to hold still. Petty wants suit this world (vanity, appetite, spite, a wager, saving face): people at the end of the world still cheat at dice.
3. **A turn.** Something happened and it was not what they wanted, or it was and it cost them. With no turn you have a tableau.
4. **An ending.** Something that answers the question the first find raised, and ideally asks a smaller, stranger one.

If you cannot say in two sentences who wanted what and what happened, you do not have a story yet.

## Tools for telling one

None of these is a rule. They are what has worked; use the ones that serve the story and break any of them on purpose.

- **Beats that stand alone.** Visitors find beats in any order and most find only one. A beat that is a small story by itself (who, and that something went wrong) is worth more than one that only makes sense as part of the set.
- **Beats that point.** A road, a line of sight, a trail of bright things at walking intervals, a colour repeated (the cloak upstairs and the coat below are the same saffron), a sound.
- **Beats off the path.** A beat does not have to be on a road or readable from one. A glimpse from the road of something that is not on it is one of the best ways to lead a visitor off the path and into the wilds: put the hook where they walk and the rest where they would not have gone.
- **More than one place.** A hook, a turn, an ending, spread out, so that finding the second is a small journey. A third beat is often what turns a riddle and its answer into a story (the hat on the thorn, further than the body: the wind had him first).
- **The moment before or after.** Boots set side by side with their toes at the edge are often stronger than the fall. Not always: sometimes the thing happening in front of you is the point.
- **Something withheld.** Did he jump, or reach for the rope? A question left open keeps a story alive; a story may also simply be clear.
- **Findable when you mean it to be.** If a beat is meant to be found, check in a render that it can be (the traveller's body is a few pixels from the deck, and it was meant to be seen). A beat hidden on purpose is fine; say so in the file.
- **Comedy.** A jackdaw wearing stolen gold on a saint's head is a story. Next to something grim put something vain, greedy or absurd.
- **Time.** A figure who walks to the grave when the sun gutters, a light that goes out, a sound heard once. One beat that moves or sounds can be worth three that do not.

## The library: `stories/`

One file a story, `stories/<slug>.md`, in the shape of `stories/_template.md`. `stories/README.md` is the index: every story, its kind and state, its places, who it touches, the people who have no story yet, the things that travel between stories. It is the world's memory of what has happened in it, and it is shared: any agent may add a story, add a beat to someone else's, deepen or tweak one, and says so in that story's Log.

**Read before you invent.** Before brainstorming anything a visitor will find, read `stories/README.md` and the stories that touch your place or your figures. The cheapest good idea is often the next beat of a story that already exists, or a second story that crosses one.

**Write as you invent.** Coming up with stories is part of brainstorming, not a step after it. A new place, prop, figure or creature arrives with a story or joins one; the story goes into the library when the idea does, as plain prose a person could read aloud, then its beats. An idea with no story yet lives in `plans/IDEAS.md` until it has one.

**Keep it true.** A story's file says what is built and what is only written (each beat has a state), and changes in the same commit as the thing it describes.

Kinds: `plain`, `deep`. States: `seed` (a someone and a want, no beats placed), `written` (the whole story and its beats placed on the map, nothing built), `partial` (some beats built, or built with a part of the story missing), `built` (every beat built), and a note beside any of them when it does not do what it was meant to (`built, but the body cannot be found`).

## Making them touch

This is the second job. A library of unrelated anecdotes is a list; these are one history.

- **Shared people.** A figure in one story appears, earlier or later, in another. Before inventing a person, look for one who could be the same person.
- **Shared things.** The same cloth, the same coin, the same sign of the sun in its notch, the same gold. An object that travels between stories is a beat in both.
- **Cause.** One story's ending is another's beginning: the salt is spilt because the pedlar was looking at the body under the Span.
- **The peoples.** The Elder builders, the Heliarchy and the folk here now (`briefs/v8/index.md`) are the long story every short one sits inside.
- **Disagreement on purpose.** If your story needs another to be different, change that one openly in its file and Log, or make the disagreement the point (two accounts of one event is a very Vancean thing).

Every story file lists its **Connections** and its **Open threads**: loose ends left for the next agent. Leave at least one, and pick one up when you can.

## In the working process

- **Planning a milestone** (`orchestrator`, `autonomous-run`): the milestone doc names the stories it adds or deepens, and says how the new things connect to what is already in the library. A milestone whose additions touch nothing already there is a variety box: look again.
- **Writing a brief:** a brief for anything findable names its story file. The implementer may improve the beats, keeps the someone, the want and the turn, and updates the file.
- **Reviewing and the critic:** walk as a stranger. Which finds seemed to be about someone? For a plain story, could you say what happened? For a deep one, did its surface read as anything? Record what you find in the story's file; do not leave a note that is no longer true.
- **Other crafts:** the music's specials, a creature's behaviour, a sound heard once at a place are all beats. A story can be carried by a sound.
