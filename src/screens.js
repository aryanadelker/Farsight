/* SI generated: written with Claude (an AI assistant) for the Farsight team. See SI_DISCLOSURE.md. */
import { sourcesHTML } from './sourcesInfo.js';
// Title screen, cinematics (intro / ending / credits) and the menus around them.
// Videos are plain MP4 files in assets/video. If one cannot load, the game simply moves on.
const $ = id => document.getElementById(id);
let busy = false, onSkip = null;
export const active = () => busy;

// ---------- video player ----------
export function play(src, done, { skipLabel = 'Skip' } = {}) {
  const box = $('cine'), v = $('cine-v'), skip = $('cine-skip');
  if (document.pointerLockElement) document.exitPointerLock();
  busy = true; box.style.display = 'flex'; skip.textContent = skipLabel + ' ▸';
  let finished = false;
  const end = () => { if (finished) return; finished = true; v.pause(); v.removeAttribute('src'); v.load(); box.style.display = 'none'; busy = false; onSkip = null; done && done(); };
  onSkip = end; v.onended = end; v.onerror = end;
  v.src = src; v.currentTime = 0;
  const p = v.play(); if (p && p.catch) p.catch(end);   // autoplay refused or file missing: carry on
}
$('cine-skip').addEventListener('click', () => { if (onSkip) onSkip(); });
addEventListener('keydown', e => { if (onSkip && ['Escape', 'Space', 'Enter'].includes(e.code)) { e.preventDefault(); e.stopImmediatePropagation(); onSkip(); } }, true);

// ---------- settings (kept in the browser between visits) ----------
const store = { get(k, d) { try { const v = localStorage.getItem('farsight.' + k); return v === null ? d : JSON.parse(v); } catch (_) { return d; } }, set(k, v) { try { localStorage.setItem('farsight.' + k, JSON.stringify(v)); } catch (_) { } } };
export const settings = { lowGraphics: store.get('lowGraphics', false), intro: store.get('intro', true) };

// ---------- title screen ----------
export function title({ onStart, onQuality, howTo }) {
  const t = $('title'); t.style.display = 'flex'; busy = true;
  const menu = t.querySelector('.ts-menu'), panel = t.querySelector('.ts-panel');
  let sel = 0; const items = [...menu.querySelectorAll('button')];
  const focus = i => { sel = (i + items.length) % items.length; items.forEach((b, k) => b.classList.toggle('on', k === sel)); };
  const showPanel = (html, wide) => { panel.innerHTML = html + '<button class="ts-back" type="button">Back</button>'; panel.classList.toggle('wide', !!wide); panel.style.display = 'block'; panel.scrollTop = 0; menu.style.display = 'none'; panel.querySelector('.ts-back').onclick = closePanel; wire(); };
  const closePanel = () => { panel.style.display = 'none'; menu.style.display = 'flex'; };
  const wire = () => panel.querySelectorAll('[data-set]').forEach(b => b.onclick = () => { const k = b.dataset.set; settings[k] = !settings[k]; store.set(k, settings[k]); if (k === 'lowGraphics') onQuality(settings.lowGraphics); showSettings(); });
  const showSettings = () => showPanel(`<h2>Settings</h2>
    <div class="ts-row"><span>Graphics</span><button data-set="lowGraphics" type="button">${settings.lowGraphics ? 'Low (faster)' : 'Normal'}</button></div>
    <div class="ts-row"><span>Opening video</span><button data-set="intro" type="button">${settings.intro ? 'On' : 'Off'}</button></div>
    <p class="ts-note">You can also press G in the game to switch graphics.</p>`);
  const acts = {
    start() { t.style.display = 'none'; busy = false; if (settings.intro) play('assets/video/intro.mp4', onStart, { skipLabel: 'Skip intro' }); else onStart(); },
    how() { showPanel(`<h2>How to play</h2>${howTo}`); },
    settings: showSettings,
    sources() { showPanel(sourcesHTML(), true); },
    credits() { t.style.display = 'none'; play('assets/video/credits.mp4', () => { t.style.display = 'flex'; busy = true; }, { skipLabel: 'Back' }); }
  };
  items.forEach((b, i) => { b.onmouseenter = () => focus(i); b.onclick = () => acts[b.dataset.act](); });
  addEventListener('keydown', e => {
    if (t.style.display === 'none' || panel.style.display === 'block') { if (e.code === 'Escape' && panel.style.display === 'block' && t.style.display !== 'none') closePanel(); return; }
    if (e.code === 'ArrowDown' || e.code === 'KeyS') focus(sel + 1); if (e.code === 'ArrowUp' || e.code === 'KeyW') focus(sel - 1);
    if (e.code === 'Enter') items[sel].click();
  });
  focus(0);
}

// ---------- the ending: video, then credits, then the results ----------
export function ending(then) { play('assets/video/ending.mp4', () => play('assets/video/credits.mp4', then, { skipLabel: 'Skip credits' }), { skipLabel: 'Skip' }); }
export function hideAll() { $('title').style.display = 'none'; $('cine').style.display = 'none'; busy = false; onSkip = null; }
