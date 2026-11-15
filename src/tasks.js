// Task progression: decides what pressing E on a piece of equipment does.
// Inspect (1 action) -> repair = play the minigame -> on success the normal repair in state.js runs (actions + part spent).
// Dependencies live in data/tasks_data.js (needs) and data/outpost_data.js (locks and objectives); nothing is hard-coded per game.
import { S, bus, interact, check } from './state.js';
import { SYSTEMS, OBJECTIVES, GAME } from '../data/outpost_data.js';
import { TASKS, GENERATOR } from '../data/tasks_data.js';
import * as MG from './minigames/manager.js';
import './minigames/index.js';
import * as SL from './sleep.js';

const NAMES = ['Working', 'Degraded', 'Failed'];
const need = n => n === 'generator' ? { label: 'Emergency generator started (Battery Bank rack, Power Lab)', ok: !!S.flags.generator } : { label: `${SYSTEMS[n].name} working`, ok: S.sys[n].st === 0 };
function repairReasons(k) {
  const d = SYSTEMS[k], r = [];
  if (d.lock) r.push({ label: `Objective: ${OBJECTIVES[d.lock].label}`, ok: !!S.done[d.lock] });
  (TASKS[k].needs || []).forEach(n => r.push(need(n)));
  if (S.sys[k].seen) { r.push({ label: '1 spare part (orange crates)', ok: S.parts >= 1 }); r.push({ label: '2 action points (sleep in Crew Quarters for a new day)', ok: S.ap >= 2 }); }
  return r;
}
function commsReasons() {
  const r = ['power', 'reserve', 'habitat', 'antInspect', 'antenna', 'signal'].map(id => ({ label: OBJECTIVES[id].label, ok: !!S.done[id] }));
  r.push({ label: 'Radio switched on (Q at the Radio Terminal)', ok: S.sys.comms.on });
  if (S.done.commsPower) {
    r.push({ label: `Power reserve at least ${GAME.commsPowerMin}`, ok: S.m.power >= GAME.commsPowerMin });
    r.push({ label: 'Antenna dish working', ok: S.sys.antenna.st === 0 }, { label: 'Signal & Transmitter working', ok: S.sys.signal.st === 0 });
    r.push({ label: `${S.flags.station ? 1 : 2} action point(s) for the call`, ok: S.ap >= (S.flags.station ? 1 : 2) });
  }
  return r;
}
export function available(k) { if (k === 'comms') return commsReasons(); if (k === 'battery' && !S.flags.generator) return [{ label: '1 action point', ok: S.ap >= 1 }]; return repairReasons(k); }

export function hover(k, src) {
  if (k === 'sleep') return S.ap ? `E: sleep and end the day (${S.ap} action point${S.ap > 1 ? 's' : ''} left)` : 'E: sleep · start a new day';
  const d = SYSTEMS[k], s = S.sys[k], q = d.load ? ' · Q: power on/off' : '';
  if (k === 'comms') { const miss = commsReasons().filter(x => !x.ok); return (miss.length ? `🔒 Radio · next: ${miss[0].label}` : 'E: restore communications') + ' · Q: radio power'; }
  if (k === 'battery' && !S.flags.generator) return 'E: start the emergency generator (1 action)';
  if (d.lock && !S.done[d.lock]) return `🔒 ${d.name} · E: see what is needed`;
  if (!s.seen) return 'E: inspect (1 action)' + q;
  if (!s.st) return `${d.name} works` + q;
  if (TASKS[k].outside && src !== 'dish') return `${d.name}: ${NAMES[s.st]} · repair it at the dish outside (Airlock, then south)`;
  const miss = repairReasons(k).filter(x => !x.ok);
  return (miss.length ? `🔒 Repair needs: ${miss[0].label}` : `E: repair · ${TASKS[k].title}`) + q;
}

export function activate(k, src) {
  if (MG.isOpen() || S.over) return;
  if (k === 'sleep') return SL.sleep();
  if (k === 'comms') return comms();
  if (k === 'battery' && !S.flags.generator) return generator();
  const d = SYSTEMS[k], s = S.sys[k], t = { ...TASKS[k], id: k };
  if (k === 'antenna' && s.st === 1) Object.assign(t, { variant: 'fine', title: 'Satellite Dish Repair · fine alignment', objective: 'Second stage: a deeper gear train. A gear only turns when every clutch between it and the drive is engaged. Bring all four marks to their notches, then lock every clutch.' });
  if (d.lock && !S.done[d.lock]) return MG.openLocked(t, repairReasons(k));
  if (!s.seen || !s.st) return interact(k);                       // inspect, or "is working"
  if (t.outside && src !== 'dish') return bus.say(`Go outside to the dish to repair it (through the Airlock, then south past the Cupola).`);
  const r = repairReasons(k); if (r.some(x => !x.ok)) return MG.openLocked(t, r);
  MG.open(t, { onSuccess: () => { const before = s.st; interact(k); const after = S.sys[k].st;
    return after < before ? `${d.name}: ${NAMES[before]} → ${NAMES[after]}.` + (after ? ' One more repair is needed to make it fully work.' : '') : ''; } });
}

function generator() {
  const t = TASKS.generator;
  if (S.ap < 1) return MG.openLocked(t, available('battery'));
  MG.open(t, { onSuccess: () => { if (S.flags.generator) return ''; S.ap -= t.cost; S.flags.generator = true; S.m.power = Math.min(GAME.maxPower, S.m.power + GENERATOR.powerBoost);
    S.hist.push({ day: S.day, sys: 'battery', text: 'Emergency generator started' }); check(); bus.event({ title: '⚡ Emergency generator online', text: '' });
    return `Power reserve +${GENERATOR.powerBoost}. Power Distribution can now be repaired.`; } });
}

function comms() {
  const r = commsReasons(), t = TASKS.comms;
  if (!S.done.commsPower && S.done.signal && S.done.reserve && !S.sys.comms.on) return bus.say('Switch the radio on first (Q at the Radio Terminal).');
  if (r.some(x => !x.ok)) return MG.openLocked(t, r, 'Communications is the final task. Restore the supporting systems first. ✕ = still to do.');
  MG.open(t, {
    onMilestone: n => { if (n === 'station' && !S.flags.station) interact('comms'); },
    onSuccess: () => { if (!S.flags.station) interact('comms'); if (!S.flags.earth) interact('comms'); return ''; }
  });
}
