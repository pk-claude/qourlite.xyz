# Kaiju Rampage (prototype)

Browser game: pick a monster and a real city, then destroy it.
Open `kaiju/index.html` through any static web server (the data files are fetched).

## How it works
- `data/<city>.json`: real building footprints and heights for a 1.5 km x 1.5 km square,
  baked from Overture Maps (includes OpenStreetMap). Rebuild or add a city with
  `tools/bake_city.py` (needs `pyarrow` and `shapely`), e.g.
  `python tools/bake_city.py london "London" 51.5074 -0.1278 750`, then add it to `CITIES` in `js/main.js`.
- `js/city.js`: buildings split into tiles; spherical damage removes floor bands; a support check
  (connected parts + weak-neck test) detaches unsupported tops as rigid bodies that tilt,
  crush the floors below them and damage what they land on.
- `js/fx.js`: debris chunks (settle into permanent rubble), dust and fire particles.
- `js/monster.js`: two placeholder monsters built from primitives. To be replaced by models
  from the ComfyUI pipeline.

Data attribution: Overture Maps Foundation, OpenStreetMap contributors (ODbL).
