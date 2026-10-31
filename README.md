# re-kid

Small, faithful games made from nostalgic childhood cartoons — starting with
one Polish world, Reksio, and one short game for a parent and a young child.

## Docs

- [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md): the next steps, in the agreed order.
- [docs/DECISIONS.md](docs/DECISIONS.md): what has been decided and why, and the
  original brief.
- [docs/DESIGN_PRINCIPLES.md](docs/DESIGN_PRINCIPLES.md): how the games should feel and
  what they must never do, with research on short play for toddlers.
- [docs/WORLD_MODEL.md](docs/WORLD_MODEL.md): the world state and the creature rules a
  scene's ambient life runs on.
- [CLAUDE.md](CLAUDE.md) (same as [AGENTS.md](AGENTS.md)): working rules for
  coding agents and people.
- [`.claude/skills/`](.claude/skills/): procedures for breaking down an
  episode, adding a gag, and making sounds and music.
- [experiments/sound/README.md](experiments/sound/README.md): the
  sound-generation experiment.
- [experiments/music/README.md](experiments/music/README.md): the
  music-generation experiment.
- `worlds/<id>/MUSIC_DIRECTION.md` ([Reksio](worlds/reksio/MUSIC_DIRECTION.md),
  [Krtek](worlds/krtek/MUSIC_DIRECTION.md)): what a world's music should
  be, from the films, our direction, and Adam's verdicts.
- This file: layout, commands, the site, performance, debugging the yard,
  reference media.

## Layout

```
main.py                 CLI entry point (dispatch only)
docs/                   the plan, decisions and design principles
src/
  config.py             paths and tunables
  schema/               pydantic models for every research file
  worlds.py             load/save YAML, cross-file validation
  commands.py           subcommand handlers
  replay.py             replays a game's bug report in Chrome and photographs it
  look.py               plays a gag in Chrome and photographs it as it runs
  audio.py              audio measurements, clips, spectrograms (ffmpeg, librosa)
  samples.py            downloads, measures and packs a game's instrument samples
  effects.py            trims, levels and packs a game's picked sound effects (the retro recipe)
  tunes.py              levels and packs a game's picked music takes (the same recipe)
  barks.py              cuts the marked original barks into a script for the games
  mark.py               local server for the sound-marking tool
  mark_ui/              its page: HTML, CSS, JS, vendored wavesurfer.js
  shared.py             copies shared/ scripts into the games that load them
shared/                 game scripts every game uses (debug.js: the clock, the recorder, the rules;
                        filmlook.js: the old-print look; takes.js: the music's recorded takes;
                        bed.js and ensemble.js: the music bed's rules and the band that plays it;
                        world.js, creature.js and ambient.js: the world model, docs/WORLD_MODEL.md;
                        wind.js: the breeze and its gusts);
                        `main.py shared` copies each into the games whose page loads it
worlds/<id>/
  world.yaml            series dossier (schema.world.WorldDossier)
  sources.yaml          every source the world's files cite
  MUSIC_DIRECTION.md    what its music should be: from the films, our direction, Adam's verdicts
  episodes/index.yaml   episode catalogue (schema.episode.EpisodeCatalogue)
  episodes/<id>.yaml    one episode, beat by beat (schema.breakdown.Breakdown)
  intro.yaml            title sequence, beat by beat (schema.breakdown.Breakdown)
  audio/intro/          measurements, spectrograms, mark clips (generated, gitignored)
  media/, frames/       downloaded video and contact sheets (gitignored)
  games/<game>/brief.yaml  game brief (schema.brief.GameBrief)
  games/<game>/samples.yaml  instrument samples a game uses (schema.samples.SampleSet)
  games/<game>/effects.yaml  recorded sound effects picked by ear (schema.effects.EffectSet)
  games/<game>/effects/      the picked takes, as made (packed into game/effects.js)
  games/<game>/tunes.yaml    recorded music picked by ear (schema.tunes.TuneSet)
  games/<game>/tunes/        the picked music takes, as made (packed into game/tunes.js)
  games/<game>/game/    the game: static HTML, CSS and plain scripts
  games/<game>/tests/   the game's JS unit tests (node:test)
  games/<game>/lab/     workbench pages beside a game, opened from disk, not published
                        (yard/lab: Reksio drawn from poses by game/figure.js)
experiments/sound/      making sound effects with a model and picking them by ear on a
                        board page (scripts committed; audio and the API key in .env not)
experiments/music/      the same for the games' music, against what the game plays today, the bed
                        board, and a kit for listening to the films (listen.html)
experiments/board/      what both boards share: the page, its look (Krtek's meadow) and keys
.claude/skills/         procedures for Claude Code sessions (new-world, new-episode, new-character, new-gag, new-sound, new-music)
tests/                  pytest; test_game_browser.py drives the games in Chrome
site/                   the site's front page (index.html): pick a scene; each card (reksio.html,
                        krtek.html) is its game's own painting, character and old-print look, alive
.github/workflows/pages.yml  publishes the games and the front page to GitHub Pages
eslint.config.mjs       lint for the game scripts (run with npx, no npm project)
```

