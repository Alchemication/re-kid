# Krtek: music direction

What the meadow's music should sound like, and why. Read it before
wording a take or making a bed (`new-music` skill). Three parts, kept
apart: what the films show, what we chose, and what Adam's ears said.

**Status: in the meadow, not yet judged in play.** The takes Adam kept
play at their moments (`game/music.js`, 2026-10-22). Between them a quiet
bed (`game/beds.js`, 2026-10-25) in the takes' key and pulse (E major,
103): a harp with birdsong in the morning, the harp with a flute turn
while the child watches, the harp strolling while the child plays, soft
held violins in the afternoon, and an uneasy bed while a threat is about
(low strings on a bare fifth, a slow harp heartbeat a half step apart,
a low clarinet sigh; no flute, no birds). It stops at dusk for the cricket. Built,
not yet picked by ear.

## From the films

Research lives in `world.yaml`. Adam listened to eight clips of the two
films Petrov scored, Hodinářem and Buldozer, on 2026-10-22.

- **Music all the way through**, with no silence. It is beautiful, fits
  what is on screen, and is calmer and closer to nature than Reksio's
  (`world:sound.overview`).
- **Instruments.** Hodinářem has strings, a flute, and perhaps a clarinet.
  Buldozer opens on a flute melody with birdsong (`world:sound.overview`).
- **One theme per film, changed with the story.** Hodinářem's happy
  morning theme comes back:
  - higher, as he finds the clock;
  - more curious, as he repairs it;
  - sad, once he finds the bird;
  - stronger and very happy when the cuckoo sings at the end.

  Buldozer's theme fades back in with the morning and returns at the end.
  The two films have different themes (`world:sound.theme`).
- **Mood, not each gesture.** Sound effects are separate from the music
  and about as loud. When trouble comes, the music goes quiet and
  ambient, and the machine's sounds lead (`world:sound.music_role`).
- **The cricket** plays strings at night. His tune is simple and
  repeating, raw, with notes that sound wrong on purpose
  (`world:sound.music_role`; the scene is
  `world:characters[krtek].moves[lies-listening].claim`).

## Our direction

This is an interpretation: our choice for the meadow, still to be tested
by ear.

- **A theme of the meadow's own, varied by moment.** This is the opposite
  of the yard, whose bed has no tune to hum. That is what the films do,
  and it is what tells the two worlds apart. The meadow's theme is new;
  it does not copy either film's.

  | Moment | The theme |
  |---|---|
  | Morning | as it is: bright, flute over strings, with birds |
  | Wandering, digging, watering | quieter, underneath, now and then |
  | An encounter starts | more curious |
  | Someone needs help | sad, gently, never frightening |
  | Help works | back fuller and happier: the moment the music swells |
  | The bulldozer coming | a short uneasy turn (menace), then the uneasy bed under its rumble until it has gone |
  | The fox | a sly motif written note by note on the meadow's samples (clarinet, harp), then the uneasy bed until the monster sends him off |
  | A fright | the music steps back, effects lead |
  | Dusk to sleep | the cricket's fiddle, not the theme |
  | Next morning (the start) | the theme fades back in |

- **Instruments.** Flute leads, with strings under it, and perhaps a
  clarinet. Birdsong belongs in the music. Reksio's cheeky things stay
  out: the tiptoe pizzicato, xylophone patter, bassoon jokes.
- **The cricket's lullaby.** One fiddle, simple and repeating, a little
  rough and slightly out of tune. It should sound like a cricket playing,
  not a concert violinist. (The synthesised tune it replaced had the wrong
  sound.)
- **The risk.** One theme all day may wear on a grown-up, as the yard's
  old oom-pah did. The films avoid that by changing the theme's mood and
  register, and by keeping it quiet under the action. Test this first,
  before building anything else on it.
