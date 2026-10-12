# Project plan

Where re-kid stands and what comes next. Read this first in a new session;
`PROJECT_IDEA.md` has the original brief, `CLAUDE.md` the working rules.
Update the **Status** and **Next steps** sections as work lands.

## Decisions so far

- **One world: Reksio.** It is wordless, so a 3-year-old can play without
  reading and non-Polish families (friends from Spain and India) can play
  without translation. That lets one small game test three things at once:
  whether families play together, whether a child connects with a character
  they don't know, and whether it feels authentic to people who grew up with
  it. Kot Filemon was the runner-up (curiosity/discovery mechanics), and
  Baltazar Gąbka is a better later world for older kids and adults.
- **Reksio kosmonauta (1972, Marszałek), parked.** Adam's favourite episode;
  a likely first episode to enter from the yard. The frame pass is recorded
  below under "Parked".
- **One audience: a parent and a young child (about 3) playing together**,
  with the parent as the one who remembers the cartoon. Adult versions, age
  variants and the cross-cultural collection all wait until this works.
- **No platform yet.** Just one game plus a short parent card. No catalogue,
  country map or memory sharing.
- **Research happens in Claude Code sessions** (web search, web fetch, frames
  from yt-dlp and ffmpeg), not through API calls from `main.py`. A Claude skill
  for world research may come later. `main.py` is only for structured work:
  validating, inspecting and scaffolding.
- **Sound: the computer measures, Adam listens.** No model we can call hears a
  recording reliably. `codex exec` (v0.159) takes images only, and its voice
  mode is a live microphone. Antigravity's `agy -p` (1.2.14, on the Google
  subscription) was given a blind test on 2026-09-30: three synthetic sounds
  with known answers plus the real cymbals moment, all with neutral names.
  - WAV files: both models said they could not hear them.
  - MP3 files, Gemini 3.8 Flash: invented details, e.g. three rising chimes
    for a single steady tone, and a crash at 0.15 s that is really at 2.5 s.
  - MP3 files, Gemini 3.1 Pro: got the rough shape of the synthetic sounds,
    but judged every file (2–6 s) to last 1 s, so all its times were wrong.
  - On the real theme, the two models disagreed completely ("brass fanfare"
    vs "8-bit synth melody"), and neither noticed the cymbal crash.

  So model listening is not used, not even as a lead: a confident wrong
  description would prime the listener.

  Instead, `src/audio.py` measures locally with librosa and ffmpeg (tempo,
  beats, hits, loudness, spectrograms). Adam selects and names the sounds that
  matter by ear, and only his marks become claims. Per-moment loops guessed
  from the beat grid were dropped: the game brief decides which sounds and
  melodies are needed, from what Adam marks.
- **The first game is Reksio's yard, not the intro.** A playable intro
  (press to do each credit gag) was built and dropped: on its own a gag is
  thin to play, and credit cards are text a toddler can't read. The yard has
  no text, gives every tap an answer, and can later become the home screen
  that leads into episode games. The intro brief is kept, parked.
- **Inspire, don't copy (Adam's current thinking, open to change once the game
  is visible).** The game's drawings, sounds and music are new and made for
  it, in the spirit of the original. Original sounds and melodies appear only
  as occasional easter eggs. Adam's marks are inspiration, not a parts list.
  Exception (Adam, after the synthesised bark fell flat): Reksio barks with
  the original barks, played higher and quicker by a random amount each time.
  They stay local (`main.py barks`, gitignored); without them the game uses
  its synthesised woof. Like the hook, it needs a licence (or a replacement)
  before the game goes beyond Adam's home.
  This replaces the earlier idea of looping the original theme, and makes a
  public version far easier to license.
- **Every statement about the original is a claim with provenance**
  (`verified` / `sourced` / `observed` / `interpretation` / `unknown`), so facts
  and our own ideas never blur. Rules are in `CLAUDE.md`.
- **No live AI in the finished game is assumed.** AI is for research, design
  and building. Don't use image models to imitate the original artwork; use
  code-drawn or SVG characters over a few painted background plates.
- **Licensing: Adam contacts the rights holders before the game leaves his
  home** (Adam, 2026-10-06). Until then it is a private build, so the game may
  aim for a recognisable Reksio (on-model character, the original barks, a
  melody close to the theme) without blocking on rights. Who holds them is
  still an open research question: `rights` (unknown) in
  `worlds/reksio/world.yaml`.

