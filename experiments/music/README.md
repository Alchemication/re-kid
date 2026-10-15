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
  keep/maybe/no, Save picks. Built on `../board/`, shared with the sound board.
- `picks.json` — Adam's latest verdicts.
- `adopt.py` — the keeps into the yard (`tunes/`, `tunes.yaml`); then
  `main.py tunes reksio`. Procedure: the `new-music` skill.

## Findings (2026-10-13)

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
