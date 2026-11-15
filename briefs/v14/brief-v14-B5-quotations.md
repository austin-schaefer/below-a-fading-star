# Brief v14-B5: the owner's quotations and renames for the named places (#52)

Worktree `.claude/worktrees/issue-1413-quotations`, branch `issue-1413-quotations`, port 8165. Work only there. Read `briefs/v14/_common.md` first and do what it says.

B3 gave eighteen places a name card with no quotation (`src/world.js` LANDMARKS, `card: true`; `briefs/v14/reports/issue-1403-names-house.md` has the table, numbered here in its order). The owner answered on #52 on 2026-11-15. Their words, in full, are the specification; the numbers are the table's rows:

> 1. Quote: "We went out into the moonless and tortuous network of that incredibly ancient town; went out as the lights in the curtained windows disappeared one by one."
> 2. Quote: "I came to the fog-enfolded river that flows beside its walls, and heard beyond the river the mortuary tolling of many bells."
> 3. Rename this one: "The Cyclopean Stairs". Quote: "In the dank twilight I climbed the worn and aged stone stairs till I reached the level where they ceased."
> 4–8. Make either end of the The Great Span trigger instead the "Titan's Causeway" whne you get to top of respective stairs. Quote: "Never shall I learn the secret of those ruinous walls and crumbling keeps, nor the fate of my companions."
> 7. "A bitter night for travelers.""A bitter night for musing on the stars." (present across two lines, both wrapped in quote marks)
> 8. Rename: "Shaky Splice" Quote: "At intervals we came to the broken fragments of a paved road: broad, cyclopean flags of gneiss."
> 9. cut
> 10. cut
> 11. Quote: "Our eyes swept that limitless, tempest-scarred plateau and grasped the almost endless labyrinth."
> 12. Rename: "Lonely Staircase" Quote: "Form is shadow, substance is illusion, materiality is dream."
> 13. Quote: "We discovered, however, at an early date, that we ourselves and our buildings were invisible to men."
> 14-15. Cut, and have only one name when you reach the top of the lift: "Final Refuge". Quote: "In relating the circumstances which have led to my confinement within this refuge , I am aware that my present position will create a natural doubt."
> 16–18. Cut all these.

The rows: 1 the Lantern Halt, 2 the Tocsin, 3 the Escalade, 4 the Footing Course, 5 the Fallen Coping, 6 the Hung Cornice, 7 the Long Wait, 8 the Dropped Spar, 9 the Soundings, 10 the Fallen Lead, 11 the Bitter End, 12 the Diffident Stair, 13 the Hanging Croft, 14 the Warders' Landing, 15 the Remand, 16 to 18 the Cols of Prime, Sext and Compline.

How the orchestrator reads it (where the owner's words and this reading differ, their words win; say in your report anything you read differently):

- **1, 2, 11, 13** keep their names and get their quotation.
- **3** becomes "The Cyclopean Stairs", with its quotation.
- **4 to 8, the Span's deck:** a visitor who reaches the top of the stair at either end of the Span gets one card, "Titan's Causeway", with its quotation: it is the deck's name. The cards for 4, 5 and 6 (the Footing Course, the Fallen Coping, the Hung Cornice) go. **7** (the Long Wait) keeps its own card inside it, with its two lines, each in its own quotation marks, one above the other. **8** becomes "Shaky Splice", with its quotation, its own card inside it. How "Titan's Causeway" sits with the Span's existing broad card on the ground ("The Trigon Span" in the settings map) is as today for the ground: the new name is the deck's, shown by the feet's height as B3's deck cards are.
- **9, 10** (the Soundings, the Fallen Lead): the cards go. The Lattice's own card shows there as it did before B3.
- **12** becomes "Lonely Staircase", with its quotation. The Diffident Stair is named in `RELEASES.md` (v12), the README line, stories and the settings map: change what a visitor meets in the walk (the card, the settings map, any act's words); leave released notes and history as they are; in `stories/` and the skills use the new name where it names the place, in the present tense.
- **14, 15** (the Warders' Landing, the Remand): the cards go; one card at the top of the lift, "Final Refuge", with its quotation (the stray space before the comma in "refuge ," is a typing slip: set it "refuge,"). The lift's lower station shows what it showed before B3.
- **16 to 18** (the three Cols): the cards go.
- Names are set exactly as the owner wrote them, article or no article ("The Cyclopean Stairs"; "Titan's Causeway", "Shaky Splice", "Lonely Staircase", "Final Refuge"). Quotations are set exactly, in the curly quotation marks the other cards' lines use; "whne" and "The The" are slips in the instruction, not text to set.
- **The settings map's go-to list:** a place whose card is cut keeps a stand only if it had one before B3 (v13: `git show eda4a31:src/settings.js`), under the name it had then; otherwise its entry goes. Renamed places are listed by their new names. Another agent (B4, `issue-1412-stands`) is re-aiming stands in the same lists right now, the Escalade's, the Tocsin's and the Cols' among them: before you push, `git fetch origin && git merge origin/next`, and if B4 is merged keep its aim for anything that survives.
- Tests that count or name places (`tools/settings-test.mjs`'s formula and its "every way up has a named card at its top" check, `tools/roads-test.mjs`'s EXEMPT names, `src/perf.js` TOP_PLACE 'The Long Wait', `tools/heights-test.mjs`): keep each able to fail; a way up whose top card the owner cut is exempted by name with "the owner cut it (#52)".

Done when: every card reads as the owner wrote it (a render of each surviving card showing on screen, name and quotation, at 1280 by 720 and at a phone's width: the two-line one and the long ones must fit, and on a phone must not sit under the walking stick); the cut ones show nothing new; `ONLY=settings,roads,heights,perf,regions,walk,touch tools/suite.sh 8165` with counts.

Report as `_common.md` says, with a table: row, what the owner asked, what a visitor now sees.
