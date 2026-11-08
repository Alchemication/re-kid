"""The sounds the board asks candidates for: each of the game's effects
(sound.js), what it is for, how long, and wordings for a model."""

from __future__ import annotations

# Each of the game's effects (sound.js) with what it is for, and wordings
# for the model: cartoon-like, gentle (small ears), short.
SOUNDS: dict[str, dict] = {
    # Krtek's meadow (2026-10-31): the far church bell, synth now and "crazy
    # bad" (Adam). Rung every 1.1 s, two strokes on the hour, six at sunset
    # (church.js): a take rings longer than that, so the meadow plays them
    # over each other (`overlaps`). Soft and far: calm first.
    "krtek-bell": {
        "world": "krtek",
        "id": "bell",  # Sound.bell in the meadow's sound.js
        "for": "One stroke of the village church bell far off on the hill (church.js): twice each hour, six times at sunset. Called every 1.1 s.",
        # takes 01-12 asked for a large, deep bronze bell's toll with a long
        # hum: all serious, almost ominous (Adam, 2026-10-31). Light, small,
        # short instead: a pleasant ding that is there and gently gone.
        "seconds": 2,
        "prompts": [
            "a small sweet chapel bell ringing once far away, light and bright, gently fading",
            "one soft high ding of a little bell in a distant village tower, cheerful and gentle, quickly fading into the breeze",
            "a light friendly ding of a small bell heard faintly across a sunny meadow, soft and short",
        ],
    },
    # Krtek's meadow (2026-10-31): the fox sneaking up on a nest (paint.js).
    # A comic baddie, never scary: calm first.
    "krtek-snicker": {
        "world": "krtek",
        "id": "snicker",
        "for": "The fox tiptoeing towards the birds' nest, rubbing his paws: a sly snicker, once or twice as he sneaks.",
        "seconds": 1.5,
        "prompts": [
            "a sly cartoon fox snickering to himself, a soft sneaky heh-heh-heh through his teeth, mischievous, dry studio recording",
            "a sneaky little villain chuckle from a 1970s Eastern European children's cartoon, a fox rubbing his paws, quiet and comic",
            "a mischievous low snigger, hehehe, a crafty animal pleased with his plan, short and playful, not scary",
        ],
    },
    # The fox looming over the nest, then sent running (2026-11-01: Adam
    # wants him a bit scary at first, then small and scared): a little
    # spooky is fine, but comic.
    "krtek-growl": {
        "world": "krtek",
        "id": "growl",
        "for": "The fox rears up over the birds' nest, teeth bared: one low menacing growl, a cartoon baddie's.",
        "seconds": 1.5,
        "prompts": [
            "a cartoon fox growling low through bared teeth, a short menacing grrr, comic villain, dry studio recording",
            "a sly fox's low rumbling growl, a little spooky but playful, from a 1970s Eastern European children's cartoon",
            "a crafty animal growling softly as it creeps closer, one short throaty grrr, theatrical, not too loud",
        ],
    },
    # The bulldozer (2026-11-01, after Krtek a buldozer): big, rolling in
    # at the meadow, then nose-diving into the mole's pit (poles.js).
    "krtek-rumble": {
        "world": "krtek",
        "id": "rumble",
        "for": "A big old bulldozer rolling in and lurching on, engine chugging: played 1-4 s, faded out early when called for less.",
        "seconds": 4.5,
        "prompts": [
            "a big old diesel bulldozer rolling slowly closer, engine chugging and clanking tracks, steady, close up",
            "a heavy cartoon bulldozer chugging along, puffing and rattling, from a 1970s Eastern European children's cartoon, comic not menacing",
            "an old crawler tractor engine putt-putt-putting as it creeps forward, metal tracks squeaking, warm and low",
        ],
    },
    "krtek-clunk": {
        "world": "krtek",
        "id": "clunk",
        "for": "The bulldozer tips nose-first into the mole's pit and gets stuck: one big comic clunk and a thump of earth.",
        "seconds": 1.5,
        "prompts": [
            "a heavy machine tipping nose-first into a hole, a big hollow metal clunk and a soft thump of earth",
            "a cartoon bulldozer falling into a pit, one comic clonk and crunch, from a 1970s Eastern European children's cartoon",
            "a big tractor dropping its front into a ditch, a dull bonk of metal and a puff of dirt, funny, not harsh",
        ],
    },
    "krtek-bonk": {
        "world": "krtek",
        "id": "bonk",
        "for": "An acorn drops out of the old oak onto the little mole's head: one small light bonk, funny, never painful.",
        "seconds": 0.6,
        "prompts": [
            "a small acorn dropping onto a head, one light hollow wooden tok, comic and soft",
            "an acorn falling onto a wooden table, a single small knock, close up",
            "a knuckle tapping once on a small hollow wooden box, light and bright",
        ],
    },
    "krtek-yelp": {
        "world": "krtek",
        "id": "yelp",
        "for": "The fox, frightened by the painted monster: a startled yelp as he jumps, then runs off.",
        "seconds": 1.2,
        "prompts": [
            "a startled cartoon fox yelping in fright, a high squeaky yip, comic",
            "a frightened fox's short yelp and whimper as it turns to run, from a 1970s Eastern European children's cartoon",
            "a scared little yip-yip of a fox jumping with fright, funny, not painful",
        ],
    },
    # The far wildlife (2026-11-01, wildlife.js, flock.js, heron.js): all far
    # off, so every sound soft and distant, never in the foreground.
    "krtek-chirp": {
        "world": "krtek",
        "id": "chirp",
        "for": "A finch in the far trees, now and then: one short soft chirp or two, far off across a meadow.",
        "seconds": 1.0,
        "prompts": [
            "a small finch chirping once or twice, distant, soft, across a quiet summer meadow, no other birds",
            "a bullfinch's soft piping call, far away in the trees, gentle, a single short phrase",
            "one little songbird's quiet tweet from a far tree line, calm countryside, very soft",
        ],
    },
    "krtek-heron": {
        "world": "krtek",
        "id": "heron",
        "for": "The grey heron at the far pond, taking off: one hoarse croak, far away.",
        "seconds": 1.2,
        "prompts": [
            "a grey heron's single hoarse croak as it takes off, distant, across a meadow",
            "a heron calling once, a harsh low frank, far away over a pond, calm",
            "a large wading bird's rough croak in the distance, one call, soft",
        ],
    },
    "krtek-grunt": {
        "world": "krtek",
        "id": "grunt",
        "for": "The wild boar far off, rooting, or tapped: a short soft grunt; the piglets a tiny squeak.",
        "seconds": 1.0,
        "prompts": [
            "a wild boar's short low grunt while rooting, distant, soft, in a meadow",
            "a mother wild boar grunting gently and her piglets squeaking, far away, short",
            "a pig-like snuffle and grunt from far across a field, calm, one short sound",
        ],
    },
    "krtek-snort": {
        "world": "krtek",
        "id": "snort",
        "for": "The żubr far off, tapped: he looks back and blows one slow, deep snort, unbothered.",
        "seconds": 1.4,
        "prompts": [
            "a bison's slow deep snort, distant, calm, one breath out through the nose",
            "a large cow-like animal blowing a long low snort far away in a meadow, unbothered",
            "a European bison's soft low grunt and snort in the distance, single, peaceful",
        ],
    },
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
    # The meadow's stand-ins Adam judged bad on made_in_code.html (2026-11-07).
    "krtek-boo": {
        "world": "krtek",
        "id": "boo",
        "for": "Three little meadow friends stacked into a pretend monster shout one deep playful 'booo!' at a fox: funny, not scary.",
        "seconds": 1.2,
        "prompts": [
            "three small animals together shouting a deep pretend-scary 'booo!', playful children's game, comic, not frightening",
            "a group of little cartoon animals making a big silly monster 'boooo' together, warm and funny",
            "small voices trying to sound big and scary, a low wobbly 'booo', giggly underneath, from a 1970s Eastern European children's cartoon",
        ],
    },
    "krtek-hoot": {
        "world": "krtek",
        "id": "hoot",
        "for": "An owl in an old oak at dusk, now and then between the cricket's tunes: its soft call, calm and far-carrying.",
        "seconds": 2.5,
        "prompts": [
            "a tawny owl hooting softly at dusk, hooo... hu-hoooo, calm summer evening in the woods",
            "one owl calling gently from an old tree at nightfall, two soft hoots, peaceful",
            "a soft round owl hoot in a quiet meadow at dusk, distant, warm",
        ],
    },
    "krtek-hoot-sleepy": {
        "world": "krtek",
        "id": "hootSleepy",
        "for": "The owl asleep in its hole in the oak, woken by the little mole's call: one drowsy, puzzled 'hoo?', rising.",
        "seconds": 1.0,
        "prompts": [
            "a sleepy owl woken up, one short low drowsy hoo, rising like a question, close and soft",
            "a drowsy little owl's single puzzled hoot, quiet, yawning",
            "one soft sleepy questioning owl hoo, close up, gentle",
        ],
    },
    "krtek-cluck": {
        "world": "krtek",
        "id": "cluck",
        "for": "The hen: a few soft contented clucks (looking through the fence, over the egg, in the rain).",
        "seconds": 1.2,
        "prompts": [
            "a hen clucking softly, bok bok bok, close up, calm farmyard",
            "a single hen's gentle contented clucks, three short ones, quiet",
            "a curious hen clucking quietly as she looks around, close",
        ],
    },
    "krtek-croak": {
        "world": "krtek",
        "id": "croak",
        "for": "A frog on a lily pad in a little pool: a low ribbit, twice, just before it plops into the water.",
        "seconds": 1.0,
        "prompts": [
            "a frog croaking twice by a small pond, a low ribbit ribbit, close up, quiet summer day",
            "one green frog's two short throaty croaks, close, calm",
            "a small pond frog calling twice, deep and round, close up",
        ],
    },
    "krtek-sneeze": {
        "world": "krtek",
        "id": "sneeze",
        "for": "A little mouse sniffs a big egg and sneezes: a tiny 'atchoo!', funny.",
        "seconds": 0.8,
        "prompts": [
            "a tiny mouse sneezing, a small squeaky atchoo",
            "a very small animal's quick little sneeze, high and cute",
            "a little mouse sniffing then sneezing once, tiny and funny",
        ],
    },
    "krtek-splash": {
        "world": "krtek",
        "id": "splash",
        "for": "The little mole paddles in the spring's pool, or water splashes up in his face: a small splash.",
        "seconds": 0.7,
        "prompts": [
            "a small splash of a hand slapping shallow water in a pond, close up",
            "a little paddle in a clear pool, one soft splash",
            "small feet stepping into shallow water, a light splash, close",
        ],
    },
    "krtek-whoosh": {
        "world": "krtek",
        "id": "whoosh",
        "for": "Something light thrown or blown through the air (a pole tossed away, a cloud pushed along): a soft whoosh.",
        "seconds": 0.6,
        "prompts": [
            "a thin wooden stick thrown through the air, a short soft whoosh",
            "a quick light swoosh of something tossed away, close",
            "a soft airy whoosh passing by, short",
        ],
    },
    "krtek-swish": {
        "world": "krtek",
        "id": "swish",
        "for": "A wide paintbrush swished once across fur or wood: a soft bristly swish (three in a row as friends paint each other).",
        "seconds": 0.5,
        "prompts": [
            "a wide paintbrush swished once across a wooden board, a soft bristly swish, close up",
            "one quick stroke of a wet paintbrush on canvas",
            "a soft brush sweep, short and bristly",
        ],
    },
    "krtek-tug": {
        "world": "krtek",
        "id": "tug",
        "for": "A wooden pole stuck in the ground, tugged at: wood creaking and straining, short.",
        "seconds": 0.8,
        "prompts": [
            "a wooden post creaking as someone tugs at it stuck in the earth, a short strained creak",
            "wood straining and creaking under a pull, one short creak",
            "a stake being wiggled loose in soil, creak and scrape, close",
        ],
    },
    "krtek-water": {
        "world": "krtek",
        "id": "water",
        "for": "A little rain cloud raining on the flowers, or rain over the whole meadow in a storm (played quieter): light rain patter, looped as long as it rains.",
        "seconds": 3.0,
        "prompts": [
            "light gentle rain pattering on leaves and flowers in a garden, steady, close",
            "a soft summer shower falling on a meadow, even patter, no thunder",
            "water sprinkling from a watering can onto flower beds, steady",
        ],
    },
    "krtek-knock": {
        "world": "krtek",
        "id": "knock",
        "for": "The little mole knocks twice on something to see what it is (an egg, a toy car, a wooden pole): knock knock.",
        "seconds": 0.6,
        "prompts": [
            "two light knocks with a knuckle on a small hollow wooden box, knock knock, close up",
            "a small fist knocking twice on a hollow toy, curious",
            "knock knock on an eggshell, two light hollow taps",
        ],
    },
    "krtek-tock": {
        "world": "krtek",
        "id": "tock",
        "for": "A twig drawn along a wooden paling fence: one paling's single short wooden tok (the game plays it up a scale, one per paling).",
        "seconds": 0.3,
        "prompts": [
            "a stick hitting one wooden picket of a fence, a single short dry wooden tok, close up",
            "one tap of a twig on a wooden slat, short and hollow",
            "a single wooden tok, like a woodblock, short and soft",
        ],
    },
    "krtek-plink": {
        "world": "krtek",
        "id": "plink",
        "for": "Something small set down or caught (a paint tin set on the grass, an acorn caught and tucked in a hollow, a pole planted): a light, soft wooden tok.",
        "seconds": 0.4,
        "prompts": [
            "a small wooden object set down on a wooden shelf, a light hollow tok",
            "an acorn dropped into a small wooden bowl, one light knock",
            "a little tin can set down on soft ground, a small dull clunk",
        ],
    },
    # Krtek's meadow in autumn (2026-11-08, built while Adam was away): the woodpecker in the chestnut
    # (woodpecker.js) and the hedgehog's winter bed (hedgehog.js). Calm first: nothing loud.
    "krtek-drum": {
        "world": "krtek",
        "id": "drum",
        "for": "The woodpecker drums a roll on the chestnut's trunk, now and then by day, and in answer to the mole's knocks: a quick dry rattle, about a second.",
        "seconds": 1.0,
        "prompts": [
            "a woodpecker drumming a fast roll on a tree trunk, close, in a quiet autumn wood",
            "a great spotted woodpecker hammering a quick burst on dry wood, one short roll",
            "a quick wooden rattle of a beak on hollow bark, rapid taps fading",
        ],
    },
    "krtek-peck": {
        "world": "krtek",
        "id": "peck",
        "for": "One slow knock of the woodpecker's beak on the trunk, knocking back to the mole: knock, knock (each a call of its own, 0.4 s apart).",
        "seconds": 0.4,
        "prompts": [
            "a single knock of a bird's beak on a tree trunk, one dry wooden tok",
            "one tap of a woodpecker's beak on bark, close up",
            "a knuckle knocking once on a hollow log, short",
        ],
    },
    "krtek-snuffle": {
        "world": "krtek",
        "id": "snuffle",
        "for": "The hedgehog snuffling at the fallen leaves, and going into his heap to sleep: quick little sniffs and a snort, cute, about a second.",
        "seconds": 1.2,
        "prompts": [
            "a hedgehog snuffling and sniffing through dry autumn leaves, close up, cute little snorts",
            "a small hedgehog sniffing busily, quick soft snuffles through its nose",
            "a tiny animal snuffling in a pile of leaves, little huffs and a soft snort",
        ],
    },
    "krtek-honk": {
        "world": "krtek",
        "id": "honk",
        "for": "Geese going south high over the meadow in autumn: one honk, far off, soft (three come as they cross, 6 s apart).",
        "seconds": 1.0,
        "prompts": [
            "wild geese honking far away high in the sky, one or two soft honks, distant, calm autumn day",
            "a flock of geese flying overhead in the distance, faint honking",
            "a single goose honk heard far off across fields, soft and distant",
        ],
    },
    # Reksio's yard (2026-11-08): the sounds made in code Adam judged bad,
    # "not great" or "so so" on made_in_code.html (his notes in each "for").
    "cluck": {
        "for": "The hen about the yard, clucking to herself as she pecks (hen.js). 'very bad' as made in code.",
        "seconds": 0.8,
        "prompts": [
            "a hen clucking softly to herself in a farmyard, two or three quiet clucks, close up",
            "a contented chicken going buk-buk-buk while pecking at grain",
            "a farmyard hen's low murmuring cluck, short and calm",
        ],
    },
    "cackle": {
        "for": "The hen has just laid an egg in the nest: her proud loud 'ko-DAK' (hen.js).",
        "seconds": 1.5,
        "prompts": [
            "a hen cackling proudly after laying an egg, buk-buk-buk-ba-GAWK, farmyard, close up",
            "a chicken's loud triumphant cackle, ba-KAWK, once, in a barnyard",
            "a proud hen announcing her egg, a few quick clucks rising into one loud squawk",
        ],
    },
    "rattle": {
        "for": "The wooden garden gate shaken on its latch (things.js), and the old metal water pipe rattling after his hard knock (tap.js). 'bad' as made in code.",
        "seconds": 0.7,
        "prompts": [
            "an old wooden garden gate rattling on its loose metal latch, a short shake",
            "a loose old metal drainpipe rattling against a wall after a knock, short",
            "a rickety wooden gate jiggled on its hinges, a brief clattery rattle",
        ],
    },
    "shake": {
        "for": "A small dog shaking himself all over, ears flapping: off the rain, off what fell on his head (yard.js, things.js, tap.js, tree.js). 'bad' as made in code.",
        "seconds": 1.0,
        "prompts": [
            "a small wet dog shaking himself dry, ears and collar flapping, water flicking off, close up",
            "a little dog giving a quick vigorous full-body shake, floppy ears flapping",
            "a puppy shaking water out of its fur, a short flappy shake",
        ],
    },
    "creak": {
        "for": "The old garden tap's handle turned on (tap.js). Was 'squeak', shared with the film's little footprints; 'bad' as made in code.",
        "seconds": 0.5,
        "prompts": [
            "a stiff old metal garden tap handle being turned, a short rusty squeak",
            "an old outdoor water faucet valve turning with a little metallic squeal",
            "a rusty iron tap wheel turned a quarter round, one short creak",
        ],
    },
    "squeak": {
        "for": "The little Reksio footprints on the film strip popping up one after another, a squeak each, every 0.22 s (film.js). 'bad' as made in code.",
        "seconds": 0.3,
        "prompts": [
            "a tiny rubber squeak toy squeezed once, short and cute",
            "one small high squeak of a rubber duck pressed quickly",
            "a short playful squeak, like a little balloon rubbed once",
        ],
    },
    "squeaks": {
        "for": "The little footprints squeak back together after his stamping: a double squeak sliding up ('thump, thump … double squeak', Adam's mark on the film; film.js). 'bad' as made in code.",
        "seconds": 0.6,
        "prompts": [
            "two quick rubber squeak toy squeezes, the second a little higher, cute and playful",
            "a double squeak of a small rubber toy, squee-squee, rising",
            "two tiny squeaky honks one after the other, like a little rubber duck answering",
        ],
    },
    "rain": {
        "for": "The summer shower over the yard: steady soft rain, looped for as long as it rains, faded out as it clears (weather.js). 'not great' as made in code.",
        "seconds": 5.0,
        "prompts": [
            "gentle steady summer rain falling on a garden lawn and leaves, soft even patter, no thunder",
            "light rain pattering on a wooden fence and a doghouse roof, calm and steady",
            "a soft rain shower in a quiet countryside yard, even hiss and patter, no wind",
        ],
    },
    "tok": {
        "for": "A hazelnut landing, a bird pecking, the cuckoo clock's little door (bird.js, cuckoo.js): a little wooden tock. 'not great' as made in code.",
        "seconds": 0.3,
        "prompts": [
            "a hazelnut dropping onto a wooden plank, one small hollow tock",
            "a bird's beak tapping once on wood, a light dry tok",
            "a small wooden bead knocked on a wooden table, one short click",
        ],
    },
    "trap": {
        "for": "A mouse trap snapping shut on nothing as the mouse gets away: a sharp snap and a twangy spring (mouse.js). 'not great' as made in code.",
        "seconds": 0.8,
        "prompts": [
            "a wooden mouse trap snapping shut, a sharp snap with a twangy spring wobble",
            "a spring-loaded mousetrap going off on a wooden floor, snap and boing",
            "a small metal spring trap clacking shut, followed by a short springy twang",
        ],
    },
    "schlup": {
        "for": "The snail pulling into its shell when he sniffs it: a soft wet 'schlup' (creatures.js). 'so so' as made in code.",
        "seconds": 0.5,
        "prompts": [
            "a soft wet little slurp of something slipping into a shell, schlup, close up",
            "a small squelchy suction pop, gentle and wet",
            "a tiny wet slip, like a finger pulled out of jelly, quiet",
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


def _voice(what: str, said: str, sound: str, id: str = "") -> dict:
    """One of the mole's sounds (`id`: its name in the meadow's sound.js):
    Adam's wording, then two variants."""
    return {
        "world": "krtek",
        **({"id": id} if id else {}),
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
        "a sad or resigned sigh", "ach jo!", 'a sad little "ach jo"', "achJo"
    ),
    "krtek-ahoj": _voice(
        "hello, the word Adam remembers most",
        "ahoj!",
        'the word "ahoj!", a cheerful hello',
        "ahoj",
    ),
    "krtek-hele": _voice(
        "look, he has found something", "hele!", 'the word "hele!"', "hele"
    ),
    "krtek-je": _voice("delight", "jé!", 'the word "jé!", delighted', "je"),
    "krtek-ooh": _voice(
        "discovery", "óóó!", 'an excited little "ooh!" of discovery', "ooh"
    ),
    "krtek-giggle": {
        **_voice("a happy giggle", "hihihi!", "a short happy giggle", "giggle"),
        # many kinds of giggle (Adam, 2026-10-31): each its own wording
        "prompts": [
            *_voice("", "hihihi!", "a short happy giggle")["prompts"],
            _MOLE + "The sound is a tiny shy giggle through closed lips.",
            _MOLE
            + "The sound is a bubbly delighted little laugh, two or three high hee-hees.",
            _MOLE + "The sound is a ticklish squealing giggle, quick and bright.",
            _MOLE
            + "The sound is a soft chuckle at something funny, short and breathy.",
        ],
    },
    "krtek-fright": _voice("a fright", "jéje!", "a tiny squeak of fright", "fright"),
    # Adam, 2026-10-31: "tam!" as he points at something; gasps; little
    # questioning sounds
    "krtek-tam": {
        **_voice(
            "pointing: there!", "tam!", 'the word "tam!", pointing eagerly: there!'
        ),
        "id": "tam",
    },
    "krtek-gasp": {
        **_voice("a little gasp", "ach!", "a tiny sharp gasp of surprise"),
        "id": "gasp",
        "seconds": 0.8,
        "prompts": [
            _MOLE
            + "The sound is a tiny sharp gasp of surprise, a quick intake of breath.",
            _MOLE
            + 'The sound is a soft delighted gasp of wonder, a breathy little "ah!".',
            "A little girl gasps once, a short surprised intake of breath, as a cartoon animal would: breathy, dry studio recording, no reverb.",
        ],
    },
    "krtek-hm": {
        **_voice("a little question", "hm?", "a curious questioning hm"),
        "id": "hm",
        "prompts": [
            _MOLE
            + 'The sound is a short curious questioning "hm?", rising at the end.',
            _ADAM + 'The word is "co?", asked, curious and puzzled.',
            'A little girl asks a puzzled "hmm?" as a cartoon animal would: short, rising, breathy, dry studio recording, no reverb.',
        ],
    },
    # 2026-11-01: all red from the paint, he plays a ghost at the fox
    # (paint.js): a child's pretend-spooky "uuuu", more funny than frightening.
    "krtek-ghost": {
        **_voice("playing a ghost", "uuuu!", "a pretend-spooky ghost wail"),
        "id": "ghost",
        "seconds": 1.8,
        "prompts": [
            _MOLE
            + 'The sound is a long wobbly pretend-ghost "uuuuu!", a child playing at being spooky.',
            'A little girl pretending to be a ghost, a wavering "woooo-ooo!" with her arms up, playful and funny, dry studio recording, no reverb.',
            'A small cartoon creature trying to sound scary, a squeaky wobbling "boooo!", more cute than frightening, short, dry studio recording.',
        ],
    },
}
