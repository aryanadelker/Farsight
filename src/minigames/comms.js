/* SI generated: written with Claude (an AI assistant) for the Farsight team. See SI_DISCLOSURE.md. */
// MINIGAME 8: Communications Restoration (final task).
// One chain: lock the carrier -> sync the waveform -> build link strength (orbital station handshake) -> rebuild lost packets from Earth.
import { h, s, C, clamp, shuffle } from './kit.js';
import { TUNE } from '../../data/tasks_data.js';

const STAGES = ['1 · CARRIER LOCK', '2 · WAVEFORM SYNC', '3 · LINK STRENGTH', '4 · PACKET RECOVERY'];
const MSG = ['SELENE BASE,', 'THIS IS EARTH', 'MISSION CONTROL.', 'WE READ YOU', 'LOUD AND CLEAR.', 'ALL FOUR CREW', 'STATUS RECEIVED.', 'WE ARE WITH YOU.'];
const crc = t => { let x = 0x1d0f; for (const ch of t) x = ((x << 5) ^ (x >> 2) ^ ch.charCodeAt(0)) & 0xffff; return x.toString(16).toUpperCase().padStart(4, '0'); };
const garble = t => t.replace(/[AEIOR]/g, c => Math.random() < .5 ? '#' : c === 'O' ? '0' : c).replace(/ /, '  ');

