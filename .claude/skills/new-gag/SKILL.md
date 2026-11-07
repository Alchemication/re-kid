---
name: new-gag
description: Add or rework a gag, encounter or ambient creature in any game (each game's map is a file beside this one) — design its beats (or, for ambient life on the world model, what brings it and what it answers to), how the child gets to see it and what taps do, put each piece where it belongs, look at it frame by frame, test it against taps and interleavings, review, verify once. Use when asked to add, build, improve or fix a gag, encounter, creature behaviour or left-alone move, e.g. "the bird's twig to fetch", "his tail caught in the bramble", "the fox after the nest" or "a hedgehog at dusk".
---

# New gag

The procedure for one gag in a game, from idea to a reviewed, tested commit.
The rules it relies on are in `CLAUDE.md` ("Code Style", game debuggability,
"Testing"); this skill is the order to do things in, where each piece goes,
and the traps already found. It holds for every game; what is particular
to one (its files, its API, its test tables, its worked example) is in that
game's map beside this file (section 4). "The hero" is the game's main
character.

A gag is choreography: several characters, any tap at any moment, nothing
ever left stuck. That care is the job; what this skill cuts is the time spent
finding where things go and re-running things.

## 0. Before starting

- Read `docs/PROJECT_PLAN.md` (what's next, open questions) and the
  game's `brief.yaml` (principles, the scene it touches).
- Skim the module heads only (each file's first comment block says what it is
  for); read code where the gag will hook in, not whole files.

## 1. Is it a gag, or ambient life?

- **Ambient life:** a creature going about its own business, answering to
  what is around it (the hour and light, rain, noises, things on offer), or
  a world event (wind, a storm, an eclipse). It runs on the world model:
  follow `ambient.md` in this skill's folder instead of sections 2–7.
- **A gag or encounter:** authored beats with comic timing, often the hero
  in it. Hand-made, as below. A relationship that is one joke (a spider
  and a fly) is a gag.
- **Both:** the gag hand-made, and what it does that ambient life should
  answer told to the world from its own file (a noise it makes, an offer it
  opens; `docs/WORLD_MODEL.md`).

## 2. Is it a good gag?

Before any code, the idea must pass these (reject weak ones; a few good gags
beat many):

- **Clear without words.** A three-year-old sees what happened and why.
- **One real comic moment.** A freeze, a mishap, a reversal: something to
  laugh at, not just an animation playing.
- **Natural.** It could happen in a gentle cartoon in this world. If it is
  about help, the trouble comes from a harmless mishap or curiosity; nobody is
  made helpless just to be rescued, and helpers have their own reasons and
  abilities.
- **The child chooses.** Where it is a try-and-see situation (whose egg,
  which mushroom), the things to try lie about as things to tap, each with
  its own result: a funny wrong one, a revealing one, the one that resolves
  it. No aiming or dragging. Left alone, the hero tries them himself, in a
  sensible order. Depth before breadth: one encounter like this, well acted,
  beats several that only play on.
- **A story, not a list of beats.** Each beat causes the next: someone
  wants something, something gets in the way, and what happens next comes
  out of that. Read the beats as "and so…": where one only follows another
  ("and then…"), reorder or cut. The paint passed every other check here
  and still read as nonsense (Adam, 2026-11-01): the hero was red with
  paint before the fox came, so his scaring the fox had no reason. In the
  film the fox frightens him first and the paint is an accident. A repeat
  should move the story on, not only vary it (the fox, told again, may end
  a friend). The opening shows the trouble before anything brought to
  answer it: the friends once carried the tins in before the fox came
  (Adam, 2026-11-06), so the help had no reason yet.
- **Fun to repeat.** The core stays the same each time (small children love
  exact repetition); something small is added on top now and then.
- **A story over uses, where the thing allows it.** If it holds an amount
  the child can see (water, fruit, berries) or a reaction that can build
  up (a sneeze), consider telling a story across uses instead of drawing a
  random variation: one visible step per use, ending in a funny reset, then
  again (a tap: runs, drips, runs dry until the hero knocks it going, from
  a mum's idea at a playtest, 2026-10-29; a sneeze at the flowers, bigger
  each time). The story moves on only past a step the child saw, so a use
  cut short tells it again; a variation can still ride on top from the
  second round. Keep it to a few things: a scene where everything counts in
  threes feels mechanical.
- **Every act changes something.** Each beat where the hero acts must
  visibly change what happens next; a beat with no effect is filler: cut
  it or give it one (the meadow's bulldozer lurched on whether or not he
  threw its poles away, Adam 2026-11-01). And his feelings follow the
  story: no cheering while the trouble is still there, and no smile at
  rest either: the hero's resting face turns uneasy while it holds. A
  gesture shared by two feelings takes the face as a parameter: the
  mole's hands-to-face was a laugh, and used for the bulldozer's fright it
  showed a grin (Adam, 2026-11-02). A threat isn't
  cut short by a tap as a gentle encounter is: a tap made him laugh next
  to the bulldozer, and a child tapping on and on held it at the meadow's
  edge. While an encounter's `trouble` holds, every tap carries it on.
- **New to the place.** It adds what the game doesn't have yet. First list
  the gags of the same kind already in the game (who helps or is helped, how,
  what the comic moment is, how it ends) and make this one differ in the
  helper *and* the shape of the resolution. A gag that retells the last one
  with new props is a copy: two fixes both ending with the same bird
  tugging the hero free was rejected (Adam: the game must feel creative
  and dynamic). The same character again only as a deliberate callback.
- **A surprise.** Something the child won't predict the first time: help
  that comes by accident, an unexpected helper, a fix that makes it worse
  before better, or an outcome that depends on who is about this play. The
  core repeats; the surprise is what makes the first time land.
- **Nothing from nowhere.** Every thing it needs is brought by someone,
  comes on its own feet, or was always there, and it leaves the same way,
  even when a tap cuts it short (docs/DESIGN_PRINCIPLES.md). Visitors come
  in from out of sight and go home out of sight; the game's map says how,
  and a rule should check it. Nothing vanishes in one go, either: going
  into the ground, digging, building show their steps, quick but each
  seen (the mole sank out of sight at once and the pit was simply there;
  now he scratches his head, has the idea, and digs himself down in three
  jerks as the hole widens round him, Adam 2026-11-02).
- **Built from what exists.** Reuse the hero's moves, the creatures and the
  sounds before inventing new ones. Reuse parts, not the story: borrowing
  another gag's face for relief is fine; borrowing its plot is not.
- **Inspired, not copied.** New drawings, sounds and music; original audio
  only as an occasional easter egg (`CLAUDE.md`).
- **A character from the films is drawn from its frames**, however small:
  find where it appears, pull frames, and draw after them, side by side, as
  `new-character` does for a hero. The meadow's cricket, first drawn
  without looking (a green blob in the grass), was hard to spot and looked
  bad (Adam, 2026-11-04); the films' is a black fellow with a fiddle and a
  music stand.

## 3. Design on paper, then check with Adam

Sketch two or three designs that differ in who acts and how it resolves
(not one design with variants), each with its surprise, and recommend one.
The plan's idea for the gag is a starting point, not the design: if it
repeats an existing gag's shape, say so and offer alternatives. Then, for the
chosen one, write down briefly:

- **Beats:** setup, trigger, the comic moment, how it resolves, the aftermath.
  Who acts in each (the hero, a visitor, the scene itself).
- **Acting:** what each face and body show at each beat (surprise, glum,
  delight, suspicion, menace, fear), the hero's and every visitor's: a face
  that never changes reads as a mask (the fox, 2026-11-01). Take the faces
  from the films' frames. This, more than the motion, makes it read as a
  cartoon. On every tap, an answer at once: the hero looks at what was
  tapped, then goes.
- **Sound against moments:** name the moment each sound is for (curiosity,
  effort, surprise, relief) and leave quiet between. The hero's voice is for
  real moments, never on every tap. Every gag gets its sounds (Adam,
  2026-10-28): for each moment, reuse a sound the game has (`effects.yaml`,
  `sound.js`) if it fits; otherwise make one in the same run with
  `new-sound`, a synth stand-in in `sound.js` first so the gag plays
  before Adam has picked takes. Music only where a moment needs a mood the
  game has no music for (`new-music`); otherwise the bed and phrases cover
  it. Write the music as a timeline over the whole gag, from start to
  end, what plays *between* the cues too (the bed): a threat holds an
  uneasy bed until it has gone, and nothing glad comes back before (the
  meadow's bulldozer had the cheerful bed and the flute theme back while
  it was still coming, Adam 2026-11-01); the moment it has gone, the glad
  music comes back, not a step later (Adam, 2026-11-02). Check it by tracing a whole run
  (each step, the bed's mood, the take playing), not only that the cues
  fire. The report lists what waits on the boards for his ear.
- **What it offers:** `discover`, `help` (the hero helps someone) or
  `helped` (someone helps him); each play should offer one of each. The
  game's map says where that is recorded.
- **How the child gets to see it.** A tap on a thing (first use), the
  thing's variations or retellings (every use after the first), a
  left-alone move, an arrival at its hour, a creature's own timing, or the
  weather. A gag first built as a variation only (the yard's bowl) went
  unseen and needed a second round.
- **Variety on repeats, from the start.** Repeats are what children come
  back for (Adam watched kids play, 2026-10-19). Design two to four
  variations with the gag, not later: the core stays the same, and every
  use after the first adds one, all before any repeats; or the play's seed
  draws a few details (how a visitor comes in, how the hero acts it) so
  plays differ. A variation that needs something not always there (a bird
  near, nuts on a tree) falls back to another. A rule like "the first
  variation is always X" must not lose the variation it stands in for. No
  hint that a thing has something new: every repeat does
  (`docs/DECISIONS.md`). How a game draws them: its map.
- **What a tap does at each beat.** Every tap gets an answer, and for each
  beat decide which: it waits for after (the default while the hero is busy
  with a thing), it is answered inside the gag (the child takes part), or it
  cuts the gag short (left-alone moves). Answered inside, for a gag that
  holds the hero while the child keeps tapping (a bowl stuck on his head):
  the gag answers each tap itself rather than queueing it (the game's map
  says how).
- **Interleavings to survive:** a tap mid-gag (queued, or answered), a tap
  during each beat that moves the hero, rain starting, dusk, bedtime, a
  creature busy elsewhere, the gag cut short at every `await` and picked
  up again, the same thing used again.

**Checkpoint:** show Adam the designs side by side, then the chosen one's
beats, trigger and tap behaviour; build once he agrees. If he has asked for
it to be built while he is away (asleep, "check them tomorrow"), choose
yourself and build, but say in the commit message that the design wasn't
checked with him, and list it in `docs/PROJECT_PLAN.md` as his to judge.

**Room for it.** Before placing it, list where everything already stands
in the scene (props, spots, where visitors come from and go to) and give
the new gag a place of its own: paint tins first landed on another
encounter's spot, mushrooms came up on a hen's nest. Room for everything
it moves, and anything that appears mid-play (after rain, on a timer)
takes free ground, never "beside" something, with a browser test over a
dozen seeds that it never lands on a thing. Keep what the child must see
on screen when it happens. How a game lays things out: its map. Where
something else must move to make room, or a bound moves (where the hero
can go), write the moved spots relative to what they now stand by, and
grep for the old numbers: moving the meadow's left end to the oak's arch
left two hard-coded limits behind in the egg, which a review caught.

## 4. Where each piece goes

Each game has its own map in this skill's folder: where each piece goes,
its traps, how to look at it, its test tables and a worked example.
`yard.md` (Reksio's yard), `meadow.md` (Krtek's meadow); ambient life in
`ambient.md`. Read the one for the game. A new game writes its own map
when it gets its first gag, in the same shape, and nothing about it goes
in this file.

Wherever it goes, keep the split every game uses: a character's engine
(state, drawing, everyday moves) apart from a gag's moves; a visitor's
drawing and faces in a file of its own once it acts (the meadow's
`foxart.js`); a gag's state in the gag's file; shared parts never naming
a game (`CLAUDE.md`, "Shared parts").

A file over 1000 lines fails `test_files_stay_small`: split by what it is
for, and update every caller, no shims.

## 5. Traps already hit

- Every piece of state the gag changes is restored in a `finally` (or the
  game's restore): the prop shown and back in place, the creature home,
  flags cleared.
- A gesture started now and awaited later must not reject unhandled (wrap or
  make it unable to reject).
- Moving an element elsewhere in the page breaks the selectors that find it:
  check hit tests and hover.
- Brief text: an unquoted `: ` inside a YAML string breaks the file. Use a
  full stop, and run `main.py validate` right after editing the brief.

- A CSS animation that scales or turns part of an SVG drawing needs
  `transform-box: fill-box; transform-origin: center` (or an explicit
  origin), or it turns about the drawing's 0,0 (the bulldozer's puffs
  jumped about).
- Node unit tests that load a script into a `vm` sandbox get its arrays
  and objects from another realm: `deepEqual` fails on equal values.
  Spread them first (`[...list]`, `{ ...obj }`).
- A second browser test file must not start its own Playwright session:
  use the shared `browser` fixture in `tests/conftest.py`.
- `el.animate(frames, { transformOrigin })` ignores the option: an SVG
  shape scaled or turned that way swings about the scene's corner (the
  egg flew across the yard). Set `transform-box: fill-box;
  transform-origin: center` in CSS.
- A page-address flag must make its random draw either way,
  or a seeded play with the flag differs from one without.
- A unit test can pass by the luck of its seed (the pool happened to draw
  the right one first). Vary the order (pools may share one stream: use
  another pooled thing first), and check the test fails on the old code.
- Something drawn every frame that is hidden: `display: none`, not
  `opacity: 0` (it still costs the browser), and don't compute it.
- `async` functions always return a promise, so `const busy = start()`
  is truthy even when `start` did nothing: check the condition first.
- Something laid on the hero (a leaf, an egg in his mouth) that follows
  him each frame: remove it in a `catch` or `finally`, or a cut leaves it
  behind where he was.
- A part drawn round a point other than its own (a head nodding about its
  neck, a group scaled from the feet) needs that point updated whenever the
  drawing changes: a redrawn head kept the old neck and spun.
- What a cut puts back is for cuts only. A gag that ends by itself has
  already put everything back as it went, so running the cut's restore at
  the end too cancels what is still landing: the leaf shaken off the
  meadow's mole vanished mid-air. And a cut lets what is falling fall on
  to the ground, rather than vanish where it was.
- A sound booked ahead on the audio clock (an echo, a second knock) plays
  on after a cut unless the cut stops it: keep the booked sources and stop
  them in the restore (the oak's echoes answered a mole who had walked
  away).
- A fallback for a gag nobody plays on (let the next one come, send
  it home) counts from its last progress, never from when it arrived:
  counted from arrival, it fires while the child is still playing (the
  meadow's next encounter came 60 s after the egg arrived, mid-game).

## 6. Look at it

Probe scripts write where the shell stands, and it goes back to the project
between calls: give their outputs absolute paths in the scratchpad (a
sheet of screenshots once landed in the project's root).

How, for each game: its file (section 4). Whichever the game, check that
each beat reads without words, at phone size too. Check size and placement
here, before writing tests: the first clock was too small to read and had
to move. Judge both from a screenshot of the scene, never from the
numbers: a thing's size against the hero as drawn (a bulldozer meant to
tower over him came out his height twice, at two scales that "should"
have been enough), and whether the view shows each beat at all (it
followed the hero while the bulldozer arrived off-screen). Anything the
child must see happen where the hero isn't needs the view to take it in
(the game's map says how). A visitor's faces: draw them all on a scratch page, beside the
film frames they come from, before putting them in the scene. Check that
each photo shows what the trace says happened: a look that photographed
the wrong moment once passed for a working gag. Stills can't judge timing
or sound: name the constants Adam should tune by watching (`main.py play
<world> [game] --still`).

## 7. Tests

The game's tables and fakes: its file (section 4). For every game:

- `page.evaluate` waits for a returned promise. To start a gag and watch it,
  wrap it in a function that returns nothing: `"() => { game.use('x') }"`.
- Each bug a review finds gets a test that fails on the old code: put the old
  code back, see it fail, restore. Check the test reaches the bug: one that
  cut the gag at its first move never reached the stray call it was for.
- Tapping a thing by its selector clicks the middle of its box, which may be
  something drawn on top (a clock over a house). Tap a point the thing
  owns (the game's map has the helper).
- A browser test that fails now and then under `-n 4`: run the same slice a
  few times on the committed code (`git worktree add <scratch> HEAD`) to
  tell an old timing bug from a new one; either way it's a real bug, noted
  in `docs/PROJECT_PLAN.md` if not fixed then.

## 8. Review, then verify once

1. While working: unit tests, eslint, and the browser slice for what changed
   (`CLAUDE.md` table).
2. `/code-review` the diff (and `/simplify`) before every commit, one gag
   at a time, never once at the end for several: each review of four
   encounters found four to ten real bugs. Fix them all, with tests (7).
3. Then once: `uv run ruff check . && uv run pytest`, `npx --yes
   eslint@10.12.0 worlds`, `uv run pytest -m browser -n 4`, `uv run pytest
   -m perf` if something drawn every frame changed, `main.py validate`.
   Not after each step: the full browser suite takes about 25 minutes,
   and its eight browsers slow the whole machine. Tell Adam before
   starting it (a play meanwhile is choppy and its timing misleads), and
   say when it is done.

## 9. Report and retro

Report: what the gag does, how the child gets to it, what a tap does, what
was tested, what wasn't (and why), and the constants to tune by eye and ear.
Commit only when asked. Then a short retro: what in this skill was wrong,
missing or slow this time. Propose concrete edits to this file and make them
once the user agrees. The skill improves only through this step.