Every statement about an original work is a claim with a status —
`verified`, `sourced`, `observed`, `interpretation`, `unknown` — and the
sources behind it. `validate` enforces the evidence each status needs.

`mark` opens a local page for marking sounds by ear: the intro video next to
its waveform and spectrogram, with the breakdown's moments and the measured beat
grid. Drag to select a sound or melody, name it, note what you hear, and answer
each moment's "Listen for" question; marks and answers are saved to
`intro.yaml` as the listener's observations, and each mark's audio is kept cut
in `audio/intro/marks/<id>.wav`, updated on every save. The measurements (`audio.py`) are leads for the
listener, never claims on their own.

## Adding a cartoon, and what follows

Each step but the brief is a skill in `.claude/skills/`, run in a Claude
Code session. Top to bottom is the usual order; the steps under the scene
repeat as often as needed.

```
new cartoon
 └─ new-world ──────────► worlds/<id>/ world.yaml, sources.yaml,
     │                    episodes/index.yaml, intro.yaml (if it has one)
     ├─ new-episode ────► episodes/<id>.yaml, only when a gag needs one
     │                    episode beat by beat; Adam marks its sounds (main.py mark)
     └─ the scene's brief  games/<game>/brief.yaml, written with Adam (no skill)
         └─ the scene     games/<game>/game/
             ├─ new-character ► its hero drawn after the films, side by side
             ├─ new-gag ──► one gag or encounter at a time
             ├─ new-sound ► its sound effects, Adam picks takes by ear
             └─ new-music ► its music, Adam picks takes by ear
```

Every run ends with a retro that proposes edits to its skill.

## Commands

```
uv sync
uv run python main.py list
uv run python main.py validate [WORLD...]
uv run python main.py show WORLD [--status unknown] [--section sound]
uv run python main.py episodes WORLD [--online]
uv run python main.py mark WORLD [MEDIA] [--by NAME] [--no-open]
uv run python main.py play WORLD [GAME] [--debug] [--seed N] [--still]
uv run python main.py replay [REPORT] [--last S] [--every MS] [--out DIR]
uv run python main.py look WORLD [GAME] [--flags Q] [--before JS]... [--watch JS]
                          [--for S] [--every MS] [--size WxH] [--close] [--out DIR]
uv run python main.py samples WORLD [GAME]    # rebuilds the game's samples.js
uv run python main.py effects WORLD [GAME]    # rebuilds the game's effects.js
uv run python main.py tunes WORLD [GAME]      # rebuilds the game's tunes.js
uv run python main.py barks WORLD             # packs the marked barks into barks.js
uv run python main.py shared                  # copies shared/ scripts into the games
uv run python main.py schema world|sources|episodes|intro|brief
```

Development: `uv run ruff check . && uv run ruff format . && uv run pytest`,
`npx --yes eslint@10.12.0 worlds` for the game scripts, and
`uv run pytest -m browser -n 8` (about 2 minutes) after changing a game.

## The site

