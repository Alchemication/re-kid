# Reksio: music direction

What the yard's music should sound like, and why. Read it before wording a
take or changing the bed (`new-music` skill). Three parts, kept apart:
what the films show, what we chose, and what Adam's ears said. Only the
last is evidence; the first two are a sources-backed reading and our choice.

## From the films

Research lives in `world.yaml`; this is the part music depends on.

- Music does the work words would. It sets the backyard mood, builds
  tension and times the gags (`world:sound.music_role`, `world:humour`).
- Zenon Kowalowski scored almost every episode. His scores are described
  as melodically rich, finely orchestrated and fitted closely to what
  happens on screen (`world:sound.overview`, `world:sound.credits`).
- The style moves with the story: a Baroque pastiche for museum scenes,
  electronic music for the UFO episode (`world:sound.music_role`).
- The opening theme is well known. How it sounds has not been written up
  from listening yet (`world:sound.theme`).

## Our direction

This is an interpretation: our choice for the game, not a fact about the
films.

- **Three layers.**
  - **The bed** (`bed.js`) is always there and quiet: a few notes a bar,
    with no tune to hum.
  - **The touches** (`Music.react`) are a short phrase on a real
    instrument when Reksio does something.
  - **The takes** (`tunes.js`) are the recorded moments the bed swells
    into: a morning, a phrase now and then, a lullaby.
- **Instruments.** A small acoustic band: pizzicato strings, bassoon,
  flute, xylophone and glockenspiel. These are what `samples.yaml` has.
  No drums, synths or reverb wash.
- **Key.** The bed and the touches are in B-flat major. Each take is in its
  own key, which is why the touches play only between takes.
- **Each moment of the day:**

  | Moment | Bed | Feel |
  |---|---|---|
  | Morning, or the child watching | music box | plucked strings, a little bell |
  | Day, the child playing | tiptoe | a plucked bass walking, the cartoon "sneaking about" |
  | Afternoon | patter | soft xylophone rolling up and down |
  | Dusk | chat | a low bassoon asks, a high flute answers |
  | Rain | drips | high notes at odd moments |
  | A nap | hush | a low note now and then |

- **Seasons.** Each season has its own takes and its own bed (Adam,
  2026-10-27), picked by the play's season, and the same later for
  Krtek's meadow. Winter has its own morning, phrases and lullaby
  (`tunes.yaml`, `season: winter`), and its own beds, a quieter, sparkling
  version of the same small band: snowfall (bells drifting down like snow)
  while the child watches, snow play (a lighter plucked bounce) while they
  play; evening, rain and a nap keep theirs. Other seasons play the plain
  ones until they have their own.
- **Feel.** Gentle, cheeky, played by people: a little loose, never
  crisp. Through the same old-film recipe as the effects.
- **Wording takes.** Name the feel, not the notes. Use Adam's form ("A
  catchy, playful instrumental theme reminiscent of 1970s Eastern
  European children's cartoons…"), changing only what the piece is for.
  These wordings are proven on this world's takes only
  (`experiments/music/README.md`, "Findings"). Never name the cartoon or
  its composer.

## Evidence

What Adam heard, and what he said, by date.

- **2026-10-13: takes.**
  - Detailed musical wordings sounded "too modern… too complex and too
    serious".
  - His own wording on Music v1 worked: 11 keeps, in
    `games/yard/tunes.yaml`.
  - The cheeky, tiptoeing phrase got 0 keeps out of 8.
- **2026-10-19: takes.** "Too many moments are quiet." Phrases were made
  more frequent.
- **2026-10-21: the bed board.**
  - "They all sound pretty well honestly, perhaps a bit too modern."
  - "Too clean, probably a bit too crisp, but not bad really." The beds
    were then played looser, through the retro recipe.
- **2026-10-22: the yard.** The bed under the takes: "it feels good. Can
  be made as a default."
- **2026-10-28: winter.**
  - Takes: kept 3 of 8 mornings, 3 of 8 phrases and 4 of 8 lullabies,
    rejected one lullaby, no notes. Both models and both wordings are among
    the keeps.
  - Beds: "The bed melodies sound good, I think they would be great if
    they are quiet in the background, and obviously turned into 70's style
    sounding ones (a bit too modern now)." Heard with the board's old-film
    sound on. In the game since, at the board's levels; how to make them
    sound older is open.
- **Never asked:** "Does this belong to Reksio's yard?", against another
  world's music. Ask on the boards from now on.
