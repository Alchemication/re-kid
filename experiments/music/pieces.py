"""The music the board asks candidates for: each piece, what it is for in its
game, which part of the game's music a keep becomes (`part`, or `parts` by
wording; else the first of `now`), how long, which part of today's code music plays next to it
(`Music.audition`), and wordings for a model.

Everything above PIECES was learnt on Reksio's yard and holds for it only.
A piece for another world sets `"world"` and `"style": False`, and is
worded from that world's MUSIC_DIRECTION.md (`worlds/<id>/`), not from
STYLE, SEEDS or Adam's form until his ear says they fit there too."""

from __future__ import annotations

# Reksio: the yard's instruments today (samples.yaml) and the era, said once and
# added to every wording, so the takes stay in one world and the wordings
# differ only in what the piece does. No names of the cartoon or its
# composer: the music is ours, inspired, not copied.
STYLE = (
    "Instrumental only. A small chamber ensemble from a 1970s Eastern European"
    " children's animated film: pizzicato strings, clarinet, bassoon, flute,"
    " harp, xylophone and glockenspiel. Warm vintage tape sound, gentle and"
    " light. No drums, no synthesizers, no modern pop production."
)

# What the takes Adam heard as too modern, complex or serious had: said as a
# composition plan's negative styles.
NEGATIVE = [
    "vocals",
    "modern production",
    "cinematic",
    "orchestral swell",
    "epic",
    "drums",
    "synthesizer",
    "reverb",
    "serious",
    "sentimental",
]

# Takes Adam kept (music-picks.json, 2026-10-13), to grow pieces from: the
# whole take (20 s) as the conditioning reference.
SEEDS = [
    {
        "from": "theme/10",
        "song": "WQ2JWkQMXwNSh8DD0zXJ",
        "ms": 20000,
    },  # Music v1, wording 2
    {
        "from": "theme/18",
        "song": "6xlOBu7Cmq8ZnCwdWo3D",
        "ms": 20000,
    },  # v2.5, wording 1
    {
        "from": "theme/16",
        "song": "IeTtc6YdlmOz5xIYPFKM",
        "ms": 20000,
    },  # v2.5, wording 2
]

# Adam's closing sentence: one wording of each piece has it, one hasn't.
SIMPLE = "Keep extremely simple, elegant, and humorous, like the songs used to be in the cartoons of that era."
ADAM_MODELS = ["music_v1", "music_v2_5"]  # the two that gave keeps from his wording


def adam(wording: str) -> list[str]:
    """A wording in Adam's form, with his closing sentence and without."""
    return [f"{wording} {SIMPLE}", wording]


