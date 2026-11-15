// MINIGAME 1: Power Distribution (also the Transmitter RF Chain variant).
// Rotate bus links, close breakers, keep the locked-out line dead. Live open ends are short faults.
import { s, C, DIRS, opp, rotM, has, BASE, shapeOf, armsPath, rint, pick, shuffle } from './kit.js';
import { TUNE } from '../../data/tasks_data.js';
const Z = 64, bits = m => (m & 1) + (m >> 1 & 1) + (m >> 2 & 1) + (m >> 3 & 1);

function generate(cols, rows, nLoads) {
  const N = cols * rows, id = (x, y) => y * cols + x, xy = i => [i % cols, Math.floor(i / cols)];
  const inside = (x, y) => x >= 0 && y >= 0 && x < cols && y < rows;
  // random spanning tree (depth-first maze) -> every cell reachable, exactly one route between two cells
  const tree = Array(N).fill(0), seen = Array(N).fill(false), st = [id(rint(0, cols - 1), rint(0, rows - 1))]; seen[st[0]] = true;
  while (st.length) { const [x, y] = xy(st[st.length - 1]); const o = [0, 1, 2, 3].filter(d => inside(x + DIRS[d][0], y + DIRS[d][1]) && !seen[id(x + DIRS[d][0], y + DIRS[d][1])]);
    if (!o.length) { st.pop(); continue; } const d = pick(o), n = id(x + DIRS[d][0], y + DIRS[d][1]); tree[id(x, y)] |= 1 << d; tree[n] |= 1 << opp(d); seen[n] = true; st.push(n); }
  const route = (a, b) => { const par = new Map([[a, -1]]), q = [a]; while (q.length) { const c = q.shift(); if (c === b) break; const [x, y] = xy(c); for (let d = 0; d < 4; d++) if (has(tree[c], d)) { const n = id(x + DIRS[d][0], y + DIRS[d][1]); if (!par.has(n)) { par.set(n, c); q.push(n); } } }
    const p = []; for (let c = b; c !== -1; c = par.get(c)) p.unshift(c); return p; };
  const sy = rint(0, rows - 1), loads = shuffle([...Array(rows).keys()]).slice(0, nLoads).sort((a, b) => a - b), need = Array(N).fill(0);
  for (const ly of loads) { const p = route(id(0, sy), id(cols - 1, ly)); for (let i = 0; i + 1 < p.length; i++) { const [ax, ay] = xy(p[i]), [bx, by] = xy(p[i + 1]); const d = DIRS.findIndex(v => v[0] === bx - ax && v[1] === by - ay); need[p[i]] |= 1 << d; need[p[i + 1]] |= 1 << opp(d); } }
  need[id(0, sy)] |= 8; loads.forEach(ly => need[id(cols - 1, ly)] |= 2);
  const tiles = need.map((m, i) => ({ i, need: m, kind: m ? 'link' : 'fill', closed: true }));
  // lockout line: a spur off the network ending in a locked-out switch (must stay OPEN)
  const spur = shuffle(tiles.filter(t => t.kind === 'link' && bits(t.need) === 2)).map(t => { const [x, y] = xy(t.i); const d = shuffle([0, 1, 2, 3]).find(d => inside(x + DIRS[d][0], y + DIRS[d][1]) && !need[id(x + DIRS[d][0], y + DIRS[d][1])]); return d === undefined ? null : { t, d, n: id(x + DIRS[d][0], y + DIRS[d][1]) }; }).find(Boolean);
  if (spur) { spur.t.need |= 1 << spur.d; Object.assign(tiles[spur.n], { kind: 'lockout', need: 1 << opp(spur.d), closed: false }); }
  // two breakers on straight runs of the network (start OPEN)
  shuffle(tiles.filter(t => t.kind === 'link' && (t.need === 5 || t.need === 10))).slice(0, 2).forEach(t => { t.kind = 'breaker'; t.closed = false; });
  for (const t of tiles) {
    if (t.kind === 'fill') { t.type = pick(['corner', 'straight', 'stub', 'corner']); t.turns = rint(0, 3); }
    else { const sh = shapeOf(t.need); t.type = sh.type; t.turns = (t.kind === 'link') ? rint(0, 3) : sh.rot; }
  }
  return { cols, rows, sy, loads, tiles, id, xy };
}

