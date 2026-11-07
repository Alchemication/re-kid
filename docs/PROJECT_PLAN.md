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
     takes through `new-sound`.
   - **Adam judges the oak at the meadow's left end** (built 2026-11-06,
     his yes to the design): the old oak after Krtek a hodinářem, its
     arch where he stops (no more invisible wall), the mouse's hole moved
     under its root and the egg's rest beside it; a tap on it, three
     peeks in turn (an echo of his own voice, his eyes in the dark and an
     oak leaf on his head, an acorn's bonk and one caught and kept in the
     hollow). Judge: the oak's look against the film's (its bark, its
     size), whether each peek reads, the echo by ear (`ECHO_*` in
     sound.js), the bonk's level (his three takes, one raised 14 dB: listen
     for hiss), whether the plink fits the catch and the tuck-in.
   - **Adam judges his den** (redrawn 2026-11-07 after Krtek a autíčko
     0:50, den.js): the paved room, him on his front with his head on his
     hands, breathing; on plays the car was mended, he pats it goodnight
     and sleeps hugging it (15:04). Judge: is the stone pattern too busy
     for the calm end. Other keepsakes were considered and left for now
     (Adam: the car is probably enough): the eggshell cap still on, an
     acorn kept in his hand, a feather the owl drops.
   - **Adam judges the owl in the oak** (built 2026-11-07, his pick B):
     on about 60% of plays (`?owl=1` to try it, `?owl=out` out at once).
     It sleeps in a bigger knot-hole, moved to the middle of the trunk;
     from his second call into the arch it answers ("hoo?"); from 18:30
     it flies onto a broken-off limb painted below the hole; a tap on it
     out, three plays in turn (tilt and his totter, its head turned
     right round, a wink). Judge: does it read at phone size, the
     moves' timing (`POP_MS`, `FLY_MS`, `TILT`, owl.js), and whether
     the closing circle hides it too soon. Its hoots are stand-ins made
     in the browser (`Sound.hoot`): takes through `new-sound` (a soft
     tawny call, a sleepy "hoo?") once he has heard them. It hoots once
     or twice a play, after the cricket's tunes.
   - **Adam judges one story at a time, the fox first, and the variations**
     (built 2026-11-06 overnight, after his two plays where the bulldozer
     came on top of the fox and of the egg, in an eclipse). Encounters and
     the eclipse share one slot: none arrives while another is out, a
     quiet spell of about 45 s after each, at most four planned (two or
     three come when each is played out); the eclipse waits its turn, and
     past 16:00 doesn't come. The paint now opens on the fox: a snicker off
     the edge, he hurries over (the threat won't wait, as the bulldozer),
     the fox at the nest, then the hare and the mouse hurry in with the
     tins, and he backs into the red one. Variations, a first answer to
     "the encounters all feel very similar": the rain's passer-by is the
     hare or the hen; the car jiggles at his knock some plays and he hops
     back; asked again, the mouse tries a nibble at the egg and the hare
     leaps back at a peep. Judge: do the days feel calmer or empty, does
     the fox-first order read, and are the variations enough.
   - **The encounters' shapes** (Adam, 2026-11-06: they all feel very
     similar). The variations above change details; the deeper sameness
     is the shape: each arrives, he walks over and knocks on it, a wrong
     try or two, visitors walk in from the edge, it comes right, a
     surprise, all leave, with the same music arc and about the same
     length. Ideas to choose from with Adam: a short one (10-15 s, a
     single surprise, like the yard's gags); one that comes to him rather
     than he to it (a visitor with something to show him); one where he
     only watches and the child's taps change it; endings drawn per play
     (as the fox's). Then `new-gag` for the chosen ones.
   - **Adam judges the painter's fence at the meadow's right end** (built
     2026-11-07, his choice of the three designs): the painter's thatched
     cottage and paint tins after Krtek malířem, behind a paling fence that
     turns towards us at its corner, where he stops (no more invisible
     line). A tap there, three turns in turn: a twig along the palings, a
     note each up a scale (the twig left where he stops, so next time down
     it); the hen's head through a gap, cluck, he starts and giggles; hops
     to see over the corner, and on the third the hare hops up on the
     other side, "ahoj!". Judge: the cottage and fence against the film's,
     whether each turn reads, the twig's notes by ear (`Sound.tock`, made
     in the browser: a `new-sound` take if it falls flat) and their pace.
   - **Adam judges the tunnel in the paint story** (built 2026-11-07, his
     idea): the hare and the mouse come from the painter's garden with the
     tins, the fox in their way; the mole tunnels over to them under the
     fox's feet and back, and they come up out of his molehill behind him.
     Each tunnel draws what the fox does as it bumps by (a jump, a look
     down, a spin round) and who comes up first; each play draws the tins'
     colours and the friends' patterns (stripes, zigzags, spots). Judge
     whether it reads, its length (about 18 s from their coming to the
     tins down: `COME_MS`, `IDEA_MS`, `ASIDE` in `paint.js`), and the
     painted ghost in colours other than the film's red.
   - **Small things to tap in the quiet stretches** (Adam, 2026-11-06).
     The meadow tells one story at a time, with quiet between
     (`docs/DECISIONS.md`); those stretches should carry the yard's kind
     of play: small things that answer a tap at once, vary and can be
     repeated (the butterflies, the snail and the heron so far). Watch
     first whether testers tap more and watch less now that fewer
     encounters come; then add small things rather than encounters.
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
   3. **Adam judges the storm** (built 2026-10-26, his pick B, after the
      end of Krtek a paraplíčko): one play in four, instead of the rain
      cloud and never with the eclipse. Clouds roll in, he fetches his
      umbrella from his den and plants it, rain and soft far thunder, the
      mouse, the hare and the hen come running; the child picks whom he
      waves in, the last squeezes him out into the rain and he pops up in
      a molehill in the middle; then the rainbow. `?props=storm&soon`.
      Judge: is the thunder soft enough, is the dim too much, does the
      squeeze read as funny. Adam, 2026-10-26: thunder good, length good,
      the umbrella fine; added since: lightning behind the hill with each
      thunder, and left alone he waves the next friend in after 2.5 s, not
      7 (they stood in the rain too long). The storm's perf measures 21–25%
      of the 25% budget: win some back before more is drawn in it.
   4. **Adam judges Krtek's new face** (built 2026-10-26 after Krtek a
      autíčko's close-ups, 7:13 and 11:41–11:46): the teal muzzle up under
      the nose, the mouth on it drawn from numbers (open, corners up or
      down, an oval ooh, a chin line), light brow lines that act, and seven
      faces (content, delighted, ooh, worried, glum, squeezed, fright) on
      his words and on the meadow's quiet moments (squeezed tugging a pole
      and pushing the cloud, worried over the egg, glum at "not mine").
      Still off against the films: shut eyes are white lids, where the
      films draw curved light lines (11:44.5); our eyes are bigger and
      rounder, and our outline heavier.
   5. **Adam judges the fox's story** (built 2026-11-01, his pick A):
      the paint told in the film's order (the fox first, a fright, the
      red paint by accident, the mole's ghost), told again on a tap with
      the fox sometimes made a friend; the fox redrawn with a face that
      acts (foxart.js), big then small, his shadow first. Judge: is he a
      bit scary but not too much, do the faces read, is the ghost funny,
      does the second telling feel new. Sounds waiting on the board
      ("krtek fox"): snicker, growl, yelp, his ghost "uuuu".
      Still to do: each character's height against the mole measured
      in frames, as observed claims in world.yaml.
   5a. **Adam judges the bulldozer and the rests** (built 2026-11-01, his
      pick A; its story reworked the same day): it comes over the church's
      hill (beside the church now) and down its own road, big, and goes
      where its poles are: it flattens the first; he throws the next away
      and it stops, puzzled, then comes on for the last, by his flowers;
      it nose-dives into the pit he digs, and once he throws its last pole
      up its road, it backs out and trundles off after it. Its harm, after
      the film's (3:25-4:10): its blade flattens the wild flowers in its
      way, clods off its heap knock over two of his tulips, its rumble
      scares the creatures off, and it fells the young trees standing on
      its road (painted as the meadow's; one to three a play, birds
      bursting out of them); once it has gone he stands his tulips up,
      and the wild flowers come up slowly by themselves, or at once if the
      rain cloud comes; the trees stand up again slowly. An uneasy bed
      holds while it is here, the glad theme only once it is gone (the
      fox the same, till the monster). About 50 s: judge whether it is
      too long, whether the rule reads, and the uneasy bed by ear. A quiet spell (`REST_HOURS`, about 45 s) after each encounter or the eclipse, never two at once,
      and 12 s before he goes to a new one himself. Judge: does it read as
      harm, is it too loud or big for calm, is the pit funny, do the rests
      feel restful or empty, and are there still enough encounters a day.
   5b. **Adam judges the far wildlife** (built 2026-11-01 overnight, at
      his ask, "make the world truly alive"; the designs agreed in chat,
      the rest not checked with him): one kind of herd a play, far off at
      the meadow's far edge (`wildlife.js`, `wildart.js`): sarny morning
      and evening, boars from the afternoon (piglets wrestling), the żubr
      at midday; the birds of the far trees all day (`flock.js`); the
      heron at a new far pond behind his home (`heron.js`). All flee the
      bulldozer, the car and thunder; the birds come back once it is
      quiet. Try `?wild=deer` (`boar`, `bison`), `?critters=flock`,
      `?critters=heron`. Judge: are they far enough (or too small to
      notice), do they look like themselves, is it too busy. Their voices
      are in (Adam's picks, 2026-11-03: 6 chirps, 2 croaks, 2 grunts, 5
      snorts); judge their level in play: four of the snorts were very
      quiet as made and are raised 20-26 dB, so listen for hiss. Still open: whether the hare, hedgehog and
      mouse, the films' own, should also live in the meadow between
      encounters.
   6. A local director picking the ambient moments, keeping "the same
      again, and a bit more".
   6b. **Adam judges the meadow's night's work** (built 2026-10-30 while
      he slept, the yard's lessons applied, nothing checked with him): the
      end as in the yard (only the corner sun, held, starts a new day; a
      tester could wake him with a held press); the flower bed and the
      spring answering a new way each tap (a dreamy sway with eyes shut,
      a sniff along the row; a splash in his face, the frog plopping in
      beside him). Judge: whether the new ways read and are fun to repeat.
   6c. **Adam judges the meadow's new life** (built 2026-10-31, his ask
      "more life to the creatures", nothing checked with him): a curious
      butterfly now and then comes to look at him standing free, and he
      follows it with his eyes (it never lands: nothing in the films says
      it may); fireflies (invented) rise about him in the dim, at dusk and
      in an eclipse, glow and fade, and settle back into the grass at
      bedtime. `?critters=now`, `?critters=fireflies&day=60`. Judge: is
      the dusk calmer and lovelier, are the fireflies too few or faint.
   6d. **Underground** (Adam's idea, 2026-10-31): he goes down and digs
      about under the meadow, and meets other animals there. A second
      layer of the scene, not a gag: a view down into the earth, its
      painting, animals drawn after the films, and a way in and out a
      toddler gets at once. Sketch designs for Adam after the fox.
   7. **Adam plays the meadow with Eliot** before any LLM work (Adam,
      2026-10-26).
   8. If the meadow feels more alive: the LLM director behind the player's
      own key, on Adam's devices, replies recorded for replay, a stub in
      the tests. Then decide whether it is worth a proxy for the site.
   **Adam judges the yard on the world model** (built 2026-10-26, his
   call: "far more superior already"): the fly and the bee decide by the
   creature rules from what the yard tells the world (light, rain coming,
   wet, his bark and snap, his nose, the roof, tap, bowl and flowers to land
   on, the flowers' nectar), and so do the snail and the worms (out by the
   puddles once the rain stops: each puddle offers a drink while it holds
   water; the snail freezes in her shell at his nose and goes to a porcino
   put down for her). They should play as before; judge whether they do.
   The yard keeps world events of its own (Adam, 2026-10-26: some events
   distinct to a world), from its films' seasons and weather:
   1. **Adam judges the morning fog** (built 2026-10-26, invented, painted
      after Reksio taternik's mist, 4:00-4:40): about one play in three
      wakes in fog, a pale wash over the yard's things and low mist while
      Reksio stays clear; he sniffs his way about in it; the light dims, the
      fly and the bee keep closer; it lifts between 09:00 and 10:30.
      `?fog=1`. Its perf: about 1-2 points over the plain yard, measured on
      a busy machine (the mist bands lie still: drifting cost more).
   2. **Adam judges the winter play** (built 2026-10-26, from the sourced
      synopses of Reksiowa zima and Reksio łyżwiarz, 1981, not public, so
      no frames; snow painted after Taternik's snowfields): one play in four
      is winter: the yard under snow, the wall and the doghouse roof capped,
      a pale sun, dry grass; no flowers, fly, bee, spider, fruit tree or
      bramble; the shower falls as snow, the puddles are ice, he stays white
      and dry; no rainbow, mushrooms or snail after. `?season=winter`.
      The season is in the world state (`season`, and `cold`: snow and ice
      read cold, not the season), and each prop and creature lists the
      seasons it belongs to (`layout.js` `IN_SEASON`), so autumn and spring
      are a share and their own things, not edits everywhere.
      The sparrows at his bowl (built 2026-10-26): a little flock comes to
      peck at it, the ground under snow (the bowl offers food in the cold);
      shy of his nose, they burst up at a bark and come back; left alone he
      guards his bowl, they come back behind his back, and he gives in and
      watches them eat (`sparrows.js`). Judge: how often, their size, the
      guard's timing. Slipping on the ice (built 2026-10-27, `ice.js`):
      the frozen puddles always show in winter, and now and then (once
      in a while stepping onto a patch at a trot, never in the first half
      minute, nobody twice within two minutes) Reksio's feet shoot out and
      he plonks onto his bottom, dazed, and gets up carefully; the boy
      flails, sits down hard and laughs. Their walk waits for them
      (`slipOn` in each), so it can come in the middle of any gag. Judge:
      how rare, the boy's flail. Still to come, each a `new-gag`:
      footprints in the snow, snowflakes on his tongue.
      **Adam judges the snowman and the boy** (built 2026-10-26, reworked
      2026-10-27 after his first look; `?season=winter&snowman=built` for
      it ready to dress, `snowman=0` to watch him make it): every winter
      play, 20-45 s in, the boy comes out from behind the house, rolls it
      on its own ground (the layout keeps it, first out from the house),
      calls Reksio and stands by it at a loss, scratching his curls. Each
      tap on the snowman or the boy and Reksio brings the next piece (the
      stick and the stones, in a drawn order), then his bone for a nose;
      the boy laughs, fetches a carrot and puts his cap on it, and stays
      out until dusk. A tap on the finished snowman brings something
      around it, a different one each time (`snowplay.js`): snowballs
      (the boy pats one up and lobs it, Reksio snaps it and it bursts on
      his nose; then one goes flat into the snowman's head, it flies off
      and breaks, both freeze, the boy laughs and mends it), or a sparrow
      that lands on its cap, tugs the carrot out, carries it wobbling over
      Reksio's head and drops it in the snow, and Reksio brings it back to
      the boy. The boy is a quarter smaller than at
      first (he was as big as the house), his cap lower over his curls.
      Judge: his size, his look and faces, the snowballs, the sparrow,
      how long the build takes (about 30 s). Not yet: the bowl as its hat, a sound for
      his call (a voice needs Adam's ear).
      **Adam judges the tap's story** (built 2026-10-29, his pick A, after
      a mum's idea at a playtest; `tap.js`): it runs, then only drips,
      then runs dry; he knocks on the pipe twice, then hard, a gurgle runs
      down it, and the water gushes over him; in winter the drips freeze
      into an icicle he huffs off. Judge: the knock's height and timing,
      whether the gush reads, the icicle. Its sounds (clonk, gurgle, burp,
      huff) wait on the sound board, "29 Oct: the dry tap"; synth
      stand-ins until then, the huff silent.
      **Adam judges the flowers' sneeze** (built 2026-10-29, the tap's
      lesson applied): it builds over three sniffs, ah… ah… AH…, a petal
      on his nose the second time, blown backwards the third, then again.
      Judge: whether the build-up reads, and whether the flowers miss a
      random variation on later rounds (none now).
      **Adam judges the boy helping Reksio up on the ice** (built
      2026-10-30, his pick: help, then laugh together; `ice.js`): Reksio
      down near the free boy, the boy hurries over, hands out, pulls him
      up, both laugh. Judge: the boy's reach and the pull, at phone size.
      **Adam judges the fruit tree's story and its winter** (built
      2026-10-30, his pick A): half the fruit, all but one, then the bird
      down for the last one, shaken out, scolding him by his head while
      he shrinks; then bare, the bird tutting from its perch. The random
      extras come only on the second shake now. In winter the tree is out
      too, bare and snowy: a sprinkle, a shower or a clump on his head,
      never the same twice running. Judge: whether the emptying crown
      reads, the scolding, the winter tree's look and the shower's size.
   3. **Winter's weather varies per play** (Adam, 2026-10-26: "randomness
      as in life is welcome if it doesn't overcomplicate things"): each
      winter play picks one sky, the way fog is picked now: a crisp clear
      day (blue sky, sparkling snow, icicles, more ice), a grey day with a
      snowfall coming (what we have), steady flurries now and then, or a
      windy one with snow blown off the roofs. One draw per play in
      `layout.js`, read by the weather and the painting; no new systems.
   4. **Autumn**, the same way (after Reksiowa jesień): its share of
      plays, falling leaves on the wind, its own things and weather draws.
   5. **Slow enough for a toddler** (Adam, 2026-10-27: "slowly enough that
      the toddler can register"): every beat of a gag held long enough to
      see what happened before the next, the comic moment longest. Done
      for the snowman's encounters (their `*_MS` constants); a pass over
      the other gags follows, with Adam judging by eye.
   6. **Sound for what happens, and voices for every creature** (Adam,
      2026-10-27: sounds will add value; a new ElevenLabs key with about
      90K credits, in `.env`): the `new-sound` skill, Adam picking by ear.
      The winter's new moments have theirs (picked 2026-10-28). Next,
      every creature its own sounds, several takes each, played at random
      as in nature (when, how often, which take), not on cue. Every new gag
      gets its sounds in the same run (`new-gag`).
   7. **A theme for each season** (Adam, 2026-10-27): winter has its own
      takes and beds (2026-10-28). Open: winter has 3 phrases, under the 5
      a part needs; the beds "a bit too modern" (Adam), to make older by
      ear on the bed board. Autumn and spring get theirs with their plays.
      Krtek's meadow gets the same (6 and 7) once the yard's way of doing
      it has settled.
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
  (spray, hiccups; its drips are now a stage of its story), the gate (a bigger dog barks back), the bird (he tries
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
  The browser tests that failed now and then under `-n 8` (the wind's
  gust, taps mid-step, the hurried encounters, the egg, the critters, the
  storm, the herd, the phone turned) were the tests seeing a different
  moment of the play on a loaded machine. Since 2026-11-05 they run on
  game time in lock-step with the test (`?step`, `tests/game_page.py`):
  the whole suite green at load 100+, and those 8 runs of 8. Still open:
  `test_look.py::test_photographs_a_gesture_until_it_ends` (`main.py look`
  is not on game time) failed again under load (2026-11-05) and passes
  alone. The meadow: "free" holds for a frame before a tap that waited
  for a step goes (`stepped()`, `Clock.after(0)`); harmless for a child,
  a trap for a test (CLAUDE.md says to wait for what the tap does).
  Fixed 2026-10-31 (the tools and tests, not the games): look and replay
  photograph in held game time, a replay starts `?held`, the key tap and
  the corner sun tests.
  **Seen once, not reproduced:** in a replay on an overloaded machine
  (2026-10-31, load average 150+, before `?held`), the yard's rule "walks
  only standing up" broke (`pose: stand, sliding: true`) about 9 s into
  the recorder test's play (walk to 1400, press, release, go to tap),
  after the new stretch. Not seen in 60 timings of that play, 27 runs
  with the CPU slowed 10-30x, or 7 replays on a quiet machine. If it
  comes back, the replay's trace says which pose was drawn.

## Later

- **More for the yard,** deepening before widening (a creature with several
  steps and a memory beats a new one-beat one): more helpers for the
  bramble (the fed mouse gnaws the cane; the squirrel shakes him loose); the
  bone flung onto the doghouse roof, brought down by the squirrel; the reel
  rolling into the mouse hole, pushed back by the mouse; wasps at fallen
  fruit; a gust shaking fruit down; a butterfly that lands on his nose; a
  fox's eyes under the gate at dusk; ants carrying crumbs; leaves to chase.
- **A stream in the meadow, as an encounter** (Adam, 2026-11-02: a river
  would be nice; see what the films have with water, fish, sea creatures).
  First break down the leads with `new-episode`: Krtek zahradníkem (1969:
  a leaking hose, a frog blocking it, the wilting flowers saved by an
  irrigation ditch he digs with the mouse; the closest fit, a mole digging
  his own little stream to his flower bed), Jak krtek ke kalhotkám přišel
  (1957: a crayfish cuts his cloth), Krtek a raketa (1965: the sea, a
  crab, fish, turtles). The catalogue has no synopses for the later films
  yet: check them too (the robot film's trip to the sea).
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