- **Every world has a home, and episodes open off it** (Adam, 2026-10-07).
  Eliot enjoyed the yard's encounters with other animals most, and found them
  too short. Most Reksio episodes are exactly that, Reksio and one other
  animal over several steps, so the next game is an episode. The world's home
  (the yard, for Reksio) stays the place where a child learns how the game
  works, and each episode is entered through a doorway taken from its own
  opening (a door, the gate, a hole, a toy rocket). A cartoon without a home
  of its own gets an invented one. Doorways are found, never unlocked. No hub
  system until there are three episodes.
- **Procedures become skills, improved by every run** (Adam, 2026-10-07).
  Research and build steps are written up as Claude Code skills in
  `.claude/skills/`, so someone other than Adam (first, his wife) can run
  them; each run ends with a retro that edits its skill or the schema.
  `new-episode` is drafted; `new-world` waits until a second cartoon is
  wanted; an audio skill waits until an episode's sounds force it.

- **Helping is the yard's theme, built from what is there** (Adam,
  2026-10-11). Every play should offer something to discover, someone to
  help, and a moment when someone helps Reksio, without making any of them a
  task. No encounter registry and no session director: `layout.js` already
  decides who is in a play, `Things.ready` gates each step, `Idle.wish` points
  at what is left and `Day` keeps count. Behaviour stays in code (each gag's
  `run()` does more than a config could say). When a play must offer a kind
  of encounter, each prop in `layout.js` gets the kinds it can offer
  (`discover`, `help`, `helped`) and the pick guarantees one; nothing
  more until a second user of the tags (an episode) needs it. The tags exist
  now: `OFFERS` in `layout.js` gives each prop its kinds, and `pickProps`
  makes every play offer someone Reksio can help (the trap or tree) and
  a chance for someone to help him (the bowl or the bramble), then fills
  the rest as before. Help mostly
  comes from creatures Reksio hasn't helped; a helped one returning the
  favour is a rare treat.
- **Phones: frame, don't fly a camera.** Measured 2026-10-11 (Reksio upright,
  Safari on an iPhone on its side, 750×340): 98 px tall, the mouse 45×18 px,
  the ground spots 23 px high; iPads were fine (Reksio 133–192 px). Instead of
  a camera that zooms on each encounter, a short screen now cuts the top of
  the sky and draws the sky's things smaller (`painting.js`): Reksio 119 px,
  the mouse 55×22, spots 28 px. Upright, a phone would show a thin strip, so
  it shows a wordless "turn me" picture instead: no portrait yard.

## Flow

One validated file per stage, under `worlds/<id>/`:

| # | Stage | File(s) | Status |
|---|-------|---------|--------|
| 1 | World dossier | `world.yaml`, `sources.yaml` | First pass done (see gaps below) |
| 2 | Episode catalogue | `episodes/index.yaml` | Done: 65 episodes, 31 online |
| 3 | Selection | The intro first, Kosmonauta next (see Decisions) | Done |
| 4 | Breakdowns | `intro.yaml`, `episodes/<slug>.yaml` (beat by beat) | Intro: frames done, sound pending |
| 5 | Game brief | `games/yard/brief.yaml` (`schema.brief`); `games/intro/` parked | Yard: first draft |
| 6 | Game | `games/yard/game/` (static web game) | Yard playable; unit, browser and replay tests |
| 7 | Playtests | `playtests/<date>-<family>.yaml` | Not started |

Check stage 1 with `uv run python main.py validate reksio` and
`uv run python main.py show reksio --status unknown`. Browse stage 2 with
`uv run python main.py episodes reksio [--online]`, and the intro with
`uv run python main.py show reksio --section intro`.

## Status

**Stage 1 (dossier), first pass.** 78 claims from 15 sources. Solid on
production, creators, years, episode counts, composer, legacy and availability.
Thin on:

- **Sound.** Claude cannot hear audio. The theme, barks, whether there is any
  speech, and how music is timed to action are all unconfirmed.
- **Characters beyond Reksio and the boy.** The rooster, gander, owl and
  red-eared dog come only from en-wikipedia and have not been seen on screen.
- **Aesthetics and pacing** rest on 3 of 65 episodes: Kosmonauta (1972),
  Wybawca (1977) and Remontuje (1980).
