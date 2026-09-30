"""The listening tool's pure parts: graph, loop nudging, notes, loop files."""

from __future__ import annotations

from pathlib import Path

import pytest
import yaml
from pydantic import ValidationError

from audio import AudioAnalysis, LoopProposal
from config import GRAPH_ROWS
from listen import initial_loops, nudge, render_graph, with_note
from schema.breakdown import Breakdown
from schema.common import Status
from schema.loops import LoopChoice, LoopSet
from tests.conftest import beat, episode, minimal_breakdown
from worlds import dump_model, load_model, validate_world


def _analysis(loud: dict[float, float] | None = None) -> AudioAnalysis:
    """0–10 s, frames every 0.1 s at -40 dB, beats every second."""
    times = [round(i * 0.1, 1) for i in range(100)]
    loud = loud or {}
    return AudioAnalysis(
        duration_s=10,
        tempo_bpm=60,
        beat_times=[float(i) for i in range(11)],
        onset_times=[],
        onset_strengths=[],
        frame_times=times,
        loudness_db=[loud.get(t, -40.0) for t in times],
    )


class TestRenderGraph:
    def test_shape(self) -> None:
        rows = render_graph(_analysis(), 0, 10, None, None, width=50)
        assert len(rows) == GRAPH_ROWS + 2  # levels, markers, axis
        assert all(len(r) == 50 for r in rows)

    def test_loud_moment_is_tallest_column(self) -> None:
        rows = render_graph(_analysis({5.0: -5.0}), 0, 10, None, None, width=100)
        top = rows[0]
        assert top[50] == "█"
        assert top[10] == " "

    def test_markers(self) -> None:
        rows = render_graph(_analysis(), 0, 10, (2.0, 6.0), 4.5, width=100)
        marks = rows[GRAPH_ROWS]
        assert marks[20] == "[" and marks[60] == "]"
        assert marks[45] == "▲"
        assert marks[30] == "|"  # beat inside the loop
        assert marks[80] == "|"  # beat outside the loop
        assert marks[25] == "─"

    def test_axis_labels(self) -> None:
        axis = render_graph(_analysis(), 2, 8, None, None, width=60)[-1]
        assert axis.startswith("2.0s") and axis.endswith("8.0s")
        assert "5.0s" in axis

    def test_no_gaps_when_columns_outnumber_frames(self) -> None:
        # 20 frames over 2 s drawn 90 wide: every column still gets a value.
        loud = {round(i * 0.1, 1): -20.0 - (i % 3) for i in range(100)}
        rows = render_graph(_analysis(loud), 3, 5, None, None, width=90)
        assert " " not in rows[GRAPH_ROWS - 1]

    def test_silence_draws_nothing(self) -> None:
        silent = _analysis({t: -90.0 for t in [round(i * 0.1, 1) for i in range(100)]})
        rows = render_graph(silent, 0, 10, None, None, width=40)
        assert all(set(r) == {" "} for r in rows[:GRAPH_ROWS])


class TestNudge:
    grid = (0.0, 1.0, 2.0, 3.0, 4.0)

    def _loop(self, approved: bool = True) -> LoopChoice:
        return LoopChoice(
            beat_id="b1", start_s=1.0, end_s=3.0, beats=2, approved=approved
        )

    def test_moves_start_and_end(self) -> None:
        later = nudge(self._loop(), list(self.grid), "start", 1)
        assert (later.start_s, later.end_s, later.beats) == (2.0, 3.0, 1)
        longer = nudge(self._loop(), list(self.grid), "end", 1)
        assert (longer.start_s, longer.end_s, longer.beats) == (1.0, 4.0, 3)

    def test_unapproves_when_moved(self) -> None:
        assert nudge(self._loop(), list(self.grid), "end", 1).approved is False

    def test_blocked_at_grid_edges(self) -> None:
        loop = LoopChoice(beat_id="b1", start_s=0.0, end_s=4.0, beats=4)
        assert nudge(loop, list(self.grid), "start", -1) == loop
        assert nudge(loop, list(self.grid), "end", 1) == loop

    def test_cannot_collapse_or_cross(self) -> None:
        loop = LoopChoice(beat_id="b1", start_s=1.0, end_s=2.0, beats=1)
        assert nudge(loop, list(self.grid), "start", 1) == loop
        assert nudge(loop, list(self.grid), "end", -1) == loop

    def test_empty_grid_changes_nothing(self) -> None:
        assert nudge(self._loop(), [], "start", 1) == self._loop()


