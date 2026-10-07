---
name: new-episode
description: Research one episode of a world's cartoon into a validated beat-by-beat breakdown (worlds/<world>/episodes/<id>.yaml) — fetch the official upload, read its frames, write timed beats with provenance, then hand the sound over to a human listener. Use when asked to add, break down, research or "do" an episode, e.g. "break down Reksio poliglota".
---

# New episode

Turns one catalogued episode into `worlds/<world>/episodes/<episode-id>.yaml`
(`schema.breakdown.Breakdown`): what happens, beat by beat, timed against the
official upload, with every statement a claim. The rules for claims, sources
and sound are in `CLAUDE.md` ("Research"); this skill is the procedure. The
worked example is `worlds/reksio/intro.yaml`: match its depth and prose.

Two people fill this file. Claude reads frames and sources; a human listens.
Sound is never described by Claude, from frames, from memory or from a model.

## 0. Before starting

- Read `PROJECT_PLAN.md` and `CLAUDE.md`.
- First time on this machine: `brew install yt-dlp ffmpeg`, `uv sync`, and
  Google Chrome (for `main.py mark`). Use Homebrew's `yt-dlp`, not `uvx yt-dlp`:
  builds without a JavaScript runtime get "This video is not available".
- Ask who the listener is (their name goes in `observed_by`) if it isn't the
  person you're talking to.

## 1. Pick the episode and its upload

```sh
uv run python main.py episodes <world> --online
uv run python main.py show <world> --section 'episodes[<episode-id>]'
```

The breakdown's file name and `id` are the catalogue id; `reference_episode`
is normally the same id. Only episodes with a `watch_url` (an official upload)
can be broken down: times must be checkable by anyone. If the episode isn't
catalogued, stop: the catalogue comes first (the `new-world` stage).

**Checkpoint:** tell the user which episode, its year, runtime and synopsis,
and confirm before downloading.

## 2. Fetch the media (gitignored, never committed)

```sh
mkdir -p worlds/<world>/media worlds/<world>/frames/<short-name>
# Native 480p. Avoid "-sr" formats: AI-upscaled, they distort line and texture.
yt-dlp -f "135+140/best[height<=480]" --merge-output-format mp4 \
  -o "worlds/<world>/media/<year>-<short-name>.%(ext)s" <watch_url>
```

`<short-name>` is the id without the series prefix (`poliglota`).

## 3. Read the frames, coarse then fine

1. **Whole episode, every 4 s**, in sheets of about 2 minutes:
   ```sh
   ffmpeg -i <media> -ss 0 -t 120 -vf "fps=1/4,scale=320:-1,tile=6x5" \
     -frames:v 1 worlds/<world>/frames/<short-name>/<year>-<short-name>-0000-0120-4s.jpg
   ```
   Homebrew's ffmpeg has no `drawtext`, so tiles carry no time codes: count
   them (tile n of a sheet starting at S is at S + n × step). Put the time
   range and step in the file name.
2. Write a rough scene list (times, what happens) in the conversation first.
   **Checkpoint:** show it to the user before the detailed pass. They may know
   the episode; a wrong reading caught here is cheap.
3. **Every 0.5–1 s** wherever the action is fast or unclear (`fps=2`), and
   wherever a beat boundary needs a time. Look again rather than guess.

What frames can't settle (who is that? what is that object?) becomes an
`unknown` claim or an `open_questions` entry, never a guess.

## 4. Write the breakdown

- **Beats** are small units of action, a few seconds to ~30 s, in time order,
  with kebab-case ids that name the action (`hen-ignores-him`, not `beat-7`).
- `action`: what is seen, `observed`, `observed_by: claude-frames`, citing the
  upload's source (for Reksio, `sfr-youtube`).
- `on_screen_text`: only when there is text; quote it and translate it.
- `sound`: always `unknown` from Claude, phrased as a specific question for
  the listener ("Does the hen's cluck come from an instrument or a voice?").
  Good questions are the main thing Claude contributes to the sound pass.
- `notes`: anything worth keeping that isn't the action, each a claim.
- `overview`: the episode in a short paragraph, plus how times were read
  ("from frames every 0.5 s, good to about half a second").
- `variation`: only if the stretch recurs across episodes and you checked
  other uploads.
- Facts from outside the frames (who animated it, a memoir's account) cite a
  source registered once in `sources.yaml`, with `notes` on its reliability.

Then:

```sh
uv run python main.py validate <world>
uv run python main.py show <world> --section episodes/<episode-id>
```

Fix every error before going on.

## 5. What it means for a game (separate from the research)

Research files hold research only. What the episode suggests for a game —
the way in from the world's home (the yard, for Reksio), the encounters a
child could drive with taps, what peril to soften, how it ends back home —
goes into the world's `design_notes` as `interpretation` claims, or straight
into a game brief if one is being written. Never into the breakdown.

## 6. Hand over the sound

The listener marks sounds and answers each beat's question in `main.py mark`
(`--by <name>` records who listened). `mark` handles the intro only for now;
until it handles episode breakdowns, finish here and say so plainly: the frame
pass is done, the sound pass is waiting on that tool.

## 7. Report and retro

Report: beats written, what is `unknown`, what the listener should listen for
first, and the `validate` result. Then a short retro: what in this skill was
wrong, missing or slow this time. Propose concrete edits to this file (or to
the schema, if the episode didn't fit it) and make them once the user agrees.
The skill improves only through this step.
