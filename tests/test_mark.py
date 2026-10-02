"""The marking tool's server: building marks, saving them, serving media."""

from __future__ import annotations

import json
import threading
import urllib.error
import urllib.request
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
        title="Demo — Intro",
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
