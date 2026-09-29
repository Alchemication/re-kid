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
- **One audience: a parent and a young child (about 3) playing together**,
  with the parent as the one who remembers the cartoon. Adult versions, age
  variants and the cross-cultural collection all wait until this works.
- **No platform yet.** Just one game plus a short parent card. No catalogue,
  country map or memory sharing.
- **Research happens in Claude Code sessions** (web search, web fetch, frames
  from yt-dlp and ffmpeg), not through API calls from `main.py`. A Claude skill
  for world research may come later. `main.py` is only for structured work:
  validating, inspecting and scaffolding.
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
| 2 | Episode catalogue | `episodes/index.yaml` | Not started; schema not written |
| 3 | Episode selection | shortlist of 2–3 with criteria and reasoning | Not started |
| 4 | Breakdowns | `intro.yaml`, `episodes/<slug>.yaml` (beat by beat) | Not started |
| 5 | Game brief | `games/<slug>/brief.yaml`, each element marked as from the original or invented | Not started |
| 6 | Game | `games/<slug>/` (static web game) | Not started |
| 7 | Playtests | `playtests/<date>-<family>.yaml` | Not started |

Check stage 1 with `uv run python main.py validate reksio` and
`uv run python main.py show reksio --status unknown`.

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

## Next steps

1. **Adam: a listening pass (about 20 min).** Listen to the theme on the
   [GAD Records album](https://gadrecords.bandcamp.com/album/reksio) (track 1,
   with and without effects) and one full episode, e.g.
   [Reksio wybawca](https://www.youtube.com/watch?v=2E-4XH4ujf0). Note:
   - the theme's instruments, tempo and mood;
   - whether there is any speech or narration;
   - what Reksio's bark sounds like;
   - whether music follows the action or sits in the background, and whether
     there is ever silence;
   - other sound effects;
   - how it feels versus your memory of it.

   Give rough notes to Claude, who records them as `observed` claims with
   `observed_by: adam`.
2. **Claude: an episode schema plus catalogue.** Write `schema/episode.py`
   (EpisodeRef for the catalogue; Breakdown/Beat for dissections, reused for
   the intro) with tests and `validate` support. Then fill `episodes/index.yaml`
   with all 65 episodes: title, year, director, runtime, official upload URL
   where one exists. The pl-wikipedia table and FilmPolski are the backbone;
   the SFR YouTube channel supplies the URLs.
3. **Selection.** Agree on criteria (helping story, legible without words,
   small cast, one main setting, calm peril, available officially), then pick
   2–3 episodes to watch closely.
4. **Breakdown** of the title sequence and the chosen episode, beat by beat,
   from frames plus Adam's ears.
5. **Game brief**, then build, then playtest.

## MVP game — working concept (not decided)

Revisit after stage 4; the episode should shape the mechanics.

- **"Reksio helps": one scene, 5–8 minutes, three small moments of helping,
  then an ending.** Finite: no score, no streaks, no "play again?" nudge.
- **Two players on one keyboard.** The child moves Reksio with the arrow keys
  (building on Muddy Puddles). The parent has one key: a bark that makes the
  world react. This builds co-play into the controls.
- **Wordless, like the original.** Hints and needs appear as pictogram thought
  bubbles (the series does this). Start at the doghouse and end back home,
  followed by a KONIEC card, mirroring the sampled episodes.
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

Episodes and frame stills are gitignored (`worlds/*/media/`,
`worlds/*/frames/`). Recreate them on a new machine (needs `yt-dlp` and
`ffmpeg`):

```sh
mkdir -p worlds/reksio/media worlds/reksio/frames
# Native 480p. Avoid the "-sr" AI-upscaled formats: they distort line and texture.
yt-dlp -f "135+140/best[height<=480]" --merge-output-format mp4 \
  -o "worlds/reksio/media/1972-kosmonauta.%(ext)s" https://www.youtube.com/watch?v=unuTG_vG0AI
yt-dlp -f "135+140/best[height<=480]" --merge-output-format mp4 \
  -o "worlds/reksio/media/1977-wybawca.%(ext)s" https://www.youtube.com/watch?v=2E-4XH4ujf0
yt-dlp -f "135+140/best[height<=480]" --merge-output-format mp4 \
  -o "worlds/reksio/media/1980-remontuje.%(ext)s" https://www.youtube.com/watch?v=24Xi59t3S5U
# Contact sheet: one frame every 15 s
ffmpeg -i worlds/reksio/media/1977-wybawca.mp4 \
  -vf "fps=1/15,scale=320:-1,tile=6x7" -frames:v 1 worlds/reksio/frames/1977-wybawca-sheet.jpg
```

YouTube returned "This video is not available" once on the Mac Mini (probably
a stale yt-dlp); the Homebrew build (2026.08.19) worked.