export function mount(body, api) {
  const lockNeed = TUNE.comms.lockSec;
  let stage = 0, hold = 0, t = 0, view = null;
  const steps = h('div', { class: 'mg-steps' }, body), stepEls = STAGES.map(n => h('div', { class: 'mg-step', text: n }, steps));
  const row = h('div', { class: 'mg-row' }, body);
  const main = h('div', { class: 'mg-card', style: 'flex:2 1 440px' }, row);
  const side = h('div', { class: 'mg-card', style: 'flex:1 1 230px;display:flex;flex-direction:column;gap:8px' }, row);
  h('div', { class: 'mg-k', text: 'LINK STATUS' }, side);
  const lamps = ['CARRIER', 'SYNC', 'LINK', 'STATION', 'EARTH'].map(n => { const r = h('div', { style: 'display:flex;gap:8px;align-items:center;font:11px monospace;color:#a9bccd' }, side); const l = h('span', { class: 'mg-lamp' }, r); h('span', { text: n }, r); return l; });
  h('div', { class: 'mg-k', text: 'MISSION LOG', style: 'margin-top:6px' }, side);
  const log = h('div', { class: 'mg-log', style: 'height:150px' }, side);
  const say = (txt, cls = '') => { const l = h('div', { class: cls, text: txt }, log); log.scrollTop = 1e6; return l; };
  say('Radio terminal powered. Antenna and transmitter report ready.'); say('Searching for the downlink carrier…', 'hi');

  function next() {
    lamps[stage].className = 'mg-lamp on'; stage++; hold = 0;
    stepEls.forEach((e, i) => { e.className = 'mg-step' + (i < stage ? ' done' : i === stage ? ' cur' : ''); });
    main.replaceChildren(); view = [carrier, wave, link, packets][stage]?.();
    api.progress(stage / 4 * .9);
  }
  // ---------- stage 1: carrier ----------
  function carrier() {
    const f0 = 2200, f1 = 2290, fc = +(2208 + Math.random() * 74).toFixed(2), spurs = [0, 1].map(() => { let f; do { f = 2203 + Math.random() * 84; } while (Math.abs(f - fc) < 9); return f; });
    h('div', { class: 'mg-k', text: 'RECEIVER SPECTRUM: tune onto the carrier (the narrow peak that breathes; spikes are interference)' }, main);
    const cv = h('canvas', { width: 640, height: 190, style: 'width:100%;background:#060c14;border:1px solid #16283a;border-radius:4px' }, main), g = cv.getContext('2d');
    const ctl = h('div', { style: 'display:flex;gap:8px;align-items:center;margin-top:8px' }, main);
    const sl = h('input', { type: 'range', min: f0, max: f1, step: .05, value: f0 + 5, class: 'mg-range', style: 'flex:1' }, ctl);
    const fine = d => () => { sl.value = clamp(+sl.value + d, f0, f1); };
    [['−0.1', -.1], ['+0.1', .1]].forEach(([l, d]) => h('button', { class: 'mg-btn', type: 'button', text: l, style: 'margin:0;padding:6px 10px' }, ctl).addEventListener('click', fine(d)));
    const rd = h('div', { class: 'mg-mono', style: 'margin-top:6px;font-size:13px;color:#5ec8ff' }, main);
    const spec = f => { let v = .08 + .9 * Math.exp(-((f - fc) ** 2) / .6) * (.85 + .15 * Math.sin(t * 2.4)); spurs.forEach(sp => { v += .55 * Math.exp(-((f - sp) ** 2) / .05); }); return v; };
    return { test: { fc, spurs, sl }, tick(dt) {
      const ft = +sl.value; g.clearRect(0, 0, 640, 190); g.strokeStyle = '#16283a'; for (let x = 0; x <= 640; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 190); g.stroke(); }
      g.beginPath(); for (let x = 0; x <= 640; x++) { const f = f0 + (f1 - f0) * x / 640, v = spec(f) + Math.random() * .05; g.lineTo(x, 180 - v * 160); } g.strokeStyle = '#7fa8d8'; g.stroke();
      const px = (ft - f0) / (f1 - f0) * 640; g.fillStyle = 'rgba(94,200,255,.15)'; g.fillRect(px - 6, 0, 12, 190); g.strokeStyle = '#5ec8ff'; g.beginPath(); g.moveTo(px, 0); g.lineTo(px, 190); g.stroke();
      const level = Math.exp(-((ft - fc) ** 2) / .6), onSpur = spurs.some(sp => Math.abs(ft - sp) < .4);
      rd.textContent = `RX ${ft.toFixed(2)} MHz · carrier level ${(level * 100).toFixed(0)}%`;
      if (Math.abs(ft - fc) < .25) { hold += dt; api.status(`Carrier found. Holding lock ${hold.toFixed(1)} / ${lockNeed} s`, 'ok'); }
      else { hold = 0; api.status(onSpur ? 'That spike is interference: no modulation on it. Keep searching.' : level > .2 ? 'Carrier close. Fine-tune with −0.1 / +0.1.' : 'No carrier at this frequency.', onSpur ? 'bad' : level > .2 ? 'info' : 'warn'); }
      if (hold >= lockNeed) { say(`Carrier locked at ${fc.toFixed(2)} MHz.`, 'ok'); say('Received waveform is drifting: Doppler shift from the station\'s orbit.', 'hi'); next(); } } };
  }
  // ---------- stage 2: waveform ----------
  function wave() {
    const ph = Math.random() * 300 + 30, dop = (Math.random() < .5 ? -1 : 1) * (.6 + Math.random() * 1.2);
    h('div', { class: 'mg-k', text: 'WAVEFORM: line the received signal (cyan) up with the reference pilot (grey)' }, main);
    const cv = h('canvas', { width: 640, height: 170, style: 'width:100%;background:#060c14;border:1px solid #16283a;border-radius:4px' }, main), g = cv.getContext('2d');
    const mk = (label, min, max, step, val) => { const r = h('div', { style: 'display:grid;grid-template-columns:120px 1fr 70px;gap:8px;align-items:center;margin-top:6px;font:11px monospace;color:#a9bccd' }, main);
      h('span', { text: label }, r); const i = h('input', { type: 'range', min, max, step, value: val, class: 'mg-range' }, r); const o = h('span', { style: 'color:#5ec8ff' }, r); return { i, o }; };
    const P = mk('PHASE (deg)', 0, 360, 1, 0), D = mk('DOPPLER COMP', -2, 2, .05, 0);
    const ref = x => Math.sin(x) * .6 + Math.sin(x * 2.3 + 1) * .3;
    return { test: { ph, dop, P, D }, tick(dt) {
      const dp = (+P.i.value - ph) * Math.PI / 180, dd = (+D.i.value - dop) * .06; P.o.textContent = (+P.i.value).toFixed(0) + '°'; D.o.textContent = (+D.i.value).toFixed(2);
      g.clearRect(0, 0, 640, 170); let sxy = 0, sxx = 0, syy = 0;
      const draw = (fn, col, dash) => { g.setLineDash(dash); g.beginPath(); for (let x = 0; x <= 640; x += 2) { const y = fn(x / 640 * 14); g.lineTo(x, 85 - y * 70); } g.strokeStyle = col; g.lineWidth = 2; g.stroke(); g.setLineDash([]); };
      const rx = u => ref(u * (1 + dd) + dp) + (Math.random() - .5) * .05;
      for (let k = 0; k <= 320; k++) { const u = k / 320 * 14, a = ref(u), b = rx(u); sxy += a * b; sxx += a * a; syy += b * b; }
      const corr = Math.max(0, sxy / Math.sqrt(sxx * syy));
      draw(ref, '#6b7d90', [5, 5]); draw(rx, corr > .96 ? '#5ef0a0' : '#5ec8ff', []);
      g.fillStyle = '#a9bccd'; g.font = '12px monospace'; g.fillText(`correlation ${(corr * 100).toFixed(1)}%`, 10, 18);
      if (corr > .96) { hold += dt; api.status(`Waveform in sync. Holding ${hold.toFixed(1)} / ${lockNeed} s`, 'ok'); } else { hold = 0; api.status(`Correlation ${(corr * 100).toFixed(0)}%: needs 96%. ${Math.abs(dd) > .02 ? 'The waves drift apart across the screen: adjust Doppler.' : 'Shift the phase.'}`, corr > .8 ? 'info' : 'warn'); }
      if (hold >= lockNeed) { say('Waveform synchronised, Doppler compensated.', 'ok'); say('Building link margin to the orbital relay station…', 'hi'); next(); } } };
  }
  // ---------- stage 3: link strength ----------
  function link() {
    const bx = .15 + Math.random() * .7, by = .15 + Math.random() * .7; let px = .5, py = .5;
    const wrap = h('div', { style: 'display:flex;gap:14px;flex-wrap:wrap;align-items:flex-start' }, main);
    const lft = h('div', {}, wrap); h('div', { class: 'mg-k', text: 'FINE POINTING (click or drag)' }, lft);
    const pad = s('svg', { viewBox: '0 0 200 200', style: 'width:220px;height:220px;background:#060c14;border:1px solid #16283a;border-radius:4px;cursor:crosshair;touch-action:none' }, lft);
    for (let q = 1; q < 4; q++) { s('line', { x1: q * 50, y1: 0, x2: q * 50, y2: 200, stroke: '#16283a' }, pad); s('line', { x1: 0, y1: q * 50, x2: 200, y2: q * 50, stroke: '#16283a' }, pad); }
    const ret = s('g', {}, pad); s('circle', { r: 10, fill: 'none', stroke: C.live, 'stroke-width': 2 }, ret); s('line', { x1: -16, y1: 0, x2: 16, y2: 0, stroke: C.live }, ret); s('line', { x1: 0, y1: -16, x2: 0, y2: 16, stroke: C.live }, ret);
    const aim = e => { const r = pad.getBoundingClientRect(); px = clamp((e.clientX - r.left) / r.width, 0, 1); py = clamp((e.clientY - r.top) / r.height, 0, 1); };
    let dragging = false; pad.addEventListener('pointerdown', e => { dragging = true; aim(e); }); pad.addEventListener('pointermove', e => { if (dragging) aim(e); }); pad.addEventListener('pointerup', () => { dragging = false; });
    const rgt = h('div', { style: 'flex:1;min-width:220px' }, wrap); h('div', { class: 'mg-k', text: 'TRANSMITTER' }, rgt);
    const pw = h('input', { type: 'range', min: 0, max: 100, step: 1, value: 25, class: 'mg-range' }, rgt); const pwo = h('div', { class: 'mg-mono', style: 'font-size:12px;color:#a9bccd;margin-bottom:8px' }, rgt);
    const bar = (l) => { const w = h('div', { class: 'mg-read' }, rgt); h('div', { class: 'mg-read-l', text: l }, w); const v = h('div', { class: 'mg-read-v' }, w); const tr = h('div', { class: 'mg-track' }, w); const b = h('i', { class: 'mg-band' }, tr); const m = h('b', { class: 'mg-mark' }, tr); return { w, v, b, m }; };
    const snr = bar('Link margin (signal to noise)'), dist = bar('Amplifier distortion'); snr.b.style.left = '70%'; snr.b.style.width = '30%'; dist.b.style.left = '0%'; dist.b.style.width = '25%';
    return { test: { bx, by, pad, pw }, tick(dt) {
      ret.setAttribute('transform', `translate(${px * 200},${py * 200})`);
      const p = +pw.value / 100, point = Math.exp(-(((px - bx) ** 2) + ((py - by) ** 2)) / .012), dis = clamp((p - .8) / .2, 0, 1);
      const m = clamp(point * (.35 + .75 * Math.min(p, .8)) * (1 - dis * .6) + Math.random() * .01, 0, 1);
      pwo.textContent = `TX power ${(p * 100).toFixed(0)}%` + (p > .8 ? ' · OVERDRIVE' : '');
      snr.m.style.left = m * 100 + '%'; snr.v.textContent = (m * 100).toFixed(0) + '%'; snr.w.classList.toggle('ok', m >= .7);
      dist.m.style.left = dis * 100 + '%'; dist.v.textContent = (dis * 100).toFixed(0) + '%'; dist.w.classList.toggle('ok', dis <= .25);
      ret.querySelector('circle').setAttribute('stroke', point > .6 ? C.ok : point > .2 ? C.warn : C.live);
      if (m >= .7 && dis <= .25) { hold += dt; api.status(`Link margin good. Holding ${hold.toFixed(1)} / ${lockNeed} s`, 'ok'); }
      else { hold = 0; api.status(dis > .25 ? 'Amplifier overdriven: the signal is distorted. Lower the TX power.' : point < .3 ? 'Weak signal: move the pointing reticle. The ring turns amber, then green, as you get close.' : 'Raise the TX power, but stay out of overdrive.', dis > .25 ? 'bad' : 'warn'); }
      if (hold >= lockNeed) { lamps[2].className = 'mg-lamp on'; say('ORBITAL RELAY STATION: handshake complete. We hear you, Selene.', 'ok'); api.milestone('station');
        lamps[3].className = 'mg-lamp on'; say('Relaying to Earth… data incoming. 3 packets lost in transit.', 'warn'); stage = 2; next(); } } };
  }
  // ---------- stage 4: packets ----------
  function packets() {
    const missing = shuffle([...MSG.keys()].slice(1)).slice(0, 3).sort((a, b) => a - b);
    const frags = shuffle([...missing.map(i => ({ i, txt: MSG[i], c: crc(MSG[i]), good: true })), ...shuffle([...missing]).slice(0, 2).map(i => { let g; do { g = garble(MSG[i]); } while (g === MSG[i]); return { i, txt: g, c: crc(g), good: false }; })]);
    h('div', { class: 'mg-k', text: 'RECEIVED STREAM: click a recovered fragment, then the gap it belongs to (sequence AND checksum must match)' }, main);
    const strm = h('div', {}, main), slots = {};
    MSG.forEach((m, i) => { const e = h('div', { class: 'mg-pkt' + (missing.includes(i) ? ' gap' : '') }, strm);
      if (missing.includes(i)) { e.textContent = `SEQ ${String(i + 1).padStart(2, '0')} · LOST · expected CRC ${crc(m)}`; slots[i] = e; e.addEventListener('click', () => fill(i)); }
      else e.textContent = `SEQ ${String(i + 1).padStart(2, '0')} · ${m}`; });
    h('div', { class: 'mg-k', text: 'RECOVERED FRAGMENTS (from the error-correction buffer)', style: 'margin-top:10px' }, main);
    const pool = h('div', {}, main); let sel = null; const done = new Set();
    const fEls = frags.map(f => { const e = h('div', { class: 'mg-frag', text: `SEQ ${String(f.i + 1).padStart(2, '0')} · CRC ${f.c} · "${f.txt}"` }, pool);
      e.addEventListener('click', () => { if (!api.live()) return; sel = sel === f ? null : f; fEls.forEach((x, k) => x.classList.toggle('sel', frags[k] === sel)); }); return e; });
    const out = h('div', { class: 'mg-mono', style: 'margin-top:10px;font-size:15px;color:#5ef0a0;min-height:22px' }, main);
    function fill(i) {
      if (!api.live() || !sel || done.has(i)) return; const f = sel, el = slots[i];
      if (f.i !== i || !f.good) { el.className = 'mg-pkt bad'; el.textContent = f.i !== i ? `SEQ ${String(i + 1).padStart(2, '0')} · REJECTED: sequence mismatch` : `SEQ ${String(i + 1).padStart(2, '0')} · REJECTED: CRC ${f.c} ≠ ${crc(MSG[i])} (corrupted copy)`;
        api.status(f.i !== i ? 'That fragment belongs to a different sequence number.' : 'Checksum mismatch: that copy is corrupted. Find the clean one.', 'bad');
        api.after(() => { if (!done.has(i)) { el.className = 'mg-pkt gap'; el.textContent = `SEQ ${String(i + 1).padStart(2, '0')} · LOST · expected CRC ${crc(MSG[i])}`; } }, 1300); }
      else { done.add(i); el.className = 'mg-pkt fill'; el.textContent = `SEQ ${String(i + 1).padStart(2, '0')} · ${MSG[i]}`; fEls[frags.indexOf(f)].classList.add('used'); api.status(`${done.size}/3 packets rebuilt`, 'info'); }
      sel = null; fEls.forEach(x => x.classList.remove('sel'));
      if (done.size === 3) { lamps[4].className = 'mg-lamp on'; stepEls[3].className = 'mg-step done'; say('All packets rebuilt. Message decoded.', 'ok'); say('CONTACT WITH EARTH RESTORED.', 'ok');
        let n = 0; const full = MSG.join(' '); api.every(() => { n = Math.min(full.length, n + 3); out.textContent = full.slice(0, n); }, 30);
        api.after(() => api.complete('Contact with Earth restored', `"${full}"`), 1600); }
    }
    api.status('Rebuild the 3 lost packets.', 'warn');
    return { test: { frags, missing, fEls, slots } };
  }
  stepEls[0].className = 'mg-step cur'; view = carrier();
  api.frame(dt => { t += dt; if (api.live() && view && view.tick) view.tick(dt); });
  // ---- test hooks ----
  const sleep = ms => new Promise(r => setTimeout(r, ms)), clk = el => el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  const setR = (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
  const waitStage = async n => { for (let i = 0; i < 200 && stage < n; i++) await sleep(50); };
  return { test: {
    async wrong() { setR(view.test.sl, view.test.spurs[0].toFixed(2)); await sleep(300); return document.querySelector('.mg-status').textContent; },
    async solve(log = []) {
      setR(view.test.sl, view.test.fc); await waitStage(1);
      setR(view.test.P.i, Math.round(view.test.ph)); setR(view.test.D.i, (Math.round(view.test.dop * 20) / 20).toFixed(2)); await waitStage(2);
      const r = view.test.pad.getBoundingClientRect(), ev = ty => view.test.pad.dispatchEvent(new PointerEvent(ty, { bubbles: true, clientX: r.left + view.test.bx * r.width, clientY: r.top + view.test.by * r.height }));
      ev('pointerdown'); ev('pointerup'); setR(view.test.pw, 72); await waitStage(3);
      const T = view.test, bad = T.frags.find(f => !f.good); clk(T.fEls[T.frags.indexOf(bad)]); clk(T.slots[bad.i]); log.push(document.querySelector('.mg-status').textContent);
      for (const i of T.missing) { const f = T.frags.find(f => f.i === i && f.good); clk(T.fEls[T.frags.indexOf(f)]); clk(T.slots[i]); }
      for (let i = 0; i < 100 && api.live(); i++) await sleep(50); return log; } } };
}
