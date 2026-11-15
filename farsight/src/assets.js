// Shared materials + reusable 3D asset builders (ISS-inspired hardware, lunar-surface hardware).
import * as THREE from 'three';
import * as T from './textures.js';

const Std = (o) => new THREE.MeshStandardMaterial(o);
// interior surfaces get a faint self-glow so far corridors never fall to pure black (scaled with base power in base.js)
const glowStd = (map, o) => new THREE.MeshStandardMaterial({ map, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: .32, ...o });
export const M = {
  hull: Std({ map: T.hullPanels(), roughness: .55, metalness: .15 }),
  gold: Std({ map: T.foilGold(), roughness: .4, metalness: .3 }),
  steel: Std({ color: 0xa9b0b8, metalness: .4, roughness: .45 }),
  dark: Std({ color: 0x353a41, metalness: .3, roughness: .55 }),
  white: Std({ color: 0xe9ecef, roughness: .5, metalness: .05 }),
  grey: Std({ color: 0x8b9199, roughness: .6, metalness: .3 }),
  orange: Std({ color: 0xe8741a, roughness: .6 }),
  yellow: Std({ color: 0xe8b100, roughness: .55 }),
  rubber: Std({ color: 0x15171a, roughness: .95 }),
  red: Std({ color: 0xc0392b, roughness: .6 }),
  blue: Std({ color: 0x2f7de0, roughness: .5 }),
  glass: Std({ color: 0x9fc8ff, transparent: true, opacity: .14, roughness: .05, metalness: .2, depthWrite: false }),
  visor: Std({ color: 0xd9a838, metalness: .5, roughness: .2 }),
  solar: Std({ map: T.solarCells(), roughness: .35, metalness: .4 }),
  rego: Std({ map: T.regolith([6, 3]), color: 0xa9a7a1, roughness: 1 }),
  wallIn: glowStd(T.wallPanel(), { roughness: .72 }),
  ceilIn: glowStd(T.wallPanel('#f2f4f5'), { roughness: .75 }),
  floorIn: glowStd(T.floorDeck(), { roughness: .8, metalness: .25 }),
  hazard: Std({ map: T.hazard(), roughness: .7 }),
  lightPanel: new THREE.MeshBasicMaterial({ color: 0xfff6e0 }),
  emRed: new THREE.MeshBasicMaterial({ color: 0xff2a1a }),
  emGreen: new THREE.MeshBasicMaterial({ color: 0x33ff77 }),
  emAmber: new THREE.MeshBasicMaterial({ color: 0xffb020 }),
  plant: Std({ color: 0x2ecc40, roughness: .8 }),
  soil: Std({ color: 0x4a3426, roughness: 1 }),
};

// ---------- small helpers ----------
export const opt = { cast: true };   // base.js turns this off while building interiors (the hull already blocks the Sun there)
export function put(m, parent, x = 0, y = 0, z = 0, { cast = opt.cast, recv = true } = {}) {
  m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = recv; parent.add(m); return m;
}
export const bx = (w, h, d, mat, parent, x, y, z, o) => put(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat), parent, x, y, z, o);
export const cyl = (r, h, mat, parent, x, y, z, seg = 18, o) => put(new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat), parent, x, y, z, o);
export const sph = (r, mat, parent, x, y, z, seg = 20, o) => put(new THREE.Mesh(new THREE.SphereGeometry(r, seg, seg * .75), mat), parent, x, y, z, o);

// Box whose UVs repeat every `tile` metres (so wall textures do not stretch).
export function tiledBox(w, h, d, mat, tile = 1.5) {
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv;
  const sc = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * sc[f][0] / tile, uv.getY(k) * sc[f][1] / tile); }
  return new THREE.Mesh(g, mat);
}
export function tube(points, r, mat, parent, seg = 40) {
  const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), seg, r, 6, false), mat);
  m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
