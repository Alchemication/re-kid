# Project plan

The next steps, in the order agreed with Adam (2026-10-15). When a step is
done, take it out: git log keeps what was done, `docs/DECISIONS.md` what was
decided and why.

## Now

1. **Krecik (Krtek), the second cartoon** (Adam, 2026-10-15: Eliot is a
   big fan), with its own home scene (`docs/DECISIONS.md`: one scene per
   cartoon, not a game per episode). Track Adam's build hours from day one:
   how long a new world takes is the collection's real question
   (`worlds/krtek/hours.md`).
   - The world (`worlds/krtek/`) is done; its `open_questions` wait,
     rights before release. His voice is generated (`docs/DECISIONS.md`).
   - **Adam listens to the meadow's music in play** (built 2026-10-22,
     `worlds/krtek/MUSIC_DIRECTION.md`): the theme as he wakes, curious as
     a thing arrives, sad at its trouble (the egg found, the poles at his
     flowers), happy as it comes right, the music stepping back for the
     fox, the cricket's fiddle from dusk, and between them a quiet bed
     (2026-10-25: harp, flute, birds, held violins; `game/beds.js`).
     Judge: the levels, where each mood comes, and the bed's four moments.
     Then: two more takes each of curious and happy (each comes four
     times a day from two takes now).
   - **Adam, then Eliot, play the meadow** (`main.py play krtek meadow`;
     `?day=60` for the ending, `?props=egg&soon` for one encounter at
     once, `?critters=now` for a butterfly). Built: the day from the den
     to the iris, digging, watering, and all four encounters a play, two
     hours apart (the egg he helps with; the paint and the fox, where his
     friends help him; the poles and the toy car to discover). None was
     checked with Adam before it was built (he was asleep): judge each
     design and the lengths (about 25–40 s left alone). Watch: does Eliot
     watch a chain run on, or tap through it; does he laugh at the shell
     hat, the tumble, the monster, the backwards car; does the closing
     circle read as bedtime.
   - **Adam judges the church bell** (2026-10-25): the village church on a
     far hill, its bell ringing twice each hour and longer at sunset, the
     mole looking up. Its sound is made in the browser: if it falls flat,
     takes through `new-sound`. Then the meadow's edges (perhaps a loop
     back to the start).
   - **Adam judges the rain cloud, the bed and the spring** (2026-10-25,
     not yet seen by him): watering is now the rain cloud encounter (five
     encounters a day, a little closer together); the flower bed stands
     behind his molehill, a tap has him sniff a flower; the spring is a
     painted rock cliff with a waterfall, a pool and its own life (frog,
     dragonflies, fish, a bird drinking). The spring's life is hand-wired:
     it is a candidate for the world-model spike's critter kit.
   - **Adam judges how the encounters come and go** (2026-10-23): the
     hare and the mouse carry the paint tins in and out, bullfinches bring
     the poles, the toy car rolls in and breaks on the way, the hen and the
     hare walk in for the egg; a tap that cuts one short sends everyone
     off on their own feet. Before more encounters.
   - **Adam judges the night's look and life** (2026-10-22, built while he
     slept, nothing checked with him): the meadow painted after the
     films' backgrounds (`painting.js`; the night darkens it), the mole
     slimmed to the films' proportions with human hands and a face that
     acts with his words (an "o", a frown, his hairs perking), the
     visitors redrawn (the hare's ruff, the fox's ruff and socks, the
     mouse's snout), the warm glow under the mouse on a computer, a tap
     on him answered five ways in turn (a wave and peekaboo are new),
     butterflies to tap, and all four encounters a day instead of three.
   - Then, from what he does: the
     effects through `new-sound` (all synthesised now, but the voice), and
     the next encounters (the cuckoo clock from Hodinářem). The meadow's
     sound.js copies the yard's player for recorded effects: the next
     part to move into `shared/`.
   - Once both scenes play: a plain page to pick one (two pictures), which
     loads the scene in place, so the tap that picks it also lets sound
     play. Not a platform.
2. **The world-model spike, in the meadow** (`docs/DECISIONS.md`, Scope),
   each step judged in play before the next:
   1. **Adam watches the meadow's small life** (built 2026-10-25, on the
      world model, `docs/WORLD_MODEL.md`). The butterflies go to flowers
      near them (the tulips only while open, the wild patch only while it
      stands), keep out of the rain and leave when it reaches them, and
      fly off from the car and a splash. At the spring the bullfinch comes
      down because the pool offers a drink and is off at the bell, a
      splash or the car; the frog plops in when the mole paddles or the
      fish leaps. New: the snail (invented), up out of the wet grass under
      the wild flowers after the cloud, into its shell at a tap.
      `?critters=now` for a butterfly at once, `?critters=snail` for the
      snail. Judge: does the meadow feel more alive, is anything too busy.
   2. The rest of the vocabulary, as it is needed: `hero` and what may
      touch him (from the films: Adam, 2026-10-25), the encounter's
      `stage` (watched from a distance, never walked onto), `sight`,
      `perch`, `sun`; tired and curious drives. The encounters stay as
      they are.
   3. Wind, then a storm (a cartoon one: everyone to shelter, thunder far
      off and soft, sunshine after) and an eclipse (the light dips, the
      hour doesn't: the meadow behaves as at dusk for a minute).
   4. A local director picking the ambient moments, keeping "the same
      again, and a bit more".
   5. If the meadow feels more alive: the LLM director behind the player's
      own key, on Adam's devices, replies recorded for replay, a stub in
      the tests. Then decide whether it is worth a proxy for the site.
   Then the yard's fly, bee and weather move onto it, if it held up.
3. **A third cartoon, and the platform with it:** two worlds will have
   shown what every scene shares, so the third is built on the platform as
   it takes shape (the world model among it), and its needs shape it (how
   scenes are found, picked and shared). Keep the platform as small as the
   third scene needs, so it doesn't hold the scene up.

## Reksio's yard: parked

New work on the yard waits (Adam, 2026-10-15), unless a creative idea is
too good to leave. What Adam does in play still feeds it, and Krecik's
scene:

- **The music bed is on** (Adam, 2026-10-22: "it feels good"; `bed.js`,
  `?music=takes` for the takes alone). Next: step 2, the recorded takes
  tagged with key and tempo, the bed moving into their key and the take
  starting on its beat; step 3, the bed leaning ahead to what's coming
  (the mouse, the hen, the clouds, the cuckoo, dusk); step 4, more
  highlights cut from longer takes. Then the meadow gets it.
- **Adam listens to the yard's new music** (built 2026-10-13: takes in
  `tunes.yaml`, phrases after something done, or a long quiet). To judge in play: the level
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
  - *Helped:* a cat who helps him (Adam, 2026-10-20), with a reason of
    her own: his bone rolled where his snout won't fit and her paw will.
    Not things landing on his nose (Adam doesn't want those).
  - *Help:* the bird drops a twig from its nest; Reksio fetches it back up
    to the wall.
- **More variety in repeats** (Adam, 2026-10-19: "each encounter should
  be a bit random and different"). Built: the doghouse nap, where every
  nap after the first brings one of four things on top, all before any
  repeats (`nap.js`), and one sleeping Reksio in the morning, on a tap and
  at bedtime. Pools built (2026-10-20, Adam to judge in play): the tap
  (spray, drips on his nose, hiccups), the flowers (bigger sneeze, petal
  on his nose), the gate (a bigger dog barks back), the bird (he tries
  to fly after it; it lands on his head), the gate (also: digging under
  it, tugging a picket, leaping up to peek over). New (2026-10-20): the
  hen's egg on the wall, fetched with the garden ladder (hen.js; after
  Reksio i nośna kura), with its own pool; the mushrooms after the rain
  (mushrooms.js; after Reksio kompan: the fly agaric sniffed and left,
  porcinos to the boy's basket, then shared with the snail); pools for
  the props (2026-10-21: the mound, the film, the trap's mouse, the tree,
  the bramble; mouse.js, mound.js, film.js). No hint that a thing has
  something new (Adam, 2026-10-21: every repeat already does). Next, if
  wanted: the fly and bee a little more often. Keep the yard quiet:
  variety in each thing before more things at once.
- The yard's items under "Alongside" and "Later" below wait with it.

## Alongside, when working nearby

- **Cartoon timing in Reksio's gestures:** anticipation, snap, overshoot,
  holds. It's what drawing on twos was reaching for and didn't give
  (`docs/DECISIONS.md`, the old print).
- **The rest of the sound audit:** the other ~30 synth effects through
  `new-sound`, worst first. Recorded takes' level against the synth ones
  (`EFFECT_VOLUME` in sound.js); whether the 2.5 s snore fits the doghouse's
  snore every 1.7 s. Slurp is still silent (no takes).
- **Redraw Reksio after the films** (after the 70s look is in). Side by
  side with Sportowiec 142 s and 318 s, Kompan 70 s and 135 s and Aktor
  240 s (2026-10-18), ours reads as a generic rabbit-dog sticker: Adam's
  wife asked why he looks so weird. In `figure.js`, by payoff:
  1–3. Built 2026-10-18, for Adam to judge in play: shorter, wider ears,
     the brown one folded as two flaps; the snout out at three-quarter
     view; eyes close together over the nose; a wider smile and a grin
     up to half his face. Both ears fold at rest; one or both snap up
     when he notices something (watching, looking up, the bee, a fright,
     now and then on a glance; `kit.perk`), as in the films. The face
     (2026-10-19): a taller dome with the eyes low on it, lids that
     come down and slope with the brows, brows always shown, forehead
     creases, a small mouth, clenched teeth; five expressions after
     Adam's frames (puzzled, eager, worried, content, cross: POSES in
     figure.js), now in the yard's moments: puzzled at the bee's hum,
     clenched teeth straining and worried sulking in the bramble,
     content once freed, eager before lapping, cross at the cuckoo.
     The head is pear-shaped and tall, with a short, deep muzzle and no
     neck; a smaller tan patch; mitten hands with a thumb. For Adam to
     judge in play.
  4. Built 2026-10-19, for Adam to judge: a thinner line, the same all
     over (`LINE` in figure.js), and standing at ease: leaning back, chin
     up, weight on the back leg. The rigid bean body caps how far the
     curve can go; a body that bends is the next step if it still reads
     stiff.
  5. Built 2026-10-19 (see 1–3).
  6. Once redrawn, look at him at phone size: if the film grain still
     makes his big white areas look dirty, lower `GRAIN_ALPHA` in
     `filmlook.js` for the whole picture. The grain stays on him too: it
     is in the print, over everything (Adam, 2026-10-18), and his fills
     are already flat.

  Check each with a `look --close` sheet next to the same film frames,
  and the `"TestGestures or TestGettingUp"` slice. Also known: his
  old-style drawing asleep in the doghouse doorway (`#nap`); where his
  mouth meets the bowl, the film and falling fruit; he reads big against
  the yard, as tall as the doghouse's roof (Adam, 2026-10-18: check his
  size against the films). Then one look at each gag as a contact sheet,
  and acting: reactions in each gag, starting with Eliot's favourites.
- **Code:** the perf budget's slack is thin: walking measures 24–25% busy
  of 25% (2026-10-22, the bed about one point of it). Before adding more
  drawn every frame, win some back (the sky and painting are the biggest).
  Under `-n 8`, three tests fail now and then and pass alone:
  `TestRecorder::test_report_saves_and_replays`,
  `test_look.py::test_photographs_a_gesture_until_it_ends` (both start a
  second Chrome) and the meadow's `test_a_tap_on_the_egg_while_waiting`:
  timing bugs to find;
  `TestRealInput::test_a_key_tap_barks` fails about 1 run in 5 under
  `-n 8` (a quick key tap can count as a hold when frames are slow).
  `TestScreens::test_turning_the_phone_refits_it` failed once under `-n 8`
  (2026-10-22) and passed alone: not yet looked into.

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
