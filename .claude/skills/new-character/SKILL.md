---
name: new-character
description: Draw (or redraw) a cartoon's hero in code after the films — gather frames of him, compare honestly side by side, fix by payoff (silhouette, face, ears, stance, line, hands), give his face the parts that act (lids, brows, creases, mouths) and his key expressions, his walk, checked on a scratch page next to the frames and at phone size, then wire the expressions into the scene's moments. Use when a character looks off, generic or "weird", when starting a new world's hero, or when asked to compare ours with the original, e.g. "why does Reksio look so weird?" or "the mole's looks are rough".
---

# New character

The procedure for drawing a cartoon's hero in code so he reads as himself,
not as a generic sticker of his species. Written from two runs: Krtek in
three views (`dc2a0ff`) and Reksio's redraw (2026-10-18 to 10-20: Adam's
wife asked why he looked so weird; side by side with the films, ours read
as a rabbit-dog). Reksio's figure is the worked example: `figure.js` (pose
→ drawing), `life.js` (what keeps him alive), `gait.js` (his walk),
`antics.js` (expressions in the gags).

## 1. Frames of him, before any drawing

- The films are local (`worlds/<id>/media/`, gitignored: README says how
  to fetch them). Pull single frames at the times the dossier cites
  (`characters[].description`, `moves`), not only contact sheets:
  `ffmpeg -ss <s> -i <film> -frames:v 1 -vf scale=720:-1`.
- Cover: front, three-quarter, side; at rest; his main expressions (glad,
  puzzled, worried, cross, delighted); walking; doing something with his
  hands. Ask Adam for frames he likes: his picks (the worried and content
  frames with the bird) shaped Reksio's face more than any rule.
- Modern redraws found online are leads, not sources: a white shine on
  the nose and a smooth vector line give them away. Say which is which.

## 2. Compare honestly, side by side

Render ours at the same size (a 3x screenshot of him in the scene, and his
poses on a scratch page, step 5) and put the frames above. Then list what
makes ours look off, worst first, each with a frame and a time. The usual
ones, all found on Reksio:

- **Silhouette and species.** Ears that read as another animal's (long
  curved tubes made him a rabbit); a muzzle too long and thin, or one that
  only shows side-on (a dog needs his snout at three-quarter view, which
  is how he stands most of the time).
- **Head shape.** Check the dossier's words against frames from the front:
  "wider at the top" was the wrong way up; the films' head was a pear,
  widest at the cheeks, eyes and nose in its lower half under a big
  forehead.
- **A face that can't act.** Dot eyes with no lids, brows only for strong
  feelings, one small mouth. The films act with lids and brows; the mouth
  is small for quiet feelings and huge for big ones.
- **A stiff stance.** Parallel legs, upright: a toy. The films lean, with
  his weight on one leg.
- **Line weight.** A heavy outline reads as a sticker; the films' line is
  thin and one weight all over.
- **Hands and colour.** Tubes where the films have mittens with a thumb;
  a patch too big or too orange.

Tell Adam plainly which version is cuter, livelier and more fun to look
at, and why. Record what the frames show in `world.yaml` (observed, with
times); correct a claim the frames contradict and say in it what was
wrong.

## 3. Fix by payoff, a few at a time

Agree the order with Adam, then fix the biggest first (ears, snout and
face before stance, stance before hands). After each group, a scratch
page and a look in the scene (step 5). Keep everything a pose says in
plain numbers (`figure.js` `POSES`, `vary`, `mix`), so gestures blend.

Things that bit:

- **One shape for head and body (no neck)** suits him standing; on all
  fours or sitting, he becomes a lump. Make it a pose's choice
  (`neckless`), as hands are (`mittens`).
- **A bigger head** is easy to overdo. Check every pose, especially on
  all fours and facing the child: a 25% bigger head made him "a mutant"
  there (Adam). Fix it for the poses, not one view.
- **Turns.** A feature placed by "the side towards the nose" breaks once
  he turns: past three-quarters the nose is beyond both eyes. Use left and
  right.
- **Folding.** An ear that folds over reads as a lump unless its tip is
  drawn over it with its own outline (the crease).
