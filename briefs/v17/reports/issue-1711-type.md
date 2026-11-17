# v17 issue-1711-type: the type, report

The owner asked for type with a hand in place of one-family Alegreya ("somewhat basic bitch agent typography"). Every
piece of text a visitor sees now takes its face from three roles in `index.html` (`--f-display`, `--f-sc`, `--f-text`);
no rule names a face. `?type=a|b|c` switches the whole system (card, place cards, offer, panel); `TYPE_DEFAULT` in the
`type-pick` script in `index.html`'s head is what a visitor gets.

## The three directions

- **a, the worn title page.** All Fell: IM Fell English (roman and its ragged italic) for the wordmark, IM Fell English
  SC for the imprint line and names, IM Fell DW Pica to read. Centred, three-line title (spaced small caps "Below a",
  a huge italic "Fading", roman "Star" in ember) between a thick-and-thin rule with a lozenge and a hedera leaf; the
  button a double-ruled box.
- **b, the engraved plate.** Cormorant 500 (and Cormorant SC) for display, EB Garamond to read; a double hairline
  frame round the screen, the imprint flanked by rules and spaced 0.55em, "Fading" italic in ember beside a cream
  roman "Star", the button between two hairlines.
- **c, the private press (default).** Fell English for the wordmark and Fell's true small caps, Sorts Mill Goudy to
  read. Set ragged on the left like a private-press opening: a rubricated versal B, red pilcrows before each
  paragraph, the imprint moved to the foot as an italic colophon, the button a red-ink stamp (a 2 px rule with a
  hairline inside it). It began as all-Goudy; the blind reader's verdict took it to Fell for the title.

## The blind reader (sonnet, the six card frames only, no description)

On a (Fell): "The 'Fading' wordmark is a ragged, distressed italic and is the most characterful thing across all three
screens", but "the double rules with a diamond, the small leaf ornament, and the double-bordered GO OUT box ... read
as a stock 'fantasy ornament kit'". On b: "the most generic of the three (EB Garamond plus rules is a very common
'elegant dark' template)". On c (then all Goudy): "Most distinctive: C, because its structure (left-aligned, with
pilcrows and a drop-cap title) is unlike a standard title card ... The solid rust GO OUT button is the only modern,
UI-ish element ... If I had to pick one, I'd take C's layout with A's inky 'Fading' lettering."

I agreed and did that: c with Fell's wordmark and small caps, the solid button replaced by a ruled stamp. c is the
default because its composition is a page, not a menu, and the left-set text column leaves the scene visible to the
right; a and b stay reachable for the owner.

## The rest of the walk

- Place cards: names in Fell English SC spaced 0.2em with a short ember printer's rule under them; the quotation in
  Goudy italic, a step larger (clamp 1 to 1.25 rem) and lighter (`#e8c09c`) than before.
- The offer: Fell SC; its `E` in a small ruled box (desktop only, as before); the touch pill unchanged.
- Settings: double-ruled panel; "Settings" in Fell italic; heads in Fell SC running into a hairline; the keys line
  and the card's keys as ember small caps with no boxes. Slider numbers stay lining figures (Goudy's old-style 1
  reads as I); the card and quotations use old-style figures. Position line and the fps/debug corner unchanged.
- No layout shift: `html.fonts-wait` hides the card's words (not its bar) until the card's faces load or 1.6 s pass;
  the default's two Fell faces and Goudy roman are preloaded.

## Faces, licences, sources

All SIL OFL 1.1, licence texts beside them in `vendor/fonts/` (`OFL-*.txt`, from github.com/google/fonts). The woff2
files are the Latin subsets from github.com/fontsource/font-files (the machine has no font subsetter).

| Face | Files | Bytes |
|---|---|---|
| IM Fell English (Igino Marini) | roman, italic, SC | 174,644 |
| IM Fell DW Pica | roman, italic (a only) | 130,060 |
| Cormorant 500, Cormorant SC (Christian Thalmann) | b only | 67,808 |
| EB Garamond (Georg Duffner, Octavio Pardo) | b only | 49,208 |
| Sorts Mill Goudy (Barry Schwartz) | roman, italic | 47,548 |

469,268 bytes added in all; the default loads 222,192 (Fell English x3, Goudy x2); a and b's files load only under
their `?type=`. Google Fonts' links are gone: the page makes no third-party request (checked: no request off the
origin in the card renders). `sw.js` keeps `vendor/` already; its comment and `DEPLOY.md` say so now.

## Renders (shots/wip/)

- Cards, before Go out is ready and after: `type-card3-{a,b,c}-{desktop,phone}.png` (the reader's set; c then all
  Goudy), `type-card4-c-{desktop,phone}.png` (the default as shipped, before the colophon moved to Goudy italic).
- The walk under c: `type-c-place-{desktop,phone}.png` (Circumbambulate Pool), `type-c-offer-{desktop,phone}.png`
  (the Lantern Halt's tally), `type-c-settings-{desktop,phone}.png`, `type-c-settings-map-desktop.png`.

## Weaker than asked

- No true swash italic: Fell's italic is a period face with no swash set; its F is the flourish. Cormorant's swashes
  are not in the subset used.
- Fell DW Pica (a's text face) is rough at the place card's italic sizes; a is kept as a choice, not tuned for that.
- Port: the brief's 8171 was held by a stale server from a removed worktree (issue-1530) that I was not permitted to
  stop; I served and tested on 8175 (sw on 9175).

## Tests

`nice -n 10 env ONLY=loading,settings,touch,sw,contrast,acts,record tools/suite.sh 8175`: 7 tests, 1 failed, 16 min 34 s.
settings 86/87, touch 45/45, acts 176 passed 0 failed, record 16/16, sw 50 passed 0 failed, loading 28 PASS and no FAIL,
contrast PASS (12 regions apart, 1 alike pair, no page errors). The one failure is `settings`' "names" check. It is
not this branch's: the `swallow` ascent (v17-U1) ends at (-31.5, 317.7, y -24) with no place card. The type changes no
text or class the check reads (checked by running the check's own evaluation and printing the tops that fail). No
test pinned the old face, so none was changed.
