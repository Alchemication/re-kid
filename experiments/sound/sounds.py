"""The sounds the board asks candidates for: each of the game's effects
(sound.js), what it is for, how long, and wordings for a model."""

from __future__ import annotations

# Each of the game's effects (sound.js) with what it is for, and wordings
# for the model: cartoon-like, gentle (small ears), short.
SOUNDS: dict[str, dict] = {
    # winter (2026-10-27): the snowman's encounters and the ice
    "pat": {
        "for": "Snow patted in mittened hands: the boy packing a snowball, or a snowman's head (snowplay.js, snowman.js). Called every 0.2-0.26 s, four or five times running.",
        "seconds": 0.5,
        "prompts": [
            "fresh snow pressed and patted between two gloved hands, one soft crunchy pat",
            "packing a snowball with wool mittens, a single muffled crunch",
            "a handful of powdery snow squeezed once, soft and close",
        ],
    },
    "whoosh": {
        "for": "A snowball thrown, lobbed over the snowman to Reksio, or flat into its head.",
        "seconds": 0.6,
        "prompts": [
            "a snowball thrown past, a short soft whoosh of air",
            "a small ball tossed through the air, a gentle swish",
            "a quick light whoosh of something thrown underarm",
        ],
    },
    "poof": {
        "for": "A snowball bursting on Reksio's nose as he snaps at it, or on the snowman's head.",
        "seconds": 0.6,
        "prompts": [
            "a snowball hitting something and bursting into powder, a soft crunchy poof",
            "a ball of loose snow breaking apart on impact, a muffled splat",
            "a handful of snow thrown against a wall, a soft puff and crumble",
        ],
    },
    "thud": {
        "for": "The snowman's head knocked off, landing in the snow and breaking into lumps.",
        "seconds": 0.8,
        "prompts": [
            "a heavy ball of snow falling into deep snow and breaking apart, a muffled thump and crumble",
            "a big snowball dropped onto snowy ground, a dull soft thud",
            "a lump of packed snow hitting the ground and crumbling, close",
        ],
    },
    "pluck": {
        "for": "A sparrow tugging the snowman's carrot nose out: it comes out of the packed snow with a pop.",
        "seconds": 0.5,
        "prompts": [
            "a carrot pulled out of packed snow, a short squeaky pop",
            "a cork pulled gently out of a bottle, a small soft pop",
            "a stick pulled out of firm snow, a quick crunchy pop",
        ],
    },
    "bump": {
        "for": "Slipping on the ice and landing on your bottom: Reksio or the boy (ice.js).",
        "seconds": 0.6,
        "prompts": [
            "someone sitting down hard on snowy ice, a soft bump with a crunch of snow",
            "a child plopping onto a snowy ground, a muffled bump",
            "a small body landing on packed snow, a dull soft thump",
        ],
    },
    "clonk": {
        "for": "Reksio knocks on the dry tap's metal pipe with his paw (tap.js); a third knock harder.",
        "seconds": 0.6,
        "prompts": [
            "knocking once on an old metal water pipe with a knuckle, a hollow clonk",
            "a single knock on a hollow iron pipe on a wall, a dull metallic bong",
            "a paw thumping a garden tap's metal pipe, a short hollow clank",
        ],
    },
    "gurgle": {
        "for": "Water and air gurgling down the tap's pipe after his knock, about a second (tap.js).",
        "seconds": 1.2,
        "prompts": [
            "water gurgling and glugging down an old metal pipe, air bubbles, close up",
            "an old water pipe gurgling as the water comes back, a bubbly rumble",
            "a gurgle running down a drainpipe, glug glug, short",
        ],
    },
    "burp": {
        "for": "A burp of air out of the tap's spout, just before the water gushes (tap.js).",
        "seconds": 0.6,
        "prompts": [
            "an old tap spitting out a burp of air, a short sputter and pop",
            "air sputtering out of a water tap, a short wet splutter",
            "a garden tap coughing out air before the water comes, a quick blurp",
        ],
    },
    "huff": {
        "for": "Reksio huffs warm breath on the icicle on the tap, in winter (tap.js).",
        "seconds": 1.0,
        "prompts": [
            "a small dog breathing out a long warm huff, close up",
            "a puppy blowing a slow breath out through its mouth, a soft haaah",
            "a long breathy exhale, warming cold hands, soft and close",
        ],
    },
    "boing": {
        "for": "His tail stretched like elastic snaps him back (the bramble).",
        "seconds": 1.2,
        "prompts": [
            "a cartoon boing, a springy twang of a stretched rubber band snapping back",
            "comic spring boing sound effect, bouncy and playful, children's cartoon",
            "a short wobbly jaw harp twang, cartoon slapstick",
            # round 2: plain and physical ("cartoon" wordings got no keeps)
            "a door spring stopper flicked, a wobbling metal twang that fades",
            "a jaw harp plucked once, a quick springy twang",
            "a slack rubber band plucked, a low wobbly twang",
        ],
    },
    "cuckoo": {
        "for": "The cuckoo clock on the house wall: one call each hour, eight slow ones at bedtime, and Reksio barking back at it (cuckoo.js). Called every 0.65 s at most.",
        "seconds": 0.8,
        "prompts": [
            "a cuckoo clock calling once, two soft wooden whistle notes, ku-ku, close up",
            "an old wooden cuckoo clock striking, a single cuckoo call from its little bellows pipes",
            "a gentle cuckoo call from a Black Forest cuckoo clock, two falling notes, warm and soft",
        ],
    },
    "splash": {
        "for": "Paws landing in a puddle.",
        "seconds": 1.0,
        "prompts": [
            "a small dog jumps into a shallow puddle, a light playful splash",
            "cartoon splash of paws in a rain puddle, short",
            "a gentle splash in shallow water, close up",
        ],
    },
    "bonk": {
        "for": "An apple falls on his head.",
        "seconds": 0.8,
        "prompts": [
            "a cartoon bonk, an apple bouncing off a head, comic and soft",
            "a hollow wooden bonk sound effect, children's cartoon",
            "a light fruit dropping on a head, a short funny thud",
            # round 2: plain and physical
            "an apple dropped onto a wooden table, a single knock",
            "a coconut knocked once with knuckles, a hollow knock",
            "a small ball bouncing once off a wooden floor",
        ],
    },
    "rustle": {
        "for": "Leaves of a bush or tree shaken.",
        "seconds": 1.2,
        "prompts": [
            "leaves of a bush rustling as something brushes through it",
            "a short rustle of a shaken leafy branch",
            "dry leaves and twigs rustling, close, brief",
        ],
    },
    "buzz": {
        "for": "A bumblebee humming by (the bee in the yard).",
        "seconds": 2.0,
        "prompts": [
            "a fat bumblebee buzzing past, low and lazy",
            "a cartoon bumblebee humming, friendly and soft",
            "a bumblebee hovering by a flower, gentle buzz",
        ],
    },
    # His voice, silent in the game now: every synth version sounded awful
    # (sound.js HIS_VOICE). A small dog, worded plainly.
    "yawn": {
        "for": "Waking up, and sleepy at dusk. Silent in the game now.",
        "seconds": 2.0,
        "prompts": [
            "a small dog yawning, a long squeaky yawn",
            "a puppy yawns widely and smacks its lips",
            "a sleepy little dog's yawn with a soft whine at the end",
        ],
    },
    "snore": {
        "for": "Asleep in his doghouse. Silent in the game now.",
        "seconds": 2.5,
        "prompts": [
            "a small dog snoring softly, one slow breath in and out",
            "a sleeping puppy snoring gently",
            "a little dog asleep, a soft wheezy snore",
        ],
    },
    "sneeze": {
        "for": "Sniffing the flowers. Silent in the game now.",
        "seconds": 1.0,
        "prompts": [
            "a small dog sneezes once",
            "a puppy's quick little sneeze",
            "a dog sniffs a flower and sneezes",
        ],
    },
    "munch": {
        "for": "Eating a berry or his food. Silent in the game now.",
        "seconds": 1.2,
        "prompts": [
            "a small dog chewing a treat, crunchy munching",
            "a dog munching food, a few quick chews",
            "a puppy chewing a berry, wet little chews",
        ],
    },
    "lap": {
        "for": "Lapping from his bowl. Silent in the game now.",
        "seconds": 1.5,
        "prompts": [
            "a small dog lapping water from a bowl",
            "a dog drinking, quick wet laps of the tongue",
            "a puppy lapping food from a metal bowl",
        ],
    },
    "sniff": {
        "for": "Sniffing about, nose to the ground. Silent in the game now.",
        "seconds": 1.0,
        "prompts": [
            "a small dog sniffing the ground, quick short sniffs",
            "a dog's nose sniffing close up, several sniffs",
            "a curious puppy sniffing around",
        ],
    },
    "bark": {
        "for": 'His "hau hau" (a tap on him, at the bird, back at the cuckoo): two quick barks in one take. Where the original barks (barks.js) are missing, instead of the synth. Tried 2026-10-14: Adam kept none ("all crap once we know original sound"), so the originals ship.',
        "seconds": 0.9,
        "prompts": [
            "a small dog barks twice, two short friendly barks, close up",
            "a little terrier puppy gives two quick high yappy barks",
            "a small dog's two sharp barks in a row, woof woof, cheerful",
        ],
    },
    "yelp": {
        "for": "Startled (the tap's spray, a fright). Silent in the game now.",
        "seconds": 0.8,
        "prompts": [
            "a small dog's short surprised yelp",
            "a puppy yelps once, startled",
            "a little dog's quick high yip of surprise",
        ],
    },
    "howl": {
        "for": "Howling at the sky in the evening. Silent in the game now.",
        "seconds": 2.5,
        "prompts": [
            "a small dog howling at the moon, a short howl",
            "a puppy's little howl, rising and falling",
            "a small dog's soft mournful howl",
        ],
    },
}

