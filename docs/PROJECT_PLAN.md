# Project plan

The next steps, in the order agreed with Adam (2026-10-15). When a step is
done, take it out: git log keeps what was done, `docs/DECISIONS.md` what was
decided and why.

## Now

1. **Krecik (Krtek), the second cartoon** (Adam, 2026-10-15: Eliot is a
   big fan), with its own home scene (`docs/DECISIONS.md`: one scene per
   cartoon, not a game per episode). Track Adam's build hours from day one:
   how long a new world takes is the collection's real question.
   - A `new-world` skill, written from how Reksio's dossier was made, then
     the run: `world.yaml`, `sources.yaml`, the episode catalogue, the
     intro, and a look at a few episodes for what its characters do and how
     they are funny (no beat-by-beat breakdown per game). Early in it: who
     holds the rights, and whether he has a voice (laughs, little words)
     and what we do about it (original, as the barks, or our own).
   - Its scene's brief (`games/<scene>/brief.yaml`), like the yard's: a day
     in his place (likely a meadow and the ground under it, not a yard:
     check), every part `original`, `inspired` or `invented`. Aim for a
     first playable scene, not the yard's depth: a day with an ending, 4–5
     things to do, a couple of creatures, sound and music; then deepen it
     from what Eliot does.
   - *Longer encounters* than Reksio's (Eliot found the yard's too short):
     each a few steps with someone, that he can watch run on, and that any
     tap still cuts short cleanly (the yard's rule: a cut-short gag leaves
     him free and standing). A target for the brief; the yard can take it
     up too.
   - First build step: move what both scenes use (debug.js and the Clock,
     input and the recorder, sound and music, probably the day) out of the
     yard's folder into a shared one both load, and publish it with them
     (`.github/workflows/pages.yml`). Characters stay with their world. Not
     before: the second scene shows what is really shared.
   - Once both scenes play: a plain page to pick one (two pictures), which
     loads the scene in place, so the tap that picks it also lets sound
     play. Not a platform.
2. **A third cartoon, and the platform with it:** two worlds will have
   shown what every scene shares, so the third is built on the platform as
   it takes shape, and its needs shape it (how scenes are found, picked and
   shared). Keep the platform as small as the third scene needs, so it
   doesn't hold the scene up.

## Reksio's yard: parked

New work on the yard waits (Adam, 2026-10-15), unless a creative idea is
too good to leave. What Adam does in play still feeds it, and Krecik's
scene:

- **Adam listens to the yard's new music** (built 2026-10-13: takes in
  `tunes.yaml`, phrases after something new). To judge in play: the level
  against the effects (`VOLUME`, `TAKE_VOLUME` in music.js), how often
  phrases come (`PHRASE_GAP_MS` in idle.js), whether five phrases is
  enough variety, the morning (two takes: more through `new-music`), the
  touches now heard only between takes.
- **Eliot plays the yard:** the bowl, the bramble, the new sounds, the new
  ending. First Adam tunes the bowl and bramble timing (`BEE_COMES_MS`,
  `LEAP` in bramble.js; `STEP_OFF`, `STRAIN` in antics.js; the `boing`).
  Watch: does he tap to call for help, laugh at the leap, worry about the
  mouse that can't eat, go for what, and does the ending land? If the
  helping gags land, one more of each kind, each a `new-gag` run:
  - *Helped:* the pesky fly on his nose, caught by the spider (needs a
    layout rule: the fly and the spider out together).
  - *Help:* the bird drops a twig from its nest; Reksio fetches it back up
    to the wall.
- The yard's items under "Alongside" and "Later" below wait with it.

## Alongside, when working nearby

- **The rest of the sound audit:** the other ~30 synth effects through
  `new-sound`, worst first. Recorded takes' level against the synth ones
  (`EFFECT_VOLUME` in sound.js); whether the 2.5 s snore fits the doghouse's
  snore every 1.7 s. Slurp is still silent (no takes).
- **Reksio's looks:** one look at each gag as a contact sheet (the browser
  tests prove he ends free, not that it looks right). Known: his old-style
  drawing asleep in the doghouse doorway (`#nap`); where his mouth meets the
  bowl, the film and falling fruit; ears drawn as tubes, the cartoon's are
  flaps. Then acting: reactions in each gag, starting with Eliot's
  favourites.
- **Code:** `yard.js` is at 975 lines, split it before adding more;
  `TestRealInput::test_a_key_tap_barks` fails about 1 run in 5 under
  `-n 8` (a quick key tap can count as a hold when frames are slow).

## Later

- **More for the yard,** deepening before widening (a creature with several
  steps and a memory beats a new one-beat one): more helpers for the
  bramble (the fed mouse gnaws the cane; the squirrel shakes him loose); the
  bone flung onto the doghouse roof, brought down by the squirrel; the reel
  rolling into the mouse hole, pushed back by the mouse; wasps at fallen
  fruit; a gust shaking fruit down; a butterfly that lands on his nose; a
  fox's eyes under the gate at dusk; ants carrying crumbs; leaves to chase.
- **An episode as a dream:** Reksio falls asleep in the doghouse and
  dreams an episode (Kosmonauta's rocket, say), inside the yard: new
  content for a world without leaving its scene.
- **A mish-mash scene:** characters from several cartoons in one place,
  once two worlds have their own.
- **The dossier's gaps:** `open_questions` in `worlds/reksio/world.yaml`
  (rights, the memoir and the musicology chapter not yet read in full).
- **First experiment with families,** once the game is ready for it: 6–8
  families, about 4 Polish parents who grew up with Reksio and 2–4
  non-Polish. Watch them play without guiding; afterwards show Polish
  parents a 30 s original clip and ask what felt off. Watch for: did they
  finish, did parent and child talk, did the parent tell a childhood story,
  did anyone open the episode link or ask for another cartoon unprompted.
  Don't measure time played or replays. Track Adam's build hours: if one
  person can research and build a faithful scene for a new cartoon in about
  two weekends, a collection is viable.
