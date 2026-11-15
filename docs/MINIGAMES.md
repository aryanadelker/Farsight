# Repair minigames

All numbers and readings in the puzzles are invented game values, not NASA data.

## How it works
- `src/minigames/manager.js`: one shared panel (title, objective, puzzle, status line, progress bar, success banner, close). Only one panel can be open. It owns every timer and animation callback a puzzle registers and clears them on close. Success is recorded once, and only when the puzzle is actually solved.
- `src/minigames/*.js`: one file per puzzle. Each exports `mount(body, api, task)`.
- `src/tasks.js`: what E does on each piece of equipment. It shows a "prerequisites" panel when a task is not available yet, opens the puzzle otherwise, and calls the normal repair in `state.js` on success.
- `data/tasks_data.js`: which puzzle repairs which system, where it is, what it needs first, and the tuning values.
- `state.js` and `outpost_data.js` are unchanged; the action-point, spare-part and objective rules all still apply.

## Puzzles
| Puzzle | Repairs | Where | Needs first |
|---|---|---|---|
| Emergency Generator Startup | starts the backup generator (one time, 1 action, +10 power) | Power Lab, Battery Bank rack | 1 action |
| Power Distribution | Power Distribution | Power Lab | generator started |
| Battery Bank Recharge (generator puzzle) | Battery Bank | Power Lab | generator started |
| Ventilation Repair | Greenhouse | Greenhouse | Power Distribution working |
| Oxygen Scrubber Calibration | Oxygen Generator | Life Support | Power Distribution working |
| Water Filtration | Water Recycler | Life Support | Power Distribution working |
| Coolant Circulation | Cooling System | Life Support | Power Distribution working |
| Radiation Shield Field Balance (scrubber puzzle) | Radiation Shield | Hub | Power Distribution working |
| Satellite Dish Repair | Antenna | at the dish outside (inspect from the Comms Bay) | objective "Air, water, food safe 3 days" + Power Distribution working |
| Transmitter RF Chain (power puzzle) | Signal & Transmitter | Comms Bay | antenna repaired + Power Distribution working |
| Communications Restoration | final call (station, then Earth) | Comms Bay, Radio Terminal | every earlier objective, radio on, power reserve at least 40, antenna and transmitter working |

A system that is Failed needs two repairs (Failed → Degraded → Working), so its puzzle is played twice with a new layout. The antenna's second repair uses a different gear train (5 gears in a deeper chain) from the first (4 gears).
