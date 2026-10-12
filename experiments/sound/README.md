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

Findings are in `PROJECT_PLAN.md` (Sound and music, the proof of concept).