- **Making it.** This is the open question (Adam: "we need to experiment
  and find that out"). A theme with recorded variations needs the same
  tune in several moods:
  - Conditioning on a kept take, which copied the seed too closely to
    give Reksio new tunes (`experiments/music/README.md`, "Findings"),
    may be just what a variation needs here. Untested.
  - The other way is to write the theme as notes and play it from
    instrument samples, which gives full control of each variation, but
    the yard has no bowed strings or birds yet.
- **Wording takes.** Name the feel: calm, nature, a sunny meadow
  morning, flute and strings. Leave out "catchy, playful… whimsical",
  which is Reksio's form and pulls towards cheeky. Never name the
  cartoon, the composers or the films.

## Evidence

- **2026-10-22, the films (`experiments/music/listen.html`).** Adam's
  answers are in `world.yaml` (`sound.overview`, `theme`, `music_role`).
  On the meadow's music: "a tough million $ question. We need to
  experiment and find that out."
- **2026-10-22, round 1 (board).**
  - Meadow theme: 1 keep of 4 (`meadow-theme/01`, wording 1: "A calm,
    beautiful instrumental theme for a sunny meadow morning…").
  - Cricket: 0 of 6, "should be a bit faster". Measured afterwards, the
    film's cricket (Buldozer 1:18–1:46) plays about 4 notes a second over
    two octaves, off pitch. Ours played 1.3–3.5 notes a second over one
    octave, in tune.
- **2026-10-22, round 2 (board).**
  - Cricket, quicker: 1 keep (`cricket-quick/03`, wording 2) and 2 maybes
    (05, 06), all near the film's pace by measure (3.4–3.6 notes a
    second). The slow ones (01, 04) and 02 weren't marked.
  - The theme's moods, grown from `meadow-theme/01` on Music v2.5: all 6
    kept (curious, sad, joyful, each at low and medium strength), so
    conditioning gives the same tune in another mood. By measure they
    stay close to the kept take (0.87–0.95, where an unrelated take is
    0.58), on its pulse and in its major keys, even the sad ones. Adam
    kept them anyway; our reading is that this closeness is what the
    films do with their theme.
- **2026-11-01, trouble.** Adam asked for "a little bit scary motif" as
  the bulldozer arrives, reusable across gags. Told that the films go
  quiet when trouble comes, he chose a short motif, then quiet (over
  just the rumble, or a motif under the whole arrival). Its takes could
  not be grown from `meadow-theme/01`: its song id is not found under
  the current key (404), so they are worded from the meadow's style
  (`pieces.py` `meadow-menace`, board folder "krtek menace").
  Picked 2026-11-01: keeps 01, 08, 10, 12 (menace/01-04). Adam: "it can
  work for a bulldozer, but may not work for each scary-ish encounter",
  so another trouble gets its own. Adam then wondered whether "even
  synth could be better" for these: motifs written note by note on the
  meadow's samples (`music.js` `MOTIFS`, no takes to load) now play for
  the fox, and for the bulldozer with `?menace=notes`, to compare with its
  recorded takes. Not yet heard. Adam then heard the flute theme come
  back while the bulldozer was still coming ("we should only get back to
  the positive sound once the bulldozer is gone"): the bed knew only the
  hour, and arrival and the poles' trouble cued the flute theme. Now a
  threat holds an uneasy bed from its coming till it is gone
  (`things.js` `trouble`, `beds.js` `unease`). Not yet heard.
- **2026-11-08, autumn (built while Adam was away).** Half the meadow's
  plays are autumn now; a season's own takes of a part play in its plays
  (`music.js`, tunes.yaml `season`). The theme can't be grown from
  `meadow-theme/01` (its song id 404s), so its four moods were worded fresh
  from the kept morning's wording, turned to a misty golden autumn, flute
  over strings, a clarinet (`pieces.py` `meadow-autumn`, board folder
  "krtek autumn", 8 takes). Measured: morning 02 the calmest (about a note
  a second; the kept spring morning plays about 2 at 103), 01 and sad 05
  busy (4-5 a second); sad 06 is in a major key. Not yet heard.
- **2026-11-08, autumn picked (board, "krtek autumn").** Kept 3 of 8, one
  each: morning 01 ("amazing, a bit nostalgic and sad - truly beautiful"),
  curious 03 ("awesome - much more positive mood than above"), happy 08
  ("really fitting the world, nice false notes as well ;)"). No sad take
  kept (05, 06): autumn's sad moments fall back to spring's.
