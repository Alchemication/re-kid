---
name: new-music
description: Make or replace a game's music — start from the world's MUSIC_DIRECTION.md (or write it, from Adam listening to the films), word each part (morning, phrase, lullaby) or shape the bed, generate takes with ElevenLabs Music, have Adam pick by ear on the music or bed board, bring the keeps into the game (retro recipe, packed into tunes.js), record his verdicts, test, retro. Use when asked for new or better music, more takes of a part, or music for a new game, e.g. "the mornings are all the same" or "the lullaby is too sad". Not for sound effects (new-sound).
---

# New music

The procedure for a game's music, from "this needs music" to music playing
in the game. Written from the yard's runs (2026-10-13: four rounds, 87
takes, 11 keeps; 2026-10-21: the bed); `experiments/music/README.md`
("Findings") has the evidence behind each rule. That evidence is Reksio's:
what worked there is a starting point for another world, not a rule.

The music has three layers (see `worlds/reksio/MUSIC_DIRECTION.md`): the
**bed**, quiet notes always underneath (`bed.js`, from the instrument
samples); the **touches**, a few notes for what the character does
(`Music.react`); and the **takes**, recorded moments the bed swells into
(morning, phrase, lullaby). This skill covers all three; generation is
only for the takes.

The pieces:

| Piece | Where |
|---|---|
| What the world's music should be: from the films, our direction, Adam's verdicts | `worlds/<id>/MUSIC_DIRECTION.md` |
| Adam listens to the films, with questions | `experiments/music/listen.html` (Krtek's kit; another world copies its shape) |
| What to ask for: each piece, its world, part, length, models, wordings | `experiments/music/pieces.py` |
| Generate takes (ElevenLabs Music, calls in parallel; each take stored, its song id kept) | `experiments/music/generate.py` (key: `ELEVENLABS_API_KEY` in `.env`, never in chat or git) |
| Measure a film's moment and our takes the same way (pulse, notes a second, key, range, tuning) | `experiments/music/measure.py` (`file@start-end` for a stretch of a film) |
| Level them, as made and retro, for a fair listen | `experiments/music/level.py` |
| Pick by ear, next to what the game plays today | `experiments/music/board.html` (Adam); his verdicts end in `picks.json`. Each world's card says what to listen for and asks whether a take belongs to this world |
| Pick a bed by ear, in a pretend day | `experiments/music/bed.html` (Reksio's; `bed.js` plays the game's own) |
| Bring the keeps into the game | `experiments/music/adopt.py` → `games/<game>/tunes/`, `tunes.yaml` |
| The retro recipe, pack | `main.py tunes <world> [game]` → `game/tunes.js` (`config.TUNE_*`, the effects' `EFFECT_*` filters) |
| How the game plays them | `takes.js` (shared) plays a take of a part; each game's `music.js` says when. The meadow: the theme as he wakes, its moods at an encounter's steps (`music` in `Things.add`), the cricket from dusk. The yard's `music.js`: a random take of a part, never the same twice running; the morning as he wakes, a `phrase()` when the game asks (yard.js after something new, `Idle.phraseOk`: not over music, not in the rain, at most every `PHRASE_GAP_MS`), the lullaby at evening. Sample touches (`react`) only between takes |

Music needs a person's ears (`CLAUDE.md`): Claude writes wordings, runs the
tools and measures what the files hold, but every keep is Adam's.

## 0. The world's direction first

Read `worlds/<id>/MUSIC_DIRECTION.md`. It has three parts, kept apart:

- **From the films:** what the research says, as refs to `world.yaml`
  claims.
- **Our direction:** an interpretation, covering bed, touches and takes.
- **Evidence:** Adam's verdicts, dated.

The wordings, the bed and the board note all come from it.

If the world has no direction file, or its film facts are still
`unknown`, start with a listening kit, not with generation: follow
`listening.md` in this skill's folder. Claude can't hear (`CLAUDE.md`),
so never describe the films' music from frames or memory.

## 0b. Measure the moment before wording it

For each piece, find the moment in the films it stands for. Use frames
(`ffmpeg … fps=1,tile`) to find where the character or scene first
appears. Then measure it with `measure.py` (`<film>@start-end`): pulse,
notes a second, key, melody range, and how far off pitch it plays. Put
the numbers that matter into the wording ("about four short notes a
second, around 130 beats per minute, leaping across two octaves") and
note them in the piece's comment.

Skipping this cost a round: the meadow's first cricket takes were all
too slow (1.3–3.5 notes a second, one octave, in tune). The film's
cricket plays about 4 notes a second over two octaves, off pitch, and
Adam rejected all 6 takes as too slow. These numbers are leads: the
beat tracker can read a pulse double or half, and a film print can
run flat.

## 1. Which part, and what for

- The parts are music.js's: `morning` (about 12 s), `phrase` (15–20 s),
  `lullaby` (about 15 s). A new part needs music.js to play it and
  `schema.tunes.Tune.id` to allow it.
- Count what a part has: one take of a part repeats every play (the yard's
  morning had two after the first run). Aim for 3+ mornings and lullabies,
  5+ phrases: phrases are what a child hears most.
- Length is page weight: about 6 KB a second in `tunes.js`, loaded at the
  first tap. The yard's 11 takes are 1.4 MB.
- Original music is never asked for or used: no cartoon or composer names
  in a wording, and no original audio as a reference (ElevenLabs screens
  uploads for copyright anyway).
- **The bed** is code, not takes: a few notes a bar for each moment of the
  day, in the touches' key (`bed.js`, its `STYLES` and `MOODS`). Try new
  beds on the bed board first. The game's own card plays `bed.js`, so
  compare against that.

## 2. Word it

Add a piece to `pieces.py`: `world` (default `reksio`), `now` (its part,
which the board's "Today" button plays), `seconds`, `models`, `takes`,
`style: False`, and wordings. Word them from the world's direction. For
Reksio, use `adam()` (each wording with and without his closing sentence).

- **Name the feel, not the notes.** What worked is Adam's form: "A catchy,
  playful instrumental theme reminiscent of 1970s Eastern European
  children's cartoons, featuring lighthearted melodies and whimsical motifs
  suitable for [what happens in the yard], capturing the nostalgic and
  charming vibe of vintage animated shows from that era." Change only the
  middle for a part ("a short, slow, sleepy goodnight tune… a small dog
  curling up in his doghouse").
- **What failed:** detailed musical wordings (instruments, shape, "ending
  on a glockenspiel note") plus a style line (`STYLE`, era, "no drums")
  came out "too modern… too complex and too serious" (round 1: 2 keeps of
  27). A cheeky, tiptoeing "sneaking up on a fly" phrase got 0 of 8.
- His closing sentence ("Keep extremely simple, elegant, and humorous…")
  made no clear difference; keep both versions until it does.

## 3. Generate

```sh
cd experiments/music
python3 generate.py <piece> ...      # every wording × model × takes not made yet
python3 level.py                     # after every run: the board plays the levelled files
```

- **Measure every take before Adam listens** (`measure.py` on the
  piece's folder), against the moment's numbers. Tell him which takes
  are near the target and which aren't, but give him every take.
- **Music v1 first.** Same wordings on both: lullaby 4 of 4 kept on v1, 0
  of 4 on v2.5; morning 1 of 4 against 0 of 4. v2.5 gave two theme keeps,
  v2 none. A small v2.5 share keeps the comparison honest.
- One run at a time (it writes the board's list). About 12.5 credits a
  second of music: a round of 24 takes of 12–20 s is about 4,500 credits
  (Starter: 40,000 a month). The credit counter lags by a run.
- **Variations of a keep don't come from conditioning.** A composition plan
  with `conditioning_ref` over a whole kept take (`seeds` in `pieces.py`)
  gave the seed again: spectrogram correlation 0.96–0.98 with both v2.5
  seeds even at "low" (two different takes: 0.56–0.75), the seed's tempo
  and key even for a "lullaby". Untested: a 3–4 s slice as the reference.
  More takes of a working wording are the cheaper way to variety.
  Music v1 takes no composition plan at all (422), so conditioning means
  v2.5.

## 4. Adam picks

Tell Adam what to listen for, and how many keeps a part needs. The board's
note for the world (`WORLD_NOTE` in `board.html`, from the direction) asks
the question that matters beyond "is it nice": **does this belong to this
world?** A world other than Reksio gets a "Reksio's yard, for contrast"
button. A good tune that would fit any cartoon is a maybe at best. On the board:
**reload**, use "Only unmarked", ▶ as made, R retro (the game plays retro),
the "Today" button for what the game has now; mark, add a note where he has
an opinion, **Save picks**, and send the file. The board keeps every verdict
across rounds, so the latest `music-picks*.json` in Downloads (with the
highest number) is the whole list: copy it to `experiments/music/picks.json`.

Then measure the keeps (leads, not claims): length, tempo, key
(`librosa`), and each against the others (spectrogram correlation): drop a
near-copy (above about 0.9), say so, and let Adam overrule.

Add his verdicts to the direction's Evidence, dated, in his words: what
he kept, what he rejected and why.

## 5. Into the game

```sh
cd experiments/music
python3 adopt.py [--world krtek] [--also FILE ...] [--skip FILE ...]   # keeps (and maybes named) → each game's tunes/, tunes.yaml (rewritten)
cd ../.. && uv run python main.py tunes krtek meadow   # retro recipe, levelled, faded out → tunes.js
```

- Takes as made are committed in `tunes/` (generated, ours): the recipe can
  change without making them again.
- The level of the music against the effects is `VOLUME` and
  `TAKE_VOLUME` in music.js; how often phrases come is `PHRASE_GAP_MS` in
  idle.js. Adam sets them by ear in play.

## 6. Test, then report

- `uv run ruff check . && uv run pytest` (`test_tunes.py`: schema, the
  list against `tunes/` and music.js, `tunes.js` up to date), `npx --yes
  eslint@10.12.0 worlds`, `main.py validate`.
- In Chrome: a probe that counts long buffers started
  (`AudioBufferSourceNode.prototype.start`, `buffer.duration > 5`): a tap
  wakes him to a morning take, something new after it ends brings a phrase,
  `perform('evening now')` brings a lullaby; no console error. Browser slice
  `"TestWholePlay or TestEvening"`; the whole suite and `-m perf` once
  before the commit when music.js changed or many takes were added.
- Report what changed, what to judge by ear (levels, how often, variety),
  what wasn't checked. Commit when asked.

## 7. Retro

What in this skill was wrong, missing or slow; propose edits to this file
and make them once Adam agrees. Candidates still open: picking was hard
(Adam: "It wasn't very easy") — ask him why: too many takes a round, takes
too long to compare, no notes field he used; a board that plays two takes
back to back, or shows only a part's keeps against new takes, may help.
