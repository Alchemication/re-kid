"""Local web tool for marking sounds and melodies in the intro, by ear.

``main.py mark`` starts a small HTTP server on the loopback interface and opens
a page (``src/mark_ui/index.html``) with the intro video, its waveform and
spectrogram, the breakdown's moments and the measured beat grid. The listener
drags across the waveform to select a sound, names it and notes what they hear.

Every save replaces the breakdown's ``marks`` and rewrites ``intro.yaml``; the
page is the source of truth while it is open, and git is the undo. Each mark's
note becomes an ``observed`` claim by the listener.

The server only reads files it was given (the page, its vendored libraries and
one media file) and only writes the breakdown.

Example:
    serve(Session(...), port=8765)
"""

from __future__ import annotations

import json
import logging
import mimetypes
import re
import unicodedata
from dataclasses import dataclass, field
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Lock
from typing import Any

from pydantic import BaseModel, Field, ValidationError

from audio import AudioAnalysis
from config import MARK_UI_DIR
from schema.breakdown import Breakdown, Mark, MarkKind
from schema.common import Claim, Status
from worlds import dump_model

logger = logging.getLogger(__name__)

RANGE_PATTERN = re.compile(r"bytes=(\d*)-(\d*)$")
"""An HTTP Range header asking for one byte span, the only form browsers send
when seeking in a video."""

CHUNK_BYTES = 256 * 1024
"""Size of each write when streaming media; small enough to stop quickly when
the browser cancels a request mid-seek."""


class MarkInput(BaseModel):
    """One mark as the page sends it. Any ``id`` it sends is ignored."""

    id: str = ""
    name: str = Field(min_length=1)
    kind: MarkKind
    start_s: float = Field(ge=0)
    end_s: float = Field(gt=0)
    note: str = ""


def slugify(text: str) -> str:
    """ASCII kebab-case slug: 'Gulp & lick!' -> 'gulp-lick'. Never empty."""
    ascii_text = (
        unicodedata.normalize("NFKD", text.lower().replace("ł", "l"))
        .encode("ascii", "ignore")
        .decode()
    )
    return re.sub(r"[^a-z0-9]+", "-", ascii_text).strip("-") or "mark"


def build_marks(inputs: list[MarkInput], observer: str) -> list[Mark]:
    """Turn page input into validated marks.

    Each id is a slug of the mark's name, made unique by a numeric suffix, so
    ids and clip file names always read like the name. An empty note is
    recorded as the name.
    """
    taken: set[str] = set()
    marks = []
    for item in inputs:
        base = slugify(item.name)
        mark_id, n = base, 2
        while mark_id in taken:
            mark_id, n = f"{base}-{n}", n + 1
        taken.add(mark_id)
        note = item.note.strip() or f"{item.name.strip()}."
        marks.append(
            Mark(
                id=mark_id,
                name=item.name.strip(),
                kind=item.kind,
                start_s=round(item.start_s, 3),
                end_s=round(item.end_s, 3),
                claim=Claim(text=note, status=Status.OBSERVED, observed_by=observer),
            )
        )
    return marks


@dataclass
class Session:
    """What the server serves and writes. Shared by request threads."""

    world: str
    world_title: str
    title: str
    breakdown: Breakdown
    breakdown_path: Path
    analysis: AudioAnalysis
    media: Path
    observer: str
    lock: Lock = field(default_factory=Lock)

    def payload(self) -> dict[str, Any]:
        """Everything the page needs to draw itself."""
        b = self.breakdown
        return {
            "world": self.world,
            "world_title": self.world_title,
            "title": self.title,
            "observer": self.observer,
            "duration": self.analysis.duration_s,
            "tempo": self.analysis.tempo_bpm,
            "beats": self.analysis.beat_times,
            "onsets": [
                [t, s]
                for t, s in zip(
                    self.analysis.onset_times,
                    self.analysis.onset_strengths,
                    strict=True,
                )
            ],
            "moments": [
                {
                    "id": m.id,
                    "start": m.start_s,
                    "end": m.end_s,
                    "action": m.action.text,
                    "text": m.on_screen_text.text if m.on_screen_text else "",
                    "sound": m.sound.text,
                    "heard": m.sound.status == Status.OBSERVED,
                }
                for m in b.beats
            ],
            "marks": [
                {
                    "id": m.id,
                    "name": m.name,
                    "kind": m.kind,
                    "start_s": m.start_s,
                    "end_s": m.end_s,
                    "note": m.claim.text,
                }
                for m in b.marks
            ],
        }

    def save(self, inputs: list[MarkInput]) -> list[Mark]:
        """Validate, then replace the breakdown's marks and rewrite the file."""
        for item in inputs:
            if item.end_s <= item.start_s:
                raise ValueError(f"'{item.name}': the end must be after the start")
            if item.end_s > self.analysis.duration_s + 0.05:
                raise ValueError(
                    f"'{item.name}' ends at {item.end_s:.2f} s, after the clip "
                    f"({self.analysis.duration_s:.2f} s)"
                )
        marks = build_marks(inputs, self.observer)
        with self.lock:
            updated = Breakdown.model_validate(
                self.breakdown.model_dump() | {"marks": [m.model_dump() for m in marks]}
            )
            dump_model(updated, self.breakdown_path)
            self.breakdown = updated
        return marks

    def answer(self, moment_id: str, note: str) -> None:
        """Record what the listener heard in one moment as its sound claim."""
        note = note.strip()
        if not note:
            raise ValueError("the answer is empty")
        with self.lock:
            data = self.breakdown.model_dump()
            beats = {b["id"]: b for b in data["beats"]}
            if moment_id not in beats:
                raise ValueError(f"no moment called '{moment_id}'")
            beats[moment_id]["sound"] = Claim(
                text=note, status=Status.OBSERVED, observed_by=self.observer
            ).model_dump()
            updated = Breakdown.model_validate(data)
            dump_model(updated, self.breakdown_path)
            self.breakdown = updated