export function plane(w, h, map, parent, x, y, z, ry = 0, rx = 0, basic = true) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), basic ? new THREE.MeshBasicMaterial({ map, transparent: true }) : new THREE.MeshStandardMaterial({ map }));
  m.position.set(x, y, z); m.rotation.set(rx, ry, 0, 'YXZ'); parent.add(m); return m;
}

// ---------- equipment rack (front faces +z) ----------
const rackTex = {};
export function rackUnit(kind, w, h, d = .65) {
  rackTex[kind] = rackTex[kind] || T.rackFace(kind);
  const side = M.white, front = new THREE.MeshStandardMaterial({ map: rackTex[kind], roughness: .55, metalness: .25 });
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [side, side, side, side, front, M.grey]);
  m.castShadow = m.receiveShadow = true; return m;
}

// ---------- people ----------
export function makeAstronaut({ eva = false, color = 0x2a5db0, hang = false } = {}) {
  const g = new THREE.Group(), suit = eva ? M.white : Std({ color, roughness: .8 }), skin = Std({ color: 0xc89878, roughness: .8 });
  const parts = {};
  bx(.46, .6, .26, suit, g, 0, 1.22, 0); bx(.4, .22, .24, suit, g, 0, .86, 0);
  [-1, 1].forEach(s => {
    const leg = cyl(.095, .78, suit, g, s * .12, .45, 0, 10); cyl(.1, .1, eva ? M.grey : M.dark, g, s * .12, .06, .02, 10); bx(.14, .09, .27, M.dark, g, s * .12, .04, .06);
    const arm = cyl(.07, .62, suit, g, s * .3, 1.18, 0, 10); arm.rotation.z = s * .12; parts['arm' + s] = arm;
    if (eva) cyl(.075, .09, M.grey, g, s * .3, .86, 0, 10);
  });
  if (eva) {
    sph(.23, M.white, g, 0, 1.68, 0); const v = sph(.2, M.visor, g, 0, 1.68, .06); v.scale.set(1, .9, .8);
    bx(.42, .58, .2, M.white, g, 0, 1.25, -.23); bx(.08, .1, .1, M.orange, g, 0, 1.55, -.15);
    bx(.16, .1, .06, M.blue, g, 0, 1.3, .14);
  } else {
    parts.head = sph(.125, skin, g, 0, 1.65, 0); sph(.13, Std({ color: [0x2b1d12, 0x6b4a2a, 0x151515, 0xb88a4a][(Math.random() * 4) | 0], roughness: 1 }), g, 0, 1.69, -.02);
    bx(.14, .06, .01, M.white, g, .1, 1.3, .135);
  }
  g.userData.parts = parts; return g;
}

