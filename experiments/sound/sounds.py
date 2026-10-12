"""The sounds the board asks candidates for: each of the game's effects
(sound.js), what it is for, how long, and wordings for a model."""

from __future__ import annotations

# Each of the game's effects (sound.js) with what it is for, and wordings
# for the model: cartoon-like, gentle (small ears), short.
SOUNDS: dict[str, dict] = {
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