class Handler(BaseHTTPRequestHandler):
    """Routes: ``/`` page, ``/ui/...`` static, ``/media`` video, ``/api/...``."""

    session: Session  # set on the subclass made by make_server

    def log_message(self, format: str, *args: object) -> None:
        """Keep the terminal quiet; errors are logged where they happen."""

    def do_GET(self) -> None:
        """Serve the page, static files, the media, or the session data."""
        path = self.path.split("?", 1)[0]
        if path in ("/", "/index.html"):
            self._file(MARK_UI_DIR / "index.html")
        elif path.startswith("/ui/"):
            target = (MARK_UI_DIR / path.removeprefix("/ui/")).resolve()
            if not target.is_relative_to(MARK_UI_DIR.resolve()) or not target.is_file():
                self._error(HTTPStatus.NOT_FOUND, "No such file.")
            else:
                self._file(target)
        elif path == "/favicon.ico":
            self.send_response(HTTPStatus.NO_CONTENT)
            self.end_headers()
        elif path == "/media":
            self._media()
        elif path == "/api/session":
            self._json(HTTPStatus.OK, self.session.payload())
        else:
            self._error(HTTPStatus.NOT_FOUND, "No such page.")

    def do_PUT(self) -> None:
        """``/api/marks``: replace all marks. ``/api/moments/<id>``: answer the
        moment's sound question."""
        try:
            length = int(self.headers.get("Content-Length", "0"))
            body = json.loads(self.rfile.read(length) or b"{}")
            if self.path == "/api/marks":
                inputs = [MarkInput.model_validate(m) for m in body.get("marks", [])]
                marks = self.session.save(inputs)
                result = {"saved": len(marks), "ids": [m.id for m in marks]}
            elif self.path.startswith("/api/moments/"):
                moment_id = self.path.removeprefix("/api/moments/")
                self.session.answer(moment_id, str(body.get("note", "")))
                result = {"saved": moment_id}
            else:
                self._error(HTTPStatus.NOT_FOUND, "No such endpoint.")
                return
        except (ValueError, ValidationError) as exc:
            message = (
                "; ".join(e["msg"] for e in exc.errors())
                if isinstance(exc, ValidationError)
                else str(exc)
            )
            self._error(HTTPStatus.BAD_REQUEST, f"Not saved: {message}")
            return
        except OSError as exc:
            logger.error("Could not write %s: %s", self.session.breakdown_path, exc)
            self._error(HTTPStatus.INTERNAL_SERVER_ERROR, f"Not saved: {exc}")
            return
        self._json(HTTPStatus.OK, result)

    def _file(self, path: Path) -> None:
        data = path.read_bytes()
        kind = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        if path.suffix == ".js":
            kind = "text/javascript"
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", kind)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def _media(self) -> None:
        """Stream the media file, honouring one-span Range requests for seeking."""
        media = self.session.media
        size = media.stat().st_size
        start, end = 0, size - 1
        status = HTTPStatus.OK
        header = self.headers.get("Range")
        if header:
            match = RANGE_PATTERN.match(header.strip())
            if not match or (not match.group(1) and not match.group(2)):
                self._error(HTTPStatus.REQUESTED_RANGE_NOT_SATISFIABLE, "Bad range.")
                return
            first, last = match.groups()
            if first:
                start = int(first)
                end = min(int(last), size - 1) if last else size - 1
            else:  # suffix range: the last N bytes
                start = max(size - int(last), 0)
            if start > end or start >= size:
                self.send_response(HTTPStatus.REQUESTED_RANGE_NOT_SATISFIABLE)
                self.send_header("Content-Range", f"bytes */{size}")
                self.end_headers()
                return
            status = HTTPStatus.PARTIAL_CONTENT
        self.send_response(status)
        self.send_header(
            "Content-Type", mimetypes.guess_type(media.name)[0] or "video/mp4"
        )
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(end - start + 1))
        if status == HTTPStatus.PARTIAL_CONTENT:
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.end_headers()
        try:
            with media.open("rb") as f:
                f.seek(start)
                remaining = end - start + 1
                while remaining > 0:
                    chunk = f.read(min(CHUNK_BYTES, remaining))
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                    remaining -= len(chunk)
        except (BrokenPipeError, ConnectionResetError):
            pass  # the browser cancelled, e.g. after a seek

    def _json(self, status: HTTPStatus, data: object) -> None:
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _error(self, status: HTTPStatus, message: str) -> None:
        self._json(status, {"error": message})


def make_server(session: Session, host: str, port: int) -> ThreadingHTTPServer:
    """Bind a server for ``session``. Raises OSError if the port is busy."""
    handler = type("SessionHandler", (Handler,), {"session": session})
    return ThreadingHTTPServer((host, port), handler)
