/* SI generated: written with Claude (an AI assistant) for the Farsight team. See SI_DISCLOSURE.md. */
// MINIGAME 4: Oxygen Scrubber Calibration (also Radiation Shield Field Balance).
// Three coupled controls drive three readings. Every reading must sit in its green band at the same time, and hold.
import { h, s, C, clamp } from './kit.js';
import { TUNE } from '../../data/tasks_data.js';

const SETS = {
  oxygen: { knobs: ['BLOWER FLOW', 'SORBENT BED TEMP', 'CYCLE TIME'], reads: ['CO2 removal', 'O2 output', 'Bed pressure'],
    M: [[.75, .30, -.15], [.35, .70, 0], [.20, -.35, .80]], ok: 'Scrubber stable', sub: 'CO2 removal, O2 output and bed pressure are all in range.' },
  shield: { knobs: ['COIL A CURRENT', 'COIL B CURRENT', 'FIELD BIAS'], reads: ['Field uniformity', 'Coil temperature', 'Power draw'],
    M: [[.55, .55, -.30], [.60, -.20, .25], [.30, .40, .45]], ok: 'Shield field balanced', sub: 'Field uniformity, coil temperature and power draw are all in range.' }
};
export function mount(body, api, task) {
  const set = SETS[task.variant === 'shield' ? 'shield' : 'oxygen'], band = TUNE.scrubber.band, M = set.M;
  const target = [0, 1, 2].map(() => .2 + Math.random() * .6), centre = [0, 1, 2].map(() => .3 + Math.random() * .4);
  const bias = centre.map((c, i) => c - M[i].reduce((a, m, j) => a + m * target[j], 0));
  const calc = k => M.map((row, i) => clamp(row.reduce((a, m, j) => a + m * k[j], bias[i]), 0, 1));
  const inBand = r => r.every((v, i) => Math.abs(v - centre[i]) <= band);
  let k; do { k = [0, 1, 2].map(() => Math.random()); } while (inBand(calc(k)));
  const shown = calc(k); let hold = 0, t = 0;
  const row = h('div', { class: 'mg-row' }, body);
  // gauges
  const gc = h('div', { class: 'mg-card', style: 'flex:2 1 420px' }, row); h('div', { class: 'mg-k', text: 'PROCESS READINGS (target band in green)' }, gc);
  const gs = s('svg', { viewBox: '0 0 600 200', class: 'mg-svg' }, gc);
  const gauges = set.reads.map((label, i) => {
    const cx = 100 + i * 200, cy = 130, R = 78, ang = v => -120 + v * 240;
    const P = a => [cx + R * Math.sin(a * Math.PI / 180), cy - R * Math.cos(a * Math.PI / 180)], arc = (a0, a1) => { const [x0, y0] = P(a0), [x1, y1] = P(a1); return `M${x0} ${y0}A${R} ${R} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}`; };
    s('path', { d: arc(-120, 120), stroke: C.line, 'stroke-width': 10, fill: 'none' }, gs);
    s('path', { d: arc(ang(centre[i] - band), ang(centre[i] + band)), stroke: C.ok, 'stroke-width': 10, fill: 'none', opacity: .8 }, gs);
    for (let q = 0; q <= 10; q++) { const a = ang(q / 10), [x0, y0] = P(a), r2 = q % 5 ? .9 : .82; s('line', { x1: x0, y1: y0, x2: cx + (x0 - cx) * r2, y2: cy + (y0 - cy) * r2, stroke: C.sub, 'stroke-width': 1.5 }, gs); }
    const nd = s('line', { x1: cx, y1: cy, x2: cx, y2: cy - R + 8, stroke: C.text, 'stroke-width': 3, 'stroke-linecap': 'round' }, gs); s('circle', { cx, cy, r: 6, fill: C.text }, gs);
    const val = s('text', { x: cx, y: cy + 34, 'text-anchor': 'middle', fill: C.warn, 'font-size': 18, 'font-family': 'monospace' }, gs);
    s('text', { x: cx, y: cy + 56, 'text-anchor': 'middle', fill: C.sub, 'font-size': 12, text: label }, gs);
    return { nd, val, cx, cy, ang };
  });
  // knobs
  const kc = h('div', { class: 'mg-card', style: 'flex:1 1 360px' }, row); h('div', { class: 'mg-k', text: 'CONTROLS (drag, scroll or use − / +)' }, kc);
  const kr = h('div', { style: 'display:flex;gap:10px;justify-content:space-around' }, kc);
  const knobs = set.knobs.map((label, j) => {
    const w = h('div', { style: 'text-align:center;width:110px' }, kr), sv = s('svg', { viewBox: '0 0 100 100', style: 'width:92px;height:92px;cursor:ns-resize;touch-action:none' }, w);
    s('circle', { cx: 50, cy: 50, r: 44, fill: '#0b151f', stroke: C.line, 'stroke-width': 2 }, sv);
    for (let q = 0; q <= 10; q++) { const a = (-135 + q * 27) * Math.PI / 180; s('line', { x1: 50 + 40 * Math.sin(a), y1: 50 - 40 * Math.cos(a), x2: 50 + 44 * Math.sin(a), y2: 50 - 44 * Math.cos(a), stroke: C.sub }, sv); }
    const cap = s('g', {}, sv); s('circle', { cx: 50, cy: 50, r: 30, fill: '#1a2b3c', stroke: '#3a5068', 'stroke-width': 2 }, cap); s('line', { x1: 50, y1: 48, x2: 50, y2: 24, stroke: C.live, 'stroke-width': 4, 'stroke-linecap': 'round' }, cap);
    const num = h('div', { class: 'mg-mono', style: 'color:#5ec8ff;font-size:13px' }, w); h('div', { text: label, style: 'font:600 10px monospace;letter-spacing:.06em;color:#a9bccd;margin:3px 0 5px' }, w);
    const bb = h('div', { style: 'display:flex;gap:6px;justify-content:center' }, w);
    const minus = h('button', { class: 'mg-btn', type: 'button', text: '−', style: 'margin:0;padding:6px 12px' }, bb), plus = h('button', { class: 'mg-btn', type: 'button', text: '+', style: 'margin:0;padding:6px 12px' }, bb);
    minus.addEventListener('click', () => nudge(j, -.01)); plus.addEventListener('click', () => nudge(j, .01));
    let drag = null;
    sv.addEventListener('pointerdown', e => { if (!api.live()) return; drag = e.clientY; try { sv.setPointerCapture(e.pointerId); } catch (_) { } });
    sv.addEventListener('pointermove', e => { if (drag === null) return; nudge(j, (drag - e.clientY) * .004); drag = e.clientY; });
    sv.addEventListener('pointerup', () => { drag = null; }); sv.addEventListener('wheel', e => { e.preventDefault(); nudge(j, e.deltaY < 0 ? .02 : -.02); }, { passive: false });
    return { cap, num, minus, plus };
  });
  const holdBar = h('div', { class: 'mg-read-l', style: 'margin-top:10px' }, kc);
  function nudge(j, d) { if (!api.live()) return; k[j] = clamp(k[j] + d, 0, 1); }
  api.frame(dt => {
    t += dt; const r = calc(k);
    for (let i = 0; i < 3; i++) shown[i] += (r[i] - shown[i]) * Math.min(1, dt * 4);
    const noisy = shown.map((v, i) => v + Math.sin(t * (3 + i) + i) * .004);
    const ok = noisy.map((v, i) => Math.abs(v - centre[i]) <= band);
    gauges.forEach((gg, i) => { gg.nd.setAttribute('transform', `rotate(${gg.ang(clamp(noisy[i], 0, 1))} ${gg.cx} ${gg.cy})`); gg.val.textContent = (noisy[i] * 100).toFixed(1) + ' %'; gg.val.setAttribute('fill', ok[i] ? C.ok : C.warn); gg.nd.setAttribute('stroke', ok[i] ? C.ok : C.text); });
    knobs.forEach((kb, j) => { kb.cap.setAttribute('transform', `rotate(${-135 + k[j] * 270} 50 50)`); kb.num.textContent = (k[j] * 100).toFixed(0); });
    const n = ok.filter(Boolean).length;
    if (!api.live()) return;
    if (n === 3) { hold += dt; api.status(`All readings in range. Holding steady ${hold.toFixed(1)} / ${TUNE.scrubber.holdSec} s`, 'ok'); }
    else { hold = 0; const off = ok.map((o, i) => o ? null : `${set.reads[i]} ${noisy[i] > centre[i] ? 'too high' : 'too low'}`).filter(Boolean); api.status(`${n}/3 in range · ${off.join(' · ')}`, n ? 'warn' : 'bad'); }
    holdBar.textContent = n === 3 ? 'Stabilising…' : 'Every reading must be green at the same time.';
    api.progress(n / 3 * .7 + Math.min(1, hold / TUNE.scrubber.holdSec) * .3);
    if (hold >= TUNE.scrubber.holdSec) api.complete(set.ok, set.sub);
  });
  const sleep = ms => new Promise(r => setTimeout(r, ms)), clk = el => el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  return { test: {
    async wrong() { const o = k[0]; for (let i = 0; i < 30; i++) clk(knobs[0].plus); await sleep(600); const st = document.querySelector('.mg-status').textContent; k[0] = o; return st; },
    async solve() { let n = 0; for (let j = 0; j < 3; j++) { let g = 0; while (Math.abs(k[j] - target[j]) > .006 && g++ < 200) { clk(target[j] > k[j] ? knobs[j].plus : knobs[j].minus); n++; } }
      for (let i = 0; i < 200 && api.live(); i++) await sleep(40); return n; } } };
}
