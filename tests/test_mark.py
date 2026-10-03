"""The marking tool's server: building marks, saving them, serving media."""

from __future__ import annotations

import json
import shutil
import threading
import urllib.error
import urllib.request
import wave
from collections.abc import Iterator
from pathlib import Path

import pytest
from pydantic import ValidationError

from audio import AudioAnalysis
from mark import MarkInput, Session, build_marks, make_server, slugify
from schema.breakdown import Breakdown
from schema.common import Status
from tests.conftest import beat, claim, minimal_breakdown
from worlds import dump_model, load_model


def _analysis() -> AudioAnalysis:
    return AudioAnalysis(
        duration_s=10.0,
        tempo_bpm=120.0,
        beat_times=[0.5, 1.0, 1.5],
        onset_times=[0.4, 2.0],
        onset_strengths=[1.0, 3.0],
        frame_times=[0.0, 0.5],
        loudness_db=[-20.0, -18.0],
    )


@pytest.fixture
def session(tmp_path: Path) -> Session:
    beats = [beat("title", 0, 4), beat("cymbals", 4, 8)]
    breakdown = Breakdown.model_validate(minimal_breakdown() | {"beats": beats})
    path = tmp_path / "intro.yaml"
    dump_model(breakdown, path)
    media = tmp_path / "clip.mp4"
    media.write_bytes(bytes(range(256)) * 4)  # 1024 bytes of known content
    return Session(
        world="demo",
        world_title="Demo",
        title="Intro",
        breakdown=breakdown,
        breakdown_path=path,
        analysis=_analysis(),
        media=media,
        observer="adam",
    )


@pytest.fixture
def server(session: Session) -> Iterator[str]:
    srv = make_server(session, "127.0.0.1", 0)
    thread = threading.Thread(target=srv.serve_forever, daemon=True)
    thread.start()
    yield f"http://127.0.0.1:{srv.server_address[1]}"
    srv.shutdown()
    srv.server_close()


def _get(url: str, headers: dict[str, str] | None = None) -> tuple[int, dict, bytes]:
    req = urllib.request.Request(url, headers=headers or {})
    try:
        with urllib.request.urlopen(req) as res:
            return res.status, dict(res.headers), res.read()
    except urllib.error.HTTPError as err:
        return err.code, dict(err.headers), err.read()


def _put(url: str, marks: list[dict]) -> tuple[int, dict]:
    req = urllib.request.Request(
        url,
        data=json.dumps({"marks": marks}).encode(),
        method="PUT",
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req) as res:
            return res.status, json.loads(res.read())
    except urllib.error.HTTPError as err:
        return err.code, json.loads(err.read())


def _mark(**extra: object) -> dict:
    data = {"name": "Cymbal crash", "kind": "effect", "start_s": 4.2, "end_s": 5.0}
    data.update(extra)
    return data


class TestBuildMarks:
    def test_slugify(self) -> None:
        assert slugify("Gulp & lick!") == "gulp-lick"
        assert slugify("Szczęśliwy łyk") == "szczesliwy-lyk"
        assert slugify("!!!") == "mark"

    def test_ids_follow_names_and_are_unique(self) -> None:
        marks = build_marks(
            [
                MarkInput(**_mark()),
                MarkInput(**_mark()),
                MarkInput(**_mark(id="sound-1", name="Gulp")),
            ],
            "adam",
        )
        assert [m.id for m in marks] == ["cymbal-crash", "cymbal-crash-2", "gulp"]

    def test_note_is_an_observed_claim_by_the_listener(self) -> None:
        (mark,) = build_marks([MarkInput(**_mark(note=" Real cymbal. "))], "adam")
        assert (mark.claim.text, mark.claim.status, mark.claim.observed_by) == (
            "Real cymbal.",
            Status.OBSERVED,
            "adam",
        )

    def test_empty_note_falls_back_to_name(self) -> None:
        (mark,) = build_marks([MarkInput(**_mark())], "adam")
        assert mark.claim.text == "Cymbal crash."

    def test_empty_name_rejected(self) -> None:
        with pytest.raises(ValidationError):
            MarkInput(**_mark(name=""))


