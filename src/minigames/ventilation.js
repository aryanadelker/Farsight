/* SI generated: written with Claude (an AI assistant) for the Farsight team. See SI_DISCLOSURE.md. */
// MINIGAME 3: Ventilation Repair.
// Rotate duct sections (straight, elbow, junction) to carry air from the fan to both grow-bay vents.
// Blocked ducts must be held to clear. Open duct ends leak air.
import { s, C, DIRS, opp, rotM, has, BASE, shapeOf, armsPath, rint, pick, shuffle } from './kit.js';
import { TUNE } from '../../data/tasks_data.js';
const Z = 62;

function generate(cols, rows) {
  const id = (x, y) => y * cols + x, xy = i => [i % cols, Math.floor(i / cols)], N = cols * rows, inside = (x, y) => x >= 0 && y >= 0 && x < cols && y < rows;
  // random maze, then the routes from the fan to the two vents
  const tree = Array(N).fill(0), seen = Array(N).fill(false), st = [0]; seen[0] = true;
  while (st.length) { const [x, y] = xy(st[st.length - 1]); const o = [0, 1, 2, 3].filter(d => inside(x + DIRS[d][0], y + DIRS[d][1]) && !seen[id(x + DIRS[d][0], y + DIRS[d][1])]);
    if (!o.length) { st.pop(); continue; } const d = pick(o), n = id(x + DIRS[d][0], y + DIRS[d][1]); tree[id(x, y)] |= 1 << d; tree[n] |= 1 << opp(d); seen[n] = true; st.push(n); }
  const route = (a, b) => { const par = new Map([[a, -1]]), q = [a]; while (q.length) { const c = q.shift(); const [x, y] = xy(c); for (let d = 0; d < 4; d++) if (has(tree[c], d)) { const n = id(x + DIRS[d][0], y + DIRS[d][1]); if (!par.has(n)) { par.set(n, c); q.push(n); } } }
    const p = []; for (let c = b; c !== -1; c = par.get(c)) p.unshift(c); return p; };
  const fan = rint(0, rows - 1), v1 = rint(0, rows - 1), v2 = rint(1, cols - 2);   // fan: west edge row; vent A: east edge row; vent B: south edge column
  const need = Array(N).fill(0), onPath = new Set();
  for (const end of [id(cols - 1, v1), id(v2, rows - 1)]) { const p = route(id(0, fan), end); p.forEach(c => onPath.add(c)); for (let i = 0; i + 1 < p.length; i++) { const [ax, ay] = xy(p[i]), [bx, by] = xy(p[i + 1]); const d = DIRS.findIndex(v => v[0] === bx - ax && v[1] === by - ay); need[p[i]] |= 1 << d; need[p[i + 1]] |= 1 << opp(d); } }
  need[id(0, fan)] |= 8; need[id(cols - 1, v1)] |= 2; need[id(v2, rows - 1)] |= 4;
  const tiles = need.map((m, i) => { if (!m) return { i, need: 0, type: pick(['straight', 'corner', 'corner']), turns: rint(0, 3), clog: 0 }; const sh = shapeOf(m); return { i, need: m, type: sh.type, turns: rint(0, 3), clog: 0 }; });
  shuffle([...onPath].filter(c => c !== id(0, fan))).slice(0, TUNE.vent.clogs).forEach(c => { tiles[c].clog = 1; });
  return { cols, rows, fan, v1, v2, tiles, id, xy };
}

function evaluate(g) {
  const { cols, rows, fan, v1, v2, tiles, id } = g, m = t => rotM(BASE[t.type], t.turns);
  const air = new Set(), vents = new Set(), leaks = [], blocked = new Set(), q = [];
  const s0 = id(0, fan);
  const enter = c => { if (tiles[c].clog) { blocked.add(c); return; } if (!air.has(c)) { air.add(c); q.push(c); } };
  if (has(m(tiles[s0]), 3)) enter(s0);
  while (q.length) { const c = q.shift(), x = c % cols, y = Math.floor(c / cols), mk = m(tiles[c]);
    for (let d = 0; d < 4; d++) { if (!has(mk, d)) continue; const nx = x + DIRS[d][0], ny = y + DIRS[d][1];
      if (!(nx >= 0 && ny >= 0 && nx < cols && ny < rows)) { if (d === 1 && y === v1) vents.add('A'); else if (d === 2 && x === v2) vents.add('B'); else if (!(d === 3 && x === 0 && y === fan)) leaks.push([x, y, d]); continue; }
      const n = id(nx, ny); if (has(m(tiles[n]), opp(d))) enter(n); else leaks.push([x, y, d]); } }
  return { air, vents, leaks, blocked, solved: vents.size === 2 && !leaks.length };
}

