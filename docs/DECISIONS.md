# Decisions

What has been decided, and why, so it isn't reopened by accident. Each one
can change: say so, and update it here. Adam's original brief is at the end;
how the games should feel is in `docs/DESIGN_PRINCIPLES.md`.

## Scope

- **First world: Reksio.** It is wordless, so a 3-year-old can play without
  reading and non-Polish families can play without translation. One small
  game then tests three things at once: do families play together, does a
  child connect with a character they don't know, does it feel authentic to
  people who grew up with it. Runner-up: Kot Filemon (curiosity mechanics);
  Baltazar Gąbka is a later world for older children and adults.
- **One audience: a parent and a child of about 3, together**, the parent
  being the one who remembers the cartoon. Adult versions, age variants and
  the cross-cultural collection wait until this works.
- **One scene per cartoon, deepened, not a game per episode** (Adam,
  2026-10-14). A cartoon's game is one rich home scene, like Reksio's yard:
  a day in its place, with more and more to see and do. That drops episode
  breakdowns per game, doors into episodes and moving between games, and
  frees the work for more cartoons: next, a second cartoon with its own
  scene; later, perhaps a mish-mash scene with characters from several.
- **No platform yet.** One scene per cartoon and a short parent card. No catalogue,
  country map or memory sharing.
- **No live AI in the finished game.** AI is for research, design and
  building.

## The games

- **The first game is Reksio's yard, not the intro.** A playable intro
  (press to do each credit gag) was built and dropped: one gag alone is thin
  to play, and credit cards are text a toddler can't read. The yard has no
  text and answers every tap. The intro brief is kept, parked.
- **Every world has a home, and the encounters live in it** (2026-10-07;
  reshaped 2026-10-14). Eliot liked the yard's encounters with other
  animals most and found them too short; most Reksio episodes are exactly
  that, Reksio and one animal over several steps. That once led to episode
  games entered through doorways off the home; now (Scope: one scene per
  cartoon) such encounters are built in the home itself, over several steps.
  A cartoon without a home gets an invented one. *Reksio poliglota* (1967)
  and *Reksio kosmonauta* stay as research: the supper at bedtime comes from
  Kosmonauta's ending (its frame pass is in
  `worlds/reksio/episodes/reksio-kosmonauta.yaml`).
- **Helping is the yard's theme, built from what is there** (2026-10-11).
  Every play offers something to discover, someone to help, and a moment
  when someone helps Reksio, none of them a task. No encounter registry or
  session director: `layout.js` `OFFERS` tags each prop and `pickProps`
  guarantees one of each. Each helped gag gets a different helper and a
  different way out, and a surprise.
- **The day runs on a clock** (2026-10-13). Before, six things done or 10
  minutes set the sun, so a curious child got an earlier bedtime and nobody
  could tell when the day would end. Now 08:00–20:00 takes 5 minutes of
  play, and nothing Reksio does moves it. The ending Eliot has learned to
  accept (dusk, into the doghouse, the circle closes) stays.
- **Phones: frame, don't fly a camera** (2026-10-11). On an iPhone on its
  side Reksio was 98 px tall. A short screen now cuts the top of the sky
  instead of zooming on each encounter; upright, a phone shows a wordless
  "turn me" picture rather than a portrait yard.

## Making them

- **Inspire, don't copy.** Drawings, sounds and music are new, in the spirit
  of the original; original sounds and melodies only as occasional easter
  eggs. Exception (Adam, after the synthesised bark fell flat): the original
  barks; since 2026-10-14 shipped with the site too (Adam: generated barks
  "are all crap once we know original sound"; a POC for one child). Characters are drawn in code, never with image models
  imitating the artwork.
- **Krtek's voice is generated, not the original** (Adam, 2026-10-15, "for
  now anyway"). Unlike Reksio's barks, the generated takes were good
  enough: ElevenLabs sound effects, 8 kept for 5 of the 7 sounds tried
  (giggle, ahoj, ach jo, ooh, fright; none for hele or jé), best with
  Adam's wording that sets the scene before naming the word
  (`experiments/sound/README.md`). Judged on their own, not yet side by
  side with the films; if they fall flat in play, the original takes go
  the way of the barks.
- **Licensing: Adam contacts the rights holders before the game leaves his
  home** (2026-10-06). Until then it is a private build and may aim for a
  recognisable Reksio. Who holds the rights is an open research question
  (`rights` in `worlds/reksio/world.yaml`). The barks, the hook and any
  model weights with non-commercial licences go into that talk.
- **Research happens in Claude Code sessions**, not through API calls from
  `main.py`. `main.py` validates, inspects and packs.
- **Sound: the computer measures, Adam listens.** A blind test on
  2026-09-30 (three synthetic sounds with known answers, plus the intro's
  cymbal moment, neutrally named): `codex exec` and Antigravity's `agy -p`
  couldn't hear WAV; on MP3, Gemini 3.8 Flash invented details, Gemini 3.1
  Pro judged every 2–6 s file to last 1 s, and on the real theme the two
  disagreed completely and missed the cymbal. So model listening isn't used
  even as a lead: a confident wrong description would prime the listener.
- **Sound effects are generated and picked by ear** (2026-10-12). ElevenLabs
  beat the synth and a local model on every sound tried; findings in
  `experiments/sound/README.md`, procedure in the `new-sound` skill. Retro,
  not clean: Adam preferred the roughened version of all 13 sounds.
