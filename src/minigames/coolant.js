/* SI generated: written with Claude (an AI assistant) for the Farsight team. See SI_DISCLOSURE.md. */
// MINIGAME 6: Coolant Circulation.
// Open/close valves and turn the three-way diverters so coolant runs ONE loop: pump -> every heat exchanger -> radiator -> pump.
// Open bypasses split the flow, an open drain leaks, a wrong diverter dead-ends the flow. Temperatures only fall on a good loop.
import { h, s, C } from './kit.js';

const NODES = { A: [150, 110, 'start'], B: [270, 110], Bt: [270, 38], Ct: [480, 38], C: [480, 110], D: [630, 110], E: [730, 110, 'div'], T: [730, 32, 'end', 'EXPANSION TANK'],
  F: [730, 300], G: [560, 300, 'div'], G2: [560, 382, 'end', 'SPARE LOOP (capped)'], H: [270, 300], Dr: [270, 382, 'drain', 'DRAIN'], Z: [150, 300, 'stop'] };
// [from, to, kind, label, valve id]
const SEGS = [['A', 'B'], ['B', 'C', 'hx', 'HX-1 POWER ELECTRONICS', 'V1'], ['B', 'Bt'], ['Bt', 'Ct', null, null, 'V2'], ['Ct', 'C'], ['C', 'D', 'hx', 'HX-2 LIFE SUPPORT', 'V3'],
  ['D', 'E'], ['E', 'T'], ['E', 'F', 'rad', 'RADIATOR'], ['F', 'G'], ['G', 'G2'], ['G', 'H', 'hx', 'HX-3 COMMS', 'V4'], ['H', 'Z'], ['B', 'H', null, null, 'V6'], ['H', 'Dr', null, null, 'V5']];
const RIGHT = { V1: 1, V2: 0, V3: 1, V4: 1, V5: 0, V6: 0 };
const VNAME = { V1: 'HX-1 inlet', V2: 'HX-1 bypass', V3: 'HX-2 inlet', V4: 'HX-3 inlet', V5: 'drain', V6: 'cross-tie' };
// diverter options: which two neighbour nodes are joined
const DIV = { E: [['D', 'F'], ['D', 'T'], ['T', 'F']], G: [['F', 'H'], ['F', 'G2'], ['G2', 'H']] };

