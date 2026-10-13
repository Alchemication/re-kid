# Sound candidates (proof of concept)

Generate many candidates for each of the game's sounds, pick by ear on a
board, keep the picks. Outputs (`out/`) and model caches are not committed.

- `sounds.py` — the sounds, what each is for, and wordings for a model.
- `generate_eleven.py` — ElevenLabs sound effects (key: `ELEVENLABS_API_KEY`
  in the project's `.env`). `python3 generate_eleven.py [--style Reksio|1970s] [sound ...]`
- `generate_moss.py` — MOSS-SoundEffect, local on Apple Silicon (hot; 7 GB).
  Needs its own env: `uv venv --python 3.13 .venv-moss && uv pip install --python .venv-moss/bin/python mlx-speech`.
- `normalise.py` — evens out the MOSS takes' loudness.
- `board.html` — open from disk; play, mark keep/maybe/no, Save picks.
- `adopt.py` — copies the kept takes from `picks.json` into the game (`effects/`,
  `effects.yaml`); then `main.py effects reksio` packs them.

## Findings (2026-10-12)

Two models, the same 13 sounds and wordings, picked on the board:

- **MOSS-SoundEffect** (local, MLX on the M2): 45 rated, keeps for 3 of 5
  sounds (splash, rustle, bee), none for boing or bonk; about 3.5 s a sound,
  but the Mac ran hot and needed 7 GB.
- **ElevenLabs sound effects** (API, Starter plan): keeps for all 13, 43
  kept, including every voice sound the synth had made awful (yawn, snore,
  sneeze, munch, lap, sniff, yelp, howl). Adam: "day and night, 100x
  better". 159 takes for under 5% of a month's credits; 15 takes in about
  7 s, calls in parallel.
- **Wording:** plain physical wording beats "cartoon". The era ("1970s
  Eastern European hand-drawn cartoon…, orchestral instruments") or the name
  ("…the Polish cartoon Reksio") helped cartoon sounds (bonk 3 of 3 with the
  era; the only boing keep named Reksio) and spoiled natural ones (splash).
  Rule so far: style for cartoon sounds, none for real ones.
- **Retro, not clean** (Adam: "too clean doesn't sound authentic"). One
  kept take per sound in two versions, both trimmed and levelled; retro won
  all 13: mono, 22 kHz, lows under 120 Hz and highs over 6.5 kHz rolled off,
  a touch of saturation (`process.py`; in the game, `config.EFFECT_*`).
- **Not tried:** Meta's AudioGen (reported below commercial tools), Stable
  Audio 3 Small-SFX, and reference-guided generation from short original
  clips (MusicGen-Style or newer). If tried: compare against CC0 recordings
  and home-made sounds too, time-box a model to one evening, keep it in
  this folder, and check each model's licence.