export function mount(body, api) {
  let g; do { g = generate(TUNE.vent.cols, TUNE.vent.rows); } while (evaluate(g).solved);
  const { cols, rows } = g, W = cols * Z, H = rows * Z;
  const svg = s('svg', { class: 'mg-svg', viewBox: `-104 -14 ${W + 220} ${H + 80}` }, body);
  s('rect', { x: -4, y: -4, width: W + 8, height: H + 8, rx: 8, fill: '#08111a', stroke: C.line }, svg);
  // fan housing
  const fanG = s('g', { transform: `translate(-58,${g.fan * Z + Z / 2})` }, svg);
  s('circle', { r: 34, fill: C.fill, stroke: C.live, 'stroke-width': 2 }, fanG); const rotor = s('g', {}, fanG);
  for (let k = 0; k < 5; k++) s('path', { d: 'M0 0 Q 10 -14 0 -28 Q -8 -14 0 0', fill: '#5f7a92', transform: `rotate(${k * 72})` }, rotor);
  s('text', { y: 50, 'text-anchor': 'middle', fill: C.sub, 'font-size': 10, 'font-family': 'monospace', text: 'SUPPLY FAN' }, fanG);
  s('rect', { x: -24, y: g.fan * Z + Z / 2 - 9, width: 24, height: 18, fill: '#1c3245' }, svg);
  const vent = (x, y, label, vertical) => { const gg = s('g', { transform: `translate(${x},${y})` }, svg);
    const r = s('rect', { x: vertical ? -30 : 0, y: vertical ? 0 : -24, width: vertical ? 60 : 36, height: vertical ? 30 : 48, rx: 4, fill: C.fill, stroke: C.line, 'stroke-width': 2 }, gg);
    for (let k = -2; k <= 2; k++) s('line', vertical ? { x1: k * 9, y1: 6, x2: k * 9, y2: 24, stroke: C.idle, 'stroke-width': 2 } : { x1: 6, y1: k * 8, x2: 30, y2: k * 8, stroke: C.idle, 'stroke-width': 2 }, gg);
    s('text', { x: vertical ? 0 : 18, y: vertical ? 46 : 38, 'text-anchor': 'middle', fill: C.sub, 'font-size': 10, 'font-family': 'monospace', text: label }, gg); return r; };
  const ventA = vent(W + 4, g.v1 * Z + Z / 2, 'VENT A', false), ventB = vent(g.v2 * Z + Z / 2, H + 4, 'VENT B', true);
  const puffs = s('g', {}, null);
  const els = g.tiles.map(t => {
    const [x, y] = g.xy(t.i), gg = s('g', { transform: `translate(${x * Z},${y * Z})`, class: 'mg-click' }, svg);
    s('rect', { x: 1.5, y: 1.5, width: Z - 3, height: Z - 3, rx: 5, fill: '#0c1620', stroke: '#15273a' }, gg);
    const rotG = s('g', { class: 'mg-tile' }, gg); s('rect', { width: Z, height: Z, fill: 'none' }, rotG);
    const d = armsPath(BASE[t.type], Z);
    s('path', { d, stroke: '#2a3d50', 'stroke-width': 22, 'stroke-linecap': 'butt', fill: 'none' }, rotG); s('rect', { x: Z / 2 - 11, y: Z / 2 - 11, width: 22, height: 22, fill: '#2a3d50' }, rotG);   // ducts end flush with the tile
    const inner = s('path', { d, stroke: '#3a5068', 'stroke-width': 14, 'stroke-linecap': 'butt', fill: 'none' }, rotG); const hub = s('rect', { x: Z / 2 - 7, y: Z / 2 - 7, width: 14, height: 14, fill: '#3a5068' }, rotG);
    const flow = s('path', { d, stroke: '#e8f6ff', 'stroke-width': 3, 'stroke-dasharray': '2 9', 'stroke-linecap': 'round', fill: 'none', class: 'mg-flow slow', opacity: 0 }, rotG);
    const clog = s('g', {}, gg); s('rect', { x: 8, y: 8, width: Z - 16, height: Z - 16, rx: 4, fill: '#3b3326', 'fill-opacity': .55, stroke: C.warn, 'stroke-dasharray': '3 3' }, clog);
    s('text', { x: Z / 2, y: Z / 2 + 3, 'text-anchor': 'middle', fill: C.warn, 'font-size': 9, 'font-family': 'monospace', text: 'BLOCKED' }, clog);
    const ring = s('circle', { cx: Z / 2, cy: Z / 2, r: 22, fill: 'none', stroke: C.live, 'stroke-width': 4, 'stroke-dasharray': '0 200', transform: `rotate(-90 ${Z / 2} ${Z / 2})` }, clog);
    s('text', { x: Z / 2, y: Z - 9, 'text-anchor': 'middle', fill: C.sub, 'font-size': 7.5, 'font-family': 'monospace', text: 'HOLD' }, clog);
    let holding = false, hp = 0;
    gg.addEventListener('pointerdown', e => { if (t.clog && api.live()) { holding = true; e.preventDefault(); } });
    const up = () => { holding = false; }; gg.addEventListener('pointerup', up); gg.addEventListener('pointerleave', up);
    gg.addEventListener('click', () => { if (!api.live() || t.clog) return; t.turns++; draw(); });
    api.frame(dt => { if (!t.clog) return; hp = holding ? hp + dt * 1000 : Math.max(0, hp - dt * 1500); ring.setAttribute('stroke-dasharray', `${hp / TUNE.vent.clearMs * 138} 200`);
      if (hp >= TUNE.vent.clearMs) { t.clog = 0; holding = false; draw(); } });
    return { gg, rotG, inner, hub, flow, clog };
  });
  svg.appendChild(puffs);
  let spin = 0, flowFrac = 0, result = evaluate(g);
  api.frame(dt => { flowFrac += ((result.vents.size / 2) - flowFrac) * Math.min(1, dt * 2); spin += dt * (60 + 600 * flowFrac); rotor.setAttribute('transform', `rotate(${spin})`); });
  function draw() {
    const r = result = evaluate(g);
    g.tiles.forEach((t, k) => { const e = els[k]; e.rotG.style.transform = `rotate(${t.turns * 90}deg)`; const on = r.air.has(t.i);
      e.inner.setAttribute('stroke', on ? '#2f6f8f' : '#3a5068'); e.hub.setAttribute('fill', on ? '#2f6f8f' : '#3a5068'); e.flow.setAttribute('opacity', on ? .85 : 0); e.clog.style.display = t.clog ? '' : 'none'; });
    ventA.setAttribute('stroke', r.vents.has('A') ? C.ok : C.line); ventB.setAttribute('stroke', r.vents.has('B') ? C.ok : C.line);
    puffs.replaceChildren(); r.leaks.forEach(([x, y, d]) => { const cx = x * Z + Z / 2 + DIRS[d][0] * Z / 2, cy = y * Z + Z / 2 + DIRS[d][1] * Z / 2; for (let k = 0; k < 3; k++) s('circle', { cx: cx + DIRS[d][0] * k * 6, cy: cy + DIRS[d][1] * k * 6, r: 4 - k, fill: '#dff4ff', class: 'mg-pulse', opacity: .8 - k * .2 }, puffs); });
    const pressure = Math.max(0, 100 - r.leaks.length * 20);
    api.progress(r.vents.size / 2 * pressure / 100);
    if (r.blocked.size && !r.vents.size) api.status(`Airflow stopped at a blocked duct. Hold it to clear the debris.`, 'warn');
    else if (r.leaks.length) api.status(`AIR LEAK: ${r.leaks.length} open duct end(s), pressure ${pressure}%. Vents fed: ${r.vents.size}/2`, 'bad');
    else api.status(`Vents fed: ${r.vents.size}/2 · duct pressure ${pressure}%`, r.vents.size ? 'info' : 'warn');
    if (r.solved) api.complete('Airflow restored', 'Both grow-bay vents have full air pressure.');
  }
  draw();
  const sleep = ms => new Promise(r => setTimeout(r, ms)), ev = (el, ty) => el.dispatchEvent(ty === 'click' ? new MouseEvent('click', { bubbles: true }) : new PointerEvent(ty, { bubbles: true }));
  return { test: {
    wrong() { const t = g.tiles.find(t => t.need && !t.clog); const before = t.turns; ev(els[t.i].gg, 'click'); const st = document.querySelector('.mg-status').textContent; while ((t.turns - before) % 4) ev(els[t.i].gg, 'click'); return st; },
    async solve() { let n = 0;
      for (const t of g.tiles) if (t.clog) { ev(els[t.i].gg, 'pointerdown'); await sleep(TUNE.vent.clearMs + 250); ev(els[t.i].gg, 'pointerup'); n++; }
      for (const t of g.tiles) if (t.need) { let k = 0; while (rotM(BASE[t.type], t.turns) !== t.need && k++ < 4) { ev(els[t.i].gg, 'click'); n++; } }
      return n; } } };
}
