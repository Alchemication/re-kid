"""One open play of a game in Chrome, as the browser tests drive it.

On game time (`?step`, debug.js) the play also goes in lock-step with the
test: it starts held (`?held`), runs only while the test waits, and is held
again, in the frame the wait ends, until the test's next wait. So what the
test does between waits (taps, checks) lands at the same game moment however
long the machine takes over it. A call into the game that returns a promise
(a gesture, from `perform`) is a wait too: the play runs until it settles.
On the real clock (a test marked `realtime`) the play runs free, as a
player's does.
"""

from __future__ import annotations

from pathlib import Path

DONE_MS = 60_000  # a wait's default limit, in real time
# Real time a play may stay held with the test silent: longer means the test
# awaits something in the page that needs game time (use run(js)), and the
# play runs on with an error rather than hanging the test. Steps between
# waits take milliseconds, a few seconds on a loaded machine.
STUCK_MS = 20_000

# Installed in a page on game time: the test's hold, and the game's calls
# (yardGame.*, meadowGame.*) that let the play run on until they settle.
# `turn` counts each run-on, so a call settling late can't hold the play
# during a later wait.
LOCKSTEP = """([api, stuckMs]) => {
  let turn = 0
  /** Held this turn for stuckMs of real time: the test awaits game time. */
  const watch = (at) => setTimeout(() => {
    if (!lock.held || at !== turn) return
    console.error(`lock-step: held ${stuckMs} ms while the test waited on the page: it awaits game time outside a wait (use run(js))`)
    lock.runOn()
  }, stuckMs)
  const lock = (window.__lock = {
    held: true,
    hold() { Clock.hold('test', true); lock.held = true; watch(turn) },
    runOn() { turn++; lock.held = false; Clock.hold('held', false); Clock.hold('test', false) },
  })
  const game = globalThis.eval(api)
  for (const [name, fn] of Object.entries(game)) {
    if (typeof fn !== 'function') continue
    game[name] = (...args) => {
      const r = fn(...args)
      if (r && typeof r.then === 'function' && lock.held) {
        lock.runOn()
        const mine = turn
        const done = () => mine === turn && lock.hold()
        r.then(done, done)
      }
      return r
    }
  }
}"""


class GamePage:
    """A game's page, collecting what went wrong; subclassed per game."""

    def __init__(
        self, browser: object, page_file: Path, query: str, api: str, **page: object
    ) -> None:
        self.errors: list[str] = []
        self.locked = "step=" in query
        self.page = browser.new_page(**page)
        self.page.on("console", self._console)
        self.page.on("pageerror", lambda e: self.errors.append(f"uncaught: {e}"))
        self.page.goto(f"{page_file.as_uri()}?{query}{'&held' if self.locked else ''}")
        self.page.wait_for_function(f"typeof {api} !== 'undefined'")
        if self.locked:
            self.page.evaluate(LOCKSTEP, [api, STUCK_MS])
            self.page.evaluate(
                "__lock.hold()"
            )  # held from load (?held): the watch starts

    def _console(self, msg: object) -> None:
        if msg.type == "error":
            self.errors.append(msg.text[:3000])

    def play_on(self) -> None:
        """Let the play run on without waiting (it is held again at the next wait)."""
        if self.locked:
            self.page.evaluate("__lock.runOn()")

    def wait(self, js: str, timeout: int = DONE_MS) -> None:
        """Until `js` holds in the page; in lock-step, held in the frame it does."""
        if not self.locked:
            self.page.wait_for_function(js, timeout=timeout)
            return
        self.play_on()
        self.page.wait_for_function(
            f"(() => {{ if (!({js})) return false; __lock.hold(); return true }})()",
            timeout=timeout,
        )

    def play_for(self, ms: int) -> None:
        """Let ms of game time go by; in lock-step, held exactly then."""
        if not self.locked:
            t0 = self.page.evaluate("Clock.now()")
            self.page.wait_for_function(
                f"Clock.now() >= {t0 + ms}", timeout=DONE_MS + ms
            )
            return
        self.page.evaluate(
            f"window.__played = false; Clock.after({ms}, () => {{ __lock.hold(); window.__played = true }}); __lock.runOn()"
        )
        self.page.wait_for_function("window.__played", timeout=DONE_MS + ms)

    def run(self, js: str, timeout: int = DONE_MS) -> object:
        """Await `js` (a promise) in the page and return what it settles to;
        fail if it doesn't end in time."""
        return self.page.evaluate(
            """([js, ms, locked]) => {
                if (locked) __lock.runOn()
                return Promise.race([
                    Debug.ignoreCut(eval(js), 'test'),
                    new Promise((_, no) => setTimeout(() => no(new Error(`still going after ${ms} ms`)), ms)),
                ]).finally(() => locked && __lock.hold())
            }""",
            [js, timeout, self.locked],
        )
