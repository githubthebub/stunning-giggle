"""Smoke-test: render representative stills from the hardest templates."""
import os
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

import numpy as np
from PIL import Image

from saltglass.engine import templates as T
from saltglass.engine import palettes as PAL
from saltglass.engine.util import to_u8

OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp/stills'
os.makedirs(OUT, exist_ok=True)

CASES = [
    ('01_dusk_lighthouse', 'lighthouse_ext',
     'The Hollow Light on its cliff at dusk, lit, towering, yuma stands small at its base facing right', 'dusk_amber'),
    ('02_dry_sea', 'dry_sea_vista',
     'vast dry seabed with whale bones and a distant wreck, moon, mist over the flats, yuma walks with glowing jar', 'blue_hour'),
    ('03_undertow', 'undertow',
     'two huge undertow shapes swim through the darkness toward the cliff, lighthouse far on the right, close', 'undertow_deep'),
    ('04_storm', 'storm',
     'storm over the village and lighthouse, rain, lightning, village windows dim', 'storm_slate'),
    ('05_eye', 'close_eye',
     'yuma single eye wide with the flame light reflected, saltglass blue glow', 'dead_dark'),
    ('06_cottage', 'cottage_int',
     'ilsa lying on the bed, yuma stands by her, jar on the shelf glowing faintly', 'lamp_warm'),
    ('07_hands_match', 'close_hands',
     'hands cupped around a lit match, trembling, flame catches', 'dead_dark'),
    ('08_village_dusk', 'cliff_village',
     'village roofs at dusk, smoke, lighthouse lit at the cliff edge', 'dusk_amber'),
    ('09_lamp_room', 'lamp_room_int',
     'the huge lens fills the room, lit, storm outside the windows, matchbox on table, yuma at left', 'lamp_warm'),
    ('10_two_shot', 'two_shot_silhouette',
     'yuma and ilsa sit on the gallery rail at night, moon', 'night_ink'),
    ('11_deepwalker', 'char_silhouette',
     'deepwalker big at dawn, bells catching light, facing left', 'dawn_rose'),
    ('12_title', 'title_card', 'title', 'title'),
]

for name, tpl, desc, palname in CASES:
    t0 = time.time()
    pal = PAL.by_name(palname)
    img, spec = T.build(tpl, desc, pal, seed=hash(name) % 100000)
    small = Image.fromarray(to_u8(img)).resize((1280, 720), Image.LANCZOS)
    small.save(os.path.join(OUT, f'{name}.png'))
    print(f'{name}: {time.time() - t0:.1f}s, {len(spec)} anim layers')

print('done')