# Krtek's voice (worlds/krtek), to judge against the films by ear before
# choosing it over the original exclamations. Made only when named
# (generate_eleven.py krtek-ach-jo ...), never by a run of every sound.
# The first wording of each is Adam's, which he found "almost there".
_MOLE = (
    "Imagine a 1970s Eastern European cartoon animal character who almost never "
    "speaks, only makes short excited noises and the odd simple Czech word. We "
    "imitate him with a little girl's voice: delighted, short, rising, breathy, a "
    "dry studio recording. "
)
_ADAM = (
    "Imagine a 70's eastern european cartoon animal character. He speaks only "
    "simple short words in czechoslovakian language. We try to imitate it by a "
    "little girl's delighted, short, rising, breathy, dry studio recording. "
)


def _voice(what: str, said: str, sound: str) -> dict:
    """One of the mole's sounds: Adam's wording, then two variants."""
    return {
        "world": "krtek",
        "for": f"Krtek's voice: {what}.",
        "seconds": 1.2,
        "prompts": [
            _ADAM + f'The word is "{said}".',
            _MOLE + f"The sound is {sound}.",
            (
                f'A little girl says "{said}" as a cartoon animal would: short, '
                "breathy, dry studio recording, no reverb."
            ),
        ],
    }


VOICES: dict[str, dict] = {
    "krtek-ach-jo": _voice(
        "a sad or resigned sigh", "ach jo!", 'a sad little "ach jo"'
    ),
    "krtek-ahoj": _voice(
        "hello, the word Adam remembers most",
        "ahoj!",
        'the word "ahoj!", a cheerful hello',
    ),
    "krtek-hele": _voice("look, he has found something", "hele!", 'the word "hele!"'),
    "krtek-je": _voice("delight", "jé!", 'the word "jé!", delighted'),
    "krtek-ooh": _voice("discovery", "óóó!", 'an excited little "ooh!" of discovery'),
    "krtek-giggle": _voice("a happy giggle", "hihihi!", "a short happy giggle"),
    "krtek-fright": _voice("a fright", "jéje!", "a tiny squeak of fright"),
}