PIECES: dict[str, dict] = {
    # Winter (Adam, 2026-10-27: each season its own themes): his form, the
    # middle changed for a snowy yard. Made while he slept, for his ear.
    "morning-winter": {
        "for": "A winter play: Reksio wakes in his doghouse and the yard is white with snow; the first thing the child hears.",
        "seconds": 12,
        "now": ["morning"],
        "style": False,
        "models": ADAM_MODELS,
        "takes": 2,
        "prompts": adam(
            "A short, gentle wake-up tune reminiscent of 1970s Eastern European children's cartoons, featuring a light, rising melody with a soft wintry sparkle and whimsical motifs suitable for a small dog waking in his doghouse to find the yard white with fresh snow, capturing the nostalgic and charming vibe of vintage animated shows from that era."
        ),
    },
    "phrase-winter": {
        "for": "A winter play: a short phrase now and then, while a boy and his dog build a snowman and throw snowballs.",
        "seconds": 15,
        "now": ["phrase"],
        "style": False,
        "models": ADAM_MODELS,
        "takes": 2,
        "prompts": adam(
            "A catchy, playful instrumental theme reminiscent of 1970s Eastern European children's cartoons, featuring lighthearted melodies and whimsical motifs suitable for a boy and his small dog building a snowman and playing in the snow in a winter yard, capturing the nostalgic and charming vibe of vintage animated shows from that era."
        ),
    },
    "lullaby-winter": {
        "for": "A winter play, at evening: snow on the doghouse roof, Reksio curling up inside as the picture closes.",
        "seconds": 15,
        "now": ["lullaby"],
        "style": False,
        "models": ADAM_MODELS,
        "takes": 2,
        "prompts": adam(
            "A short, slow, sleepy goodnight tune reminiscent of 1970s Eastern European children's cartoons, featuring a soft, simple melody and drowsy whimsical motifs suitable for a small dog curling up in his snowy doghouse on a quiet winter evening as snowflakes fall, slowing down and fading out, capturing the nostalgic and charming vibe of vintage animated shows from that era."
        ),
    },
    # Adam's two wordings from the ElevenLabs page (2026-10-13), where Music
    # v1 made "a nice tune" from each: sent as written, on each model, to
    # hear what the model changes.
    "theme": {
        "for": "The yard's own theme: what a day in it sounds like. Adam's wordings, as written, on each model.",
        "seconds": 20,
        "now": ["phrase"],
        "style": False,
        "models": ["music_v1", "music_v2", "music_v2_5"],
        "prompts": [
            "A catchy, playful instrumental theme reminiscent of 1970s Eastern European children's cartoons, featuring lighthearted melodies and whimsical motifs suitable for a character exploring a yard and interacting with animals in a humorous way, capturing the nostalgic and charming vibe of vintage animated shows from that era. Keep extremely simple, elegant, and humorous, like the songs used to be in the cartoons of that era.",
            "A catchy, playful instrumental theme reminiscent of 1970s Eastern European children's cartoons, featuring lighthearted melodies and whimsical motifs suitable for a character exploring a yard and interacting with animals in a humorous way, capturing the nostalgic and charming vibe of vintage animated shows from that era.",
        ],
    },
    # Round 3: Adam's wording as the recipe for each piece of the day, on the
    # two models that gave keeps (v1, v2.5), with and without his
    # "Keep extremely simple" sentence.
    "morning-adam": {
        "for": "As Reksio wakes in the doghouse and the sun comes up over the yard wall; the first thing the child hears. Adam's wording, made for the morning.",
        "seconds": 12,
        "now": ["morning"],
        "style": False,
        "models": ADAM_MODELS,
        "takes": 2,
        "prompts": adam(
            "A short, gentle wake-up tune reminiscent of 1970s Eastern European children's cartoons, featuring a light, rising melody and whimsical motifs suitable for a small dog yawning and stretching awake in his doghouse as the sun comes up over the yard, capturing the nostalgic and charming vibe of vintage animated shows from that era."
        ),
    },
    "phrase-adam": {
        "for": "A short phrase that comes now and then during the day, with quiet in between; a small dog sneaking up on a fly, sniffing a bee. Adam's wording, made shorter and cheekier.",
        "seconds": 15,
        "now": ["phrase"],
        "style": False,
        "models": ADAM_MODELS,
        "takes": 2,
        "prompts": adam(
            "A short, cheeky, tiptoeing instrumental tune reminiscent of 1970s Eastern European children's cartoons, featuring a lighthearted melody and whimsical motifs suitable for a small dog sneaking up on a fly in a yard and getting it comically wrong, capturing the nostalgic and charming vibe of vintage animated shows from that era."
        ),
    },
    "lullaby-adam": {
        "for": "At evening, after supper, as Reksio goes into his doghouse to sleep and the picture closes. Adam's wording, made for bedtime.",
        "seconds": 15,
        "now": ["lullaby"],
        "style": False,
        "models": ADAM_MODELS,
        "takes": 2,
        "prompts": adam(
            "A short, slow, sleepy goodnight tune reminiscent of 1970s Eastern European children's cartoons, featuring a soft, simple melody and drowsy whimsical motifs suitable for a small dog licking his chops after supper and curling up in his doghouse, slowing down and fading out, capturing the nostalgic and charming vibe of vintage animated shows from that era."
        ),
    },
    # Grown from the keeps: does conditioning give siblings in the same
    # spirit (low strength: freer; medium: closer)?
    "siblings": {
        "for": "Other tunes in the same spirit as a kept theme take, for the day's phrases. Grown from Adam's keeps (see each card's seed).",
        "seconds": 20,
        "now": ["phrase"],
        "seeds": SEEDS,
        "strengths": ["low", "medium"],
        "takes": 2,
        "prompts": [
            "a simple, catchy, playful tune for a 1970s Eastern European children's cartoon, humorous and light, a small dog exploring a yard",
        ],
    },
    "morning-seeded": {
        "for": "The morning tune, grown from a kept theme take, so the day sounds like one score.",
        "seconds": 12,
        "now": ["morning"],
        "seeds": SEEDS,
        "strengths": ["low"],
        "takes": 1,
        "prompts": [
            "a short, simple waking-up tune for a 1970s Eastern European children's cartoon, sunrise in a yard, calm and bright, slowly rising",
        ],
    },
    "lullaby-seeded": {
        "for": "The evening lullaby, grown from a kept theme take, so the day sounds like one score.",
        "seconds": 15,
        "now": ["lullaby"],
        "seeds": SEEDS,
        "strengths": ["low"],
        "takes": 1,
        "prompts": [
            "a short, slow, simple lullaby for a 1970s Eastern European children's cartoon, a small dog going to sleep in his doghouse, gentle and sleepy, fading out",
        ],
    },
    "morning": {
        "for": "As Reksio wakes in the doghouse and the sun comes up over the yard wall; the first thing the child hears.",
        "seconds": 12,
        "now": ["morning"],
        "prompts": [
            "A short morning tune, rising and waking up: a flute melody climbing over slow harp chords, sunny and calm, ending on a bright glockenspiel note.",
            "A small dog stretching and yawning awake at sunrise: a sleepy bassoon phrase that brightens into a cheerful clarinet answer, a light pizzicato tiptoe underneath.",
            "A gentle wake-up fanfare for a backyard morning, played softly: harp arpeggios, a flute and clarinet in thirds, a hopeful tune that opens out and comes to rest.",
        ],
    },
    "lullaby": {
        "for": "At evening, after supper, as Reksio goes into his doghouse to sleep and the picture closes.",
        "seconds": 15,
        "now": ["lullaby"],
        "prompts": [
            "A short, slow lullaby on harp: soft arpeggios, a simple tender melody slowing down, fading to sleep at the end.",
            "Bedtime for a small dog: a slow, drowsy clarinet melody over harp, a bassoon yawning low, slowing and fading out.",
            "A quiet music-box-like goodnight tune on glockenspiel and harp, slow, warm and sleepy, with a gentle final chord.",
        ],
    },
    "daytime": {
        "for": "A phrase that comes now and then during the day, with quiet in between (instead of today's loop); a dog playing in a sunny backyard.",
        "seconds": 20,
        "now": ["phrase"],
        "prompts": [
            "A bouncy, cheeky oom-pah tune for a small dog trotting around a backyard: pizzicato bass and off-beat chords, a playful clarinet melody, a xylophone answer.",
            "A light skipping tune for a sunny afternoon in a backyard: flute melody with little chromatic turns, pizzicato strings, a bassoon joining in with a wink.",
            "A tiptoeing, mischievous little tune, as if sneaking up on a fly: staccato bassoon and pizzicato, a clarinet that pounces, then a happy resolution.",
        ],
    },
    # Krtek's meadow (worlds/krtek/MUSIC_DIRECTION.md, from Adam's listening
    # on 2026-10-22): calm, flute and strings, birds; not Reksio's form,
    # whose "catchy, playful, whimsical" pulls towards cheeky. Music v1, as
    # it was best for the yard.
    "cricket": {
        "world": "krtek",
        "for": "The cricket fiddles at dusk by the molehill and the mole listens, then goes down to sleep: the meadow's lullaby. In the films, strings: simple, repeating, a little raw, notes wrong on purpose.",
        "part": "lullaby",
        "seconds": 15,
        "style": False,
        "models": ["music_v1"],
        "prompts": [
            "A simple, slow lullaby played on a single fiddle by a cricket in a meadow at night: a short rocking phrase that repeats, a little rough and slightly out of tune, homemade and charming, like a vintage 1970s Eastern European children's animated film. Solo violin only, quiet and sleepy.",
            "A lone fiddle at dusk in a summer meadow: a small, simple tune that repeats, played a bit scratchy and imperfect, with a few wrong notes, gentle and sleepy, from a vintage 1970s children's animated film.",
        ],
    },
    "meadow-theme": {
        "world": "krtek",
        "for": "The meadow's own theme, as it is in the morning; later grown into its other moods (curious, sad, happy). Calm, flute over strings, birdsong: a tune you could hum.",
        "part": "morning",
        "seconds": 20,
        "style": False,
        "models": ["music_v1"],
        "takes": 2,
        "prompts": [
            "A calm, beautiful instrumental theme for a sunny meadow morning in a 1970s Eastern European children's animated film: a gentle flute melody over soft strings, with birdsong, warm and positive, simple and tender, as a small creature comes out to greet the day.",
            "A gentle pastoral melody reminiscent of vintage 1970s children's animated films from Central Europe: flute and strings, perhaps a clarinet, birds chirping, calm, nature-loving and happy, a simple tune you could hum, like the start of a peaceful day in a flower meadow.",
        ],
    },
    # Round 2 (Adam, 2026-10-22: no cricket kept; "should be a bit
    # faster"). measure.py on the film's cricket (Buldozer 1:18-1:46): about
    # 4 notes a second, a pulse near 130, the line over two octaves, notes
    # wandering off pitch; round 1's were 1.3-3.5 a second, one octave, in
    # tune. His wording 1 form, made quicker and wider.
    "cricket-quick": {
        "world": "krtek",
        "for": "The cricket's fiddle at dusk, quicker than round 1: the film's cricket plays about 4 notes a second (measured), leaping about, a little out of tune.",
        "part": "lullaby",
        "seconds": 15,
        "style": False,
        "models": ["music_v1"],
        "prompts": [
            "A lively little tune played on a single fiddle by a cricket in a meadow at dusk: quick, rocking, about four short notes a second at around 130 beats per minute, leaping up and down across two octaves, a short phrase that repeats, a little rough and slightly out of tune, homemade and charming, like a vintage 1970s Eastern European children's animated film. Solo violin only.",
            "A cricket's fiddle tune at dusk, from a vintage 1970s Eastern European children's animated film: a single violin, nimble and bouncy, quick short notes jumping high and low, a simple phrase played over and over, scratchy and a little out of tune, gentle and charming. Solo violin only, no accompaniment.",
        ],
    },
    # The kept theme take (meadow-theme/01, wording 1) in the moods the
    # films give their theme: does conditioning, which copied the seed for
    # Reksio, give the same tune in another mood? Low and medium strength.
    "meadow-moods": {
        "world": "krtek",
        "for": "The kept meadow theme (meadow-theme/01) grown into its other moods. Listen for: the same tune you kept, but curious, sad or happy. A copy of it, or a different tune, are both no.",
        "parts": ["curious", "sad", "happy"],  # by wording
        "seconds": 20,
        "models": [
            "music_v2_5"
        ],  # v1 takes no composition plan (422), so no conditioning
        "seeds": [
            {"from": "meadow-theme/01", "song": "F6cJ73OJz2rTa7FCDdpe", "ms": 20000}
        ],
        "strengths": ["low", "medium"],
        "takes": 1,
        "prompts": [
            "the same gentle meadow theme, now curious and inquisitive: lighter, a little quicker, plucked strings and a questioning flute, as a small creature finds something new",
            "the same gentle meadow theme, now sad and tender: slower, in a minor key, a lonely flute over soft strings, as a small creature finds a friend in trouble, never frightening",
            "the same gentle meadow theme, now joyful and triumphant: fuller and brighter, strings and flute together, as everything turns out well in the end",
        ],
    },
}
