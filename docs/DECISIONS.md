# Decisions

What has been decided, and why, so it isn't reopened by accident. Each one
can change: say so, and update it here. Adam's original brief is at the end;
how the games should feel is in `docs/DESIGN_PRINCIPLES.md`.

## Scope

- **One world: Reksio.** It is wordless, so a 3-year-old can play without
  reading and non-Polish families can play without translation. One small
  game then tests three things at once: do families play together, does a
  child connect with a character they don't know, does it feel authentic to
  people who grew up with it. Runner-up: Kot Filemon (curiosity mechanics);
  Baltazar Gąbka is a later world for older children and adults.
- **One audience: a parent and a child of about 3, together**, the parent
  being the one who remembers the cartoon. Adult versions, age variants and
  the cross-cultural collection wait until this works.
- **No platform yet.** One game and a short parent card. No catalogue,
  country map or memory sharing.
- **No live AI in the finished game.** AI is for research, design and
  building.

## The games

- **The first game is Reksio's yard, not the intro.** A playable intro
  (press to do each credit gag) was built and dropped: one gag alone is thin
  to play, and credit cards are text a toddler can't read. The yard has no
  text and answers every tap. The intro brief is kept, parked.
- **Every world has a home, and episodes open off it** (2026-10-07). Eliot
  liked the yard's encounters with other animals most and found them too
  short; most Reksio episodes are exactly that, Reksio and one animal over
  several steps. So the next game is an episode, entered through a doorway
  taken from its own opening (a door, the gate, a hole, a toy rocket).
  Doorways are found, never unlocked. A cartoon without a home gets an
  invented one. No hub until there are three episodes. Still open: entered
  from the yard, or from a main screen.
- **First episode: *Reksio poliglota* (1967).** Set in a yard, wordless by
  premise, built from encounters. *Reksio kosmonauta* (Adam's favourite) is
  parked as the biggest build (rocket, space, robots); its frame pass is in
  `worlds/reksio/episodes/reksio-kosmonauta.yaml`. For when it comes back
  (interpretation): the doghouse frames the dream at both ends and food
  brings him home; the warmest beat for a toddler is the scary dragon
  turning friendly; the robots, the zapping and Reksio knocked flat need
  softening or leaving out.
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
  barks, local only. Characters are drawn in code, never with image models
  imitating the artwork.
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
- **Procedures become skills, improved by every run** (2026-10-07), so
  someone other than Adam can run them. `new-world` waits for a second
  cartoon.

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
