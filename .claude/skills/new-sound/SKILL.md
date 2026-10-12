---
name: new-sound
description: Make or replace a game's sound effects — word each sound, generate takes with ElevenLabs, have Adam pick by ear on the sound board, bring the keeps into the game (retro recipe, packed into effects.js), test, retro. Use when asked for new or better sounds, a sound for a new gag, more takes of a sound, or to bring back a silent one, e.g. "the bird's chirp sounds awful" or "a sound for the twig falling". Not for music.
---

# New sound

The procedure for one or more of a game's sound effects, from "this needs a
sound" to takes playing in the game. Written from the first run (2026-10-12:
13 sounds, 50 takes, his voice brought back); `PROJECT_PLAN.md` ("Sound and
music") has the findings behind each rule. The pieces:

| Piece | Where |
|---|---|
| What to ask for: each sound, what it is for, length, wordings | `experiments/sound/sounds.py` |
| Generate takes (ElevenLabs, calls in parallel) | `experiments/sound/generate_eleven.py` (key: `ELEVENLABS_API_KEY` in `.env`, never in chat or git) |
| Pick by ear | `experiments/sound/board.html` (Adam); his verdicts end in `picks.json` |
| Bring the keeps into the game | `experiments/sound/adopt.py` → `games/<game>/effects/`, `effects.yaml` |
| The retro recipe, pack | `main.py effects <world> [game]` → `game/effects.js` (`config.EFFECT_*`) |
| How the game plays them | `sound.js` `recorded()`: a random take, never twice running, 0.94–1.06 speed, one take of a sound at a time |

Sound needs a person's ears (`CLAUDE.md`): Claude writes wordings, runs
the tools and reads what the files measure, but every keep is Adam's.

## 1. Which sounds, and what for

- From a gag, the audit, or Adam's complaint. Each sound is a name in
  `sound.js` (`Sound.<name>`). A new name needs a function there first (a
  synth version, or `() => {}` silent until it has takes): `test_effects`
  fails on an id `sound.js` lacks.
- Write what it is for in the game, in a line ("an apple falls on his
  head"), and how long it must be. Check how often the game calls it: one
  take of a sound plays at a time, so a take longer than its call gap
  swallows calls (the snore: 2.5 s takes, called every 1.7 s). Keep takes
  shorter than the gap, or say so to Adam.
- Original audio is never used or committed (the barks are the one
  exception). Generated takes are ours and are committed.

## 2. Word it

Add the sound to `sounds.py` with three wordings. What worked (Adam's picks):

- **Plain and physical** for real-world sounds: "a gentle splash in shallow
  water, close up", "a small dog yawning, a long squeaky yawn". The word
  "cartoon" alone got no keeps on any sound.
- **For cartoon sounds** (boing, bonk), add the era or the name as its own
  wording: `--style 1970s` ("1970s Eastern European hand-drawn cartoon…,
  orchestral instruments, warm vintage tape sound") or `--style Reksio`.
  Bonk: 3 of 3 kept with the era. It spoils natural sounds (splash: 0 of 2).
- His voice: "a small dog …", "a puppy …"; one action, one sound.

## 3. Generate

```sh
cd experiments/sound
python3 generate_eleven.py <sound> ...                 # 3 wordings × 3 takes
python3 generate_eleven.py --style 1970s <sound> ...   # cartoon sounds
TAKES=6 python3 generate_eleven.py <sound> ...         # more of a sound
```

- One run at a time: it is the only writer of the board's list
  (`out/manifest.js`). Parallel calls happen inside it. Two runs at once
  overwrote each other's files and list (the MOSS runs did); never start one
  with `&` from a shell that closes.
- About 15 takes in 7 s; credits used print at the end (the counter lags).
- A local model (MOSS, `generate_moss.py`) is kept only for comparison: it
  heated the M2, held 7 GB, and gave keeps for 3 of 5 sounds.

## 4. Adam picks

Tell Adam what to listen for, and how many keeps are enough: **2–3 per
sound**, not every take. On the board: **reload** (it reads the list when it
opens), tick "Only unmarked", choose the source, mark, **Save picks**, and
send the file. Marks live in his browser until saved: a screenshot of marks
is not the file. Compare a new `picks.json` with the last before believing
it changed anything.

A sound with one keep: generate more of it (`TAKES=6`) and ask again; one
take repeats audibly.

## 5. Into the game

```sh
cp "<Downloads>/picks (N).json" experiments/sound/picks.json
python3 experiments/sound/adopt.py          # keeps → effects/, effects.yaml (gains kept)
uv run python main.py effects reksio         # trims, levels, retro recipe → effects.js
```

- `main.py effects` prints each take's levelling. A take raised more than
  about 20 dB was very quiet: its hiss came up with it (sniff: +27). Mention
  it; if Adam hears hiss, drop the take.
- The retro recipe is Adam's choice over a clean one, for every sound. To
  change it, make both versions of a few keeps, levelled the same (louder
  sounds better to the ear), and let him pick (`process.py` did this).
- His level for a sound, against the others, is `gain` in `effects.yaml`;
  `EFFECT_VOLUME` in `sound.js` sets them all against the synth.

## 6. Test, then report

- `uv run ruff check . && uv run pytest` (effects schema, the yard's list
  against its files, `effects.js` up to date, `sound.test.js`), `npx --yes
  eslint@10.12.0 worlds`, `main.py validate`.
- In the browser: a play with no console error, and a probe that a sound
  with takes starts an audio source (`AudioContext.prototype.createBufferSource`
  counted). Browser suite slice `"TestWholePlay"`; the whole suite and
  `-m perf` once before the commit when many takes are added (they decode at
  the first tap). Walking's perf budget sits at the edge on this Mac (23–30%
  busy before any of this): compare with the old code before blaming a change.
- Report what changed, what to judge by ear (levels, long takes), what
  wasn't checked. Commit when asked.

## 7. Retro

What in this skill was wrong, missing or slow; propose edits to this file
and make them once Adam agrees. Candidates still open: the board moved into
`main.py` (served by the mark page's server, picks saved straight to a file,
styled after the cartoon), and pre-ranking new takes from past picks once
there are a few hundred verdicts.
