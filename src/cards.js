/* SI generated: written with Claude (an AI assistant) for the Farsight team. See SI_DISCLOSURE.md. */
// Click a machine -> a simple information card (title bar, text on the left, a picture of the machine on the right).
// The picture is a snapshot taken by the game's own camera, so no outside images are needed.
import * as THREE from 'three';
import { scene, camera, renderer } from './world.js';
import { S } from './state.js';
import { SYSTEMS, REAL_DATA } from '../data/outpost_data.js';
import { CARDS } from '../data/info_cards.js';

const $ = id => document.getElementById(id);
const NAMES = ['Working', 'Degraded', 'Failed'], COL = ['#4ade80', '#fbbf24', '#f87171'];
let isOpenFlag = false, hooks = { open() { }, close() { } };
export const isOpen = () => isOpenFlag;
export const configure = h => Object.assign(hooks, h);
const shotCam = new THREE.PerspectiveCamera(50, 1, .05, 300);

function snapshot(obj, canvas) {
  const c = obj.getWorldPosition(new THREE.Vector3()), outside = obj.userData.src === 'dish';
  const dir = camera.position.clone().sub(c); dir.y = 0; if (dir.lengthSq() < 1e-4) dir.set(0, 0, 1); dir.normalize(); if (outside) dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), 1.0);   // dish: three-quarter view so the bowl shape reads
  shotCam.position.copy(c).addScaledVector(dir, outside ? 13 : 2.1); shotCam.position.y = c.y + (outside ? 3.2 : .3);
  shotCam.lookAt(c.x, c.y + (outside ? 3.0 : 0), c.z);
  const el = renderer.domElement; shotCam.aspect = el.width / el.height; shotCam.updateProjectionMatrix();
  renderer.render(scene, shotCam);                       // draw once from the card camera...
  const g = canvas.getContext('2d'), tw = canvas.width, th = canvas.height, sh = el.height, sw = sh * tw / th;
  g.drawImage(el, (el.width - sw) / 2, 0, sw, sh, 0, 0, tw, th);   // ...and copy it before the next normal frame
}

export function show(obj) {
  const k = obj.userData.key, card = CARDS[k]; if (!card || isOpenFlag) return;
  const sys = SYSTEMS[k], st = S.sys[k], box = $('icard');
  const name = card.name || sys.name;
  let status = '';
  if (sys) status = !st.seen ? '<span class="ic-tag">Not inspected yet</span>' :
    `<span class="ic-tag" style="border-color:${COL[st.st]};color:${COL[st.st]}">${NAMES[st.st]}</span>` + (sys.load ? `<span class="ic-tag">${st.on ? 'Powered ON' : 'Switched OFF'} · uses ${sys.load} power/day</span>` : '');
  const refs = card.refs.map(r => REAL_DATA[r]).filter(Boolean);
  box.querySelector('.ic-code').textContent = card.code;
  box.querySelector('.ic-text').innerHTML = `<h3>${name}</h3><div class="ic-tags">${status}</div><p>${card.what}</p>
    <div class="ic-k">REAL WORLD</div><p>${card.real}</p>` + (refs.length ? `<div class="ic-src">Source: ${refs.map((d, i) => `<a href="${d.src}" target="_blank" rel="noopener">[${i + 1}] ${d.note || 'link'}</a>`).join(' ')}</div>` : '');
  box.style.display = 'flex'; isOpenFlag = true; hooks.open();
  snapshot(obj, box.querySelector('canvas'));
}
export function hide(byClick) { if (!isOpenFlag) return; $('icard').style.display = 'none'; isOpenFlag = false; hooks.close({ byClick }); }

// wiring (once)
$('icard').addEventListener('mousedown', e => { if (e.target.id === 'icard') hide(true); });
$('icard').querySelector('.ic-x').addEventListener('click', () => hide(true));
addEventListener('keydown', e => { if (isOpenFlag && e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); hide(false); } }, true);
