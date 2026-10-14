# Project plan

The next steps, in the order agreed with Adam (2026-10-12). When a step is
done, take it out: git log keeps what was done, `docs/DECISIONS.md` what was
decided and why.

## Now

1. **Adam listens to the yard's new music** (built 2026-10-13: takes in
   `tunes.yaml`, phrases after something new). To judge in play: the level
   against the effects (`VOLUME`, `TAKE_VOLUME` in music.js), how often
   phrases come (`PHRASE_GAP_MS` in idle.js), whether five phrases is
   enough variety, the morning (two takes: more through `new-music`), the
   touches now heard only between takes.
2. **Eliot plays the yard:** the bowl, the bramble, the new sounds, the new
   ending. First Adam tunes the bowl and bramble timing (`BEE_COMES_MS`,
   `LEAP` in bramble.js; `STEP_OFF`, `STRAIN` in antics.js; the `boing`).
   Watch: does he tap to call for help, laugh at the leap, worry about the
   mouse that can't eat, go for what, and does the ending land? If the
   helping gags land, one more of each kind, each a `new-gag` run in a fresh
   session:
   - *Helped:* the pesky fly on his nose, caught by the spider (needs a
     layout rule: the fly and the spider out together).
   - *Help:* the bird drops a twig from its nest; Reksio fetches it back up
     to the wall.
3. **The episode, *Reksio poliglota*,** each step a `new-episode` run:
   - Claude: frame pass and breakdown, `episodes/reksio-poliglota.yaml`.
   - Extend `main.py mark` to episode breakdowns (it does the intro only),
     then Adam's (or his wife's) listening pass.
   - Retro on the skill; a brief for the episode game and its doorway.
   - First build step: move what every Reksio game shares (Reksio himself,
     the creatures, `debug.js`, sound and music) out of the yard's folder
     into a world-level one both games load, and publish it with them
     (`.github/workflows/pages.yml`). Not before: the episode shows what is
     really shared.

## Alongside, when working nearby

- **The rest of the sound audit:** the other ~30 synth effects through
  `new-sound`, worst first. Recorded takes' level against the synth ones
  (`EFFECT_VOLUME` in sound.js); whether the 2.5 s snore fits the doghouse's
  snore every 1.7 s. Slurp is still silent (no takes). His original voice
  sounds, marked in episodes, wait for `main.py mark` on episodes.
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
- ***Reksio kosmonauta*:** Adam's listening pass, a full breakdown
  (`episodes/reksio-kosmonauta.yaml` has the first frame pass), then the game.
- **The dossier's gaps:** `open_questions` in `worlds/reksio/world.yaml`
  (rights, the memoir and the musicology chapter not yet read in full).
- **First experiment with families,** once the game is ready for it: 6–8
  families, about 4 Polish parents who grew up with Reksio and 2–4
  non-Polish. Watch them play without guiding; afterwards show Polish
  parents a 30 s original clip and ask what felt off. Watch for: did they
  finish, did parent and child talk, did the parent tell a childhood story,
  did anyone open the episode link or ask for another episode unprompted.
  Don't measure time played or replays. Track Adam's build hours: if one
  person can research and build a faithful episode in about two weekends, a
  collection is viable.
