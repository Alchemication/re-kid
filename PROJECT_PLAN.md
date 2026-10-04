# Project plan

Where re-kid stands and what comes next. Read this first in a new session;
`PROJECT_IDEA.md` has the original brief, `CLAUDE.md` the working rules.
Update the **Status** and **Next steps** sections as work lands.

## Decisions so far

- **One world: Reksio.** It is wordless, so a 3-year-old can play without
  reading and non-Polish families (friends from Spain and India) can play
  without translation. That lets one small game test three things at once:
  whether families play together, whether a child connects with a character
  they don't know, and whether it feels authentic to people who grew up with
  it. Kot Filemon was the runner-up (curiosity/discovery mechanics), and
  Baltazar Gąbka is a better later world for older kids and adults.
- **Reksio kosmonauta (1972, Marszałek), parked.** Adam's favourite episode;
  a likely first episode to enter from the yard. The frame pass is recorded
  below under "Parked".
- **One audience: a parent and a young child (about 3) playing together**,
  with the parent as the one who remembers the cartoon. Adult versions, age
  variants and the cross-cultural collection all wait until this works.
- **No platform yet.** Just one game plus a short parent card. No catalogue,
  country map or memory sharing.
- **Research happens in Claude Code sessions** (web search, web fetch, frames
  from yt-dlp and ffmpeg), not through API calls from `main.py`. A Claude skill
  for world research may come later. `main.py` is only for structured work:
  validating, inspecting and scaffolding.
- **Sound: the computer measures, Adam listens.** No model we can call hears a
  recording reliably. `codex exec` (v0.159) takes images only, and its voice
  mode is a live microphone. Antigravity's `agy -p` (1.2.14, on the Google
  subscription) was given a blind test on 2026-09-30: three synthetic sounds
  with known answers plus the real cymbals moment, all with neutral names.
  - WAV files: both models said they could not hear them.
  - MP3 files, Gemini 3.8 Flash: invented details, e.g. three rising chimes
    for a single steady tone, and a crash at 0.15 s that is really at 2.5 s.
  - MP3 files, Gemini 3.1 Pro: got the rough shape of the synthetic sounds,
    but judged every file (2–6 s) to last 1 s, so all its times were wrong.
  - On the real theme, the two models disagreed completely ("brass fanfare"
    vs "8-bit synth melody"), and neither noticed the cymbal crash.

  So model listening is not used, not even as a lead: a confident wrong
  description would prime the listener.

  Instead, `src/audio.py` measures locally with librosa and ffmpeg (tempo,
  beats, hits, loudness, spectrograms). Adam selects and names the sounds that
  matter by ear, and only his marks become claims. Per-moment loops guessed
  from the beat grid were dropped: the game brief decides which sounds and
  melodies are needed, from what Adam marks.
- **The first game is Reksio's yard, not the intro.** A playable intro
  (press to do each credit gag) was built and dropped: on its own a gag is
  thin to play, and credit cards are text a toddler can't read. The yard has
  no text, gives every tap an answer, and can later become the home screen
  that leads into episode games. The intro brief is kept, parked.
- **Inspire, don't copy (Adam's current thinking, open to change once the game
  is visible).** The game's drawings, sounds and music are new and made for
  it, in the spirit of the original. Original sounds and melodies appear only
  as occasional easter eggs. Adam's marks are inspiration, not a parts list.
  This replaces the earlier idea of looping the original theme, and makes a
  public version far easier to license.
- **Every statement about the original is a claim with provenance**
  (`verified` / `sourced` / `observed` / `interpretation` / `unknown`), so facts
  and our own ideas never blur. Rules are in `CLAUDE.md`.
- **No live AI in the finished game is assumed.** AI is for research, design
  and building. Don't use image models to imitate the original artwork; use
  code-drawn or SVG characters over a few painted background plates.
- **Licensing is parked for the private MVP** but blocks any public release.
  Recorded as `rights` (unknown) in `worlds/reksio/world.yaml`.

## Flow

One validated file per stage, under `worlds/<id>/`:

| # | Stage | File(s) | Status |
|---|-------|---------|--------|
| 1 | World dossier | `world.yaml`, `sources.yaml` | First pass done (see gaps below) |
| 2 | Episode catalogue | `episodes/index.yaml` | Done: 65 episodes, 31 online |
| 3 | Selection | The intro first, Kosmonauta next (see Decisions) | Done |
| 4 | Breakdowns | `intro.yaml`, `episodes/<slug>.yaml` (beat by beat) | Intro: frames done, sound pending |
| 5 | Game brief | `games/yard/brief.yaml` (`schema.brief`); `games/intro/` parked | Yard: first draft |
| 6 | Game | `games/yard/game/` (static web game) | Yard proof of concept built |
| 7 | Playtests | `playtests/<date>-<family>.yaml` | Not started |

Check stage 1 with `uv run python main.py validate reksio` and
`uv run python main.py show reksio --status unknown`. Browse stage 2 with
`uv run python main.py episodes reksio [--online]`, and the intro with
`uv run python main.py show reksio --section intro`.

## Status

**Stage 1 (dossier), first pass.** 78 claims from 15 sources. Solid on
production, creators, years, episode counts, composer, legacy and availability.
Thin on:

- **Sound.** Claude cannot hear audio. The theme, barks, whether there is any
  speech, and how music is timed to action are all unconfirmed.
- **Characters beyond Reksio and the boy.** The rooster, gander, owl and
  red-eared dog come only from en-wikipedia and have not been seen on screen.
- **Aesthetics and pacing** rest on 3 of 65 episodes: Kosmonauta (1972),
  Wybawca (1977) and Remontuje (1980).
- **Two good sources not yet read in full:** the Filek-Marszałek/Kolska memoir
  (2022) and Babulewicz's musicology chapter (2018).
- **Rights:** unknown.

The full list is under `open_questions` in `worlds/reksio/world.yaml`.

**Stage 2 (catalogue), done.** `worlds/reksio/episodes/index.yaml` lists all 65
episodes in pl-wikipedia's order, with year, directors, FilmPolski runtime, an
English synopsis (translated from FilmPolski) and the official upload where one
exists. It was cross-checked against FilmPolski (64 of 65 titles) and the
studio's channel (31 public uploads: 1967 and 1972–1980, none from 1981 on).
Where FilmPolski and pl-wikipedia disagreed, on-screen credits settled two
cases, both in FilmPolski's favour. Five remain open: the years of Bocian and
Kruk, the directors of Kruk and Dzięcioł, and Papuga, which only pl-wikipedia
and Filmweb list. The same data corrected the dossier: Ćwiertnia directed 17
serial episodes, not 13.

**Stage 4, intro breakdown: frames done.** `worlds/reksio/intro.yaml` has 10
timed beats from the Kosmonauta upload, read every 0.5 s. Each beat records the
action, the on-screen credits, and an `unknown` sound claim that asks a specific
question. The intro was checked in four uploads (1972, 1974, 1976 and 1980):
the gags, their order and their timing match within about a second, and only
the lettering changes. This corrected the dossier: popping out of the doghouse
is the start of each episode, not the end of the intro (Remontuje opens on a
street). One visual question is open: what is the red object Reksio brings
down on the film strip at the end?

## Parked: Kosmonauta

**Frame pass (Claude, frames only, not yet in a breakdown file).**
The episode runs 9:57, with frames read every 4 s and denser at the unclear
parts. The time codes are approximate.

- 0:00–0:43: credits.
- 0:44–1:12: Reksio comes out of the doghouse, sees a jet pass overhead,
  climbs onto the doghouse roof and stares up, wondering. Then a cut through
  black.
- 1:14–2:36: a rocket stands in an orange field, wearing a red dog collar and
  tied to a stake by a leash. Reksio loads it with bones and a street lamp and
  puts on a spacesuit. On its first try the rocket only circles on the leash;
  he climbs out, unbuckles the collar and launches.
- 2:40–3:30: space. A meteor passes, the rocket's nose is torn open, bones
  spill out, Reksio tumbles out holding the lamp and lands on a planet of
  painted caves.
- 3:30–5:00: he takes off the suit, plants the lamp, and meets a crowned
  mermaid princess (dog-faced, long red ears). They float and dance together.
- 5:00–6:20: a three-headed, dog-headed dragon comes out of a red cave door.
  It is frightening at first, then friendly: it licks Reksio, tickles him and
  plays.