- **Two good sources not yet read in full:** the Filek-Marszałek/Kolska memoir
  (2022) and Babulewicz's musicology chapter (2018).
- **Rights:** unknown.

The full list is under `open_questions` in `worlds/reksio/world.yaml`.

**Stage 2 (catalogue), done.** `worlds/reksio/episodes/index.yaml` lists all 65
episodes in pl-wikipedia's order, with year, directors, FilmPolski runtime, an
English synopsis (translated from FilmPolski) and the official upload where one
exists. It was cross-checked against FilmPolski (64 of 65 titles) and the
studio's channel (31 public uploads: 1967 and 1972–1980, none from 1981 on).
Where FilmPolski and pl-wikipedia disagreed, on-screen credits settled two
cases, both in FilmPolski's favour. Five remain open: the years of Bocian and
Kruk, the directors of Kruk and Dzięcioł, and Papuga, which only pl-wikipedia
and Filmweb list. The same data corrected the dossier: Ćwiertnia directed 17
serial episodes, not 13.

**Stage 4, intro breakdown: frames done.** `worlds/reksio/intro.yaml` has 10
timed beats from the Kosmonauta upload, read every 0.5 s. Each beat records the
action, the on-screen credits, and an `unknown` sound claim that asks a specific
question. The intro was checked in four uploads (1972, 1974, 1976 and 1980):
the gags, their order and their timing match within about a second, and only
the lettering changes. This corrected the dossier: popping out of the doghouse
is the start of each episode, not the end of the intro (Remontuje opens on a
street). One visual question is open: what is the red object Reksio brings
down on the film strip at the end?

## Parked: Kosmonauta

**Frame pass (Claude, frames only, not yet in a breakdown file).**
The episode runs 9:57, with frames read every 4 s and denser at the unclear
parts. The time codes are approximate.

- 0:00–0:43: credits.
- 0:44–1:12: Reksio comes out of the doghouse, sees a jet pass overhead,
  climbs onto the doghouse roof and stares up, wondering. Then a cut through
  black.
- 1:14–2:36: a rocket stands in an orange field, wearing a red dog collar and
  tied to a stake by a leash. Reksio loads it with bones and a street lamp and
  puts on a spacesuit. On its first try the rocket only circles on the leash;
  he climbs out, unbuckles the collar and launches.
- 2:40–3:30: space. A meteor passes, the rocket's nose is torn open, bones
  spill out, Reksio tumbles out holding the lamp and lands on a planet of
  painted caves.
- 3:30–5:00: he takes off the suit, plants the lamp, and meets a crowned
  mermaid princess (dog-faced, long red ears). They float and dance together.
- 5:00–6:20: a three-headed, dog-headed dragon comes out of a red cave door.
  It is frightening at first, then friendly: it licks Reksio, tickles him and
  plays.
- 6:20–8:00: a flying saucer lands with boxy black-and-red robot dogs. They zap
  and tie up the dragon, knock Reksio flat, and lead the princess away on a
  leash. Reksio gets up, fights a robot and takes over its saucer.
- 8:00–9:20: he frees the dragon and gets the princess back; she kisses him.
  He flies off, and the robots' saucer attacks him in space with a claw. He
  smashes it and laughs.
- 9:20–9:57: wavy lines drift across the dome. At home, the boy has put down a
  steaming food bowl. Reksio wakes on the doghouse roof, jumps down, eats, the
  boy hugs him, an iris closes on Reksio, then KONIEC.

What this means for the game (interpretation):

- The dream is framed by the doghouse at both ends, and the smell of food
  brings him home. That fits the "start and end at home" idea.
- The helping arc survives: free the dragon, rescue the princess.
- The warmest beat for a 3-year-old is "scary dragon turns out to be friendly".
- The robots, the zapping and Reksio being knocked flat are the sharpest peril;
  the game should soften them or leave them out.

When it comes back:

1. **Adam's listening pass on the whole episode**: the rocket launch, space,
   the dragon, the robots, the waking-up moment, and whether the dream has its
   own music.
2. **Claude: `episodes/reksio-kosmonauta.yaml`**, using the same Breakdown
   schema as the intro.

Game ideas for it: unbuckle the rocket's collar so it can fly, make friends
with the dragon, free the dragon and the princess, and let the smell of food
wake Reksio at home.

## Next steps

