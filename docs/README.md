> SI generated: written with Claude (an AI assistant) for the Farsight team. See SI_DISCLOSURE.md.

# Farsight (first-person, Three.js + cannon-es)

## Run it
- Open a terminal in this folder and run `npx serve .` (or `python3 -m http.server 8000`), then open the link.
- ES modules need a web server. Do not double-click `index.html`.
- No internet needed: Three.js and cannon-es are in `/vendor`.

## Controls
- WASD move · mouse look · Space jump · Shift run
- E inspect / repair / take · Q power on/off · hold click carry · right click throw
- N end day · M map · G faster graphics (use on slow computers) · H sources
- Walk through the Airlock (east) to go outside.

## Where things live
- `data/outpost_data.js`: all game numbers, events, objectives (unchanged). Edit numbers only here.
- `src/state.js`: game rules (unchanged).
- `src/world.js`: renderer, physics, per-frame update (dish droop, console colours, crates).
- `src/env.js`: moon terrain, sky, Earth, Sun, surface hardware (solar farm, lander, rover, tanks, ISRU plant, robot arm, dish).
- `src/base.js`: the station: hub + 8 modules, racks, consoles, crew, sliding doors (physics), live screens.
- `src/assets.js`: shared materials and reusable builders. `src/textures.js`: all textures drawn in code (no image files).
- `src/player.js`, `src/ui.js`: first-person controls, HUD, minimap, visor.
- `docs/ASSETS.md`: asset list and what each module is based on.

## Known limits
- Layout, sizes and colours are invented design values. Only the numbers in `outpost_data.js` REAL_DATA are sourced.
- Needs WebGL. Sun shadows are the heaviest part: press G if the frame rate is low.

## Repair minigames
- E on a damaged system first inspects it (1 action). E again opens its repair panel. Solving the puzzle runs the normal repair (2 actions + 1 spare part). Closing early costs nothing.
- Esc or CLOSE leaves a panel. While a panel is open you cannot walk, jump or grab.
- See `docs/MINIGAMES.md` for every puzzle, where it is, and what it needs first.

## Title screen and cinematics
- The game opens on a title screen: Start mission, How to play, Settings (graphics, opening video on/off), Credits.
- Start mission plays the opening video (skip with Esc, Space, Enter or the Skip button), then the briefing.
- Winning plays the ending video, then the end credits, then the results. Losing goes straight to the results.
- Videos: `assets/video/intro.mp4`, `ending.mp4`, `credits.mp4`. Title background: `assets/title_bg.jpg`. Code: `src/screens.js`, `css/screens.css`.
- Credits: created by Aryan Adelker, Chelsea Vaz and Christopher D'souza.
- The videos were drawn by the scripts in `tools/cinematics` (no logos, no outside images).
- Videos need the game to run from a web server (Live Server or `npx serve .`), the same as the rest of the game.

## Performance
- The game draws at the window's real resolution, uses 4 shared room lights that follow the player, simpler shadows redrawn every 2nd frame, and fewer surface rocks. G (or Settings > Graphics) lowers quality further.

## Information cards, sleeping and sources
- Click a machine (or a sleep station) to open an information card: what it does in the game, its current state, the real-world (ISS) link and source links, with a picture of the machine. ✕ or Esc closes it. Text lives in `data/info_cards.js`.
- The day ends when you sleep in a Crew Quarters sleep station (E). A short fade shows the new day. N no longer ends the day; it reminds you where the beds are (z on the map).
- When action points reach 0, the counter turns red with a reminder to go and sleep.
- Title screen > Sources (and H in the game): how each meter is worked out, the real data with links, how the base follows the ISS, and what is made up. Built from the data file in `src/sourcesInfo.js`, so it stays in step with the numbers.
- The antenna is repaired twice: the first repair uses a 4-gear coarse layout, the second a different 5-gear fine-alignment layout.

## SI disclosure
This prototype is SI generated (made with Claude, an AI assistant, for the Farsight team). Videos and the title art have a visible "SI GENERATED" watermark and an SI note in their metadata; every code and data file begins with an SI notice; `index.html` has `generator` and `si-disclosure` meta tags. Full list: `SI_DISCLOSURE.md` and `si-disclosure.json`.
<<<<<<< HEAD

## Movement and the first-task guide
- Inside the base the player walks at 5 m/s and runs (Shift) at 8 m/s. Outside, in the spacesuit, it stays 3.5 / 6 m/s.
- At the start a guide leads to the first task, the power bus: start the emergency generator (Battery Bank rack), inspect the Power Distribution rack, then repair it. A gold marker floats over the right machine and an arrow at the top of the screen shows the way (through the hub doorways) and the distance. It disappears once the power bus is fixed. Code: `src/guide.js`.
=======
>>>>>>> 445e0dfdf11e5370fc223b99f3bdfb2e30fe9922