export function mount(body, api, task) {
  const sig = task.variant === 'signal', cfg = sig ? TUNE.signal : TUNE.power;
  let g; do { g = generate(cfg.cols, cfg.rows, cfg.loads.length); } while (evaluate(g).solved);
  const { cols, rows } = g, W = cols * Z, H = rows * Z;
  const svg = s('svg', { class: 'mg-svg', viewBox: `${-118} -26 ${W + 236} ${H + 44}` }, body);
  s('rect', { x: -4, y: -4, width: W + 8, height: H + 8, rx: 6, fill: '#08111a', stroke: C.line }, svg);
  for (let x = 0; x < cols; x++) s('text', { x: x * Z + Z / 2, y: -10, 'text-anchor': 'middle', fill: C.sub, 'font-size': 11, 'font-family': 'monospace', text: 'ABCDEFGH'[x] }, svg);
  for (let y = 0; y < rows; y++) s('text', { x: -12, y: y * Z + Z / 2 + 4, 'text-anchor': 'end', fill: C.sub, 'font-size': 11, 'font-family': 'monospace', text: y + 1 }, svg);
  // source and loads
  const term = (x, y, label, w) => { const gg = s('g', { transform: `translate(${x},${y})` }, svg); const r = s('rect', { x: 0, y: -16, width: w, height: 32, rx: 4, fill: C.fill, stroke: C.line }, gg);
    s('text', { x: w / 2, y: 4, 'text-anchor': 'middle', fill: C.text, 'font-size': 10.5, 'font-family': 'monospace', text: label }, gg); return r; };
  term(-112, g.sy * Z + Z / 2, sig ? 'RF OSC' : 'MAIN BUS', 92).setAttribute('stroke', C.live);
  s('line', { x1: -20, y1: g.sy * Z + Z / 2, x2: 0, y2: g.sy * Z + Z / 2, stroke: C.live, 'stroke-width': 6 }, svg);
  const loadEls = g.loads.map((ly, k) => { s('line', { x1: W, y1: ly * Z + Z / 2, x2: W + 20, y2: ly * Z + Z / 2, stroke: C.dim, 'stroke-width': 6 }, svg); return term(W + 20, ly * Z + Z / 2, cfg.loads[k], 98); });
  const faultLayer = s('g', {}, null);
  const els = g.tiles.map(t => {
    const [x, y] = g.xy(t.i), gg = s('g', { transform: `translate(${x * Z},${y * Z})`, class: 'mg-click' }, svg);
    s('rect', { x: 2, y: 2, width: Z - 4, height: Z - 4, rx: 4, fill: t.kind === 'fill' ? '#0b151f' : C.fill, stroke: '#16283a' }, gg);
    const rotG = s('g', { class: 'mg-tile' }, gg); s('rect', { x: 0, y: 0, width: Z, height: Z, fill: 'none' }, rotG);
    const base = t.kind === 'breaker' || t.kind === 'lockout' ? t.need : BASE[t.type];
    const d = armsPath(base, Z), wire = s('path', { d, stroke: C.idle, 'stroke-width': 7, 'stroke-linecap': 'round', fill: 'none' }, rotG);
    const flow = s('path', { d, stroke: '#d9f4ff', 'stroke-width': 2.5, fill: 'none', class: 'mg-flow', opacity: 0 }, rotG);
    s('circle', { cx: Z / 2, cy: Z / 2, r: 6, fill: '#0b151f', stroke: C.idle, 'stroke-width': 2 }, rotG);
    let blade = null, tag = null;
    if (t.kind !== 'link' && t.kind !== 'fill') {   // switch: a blade across the middle of the run
      blade = s('line', { x1: Z / 2 - 13, y1: Z / 2, x2: Z / 2 + 13, y2: Z / 2, stroke: C.text, 'stroke-width': 4, 'stroke-linecap': 'round' }, gg);
      tag = s('text', { x: Z / 2, y: Z - 7, 'text-anchor': 'middle', 'font-size': 9, 'font-family': 'monospace', fill: t.kind === 'lockout' ? C.warn : C.sub, text: t.kind === 'lockout' ? (sig ? 'TEST PORT' : 'LOCKOUT') : 'BRK' }, gg);
      if (t.kind === 'lockout') s('rect', { x: 3, y: 3, width: Z - 6, height: Z - 6, rx: 4, fill: 'none', stroke: C.warn, 'stroke-dasharray': '4 4', opacity: .6 }, gg);
    }
    gg.addEventListener('click', () => click(t));
    return { gg, rotG, wire, flow, blade, tag };
  });
  svg.appendChild(faultLayer);
  function click(t) {
    if (!api.live()) return;
    if (t.kind === 'breaker' || t.kind === 'lockout') t.closed = !t.closed; else t.turns++;
    draw();
  }
  function draw() {
    const r = evaluate(g);
    g.tiles.forEach((t, k) => { const e = els[k]; if (t.kind !== 'breaker' && t.kind !== 'lockout') e.rotG.style.transform = `rotate(${t.turns * 90}deg)`;
      const on = r.powered.has(t.i), bad = t.kind === 'lockout' && on;
      e.wire.setAttribute('stroke', bad ? C.bad : on ? C.live : C.idle); e.flow.setAttribute('opacity', on ? .9 : 0);
      if (e.blade) { const sw = t.closed; const ang = sw ? 0 : -35; const dir = (t.need & 5) ? 90 : 0;   // run direction (vertical runs turn the blade)
        e.blade.setAttribute('transform', `rotate(${dir + ang} ${Z / 2} ${Z / 2})`); e.blade.setAttribute('stroke', bad ? C.bad : sw ? (on ? C.live : C.text) : C.warn); } });
    loadEls.forEach((el, k) => { const lit = r.lit.has(g.loads[k]); el.setAttribute('stroke', lit ? C.ok : C.line); el.setAttribute('fill', lit ? '#0f2a20' : C.fill); });
    faultLayer.replaceChildren(); r.leaks.forEach(([x, y, d]) => s('circle', { cx: x * Z + Z / 2 + DIRS[d][0] * Z / 2, cy: y * Z + Z / 2 + DIRS[d][1] * Z / 2, r: 7, fill: C.bad, class: 'mg-pulse' }, faultLayer));
    const n = r.lit.size, f = r.leaks.length + (r.lockLive ? 1 : 0);
    api.progress(n / g.loads.length * (f ? .8 : 1));
    if (r.lockLive) api.status(`FAULT: ${sig ? 'test port' : 'locked-out line'} is live. Open that switch.`, 'bad');
    else if (r.leaks.length) api.status(`FAULT: ${r.leaks.length} live open end(s) at ${r.leaks.map(([x, y]) => 'ABCDEFGH'[x] + (y + 1)).join(', ')}`, 'bad');
    else if (n < g.loads.length) api.status(`${n}/${g.loads.length} loads powered`, n ? 'info' : 'warn');
    if (r.solved) api.complete(sig ? 'Transmitter chain restored' : 'Power distribution restored', `${g.loads.length} of ${g.loads.length} loads energised, no faults.`);
  }
  draw();
  const clickEl = t => els[t.i].gg.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  return { test: {
    solve() { let n = 0; for (const t of g.tiles) { if (t.kind === 'link') { let k = 0; while (rotM(BASE[t.type], t.turns) !== t.need && k++ < 4) { clickEl(t); n++; } }
      if (t.kind === 'breaker' && !t.closed) { clickEl(t); n++; } if (t.kind === 'lockout' && t.closed) { clickEl(t); n++; } } return n; },
    wrong() { const t = g.tiles.find(t => t.kind === 'lockout') || g.tiles.find(t => t.kind === 'breaker'); if (t.kind === 'breaker') { clickEl(t); clickEl(t); } clickEl(t); const st = document.querySelector('.mg-status').textContent; clickEl(t); return st; } } };
}