export function mount(body, api) {
  const valve = {}, div = { E: 0, G: 0 };
  do { for (const v in RIGHT) valve[v] = Math.random() < .5 ? 1 : 0; div.E = Math.floor(Math.random() * 3); div.G = Math.floor(Math.random() * 3); } while (solve().ok);
  const temps = { 'HX-1': 84 + Math.random() * 8, 'HX-2': 80 + Math.random() * 8, 'HX-3': 86 + Math.random() * 8 };
  const row = h('div', { class: 'mg-row' }, body);
  const card = h('div', { class: 'mg-card', style: 'flex:3 1 520px;padding:6px' }, row);
  const svg = s('svg', { class: 'mg-svg', viewBox: '40 0 800 420' }, card);
  const side = h('div', { class: 'mg-card', style: 'flex:1 1 200px' }, row); h('div', { class: 'mg-k', text: 'HEAT EXCHANGER TEMPERATURE' }, side);
  const tbars = Object.keys(temps).map(k => { const w = h('div', { class: 'mg-read' }, side); h('div', { class: 'mg-read-l', text: k }, w); const v = h('div', { class: 'mg-read-v' }, w); const tr = h('div', { class: 'mg-track' }, w);
    const band = h('i', { class: 'mg-band' }, tr); band.style.left = '0%'; band.style.width = '30%'; const mk = h('b', { class: 'mg-mark' }, tr); return { k, w, v, mk }; });
  h('div', { class: 'mg-read-l', text: 'Green = safe (below 30 °C). Scale 0–100 °C.', style: 'font-size:11px;margin-top:6px' }, side);
  const segEls = SEGS.map(([a, b, kind, label, v]) => {
    const [x1, y1] = NODES[a], [x2, y2] = NODES[b];
    s('line', { x1, y1, x2, y2, stroke: '#1f3346', 'stroke-width': 16, 'stroke-linecap': 'round' }, svg);
    const inner = s('line', { x1, y1, x2, y2, stroke: '#2b4560', 'stroke-width': 9, 'stroke-linecap': 'round' }, svg);
    const flow = s('line', { x1, y1, x2, y2, stroke: '#9fe7ff', 'stroke-width': 3, 'stroke-dasharray': '6 9', class: 'mg-flow', opacity: 0 }, svg);
    return { inner, flow, kind, label, v, mid: [(x1 + x2) / 2, (y1 + y2) / 2], vert: x1 === x2 };
  });
  // components on top of pipes
  segEls.forEach(sg => {
    const [mx, my] = sg.mid;
    if (sg.kind === 'hx' || sg.kind === 'rad') {
      const vx = sg.v ? (sg.vert ? mx : mx + 46) : mx, vy = sg.v ? (sg.vert ? my + 46 : my) : my;
      const bx = sg.v ? (sg.vert ? mx : mx - 24) : mx, by = sg.v ? (sg.vert ? my - 24 : my) : my;
      const gg = s('g', { transform: `translate(${bx},${by})${sg.vert ? ' rotate(90)' : ''}` }, svg);
      s('rect', { x: -40, y: -17, width: 80, height: 34, rx: 4, fill: C.fill, stroke: C.line, 'stroke-width': 2 }, gg);
      if (sg.kind === 'hx') s('path', { d: 'M-30 0 L-22 -10 L-12 10 L-2 -10 L8 10 L18 -10 L28 0', stroke: '#ffb070', 'stroke-width': 2.5, fill: 'none' }, gg);
      else for (let k = -30; k <= 30; k += 8) s('line', { x1: k, y1: -13, x2: k, y2: 13, stroke: '#7fa8d8', 'stroke-width': 2 }, gg);
      sg.box = gg.firstChild;
      s('text', { x: sg.vert ? bx + 30 : bx, y: sg.vert ? by + 4 : by - 24, 'text-anchor': sg.vert ? 'start' : 'middle', fill: C.sub, 'font-size': 10.5, 'font-family': 'monospace', text: sg.label }, svg);
      if (sg.v) sg.vpos = [vx, vy];
    } else if (sg.v) sg.vpos = [mx, my];
    if (sg.v) {
      const [vx, vy] = sg.vpos, gg = s('g', { transform: `translate(${vx},${vy})${sg.vert ? ' rotate(90)' : ''}`, class: 'mg-click' }, svg);
      s('circle', { r: 19, fill: 'transparent' }, gg);
      const body_ = s('path', { d: 'M-14 -10 L0 0 L-14 10 Z M14 -10 L0 0 L14 10 Z', stroke: C.text, 'stroke-width': 1.5 }, gg);
      const handle = s('line', { x1: 0, y1: 0, x2: 0, y2: -16, stroke: C.text, 'stroke-width': 3, 'stroke-linecap': 'round' }, gg);
      s('text', { x: sg.vert ? vx + 24 : vx, y: sg.vert ? vy + 4 : vy + 32, 'text-anchor': sg.vert ? 'start' : 'middle', fill: C.sub, 'font-size': 10, 'font-family': 'monospace', text: sg.v }, svg);
      gg.addEventListener('click', () => { if (!api.live()) return; valve[sg.v] ^= 1; draw(); });
      sg.vel = { gg, body_, handle };
    }
  });
  // nodes: pump, ends, diverters
  const pump = s('g', { transform: 'translate(92,205)' }, svg); s('circle', { r: 34, fill: C.fill, stroke: C.live, 'stroke-width': 2 }, pump);
  const rotor = s('path', { d: 'M0 -24 L6 0 L0 24 L-6 0Z M-24 0 L0 -6 L24 0 L0 6Z', fill: '#4f6d88' }, pump);
  s('text', { x: -44, y: 0, 'text-anchor': 'middle', fill: C.sub, 'font-size': 10.5, 'font-family': 'monospace', text: 'COOLANT PUMP', transform: 'rotate(-90 -44 0)' }, pump);
  s('path', { d: 'M92 171 L92 110 L150 110 M92 239 L92 300 L150 300', stroke: '#2b4560', 'stroke-width': 9, fill: 'none' }, svg);
  s('text', { x: 100, y: 102, fill: C.sub, 'font-size': 10, 'font-family': 'monospace', text: 'OUT' }, svg); s('text', { x: 100, y: 318, fill: C.sub, 'font-size': 10, 'font-family': 'monospace', text: 'IN' }, svg);
  const stopMark = s('circle', { r: 13, fill: 'none', stroke: C.bad, 'stroke-width': 3, class: 'mg-pulse', opacity: 0 }, null);
  const divEls = {};
  for (const n in NODES) { const [x, y, t, lab] = NODES[n];
    if (t === 'end' || t === 'drain') { s('rect', { x: x - 16, y: y - 12, width: 32, height: 24, rx: 4, fill: t === 'drain' ? '#2a1a12' : C.fill, stroke: t === 'drain' ? '#a8642e' : C.line, 'stroke-width': 2 }, svg); s('text', { x: x + 22, y: y + 4, fill: C.sub, 'font-size': 10, 'font-family': 'monospace', text: lab }, svg); }
    if (t === 'div') { const gg = s('g', { transform: `translate(${x},${y})`, class: 'mg-click' }, svg); s('circle', { r: 21, fill: '#0b151f', stroke: C.warn, 'stroke-width': 2 }, gg);
      const path = s('path', { stroke: C.warn, 'stroke-width': 7, fill: 'none', 'stroke-linecap': 'round' }, gg);
      s('text', { x: n === 'E' ? -30 : 0, y: n === 'E' ? 36 : -30, 'text-anchor': 'middle', fill: C.warn, 'font-size': 10, 'font-family': 'monospace', text: 'DIVERTER ' + n }, gg);
      gg.addEventListener('click', () => { if (!api.live()) return; div[n] = (div[n] + 1) % 3; draw(); }); divEls[n] = path; } }
  svg.appendChild(stopMark);

  // ---- flow analysis ----
  function active() {   // edges that can carry flow right now
    return SEGS.map(([a, b, , , v], i) => ({ a, b, i, on: (!v || valve[v]) && okAt(a, b) && okAt(b, a) })).filter(e => e.on);
  }
  function okAt(n, other) { if (!DIV[n]) return true; return DIV[n][div[n]].includes(other); }
  function solve() {
    let E = active(); const deg = n => E.filter(e => e.a === n || e.b === n).length;
    const drainOpen = valve.V5 && E.some(e => e.b === 'Dr' || e.a === 'Dr') && reach(E).has('Dr');
    // remove dead legs (stubs that end at a closed valve, a capped line or the tank) - stagnant but harmless
    for (let ch = true; ch;) { ch = false; for (const n in NODES) if (n !== 'A' && n !== 'Z' && deg(n) === 1) { E = E.filter(e => e.a !== n && e.b !== n); ch = true; } }
    const r = reach(E), nodes = [...r];
    // follow the flow from the pump while it has exactly one way to go
    const path = [], seen = new Set(['A']); let cur = 'A', stop = null, why = '';
    for (let k = 0; k < 40; k++) { const nx = E.filter(e => (e.a === cur || e.b === cur) && !path.includes(e.i)); if (cur === 'Z') break;
      if (nx.length === 0) { stop = cur; why = 'Flow is blocked'; break; } if (nx.length > 1) { stop = cur; why = 'Flow splits here'; break; }
      path.push(nx[0].i); cur = nx[0].a === cur ? nx[0].b : nx[0].a; if (seen.has(cur)) { stop = cur; why = 'Flow loops back on itself'; break; } seen.add(cur); }
    const loop = cur === 'Z' && !stop && nodes.every(n => n === 'A' || n === 'Z' ? deg(n) === 1 : deg(n) === 2);
    const kinds = path.map(i => SEGS[i][3]).filter(Boolean), missing = ['HX-1 POWER ELECTRONICS', 'HX-2 LIFE SUPPORT', 'HX-3 COMMS', 'RADIATOR'].filter(l => !kinds.includes(l));
    return { path, stop, why, loop, missing, drainOpen, ok: loop && !missing.length && !drainOpen };
  }
  function reach(E) { const r = new Set(['A']), q = ['A']; while (q.length) { const c = q.shift(); for (const e of E) { const o = e.a === c ? e.b : e.b === c ? e.a : null; if (o && !r.has(o)) { r.add(o); q.push(o); } } } return r; }
  let res = solve(), spin = 0;
  function draw() {
    res = solve();
    segEls.forEach((sg, i) => { const on = res.path.includes(i); sg.flow.setAttribute('opacity', on ? .9 : 0); sg.inner.setAttribute('stroke', on ? '#2f6f8f' : '#2b4560');
      if (sg.box) sg.box.setAttribute('stroke', on ? C.live : C.line);
      if (sg.vel) { const o = valve[sg.v]; sg.vel.body_.setAttribute('fill', o ? C.live : '#3a4654'); sg.vel.handle.setAttribute('transform', o ? 'rotate(90)' : ''); sg.vel.handle.setAttribute('stroke', o ? C.live : C.bad); } });
    for (const n in DIV) { const [x, y] = NODES[n], pts = DIV[n][div[n]].map(o => { const [ox, oy] = NODES[o], d = Math.hypot(ox - x, oy - y); return [(ox - x) / d * 17, (oy - y) / d * 17]; });
      divEls[n].setAttribute('d', `M${pts[0][0]} ${pts[0][1]} L0 0 L${pts[1][0]} ${pts[1][1]}`); }
    if (res.stop && !res.ok) { const [x, y] = NODES[res.stop]; stopMark.setAttribute('cx', x); stopMark.setAttribute('cy', y); stopMark.setAttribute('opacity', 1); } else stopMark.setAttribute('opacity', 0);
    if (res.drainOpen) api.status('LEAK: the drain valve V5 is open and coolant is draining overboard.', 'bad');
    else if (res.stop) api.status(`${res.why} at the marked junction. Check ${hintFor(res.stop)}.`, 'bad');
    else if (res.missing.length) api.status(`Loop closed but it bypasses: ${res.missing.join(', ')}.`, 'warn');
    else api.status('Loop closed through every exchanger and the radiator. Cooling…', 'ok');
  }
  const hintFor = n => ({ A: 'the valves after the pump', B: 'the HX-1 bypass and the cross-tie', Bt: 'the HX-1 bypass', Ct: 'the HX-1 bypass', C: 'HX-1 and HX-2 valves', D: 'HX-2', E: 'diverter E', T: 'diverter E', F: 'the radiator line', G: 'diverter G', G2: 'diverter G', H: 'HX-3, the cross-tie and the drain', Dr: 'the drain' }[n] || 'the valves');
  api.frame(dt => {
    let all = true;
    for (const k in temps) { const cooled = res.ok; temps[k] += cooled ? (19 - temps[k]) * dt * .55 : (95 - temps[k]) * dt * .02; if (temps[k] > 30) all = false; }
    tbars.forEach(b => { const v = temps[b.k]; b.v.textContent = v.toFixed(1) + ' °C'; b.mk.style.left = Math.min(100, v) + '%'; b.w.classList.toggle('ok', v <= 30); });
    spin += dt * (res.ok ? 540 : res.path.length ? 200 : 40); rotor.setAttribute('transform', `rotate(${spin})`);
    api.progress(res.ok ? .6 + .4 * Object.values(temps).filter(v => v <= 30).length / 3 : Math.min(.55, res.path.length / 12));
    if (res.ok && all) api.complete('Coolant circulation restored', 'All three heat exchangers are back below 30 °C.');
  });
  draw();
  const clk = el => el.dispatchEvent(new MouseEvent('click', { bubbles: true })), sleep = ms => new Promise(r => setTimeout(r, ms));
  const vEl = v => segEls.find(sg => sg.v === v).vel.gg, dEl = n => divEls[n].parentNode;
  return { test: {
    wrong() { const was = valve.V5; if (!was) clk(vEl('V5')); const st = document.querySelector('.mg-status').textContent; if (!was) clk(vEl('V5')); return st; },
    async solve() { let n = 0; for (const v in RIGHT) if (valve[v] !== RIGHT[v]) { clk(vEl(v)); n++; } while (div.E !== 0) { clk(dEl('E')); n++; } while (div.G !== 0) { clk(dEl('G')); n++; }
      for (let i = 0; i < 200 && api.live(); i++) await sleep(50); return n; } } };
}
