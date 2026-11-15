// Procedural textures (no image files needed). Everything is drawn on <canvas>.
import * as THREE from 'three';

let seed = 1234;
export const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
export const reseed = s => (seed = s);

function canvas(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h); return c;
}
function tex(c, { repeat, srgb = true, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (repeat) t.repeat.set(repeat[0], repeat[1]);
  return t;
}
const gray = v => `rgb(${v | 0},${v | 0},${(v * 0.98) | 0})`;

// ---------- Moon ground ----------
export function regolith(repeat = [60, 60]) {   // tileable: everything is drawn with wrap-around copies
  const c = canvas(512, 512, (g, w, h) => {
    g.fillStyle = '#8c8a86'; g.fillRect(0, 0, w, h);
    const wrap = fn => { for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) fn(dx, dy); };
    for (let i = 0; i < 90; i++) { // soft blotches
      const x = rnd() * w, y = rnd() * h, r = 20 + rnd() * 70, v = 110 + rnd() * 50;
      wrap((dx, dy) => { const gr = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r); gr.addColorStop(0, `rgba(${v},${v - 2},${v - 6},.3)`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x + dx - r, y + dy - r, r * 2, r * 2); });
    }
    for (let i = 0; i < 9000; i++) { // grains
      const v = 60 + rnd() * 140; g.fillStyle = `rgba(${v},${v},${v - 5},${.25 + rnd() * .5})`;
      const x = rnd() * w, y = rnd() * h, s = 1 + rnd() * 1.6; wrap((dx, dy) => g.fillRect(x + dx, y + dy, s, s));
    }
  });
  return tex(c, { repeat });
}

// ---------- Hull / walls / floor ----------
export function hullPanels() { // exterior white panels + gold foil patches
  const c = canvas(512, 512, (g, w, h) => {
    g.fillStyle = '#dcdfe3'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#9aa0a8'; g.lineWidth = 2;
    for (let x = 0; x <= w; x += 128) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    for (let y = 0; y <= h; y += 128) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.fillStyle = '#7b8089';
    for (let x = 0; x < w; x += 128) for (let y = 0; y < h; y += 128)
      for (let i = 0; i < 8; i++) { g.fillRect(x + 8 + i * 15, y + 6, 3, 3); g.fillRect(x + 8 + i * 15, y + 119, 3, 3); }
    for (let i = 0; i < 3; i++) { // gold multilayer insulation patches
      const x = Math.floor(rnd() * 4) * 128, y = Math.floor(rnd() * 4) * 128;
      const gr = g.createLinearGradient(x, y, x + 128, y + 128);
      gr.addColorStop(0, '#d9a93a'); gr.addColorStop(.5, '#f0cf6b'); gr.addColorStop(1, '#b8862a');
      g.fillStyle = gr; g.fillRect(x + 4, y + 4, 120, 120);
      g.strokeStyle = '#8a6420'; for (let k = 0; k < 120; k += 12) { g.beginPath(); g.moveTo(x + 4 + k, y + 4); g.lineTo(x + 4 + k, y + 124); g.stroke(); }
    }
    for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(90,85,80,${rnd() * .08})`; g.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 5, 2 + rnd() * 5); } // lunar dust
  });
  return tex(c, { repeat: [3, 3] });
}
export function wallPanel(base = '#e6e8ea') { // ISS-style interior white panels
  const c = canvas(256, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#b4b9bf'; g.lineWidth = 3; g.strokeRect(2, 2, w - 4, h - 4);
    g.lineWidth = 1; g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.stroke();
    g.fillStyle = '#8d939a';
    [[10, 10], [w - 14, 10], [10, h - 14], [w - 14, h - 14]].forEach(([x, y]) => g.fillRect(x, y, 4, 4));
    for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(120,120,120,${rnd() * .05})`; g.fillRect(rnd() * w, rnd() * h, 3, 3); }
  });
  return tex(c);
}
export function floorDeck() {
  const c = canvas(256, 256, (g, w, h) => {
    g.fillStyle = '#4a4f57'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#2a2d33'; g.lineWidth = 2; g.strokeRect(0, 0, w, h);
    g.lineWidth = 1; g.strokeStyle = '#5e646d';
    for (let i = 8; i < w; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); }
    g.fillStyle = '#9aa0a8'; [[6, 6], [w - 10, 6], [6, h - 10], [w - 10, h - 10]].forEach(([x, y]) => g.fillRect(x, y, 4, 4));
  });
  return tex(c);
}
export function hazard() {
  const c = canvas(128, 32, (g, w, h) => {
    g.fillStyle = '#e8b100'; g.fillRect(0, 0, w, h); g.fillStyle = '#15171a';
    for (let x = -h; x < w; x += 32) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + 16, h); g.lineTo(x + 16 + h, 0); g.lineTo(x + h, 0); g.fill(); }
  });
  return tex(c, { repeat: [1, 1] });
}
export function foilGold() {
  const c = canvas(128, 128, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#c9962e'); gr.addColorStop(.5, '#f3d26f'); gr.addColorStop(1, '#a9791f');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) { g.strokeStyle = `rgba(80,50,10,${rnd() * .35})`; g.beginPath(); g.moveTo(rnd() * w, rnd() * h); g.lineTo(rnd() * w, rnd() * h); g.stroke(); }
  });
  return tex(c);
}