- **Music: generated takes with quiet between, not a code loop**
  (2026-10-13). The note-by-note oom-pah with three themes taking turns
  played all day and wore on a grown-up (Adam: "repeated constantly does get
  a bit annoying"; he heard no copy of the theme in its hook). Now a morning
  take, a phrase after something done at most every 25 s (and one anyway
  after 50 s of quiet as he potters about alone), a lullaby. It began as a
  phrase only after something new, at most every 40 s; Adam found too many
  moments quiet (2026-10-19). The music no longer thins and fills with the
  play, and the in-key touches play only between takes (each take has its
  own key). Made with ElevenLabs **Music v1**, which beat v2 and v2.5 by
  Adam's ear for this retro cartoon feel, from a wording that names the
  feel, not the notes; findings in `experiments/music/README.md`, procedure
  in the `new-music` skill. Retro recipe, as the effects.
- **A music bed under the takes** (Adam, 2026-10-22), which revises the
  entry above. The takes alone left too many silent moments, and their
  few clips came round too often. Now a quiet bed plays under everything
  (`bed.js`): a few notes a bar from the instrument samples, no tune to
  hum (which is what wore on him in the oom-pah), a bed for each moment
  of the day picked by ear on `experiments/music/bed.html`, through the
  effects' retro recipe. The takes are the moments it swells into: it
  steps back under them. `?music=takes` gives the takes alone.
- **Krtek's music: one theme, turned with the story** (Adam, 2026-10-22),
  unlike the yard's bed with no tune. Adam listened to the two Petrov
  films: each has one theme that comes back curious, sad and happy with
  the story, calm and close to nature, and the music goes quiet when
  trouble comes. So the meadow has one generated theme and its moods,
  grown from the kept take by conditioning (on Music v2.5; v1 takes no
  composition plan), which copied the seed for the yard's variety but
  is what a mood of one theme needs. Adam kept all six. The cricket's
  fiddle is takes measured against the film first (about 4 notes a
  second). `worlds/krtek/MUSIC_DIRECTION.md` has the evidence.
- **An old print, but still: no drawing on twos** (Adam, 2026-10-18; on
  in every game, `?film=0` turns it off). Grain and a faded grade are kept. Drawing Reksio
  and the camera on twos (12 a second) made him stutter: it shows fixed
  moments of a smooth blend, not drawings an animator chose. Scratches
  looked like a glitch and flicker was annoying, so both are out, and the
  weave went with them. A drawn feel is to come from timing in his
  gestures, not from a lower frame rate.
- **Variety, not a hint of it** (Adam, 2026-10-21). After children played,
  repeats needed more variety. Each thing now has a pool of variations:
  every use after the first brings a different one, all before any comes
  again. A hint that a thing still has something new (a marker, his ear
  perking towards it) was considered and dropped: every repeat already
  does, so it would point at everything, and a marker nudges a child to
  keep playing.
- **Procedures become skills, improved by every run** (2026-10-07), so
  someone other than Adam can run them. `new-world` is drafted
  thin, before its first run (Krecik), and shaped by that run's retro.

## The original brief

Adam's brief that started the project, as written, except its creative
principles, which are in `docs/DESIGN_PRINCIPLES.md`.

I want to explore an idea for an AI-native collection of small games inspired by nostalgic cartoons from different countries. Please act as a research and product-thinking partner. The idea is early; help me investigate and shape it before building a platform.

### How it started

I made a simple game called Muddy Puddles to teach my three-year-old the keyboard arrow keys. Agentic coding let me make it quickly, and we had a lot of fun playing together. I then developed a more elaborate version: https://alchemication.github.io/muddy-puddles/models/claude-opus-5-5/index.html

That made me wonder what else becomes possible when a person can turn a particular character, learning goal, and childhood memory into a playable experience.

### The idea

Start with one well-known or quirky Polish cartoon world—perhaps Reksio, Kot Filemon, Pampalini, or the world of Smok Wawelski and Baltazar Gąbka—and create a short game that feels true to it. Research the original cartoons and episodes, including material available on YouTube, before deciding what the game should be.

The game could have versions for different ages, including adults. It might teach a practical skill, explore the cartoon’s story and universe, or support an age-appropriate educational goal. A child should enjoy it as a game; a parent might rediscover something from their childhood and share it with their child.

Each world should also have a researched, accessible introduction: who the characters are, how they relate, what the story is about, and which details come from the original versus our own game. For example, someone may remember Don Pedro without remembering his role in *Porwanie Baltazara Gąbki*. Children could discover that context through play, while parents could read a short guide and find the relevant episode.

Poland would be the starting point, not the limit. I’ve spoken with friends from Spain and India, and they immediately thought of cartoons they feel nostalgic about. Over time, the collection might be organised by country, language, and generation, with people from each culture helping identify and interpret the worlds that matter to them.

I also wonder whether these games could connect people across cultures. Childhood cartoons are rarely the subject of cross-cultural conversations, yet they may offer a personal, playful way to ask someone: *What did you grow up watching? What did you love about it?* The collection could let people share those memories and discover the worlds that shaped someone else’s childhood.

### What I wanted to find out first

Help me research a few candidate Polish cartoons and choose **one very small MVP**: one world, one short game, one initial audience, and one reason to play it. Look at the original material and credible sources; distinguish verified details from interpretations or invented game ideas. Suggest game mechanics that emerge from the character and story, rather than attaching a generic quiz to familiar artwork.

Explore what AI could usefully do in the creation process: researching source material, mapping characters and stories, proposing mechanics, developing age variants, generating assets and code, and helping iterate after playtesting. I am not assuming that the finished game needs live AI.

I want to test whether families enjoy playing together, whether children connect with a character they may not know yet, whether the result feels authentic to people who grew up with the cartoon, and whether they would welcome another playable episode. Please challenge weak assumptions and propose a practical first experiment. Set trademark and licensing questions aside for the initial creative exploration, but identify them as a question to resolve before any broader release.