class TestSessionSave:
    def test_writes_marks_to_breakdown_file(self, session: Session) -> None:
        session.save([MarkInput(**_mark(note="Crash."))])
        saved = load_model(session.breakdown_path, Breakdown)
        assert [m.id for m in saved.marks] == ["cymbal-crash"]
        assert saved.marks[0].claim.observed_by == "adam"
        assert saved.beats == session.breakdown.beats

    def test_replaces_previous_marks(self, session: Session) -> None:
        session.save([MarkInput(**_mark()), MarkInput(**_mark(name="Gulp"))])
        session.save([MarkInput(**_mark(name="Gulp"))])
        saved = load_model(session.breakdown_path, Breakdown)
        assert [m.id for m in saved.marks] == ["gulp"]

    def test_rejects_end_before_start(self, session: Session) -> None:
        with pytest.raises(ValueError, match="end must be after"):
            session.save([MarkInput(**_mark(start_s=5.0, end_s=4.0))])

    def test_rejects_mark_past_clip_end(self, session: Session) -> None:
        with pytest.raises(ValueError, match="after the clip"):
            session.save([MarkInput(**_mark(end_s=12.0))])
        assert load_model(session.breakdown_path, Breakdown).marks == []


class TestMarksSchema:
    def test_duplicate_mark_ids_rejected(self) -> None:
        mark = {
            "id": "a",
            "name": "A",
            "kind": "effect",
            "start_s": 0,
            "end_s": 1,
            "claim": claim("x", status="observed"),
        }
        with pytest.raises(ValidationError, match="duplicate mark ids"):
            Breakdown.model_validate(minimal_breakdown() | {"marks": [mark, mark]})

    def test_mark_end_after_start(self) -> None:
        mark = {
            "id": "a",
            "name": "A",
            "kind": "melody",
            "start_s": 2,
            "end_s": 2,
            "claim": claim("x", status="observed"),
        }
        with pytest.raises(ValidationError, match="end_s must be after"):
            Breakdown.model_validate(minimal_breakdown() | {"marks": [mark]})


class TestServer:
    def test_page_and_session(self, server: str) -> None:
        status, _, body = _get(server + "/")
        assert status == 200 and b"mark.js" in body
        status, _, body = _get(server + "/api/session")
        data = json.loads(body)
        assert [m["id"] for m in data["moments"]] == ["title", "cymbals"]
        assert data["duration"] == 10.0 and data["marks"] == []

    def test_put_saves_and_returns_ids(self, server: str, session: Session) -> None:
        status, data = _put(server + "/api/marks", [_mark()])
        assert (status, data) == (200, {"saved": 1, "ids": ["cymbal-crash"]})
        saved = load_model(session.breakdown_path, Breakdown)
        assert saved.marks[0].start_s == 4.2

    def test_put_bad_mark_explains(self, server: str) -> None:
        status, data = _put(server + "/api/marks", [_mark(end_s=99)])
        assert status == 400 and data["error"].startswith("Not saved:")

    def test_media_whole_and_ranges(self, server: str, session: Session) -> None:
        content = session.media.read_bytes()
        status, headers, body = _get(server + "/media")
        assert status == 200 and body == content
        assert headers["Accept-Ranges"] == "bytes"
        status, headers, body = _get(server + "/media", {"Range": "bytes=100-199"})
        assert status == 206 and body == content[100:200]
        assert headers["Content-Range"] == "bytes 100-199/1024"
        status, _, body = _get(server + "/media", {"Range": "bytes=1000-"})
        assert status == 206 and body == content[1000:]
        status, _, body = _get(server + "/media", {"Range": "bytes=-24"})
        assert status == 206 and body == content[-24:]

    def test_unsatisfiable_range(self, server: str) -> None:
        status, headers, _ = _get(server + "/media", {"Range": "bytes=5000-"})
        assert status == 416 and headers["Content-Range"] == "bytes */1024"

    def test_static_files_cannot_escape_ui_folder(self, server: str) -> None:
        assert _get(server + "/ui/mark.js")[0] == 200
        assert _get(server + "/ui/../mark.py")[0] == 404
        assert _get(server + "/ui/%2e%2e/mark.py")[0] == 404