1. **Bring Reksio to life in the yard** (before any episode). In the
   cartoon he stands up on his hind legs, trots about sniffing, runs, grins,
   and acts like a small funny person; in the game he is stiff.

   **Study done (2026-10-07):** frames of Sportowiec, Aktor (1972),
   Pocieszyciel (1975) and Kompan (1976), recorded as eleven observed
   `moves` under Reksio in `world.yaml`, each with episode times. Local
   sheets: `frames/acting/reksio-moves-reference.jpg` (24 key frames) and
   `game-vs-cartoon.jpg`. What it shows (Claude's reading):
   - *He is drawn off-model, not only animated stiffly.* The game's Reksio
     has a long pointed snout seen only side-on, a dot eye and a cap-like
     ear. The cartoon's has a tall rounded head, short muzzle, big nose, a
     standing white ear and a flopped orange one, eyebrows, and turns to
     face the viewer when he acts.
   - *Upright is his everyday stance;* he drops to all fours to trot, sniff
     and run. The game has him on all fours always.
   - *His acting is gesture:* hands on hips, paw on chin, finger up for an
     idea, arms flung wide, flexing, a shrug, and a grin that opens into a
     huge red mouth. Expressions change fast (several in 3 s in close-up).
   - *Limbs are plain tubes* that bend and stretch, so a rig of rigid
     pieces can't reach these poses.

   **Steps** (each looked at by Adam before the next):
   - *A lab page first* (done, 2026-10-08; Adam: "huge progress"):
     `games/yard/lab/index.html` draws the new Reksio from poses
     (`game/figure.js`), eighteen of them named after the moves, beside the
     reference frames. Open: the ears are tubes where the cartoon's are
     flaps; on his back is the weakest pose.
   - *Redraw him on-model,* with limbs drawn each frame as tubes between
     joints (shoulder, elbow, paw), so knees, elbows and stretching come
     free; a head with a side view and a front view, eyebrows and a set of
     mouths.
   - *Two stances:* upright by default, on all fours to trot, sniff and run,
     with getting up and dropping down between them.
   - *Life* (done, 2026-10-08, `life.js`): left alone he blinks, his eyes
     dart, he glances about and now and then turns to the child grinning,
     shifts how he stands (hands on hips, paw on chin, scratching his head);
     a mood (happy, curious, proud, dreamy) drifts and colours his face and
     walk (proud: a strut); ears and tail trail after him on springs.
     Gestures pick among a few faces and sizes.
   - *Acting:* moods that gestures set, reactions in each gag.
   - *Running and the morning* (done, 2026-10-08): a run is the cartoon's
     gallop (frames every 0.1 s, Aktor), more often, some just for joy;
     a nose-down sniffing trot on wanders and short trips (Adam: energetic,
     sniffs far more). Each play starts as the episodes do: asleep in the
     doghouse at dawn; he wakes by himself after 6–9 s, or at a first tap,
     which only wakes him; the sun comes up as he pops out and yawns two or
     three times. Woken by a tap, a soft morning tune (one of three shapes,
     flute or harp, its own pace) leads into the theme. *Adam to judge by
     ear:* the morning tune and the louder waking yawn. Sounds asked for
     before the first tap are now dropped, not played all at once on it.
   - *Swap him into the yard*, in three passes: (1) walking and the 27
     gestures in `reksio.js` on the new figure (done, 2026-10-08: upright
     walk, run on all fours, every gesture redrawn; all tests and the perf
     budget pass); (2) one look at each of the
     35 gags (12 things, 20 left-alone moves, 3 creatures) as a contact
     sheet, since the browser tests prove he ends free and standing but not
     that it looks right (ducking into the doghouse, catching drops, his
     size against the props; known so far: his old-style drawing asleep
     in the doghouse doorway, `#nap`, and where his mouth meets the bowl,
     the film and falling fruit); (3) acting: reactions in each gag from the
     study, starting with the gags Eliot likes. The perf suite guards each.
2. **Sound and music: a big pass, the next build track** (Adam,
   2026-10-12: to tweak and improve significantly). What there is: about 40
   effects synthesised in `sound.js` (Web Audio tones and noise), his voice
   silent (below), the original barks (local only), and music played note
   by note from CC0 samples (`samples.yaml`, `music.js`): the hook, themes
   B and C, the morning tune and the stretch run. Steps, in order:
   1. *A sound board* (Claude): one page that plays every effect (a few
      times each, to hear its variation), the barks, each tune on its own,
      and a short scene with music and effects together, to judge the mix.
      No board exists yet; auditing by playing the game is slow and misses
      what is rare.
   2. *Adam's audit on it, of everything*, not just the five worst: each
      effect keep, fix or replace; each tune (does it sound like Reksio?
      what is too busy, sad or annoying?); the mix (levels, does the music
      drown the gags?). Claude records the verdicts here.
   3. *Candidates from three sources, picked by Adam on the board*
      (Adam, 2026-10-12): synth variants, CC0 recordings, and AI models
      that generate many versions of each sound. The board plays the
      current sound beside its candidates; each verdict is saved with the
      candidate's source, prompt and seed. Plus the mix fixed (levels,
      music ducking under a gag) and variety kept (pitch and speed, as the
      barks).
   4. *Later, automation from the picks:* once a few hundred verdicts
      exist, a cheap model pre-ranks new candidates (e.g. audio embeddings
      near the kept ones), so Adam hears the top few, not twenty. The final
      pick stays a person's: no model we tried hears reliably (above). If
      it works, it becomes a skill, and the picking moves into the
      `main.py mark` page, styled after each cartoon.
   5. *Music reworked* from the audit: new tunes or new voicings.
   6. *His voice back* as recordings (below), with the episode work (it
      needs `main.py mark` to work on episodes).

   **First, a quick proof of concept** (2026-10-12): does generating
   candidates and picking by ear give better sounds than the synth, fast
   enough to be worth it? A handful of effects, a batch each from one
   local model, on a bare board page, in `experiments/sound/` (own
   dependencies, outputs not committed).
   - *Result (2026-10-12): it works, with ElevenLabs.* Two models, the
     same 13 sounds and wordings, picked on the board
     (`experiments/sound/`):
     - MOSS-SoundEffect, local (MLX on the M2): 45 rated, keeps for 3 of 5
       sounds (splash, rustle, bee), none for boing or bonk; about 3.5 s a
       sound, but the Mac ran hot and needed 7 GB.
     - ElevenLabs sound effects (API, Adam's Starter plan): keeps for all
       13, 43 kept, including every voice sound silent in the game now
       (yawn, snore, sneeze, munch, lap, sniff, yelp, howl). Adam: "day and
       night, 100x better". 159 takes for under 5% of a month's credits;
       15 takes in about 7 s, calls in parallel.
     - Wording: plain physical wording beats "cartoon". The era ("1970s
       Eastern European hand-drawn cartoon…, orchestral instruments") or
       the name ("…the Polish cartoon Reksio") helped the cartoon sounds
       (bonk 3 of 3 with the era; the only boing keep named Reksio) and
       spoiled natural ones (splash). Rule so far: style for cartoon
       sounds, none for real ones.
     - Not tried: Meta's AudioGen (reported below commercial tools; no
       newer Meta sound model found), Stable Audio 3 Small-SFX.
   - *Retro, not clean* (Adam, 2026-10-12: "too clean doesn't sound
     authentic" for Reksio). One kept take per sound was made in two
     versions, both trimmed at the start and brought to the same loudness;
     retro won all 13: mono, 22 kHz, lows under 120 Hz and highs over
     6.5 kHz rolled off, a touch of saturation (`process.py`). Picks are
     kept in `experiments/sound/picks.json`.
   - *In the game* (2026-10-12): the 40 ElevenLabs takes Adam kept, for 13
     sounds, are in `games/yard/effects/` (as made, 1 MB) and listed in
     `effects.yaml` with their prompts; `main.py effects` trims, levels and
     roughens them (the retro recipe, `config.EFFECT_*`) into `effects.js`
     (464 KB). Each sound plays a random take, never the same twice running,
     0.94–1.06 speed, one take at a time (a call while one plays lets it
     play on: munching is called a chew at a time). His voice is back where
     it has takes (all but slurp); the synth plays until the takes are
     decoded, after the first tap. *Adam to judge by ear:* each sound's
     level against the synth ones (`EFFECT_VOLUME` in sound.js, `gain` per
     sound in effects.yaml), and whether the snore (2.5 s) fits the
     doghouse's snore every 1.7 s.
   - More takes picked for boing, sneeze and yelp: 50 takes in all, 2 to
     6 a sound (547 KB packed). `experiments/sound/adopt.py` brings the
     keeps from `picks.json` into the game.
   - *Next:* the skill, written from this
     run (`new-sound`): find the sounds, word them by the rules above,
     generate, pick on the board, process, pack, play, test, retro. Music
     stays out of it until its direction is decided.

   **Reference-guided generation** (Adam's earlier idea): generate new
   sounds from short original clips used as a style reference
   (MusicGen-Style or a newer model), and compare reference-guided,
   text-only and melody-guided versions by ear. What to keep in mind
   (Claude):
   - *Its test cases* come from the audit (step 2).
   - *Add a cheap control.* Recorded CC0 sound libraries, and sounds Adam
     and Eliot make themselves, may beat both the synth and a model for
     splashes, bumps and footsteps. Compare against them too.
   - *Time-box the models.* Whether MusicGen-Style runs well on this Mac,
     and how good it is on 2–5 s clips, is unchecked: one evening to get it
     working, else the next model.
   - *Keep it apart.* A throwaway folder (`experiments/sound/`) with its
     own dependencies, so PyTorch stays out of the main project; files
     only, seeds saved, ratings in JSON, a plain HTML page to listen and
     rate.
   - *Licences.* Model weights may be non-commercial only, and sounds
     derived from original clips raise the same rights question as the
     barks and the hook (to check: each model's licence). Fine for the
     private build; noted for the licensing talk.
   - *Keep variety.* A chosen sound plays a little differently each time
     (pitch and speed), as the barks do, so a file doesn't sound canned.
   Easter-egg originals stay as they are: local, optional, never committed.
   *Done meanwhile (2026-10-09):* his made-up voice sounds (yawn, snore,
   sneeze, yelp, howl, lapping, slurping, munching, sniffing) are silent:
   to Adam's ear they all sounded awful. They come back as recordings: his
   original sounds for the home build, marked in episodes and packed
   locally like the barks (needs `main.py mark` to work on episodes); real
   dogs (CC0) or the family's voices for a public one; or what the
   experiment above makes. One list in `sound.js` (`HIS_VOICE`).
3. **Next game: an episode, entered from the yard.** First pick: *Reksio
   poliglota* (1967), in which Reksio learns to cluck, honk and squeal to talk
   to the yard animals. It is set in a yard, wordless by premise, and built
   from encounters. Steps, each a run of the `new-episode` skill:
   - Claude: frame pass and breakdown, `episodes/reksio-poliglota.yaml`.
   - Extend `main.py mark` to episode breakdowns (it handles the intro
     only), then Adam's (or his wife's) listening pass.
   - Retro on the skill; then a brief for the episode game and its doorway.
   - First step of building it: move what every Reksio game shares (Reksio
     himself: `figure.js`, `reksio.js`, `gestures.js`, `life.js`, `gait.js`,
     and the gag moves in `antics.js` that the episode uses; the creatures;
     `debug.js`; sound and music) out of the yard's folder into a
     world-level one both games load, and publish it with them
     (`.github/workflows/pages.yml`). Not before: the episode shows what is
     really shared, and two copies would drift apart. Made ready
     (2026-10-11): `reksio.js` holds no gag's state any more (gags put
     things on him with `Reksio.wear`), his everyday gestures are in
     `gestures.js`, and the bowl, its once-a-play left-alone move and the
     wet/puddle handling have their own files (`bowl.js`, a thing's
     `helped`, `wet.js`), so the yard's last few gags add files, not
     special cases in `yard.js`.
   Kosmonauta comes after: it is the biggest build (rocket, space, robots).
4. **The yard on phones, and helping** (order agreed 2026-10-11):
   - *Done:* measure the sizes on phones and tablets; cut the sky on short
     screens (above); held upright, a phone shows a wordless picture (a
     phone turning, the little yard in it coming upright) and the game waits
     (`Clock.hold`), so the morning isn't missed. Every play has someone to
     help (the trap or the tree) and the bowl (layout.js `OFFERS`). The bowl
     on his head (2026-10-11): the first "receive help" gag, the bird pulls
     it off, and the bird is his friend after (`bird.js`, `antics.js`). It
     comes on the second tap of the bowl, or, once a play, on his own the
     first time he's left alone 8 s (from 25 s in): a `due` left-alone move.
     His tail caught in the bramble (2026-10-11, `bramble.js`): the second
     "receive help" gag, and the first where help comes by accident. A wag
     catches it on a thorny cane; he is yanked back (boing), strains and is
     snapped onto his bottom, and sits glum (a tap is another try); a bee
     comes for the cane's flower, he freezes at the hum and leaps up in
     fright, which tears it free; the bee never noticed. The bramble's
     variation (first, then every other; not in the rain), or the `due`
     left-alone move when the bramble comes before the bowl in the play's
     props (one of the two a play). The bee is sent on an errand
     (`Creatures.beeTo`) and comes even when not out this play.
     *Adam's call (2026-10-11):* the bird freeing him again was rejected:
     each helped gag needs a different helper and a different way out, and
     a surprise (the `new-gag` skill now asks for two or three designs).
   - *Next:* Adam watches the bowl and bramble gags and tunes their timing
     (bramble: `BEE_COMES_MS`, `LEAP` in bramble.js; `STEP_OFF`, `STRAIN`
     in antics.js; the `boing` sound); then Eliot plays
     the bowl and the bramble on the iPad (does he tap to call for help?
     does he laugh at the leap?) before more: if helping gags don't land,
     more of them would be built on a guess. Then, if they work, one gag of
     each kind, each a run of the `new-gag` skill in a fresh session (to test
     the skill). The count is even (two helped, two help); what's thin is
     variety within each kind, so each brings a new pairing and needs no new
     prop (agreed 2026-10-12):
     1. *Helped:* the pesky fly on his nose, which the spider catches: a new
        helper, the help almost by accident, from two creatures already in
        the yard (needs a small layout rule: the fly and the spider out
        together);
     2. *Help:* the bird's twig. The bird is building a nest and drops a
        twig, and Reksio fetches it back up to the wall: the bird as a
        neighbour, not only his rescuer (help, every play).
     Later: more helpers for the bramble, by who is about this play (the fed
     mouse gnaws the cane, her return favour, rare, and needs a fast dash
     across the yard; the squirrel scrabbling for berries shakes him loose);
     the bone flung onto the doghouse roof, brought down by the squirrel
     (tags `dig` as `helped`); the reel rolling into the mouse hole, pushed
     back by the mouse (film and trap both out); acting in the mouse and
     tree encounters.
   - *Workflow note:* the layout rule went to a Haiku 5.5 subagent in a
     worktree. One round of its own fixes; one problem found in review: it
     tagged the bramble before its gag existed. The gag itself was written by
     Opus, which sets the pattern for the next ones.
5. **Adam: try the yard** (`uv run python main.py play reksio`, or on any
   device at https://alchemication.github.io/re-kid/, with the synthesised
   bark), alone and then with Eliot. What is in it, part by part and what each is based on, is
   in `games/yard/brief.yaml`; the testing flags and console helpers are in
   README ("Debugging the yard"). In short: a wide, wordless yard where every
   tap gets an answer and nothing is a goal. Each play puts out three of six
   props and brings two of three creatures and usually a shower; each new
   thing he does sinks the sun a step, and after six it sets. The yard stays
   open while a different moon each time comes up (40 s); then, or on a tap
   on the doghouse, he goes to bed and the picture closes on it. Left alone,
   Reksio keeps busy, rests, and shows a thought bubble of something he
   hasn't done yet.

   **Something wrong? Press Ctrl+Shift+B** in the game, say what you saw, and
   tell Claude: it replays the report (`main.py replay`) and sees the run-up.

   **Adam to judge by ear and eye:**
   - *The hook and the stretch run* come from a Basic Pitch transcription of
     Adam's two melody marks: a measurement, not an observation. Does it
     sound like the theme? What is too busy, too sad or annoying? (A
     recognisable melody is still Kowalowski's composition, so it goes into
     the licensing talk along with the recording and the character.)
   - *Themes B and C* (a skipping flute tune, a tiptoeing one in G minor) take
     turns with the hook (A A B B A A C C): catchy, and still Reksio?
   - *With Eliot:* does a mouse that can't eat worry him, or does he want to
     help? What does he go for, and does the ending (sunset, moon, bed) land?

   **Next ideas for a living yard** (pick and order with Adam; each should
   teach a small cause and effect a toddler can see):
   *Deepen before widening:* Eliot wanted the encounters to last, so a
   creature with several steps and a memory (as the mouse has) beats a new
   one-beat creature. Each step is short and started by a tap.
   - *More on the tree:* wasps at fallen fruit; a gust of wind shaking a
     fruit down on its own; Eliot giving an apple to a snail directly.
   - *Butterfly:* only in sunshine; flutters from flower to flower, sometimes
     lands on Reksio's nose (he goes cross-eyed, sneezes); hides from rain.
   - *Wasp:* hovers at the bowl when there is food; Reksio barks, it circles
     back; he learns to leave it be (it goes when the food is gone).
   - *Fox:* at dusk, eyes and a sniffing nose under the gate; Reksio barks
     and it slinks off; the hens (if added) flutter.
   - *Ants:* a line marching to crumbs the lapping dropped by the bowl,
     carrying them home; a raindrop scatters them.
   - *Leaves:* a gust (the wind is already there) blows leaves across; Reksio chases one.

   **Each new gag** comes with its browser tests and a look at it (CLAUDE.md,
   "Adding a gag"). Known complexity hotspot to split when next touched
   (ESLint warning): `Music.scheduleStep`.
6. **Iterate on what Eliot does with it**: which things he goes for, whether
   he finds them unaided, whether the ending lands.
7. **Later:** the yard becomes the home screen, and new things in it lead
   into episode games (a toy rocket for Kosmonauta). Parked ideas are listed
   in the yard brief's open questions and the intro brief.

## First experiment (after the game exists)

- **Who:** 6–8 families — about 4 Polish parents who grew up with Reksio and
  2–4 non-Polish families.
- **How:** watch them play without guiding them. Afterwards, show Polish
  parents a 30 s original clip and ask what felt off.
- **What to watch for:**
  - Did they finish?
  - Did parent and child talk while playing?
  - Did the parent spontaneously tell a childhood story?
  - Did anyone open the episode link?
  - Did anyone ask for another episode without being prompted?
  - For Eliot's first test: does he want to make Reksio do the next gag, and
    does he enjoy what Reksio does?
- **Don't measure** time played or replays.
- **Also track Adam's build hours.** If one person can research and build a
  faithful episode in about two weekends, a collection is viable.

## Local reference media (not in git)

Media, frames and generated audio are gitignored (`worlds/*/media/`,
`worlds/*/frames/`, `worlds/*/audio/`). What is kept locally:

- `media/1972-kosmonauta.mp4`: the full episode, for when Kosmonauta comes
  back.
- `media/intro/1972-kosmonauta.mp4`: its first 46 s, the clip `main.py mark`
  plays.
- `frames/intro/`, `frames/kosmonauta/`: contact sheets behind `intro.yaml` and
  the Kosmonauta frame pass. Names give the year, episode, time range and step,
  e.g. `1972-kosmonauta-0000-0022-halfsec.jpg`.
- `audio/intro/`: measurements and spectrograms (made on the first `mark` run)
  and each mark's clip (kept in step with the marks on every save).

Recreate on a new machine (`brew install yt-dlp ffmpeg`):

```sh
mkdir -p worlds/reksio/media/intro worlds/reksio/frames/intro
# Native 480p. Avoid the "-sr" AI-upscaled formats: they distort line and texture.
yt-dlp -f "135+140/best[height<=480]" --merge-output-format mp4 \
  -o "worlds/reksio/media/1972-kosmonauta.%(ext)s" https://www.youtube.com/watch?v=unuTG_vG0AI
# Intro clip: the first 46 s (the intro is the same in every episode from 1972 on)
ffmpeg -i worlds/reksio/media/1972-kosmonauta.mp4 -t 46 -c copy \
  worlds/reksio/media/intro/1972-kosmonauta.mp4
# Contact sheets: every 0.5 s for the intro, every 4 s for a whole episode.
# Homebrew's ffmpeg has no drawtext, so tiles carry no time codes; count them.
ffmpeg -i worlds/reksio/media/intro/1972-kosmonauta.mp4 -t 22 \
  -vf "fps=2,scale=320:-1,tile=6x8" -frames:v 1 \
  worlds/reksio/frames/intro/1972-kosmonauta-0000-0022-halfsec.jpg
```

Other episodes' upload links are in `episodes/index.yaml` (`watch_url`).
yt-dlp builds without a JavaScript runtime (e.g. `uvx yt-dlp`) get "This video
is not available" from YouTube; the Homebrew build works.
