# A world's first music: listening, then the direction

`new-music`'s path for a world with no `MUSIC_DIRECTION.md` yet, or whose
film facts about music are still `unknown`. Done once per world, before
any generation. Krtek's is the worked example: `experiments/music/listen.html`
and `worlds/krtek/MUSIC_DIRECTION.md`.

Claude can't hear (`CLAUDE.md`): what the films' music is like comes from
Adam's ears or a source, never from frames or memory.

1. **Make a listening kit** like `listen.html`: 6–8 clips of the films,
   about 15 minutes in all, each with questions taken from the open
   `sound` claims in `world.yaml`. Set the volume low at the start.
2. **Adam fills it in** and saves his answers.
3. **His answers become claims:** `observed_by: adam` in `world.yaml`;
   run `main.py validate <world>`.
4. **Write the direction** (`worlds/<id>/MUSIC_DIRECTION.md`) from those
   claims, in its three parts kept apart: from the films (refs to the
   claims), our direction (an interpretation: bed, touches, takes), and
   evidence (Adam's verdicts, dated; none yet). Mark it untested until
   his first verdicts.

Then back to `SKILL.md`, section 0b.