- **Ears and life.** Ears are a reaction, not a fixed pose: folded at
  rest, snapping up on a spring when he notices something (`kit.perk`,
  `life.js`). The films did this; it made him feel alive more than any
  redraw.

## 4. The face: parts that act, then expressions

First find, from the films' close-ups, which feature carries his feeling:
for Reksio the brows, for Krtek the mouth (Krtek a autíčko 11:41-11:46:
the mouth on the teal muzzle does most of it; his brows show only while
they act). Build that feature first and best. On a black character, lines
on the face (brows, the squeeze by shut eyes) are drawn light, as the
films draw them: ink vanishes there. Each character gets its own face
parameters, from his own frames, not another hero's.

Krtek's (`moleart.js` `mouth`, `eyes`; his faces in `mole.js` `FACES`, a
quiet moment's face with `Mole.feel`): the mouth's open, curve, width,
round and chin; brows' lift and tilt. Reksio's follow.

Give the face parameters, not drawings (`figure.js` `FACE`): eyes (with an
upper lid that comes down and slopes with the brows), joy (shut eyes
curving up or down), brows (inner ends up: worried; down: cross), lift,
creases (short lines by the brow), a small mouth (a dash, a little
frown), smile, open, teeth, clenched teeth (a box), tongue. Brows always
show: a line that acts.

Then a few expressions as poses, each matched to a frame Adam chose
(Reksio's: puzzled, eager, worried, content, cross). Put them in the
scene's moments (`antics.js`), and give the gags' faces names from them.

Before wiring him into a gag, show Adam a close-up sheet of every
expression, front-on and side-on, at the size they will be seen in the
scene. The boy's first faces (2026-10-26) were too weak to act: small
eyes, faint brows, a mouth that slid off his cheek side-on. A close-up
catches this; a full-scene screenshot hides it.

Hair, a cap, a big ear: anything large on the head must hold the head in
every pose and turn, never sit on it like a wig ("looks ridiculous",
Adam, on the boy). Make it a unit test early, as `boy.test.js` does: walk
the head's outline and check that the curls cover its top, and its back
once he is turned. The test found bare patches at half-turn that no
render had shown.

## 5. Look at him: a scratch page, then the scene

`main.py look` is too slow for a pose or a stride (a frame every quarter
second). Draw straight from the figure:

- a scratch HTML page that loads `figure.js` (and `gait.js`), mounts the
  figure several times (`Figure.mount`), each in a pose (rest, front,
  three-quarter, side, each expression, on all fours, sitting), or eight
  points of one stride (`Gait.stride`). To move him with his engine
  (gestures, blends), load `debug.js` first: the engine runs on its
  Clock and random streams;
- screenshot it with Playwright (`channel="chrome"`), at 1.5–3x;
- tile it under the film frames with Pillow (`uv run --with pillow`).

Then in the scene: a 3x screenshot of him, and at phone size (`--size
844x390`), with the film grain on: what reads big may be lost small (two
pixels of grain on his white, a tiny egg on the wall).

## 6. The walk

A glide (legs only) reads stiff. The films' walk: knees well bent, the
back heel kicked up as the leg comes through, the body upright, the head
high and nodding with each step, arms swinging (`gait.js` `walking`).
Check eight points of the stride on the scratch page.

## 7. Cost and checks

- Every frame he is drawn: leave hidden parts out of the drawing
  (`display: none`), not transparent (`opacity: 0` still costs), and skip
  computing what isn't shown (a hand with no mittens, an open eye's lid).
  Run `uv run pytest -m perf` and compare with the committed code
  (`git stash`): his redraw cost about two points of the budget until
  this was done.
- Tests that pin his height or size (the phone test) may move: change the
  threshold only once you know why.
- The browser slice for gestures (`CLAUDE.md` table), and the whole suite
  for anything shared.

## 8. Report and retro

Report with the comparison sheet's path, what changed, what's still off
and what Adam should judge in play (with his wife or the kids). Then a
short retro: what in this skill was wrong, missing or slow. Propose edits
to this file and make them once Adam agrees.
