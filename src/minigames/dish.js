// MINIGAME 7: Satellite Dish Repair.
// A hand-driven gear train. Every drive step turns each ENGAGED gear one tooth; a gear only turns if its whole chain back
// to the drive wheel is engaged. Use the clutches to bring each mark to its notch, then lock (engage) every clutch.
// First repair (Failed -> Degraded): coarse layout. Second repair (Degraded -> Working): a different, deeper fine-alignment train.
import { h, s, C } from './kit.js';

// gear: n teeth, r radius, parent + mesh angle (degrees, from parent to this gear), notch = where its mark must point
const LAYOUTS = {
  coarse: { name: 'COARSE ALIGNMENT', view: '0 40 620 350', az: 'B', el: 'Cg', at: [300, 200], gears: {
    A: { n: 12, r: 52, label: 'DRIVE' },
    B: { n: 16, r: 70, label: 'AZIMUTH', parent: 'A', ang: 0, notch: -90 },
    Cg: { n: 20, r: 86, label: 'ELEVATION', parent: 'A', ang: 180, notch: -90 },
    D: { n: 10, r: 44, label: 'LOCK RING', parent: 'Cg', ang: 90, notch: 90 } } },
  fine: { name: 'FINE ALIGNMENT', view: '10 40 560 340', az: 'C', el: 'B', at: [170, 215], driveLabel: 180, gears: {
    A: { n: 10, r: 44, label: 'DRIVE' },
    B: { n: 18, r: 76, label: 'ELEVATION TRIM', parent: 'A', ang: -25, notch: -90 },
    C: { n: 14, r: 60, label: 'AZIMUTH TRIM', parent: 'B', ang: 20, notch: -90 },
    E: { n: 8, r: 36, label: 'LOCK PIN', parent: 'C', ang: 90, notch: 90 },
    D: { n: 12, r: 52, label: 'BRAKE', parent: 'A', ang: 120, notch: 180 } } }
};