// ---------- Equipment rack faces ----------
// kind: lockers | drawers | panel | vents | display | pipes | cables
export function rackFace(kind, accent = '#3b82f6') {
  const W = 256, H = 512;
  const c = canvas(W, H, (g) => {
    g.fillStyle = '#c9cdd2'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#7d838b'; g.lineWidth = 4; g.strokeRect(2, 2, W - 4, H - 4);
    const led = (x, y, col) => { g.fillStyle = col; g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); };
    const handle = (x, y, w2) => { g.fillStyle = '#50555c'; g.fillRect(x, y, w2, 6); };
    if (kind === 'lockers' || kind === 'drawers') {
      const rows = kind === 'lockers' ? 4 : 8, cols = kind === 'lockers' ? 2 : 1, rh = (H - 40) / rows, cw = (W - 24) / cols;
      for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
        const x = 12 + k * cw, y = 20 + r * rh;
        g.fillStyle = r % 2 ? '#bfc4ca' : '#d3d7db'; g.fillRect(x + 3, y + 3, cw - 6, rh - 6);
        g.strokeStyle = '#8a9099'; g.lineWidth = 2; g.strokeRect(x + 3, y + 3, cw - 6, rh - 6);
        handle(x + cw / 2 - 14, y + rh / 2 - 3, 28);
        g.fillStyle = '#222'; g.font = '10px monospace'; g.fillText(`${kind === 'lockers' ? 'L' : 'D'}${(r + 1) * 10 + k}`, x + 8, y + 16);
      }
    } else if (kind === 'vents') {
      for (let y = 40; y < H - 60; y += 14) { g.fillStyle = '#6b7078'; g.fillRect(24, y, W - 48, 7); }
      g.fillStyle = '#2a2d33'; g.beginPath(); g.arc(W / 2, H - 70, 36, 0, 7); g.fill();
      g.strokeStyle = '#888'; for (let a = 0; a < 6.3; a += .9) { g.beginPath(); g.moveTo(W / 2, H - 70); g.lineTo(W / 2 + Math.cos(a) * 34, H - 70 + Math.sin(a) * 34); g.stroke(); }
    } else if (kind === 'pipes') {
      g.fillStyle = '#b9bec4'; g.fillRect(14, 14, W - 28, H - 28);
      [['#2f7de0', 50], ['#d63b3b', 90], ['#2f7de0', 130], ['#d63b3b', 170]].forEach(([col, y], i) => {
        g.fillStyle = col; g.fillRect(14, y, W - 28, 12); g.fillStyle = '#4a4f56'; g.fillRect(60 + i * 30, y - 5, 18, 22);
      });
      for (let i = 0; i < 4; i++) { g.fillStyle = '#4a4f56'; g.beginPath(); g.arc(70 + i * 40, 300, 22, 0, 7); g.fill(); g.fillStyle = '#9aa0a8'; g.beginPath(); g.arc(70 + i * 40, 300, 12, 0, 7); g.fill(); }
    } else if (kind === 'cables') {
      g.fillStyle = '#9aa0a8'; g.fillRect(14, 14, W - 28, H - 28);
      for (let i = 0; i < 28; i++) { g.strokeStyle = ['#d33', '#36c', '#2a2', '#ec3', '#eee', '#222'][i % 6]; g.lineWidth = 3; g.beginPath(); g.moveTo(20 + rnd() * 216, 20); g.bezierCurveTo(20 + rnd() * 216, 150, 20 + rnd() * 216, 330, 20 + rnd() * 216, H - 20); g.stroke(); }
    } else { // panel / display
      g.fillStyle = '#aeb3ba'; g.fillRect(14, 14, W - 28, 120);
      g.fillStyle = '#16202e'; g.fillRect(24, 24, W - 48, 100);
      g.fillStyle = accent; for (let i = 0; i < 10; i++) g.fillRect(34, 34 + i * 9, 20 + rnd() * 150, 5);
      for (let r = 0; r < 4; r++) for (let k = 0; k < 6; k++) { g.fillStyle = '#6a7079'; g.fillRect(24 + k * 36, 160 + r * 40, 28, 22); led(38 + k * 36, 171 + r * 40, ['#3c3', '#fc3', '#3c3'][(r + k) % 3]); }
      handle(80, 360, 90); handle(80, 400, 90);
    }
    g.fillStyle = '#1b2430'; g.fillRect(W - 64, H - 30, 52, 18);
    g.fillStyle = '#9ad'; g.font = 'bold 11px monospace'; g.fillText('FS-' + ((rnd() * 900 + 100) | 0), W - 60, H - 17);
    led(24, H - 22, '#3c3'); led(40, H - 22, rnd() > .5 ? '#fc3' : '#3c3');
  });
  return tex(c);
}

