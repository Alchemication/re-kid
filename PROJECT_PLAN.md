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
- **First game: the title sequence, slowed down.** The intro is about 43
  seconds of credit cards. On almost every card Reksio does one gag that acts
  out the credited job: reading the script, posing for the camera, crashing
  cymbals for sound, snipping film for editing, stretching for animation. A
  toddler can do each of these, and every parent has seen them, because the
  same intro opens every episode from 1972 to 1980. It is small, has no story
  to follow and no peril, and the theme is the most-remembered sound of the
  series. It is built as a standalone game, not as a menu. When a second game
  exists, the doghouse at the end becomes its door, and a menu grows out of
  that.
- **Second game: Reksio kosmonauta (1972, Marszałek), parked.** Adam's
  favourite episode. The frame pass is recorded below under "Parked".
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
  melodies are needed, from what Adam marks. The original theme, cut into loops, is
  used for the private test; original "inspired by" music is a later
  decision, after families have played.
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
| 5 | Game brief | `games/<slug>/brief.yaml`, each element marked as from the original or invented | Not started |
| 6 | Game | `games/<slug>/` (static web game) | Not started |
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

1. **Adam: mark the sounds and melodies that matter.** Run
   `uv run python main.py mark reksio`. A page opens with the intro video, its
   waveform and spectrogram, the 10 moments and the beat grid. Drag across the
   waveform (or press `M` at a sound's start and end) to mark it, name it, pick
   sound effect / melody / other, and note what you hear. Each moment's
   "Listen for" question has an answer box too, for things that can't be
   marked ("no sniffing sound"). Speed 75% / 50% helps
   with exact edges; `?` lists every key. Marks save to `intro.yaml` as you go,
   and each mark's clip is cut to `audio/intro/marks/<id>.wav` on every save.
   Pick what is striking or worth reusing, such
   as the cymbal crash, a gulp or the theme's hook. There is no need to cover
   everything. Measured so far, not heard: a pulse of about 143 BPM; a
   near-silence around 4–6 s under the title; a cymbal-shaped burst at 18.2 s,
   where Reksio crashes his cymbals; and a run of strong, even hits at 37–42 s
   on the studio card.
2. **Game brief** for the intro game (`games/intro/brief.yaml`, schema written
   from this first brief). It decides which marked sounds the child triggers
   and what music plays under each moment.
3. **Only for the sounds the brief needs:** cut them from the mix, or try
   isolating them. The [GAD Records album](https://gadrecords.bandcamp.com/album/reksio)
   has the theme with and without effects; if the two line up, subtracting
   one from the other may leave the effects alone. Demucs can split music into
   parts. Spotify's Basic Pitch can turn melodies (not effects) into MIDI if
   we compose "inspired by" music.
4. Build, then playtest.

## MVP game — working concept (not decided)

For the intro game. Settle these in the brief, once the sound is known.

- **The intro, one card at a time.** Each card's musical phrase loops, and the
  card waits until the child does its gag: sniff in, point at the title, show
  the note, pose for the camera, crash the cymbals, snip the film, stretch,
  eat, stamp. The original bit of animation and sound then plays, and the next
  card comes in. It ends with a fade to black and the doghouse. Finite: no
  score, no streaks, no "play again?" nudge.
- **Keep the credit names.** They honour the makers, and a parent can read them
  aloud. That makes it a small "how a cartoon is made" moment.
- **Controls: one big action for the child** (a key or a tap per gag). Whether
  the parent gets a role, such as the bark key from the earlier concept or
  reading the credits aloud, is open.
- **Sound: the original theme, cut into phrases, for the private test only.**
  A public version needs a licence or a re-recording.
- **Wordless, like the original.**
- **Flat, outlined characters over textured painted backgrounds**, in an
  earthy palette with small red accents (see `aesthetics` in the dossier).
  Restraint over effects.
- **A parent card at the end:** 3–4 sentences of context plus a link to the
  source episode on the official SFR channel.

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
