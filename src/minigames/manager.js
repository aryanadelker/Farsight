// Minigame manager: one shared panel, one active task at a time.
// A game module exports { mount(body, api, task) } and returns { destroy?(), test? }.
// The manager owns every timer and frame callback a game registers, so closing always cleans up.
import { h } from './kit.js';

const GAMES = {};
export const register = (id, mod) => { GAMES[id] = mod; };
const hooks = { open() { }, close() { } };
export const configure = o => Object.assign(hooks, o);

let root = null, ui = null, session = null, last = 0;
export const isOpen = () => !!session;
export const current = () => session;

function build() {
  root = h('div', { id: 'mg' }, document.body);
  root.innerHTML = `<div class="mg-panel" role="dialog" aria-modal="true">
   <div class="mg-head"><span class="mg-code"></span><div class="mg-hd"><div class="mg-title"></div><div class="mg-where"></div></div>
    <button class="mg-x" type="button" title="Close (Esc)">CLOSE ✕</button></div>
   <div class="mg-obj"></div>
   <div class="mg-body"></div>
   <div class="mg-foot"><span class="mg-dot"></span><span class="mg-status"></span><span class="mg-bar"><b></b></span></div>
   <div class="mg-done"><div class="mg-done-box"><div class="mg-done-k">TASK COMPLETE</div><div class="mg-done-t"></div><div class="mg-done-s"></div>
    <button class="mg-btn mg-continue" type="button">Continue</button></div></div></div>`;
  const q = c => root.querySelector(c);
  ui = { code: q('.mg-code'), title: q('.mg-title'), where: q('.mg-where'), obj: q('.mg-obj'), body: q('.mg-body'), status: q('.mg-status'), foot: q('.mg-foot'), bar: q('.mg-bar b'), done: q('.mg-done'), doneT: q('.mg-done-t'), doneS: q('.mg-done-s') };
  q('.mg-x').addEventListener('click', () => close(true));
  q('.mg-continue').addEventListener('click', () => close(true));
  // added once, for the whole page
  addEventListener('keydown', e => { if (session && e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(false); } }, true);
  const tick = t => { requestAnimationFrame(tick); const dt = Math.min((t - last) / 1000, .05); last = t; if (session) for (const f of [...session.frames]) f(dt, t / 1000); };
  requestAnimationFrame(tick);
}

function setStatus(text, kind = 'info') { ui.status.textContent = text; ui.foot.dataset.kind = kind; }

function start(task, cb, mountFn) {
  if (session) return false;                       // never two at once
  if (!root) build();
  const s = { task, cb, done: false, timers: new Set(), frames: new Set(), ctl: {} };
  session = s;
  ui.code.textContent = task.code || 'TASK'; ui.title.textContent = task.title; ui.where.textContent = task.where || '';
  ui.obj.textContent = task.objective || ''; ui.body.replaceChildren(); ui.done.classList.remove('show');
  setStatus('Awaiting input'); ui.bar.style.width = '0%';
  root.classList.add('open'); hooks.open(task);
  const live = () => session === s && !s.done;
  const api = {
    task, live,
    status: (t, k) => { if (session === s) setStatus(t, k); },
    progress: f => { if (session === s) ui.bar.style.width = Math.round(Math.max(0, Math.min(1, f)) * 100) + '%'; },
    every: (fn, ms) => { const id = setInterval(fn, ms); s.timers.add(() => clearInterval(id)); },
    after: (fn, ms) => { const id = setTimeout(fn, ms); s.timers.add(() => clearTimeout(id)); },
    frame: fn => { s.frames.add(fn); return () => s.frames.delete(fn); },
    milestone: name => { if (session === s && s.cb.onMilestone) s.cb.onMilestone(name); },
    // success is registered exactly once, and only from inside a live session
    complete: (title, sub) => {
      if (!live()) return false; s.done = true;
      setStatus(title || 'System restored', 'ok'); ui.bar.style.width = '100%';
      const extra = s.cb.onSuccess ? s.cb.onSuccess() : '';
      ui.doneT.textContent = title || 'System restored'; ui.doneS.textContent = [sub, extra].filter(Boolean).join(' ');
      api.after(() => ui.done.classList.add('show'), 900);
      return true;
    }
  };
  s.ctl = mountFn(ui.body, api, task) || {};
  return true;
}

export function open(task, cb = {}) {
  const mod = GAMES[task.game]; if (!mod) { console.error('No minigame', task.game); return false; }
  return start(task, cb, mod.mount);
}

// "Task unavailable" panel: same frame, lists what is missing.
export function openLocked(task, reasons, note) {
  return start({ ...task, objective: note || 'This task is not available yet. Complete the items marked ✕ first.' }, {}, (body, api) => {
    const box = h('div', { class: 'mg-locked' }, body);
    h('div', { class: 'mg-locked-k', text: 'PREREQUISITES' }, box);
    reasons.forEach(r => { const row = h('div', { class: 'mg-req ' + (r.ok ? 'ok' : 'no') }, box); h('span', { text: r.ok ? '✓' : '✕' }, row); h('span', { text: r.label }, row); });
    api.status('Task locked: ' + reasons.filter(r => !r.ok).length + ' item(s) missing', 'warn');
  });
}

export function close(byClick) {
  if (!session) return;
  const s = session; session = null;
  s.timers.forEach(f => f()); s.timers.clear(); s.frames.clear();
  if (s.ctl.destroy) s.ctl.destroy();
  ui.body.replaceChildren(); ui.done.classList.remove('show'); root.classList.remove('open');
  if (!s.done && s.cb.onCancel) s.cb.onCancel();
  hooks.close({ task: s.task, done: s.done, byClick });
}