// ---------- Signs ----------
export function sign(text, { bg = '#0e2a52', fg = '#ffffff', w = 512, h = 128, sub = '', fs = 0 } = {}) {
  const c = canvas(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    let size = fs || (sub ? h * .42 : h * .5); const face = '"Trebuchet MS",Arial,sans-serif';
    g.font = `bold ${size}px ${face}`; while (g.measureText(text).width > w - 36 && size > 10) { size -= 2; g.font = `bold ${size}px ${face}`; }
    g.fillText(text, w / 2, sub ? h * .38 : h / 2);
    if (sub) { g.font = `600 ${Math.min(size * .55, h * .22)}px Arial,sans-serif`; g.fillText(sub, w / 2, h * .76); }
  });
  return tex(c);
}
export function radiationSign() {
  const c = canvas(256, 256, (g) => {
    g.fillStyle = '#f5c400'; g.fillRect(0, 0, 256, 256); g.strokeStyle = '#111'; g.lineWidth = 10; g.strokeRect(5, 5, 246, 246);
    g.translate(128, 128); g.fillStyle = '#111';
    for (let i = 0; i < 3; i++) { g.rotate(Math.PI * 2 / 3); g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 90, -Math.PI / 2 - .52, -Math.PI / 2 + .52); g.closePath(); g.fill(); }
    g.beginPath(); g.arc(0, 0, 14, 0, 7); g.fill();
  });
  return tex(c);
}
export function photo() { // framed picture on a crew wall
  const c = canvas(128, 96, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); const sets = [['#274c9a', '#8fc7ff'], ['#2c5a2a', '#9fd36b'], ['#7a3b1c', '#f2b36a'], ['#2b2b5a', '#c8a6ff']];
    const s = sets[(rnd() * sets.length) | 0]; gr.addColorStop(0, s[0]); gr.addColorStop(1, s[1]); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.moveTo(0, h); g.lineTo(w * .3, h * .55); g.lineTo(w * .55, h * .8); g.lineTo(w * .8, h * .5); g.lineTo(w, h); g.fill();
  });
  return tex(c);
}