class TestNotes:
    def _breakdown(self) -> Breakdown:
        beats = [beat("a", 0, 1), beat("b", 1, 2)]
        return Breakdown.model_validate(minimal_breakdown() | {"beats": beats})

    def test_note_becomes_observed_sound_claim(self) -> None:
        updated = with_note(self._breakdown(), "b", "A cymbal crash.", "adam")
        sound = updated.beats[1].sound
        assert (sound.text, sound.status, sound.observed_by) == (
            "A cymbal crash.",
            Status.OBSERVED,
            "adam",
        )
        assert updated.beats[0].sound.status == Status.UNKNOWN

    def test_note_survives_round_trip(self, tmp_path: Path) -> None:
        updated = with_note(self._breakdown(), "a", "Pizzicato strings, ąę.", "adam")
        dump_model(updated, tmp_path / "intro.yaml")
        assert load_model(tmp_path / "intro.yaml", Breakdown) == updated


class TestLoopSet:
    def test_initial_loops_skip_beats_without_a_loop(self) -> None:
        proposals = [
            LoopProposal("a", 0, 5, 1.0, 3.0, 4, 2.0, -20.0),
            LoopProposal("b", 5, 5.3, None, None, 0, None, None),
        ]
        loops = initial_loops(proposals, "intro", "media/clip.mp4")
        assert [x.beat_id for x in loops.loops] == ["a"]
        assert loops.loops[0].approved is False

    def test_duplicate_beats_rejected(self) -> None:
        loop = {"beat_id": "a", "start_s": 0, "end_s": 1, "beats": 2}
        with pytest.raises(ValidationError, match="more than one loop"):
            LoopSet.model_validate(
                {"breakdown": "intro", "source": "x", "loops": [loop, loop]}
            )

    def test_end_after_start(self) -> None:
        with pytest.raises(ValidationError, match="end_s must be after"):
            LoopChoice(beat_id="a", start_s=2, end_s=2, beats=1)


class TestValidateLoops:
    def _write(self, root: Path, loops: dict, with_intro: bool = True) -> None:
        base = root / "demo"
        if with_intro:
            (base / "intro.yaml").write_text(yaml.safe_dump(minimal_breakdown()))
            (base / "episodes").mkdir(exist_ok=True)
            (base / "episodes" / "index.yaml").write_text(
                yaml.safe_dump({"episodes": [episode()]})
            )
        (base / "games" / "intro").mkdir(parents=True)
        (base / "games" / "intro" / "loops.yaml").write_text(yaml.safe_dump(loops))

    def _loops(self, beat_id: str = "b1", breakdown: str = "intro") -> dict:
        loop = {"beat_id": beat_id, "start_s": 0, "end_s": 1, "beats": 2}
        return {"breakdown": breakdown, "source": "x.mp4", "loops": [loop]}

    def test_valid(self, worlds_root: Path) -> None:
        self._write(worlds_root, self._loops())
        report = validate_world("demo", worlds_root)
        assert report.errors == []
        assert report.intro_loops is not None

    def test_unknown_beat(self, worlds_root: Path) -> None:
        self._write(worlds_root, self._loops(beat_id="nope"))
        errors = validate_world("demo", worlds_root).errors
        assert any("unknown beat 'nope'" in e for e in errors)

    def test_wrong_breakdown(self, worlds_root: Path) -> None:
        self._write(worlds_root, self._loops(breakdown="other"))
        errors = validate_world("demo", worlds_root).errors
        assert any("breakdown 'other' is not 'intro'" in e for e in errors)

    def test_needs_intro(self, worlds_root: Path) -> None:
        self._write(worlds_root, self._loops(), with_intro=False)
        errors = validate_world("demo", worlds_root).errors
        assert any("needs a valid intro.yaml" in e for e in errors)


class TestKeyHelp:
    def test_every_key_is_shown(self) -> None:
        from listen import KEY_NAMES, KEYMAP, key_help

        shown = " ".join(keys for keys, _ in key_help())
        for key in KEYMAP:
            assert KEY_NAMES.get(key, key) in shown, f"{key!r} works but is not shown"

    def test_enter_listed_once(self) -> None:
        from listen import key_help

        assert {label: keys for keys, label in key_help()}["next beat"] == "→ ↓ enter"