- 6:20–8:00: a flying saucer lands with boxy black-and-red robot dogs. They zap
  and tie up the dragon, knock Reksio flat, and lead the princess away on a
  leash. Reksio gets up, fights a robot and takes over its saucer.
- 8:00–9:20: he frees the dragon and gets the princess back; she kisses him.
  He flies off, and the robots' saucer attacks him in space with a claw. He
  smashes it and laughs.
- 9:20–9:57: wavy lines drift across the dome. At home, the boy has put down a
  steaming food bowl. Reksio wakes on the doghouse roof, jumps down, eats, the
  boy hugs him, an iris closes on Reksio, then KONIEC.

What this means for the game (interpretation):

- The dream is framed by the doghouse at both ends, and the smell of food
  brings him home. That fits the "start and end at home" idea.
- The helping arc survives: free the dragon, rescue the princess.
- The warmest beat for a 3-year-old is "scary dragon turns out to be friendly".
- The robots, the zapping and Reksio being knocked flat are the sharpest peril;
  the game should soften them or leave them out.

When it comes back:

1. **Adam's listening pass on the whole episode**: the rocket launch, space,
   the dragon, the robots, the waking-up moment, and whether the dream has its
   own music.
2. **Claude: `episodes/reksio-kosmonauta.yaml`**, using the same Breakdown
   schema as the intro.

Game ideas for it: unbuckle the rocket's collar so it can fly, make friends
with the dragon, free the dragon and the princess, and let the smell of food
wake Reksio at home.

## Next steps

1. **Adam: try the yard** (`uv run python main.py play reksio`), alone and
   then with Eliot. The yard is wider than the screen and the view follows
   Reksio, from the house wall (left end) to the fence and gate (right end).
   Reksio is small, seen from the side, drawn in code on a sponge-painted
   yard; solid things stay still, only plants sway and the bird hops. Tap the
   ground and he walks there; tap a thing and he uses it: naps and snores in
   the doghouse doorway, laps from his bowl, drinks at the tap and shakes
   himself dry, sniffs the flowers and sneezes, barks at the house window,
   pokes at the gate, barks the bird off its perch, digs up a bone, stamps a
   red film strip frame by frame until it rolls up into a reel. Press and
   hold on Reksio and he stretches like a dachshund, snapping back on release.
   He walks short trips, runs long ones, hops for joy, and when left alone
   keeps busy with random dog moves (sniffing, wandering, scratching, a
   play-bow, chasing his tail…) and the odd thought bubble. Each of the six
   main things lowers the sun a step and warms the sky; after the sixth, evening falls and the picture closes in a circle on the doghouse. No text. When left alone, Reksio shows a thought bubble with a
   picture of the nearest main thing he still wants, and it twinkles; arrows
   and space work too. All sounds are new, made in the browser; the bone find
   plays Adam's bark clip as an easter egg if it exists locally.

   **Music:** a pizzicato "oom-pah" in B-flat with a clarinet hook, played
   note by note from CC0 instrument samples (VSCO-2 CE and VCSL, packed by
   `main.py samples reksio yard`), that follows the game: fuller while
   playing, sparse when left alone, in-key flourishes for actions, slower
   with each sunset step, a harp lullaby at evening. The hook and the
   stretch run come from a Basic Pitch transcription of Adam's two melody
   marks, which is a measurement, not an observation: **Adam to confirm by
   ear whether it sounds like the theme**, and say what is too busy, too sad
   or annoying. A recognisable melody is still Kowalowski's composition, so
   it blocks a public release like the recording does.
   **Clarity and life:** paw markers over everything tappable (the one in
   reach grows), a tray of six pictures that fill in as main things are
   done, and a first wave of creatures (`creatures.js`): a fly, a bumblebee
   and a spider with its web, which notice Reksio and each other. New
   gestures: biting his tail, sitting, howling, watching and pouncing on the
   fly, getting startled.

   **Wave 2 ideas for a living yard** (pick and order with Adam; each should
   teach a small cause and effect a toddler can see):
   - *Weather:* clouds roll in, rain falls, puddles form; Reksio splashes and
     shakes dry; the sun returns and the flowers grow a little and open; a
     rainbow, briefly.
   - *Snail:* comes out only after rain, slides slowly leaving a shiny trail,
     pulls into its shell when Reksio sniffs it, peeps out again.
   - *Butterfly:* only in sunshine; flutters from flower to flower, sometimes
     lands on Reksio's nose (he goes cross-eyed, sneezes); hides from rain.
   - *Wasp:* hovers at the bowl when there is food; Reksio barks, it circles
     back; he learns to leave it be (it goes when the food is gone).
   - *Fox:* at dusk, eyes and a sniffing nose under the gate; Reksio barks
     and it slinks off; the hens (if added) flutter.
   - *Ants:* a line marching to crumbs the lapping dropped by the bowl,
     carrying them home; a raindrop scatters them.
   - *Worms:* surface after rain; the bird hops down to catch one.
   - *Leaves and wind:* a gust blows leaves across; Reksio chases one.
