// Registers every minigame with the manager.
import { register } from './manager.js';
import * as power from './power.js';
import * as generator from './generator.js';
import * as ventilation from './ventilation.js';
import * as scrubber from './scrubber.js';
import * as water from './water.js';
import * as coolant from './coolant.js';
import * as dish from './dish.js';
import * as comms from './comms.js';
for (const [id, m] of Object.entries({ power, generator, ventilation, scrubber, water, coolant, dish, comms })) register(id, m);
