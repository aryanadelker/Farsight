/* SI generated: written with Claude (an AI assistant) for the Farsight team. See SI_DISCLOSURE.md. */
// MINIGAME 2: Emergency Generator Startup (also Battery Bank Recharge).
// A real checklist with timing: master, both reactant valves, heat the stack into its band, crank, then close the bus tie in sync.
import { h, s, C, clamp, bandBar } from './kit.js';

const STEPS = ['Battery master ON', 'Reactant valves H2 + O2 OPEN', 'Stack heater: hold until temp is in the green band', 'START: hold until voltage is stable', 'BUS TIE: close when the sync needle is centred'];
export function mount(body, api, task) {
  const recharge = task.variant === 'recharge';
  const st = { step: 0, master: false, h2: false, o2: false, heat: false, crank: false, temp: 22, volt: 0, phase: 0, trip: 0, out: 0, lock: 0, started: false };
  const row = h('div', { class: 'mg-row' }, body);
  // checklist
  const list = h('div', { class: 'mg-card', style: 'flex:1 1 240px' }, row); h('div', { class: 'mg-k', text: 'START-UP CHECKLIST' }, list);
  const items = STEPS.map((t, i) => { const r = h('div', { style: 'display:flex;gap:9px;align-items:center;margin:7px 0;font-size:13px' }, list); const l = h('span', { class: 'mg-lamp' }, r); h('span', { text: `${i + 1}. ${t}` }, r); return l; });
  // controls
  const ctr = h('div', { class: 'mg-card', style: 'flex:1 1 300px' }, row); h('div', { class: 'mg-k', text: 'GENERATOR CONTROL' }, ctr);
  const sws = h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' }, ctr);
  const sw = (key, label) => { const e = h('div', { class: 'mg-sw', role: 'button' }, sws); h('div', { class: 'lev' }, e); h('div', { class: 'lbl', text: label }, e); e.addEventListener('click', () => toggle(key, e)); return e; };
  const swEl = { master: sw('master', 'BATT MASTER'), h2: sw('h2', 'H2 VALVE'), o2: sw('o2', 'O2 VALVE') };
  const btns = h('div', { style: 'display:flex;gap:8px;margin-top:4px;flex-wrap:wrap' }, ctr);
  const hold = (label, key) => { const b = h('button', { class: 'mg-btn', type: 'button', text: label }, btns);
    const down = e => { e.preventDefault(); press(key, true); }, up = () => press(key, false);
    b.addEventListener('pointerdown', down); b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up); return b; };
  const heatB = hold('HOLD: STACK HEATER', 'heat'), startB = hold('HOLD: START', 'crank');
  const tieB = h('button', { class: 'mg-btn warn', type: 'button', text: 'CLOSE BUS TIE' }, btns); tieB.addEventListener('click', tie);
  // gauges
  const gs = h('div', { class: 'mg-card', style: 'flex:1 1 230px' }, row); h('div', { class: 'mg-k', text: 'INSTRUMENTS' }, gs);
  const gT = bandBar(gs, 'Stack temperature', '°C'), gV = bandBar(gs, 'Stack voltage', 'V'), gO = bandBar(gs, recharge ? 'Battery charge current' : 'Output to bus', '%');
  h('div', { class: 'mg-read-l', text: 'Bus sync (phase difference)', style: 'margin-top:8px' }, gs);
  const sv = s('svg', { viewBox: '0 0 200 70', class: 'mg-svg', style: 'max-height:90px' }, gs);
  s('path', { d: 'M20 62 A80 80 0 0 1 180 62', fill: 'none', stroke: C.line, 'stroke-width': 8 }, sv);
  s('path', { d: arc(100, 62, 80, -9, 9), fill: 'none', stroke: C.ok, 'stroke-width': 8 }, sv);
  const needle = s('line', { x1: 100, y1: 62, x2: 100, y2: 8, stroke: C.text, 'stroke-width': 2.5 }, sv);
  const TBAND = [60, 75], VNOM = 28;
  function fault(msg, lamp = st.step) { api.status('FAULT: ' + msg, 'bad'); items[Math.min(lamp, 4)].className = 'mg-lamp bad'; st.trip = 1.2; }
  function toggle(key, el) {
    if (!api.live()) return;
    if (key === 'master') { if (st.master) return fault('Battery master cannot be switched off during start-up.'); st.master = true; }
    else { if (!st.master) return fault('Switch the battery master ON first. Valve actuators have no power.', 0); st[key] = !st[key]; if (st.step > 1 && !st[key]) { st[key] = true; return fault('Closing a reactant valve now would starve the stack.'); } }
    el.classList.toggle('on', st[key]); advance();
  }
  function press(key, on) {
    if (!api.live()) { st[key] = false; return; }
    if (on && key === 'heat' && st.step !== 2) return fault(st.step < 2 ? 'Heater interlock: open both reactant valves first.' : 'Stack already at temperature.', st.step);
    if (on && key === 'crank' && st.step !== 3) return fault(st.step < 3 ? 'START inhibited: stack too cold or valves closed.' : 'Generator already running.', st.step);
    if (on && key === 'heat' && st.lock > 0) return fault('Heater tripped on over-temperature. Wait for it to cool.');
    if (!on && key === 'heat' && st.heat && st.step === 2) { if (st.temp >= TBAND[0] && st.temp <= TBAND[1]) { st.step = 3; api.status('Stack at temperature. Hold START.', 'info'); } else if (st.temp < TBAND[0]) api.status('Stack still too cold. Keep heating.', 'warn'); }
    if (!on && key === 'crank' && st.crank && st.step === 3 && st.volt < VNOM - 1) { fault('START released too early. Voltage collapsed, try again.'); st.volt = 0; }
    st[key] = on;
  }
  function tie() {
    if (!api.live()) return;
    if (st.step !== 4) return fault(st.step < 4 ? 'Bus tie inhibited: generator not running.' : 'Bus tie already closed.', st.step);
    if (Math.abs(st.phase) > .15) return fault('Out of phase. Breaker tripped. Close it when the needle is in the green.');
    st.step = 5; api.status(recharge ? 'Bus tie closed. Charging battery strings…' : 'Bus tie closed. Generator taking load…', 'ok');
  }
  function advance() { if (st.step === 0 && st.master) st.step = 1; if (st.step === 1 && st.h2 && st.o2) { st.step = 2; api.status('Valves open. Hold the stack heater.', 'info'); } }
  let t = 0;
  api.frame(dt => {
    t += dt; st.trip = Math.max(0, st.trip - dt); st.lock = Math.max(0, st.lock - dt);
    if (st.heat && st.step === 2 && st.lock <= 0) st.temp += 14 * dt; else st.temp += ((st.step >= 3 ? 68 : 22) - st.temp) * .08 * dt;
    if (st.temp > 85 && st.step === 2) { st.heat = false; st.lock = 3; fault('Stack over-temperature. Heater tripped for 3 s.'); }
    if (st.step === 3) { if (st.crank) st.volt = Math.min(VNOM + .4, st.volt + 9 * dt); else st.volt = Math.max(0, st.volt - 20 * dt);
      if (st.volt >= VNOM) { st.step = 4; st.crank = false; api.status('Generator running. Close the bus tie when the needle is centred.', 'info'); } }
    if (st.step >= 4) st.volt = VNOM + Math.sin(t * 7) * .15;
    st.phase = Math.sin(t * 1.9) * Math.cos(t * .7);
    if (st.step === 5) { st.out = Math.min(100, st.out + 55 * dt); if (st.out >= 100) api.complete(recharge ? 'Battery strings recharging' : 'Emergency generator online', recharge ? 'Generator is charging the battery bank.' : 'Backup power is on the main bus.'); }
    // draw
    items.forEach((l, i) => { if (st.trip > 0 && l.className.includes('bad')) return; l.className = 'mg-lamp' + (i < st.step ? ' on' : i === st.step ? ' amb' : ''); });
    swEl.master.classList.toggle('on', st.master); heatB.style.borderColor = st.heat ? C.warn : ''; startB.style.borderColor = st.crank ? C.live : '';
    gT.set(st.temp / 100, TBAND[0] / 100, TBAND[1] / 100, st.temp.toFixed(0)); gV.set(st.volt / 32, (VNOM - 1) / 32, (VNOM + 1) / 32, st.volt.toFixed(1)); gO.set(st.out / 100, .95, 1, st.out.toFixed(0));
    needle.setAttribute('transform', `rotate(${st.phase * 70} 100 62)`); needle.setAttribute('stroke', st.step === 4 && Math.abs(st.phase) <= .15 ? C.ok : C.text);
    api.progress(Math.min(st.step, 5) / 5 * .9 + st.out / 1000);
  });
  api.status('Step 1: switch the battery master ON.', 'warn');
  const sleep = ms => new Promise(r => setTimeout(r, ms)), clk = el => el.dispatchEvent(new MouseEvent('click', { bubbles: true })), pe = (el, ty) => el.dispatchEvent(new PointerEvent(ty, { bubbles: true }));
  return { test: {
    wrong() { pe(startB, 'pointerdown'); pe(startB, 'pointerup'); return document.querySelector('.mg-status').textContent; },
    async solve() {
      clk(swEl.master); clk(swEl.h2); clk(swEl.o2); await sleep(100);
      pe(heatB, 'pointerdown'); for (let i = 0; i < 200 && st.temp < 66; i++) await sleep(30); pe(heatB, 'pointerup'); await sleep(100);
      pe(startB, 'pointerdown'); for (let i = 0; i < 300 && st.step < 4; i++) await sleep(30); pe(startB, 'pointerup');
      for (let i = 0; i < 400 && Math.abs(st.phase) > .08; i++) await sleep(15); clk(tieB);
      for (let i = 0; i < 200 && api.live(); i++) await sleep(30);
    } } };
}
function arc(cx, cy, r, a0, a1) { const p = a => [cx + r * Math.sin(a * Math.PI / 180), cy - r * Math.cos(a * Math.PI / 180)]; const [x0, y0] = p(a0), [x1, y1] = p(a1); return `M${x0} ${y0} A${r} ${r} 0 0 1 ${x1} ${y1}`; }