// power flows from the source through matching sides; returns powered cells, lit loads and faults
function evaluate(g) {
  const { cols, rows, sy, loads, tiles, id } = g;
  const mask = t => (t.kind === 'breaker' || t.kind === 'lockout') ? (t.closed ? t.need : 0) : rotM(BASE[t.type], t.turns);
  const powered = new Set(), lit = new Set(), leaks = [], q = [];
  const s0 = id(0, sy); if (has(mask(tiles[s0]), 3)) { powered.add(s0); q.push(s0); }
  while (q.length) { const c = q.shift(), m = mask(tiles[c]), x = c % cols, y = Math.floor(c / cols);
    for (let d = 0; d < 4; d++) { if (!has(m, d)) continue; const nx = x + DIRS[d][0], ny = y + DIRS[d][1];
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) { if (d === 1 && nx === cols && loads.includes(y)) lit.add(y); else if (!(d === 3 && x === 0 && y === sy)) leaks.push([x, y, d]); continue; }
      const n = id(nx, ny), nt = tiles[n];
      if (has(mask(nt), opp(d))) { if (!powered.has(n)) { powered.add(n); q.push(n); } }
      else if (!((nt.kind === 'breaker' || nt.kind === 'lockout') && has(nt.need, opp(d)))) leaks.push([x, y, d]); } }   // an OPEN switch is a proper end, not a fault
  const lockLive = tiles.some(t => t.kind === 'lockout' && powered.has(t.i));
  return { powered, lit, leaks, lockLive, solved: lit.size === loads.length && !leaks.length && !lockLive };
}
