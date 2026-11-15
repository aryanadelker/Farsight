# Farsight: base layout and assets

Sizes and layout are invented (not NASA data). Module roles are inspired by the ISS.
Note: the NASA "ISS Virtual Tour" page is a Unity 3D app. Its text could not be read here, so the modules follow general, well-known ISS module roles. Check them against the tour before the submission text says "based on".

## Layout (top view, north is up)
```
                 [Crew Quarters]
                 [Power Lab    ]
 [Cargo][Greenhouse][  HUB  ][Life Support][Airlock] -> surface
                 [Comms Bay    ]
                 [Cupola       ]
```
Each module has a 4.8 m wide, 3.4 m high walkway with equipment racks on both sides, ceiling ducts and cables, light panels, a hatch ring and a short connecting tunnel (like an ISS berthing port).

| Module | Game systems inside | ISS idea it borrows |
|---|---|---|
| Hub (command node) | Radiation Shield console (storm shelter), live status wall, command table | Node modules (Harmony, Unity) |
| Power Lab | Power Distribution, Battery Bank | Destiny lab racks |
| Crew Quarters | 4 sleep stations, galley, hygiene booth, treadmill | Crew quarters, galley, exercise gear |
| Greenhouse | Greenhouse console, 9 grow racks with ~160 plants that wilt when food is low | Plant growth experiments in the science labs |
| Cargo Bay | Spare parts (orange crates spawn here and elsewhere), bags, gas bottles | Cargo and storage modules |
| Life Support | Oxygen Generator, Water Recycler, Cooling, live water tanks | Environmental control and life support racks |
| Airlock | Two EVA suits, suit service, sliding exterior door, apron pad outside | Quest airlock |
| Comms Bay | Antenna, Signal & Transmitter, Radio Terminal, live link display | Communications racks |
| Cupola | Panoramic windows, skylight, robot-arm style desk, view of dish and Earth | Cupola |

## Outside
- Terrain: flat build site, craters, rocks and pebbles, ridge line, stars, Earth, low Sun with long shadows (south-pole style).
- Hardware: solar farm (5 arrays turned to the Sun), battery cabinets, water/oxygen/hydrogen tanks, regolith processing plant, crew lander on a pad, pressurized rover, robot arm, antenna dish, lamp posts, beacons, cable runs, tyre tracks.
- Hull: clean roofs (no stones). Panelled hull with bump texture, lit portholes, name plaques, roof antennas, radiator-free for now.
- Doors: every hatch has two sliding leaves with real physics bodies. They open when you are within about 3 m; the airlock outer door opens from 3.6 m.
- Collision: walls are thicker than they look (grow away from the room), the outside of every module, the hub drum, rocks bigger than 0.8 m, lander, rover, tanks, solar masts, ISRU, dish and lamp posts are solid. Physics runs at 120 steps per second.
- Roof collision follows the visible hull: each module has one body whose curved roof, shoulders, tunnel tops and end caps use the same circle as the hull mesh (`src/collide.js` builds these convex shapes). The hub dome is one convex body whose bottom face is the hub ceiling. The cupola roof (including the skylight glass), its gold awning and the airlock canopy are solid.
- Antenna dish: static base, mast and mount; the reflector shell, rear hub and feed are one moving body that follows the dish every frame (droop/twist). The reflector is a thin low-detail mesh collider, so the inside of the bowl stays open.
- The hub drum mesh is trimmed where it would sit inside a wing, so it no longer appears as a wall inside the first room of each wing.
- Crew: four jointed crew members (hub table, hub status wall, greenhouse, comms seat) plus two EVA suits in the airlock. Built in `makeCrew` / `animateCrew` in `src/assets.js`.

## Game state shown in the world
- Antenna dish droops and turns until the antenna is repaired. Its beacon is red, amber, then green.
- Console screens: blue = not inspected, green = working, yellow = degraded, red = failed (sparks).
- Lights dim with the power meter; red emergency beacons flash in a solar storm or at very low power.
- Plants shrink and turn brown as food falls. Water tank level follows the water meter. Battery LEDs follow power.
- Minimap (M): blue dots = systems, orange squares = spare-part crates.
