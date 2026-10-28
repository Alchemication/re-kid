# Music candidates (proof of concept)

Generate takes of the yard's music with ElevenLabs Music, pick by ear on a
board next to what the game plays today (code, note by note from samples).
Outputs (`out/`) are not committed.

- `pieces.py` — the pieces, what each is for, the wordings, models, and the
  kept takes used as seeds.
- `generate.py` — ElevenLabs Music (key: `ELEVENLABS_API_KEY` in the
  project's `.env`). `python3 generate.py [--test] [piece ...]`. Each take
  is stored at ElevenLabs and its song id kept (`song` in the manifest).
- `level.py` — every take to -20 LUFS, as made and through the effects'
  retro recipe; run after each `generate.py`.
- `board.html` — open from disk; ▶ plays a take as made, R retro, "Today"
  plays a random take of that part from the game (`Music.audition`); mark
  keep/maybe/no, Save picks. Built on `../board/`, shared with the sound and
  bed boards (folders: each `generate.py` run under its `--folder` name;
  one thing playing at a time across the boards).
- `picks.json` — Adam's latest verdicts. Each world's card on the board says
  what its music should be (from `worlds/<id>/MUSIC_DIRECTION.md`) and asks
  whether a take belongs to that world; a world other than Reksio gets a
  button to hear the yard for contrast. A piece's `world` in `pieces.py`
  says whose it is (Reksio when not set).
- `measure.py` — measures a film's moment (`file@start-end`) and our
  takes the same way: pulse, notes a second, key, melody range, how far
  off pitch. These are leads for the wording and for Adam, not claims.
- `listen.html` — Krtek's listening kit: eight clips of the two films Vadim
  Petrov scored (from `worlds/krtek/media/`, local only), each with questions
  from the open `sound` claims in `world.yaml`, about 15 minutes. Answers stay
  in the browser; "Download answers" saves `listen-answers.json` for Claude,
  who turns them into `observed_by: adam` claims.
- `adopt.py` — the keeps into one world's game (`tunes/`, `tunes.yaml`;
  `--world`, `--also` for a maybe, `--skip`); then `main.py tunes <world> <game>`.
  Procedure: the `new-music` skill.
- `bed.html` — the music bed board (2026-10-21): eight beds of quiet
  music under the yard, played live from the yard's samples in B-flat,
  steered by mood and how busy the yard is, with a touch and a recorded
  phrase to hear over them. Mark keep/maybe/no, tick where each could be
  used, Save picks (`bed-picks.json`). The first card, "The yard's day",
  plays the game's own `bed.js` (a bed for each moment, as Adam's verdict
  "they all sound good" became); "Old film sound" puts them through the
  retro recipe, a tape wobble and looser timing, as the game does
  (Adam: "a bit too crisp").

## Findings (2026-10-13, Reksio's yard)

Four rounds, 87 takes, about 18,000 credits (Starter plan: 40,000 a month;
about 12.5 credits a second of music, 3 calls at once, 20 s takes in ~10 s).

- **Detailed musical wordings sound too modern** (round 1: instruments,
  shape and mood per piece, plus a shared "1970s Eastern European chamber
  ensemble, warm tape, no drums" style line, on v2.5). Adam: nice tunes, but
  "too modern, don't resonate the spirit of 70's eastern european cartoons,
  most probably too complex and too serious". Two keeps of 27, kept later.
- **Adam's wording works, on Music v1.** Found by him on the ElevenLabs
  page: "A catchy, playful instrumental theme reminiscent of 1970s Eastern
  European children's cartoons, featuring lighthearted melodies and
  whimsical motifs suitable for [what happens], capturing the nostalgic and
  charming vibe of vintage animated shows from that era", optionally ending
  "Keep extremely simple, elegant, and humorous, like the songs used to be
  in the cartoons of that era." It names the feel, not the notes.
- **v1 beats v2 and v2.5 for this** (Adam: "model v1 is actually better at
  this stuff"). Same wordings on both: morning 1 of 4 kept on v1, 0 of 4 on
  v2.5; lullaby 4 of 4 on v1, 0 of 4 on v2.5. The theme: 1 keep on v1, 2 on
  v2.5, none on v2. The closing sentence made no clear difference.
- **The cheeky daytime phrase got no keeps** on either model (0 of 8): the
  wording "short, cheeky, tiptoeing… sneaking up on a fly" may be the
  reason. The daytime keeps are 20 s theme takes.
- **Conditioning on a whole kept take copies it** (composition plan,
  `conditioning_ref` over the take's 20 s). Measured: spectrogram
  correlation with the seed 0.96–0.98 for both v2.5 seeds even at "low"
  strength (two unrelated takes of one wording: 0.56–0.75), the seed's tempo
  and key, and "lullabies" at the seed's 112–144 BPM. From the v1 seed,
  0.74–0.80. A sibling from a v2.5 seed is the seed again; Audio Reference
  (style from an upload) is on the ElevenLabs page only, v2/v2.5, and
  screens uploads for copyright.
- **Keys and tempos differ from take to take** (measured, leads only: A,
  C, A minor, B-flat; 81–172 BPM). The game's in-key stingers are in
  B-flat, so they clash with a take in another key.
- **Retro, as the effects** (Adam: "I would say retro, even though I can't
  hear that much of difference").
- **In the game:** 11 keeps (5 phrases, 2 mornings, 4 lullabies) in
  `worlds/reksio/games/yard/tunes.yaml`; siblings/12 left out, a near-copy
  of theme/16. The board's "Today" buttons play the game's takes.