export function mount(body, api, task) {
  const L = LAYOUTS[task.variant === 'fine' ? 'fine' : 'coarse'], G = L.gears, keys = Object.keys(G), targets = keys.filter(k => G[k].parent);
  const pitch = k => 360 / G[k].n, kids = k => targets.filter(c => G[c].parent === k);
  // positions, turning directions and tooth phases (so meshing teeth sit in each other's gaps)
  const P = { A: L.at }, dirs = { A: 1 }, PH = { A: 0 }, NOTCH = { A: -90 };
  const order = []; (function walk(k) { order.push(k); kids(k).forEach(walk); })('A');
  for (const k of order.slice(1)) {
    const g = G[k], p = g.parent, a = g.ang * Math.PI / 180, d = G[p].r + g.r - 7;
    P[k] = [P[p][0] + Math.cos(a) * d, P[p][1] + Math.sin(a) * d]; dirs[k] = -dirs[p]; NOTCH[k] = g.notch;
    const fp = (((g.ang - NOTCH[p] - PH[p]) % pitch(p)) + pitch(p)) % pitch(p) / pitch(p);   // where the parent's tooth sits at the contact point
    PH[k] = (((g.ang + 180 - NOTCH[k] - pitch(k) * (.5 - fp)) % pitch(k)) + pitch(k)) % pitch(k);
  }
  const pos = {}, eng = {}; keys.forEach(k => { pos[k] = 0; eng[k] = true; });
  targets.forEach(k => { do { pos[k] = Math.floor(Math.random() * G[k].n); } while (!pos[k]); });
  const row = h('div', { class: 'mg-row' }, body);
  const card = h('div', { class: 'mg-card', style: 'flex:3 1 480px;padding:6px' }, row);
  h('div', { class: 'mg-k', text: L.name }, card);
  const svg = s('svg', { class: 'mg-svg', viewBox: L.view }, card);
  const els = {};
  for (const k of order) {
    const g = G[k], [cx, cy] = P[k], outer = s('g', { transform: `translate(${cx},${cy})` }, svg), rot = s('g', {}, outer);
    s('path', { d: gearPath(g.n, g.r, PH[k]), fill: k === 'A' ? '#24384c' : '#1b2c3d', stroke: '#4d6a86', 'stroke-width': 1.5 }, rot);
    s('circle', { r: g.r * .45, fill: '#0e1a26', stroke: '#2f4760' }, rot);
    for (let q = 0; q < 4; q++) s('circle', { cx: Math.cos(q * Math.PI / 2) * g.r * .66, cy: Math.sin(q * Math.PI / 2) * g.r * .66, r: g.r * .1, fill: '#0e1a26' }, rot);
    const mark = k !== 'A' ? s('line', { x1: 0, y1: 0, x2: g.r - 10, y2: 0, stroke: C.warn, 'stroke-width': 5, 'stroke-linecap': 'round' }, rot) : null;
    s('circle', { r: 7, fill: '#9fb3c6' }, outer);
    let notch = null;
    if (k !== 'A') { const na = NOTCH[k] * Math.PI / 180, ux = Math.cos(na), uy = Math.sin(na), tip = g.r + 3, base = g.r + 14, px = -uy, py = ux;
      notch = s('path', { d: `M${ux * tip} ${uy * tip} L${ux * base + px * 7} ${uy * base + py * 7} L${ux * base - px * 7} ${uy * base - py * 7} Z`, fill: C.sub }, outer); }
    // label on the side away from the parent gear
    const la = (k === 'A' ? (L.driveLabel ?? 90) : g.ang) * Math.PI / 180, lx = Math.cos(la) * (g.r + 24), ly = Math.sin(la) * (g.r + 24) + 4;
    s('text', { x: lx, y: ly, 'text-anchor': Math.abs(Math.cos(la)) < .4 ? 'middle' : Math.cos(la) > 0 ? 'start' : 'end', fill: C.sub, 'font-size': 11, 'font-family': 'monospace', text: g.label }, outer);
    if (k !== 'A') { outer.classList.add('mg-click'); outer.addEventListener('click', () => clutch(k)); }
    els[k] = { outer, rot, mark, notch };
  }
  // controls + dish preview
  const side = h('div', { class: 'mg-card', style: 'flex:1 1 230px' }, row); h('div', { class: 'mg-k', text: 'DRIVE WHEEL' }, side);
  const dr = h('div', { style: 'display:flex;gap:6px' }, side);
  const bL = h('button', { class: 'mg-btn', type: 'button', text: '◀ 1 tooth', style: 'margin:0;flex:1' }, dr), bR = h('button', { class: 'mg-btn', type: 'button', text: '1 tooth ▶', style: 'margin:0;flex:1' }, dr);
  bL.addEventListener('click', () => drive(-1)); bR.addEventListener('click', () => drive(1));
  h('div', { class: 'mg-k', text: 'CLUTCHES (click a lever or the gear)', style: 'margin-top:12px' }, side);
  const lev = {}; for (const k of order.slice(1)) { const r = h('div', { class: 'mg-sw', style: 'flex-direction:row;width:100%;justify-content:space-between;padding:6px 10px;margin:4px 0' }, side);
    h('div', { class: 'lbl', text: G[k].label + (G[k].parent !== 'A' ? ` (via ${G[G[k].parent].label})` : '') }, r); lev[k] = h('div', { class: 'mg-mono', style: 'font-size:11px' }, r); r.addEventListener('click', () => clutch(k)); lev[k].row = r; }
  h('div', { class: 'mg-k', text: 'DISH ALIGNMENT', style: 'margin-top:12px' }, side);
  const prev = s('svg', { viewBox: '0 0 200 110', class: 'mg-svg', style: 'max-height:120px' }, side);
  s('line', { x1: 10, y1: 100, x2: 190, y2: 100, stroke: C.line, 'stroke-width': 2 }, prev); s('rect', { x: 94, y: 70, width: 12, height: 30, fill: '#3a5068' }, prev);
  const dishG = s('g', { transform: 'translate(100,66)' }, prev); s('path', { d: 'M-40 -6 Q 0 26 40 -6', stroke: '#dfe8f2', 'stroke-width': 5, fill: 'none' }, dishG); s('line', { x1: 0, y1: 9, x2: 0, y2: -24, stroke: '#9fb3c6', 'stroke-width': 2 }, dishG);
  const lamps = {}; const lr = h('div', { style: 'display:flex;gap:10px;flex-wrap:wrap;font:11px monospace;color:#a9bccd' }, side);
  for (const k of targets) { const w = h('span', {}, lr); lamps[k] = h('span', { class: 'mg-lamp', style: 'margin-right:4px' }, w); h('span', { text: G[k].label }, w); }

  const moving = () => { const m = []; (function walk(k) { kids(k).forEach(c => { if (eng[c]) { m.push(c); walk(c); } }); })('A'); return m; };
  function drive(d) {
    if (!api.live()) return;
    const mv = moving(); pos.A += d; mv.forEach(k => { pos[k] += d; });
    if (!mv.length) api.status('Every clutch next to the drive is free: the wheel turns but nothing else moves.', 'warn'); else status();
  }
  function clutch(k) { if (!api.live()) return; eng[k] = !eng[k]; draw(); status(); }
  const aligned = k => ((pos[k] % G[k].n) + G[k].n) % G[k].n === 0;
  function status() {
    draw(); const al = targets.filter(aligned), free = targets.filter(k => !eng[k]);
    api.progress(al.length / targets.length * .85 + (free.length ? 0 : .15) * (al.length === targets.length));
    if (al.length === targets.length && !free.length) api.complete(task.variant === 'fine' ? 'Dish fine-aligned and locked' : 'Dish mechanism aligned and locked', task.variant === 'fine' ? 'The dish is pointing straight at Earth.' : 'Azimuth and elevation are back on target. The dish is repositioning.');
    else if (al.length === targets.length) api.status('All marks aligned. Engage every clutch to lock the mechanism.', 'ok');
    else api.status(`${al.length}/${targets.length} marks on their notch · ${free.length ? 'free: ' + free.map(k => G[k].label).join(', ') : 'all clutches engaged'}`, al.length ? 'info' : 'warn');
  }
  const target = k => NOTCH[k] + dirs[k] * pos[k] * 360 / G[k].n, ang = {}; keys.forEach(k => { ang[k] = target(k); });
  function draw() {
    for (const k of order) { const e = els[k], off = k !== 'A' && !eng[k] ? 12 : 0, a = (G[k].ang || 0) * Math.PI / 180;
      e.outer.setAttribute('transform', `translate(${P[k][0] + Math.cos(a) * off},${P[k][1] + Math.sin(a) * off})`); e.outer.style.opacity = off ? .55 : 1;
      if (e.mark) e.mark.setAttribute('stroke', aligned(k) ? C.ok : C.warn); if (e.notch) e.notch.setAttribute('fill', aligned(k) ? C.ok : C.sub); }
    for (const k of targets) { lev[k].textContent = eng[k] ? 'ENGAGED' : 'FREE'; lev[k].style.color = eng[k] ? '#5ec8ff' : '#ffc857'; lamps[k].className = 'mg-lamp ' + (aligned(k) ? 'on' : 'amb'); }
    const wrap = k => { const n = G[k].n, v = ((pos[k] % n) + n) % n; return v > n / 2 ? v - n : v; };
    dishG.setAttribute('transform', `translate(${100 + wrap(L.az) * 3},66) rotate(${wrap(L.el) * 4})`);
  }
  api.frame(dt => { for (const k of keys) { ang[k] += (target(k) - ang[k]) * Math.min(1, dt * 12); els[k].rot.setAttribute('transform', `rotate(${ang[k]})`); } });
  status();
  const clk = el => el.dispatchEvent(new MouseEvent('click', { bubbles: true })), set = (k, v) => { if (eng[k] !== v) clk(lev[k].row); };
  const ancestors = k => { const a = []; for (let p = G[k].parent; p && p !== 'A'; p = G[p].parent) a.push(p); return a; };
  return { test: {
    layout: task.variant === 'fine' ? 'fine' : 'coarse', gearCount: keys.length,
    wrong() { kids('A').forEach(k => set(k, false)); clk(bR); const st = document.querySelector('.mg-status').textContent; clk(bL); kids('A').forEach(k => set(k, true)); return st; },
    solve() { let n = 0; const post = []; (function walk(k) { kids(k).forEach(walk); if (k !== 'A') post.push(k); })('A');
      for (const k of post) { const need = new Set([k, ...ancestors(k)]); targets.forEach(t => set(t, need.has(t))); let g = 0; while (!aligned(k) && g++ < 40) { clk(bR); n++; } }
      targets.forEach(t => set(t, true)); return n; } } };
}
function gearPath(n, r, ph = 0) {
  const pts = [], tooth = 2 * Math.PI / n, ro = r, ri = r - 9;
  for (let i = 0; i < n; i++) { const a = i * tooth + ph * Math.PI / 180; [[ri, -.5], [ri, -.3], [ro, -.18], [ro, .18], [ri, .3], [ri, .5]].forEach(([rr, f]) => pts.push([Math.cos(a + f * tooth) * rr, Math.sin(a + f * tooth) * rr])); }
  return 'M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L') + 'Z';
}