Every push to `main` that changes a game or `site/` publishes it to GitHub Pages
(`.github/workflows/pages.yml`): https://alchemication.github.io/re-kid/
opens on a page to pick a scene, with no words to read (`site/index.html`):
Reksio in his yard and the mole in his meadow, alive, each card a page of its
own in a frame (`site/reksio.html`, `site/krtek.html`) built from its game's
parts (its painting, the character's drawing, the old-print look), doing
things at random; a tap on one and he cheers, and his scene opens. It opens from disk too, finding the games in `worlds/`. Each game is
at `<site>/<world>/<game>/`; add the front page to the home screen and both
are a tap away. Only the game folders and `site/` go out, the original barks with them (`barks.js`); on an iPhone or iPad the sound plays even with the ringer
switch on silent (Safari 17+). The game pauses, sound and all, while its page is hidden (another tab, a
covered window, a locked phone) and plays on when it is back. On a phone, play it on its side: a screen
wider than 16:9 shows more of the yard (up to 21:9), and on a short screen
the top of the sky is cut, so the yard shows bigger (`painting.js`). Held
upright, a phone shows a picture asking to turn it, and the game waits. An iPhone can't make a
page full screen, so add it to the home screen (Share → Add to Home Screen)
and it opens without Safari's bars; elsewhere the ⤢ corner button does it.
Bug reports saved on the site replay locally:
`main.py replay` maps them to this repository's copy of the game.

For parents: the yard is made to be played together, a few minutes in the
daytime. Reksio's bedtime is the end of his day, not a way to settle a child
before bed; doctors advise no screens in the hour before sleep
(`docs/DESIGN_PRINCIPLES.md` has the research). Two things are for grown-ups:
hold the house for 2 seconds and the sun goes down at once, so the evening
comes early; after the end, taps do nothing, and holding the sun in the
bottom-left corner for 2 seconds starts a new morning. Krtek's meadow ends the
same way: asleep in his den, and only the corner sun, held, starts a new day.

## Performance

`uv run pytest -m perf` checks the yard against a budget on a phone-sized
screen with the CPU slowed 4x (run it alone: it times things). It prints
what it measured, for example `idle: main thread 14% busy, 60 fps, frames
p50 16.7 ms, p95 16.7 ms`.

The phone's GPU, battery and heat can only be measured on the phone. On an
iPhone: Settings → Safari → Advanced → Web Inspector on; connect it to the
Mac; in Safari on the Mac, Develop → (the iPhone) → the yard's page;
Timelines → record a few minutes of play. CPU usage and Energy Impact show
what costs the most. On Android, Chrome's `chrome://inspect` does the same.

## Debugging the yard

Flags in the page address (`main.py play` takes the first three):

| Flag | Does |
|------|------|
| `?seed=N` | Seeds a play: with the layout flags below, the same yard every time, and what happens in it closely. Every play prints the address that replays it in the console. |
| `?debug` | State overlay, every event in the console, a "report a bug" button. |
| `?still` | Reksio moves only when asked: try one gesture or gag alone. He starts up, not asleep in his doghouse. |
| `?morning=1` / `0` | Start asleep in the doghouse at dawn (he wakes by himself after 6–9 s, or at the first tap), or start the day with him up. On unless `?still`. |
| `?props=trap,bowl` | Which props are out (of bowl, dig, film, trap, tree, berries). |
| `?sky=clear\|fair\|cloudy\|golden` | The kind of day: no clouds, a few drifting, more with a haze and a softer sun, or warmer light all day. |
| `?day=S`, `?hour=H` | How long the whole day lasts (08:00 to 20:00, 300 s otherwise), and the hour it begins at (8 to 20): `?hour=18.5` to see the evening soon. |
| `?creatures=fly,spider` | Which creatures come (`?creatures=` for none). |
| `?flowers=1` / `0` | Flowers out or not. |
| `?rain=1` / `0`, `?rain-at=S` | Force the shower, and when it starts. |
| `?fog=1` / `0` | Force the morning fog (some plays wake in it; it lifts by 10:30). |
| `?season=winter` / `summer` | Force the season. A winter play (one in four): snow on the yard, the shower falls as snow, the puddles are ice; no flowers, fly, bee, spider or bramble; the fruit tree is bare and snowy. |
| `?snowman=SECONDS` / `built` | In a winter play, the boy comes out to make the snowman then (`snowman.js`); `built`: it stands there from the start, the boy waiting by it for its eyes and arms. |
| `?mouse-at=S`, `?visitor-at=S`, `?hen-at=S`, `?mushrooms=S` | When the mouse, the tree's visitor, and the hen (up to lay on the wall) come out, and when the mushrooms come up (rain or not). |
| `?fruit=apple\|plum\|nut` | The tree's fruit. |
| `?film=0` | Without the old-print look (on by default: grain, faded warm colours, a soft vignette, a rare speck of dust or hair; `filmlook.js`). `main.py look` takes its frames without it. |
| `?music=takes` | The yard without its music bed (`beds.js` on `shared/bed.js`: quiet music under everything, a bed for each moment, picked on `experiments/music/bed.html`): only the recorded takes, with quiet between, as before. |

In Krtek's meadow (`main.py play krtek meadow`), `?seed=N`, `?debug` and
`?day=S` (a day S seconds long: `?day=60` to see the evening and the
ending in a minute) and `?film=0` work the same; `?props=egg` says which encounters come
(`?props=` for none) and `?soon` brings the first at once; `?critters=now` brings a butterfly at
once, even in a `?still` play (which otherwise has none), and `?critters=snail` the snail, the grass
under the wild flowers wet from the start, `?critters=fireflies` the dusk's fireflies, at once and in daylight too; `?wind=gust` brings a strong gust that carries leaves or
seeds three seconds after he wakes; `?eclipse=11` an eclipse at 11:00 (with `?day=60`, 15 s in), `?eclipse=now` one as he
wakes (the sun is still behind the trees then); `?props=storm&soon` brings the storm and the
umbrella as he wakes. In the console, `meadowGame.state()`,
`meadowGame.trace()`, `meadowGame.perform('water')`.

In the yard's console: `yardGame.state()`, `yardGame.trace()`, `yardGame.act('nap')`,
`yardGame.use('bowl', true)` (true: the variation), `yardGame.perform('go to tap')`.

**Bug reports.** The game keeps every input since the start and its state every
half second. Ctrl+Shift+B (any play) asks what went wrong and downloads
`yard-bug-<time>.json`; press it right after the moment, since the report
is timed from the key press. `main.py replay` replays the newest one in
~/Downloads: same yard, same seed, same inputs at the same times. It saves a
screenshot every 0.5 s of the last 10 s (`--last 60` for more), a contact
sheet, and `replay.json` (recorded vs replayed state, trace). The game runs on the real clock, so a replay is close, not exact; the
command says when it ended differently.

**Looking at a gag.** `main.py look` opens a seeded, still play (only what you
ask moves; `--flags` adds or replaces page flags), awaits each `--before`
step, then photographs `--watch` every 350 ms until it ends and the hero is
free (the meadow wakes Krtek first; its taps are intents, so a step there is
done when he is free). It saves the
frames, a contact sheet and `look.json` (each frame's time, the trace, events,
end state, errors) to `looks/latest/` (gitignored). `--close` cuts each frame
around the hero; `--size 844x390` is a phone on its side. What it knows of
each game is `LOOK_GAMES` in `src/config.py`. For example, the bowl
stuck on his head:
`main.py look reksio --flags props=bowl --close --before "yardGame.use('bowl')" --watch "yardGame.use('bowl', true)"`;
Krtek's paddle at the spring:
`main.py look krtek meadow --close --watch "meadowGame.perform('paddle')"`.

## Reference media (not in git)

Episode video, frames and generated audio are gitignored
(`worlds/*/media/`, `worlds/*/frames/`, `worlds/*/audio/`). To recreate them
on a new machine (`brew install yt-dlp ffmpeg`; builds without a JavaScript
runtime, e.g. `uvx yt-dlp`, get "This video is not available" from YouTube):

```sh
mkdir -p worlds/reksio/media/intro worlds/reksio/frames/intro
# Native 480p. Avoid the "-sr" AI-upscaled formats: they distort line and texture.
yt-dlp -f "135+140/best[height<=480]" --merge-output-format mp4 \
  -o "worlds/reksio/media/1972-kosmonauta.%(ext)s" https://www.youtube.com/watch?v=unuTG_vG0AI
# Intro clip, what `main.py mark` plays: the first 46 s (the same in every episode from 1972 on)
ffmpeg -i worlds/reksio/media/1972-kosmonauta.mp4 -t 46 -c copy \
  worlds/reksio/media/intro/1972-kosmonauta.mp4
# Contact sheets: every 0.5 s for the intro, every 4 s for a whole episode.
# Homebrew's ffmpeg has no drawtext, so tiles carry no time codes; count them.
ffmpeg -i worlds/reksio/media/intro/1972-kosmonauta.mp4 -t 22 \
  -vf "fps=2,scale=320:-1,tile=6x8" -frames:v 1 \
  worlds/reksio/frames/intro/1972-kosmonauta-0000-0022-halfsec.jpg
```

Contact sheet names give the year, episode, time range and step. Other
episodes' uploads are in `episodes/index.yaml` (`watch_url`).
