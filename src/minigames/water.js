/* SI generated: written with Claude (an AI assistant) for the Farsight team. See SI_DISCLOSURE.md. */
// MINIGAME 5: Water Filtration.
// Place filter modules in the right order (each card says what it removes and what it needs), then run the pump.
// The water changes colour stage by stage; a stage that gets the wrong water fouls and stops the run.
import { h, s, C, shuffle } from './kit.js';

// contaminants: P particles, O organics, S dissolved salts, M microbes. X = additive (not allowed in drinking water)
const MODS = {
  sed: { name: 'SEDIMENT SCREEN', removes: ['P'], needs: [], why: '' },
  carb: { name: 'ACTIVATED CARBON', removes: ['O'], needs: ['P'], why: 'Particles clogged the carbon bed.' },
  ro: { name: 'RO MEMBRANE', removes: ['S'], needs: ['P', 'O'], why: 'Membrane fouled: particles or organics in the feed.' },
  uv: { name: 'UV STERILISER', removes: ['M'], needs: ['P', 'S'], why: 'Particles and dissolved salts block the UV light.' },
  iod: { name: 'IODINE DOSER', removes: [], adds: 'X', needs: [], why: '' }
};
const LABEL = { P: 'particles', O: 'organics', S: 'salts', M: 'microbes', X: 'iodine' };
const COLOR = n => ['#d9f2ff', '#a9d6e8', '#8fae9a', '#8f8a5c', '#7a5c3a'][Math.min(4, n)];   // clean -> dirty
const ORDER = ['sed', 'carb', 'ro', 'uv'];

