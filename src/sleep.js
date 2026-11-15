// Ending the day = sleeping in a Crew Quarters sleep station. A short fade shows the new day starting.
import { S, endDay, bus } from './state.js';
import * as P from './player.js';
let busy = false;
export const active = () => busy;
export function sleep() {
  if (busy || S.over) return;
  busy = true; P.setBusy(true);
  const el = document.getElementById('sleepfx');
  el.innerHTML = `<div class="sf-d">Day ${S.day}</div><div class="sf-s">The crew sleeps. The base keeps running overnight…</div>`;
  el.className = 'in';
  setTimeout(() => {                                  // screen is black: run the night
    endDay();
    if (!S.over) { el.querySelector('.sf-d').textContent = `Day ${S.day}`; el.querySelector('.sf-s').textContent = `Good morning. ${S.ap} action points.`; el.classList.add('new'); }
  }, 750);
  setTimeout(() => { el.className = 'out'; P.setBusy(false); busy = false; }, 2000);
  setTimeout(() => { if (!busy) el.className = ''; }, 2600);
}
export const hint = () => bus.say('To end the day, sleep in a Crew Quarters sleep station (north wing, past the Power Lab).');
