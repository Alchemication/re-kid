---
name: new-world
description: Research a new cartoon series into a validated world — the dossier (world.yaml, sources.yaml), the episode catalogue, the title sequence if it has one, and a coarse look at a few episodes for its characters, home and humour — enough to write its scene's brief. Use when asked to add, start or research a new cartoon or world, e.g. "start Krecik" or "research Kot Filemon".
---

# New world

Makes `worlds/<world>/` for a cartoon not yet in the project: the series
dossier (`schema.world.WorldDossier`), its sources, the episode catalogue
(`schema.episode`) and, if the series has one, its title sequence
(`intro.yaml`, `schema.breakdown`). The rules for claims, sources and sound
are in `CLAUDE.md` ("Research"); this skill is the procedure. The worked
example is `worlds/reksio/`: match its depth and prose, not its length.

The aim is a scene, not an archive: research until the scene's brief can be
written with every part traced to something, then stop. Gaps go in
`open_questions`.

## 0. Before starting

- Read `docs/PROJECT_PLAN.md`, `docs/DECISIONS.md` and `CLAUDE.md`.
- Pick the world id with Adam: a short kebab-case slug, used in every path
  and every episode id (`reksio`, `reksio-kosmonauta`).
- Ask which episodes the child loves (links are fine). They decide the frame
  pass in step 4, so ask before any research.
- Start the hours log, `worlds/<world>/hours.md`: one row per session (date,
  hours, what was done), Adam's time only. Take the span from the session's
  transcript (first message's `timestamp` in the newest
  `~/.claude/projects/<project>/*.jsonl`) and `date`, never from memory;
  Adam corrects it for breaks and adds time away (watching, listening). How
  long a world takes is the collection's real question
  (`docs/PROJECT_PLAN.md`).
- Tools as for `new-episode` (`yt-dlp`, `ffmpeg`, Chrome).

### Getting at sources

- Film databases and some broadcasters sit behind Cloudflare checks that
  block WebFetch, curl and even automated Chrome (the NFA's Filmový přehled,
  Radio Prague). Their Wayback Machine copies work: find one with
  `https://archive.org/wayback/available?url=<url>` or the CDX index
  (`web.archive.org/cdx/search/cdx?url=<prefix>&matchType=prefix`), and read
  it raw with `web.archive.org/web/<timestamp>id_/<url>`. Note in the
  source's `notes` that it was read from an archived copy.
- Wikipedia: read the wikitext, `…/w/index.php?title=<title>&action=raw`;
  it shows what each statement cites.
