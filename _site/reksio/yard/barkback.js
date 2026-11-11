// Who answers Reksio's bark (Adam, 2026-11-10: the bark is what a child does
// most, and most of the yard ignored it). A bark of his own (a tap on him, or
// left alone), not one inside a gag, and a moment later whoever is near and
// at ease answers: the bird on its perch hops round to him and chirps, the
// hen bobs her head and clucks, the mouse squeaks (once fed, she peeps out of
// her hole to do it). With nobody near, now and then a dog far beyond the
// gate barks back, and he pricks up his ears and turns that way. One answer a
// bark, the nearest's, but never the same one twice running if another can;
// and not on every bark of a row, so the yard stays calm. Invented: the
// films' Reksio barks at things, not for an answer.
//
// The small flies and the sparrows hear his bark by themselves (the world
// model, creatures.js); a gag's bark is the gag's (the gate's bigger dog).
//
// pick() is the rule, plain; heard() is told of each bark by yard.js.

/* global Bird, Clock, Debug, Hen, Layout, Mouse, Reksio, Sound */
/* exported BarkBack */
const BarkBack = (() => {
  const EAR = 900 // whoever is within this of him hears it (scene units: about what the screen shows round him)
  const AFTER_MS = 700 // the answer comes this long after his bark: once his "hau hau" is out (two barks, about 0.45 s)
  const GAP_MS = 2500 // at most one answer this often: a child barking on and on gets an answer now and then, not a chorus
  const FAR_DOG = 0.3 // with nobody near to answer, the share of barks a far dog answers
  const PERK_MS = 800 // his ears up at the answer, this long
  const random = Debug.random('bark-back') // its own stream: drawn once a bark, so nothing else shifts

  // who may answer: where they are (scene x), whether they can now, and their answer
  const ANSWERERS = {
    bird: { x: () => Bird.perch.x, can: () => Bird.canChirpBack, answer: () => Bird.chirpBack() },
    hen: { x: () => Hen.x, can: () => Hen.canCluckBack, answer: () => Hen.cluckBack() },
    mouse: { x: () => Mouse.x, can: () => Mouse.canPeepBack, answer: () => Mouse.peepBack() },
  }

  let free = () => false
  let ended = () => false
  let last = null // who answered last
  let lastAt = -Infinity

  /**
   * Who answers: the nearest who can, unless it answered last and another can; with nobody, the far dog
   * when `roll` (0 to 1) falls to it, or no one (null).
   * @param {{name: string, distance: number}[]} able who can answer now, and how far each is from him
   * @param {string|null} last who answered the last bark
   * @param {number} roll this bark's draw
   */
  function pick(able, last, roll) {
    const near = [...able].sort((a, b) => a.distance - b.distance)
    if (!near.length) return roll < FAR_DOG ? 'dog' : null
    return (near.find((a) => a.name !== last) ?? near[0]).name
  }

  /** He barked at x: a moment later, someone answers. Not inside a gag (`mid`), nor too soon after the last answer. */
  function heard(x, mid) {
    const roll = random() // drawn either way
    if (mid || ended() || Clock.now() - lastAt < GAP_MS) return
    const able = Object.entries(ANSWERERS)
      .map(([name, a]) => ({ name, distance: Math.abs(a.x() - x), can: a.can() }))
      .filter((a) => a.can && a.distance < EAR)
    const who = pick(able, last, roll)
    if (!who) return
    lastAt = Clock.now()
    Clock.after(AFTER_MS, () => {
      if (ended()) return
      if (who === 'dog') farDog()
      else if (ANSWERERS[who].can()) ANSWERERS[who].answer() // still at ease: not if a gag has taken it since
      else return
      last = who
      Debug.trace('bark back', { who })
      Reksio.kit.perk(who === 'dog' ? 'both' : 'either', PERK_MS) // he heard it
    })
  }

  /** A dog far beyond the gate barks back; if he is free, he turns that way. */
  function farDog() {
    Sound.farBark()
    if (free() && Reksio.x < Layout.MAX_X - 40) Reksio.face(1)
  }

  /** `free()`: is he free to turn to an answer; `ended()`: has the day ended. */
  function init(hooks) {
    ;({ free, ended } = hooks)
  }

  return { EAR, GAP_MS, FAR_DOG, AFTER_MS, pick, heard, init }
})()