2. **Iterate on what Eliot does with it**: which things he goes for, whether
   he finds them unaided, whether the ending lands.
3. **Later:** the yard becomes the home screen, and new things in it lead
   into episode games (a toy rocket for Kosmonauta). Parked ideas are listed
   in the yard brief's open questions and the intro brief.

## First experiment (after the game exists)

- **Who:** 6–8 families — about 4 Polish parents who grew up with Reksio and
  2–4 non-Polish families.
- **How:** watch them play without guiding them. Afterwards, show Polish
  parents a 30 s original clip and ask what felt off.
- **What to watch for:**
  - Did they finish?
  - Did parent and child talk while playing?
  - Did the parent spontaneously tell a childhood story?
  - Did anyone open the episode link?
  - Did anyone ask for another episode without being prompted?
  - For Eliot's first test: does he want to make Reksio do the next gag, and
    does he enjoy what Reksio does?
- **Don't measure** time played or replays.
- **Also track Adam's build hours.** If one person can research and build a
  faithful episode in about two weekends, a collection is viable.

## Local reference media (not in git)

Media, frames and generated audio are gitignored (`worlds/*/media/`,
`worlds/*/frames/`, `worlds/*/audio/`). What is kept locally:

- `media/1972-kosmonauta.mp4`: the full episode, for when Kosmonauta comes
  back.
- `media/intro/1972-kosmonauta.mp4`: its first 46 s, the clip `main.py mark`
  plays.
- `frames/intro/`, `frames/kosmonauta/`: contact sheets behind `intro.yaml` and
  the Kosmonauta frame pass. Names give the year, episode, time range and step,
  e.g. `1972-kosmonauta-0000-0022-halfsec.jpg`.
- `audio/intro/`: measurements and spectrograms (made on the first `mark` run)
  and each mark's clip (kept in step with the marks on every save).

Recreate on a new machine (`brew install yt-dlp ffmpeg`):

```sh
mkdir -p worlds/reksio/media/intro worlds/reksio/frames/intro
# Native 480p. Avoid the "-sr" AI-upscaled formats: they distort line and texture.
yt-dlp -f "135+140/best[height<=480]" --merge-output-format mp4 \
  -o "worlds/reksio/media/1972-kosmonauta.%(ext)s" https://www.youtube.com/watch?v=unuTG_vG0AI
# Intro clip: the first 46 s (the intro is the same in every episode from 1972 on)
ffmpeg -i worlds/reksio/media/1972-kosmonauta.mp4 -t 46 -c copy \
  worlds/reksio/media/intro/1972-kosmonauta.mp4
# Contact sheets: every 0.5 s for the intro, every 4 s for a whole episode.
# Homebrew's ffmpeg has no drawtext, so tiles carry no time codes; count them.
ffmpeg -i worlds/reksio/media/intro/1972-kosmonauta.mp4 -t 22 \
  -vf "fps=2,scale=320:-1,tile=6x8" -frames:v 1 \
  worlds/reksio/frames/intro/1972-kosmonauta-0000-0022-halfsec.jpg
```

Other episodes' upload links are in `episodes/index.yaml` (`watch_url`).
yt-dlp builds without a JavaScript runtime (e.g. `uvx yt-dlp`) get "This video
is not available" from YouTube; the Homebrew build works.