- YouTube: a channel may refuse anonymous downloads ("This video is not
  available") yet play in Adam's browser. Then, with his OK,
  `yt-dlp --cookies-from-browser chrome` (his cookies are read locally).
- National streaming sites may be limited to their country (a `geo-xx` in
  the media URL); list them as sources even when nothing can be fetched.

## 1. Two questions first

Settle these before the bulk of the research; either can change the scene.

1. **Rights.** Who holds the films and who holds the character today (a
   studio, heirs, a foundation, a licensing agent; they may differ). Record
   it in `rights` with sources, or as `unknown` naming the candidates. This
   is research for Adam's talk with the rights holders, not a blocker for a
   private build (`docs/DECISIONS.md`, Licensing).
2. **Voice.** Does the hero speak, laugh, or make small sounds? From
   sources and a first look at frames (mouth moving with no subtitle), then
   phrased as `unknown` questions for Adam's ears. What the game does about
   it (the original, as Reksio's barks; our own; silence) is Adam's call.

**Checkpoint:** tell Adam what you found on both and ask him for the voice
decision, or for when he'll listen.

## 2. Sources

Find the primary sources first: the studio or its successor, a national film
archive or film-school database (FilmPolski did this for Reksio), the
official uploads. Then books, interviews, articles. Wikipedia, in every
language the series has one, is a list of leads: follow its citations.

Register each source once in `sources.yaml` as you use it, with `notes` on
what it covers and how far to trust it. Note the date the official channel
was checked and how many episodes it had: it changes.

Uploads: prefer the studio's or rights holder's channel. If there is none,
use the most legitimate copy reachable (a verified channel of unstated
ownership, a national broadcaster) and say exactly what it is in its
source `notes` and in a catalogue note; fan re-uploads only as a last
resort, said so the same way.

Write the YAML files through their schema with a small script in the
scratchpad (`Model.model_validate(...)` then `worlds.dump_model`), not by
hand: hand-written YAML breaks on an unquoted `: ` in prose.

## 3. The catalogue

`episodes/index.yaml`: every episode, in the order of one reference list
(say which, in `notes`). Typed fields (year, directors, runtime) follow the
most reliable source; each `record` claim states where sources disagree.
`watch_url` per step 2's rule on uploads. Synopses are your English
renderings of a source's descriptions: say so in `notes`.

**Checkpoint:** show Adam the catalogue's size, the conflicts left open and
the uploads, and confirm the episodes for step 4: the child's favourites,
plus any set at the hero's home or with other characters over several
steps, 3–5 in all.

## 4. A look at the favourite episodes

Fetch them (`new-episode` step 2) and make 4-second contact sheets
(`new-episode` step 3; crop pillarboxed uploads to the picture first, e.g.
`crop=640:480:107:0` for 4:3 in 854×480). A coarse pass only, then 1 s where
something is funny or fast. No beat-by-beat breakdown files: the findings
go into the dossier — `characters[].moves`, `humour`, `places`, the
encounters' shape (who comes, how many steps, how it ends) in
`episode_formula`, and what it suggests for the scene in `design_notes`.
A full breakdown is a separate `new-episode` run, only if a gag needs it.

Times come from counting tiles (tile n of a sheet starting at S is at
S + n × 4 s), which is easy to get wrong: note the tile index with each
observation, and recount every time against the sheet before it goes in a
claim.

If the series has a recurring title sequence, break it down into
`intro.yaml` with `new-episode`'s steps 2–4 (it was the richest single
source of Reksio's moves). If it hasn't, say so in `opening_sequence`.

## 5. The dossier

`uv run python main.py schema world` prints every field. Fill them roughly
in this order, each a claim:

- **production**, **viewing_context**, **legacy**, **availability**,
  **rights** from sources.
- **premise**, **episode_formula**, **tone_and_mood**, **humour**,
  **themes_and_values** from sources, checked against the frames of step 4.
- **characters** (recurring only), **places**, **aesthetics** from the
  frames of step 4 (add an upload from another decade if the favourites
  all come from one). Each character's `moves` say where to see them
  (episode and time). Sample `palette_hex` from frames: read raw pixels
  (`ffmpeg … -f rawvideo -pix_fmt rgb24`) at a few chosen points (the
  hero's body, sky, grass, ground).
- **sound**: credits and the theme's composer from sources; what it sounds
  like stays `unknown`, phrased as questions for Adam.
- **summary** last: a parent's paragraph that only restates claims above.
- **design_notes**: only `interpretation` claims, and only what the research
  suggests for a scene (where its home is, what the verb is).

If a series doesn't fit the schema (no single hero, no recurring home),
stop and propose the schema change rather than bending the claims.

## 6. Validate and report

```sh
uv run python main.py validate <world>
uv run python main.py list
uv run python main.py show <world> --status unknown
```

Fix every error and every "never cited" warning. Report: what the world
holds (claims by status), rights and voice, the open questions that matter
for the scene, what Adam should listen to first, and the hours so far. The
next step is the scene's brief (`games/<scene>/brief.yaml`), written with
Adam.

## 7. Retro

What in this skill was wrong, missing or slow this time; how long each
step took. Propose concrete edits to this file (or to the schema, if the
world didn't fit it) and make them once Adam agrees. The skill improves
only through this step.
