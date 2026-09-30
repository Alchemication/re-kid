## Rules

Always use `uv run`, never plain `python`. Commands: `uv run python main.py --help`.

`main.py` is dispatch only — handlers live in `src/commands.py` (split into
`src/cmd_*.py` once it nears ~1000 lines).

Paths and tunables live in `src/config.py` as named constants, each with a
docstring saying why it has that value. Never inline them at the point of use.

Work on `main`. Commit only when asked, and only with lint and tests green.

## Project

Small, faithful games made from nostalgic childhood cartoons. Background and
goals: `PROJECT_IDEA.md`. Decisions, status and next steps: `PROJECT_PLAN.md` —
read it at the start of a session and update it as work lands. Current scope is one world (Reksio) and one MVP game —
resist building platform features ahead of that.

Flow, one validated file per stage, under `worlds/<id>/`:

1. `world.yaml` + `sources.yaml` — series-level dossier (`schema.world`).
2. `episodes/index.yaml` (`schema.episode`) → selection → breakdowns:
   `intro.yaml` and `episodes/<slug>.yaml` (`schema.breakdown`).
3. Game brief → game → playtest logs (not written yet).

Research files hold research only. Game ideas go in a game brief; the one bridge
is `design_notes`, which must be `interpretation` claims.

## Research

Research happens in Claude Code sessions (web search/fetch, reading frames), not
through API calls from `main.py`. Write results straight into the YAML files and
run `uv run python main.py validate <world>` before reporting done.

Provenance rules (enforced by `schema.common.Claim` and `worlds.validate_world`):

- `verified` — two independent credible sources, or one primary (`studio`, `archive`).
- `sourced` — one credible source.
- `observed` — seen/heard in the original material; set `observed_by`.
  Claude can read frames but cannot hear audio: music, rhythm, and sound claims
  need the user's ears (`observed_by: adam`) or a source. `main.py audio`
  measures (tempo, onsets, spectrograms); its numbers are leads for the
  listener, never claims on their own. `main.py listen` is how the listener
  records what they hear: notes become `observed` sound claims.
- `interpretation` — our reading. Say so; don't dress it as fact.
- `unknown` — an open question, stated plainly. Prefer this over a guess.

Never state from memory what you haven't checked. If recall and a source
disagree, record the conflict in the claim text. Wikipedia is a lead, not a
destination — follow it to what it cites. Register every source once in
`sources.yaml` with `notes` on reliability; ids are kebab-case slugs.

Prose in claims: plain, specific, readable by a parent. No marketing tone.

## Collaboration Style

Challenge my ideas early. If an approach is over-engineered, fragile, or has a
simpler alternative — say so directly with reasoning. Flag knowledge gaps,
hidden trade-offs, or narrowed thinking. Be pragmatic.

**Prose:** terse, no pleasantries / hedging / filler. Fragments fine. Full
sentences for warnings, destructive-op confirmations, commit messages, and
research claims.

**Verification:** after cross-cutting changes (multiple modules, schema changes,
file moves), grep for stale references, run lint + tests + `main.py validate`,
and fix what you find before reporting done.

## Documentation

Keep `AGENTS.md` and `CLAUDE.md` identical. When editing either, update both.

Docs describe current behavior, not history or plans. Changes to commands or
file layout update `README.md` and the `main.py` docstring in the same change.

## Code Style

- **Linter/formatter:** `uv run ruff check .` and `uv run ruff format .`
- **Type hints:** required on all signatures. Native types only (`list`, `dict`,
  `str | None`) — never `typing.List` etc.
- **Docstrings:** Google style. Module docstrings say what the module is for.
- **Schemas:** Pydantic models extend `schema.common.Model` (`extra="forbid"`).
  Every statement about an original work is a `Claim`, not a bare string.
  Hard facts worth querying (years, counts) may get a typed field alongside
  the claim that carries their provenance.
- **File size:** keep source files under ~1000 lines.
- **No backward-compat shims:** when moving code, update all callers.

## Output Rules

- `print()` for user-facing content → stdout.
- `logger` (stdlib `logging`) for diagnostics and errors → stderr.
- `rich` (import lazily) for tables and styled terminal output.
- Error messages tell the user what to do, not just what went wrong.

## Testing

`uv run pytest`. Shared fixtures and minimal valid data in `tests/conftest.py`.

**Must have tests:** schema validators, cross-file checks in `worlds.py`, YAML
round-trips. Group in classes; use `tmp_path`; cover the edge cases that would
let bad data pass silently.