// ---------- surface hardware ----------
export function makeSolarArray(sunDir) {
  const g = new THREE.Group();
  cyl(.28, 7.5, M.steel, g, 0, 3.75, 0, 12); cyl(.7, .5, M.dark, g, 0, .25, 0, 14); bx(.9, .7, .9, M.white, g, 0, 7.6, 0);
  const head = new THREE.Group(); head.position.set(0, 7.9, 0); g.add(head);
  const back = [M.white, M.white, M.white, M.white, M.solar, M.gold];
  [-1, 1].forEach(s => {
    const w = new THREE.Mesh(new THREE.BoxGeometry(3.6, 9.2, .1), back); w.position.set(s * 1.95, 0, 0); w.castShadow = true; w.receiveShadow = true; head.add(w);
  });
  bx(.3, 9.4, .22, M.steel, head, 0, 0, 0);
  head.rotation.order = 'YXZ'; head.rotation.y = Math.atan2(sunDir.x, sunDir.z); head.rotation.x = -Math.asin(sunDir.y);
  return g;
}
export function makeTank(label) {
  const g = new THREE.Group();
  sph(1.7, M.hull, g, 0, 2.6, 0, 28); [0, 1.57, 3.14, 4.7].forEach(a => { const l = cyl(.1, 2.6, M.steel, g, Math.cos(a) * 1.2, 1.1, Math.sin(a) * 1.2, 8); l.rotation.z = Math.cos(a) * .25; l.rotation.x = -Math.sin(a) * .25; });
  const band = cyl(1.73, .25, M.gold, g, 0, 2.6, 0, 28); band.scale.set(1, 1, 1);
  const s = new THREE.Mesh(new THREE.PlaneGeometry(1.4, .5), new THREE.MeshBasicMaterial({ map: T.sign(label, { w: 256, h: 96, bg: '#0e2a52' }) })); s.position.set(0, 2.6, 1.76); g.add(s);
  cyl(.12, 1.2, M.steel, g, 0, 4.9, 0, 8);
  return g;
}
export function makeLander() {
  const g = new THREE.Group();
  const desc = cyl(2.6, 1.7, M.gold, g, 0, 2.4, 0, 8); desc.rotation.y = Math.PI / 8;
  [0, 1, 2, 3].forEach(i => {
    const a = i * Math.PI / 2 + Math.PI / 4, cx = Math.cos(a), cz = Math.sin(a);
    const leg = cyl(.11, 3.3, M.steel, g, cx * 3.5, 1.35, cz * 3.5, 8); leg.rotation.set(cz * .55, 0, -cx * .55);
    const strut = cyl(.07, 2.4, M.steel, g, cx * 2.8, 2.5, cz * 2.8, 6); strut.rotation.set(cz * -.7, 0, cx * .7);
    cyl(.6, .1, M.dark, g, cx * 4.35, .06, cz * 4.35, 14);
  });
  const bell = new THREE.Mesh(new THREE.ConeGeometry(.9, 1.2, 16, 1, true), M.dark); bell.position.set(0, 1.1, 0); bell.rotation.x = Math.PI; bell.castShadow = true; g.add(bell);
  const asc = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2.1, 2.6, 10), M.hull); put(asc, g, 0, 4.55, 0);
  const top = sph(1.6, M.hull, g, 0, 5.8, 0, 16); top.scale.y = .55;
  const win = bx(.9, .7, .1, M.visor, g, 0, 4.8, 2.0); win.rotation.x = -.1;
  cyl(.06, 1.6, M.steel, g, 1, 6.9, 0, 6); const dish = sph(.5, M.white, g, 1, 7.7, 0, 12); dish.scale.y = .3;
  [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([x, z]) => bx(.5, .5, .5, M.dark, g, x * 1.9, 4.2, z * 1.55)); // RCS quads
  const ladder = bx(.7, 2.6, .08, M.steel, g, 0, 1.3, 3.45); ladder.rotation.x = .38;
  for (let i = 0; i < 6; i++) bx(.7, .05, .12, M.steel, ladder, 0, -1.1 + i * .42, .06, { cast: false });
  return g;
}
export function makeRover() {
  const g = new THREE.Group();
  bx(4.4, .5, 2.6, M.dark, g, 0, 1.0, 0);
  const cab = bx(3.6, 1.7, 2.3, M.hull, g, -.2, 2.1, 0); bx(3.62, .4, 2.32, M.gold, g, -.2, 1.45, 0);
  const wind = bx(.12, 1.0, 1.9, M.visor, g, 1.65, 2.3, 0); wind.rotation.z = -.35;
  bx(1.4, .9, .08, M.glass, g, -.2, 2.4, 1.16); bx(1.4, .9, .08, M.glass, g, -.2, 2.4, -1.16);
  bx(3.4, .08, 2.2, M.solar, g, -.2, 3.0, 0); cyl(.03, 1.3, M.steel, g, -1.5, 3.7, .6, 6); cyl(.03, 1.6, M.steel, g, -1.2, 3.8, -.6, 6);
  [1.1, 0, -1.1].forEach(x => [-1, 1].forEach(s => {
    const w = cyl(.62, .5, M.rubber, g, x * 1.25, .62, s * 1.65, 20); w.rotation.x = Math.PI / 2; const hub = cyl(.3, .54, M.steel, g, x * 1.25, .62, s * 1.65, 12); hub.rotation.x = Math.PI / 2;
    const arm = bx(.18, .12, 1.0, M.steel, g, x * 1.25, 1.0, s * 1.2);
  }));
  bx(.4, .3, .5, M.emAmber, g, 2.1, 1.2, .8, { cast: false }); bx(.4, .3, .5, M.emAmber, g, 2.1, 1.2, -.8, { cast: false });
  bx(.3, 1.0, 1.4, M.dark, g, -2.0, 1.6, 0); // docking tunnel
  return g;
}
export function makeRobotArm() {
  const g = new THREE.Group();
  cyl(.7, .6, M.dark, g, 0, .3, 0, 16); cyl(.45, .8, M.white, g, 0, 1.0, 0, 16);
  const j1 = new THREE.Group(); j1.position.set(0, 1.4, 0); g.add(j1);
  sph(.4, M.dark, j1, 0, 0, 0); const b1 = cyl(.24, 5.5, M.white, j1, 0, 0, 0, 14); b1.rotation.z = Math.PI / 2 - .5; b1.position.set(2.4, 1.3, 0);
  const j2 = new THREE.Group(); j2.position.set(4.8, 2.6, 0); j1.add(j2); sph(.34, M.dark, j2, 0, 0, 0);
  const b2 = cyl(.2, 4.6, M.white, j2, 2.0, -.4, 0, 14); b2.rotation.z = Math.PI / 2 + .25;
  const j3 = new THREE.Group(); j3.position.set(4.1, -.8, 0); j2.add(j3); sph(.28, M.dark, j3, 0, 0, 0);
  cyl(.18, .9, M.steel, j3, .5, -.1, 0, 10).rotation.z = Math.PI / 2; [-1, 1].forEach(s => bx(.5, .08, .08, M.dark, j3, 1.1, s * .2, 0));
  g.userData.j1 = j1; g.userData.j2 = j2; g.userData.j3 = j3; return g;
}
export function makeIsru() {
  const g = new THREE.Group();
  const hop = new THREE.Mesh(new THREE.ConeGeometry(2.2, 3, 14, 1, true), M.steel); hop.rotation.x = Math.PI; put(hop, g, 0, 6, 0);
  cyl(2.2, 1.5, M.steel, g, 0, 7.75, 0, 14); [-1.6, 1.6].forEach(x => cyl(.12, 4.5, M.steel, g, x, 2.2, 1.2, 6));
  cyl(1.6, 4.8, M.hull, g, 5, 2.4, 0, 20); cyl(1.62, .4, M.gold, g, 5, 4, 0, 20); cyl(1.1, 6, M.white, g, 8.4, 3, 1, 16); cyl(.4, 3, M.dark, g, 8.4, 7.5, 1, 10);
  const conv = bx(.9, .25, 9, M.dark, g, 0, 3.2, -6); conv.rotation.x = .3; for (let i = 0; i < 8; i++) bx(.95, .06, .05, M.steel, conv, 0, .16, -4 + i, { cast: false });
  bx(3.5, 2.4, 2.4, M.hull, g, -3.4, 1.2, 3.5); bx(3.6, .35, 2.5, M.orange, g, -3.4, 2.5, 3.5);
  tube([[0, 4, 0], [2, 2, 1], [4, 1.5, 0], [5, 3, 0]], .12, M.steel, g, 12); tube([[5, 1, 0], [7, .5, 2], [8.4, 1, 1]], .14, M.blue, g, 12);
  const l = sph(.25, M.emAmber, g, 8.4, 9.1, 1, 10, { cast: false }); g.userData.beacon = l;
  return g;
}
export function makeLamp(h = 4.5) {
  const g = new THREE.Group(); cyl(.07, h, M.steel, g, 0, h / 2, 0, 8); cyl(.3, .12, M.dark, g, 0, .06, 0, 10);
  const head = bx(.55, .18, .35, M.dark, g, .2, h, 0); const lamp = bx(.45, .05, .28, M.lightPanel, g, .2, h - .1, 0, { cast: false }); g.userData.lamp = lamp; return g;
}
