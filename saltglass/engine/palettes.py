"""Color scripts for SALTGLASS. Each palette drives sky stops, land/silhouette
tones, accent light, and ambience. Picked per shot from scene palette text."""

PALETTES = {
    'cold_open': {  # desaturated sepia-slate legend look
        'sky': [(0.0, '#1b1a22'), (0.45, '#3a3440'), (0.75, '#6a5a52'), (1.0, '#8a7462')],
        'far': '#2e2833', 'near': '#17141d', 'ink': '#0b0a10',
        'accent': '#e8c087', 'ambient': '#8a7462',
        'ground_top': '#57493f', 'ground_bot': '#2b2126',
        'star_density': 0.0, 'grain': 0.030,
    },
    'dusk_amber': {  # act 1 village warmth
        'sky': [(0.0, '#2b2340'), (0.35, '#5a3a58'), (0.62, '#b05a4a'), (0.82, '#e8915a'), (1.0, '#ffc27a')],
        'far': '#3a2b44', 'near': '#241a30', 'ink': '#120c1c',
        'accent': '#ffb45e', 'ambient': '#e8915a',
        'ground_top': '#8a6a58', 'ground_bot': '#3a2a30',
        'star_density': 0.00006, 'grain': 0.022,
    },
    'blue_hour': {  # just after sundown
        'sky': [(0.0, '#0e1430'), (0.4, '#1c2a52'), (0.7, '#35507e'), (1.0, '#5a7a9e')],
        'far': '#1a2440', 'near': '#101830', 'ink': '#080c1a',
        'accent': '#ffd98a', 'ambient': '#35507e',
        'ground_top': '#2c3850', 'ground_bot': '#121a2c',
        'star_density': 0.00025, 'grain': 0.024,
    },
    'night_ink': {  # deep night, moon
        'sky': [(0.0, '#04060e'), (0.45, '#0a0f22'), (0.8, '#141c38'), (1.0, '#1e2846')],
        'far': '#0c1226', 'near': '#070b18', 'ink': '#03040a',
        'accent': '#ffd98a', 'ambient': '#22304e',
        'ground_top': '#1c2438', 'ground_bot': '#0a101e',
        'star_density': 0.0008, 'grain': 0.030,
    },
    'storm_slate': {  # the storm night
        'sky': [(0.0, '#070a12'), (0.4, '#131a28'), (0.75, '#25303e'), (1.0, '#39434e')],
        'far': '#101722', 'near': '#0a0e18', 'ink': '#04060c',
        'accent': '#cfe3ff', 'ambient': '#25303e',
        'ground_top': '#2c3542', 'ground_bot': '#10151e',
        'star_density': 0.0, 'grain': 0.036,
    },
    'dead_dark': {  # the six minutes: near-black, saltglass blue
        'sky': [(0.0, '#010207'), (0.5, '#03040c'), (1.0, '#060a16')],
        'far': '#04060e', 'near': '#020409', 'ink': '#010204',
        'accent': '#7fe8ff', 'ambient': '#0a1220',
        'ground_top': '#0a0f1a', 'ground_bot': '#030509',
        'star_density': 0.0, 'grain': 0.045,
    },
    'undertow_deep': {  # creature shots: abyssal blue-green
        'sky': [(0.0, '#02040a'), (0.5, '#051020'), (0.85, '#0a2030'), (1.0, '#0e2a3a')],
        'far': '#051220', 'near': '#030a14', 'ink': '#010306',
        'accent': '#7fe8ff', 'ambient': '#0a2030',
        'ground_top': '#0c1c28', 'ground_bot': '#04080e',
        'star_density': 0.0001, 'grain': 0.04,
    },
    'lamp_warm': {  # interiors by lamplight
        'sky': [(0.0, '#171018'), (0.5, '#241722'), (1.0, '#38222a')],
        'far': '#241722', 'near': '#171018', 'ink': '#0c0810',
        'accent': '#ffca7a', 'ambient': '#7a4a34',
        'ground_top': '#3a2a2a', 'ground_bot': '#1c1216',
        'star_density': 0.0, 'grain': 0.02,
    },
    'dawn_rose': {  # aftermath dawn
        'sky': [(0.0, '#2a3050'), (0.35, '#5a5578'), (0.6, '#b07a86'), (0.82, '#e8a88a'), (1.0, '#ffd9a8')],
        'far': '#3c3a5c', 'near': '#282344', 'ink': '#141026',
        'accent': '#ffd9a8', 'ambient': '#e8a88a',
        'ground_top': '#8a7078', 'ground_bot': '#3a2e40',
        'star_density': 0.00004, 'grain': 0.02,
    },
    'title': {
        'sky': [(0.0, '#04060e'), (0.6, '#0a1424'), (1.0, '#12233a')],
        'far': '#0a1220', 'near': '#060b16', 'ink': '#020409',
        'accent': '#7fe8ff', 'ambient': '#12233a',
        'ground_top': '#1a2436', 'ground_bot': '#0a0f18',
        'star_density': 0.0006, 'grain': 0.026,
    },
}

_KEYS = [
    (('cold open', 'legend', 'sepia', 'myth', 'prologue'), 'cold_open'),
    (('storm', 'rain', 'slate', 'squall', 'gale'), 'storm_slate'),
    (('dead dark', 'pitch', 'black', 'darkness', 'void', 'lightless'), 'dead_dark'),
    (('undertow', 'abyss', 'deep', 'leviathan'), 'undertow_deep'),
    (('dawn', 'rose', 'sunrise', 'morning'), 'dawn_rose'),
    (('dusk', 'amber', 'sunset', 'gold', 'evening'), 'dusk_amber'),
    (('blue hour', 'twilight', 'indigo'), 'blue_hour'),
    (('lamp', 'interior', 'cottage', 'candle', 'hearth', 'warm'), 'lamp_warm'),
    (('night', 'ink', 'moon', 'starlit'), 'night_ink'),
]


def pick(text, default='night_ink'):
    """Choose a palette from free-text description."""
    t = (text or '').lower()
    for keys, name in _KEYS:
        if any(k in t for k in keys):
            return PALETTES[name]
    return PALETTES[default]


def by_name(name):
    return PALETTES.get(name, PALETTES['night_ink'])
