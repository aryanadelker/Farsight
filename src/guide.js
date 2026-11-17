/* SI generated: written with Claude (an AI assistant) for the Farsight team. See SI_DISCLOSURE.md. */
// First-task guide: leads a new player to the power bus (generator -> inspect -> repair).
// A gold marker floats over the right machine (seen through walls) and a compass arrow at the top shows the way and distance.
// It routes through the hub doorways instead of pointing through walls, and disappears once the power bus is fixed.
import * as THREE from 'three';
import { scene, consoles, rooms } from './world.js';
import { S } from './state.js';
import * as P from './player.js';

const el = document.getElementById('guide');
const mat = new THREE.MeshBasicMaterial({ color: 0xffc94a, depthTest: false, transparent: true, opacity: .95 });
const marker = new THREE.Group();
const cone = new THREE.Mesh(new THREE.ConeGeometry(.16, .34, 16), mat); cone.rotation.x = Math.PI; marker.add(cone);
const ring = new THREE.Mesh(new THREE.TorusGeometry(.24, .03, 8, 32), mat); ring.rotation.x = Math.PI / 2; ring.position.y = .3; marker.add(ring);
marker.traverse(o => { o.renderOrder = 999; }); marker.visible = false; scene.add(marker);
let doneAt = 0, t = 0;

function step() {
  if (!S.flags.generator) return { key: 'battery', text: 'Start the emergency generator', where: 'Battery Bank rack · Power Lab' };
  if (!S.sys.power.seen) return { key: 'power', text: 'Inspect the Power Distribution rack', where: 'Power Lab' };
  if (S.sys.power.st > 0) return { key: 'power', text: 'Repair the power bus', where: 'Power Distribution rack · Power Lab' };
  return null;
}
const inRoom = (id, x, z) => { const r = rooms.find(r => r.id === id); return r && x > r.x0 - .6 && x < r.x1 + .6 && z > r.z0 - .6 && z < r.z1 + .6; };
// next point to walk to: the machine itself, or the doorway that leads towards it
function waypoint(x, z, tx, tz) {
  if (inRoom('power', x, z) || inRoom('crew', x, z)) return [tx, tz];
  if (inRoom('hub', x, z)) return [0, -4.6];                      // north hatch of the hub
  if (rooms.some(r => inRoom(r.id, x, z))) return [0, 0];         // another wing: back to the hub first
  return [26.6, 0];                                               // outside: the airlock door
}

export function update(dt, playing) {
  t += dt;
  const s = playing && !S.over ? step() : null;
  if (!s) {
    marker.visible = false;
    if (playing && S.done.power && !doneAt) { doneAt = t; el.innerHTML = '<div class="g-done">✓ Power bus fixed. Follow the objectives on the right.</div>'; el.style.display = 'block'; }
    if (!playing || !doneAt || t - doneAt > 4) el.style.display = 'none';
    return;
  }
  const c = consoles[s.key], tp = c.getWorldPosition(new THREE.Vector3());
  marker.visible = true; marker.position.set(tp.x, tp.y + 1.25 + Math.sin(t * 3) * .08, tp.z); marker.rotation.y = t * 1.5;
  const p = P.pos(), [wx, wz] = waypoint(p.x, p.z, tp.x, tp.z);
  const dx = wx - p.x, dz = wz - p.z, yaw = P.heading();
  const rel = Math.atan2(dx * Math.cos(yaw) - dz * Math.sin(yaw), -dx * Math.sin(yaw) - dz * Math.cos(yaw));
  const dist = Math.hypot(tp.x - p.x, tp.z - p.z), near = dist < 2.4;
  el.style.display = 'block';
  el.innerHTML = `<div class="g-arrow" style="transform:rotate(${rel}rad)">▲</div><div class="g-txt"><b>${s.text}</b><span>${near ? 'Look at it and press E' : `${s.where} · ${dist.toFixed(0)} m`}</span></div>`;
}
