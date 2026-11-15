// Small shared helpers for the minigame interfaces.
export const SVGNS = 'http://www.w3.org/2000/svg';
export const C = { line: '#23415c', dim: '#2b3e53', idle: '#566a80', live: '#5ec8ff', ok: '#5ef0a0', warn: '#ffc857', bad: '#ff6b6b', text: '#dfe8f2', sub: '#7f97ad', fill: '#0d1824', fill2: '#112131' };
// h('div', {class, text, style, on:{click}}, parent)
export function h(tag, p = {}, parent) {
  const e = document.createElement(tag);
  for (const k in p) { const v = p[k]; if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else if (k === 'html') e.innerHTML = v; else if (k === 'on') for (const ev in v) e.addEventListener(ev, v[ev]); else if (k === 'style') e.style.cssText = v; else e.setAttribute(k, v); }
  if (parent) parent.appendChild(e); return e;
}
export function s(tag, p = {}, parent) {
  const e = document.createElementNS(SVGNS, tag);
  for (const k in p) { const v = p[k]; if (k === 'text') e.textContent = v; else if (k === 'on') for (const ev in v) e.addEventListener(ev, v[ev]); else if (k === 'class') e.setAttribute('class', v); else e.setAttribute(k, v); }
  if (parent) parent.appendChild(e); return e;
}
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
export const pick = a => a[Math.floor(Math.random() * a.length)];
export const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
// grid pipes: bit 0 = N, 1 = E, 2 = S, 3 = W
export const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
export const opp = d => (d + 2) % 4;
export const rotM = (m, n = 1) => { for (let i = 0; i < ((n % 4) + 4) % 4; i++) m = ((m << 1) | (m >> 3)) & 15; return m; };
export const has = (m, d) => !!(m & (1 << d));
export const BASE = { stub: 1, straight: 5, corner: 3, tee: 7, cross: 15 };
export function shapeOf(mask) { for (const t in BASE) for (let r = 0; r < 4; r++) if (rotM(BASE[t], r) === mask) return { type: t, rot: r }; return null; }
// path from tile centre to each open side (tile size z)
export function armsPath(mask, z) { const c = z / 2; let d = ''; for (let k = 0; k < 4; k++) if (has(mask, k)) d += `M${c} ${c}L${c + DIRS[k][0] * c} ${c + DIRS[k][1] * c}`; return d; }
// simple horizontal readout bar with a target band
export function bandBar(parent, label, unit) {
  const w = h('div', { class: 'mg-read' }, parent); h('div', { class: 'mg-read-l', text: label }, w);
  const v = h('div', { class: 'mg-read-v', text: '--' }, w); const t = h('div', { class: 'mg-track' }, w);
  const band = h('i', { class: 'mg-band' }, t), mark = h('b', { class: 'mg-mark' }, t);
  return { set(x, lo, hi, txt) { band.style.left = lo * 100 + '%'; band.style.width = (hi - lo) * 100 + '%'; mark.style.left = clamp(x, 0, 1) * 100 + '%'; const ok = x >= lo && x <= hi; w.classList.toggle('ok', ok); v.textContent = txt + (unit ? ' ' + unit : ''); return ok; } };
}