// ---------- Space ----------
export function solarCells() {
  const c = canvas(256, 512, (g, w, h) => {
    g.fillStyle = '#102a63'; g.fillRect(0, 0, w, h);
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#1f4aa6'); gr.addColorStop(1, '#0c2152'); g.fillStyle = gr; g.fillRect(4, 4, w - 8, h - 8);
    g.strokeStyle = '#8fa8d8'; g.lineWidth = 1;
    for (let x = 0; x <= w; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    for (let y = 0; y <= h; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.strokeStyle = 'rgba(200,215,255,.35)'; for (let x = 16; x < w; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    g.strokeStyle = '#d5d9e0'; g.lineWidth = 5; g.strokeRect(2, 2, w - 4, h - 4);
  });
  return tex(c);
}
export function earth() {
  const W = 1024, H = 512;
  const c = canvas(W, H, (g) => {
    g.fillStyle = '#1b4f9c'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 40; i++) { const x = rnd() * W, y = rnd() * H, r = 30 + rnd() * 60, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(40,110,200,.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
    const land = (x, y, r, col) => { g.fillStyle = col; for (let i = 0; i < 26; i++) { const a = rnd() * 6.28, d = rnd() * r; g.beginPath(); g.ellipse(x + Math.cos(a) * d, y + Math.sin(a) * d * .7, r * (.15 + rnd() * .3), r * (.1 + rnd() * .25), rnd() * 3, 0, 7); g.fill(); } };
    [[250, 200, 110], [430, 330, 70], [600, 180, 100], [720, 230, 90], [860, 360, 70], [540, 300, 60]].forEach(([x, y, r]) => { land(x, y, r, '#3f7d3a'); land(x, y, r * .6, '#9c8a4a'); });
    g.fillStyle = '#f2f6fb'; g.fillRect(0, 0, W, 34); g.fillRect(0, H - 40, W, 40);
    for (let i = 0; i < 110; i++) { const x = rnd() * W, y = rnd() * H, r = 14 + rnd() * 50; g.fillStyle = `rgba(255,255,255,${.12 + rnd() * .28})`; g.beginPath(); g.ellipse(x, y, r * 1.8, r * .5, rnd() * .6, 0, 7); g.fill(); }
  });
  return tex(c);
}
export function glow(color = '255,255,255') {
  const c = canvas(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, `rgba(${color},1)`); gr.addColorStop(.25, `rgba(${color},.45)`); gr.addColorStop(1, `rgba(${color},0)`); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
  return tex(c);
}
export function padMarks() {
  const c = canvas(512, 512, (g) => {
    g.fillStyle = '#6f6e6b'; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 6000; i++) { const v = 80 + rnd() * 60; g.fillStyle = `rgba(${v},${v},${v},.5)`; g.fillRect(rnd() * 512, rnd() * 512, 2, 2); }
    g.strokeStyle = '#e8e8e8'; g.lineWidth = 10; g.beginPath(); g.arc(256, 256, 230, 0, 7); g.stroke();
    g.strokeStyle = '#e8b100'; g.lineWidth = 6; g.beginPath(); g.arc(256, 256, 190, 0, 7); g.stroke();
    g.fillStyle = '#e8e8e8'; g.font = 'bold 150px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('H', 256, 262);
  });
  return tex(c);
}
export function dust() { // worn path / tyre tracks
  const c = canvas(64, 256, (g, w, h) => {
    g.fillStyle = 'rgba(0,0,0,0)'; g.clearRect(0, 0, w, h);
    for (const x of [16, 48]) { const gr = g.createLinearGradient(x - 10, 0, x + 10, 0); gr.addColorStop(0, 'rgba(30,30,30,0)'); gr.addColorStop(.5, 'rgba(30,30,30,.45)'); gr.addColorStop(1, 'rgba(30,30,30,0)'); g.fillStyle = gr; g.fillRect(x - 10, 0, 20, h); }
    g.strokeStyle = 'rgba(20,20,20,.35)'; g.lineWidth = 2; for (let y = 0; y < h; y += 6) { g.beginPath(); g.moveTo(8, y); g.lineTo(24, y + 2); g.moveTo(40, y); g.lineTo(56, y + 2); g.stroke(); }
  });
  return tex(c);
}
export function statusScreen(draw) { // live canvas for in-world screens
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const g = c.getContext('2d'); draw(g, 512, 256); t.needsUpdate = true;
  return { c, g, t, redraw(fn) { fn(g, 512, 256); t.needsUpdate = true; } };
}