export function mount(body, api) {
  const slots = [null, null, null, null];
  let running = false, sel = null;
  h('div', { class: 'mg-k', text: 'FILTER MODULES (drag into the line, or click a module then a slot)' }, body);
  const tray = h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap;min-height:104px' }, body);
  h('div', { class: 'mg-k', text: 'TREATMENT LINE', style: 'margin-top:12px' }, body);
  const line = h('div', { style: 'display:flex;gap:8px;align-items:center;flex-wrap:wrap' }, body);
  const tank = (label, c) => { const w = h('div', { style: 'text-align:center;width:66px' }, line); const sv = s('svg', { viewBox: '0 0 60 80', style: 'width:52px' }, w);
    s('rect', { x: 6, y: 6, width: 48, height: 68, rx: 6, fill: '#0b151f', stroke: C.line, 'stroke-width': 2 }, sv); const lv = s('rect', { x: 9, y: 30, width: 42, height: 41, rx: 4, fill: c }, sv);
    h('div', { class: 'mg-mono', text: label, style: 'font-size:10px;color:#7f97ad' }, w); return lv; };
  tank('GREY WATER', COLOR(4));
  const pipeEls = [], slotEls = [];
  for (let i = 0; i < 4; i++) {
    const p = s('svg', { viewBox: '0 0 30 12', style: 'width:18px' }, line); pipeEls.push(s('rect', { x: 0, y: 3, width: 30, height: 6, fill: '#22374b' }, p));
    const sl = h('div', { class: 'mg-slot', text: `STAGE ${i + 1}` }, line); sl.dataset.slot = i; slotEls.push(sl);
    sl.addEventListener('click', () => { if (sel && api.live() && !running) place(sel, i); });
  }
  const pOut = s('svg', { viewBox: '0 0 30 12', style: 'width:18px' }, line); pipeEls.push(s('rect', { x: 0, y: 3, width: 30, height: 6, fill: '#22374b' }, pOut));
  const outLv = tank('POTABLE', '#0b151f');
  const bar = h('div', { style: 'display:flex;gap:12px;align-items:center;margin-top:10px' }, body);
  const run = h('button', { class: 'mg-btn', type: 'button', text: '▶ PRIME PUMP & RUN', style: 'margin:0' }, bar);
  const report = h('div', { class: 'mg-mono', style: 'font-size:12px;color:#a9bccd' }, bar);
  run.addEventListener('click', go);
  // module cards
  const cards = {};
  for (const id of shuffle(Object.keys(MODS))) {
    const m = MODS[id], c = h('div', { class: 'mg-mod' }, tray); c.dataset.id = id; h('b', { text: m.name }, c);
    h('div', { class: 'rm', text: m.adds ? 'Adds: iodine (for EVA suit water only)' : 'Removes: ' + m.removes.map(x => LABEL[x]).join(', ') }, c);
    h('div', { class: 'nd', text: m.needs.length ? 'Feed must be free of: ' + m.needs.map(x => LABEL[x]).join(', ') : 'Accepts any feed' }, c);
    cards[id] = c; drag(c, id);
  }
  function drag(c, id) {
    let ghost = null, sx = 0, sy = 0, moved = false;
    c.addEventListener('pointerdown', e => { if (!api.live() || running) return; sx = e.clientX; sy = e.clientY; moved = false; try { c.setPointerCapture(e.pointerId); } catch (_) { }
      const mv = ev => { if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 6) { moved = true; ghost = c.cloneNode(true); ghost.classList.add('drag'); document.body.appendChild(ghost); }
        if (ghost) { ghost.style.left = ev.clientX - 70 + 'px'; ghost.style.top = ev.clientY - 40 + 'px'; slotEls.forEach(sl => sl.classList.toggle('hot', hit(sl, ev))); } };
      const upf = ev => { c.removeEventListener('pointermove', mv); c.removeEventListener('pointerup', upf);
        if (ghost) { ghost.remove(); ghost = null; const k = slotEls.findIndex(sl => hit(sl, ev)); slotEls.forEach(sl => sl.classList.remove('hot')); if (k >= 0) place(id, k); else unplace(id); }
        else { sel = sel === id ? null : id; Object.values(cards).forEach(x => x.classList.toggle('sel', x.dataset.id === sel)); } };
      c.addEventListener('pointermove', mv); c.addEventListener('pointerup', upf); });
  }
  const hit = (el, ev) => { const r = el.getBoundingClientRect(); return ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom; };
  function place(id, k) {
    const from = slots.indexOf(id), other = slots[k];
    if (from >= 0) slots[from] = other; else if (other) tray.appendChild(cards[other]);
    slots[k] = id; sel = null; layout(); reset();
  }
  function unplace(id) { const i = slots.indexOf(id); if (i >= 0) { slots[i] = null; layout(); reset(); } }
  function layout() {
    slotEls.forEach((sl, i) => { sl.replaceChildren(); sl.className = 'mg-slot'; if (slots[i]) sl.appendChild(cards[slots[i]]); else sl.textContent = `STAGE ${i + 1}`; });
    for (const id in cards) { cards[id].classList.remove('sel'); if (!slots.includes(id) && cards[id].parentNode !== tray) tray.appendChild(cards[id]); }
    const n = slots.filter(Boolean).length; api.status(n < 4 ? `${n}/4 stages fitted` : 'Line assembled. Run the pump to test it.', n < 4 ? 'warn' : 'info'); api.progress(n / 8);
  }
  function reset() { pipeEls.forEach(p => p.setAttribute('fill', '#22374b')); outLv.setAttribute('fill', '#0b151f'); report.textContent = ''; }
  // run the water through each stage in turn
  function go() {
    if (!api.live() || running) return;
    if (slots.some(x => !x)) { api.status('Fit all four stages before running the pump.', 'warn'); return; }
    running = true; run.disabled = true; reset();
    const w = new Set(['P', 'O', 'S', 'M']); let i = 0;
    pipeEls[0].setAttribute('fill', COLOR(w.size));
    const stepFn = () => {
      if (!api.live()) return;
      if (i === 4) { const okW = !w.size; outLv.setAttribute('fill', okW ? COLOR(0) : '#b9a94a'); pipeEls[4].setAttribute('fill', COLOR(w.size));
        running = false; run.disabled = false;
        if (okW) { report.textContent = 'Output: potable. Conductivity, turbidity and microbe count all nominal.'; api.complete('Water purification restored', 'Every stage is working in the right order.'); }
        else { report.textContent = 'Output rejected: still contains ' + [...w].map(x => LABEL[x]).join(', ') + '.'; api.status('Output failed the potable check. ' + report.textContent, 'bad'); }
        return; }
      const m = MODS[slots[i]], bad = m.needs.filter(x => w.has(x));
      if (bad.length) { slotEls[i].classList.add('bad'); running = false; run.disabled = false; report.textContent = `Stage ${i + 1} (${m.name}) fouled: ${m.why}`; api.status(`FAULT at stage ${i + 1}: ${m.why} Rearrange and run again.`, 'bad'); return; }
      m.removes.forEach(x => w.delete(x)); if (m.adds) w.add(m.adds);
      slotEls[i].classList.add('good'); pipeEls[i + 1].setAttribute('fill', COLOR(w.size)); api.progress(.5 + (i + 1) / 10);
      api.status(`Stage ${i + 1} OK · remaining: ${[...w].map(x => LABEL[x]).join(', ') || 'none'}`, 'info'); i++; api.after(stepFn, 650);
    };
    api.after(stepFn, 500);
  }
  layout();
  const sleep = ms => new Promise(r => setTimeout(r, ms)), clk = el => el.dispatchEvent(new MouseEvent('click', { bubbles: true })), pe = (el, ty) => el.dispatchEvent(new PointerEvent(ty, { bubbles: true, clientX: 0, clientY: 0 }));
  const pickCard = id => { pe(cards[id], 'pointerdown'); pe(cards[id], 'pointerup'); };   // click-to-select path
  return { test: {
    async wrong() { ['carb', 'sed', 'ro', 'uv'].forEach((id, k) => { pickCard(id); clk(slotEls[k]); }); clk(run); await sleep(1400); return document.querySelector('.mg-status').textContent; },
    async solve() { ORDER.forEach((id, k) => { pickCard(id); clk(slotEls[k]); }); clk(run); for (let i = 0; i < 100 && api.live(); i++) await sleep(60); return 8; } } };
}
