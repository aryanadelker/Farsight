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
| Airlock | Two EVA suits, suit service, sliding exterior door | Quest airlock |
| Comms Bay | Antenna, Signal & Transmitter, Radio Terminal, live link display | Communications racks |
| Cupola | Panoramic windows, skylight, robot-arm style desk, view of dish and Earth | Cupola |

## Outside
- Terrain: flat build site, craters, rocks and pebbles, ridge line, stars, Earth, low Sun with long shadows (south-pole style).
- Hardware: solar farm (5 arrays turned to the Sun), battery cabinets, water/oxygen/hydrogen tanks, regolith processing plant, crew lander on a pad, pressurized rover, robot arm, antenna dish, lamp posts, beacons, cable runs, tyre tracks.
- Regolith berms cover the module sides and the hub and crew roofs (radiation shielding idea).

## Game state shown in the world
- Antenna dish droops and turns until the antenna is repaired. Its beacon is red, amber, then green.
- Console screens: blue = not inspected, green = working, yellow = degraded, red = failed (sparks).
- Lights dim with the power meter; red emergency beacons flash in a solar storm or at very low power.
- Plants shrink and turn brown as food falls. Water tank level follows the water meter. Battery LEDs follow power.
- Minimap (M): blue dots = systems, orange squares = spare-part crates.