class TestAnswers:
    def test_answer_becomes_moments_observed_sound(self, session: Session) -> None:
        session.answer("cymbals", "  A real cymbal, on the beat.  ")
        saved = load_model(session.breakdown_path, Breakdown)
        sound = {b.id: b.sound for b in saved.beats}["cymbals"]
        assert (sound.text, sound.status, sound.observed_by) == (
            "A real cymbal, on the beat.",
            Status.OBSERVED,
            "adam",
        )

    def test_other_moments_untouched(self, session: Session) -> None:
        session.answer("cymbals", "Crash.")
        saved = load_model(session.breakdown_path, Breakdown)
        assert {b.id: b.sound for b in saved.beats}["title"].status == Status.UNKNOWN

    def test_empty_or_unknown_rejected(self, session: Session) -> None:
        with pytest.raises(ValueError, match="empty"):
            session.answer("cymbals", "   ")
        with pytest.raises(ValueError, match="no moment called 'nope'"):
            session.answer("nope", "Crash.")

    def test_put_answer(self, server: str, session: Session) -> None:
        req = urllib.request.Request(
            server + "/api/moments/title",
            data=json.dumps({"note": "Brass fanfare."}).encode(),
            method="PUT",
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req) as res:
            assert res.status == 200
        saved = load_model(session.breakdown_path, Breakdown)
        assert saved.beats[0].sound.text == "Brass fanfare."


needs_ffmpeg = pytest.mark.skipif(
    shutil.which("ffmpeg") is None, reason="ffmpeg not installed"
)


@needs_ffmpeg
class TestClips:
    """Clips follow the marks on every save, using real (generated) audio."""

    @pytest.fixture
    def live(self, session: Session, tmp_path: Path) -> Session:
        media = tmp_path / "tone.wav"
        frames = 22_050 * 10
        with wave.open(str(media), "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(22_050)
            w.writeframes(b"\x00\x10" * frames)
        session.media = media
        session.clips_dir = tmp_path / "clips"
        return session

    def _seconds(self, path: Path) -> float:
        with wave.open(str(path)) as w:
            return w.getnframes() / w.getframerate()

    def test_save_cuts_clip(self, live: Session) -> None:
        _, problems = live.save([MarkInput(**_mark())])
        clip = live.clips_dir / "cymbal-crash.wav"
        assert problems == [] and clip.is_file()
        assert self._seconds(clip) == pytest.approx(0.8, abs=0.03)

    def test_unchanged_mark_is_not_recut(self, live: Session) -> None:
        live.save([MarkInput(**_mark())])
        clip = live.clips_dir / "cymbal-crash.wav"
        before = clip.stat().st_mtime_ns
        live.save([MarkInput(**_mark(note="Now with a note."))])
        assert clip.stat().st_mtime_ns == before

    def test_moved_mark_is_recut(self, live: Session) -> None:
        live.save([MarkInput(**_mark())])
        live.save([MarkInput(**_mark(start_s=4.2, end_s=6.2))])
        clip = live.clips_dir / "cymbal-crash.wav"
        assert self._seconds(clip) == pytest.approx(2.0, abs=0.03)

    def test_rename_and_delete_clean_up(self, live: Session) -> None:
        live.save([MarkInput(**_mark()), MarkInput(**_mark(name="Gulp"))])
        live.save([MarkInput(**_mark(name="Big crash"))])
        names = sorted(p.name for p in live.clips_dir.glob("*.wav"))
        assert names == ["big-crash.wav"]

    def test_sync_on_start_cuts_missing_and_removes_leftovers(
        self, live: Session
    ) -> None:
        live.save([MarkInput(**_mark())])
        (live.clips_dir / "cymbal-crash.wav").unlink()
        (live.clips_dir / "old-mark.wav").write_bytes(b"")
        restarted = Session(
            world=live.world,
            world_title=live.world_title,
            title=live.title,
            breakdown=load_model(live.breakdown_path, Breakdown),
            breakdown_path=live.breakdown_path,
            analysis=live.analysis,
            media=live.media,
            observer=live.observer,
            clips_dir=live.clips_dir,
        )
        assert restarted.sync_clips() == []
        names = sorted(p.name for p in live.clips_dir.glob("*.wav"))
        assert names == ["cymbal-crash.wav"]

    def test_failed_cut_keeps_the_mark(self, live: Session) -> None:
        live.media = live.media.with_name("missing.wav")
        marks, problems = live.save([MarkInput(**_mark())])
        assert [m.id for m in marks] == ["cymbal-crash"]
        assert problems and problems[0].startswith("cymbal-crash:")
        assert load_model(live.breakdown_path, Breakdown).marks[0].id == "cymbal-crash"
