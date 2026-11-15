// Selene Base: a hub-and-spoke station inspired by the ISS (node + lab + habitation + greenhouse + airlock + cupola).
// Layout and sizes are INVENTED design values. Module names map to ISS analogues in docs/ASSETS.md.
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import * as T from './textures.js';
import * as A from './assets.js';
import { SYSTEMS } from '../data/outpost_data.js';
import { S } from './state.js';
const { M } = A;

const W = 4.8, H = 3.4, TH = .2, OPW = 2.8, OPH = 2.8, GAP = 1.4;      // module width/height, wall thickness, hatch opening, gap between modules
const HUB = { half: 4, h: 4.2 };
const PI = Math.PI;

export function buildBase(ctx) {
  const { scene, phys, solids, consoles, hits, lights } = ctx;
  const out = { rooms: [], spawnZones: [], npcs: [], doors: [], update: null };
  const animated = { plants: null, water: [], battery: [], displays: [], sparks: {} };

  A.opt.cast = false;   // interior decor does not cast shadows (saves draw calls)
  // ---------- physics + frame helpers ----------
  const body = (x, y, z, hx, hy, hz) => { const b = new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(hx, hy, hz)) }); b.position.set(x, y, z); phys.addBody(b); return b; };
  class Frame {
    constructor(ox, oz, rot) { this.g = new THREE.Group(); this.g.position.set(ox, 0, oz); this.g.rotation.y = rot; scene.add(this.g); this.ox = ox; this.oz = oz; this.c = Math.cos(rot); this.s = Math.sin(rot); }
    w(lx, lz) { return [this.ox + lx * this.c + lz * this.s, this.oz - lx * this.s + lz * this.c]; }
    solid(sx, sy, sz, lx, ly, lz) { const [x, z] = this.w(lx, lz), sw = Math.abs(this.s) > .5; return body(x, ly, z, (sw ? sz : sx) / 2, sy / 2, (sw ? sx : sz) / 2); }
    // solid slab: visible from inside with inMat, other faces outMat. inward = local face normal pointing into the room.
    slab(sx, sy, sz, lx, ly, lz, inMat, outMat, inward, collide = true) {
      const idx = { '+x': 0, '-x': 1, '+y': 2, '-y': 3, '+z': 4, '-z': 5 }, mats = Array(6).fill(outMat);
      if (inward) mats[idx[inward]] = inMat; if (inward === 'both') mats.fill(inMat);
      const m = A.tiledBox(sx, sy, sz, mats, 1.5); m.position.set(lx, ly, lz); m.castShadow = m.receiveShadow = true; this.g.add(m);
      if (collide) { this.solid(sx, sy, sz, lx, ly, lz); solids.push(m); } return m;
    }
  }
  // wall plane z=pos (local) with a centred opening
  function bulkhead(f, pos, Wd, Hh, opW, opH, inward, mat = M.wallIn) {
    const jw = (Wd - opW) / 2, fh = Hh + .5, cy = (Hh - .1) / 2;
    [-1, 1].forEach(s => f.slab(jw, fh, TH, s * (opW / 2 + jw / 2), cy, pos, mat, M.dark, inward));
    f.slab(opW, Hh + .2 - opH, TH, 0, (opH + Hh + .2) / 2, pos, mat, M.dark, inward);
    // hatch ring around the opening
    const r = (s, w, h, x, y) => A.bx(w, h, TH + .12, M.steel, f.g, x, y, pos, { cast: false });
    r(0, .12, opH, -opW / 2, opH / 2); r(0, .12, opH, opW / 2, opH / 2); r(0, opW + .24, .12, 0, opH);
    for (let i = 0; i < 10; i++) A.bx(.06, .06, TH + .2, M.dark, f.g, -opW / 2 + (i + .5) * opW / 10, opH, pos, { cast: false });
  }
  const fullWall = (f, pos, Wd, Hh, inward, mat = M.wallIn) => f.slab(Wd, Hh + .5, TH, 0, (Hh - .1) / 2, pos, mat, M.dark, inward);

  // ---------- fixtures ----------
  const lightStrip = (g, x, y, z, w = 1.5, d = .5, rot = 0) => { const m = A.bx(w, .06, d, M.lightPanel, g, x, y, z, { cast: false, recv: false }); m.rotation.y = rot; A.bx(w + .1, .04, d + .1, M.grey, g, x, y + .03, z, { cast: false }); return m; };
  const roomLight = (x, y, z, color = 0xfff0dd, I = 16, dist = 13) => { const l = new THREE.PointLight(color, I, dist, 1.4); l.position.set(x, y, z); scene.add(l); lights.push({ l, I }); return l; };
  const extinguisher = (g, x, y, z) => { A.cyl(.1, .5, M.red, g, x, y + .25, z, 12); A.cyl(.04, .12, M.dark, g, x, y + .55, z, 8); };
  const stool = (g, x, z, h = .45) => { A.cyl(.2, .06, M.dark, g, x, h, z, 14); A.cyl(.04, h, M.steel, g, x, h / 2, z, 8); A.cyl(.2, .03, M.steel, g, x, .02, z, 14); };
  const sign = (g, text, x, y, z, ry = 0, w = 1.6, h = .4, opt = {}) => A.plane(w, h, T.sign(text, { w: 512, h: 128, ...opt }), g, x, y, z, ry);
  function screenTex(title, sub) {
    return T.statusScreen((g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = 'bold 40px monospace'; g.textAlign = 'left';
      const words = title.toUpperCase().split(' '); let line = '', y = 56; for (const wd of words) { if ((line + wd).length > 15) { g.fillText(line, 20, y); y += 46; line = ''; } line += wd + ' '; } g.fillText(line, 20, y);
      for (let i = 0; i < 5; i++) g.fillRect(20, 150 + i * 20, 80 + ((i * 97) % 300), 9); g.fillRect(430, 20, 60, 60); }).t;
  }
  function addConsole(g, key, label, y = 1.35, w = 1.0) {
    const mat = new THREE.MeshStandardMaterial({ color: 0x0a0f18, emissive: 0x3377ff, emissiveMap: screenTex(label), emissiveIntensity: .8, roughness: .3 });
    const scr = new THREE.Mesh(new THREE.BoxGeometry(w * .95, w * .6, .05), mat); scr.position.set(0, y, .39); scr.userData.key = key; g.add(scr); consoles[key] = scr; hits.push(scr);
    A.bx(w, w * .66, .05, M.dark, g, 0, y, .36, { cast: false }); A.bx(w * .8, .04, .3, M.dark, g, 0, y - w * .42, .5); A.bx(w * .6, .015, .18, M.grey, g, 0, y - w * .4, .52, { cast: false });
    sign(g, label, 0, y + w * .56, .36, 0, w, w * .24, { bg: '#0b2a55', fg: '#bfe3ff' });
    const hit = new THREE.Mesh(new THREE.BoxGeometry(w + .1, 2.1, .18), new THREE.MeshBasicMaterial({ visible: false })); hit.position.set(0, 1.05, .43); hit.userData.key = key; g.add(hit); hits.push(hit);
  }
  // Wall rack (left side = -1, right = +1). Front faces the corridor.
  function rack(f, side, cu, w, it) {
    const g = new THREE.Group(); g.position.set(side * (W / 2 - .35), 0, cu); g.rotation.y = side < 0 ? PI / 2 : -PI / 2; f.g.add(g);
    f.solid(.7, H, w, side * (W / 2 - .35), H / 2, cu);
    const u1 = A.rackUnit(it.kind || 'lockers', w - .05, 2.0, .7); u1.position.y = 1; g.add(u1); solids.push(u1);
    const u2 = A.rackUnit('lockers', w - .05, 1.1, .6); u2.position.set(0, 2.57, -.05); g.add(u2);
    if (it.key) addConsole(g, it.key, it.label || SYSTEMS[it.key].name);
    else if (it.label) sign(g, it.label, 0, 2.1, .36, 0, w * .9, .22, { bg: '#2a2f37', fg: '#d5dbe3' });
    if (it.deco) it.deco(g, w);
    return g;
  }
  function rackRow(f, side, u0, items) {
    let u = u0; for (const it of items) { const w = it.w || 1.1; if (it.gap) { u += it.gap; continue; } rack(f, side, u + w / 2, w, it); u += w; } return u;
  }

  // ---------- module shell ----------
  function shell(spec) {
    const { name, dir, off, len, endType = 'wall', nextName = '', berm = 'sides' } = spec;
    const rot = { E: PI / 2, W: -PI / 2, N: PI, S: 0 }[dir], o = 5.4 + off;
    const ox = dir === 'E' ? o : dir === 'W' ? -o : 0, oz = dir === 'S' ? o : dir === 'N' ? -o : 0;
    const f = new Frame(ox, oz, rot), g = f.g; f.len = len;
    // deck, ceiling, side walls
    f.slab(W + .4, .3, len + GAP + .2, 0, -.15, (len - GAP + .2) / 2 + .0, M.floorIn, M.dark, '+y');
    if (!spec.windows) f.slab(W + .4, .2, len, 0, H + .1, len / 2, M.ceilIn, M.dark, '-y');
    [-1, 1].forEach(s => { if (!spec.windows) f.slab(.2, H + .5, len, s * (W / 2 + .1), (H - .1) / 2, len / 2, M.wallIn, M.dark, s < 0 ? '+x' : '-x'); });
    // start bulkhead + connecting tunnel
    bulkhead(f, -.1, W + .4, H, OPW, OPH, '+z');
    f.slab(OPW + .4, .2, 1.0, 0, OPH + .1, -.7, M.ceilIn, M.dark, '-y'); [-1, 1].forEach(s => f.slab(.2, OPH + .5, 1.0, s * (OPW / 2 + .1), (OPH - .1) / 2, -.7, M.wallIn, M.dark, s < 0 ? '+x' : '-x'));
    A.bx(OPW, .35, .35, M.hazard, g, 0, .01, -.1, { cast: false }).scale.y = .02;
    // end
    if (endType === 'wall') fullWall(f, len + .1, W + .4, H, '-z');
    else if (endType === 'open') bulkhead(f, len + .1, W + .4, H, OPW, OPH, '-z');
    // ceiling kit: lights, duct, cables, beacon, signs
    for (let u = 1.6; u < len - .6; u += 2.8) lightStrip(g, 0, H - .03, u, 1.6, .45);
    [-1, 1].forEach(s => { const d = A.cyl(.14, len - 1, M.steel, g, s * 1.55, H - .3, len / 2, 14); d.rotation.x = PI / 2; for (let u = 1.2; u < len - 1; u += 1.6) { const r = A.cyl(.16, .05, M.dark, g, s * 1.55, H - .3, u, 14); r.rotation.x = PI / 2; } });
    A.tube([[-.9, H - .12, 0.6], [-.9, H - .12, len * .5], [-.5, H - .12, len - .6]], .06, M.rubber, g, 20); A.tube([[-.7, H - .1, 0.6], [-.7, H - .1, len * .5], [-.3, H - .1, len - .6]], .045, M.blue, g, 20);
    A.cyl(.18, .14, M.emRed, g, W / 2 - .4, H - .15, .35, 10, { cast: false });
    sign(g, spec.prevName || 'HUB', 0, 3.12, .02, 0, 1.7, .3, { bg: '#123c6e', sub: '' });
    if (endType !== 'none') sign(g, nextName || name, 0, 3.12, len - .02, PI, 1.7, .3, { bg: nextName ? '#123c6e' : '#0a2a52' });
    // exterior: hull cylinder, caps, berm
    A.opt.cast = true;
    const hm = M.hull.clone(); hm.map = M.hull.map.clone(); hm.map.needsUpdate = true; hm.map.repeat.set(6, (len + .4) / 2.8); hm.side = THREE.FrontSide;
    if (!spec.windows) {
      const hull = new THREE.Mesh(new THREE.CylinderGeometry(3.0, 3.0, len + .4, 28, 1, true), hm); hull.rotation.x = PI / 2; hull.position.set(0, 1.7, len / 2); hull.castShadow = hull.receiveShadow = true; g.add(hull);
      const ring = (u, face, inner) => { const r = new THREE.Mesh(new THREE.RingGeometry(inner, 3.0, 32), hm); r.position.set(0, 1.55, u); r.rotation.y = face; r.castShadow = r.receiveShadow = true; g.add(r); };
      ring(-.2, PI, 2.05); if (endType !== 'wall') ring(len + .2, 0, 2.05);
      if (endType === 'wall') { const cap = new THREE.Mesh(new THREE.SphereGeometry(3.0, 28, 12, 0, PI * 2, 0, PI / 2), hm); cap.scale.y = .45; cap.rotation.x = PI / 2; cap.position.set(0, 1.7, len + .2); cap.castShadow = cap.receiveShadow = true; g.add(cap); }
      for (let u = 1.2; u < len; u += 2.9) { const band = new THREE.Mesh(new THREE.TorusGeometry(3.02, .06, 6, 40), M.dark); band.position.set(0, 1.7, u); band.castShadow = true; g.add(band); }
      for (let i = 0; i < 4; i++) { const a = -.9 + i * .6, hrail = A.cyl(.03, len - 1.6, M.yellow, g, Math.sin(a) * 3.06, 1.7 + Math.cos(a) * 3.06, len / 2, 6); hrail.rotation.x = PI / 2; }
      A.bx(1.8, .05, 2.2, M.gold, g, 0, 4.72, len * .35);
    }
    // vestibule exterior (docking tube + flange rings)
    const tubeM = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.75, 1.4, 20), M.dark); tubeM.rotation.x = PI / 2; tubeM.position.set(0, 1.4, -.7); tubeM.castShadow = tubeM.receiveShadow = true; g.add(tubeM);
    [-1.3, -.1].forEach(u => { const r = new THREE.Mesh(new THREE.TorusGeometry(1.9, .16, 8, 28), M.steel); r.position.set(0, 1.4, u); r.castShadow = true; g.add(r); });
    // regolith radiation berm
    const mound = (x, y, z, sx, sy, sz, rr = 0) => { const m = A.sph(1, M.rego, g, x, y, z, 14); m.scale.set(sx, sy, sz); m.rotation.y = rr; return m; };
    if (!spec.windows) { mound(-3.9, -.2, len / 2, 1.9, 1.6, len / 2 + .6); mound(3.9, -.2, len / 2, 1.9, 1.6, len / 2 + .6); }
    if (berm === 'full') mound(0, 5.25, len / 2, 2.7, 1.3, len / 2 + .2);   // regolith roof over the sleeping quarters
    A.opt.cast = false;
    // floor-level bounds for HUD / minimap
    const [x0, z0] = f.w(-W / 2, -1.4), [x1, z1] = f.w(W / 2, len + .2);
    out.rooms.push({ id: spec.id, name: spec.label || name, x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1) });
    const [lx, lz] = f.w(0, len / 2); roomLight(lx, H - .5, lz);
    return f;
  }

  // ---------- module contents ----------
  function powerLab(f) {
    rackRow(f, -1, 1.3, [{ kind: 'panel', key: 'power' }, { kind: 'cables', label: 'EPS WIRING' }, { kind: 'drawers', label: 'SPARES' }, { gap: 2.2 }, { kind: 'lockers', label: 'TOOLS' }]);
    rackRow(f, 1, 1.3, [{ kind: 'panel', key: 'battery', deco: g => { for (let i = 0; i < 5; i++) { const m = new THREE.MeshBasicMaterial({ color: 0x33ff77 }); A.bx(.14, .08, .02, m, g, -.3 + i * .15, 2.08, .36, { cast: false }); animated.battery.push(m); } } }, { kind: 'vents', label: 'COOLING LOOP' }, { kind: 'drawers', label: 'CELLS' }, { kind: 'lockers' }, { kind: 'panel', label: 'LAB' }, { kind: 'drawers' }]);
    // workbench with laptops and tools in the gap on the left
    const bu = 5.7; A.bx(.8, .9, 2.0, M.white, f.g, -W / 2 + .5, .45, bu); A.bx(.9, .05, 2.1, M.grey, f.g, -W / 2 + .5, .92, bu);
    A.bx(.4, .02, .28, M.dark, f.g, -W / 2 + .5, .96, bu - .5); const lp = A.bx(.4, .26, .02, M.dark, f.g, -W / 2 + .5, 1.08, bu - .62); lp.rotation.x = -.2;
    A.bx(.12, .1, .5, M.orange, f.g, -W / 2 + .4, .99, bu + .4); A.bx(.3, .06, .2, M.yellow, f.g, -W / 2 + .55, .98, bu + .1); A.cyl(.04, .3, M.steel, f.g, -W / 2 + .3, 1.07, bu + .7, 8).rotation.z = PI / 2;
    f.solid(.8, .9, 2.0, -W / 2 + .5, .45, bu);
  }
  function crewQuarters(f) {
    // sleep stations (left), toilet, galley (right)
    for (let i = 0; i < 4; i++) {
      const u = 1.8 + i * 1.5; A.bx(.9, 2.2, 1.25, M.grey, f.g, -W / 2 + .45 + .02, 1.1, u);
      const door = A.plane(1.1, 1.9, T.sign(`CREW ${i + 1}`, { w: 256, h: 512, fs: 70, bg: ['#1e5a6a', '#6a3a1e', '#3a1e6a', '#1e6a3a'][i], sub: 'SLEEP' }), f.g, -W / 2 + .94, 1.05, u, PI / 2); door.rotation.y = PI / 2;
      A.bx(.2, .06, .6, M.lightPanel, f.g, -W / 2 + .96, 2.0, u, { cast: false, recv: false });
      const ph = A.plane(.34, .26, T.photo(), f.g, -W / 2 + .952, 1.55, u + .35, PI / 2);
    }
    f.solid(.9, 2.2, 6.2, -W / 2 + .47, 1.1, 4.6);
    A.bx(.9, 2.0, 1.1, M.white, f.g, -W / 2 + .47, 1.0, 8.4); sign(f.g, 'WASTE & HYGIENE', -W / 2 + .94, 2.2, 8.4, PI / 2, 1.0, .3, { bg: '#2a2f37' });
    A.bx(.02, 1.7, .9, M.glass, f.g, -W / 2 + .93, 1.0, 8.4, { cast: false }); f.solid(.9, 2.0, 1.1, -W / 2 + .47, 1, 8.4);
    // right wall: galley
    rackRow(f, 1, 1.3, [{ kind: 'lockers', label: 'FOOD' }, { kind: 'drawers', label: 'RATIONS' }, { gap: 2.6 }, { kind: 'panel', label: 'WATER DISPENSER', deco: g => { A.cyl(.05, .3, M.blue, g, .1, 1.2, .4, 8); } }, { kind: 'lockers', label: 'MEDICAL' }, { kind: 'vents' }]);
    const tu = 4.6, tx = W / 2 - .85; A.bx(1.0, .06, 2.0, M.white, f.g, tx, .82, tu); A.cyl(.06, .8, M.steel, f.g, tx, .4, tu, 8); A.bx(.8, .03, .6, M.steel, f.g, tx, .02, tu, { cast: false });
    [-.7, .7].forEach(z => { stool(f.g, tx - .65, tu + z); stool(f.g, tx + .65, tu + z); });
    const foodCols = [0xe15b2d, 0x6fc04a, 0xf0c040, 0x4a7de0, 0xe8e8e8];
    for (let i = 0; i < 6; i++) A.bx(.2, .05, .14, new THREE.MeshStandardMaterial({ color: foodCols[i % 5], roughness: .8 }), f.g, tx + (i % 2 ? .25 : -.25), .87, tu - .7 + i * .28);
    f.solid(1.1, .85, 2.0, tx, .42, tu);
    // treadmill at the end
    const tmx = 0, tmu = 10.3; A.bx(1.0, .18, 1.9, M.dark, f.g, tmx, .09, tmu); A.bx(.8, .02, 1.6, M.rubber, f.g, tmx, .2, tmu, { cast: false });
    [-.5, .5].forEach(x => A.cyl(.03, 1.0, M.steel, f.g, x, .55, tmu - .8, 8)); A.bx(1.0, .05, .06, M.steel, f.g, tmx, 1.05, tmu - .8); A.bx(.4, .22, .04, M.dark, f.g, tmx, 1.2, tmu - .85).rotation.x = -.4; f.solid(1.0, .25, 1.9, tmx, .12, tmu);
    for (let i = 0; i < 3; i++) A.plane(.5, .4, T.photo(), f.g, -.5 + i * .5, 2.25, 11.88, PI);
  }
  function greenhouse(f) {
    rackRow(f, -1, 1.3, [{ kind: 'panel', key: 'greenhouse' }]);
    const pink = new THREE.MeshBasicMaterial({ color: 0xff5fd6 });
    const plantPos = [];
    const growRack = (side, cu, w) => {
      const g = new THREE.Group(); g.position.set(side * (W / 2 - .38), 0, cu); f.g.add(g); f.solid(.7, H, w, g.position.x, H / 2, cu); const px = g.position.x;
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => A.bx(.05, 3.0, .05, M.steel, g, a * .3, 1.5, b * (w / 2 - .04)));
      for (let k = 0; k < 4; k++) {
        const y = .3 + k * .75; A.bx(.7, .04, w - .06, M.steel, g, 0, y, 0); A.bx(.58, .1, w - .12, M.soil, g, 0, y + .07, 0, { cast: false });
        A.bx(.5, .03, w - .15, pink, g, 0, y + .7, 0, { cast: false, recv: false });
        if (k < 3) for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) plantPos.push([px + (j - .5) * .2, y + .12, cu - w / 2 + .18 + i * (w - .3) / 5 + (j ? .06 : 0)]);
      }
      A.bx(.7, .06, w - .05, M.grey, g, 0, 3.05, 0);
    };
    for (let i = 0; i < 5; i++) growRack(1, 2.0 + i * 1.5, 1.4);
    for (let i = 0; i < 4; i++) growRack(-1, 3.5 + i * 1.5, 1.4);
    rackRow(f, -1, 9.0, [{ kind: 'vents' }]);
    // plants (instanced so we can wilt them)
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x2f9a3a, roughness: .9 }), leafMat = new THREE.MeshStandardMaterial({ color: 0x2ecc40, roughness: .8 });
    const stem = new THREE.InstancedMesh(new THREE.CylinderGeometry(.012, .02, .3, 5), stemMat, plantPos.length), leaf = new THREE.InstancedMesh(new THREE.SphereGeometry(.075, 7, 5), leafMat, plantPos.length);
    const d = new THREE.Object3D(); plantPos.forEach((p, i) => { d.position.set(p[0], p[1] + .15, p[2]); d.scale.set(1, 1, 1); d.rotation.set(0, i, 0); d.updateMatrix(); stem.setMatrixAt(i, d.matrix); });
    f.g.add(stem, leaf); stem.castShadow = leaf.castShadow = true;
    animated.plants = { stem, leaf, leafMat, stemMat, pos: plantPos, last: -1, d, base: new THREE.Color(0x2ecc40), dry: new THREE.Color(0x8a7a2a) };
    // pink grow-lamp glow
    const [gx, gz] = f.w(0, 6); const pl = new THREE.PointLight(0xff6ad5, 9, 11, 1.5); pl.position.set(gx, 2.6, gz); scene.add(pl); lights.push({ l: pl, I: 9 });
    // watering bench in the middle (low)
    A.bx(.8, .8, 1.6, M.white, f.g, 0, .4, 9.7); A.bx(.9, .05, 1.7, M.grey, f.g, 0, .82, 9.7); f.solid(.8, .8, 1.6, 0, .4, 9.7);
    [-1, 1].forEach(s => A.cyl(.12, .3, M.blue, f.g, s * .2, .98, 9.7, 12));
  }
  function cargo(f) {
    rackRow(f, -1, 1.3, [{ kind: 'lockers', label: 'CARGO A' }, { kind: 'lockers', label: 'CARGO B' }, { kind: 'drawers', label: 'SPARE PARTS' }, { kind: 'lockers', label: 'EVA TOOLS' }, { kind: 'drawers' }]);
    rackRow(f, 1, 1.3, [{ kind: 'drawers', label: 'FILTERS' }, { kind: 'lockers', label: 'CARGO C' }, { kind: 'cables' }, { kind: 'lockers', label: 'CARGO D' }, { kind: 'drawers' }]);
    const bag = [0xe9ecef, 0xe8741a, 0xdfe3e6].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: .95 }));
    for (let i = 0; i < 6; i++) { const sy = .45 + (i % 3) * .1; A.bx(.7, sy, .6, bag[i % 3], f.g, -W / 2 + .5, sy / 2 + (i > 2 ? .55 : 0), 7.4 + (i % 3) * .62); }
    f.solid(.8, 1.2, 2.0, -W / 2 + .5, .6, 8.0);
    [0, 1, 2].forEach(i => A.cyl(.18, 1.1, [M.orange, M.white, M.blue][i], f.g, W / 2 - .5, .55, 7.6 + i * .5, 14)); f.solid(.5, 1.1, 1.6, W / 2 - .5, .55, 8.1);
    sign(f.g, 'SPARE PARTS = ORANGE CRATES', 0, 3.0, 4.6, 0, 2.4, .35, { bg: '#7a3a08' }); sign(f.g, 'SPARE PARTS = ORANGE CRATES', 0, 3.0, 4.58, PI, 2.4, .35, { bg: '#7a3a08' });
  }
  function lifeSupport(f) {
    rackRow(f, -1, 1.3, [{ kind: 'panel', key: 'oxygen', label: 'OXYGEN GENERATOR' }, { kind: 'vents', label: 'CO2 REMOVAL' }, { kind: 'drawers', label: 'FILTERS' }, { gap: 3.4 }, { kind: 'lockers' }]);
    rackRow(f, 1, 1.3, [{ kind: 'pipes', key: 'cooling', label: 'COOLING LOOP' }, { kind: 'vents', label: 'HEAT EXCHANGER' }, { kind: 'panel', key: 'water', label: 'WATER RECYCLER' }, { kind: 'pipes', label: 'WATER LINES' }, { kind: 'drawers' }, { kind: 'lockers' }]);
    // water tanks (level follows the water meter)
    [0, 1, 2].forEach(i => {
      const u = 5.2 + i * .55, x = -W / 2 + .55; A.cyl(.22, 1.7, M.glass, f.g, x, 1.0, u, 16, { cast: false });
      const wm = new THREE.MeshStandardMaterial({ color: 0x3aa0ff, emissive: 0x0a3a80, roughness: .2, transparent: true, opacity: .85 }); const wt = A.cyl(.19, 1.6, wm, f.g, x, .2, u, 16, { cast: false }); animated.water.push(wt);
      A.cyl(.25, .08, M.dark, f.g, x, .12, u, 16); A.cyl(.25, .08, M.dark, f.g, x, 1.88, u, 16);
    });
    f.solid(.6, 1.9, 1.8, -W / 2 + .55, .95, 5.8);
    // pipes along the ceiling (blue = cold, red = hot)
    [[M.blue, -.2], [M.red, .1]].forEach(([m, x]) => { const p = A.cyl(.05, 10, m, f.g, x, H - .5, 5.9, 10); p.rotation.x = PI / 2; for (let u = 1.6; u < 10.4; u += 2.2) A.bx(.06, .3, .12, M.dark, f.g, x, H - .4, u, { cast: false }); });
    // oxygen bottles
    [0, 1].forEach(i => A.cyl(.14, .9, [M.white, M.blue][i], f.g, -W / 2 + .3, .45, 10.1 - i * .35, 12));
  }
  function airlock(f) {
    rackRow(f, -1, 1.3, [{ kind: 'lockers', label: 'EVA TOOLS' }, { kind: 'panel', label: 'SUIT SERVICE' }, { gap: 3.0 }]);
    rackRow(f, 1, 1.3, [{ kind: 'drawers', label: 'BATTERIES' }, { kind: 'lockers', label: 'HELMETS' }, { kind: 'panel', label: 'AIRLOCK CONTROL' }, { kind: 'lockers' }]);
    // suits hanging on the left wall
    [0, 1].forEach(i => { const a = A.makeAstronaut({ eva: true }); a.position.set(-W / 2 + .75, .05, 4.0 + i * 1.5); a.rotation.y = PI / 2; a.scale.setScalar(1.12); f.g.add(a); a.traverse(o => { o.castShadow = true; }); A.bx(.05, 2.2, .7, M.steel, f.g, -W / 2 + .12, 1.2, 4.0 + i * 1.5, { cast: false }); });
    A.bx(1.4, .45, .5, M.white, f.g, W / 2 - .9, .22, 6.3); f.solid(.5, .45, 1.4, W / 2 - .9, .22, 6.3);
    for (let i = 0; i < 3; i++) A.bx(.3, .03, 1.6, M.yellow, f.g, -.7 + i * .7, .012, 4.6, { cast: false }).scale.y = .6;
    // exterior door (two leaves slide apart when you approach)
    const leaves = [-1, 1].map(s => { const m = A.tiledBox(OPW / 2, OPH, .16, M.hull, 1.2); m.position.set(s * OPW / 4, OPH / 2, f.len + .32); m.castShadow = m.receiveShadow = true; f.g.add(m); A.bx(.2, .5, .06, M.visor, m, -s * .3, .4, .09, { cast: false });
      const b = f.solid(OPW / 2, OPH, .16, s * OPW / 4, OPH / 2, f.len + .32); return { m, b, s }; });
    const lamp = A.sph(.14, M.emRed, f.g, 0, OPH + .22, f.len + .4, 10, { cast: false });
    bulkhead(f, f.len + .1, W + .4, H, OPW, OPH, '-z');
    A.opt.cast = true; A.bx(OPW + .6, .2, 1.6, M.hull, f.g, 0, OPH + .5, f.len + 1.0); [-1, 1].forEach(s => A.bx(.1, 1.0, 1.4, M.steel, f.g, s * (OPW / 2 + .25), OPH + .0, f.len + 1.0)); A.opt.cast = false;
    [-1, 1].forEach(s => { const fl = A.bx(.4, .15, .3, M.lightPanel, f.g, s * 1.2, OPH + .38, f.len + 1.5, { cast: false, recv: false }); });
    const [dx, dz] = f.w(0, f.len + .3); out.doors.push({ f, leaves, lamp, x: dx, z: dz, open: 0 });
    A.bx(OPW + .4, .02, 2.4, M.hazard, f.g, 0, .005, f.len + 1.9, { cast: false }).scale.y = .5;
  }
  function commsBay(f) {
    rackRow(f, -1, 1.3, [{ kind: 'panel', key: 'signal', label: 'SIGNAL & TRANSMITTER' }, { kind: 'cables', label: 'WAVEGUIDES' }, { kind: 'vents', label: 'AMPLIFIERS' }, { kind: 'drawers' }, { kind: 'lockers' }, { kind: 'panel', label: 'MODEMS' }]);
    rackRow(f, 1, 1.3, [{ kind: 'panel', key: 'antenna', label: 'ANTENNA CONTROL' }, { kind: 'cables' }, { kind: 'drawers', label: 'RF SPARES' }, { kind: 'lockers' }, { w: 1.4, kind: 'display', key: 'comms', label: 'RADIO TERMINAL' }, { kind: 'drawers' }]);
    // chair at the radio terminal, live link display on the left wall
    stool(f.g, W / 2 - 1.25, 6.4, .5);
    const disp = T.statusScreen(() => { }); animated.displays.push({ kind: 'comms', d: disp });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.8, .9), new THREE.MeshBasicMaterial({ map: disp.t })); m.position.set(-W / 2 + .12, 1.9, 9.3); m.rotation.y = PI / 2; f.g.add(m);
    A.bx(.06, 1.0, 1.9, M.dark, f.g, -W / 2 + .07, 1.9, 9.3);
  }
  function cupola(f) {
    // glass bay with a clear view of the dish and Earth
    const mat = M.wallIn, windows = [[1.0, 2.6], [3.2, 4.8], [5.0, 6.4]];
    [-1, 1].forEach(s => {
      const x = s * (W / 2 + .1), inw = s < 0 ? '+x' : '-x';
      f.slab(.2, 1.2, f.len, x, .3, f.len / 2, mat, M.hull, inw); f.slab(.2, .7, f.len, x, H - .15, f.len / 2, mat, M.hull, inw);
      const pts = [0, ...windows.flat(), f.len]; for (let i = 0; i < pts.length; i += 2) { const a = pts[i], b = pts[i + 1]; if (b - a > .05) f.slab(.2, H - .9 - .3, b - a, x, (.9 + H - .3) / 2, (a + b) / 2, mat, M.hull, inw); }
      windows.forEach(([a, b]) => { const gl = new THREE.Mesh(new THREE.PlaneGeometry(b - a, H - 1.2), M.glass); gl.position.set(x, (.9 + H - .3) / 2, (a + b) / 2); gl.rotation.y = PI / 2; gl.material.side = THREE.DoubleSide; f.g.add(gl); A.bx(.3, .08, b - a + .1, M.steel, f.g, x, .9, (a + b) / 2, { cast: false }); A.bx(.3, .08, b - a + .1, M.steel, f.g, x, H - .3, (a + b) / 2, { cast: false }); });
    });
    // big end window
    f.slab(W + .4, 1.2, .2, 0, .3, f.len + .1, mat, M.hull, '-z'); f.slab(W + .4, .7, .2, 0, H - .15, f.len + .1, mat, M.hull, '-z'); [-1, 1].forEach(s => f.slab(.5, H - .9 - .3, .2, s * (W / 2 - .05), (.9 + H - .3) / 2, f.len + .1, mat, M.hull, '-z'));
    const eg = new THREE.Mesh(new THREE.PlaneGeometry(W - .8, H - 1.2), M.glass); eg.position.set(0, (.9 + H - .3) / 2, f.len + .1); eg.material.side = THREE.DoubleSide; f.g.add(eg);
    for (let i = -1; i <= 1; i++) A.bx(.08, H - 1.2, .1, M.steel, f.g, i * 1.5, (.9 + H - .3) / 2, f.len + .1, { cast: false });
    // ceiling with a skylight hole
    { const hv = 1.2, hu = 1.5; [-1, 1].forEach(sd => f.slab(W / 2 + .2 - hv, .2, f.len, sd * ((W / 2 + .2 + hv) / 2), H + .1, f.len / 2, M.ceilIn, M.hull, '-y'));
      [-1, 1].forEach(sd => f.slab(2 * hv, .2, f.len / 2 - hu, 0, H + .1, f.len / 2 + sd * (hu + (f.len / 2 - hu) / 2), M.ceilIn, M.hull, '-y')); }
    const sk = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.0), M.glass); sk.rotation.x = PI / 2; sk.position.set(0, H + .12, f.len / 2); f.g.add(sk); A.bx(2.6, .1, .12, M.steel, f.g, 0, H + .12, f.len / 2 - 1.55, { cast: false }); A.bx(2.6, .1, .12, M.steel, f.g, 0, H + .12, f.len / 2 + 1.55, { cast: false });
    // control desk with arm joysticks + two seats
    A.bx(2.8, .8, .8, M.white, f.g, 0, .4, f.len - 1.3); A.bx(2.9, .06, .9, M.dark, f.g, 0, .83, f.len - 1.3); f.solid(2.8, .9, .8, 0, .45, f.len - 1.3);
    [-.8, .8].forEach(x => { A.cyl(.03, .25, M.steel, f.g, x, 1.0, f.len - 1.3, 8); A.sph(.07, M.red, f.g, x, 1.15, f.len - 1.3, 8); });
    const scr = A.bx(.8, .45, .04, M.lightPanel, f.g, 0, 1.25, f.len - 1.55, { cast: false }); scr.material = new THREE.MeshBasicMaterial({ color: 0x69b7ff }); scr.rotation.x = -.3;
    [-.7, .7].forEach(x => { stool(f.g, x, f.len - 2.3, .5); A.bx(.4, .5, .08, M.dark, f.g, x, .8, f.len - 2.5); });
    sign(f.g, 'CUPOLA  OBSERVATION', 0, 3.0, 1.4, 0, 2.2, .32, { bg: '#0a2a52' });
    // gold sun visor frame outside
    A.opt.cast = true; A.bx(W + .6, .12, 1.0, M.gold, f.g, 0, H + .3, f.len + .55); A.opt.cast = false;
    [-1, 1].forEach(s => lightStrip(f.g, s * 1.2, H - .03, f.len - 1.5, 1.2, .35));
    // exterior floodlights
    [-1, 1].forEach(s => A.bx(.3, .2, .3, M.lightPanel, f.g, s * (W / 2 + .3), H + .25, f.len + .2, { cast: false, recv: false }));
  }

  // ---------- central hub (Node) ----------
  function hub() {
    const f = new Frame(0, 0, 0), g = f.g, h = HUB.h, hw = HUB.half;
    f.slab(8.8, .3, 8.8, 0, -.15, 0, M.floorIn, M.dark, '+y'); f.slab(8.8, .2, 8.8, 0, h + .1, 0, M.ceilIn, M.dark, '-y');
    [0, PI / 2, PI, -PI / 2].forEach(r => { const fr = new Frame(0, 0, r); bulkhead(fr, hw + .1, 8.4, h, OPW, OPH, '-z'); });
    // hub hull: low drum + dome (regolith-covered storm shelter)
    const hm = M.hull.clone(); hm.map = M.hull.map.clone(); hm.map.needsUpdate = true; hm.map.repeat.set(8, 2);
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(6.35, 6.35, 4.6, 32), hm); drum.position.y = 2.0; drum.castShadow = drum.receiveShadow = true; g.add(drum);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(6.35, 28, 10, 0, PI * 2, 0, PI / 2), hm); dome.scale.y = .38; dome.position.y = 4.3; dome.castShadow = dome.receiveShadow = true; g.add(dome);
    A.opt.cast = true;
    const cap = A.sph(1, M.rego, g, 0, 5.75, 0, 18); cap.scale.set(5.2, 1.55, 5.2);   // regolith roof = storm shelter
    [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([x, z]) => { const m = A.sph(1, M.rego, g, x * 5.4, -.3, z * 5.4, 12); m.scale.set(2.2, 1.6, 2.2); });
    A.opt.cast = false;
    for (let a = 0; a < 6.28; a += .52) { const r = new THREE.Mesh(new THREE.BoxGeometry(.12, 4.7, .12), M.dark); r.position.set(Math.cos(a) * 6.37, 2.0, Math.sin(a) * 6.37); g.add(r); }
    // central command table
    A.cyl(1.05, .08, M.white, g, 0, .86, 0, 24); A.cyl(.35, .86, M.steel, g, 0, .43, 0, 14); A.cyl(1.15, .06, M.dark, g, 0, .03, 0, 24, { cast: false });
    const hubTab = T.statusScreen(() => { }); animated.displays.push({ kind: 'hub', d: hubTab });
    const tabTop = new THREE.Mesh(new THREE.PlaneGeometry(1.7, .85), new THREE.MeshBasicMaterial({ map: hubTab.t })); tabTop.rotation.x = -PI / 2; tabTop.position.y = .91; g.add(tabTop);
    for (let i = 0; i < 4; i++) { const a = i * PI / 2 + PI / 4; stool(g, Math.cos(a) * 1.7, Math.sin(a) * 1.7); }
    body(0, .45, 0, 1.05, .45, 1.05);
    // ring light
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.3, .08, 8, 40), M.lightPanel); ring.rotation.x = PI / 2; ring.position.y = h - .08; g.add(ring);
    A.cyl(2.4, .02, M.hazard, g, 0, .01, 0, 40, { cast: false }).visible = false;
    // wall panels either side of each hatch. Frame r: local +z points out of the hub toward the spoke.
    const seg = (r, sd, fn) => { const fr = new Frame(0, 0, r), hold = new THREE.Group(); hold.position.set(sd * 2.8, 0, hw - .3); hold.rotation.y = PI; fr.g.add(hold); fn(hold); };
    const north = (sd, fn) => seg(PI, sd, fn), east = (sd, fn) => seg(PI / 2, sd, fn), south = (sd, fn) => seg(0, sd, fn), west = (sd, fn) => seg(-PI / 2, sd, fn);
    north(1, (hold) => { const u1 = A.rackUnit('panel', 2.0, 2.0, .6); u1.position.y = 1; hold.add(u1); solids.push(u1); addConsole(hold, 'shield', 'RADIATION SHIELD', 1.35, 1.1);
      A.plane(.55, .55, T.radiationSign(), hold, -.7, 2.45, .31); A.plane(.55, .55, T.radiationSign(), hold, .7, 2.45, .31);
      [.06, 2.06].forEach(y => { const hz = A.tiledBox(2.0, .12, .62, M.hazard, 1); hz.position.set(0, y, 0); hold.add(hz); }); });
    north(-1, (hold) => { const u1 = A.rackUnit('lockers', 2.4, 1.1, .5); u1.position.set(0, .55, 0); hold.add(u1); solids.push(u1);
      const disp = T.statusScreen(() => { }); animated.displays.push({ kind: 'wall', d: disp });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.2), new THREE.MeshBasicMaterial({ map: disp.t })); m.position.set(0, 2.1, .27); hold.add(m); A.bx(2.5, 1.3, .08, M.dark, hold, 0, 2.1, .22); });
    const generic = (fn, sd, label, kind) => fn(sd, (hold) => { const u1 = A.rackUnit(kind, 2.4, 2.0, .6); u1.position.y = 1; hold.add(u1); solids.push(u1); const u2 = A.rackUnit('lockers', 2.4, 1.0, .5); u2.position.set(0, 2.55, 0); hold.add(u2); sign(hold, label, 0, 2.1, .31, 0, 1.6, .3, { bg: '#2a2f37', fg: '#d5dbe3' }); });
    generic(east, 1, 'FIRST AID', 'lockers'); generic(east, -1, 'EMERGENCY GEAR', 'drawers'); generic(south, 1, 'SUIT SPARES', 'panel'); generic(south, -1, 'DATA & LOGS', 'cables');
    generic(west, 1, 'FOOD STORE', 'lockers'); generic(west, -1, 'MEDICAL', 'drawers');
    // wall collision strips (hub wall segments are already solid slabs, racks protrude 0.6)
    [[0, -1], [0, 1], [1, 0], [-1, 0]].forEach(([x, z]) => { [-1, 1].forEach(s => { const sx = x ? .6 : 2.8, sz = x ? 2.8 : .6; body(x * (hw - .3) + (x ? 0 : s * 2.8), 1.7, z * (hw - .3) + (z ? 0 : s * 2.8), sx / 2, 1.7, sz / 2); }); });
    // extinguishers + beacons
    extinguisher(g, 2.2, .0, -3.7); extinguisher(g, -2.2, 0, 3.7);
    [[2.8, 3.6], [-2.8, -3.6]].forEach(([x, z]) => A.cyl(.16, .14, M.emRed, g, x, h - .15, z, 10, { cast: false }));
    [['LIFE SUPPORT + AIRLOCK  EAST', -PI / 2, hw - .1, 0], ['GREENHOUSE + CARGO  WEST', PI / 2, -hw + .1, 0], ['POWER LAB + CREW  NORTH', 0, 0, -hw + .1], ['COMMS + CUPOLA  SOUTH', PI, 0, hw - .1]].forEach(([t, ry, x, z]) => sign(g, t, x, 3.55, z, ry, 2.5, .28, { bg: '#123c6e' }));
    out.rooms.push({ id: 'hub', name: 'HUB · COMMAND NODE', x0: -hw, x1: hw, z0: -hw, z1: hw });
    [[0, 3.6, 0, 0xfff0dd, 20, 14]].forEach(([x, y, z, c, I, d]) => roomLight(x, y, z, c, I, d));
    // crew in the hub
    npc(0, .0, 2.6, { color: 0xd8472c }, PI); npc(1.9, 0, -.6, { color: 0x2a5db0 }, -2);
    return f;
  }
  function npc(x, y, z, opts, ry = 0) { const a = A.makeAstronaut(opts); a.position.set(x, y, z); a.rotation.y = ry; scene.add(a); a.traverse(o => { if (o.isMesh) o.castShadow = true; }); out.npcs.push({ g: a, y0: y, t: Math.random() * 6 }); body(x, 1, z, .3, 1, .3); return a; }

  // ---------- assemble ----------
  const CHAINS = {
    N: [{ id: 'power', name: 'POWER LAB', len: 10, fn: powerLab, nextName: 'CREW QUARTERS', endType: 'open' }, { id: 'crew', name: 'CREW QUARTERS', len: 12, fn: crewQuarters, berm: 'full' }],
    W: [{ id: 'greenhouse', name: 'GREENHOUSE', len: 12, fn: greenhouse, nextName: 'CARGO BAY', endType: 'open' }, { id: 'cargo', name: 'CARGO BAY', len: 9, fn: cargo }],
    E: [{ id: 'life', name: 'LIFE SUPPORT', len: 12, fn: lifeSupport, nextName: 'AIRLOCK', endType: 'open' }, { id: 'airlock', name: 'AIRLOCK', len: 7, fn: airlock, endType: 'none' }],
    S: [{ id: 'comms', name: 'COMMS BAY', len: 12, fn: commsBay, nextName: 'CUPOLA', endType: 'open' }, { id: 'cupola', name: 'CUPOLA', len: 7, fn: cupola, endType: 'none', windows: true, hullCeil: true }],
  };
  hub();
  for (const dir in CHAINS) { let off = 0, prev = ''; CHAINS[dir].forEach(sp => { const f = shell({ ...sp, dir, off, prevName: prev }); sp.fn(f); off += sp.len + GAP; prev = sp.name; }); }
  // ceiling beacon blink + room labels done. spawn zones for spare-part crates (x0,x1,z0,z1)
  out.spawnZones = [[-26, -20.5, -1.4, 1.4], [-26, -20.5, -1.4, 1.4], [-3.4, -2.2, -3.4, -2.2], [2.2, 3.4, 2.2, 3.4], [-14, -8, -1.2, 1.2], [8, 14, -1.2, 1.2], [-1.2, 1.2, 8, 14], [-1.2, 1.2, -14, -8]];

  // ---------- sparks (shown on failed, inspected systems) ----------
  for (const k in consoles) {
    const n = 14, p = new THREE.BufferGeometry(); p.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const pts = new THREE.Points(p, new THREE.PointsMaterial({ color: 0xffd36a, size: .07, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); pts.frustumCulled = false; pts.visible = false; scene.add(pts);
    animated.sparks[k] = pts;
  }

  // ---------- per-frame ----------
  let tAcc = 1, clock = 0; const tmpV = new THREE.Vector3();
  const wallDraw = (g, w, h) => {
    g.fillStyle = '#05101f'; g.fillRect(0, 0, w, h); g.fillStyle = '#7fd0ff'; g.font = 'bold 26px monospace'; g.textAlign = 'left'; g.fillText(`SELENE BASE · DAY ${S.day}`, 16, 34);
    const ic = { oxygen: '#58d0ff', power: '#ffd34a', water: '#4a8dff', food: '#6bdc5a', safety: '#ff8a5a' };
    Object.keys(S.m).forEach((k, i) => { const y = 60 + i * 36, v = S.m[k]; g.fillStyle = '#9bb'; g.font = '20px monospace'; g.fillText(k.toUpperCase(), 16, y + 18); g.fillStyle = '#16263a'; g.fillRect(140, y, 340, 22); g.fillStyle = v < 25 ? '#ff4a4a' : ic[k]; g.fillRect(140, y, 340 * v / 100, 22); });
  };
  const hubDraw = (g, w, h) => { g.fillStyle = '#071a2e'; g.fillRect(0, 0, w, h); g.fillStyle = '#9ad1ff'; g.font = 'bold 30px monospace'; g.textAlign = 'center'; g.fillText('BASE STATUS', w / 2, 50); g.font = '24px monospace';
    g.fillText(`DAY ${S.day}   ACTIONS ${S.ap}   PARTS ${S.parts}`, w / 2, 100); const bad = Object.keys(S.sys).filter(k => S.sys[k].seen && S.sys[k].st > 0).length; g.fillStyle = bad ? '#ffb347' : '#6bdc5a'; g.fillText(bad ? `${bad} SYSTEM(S) NEED REPAIR` : 'ALL CHECKED SYSTEMS OK', w / 2, 150); g.fillStyle = S.spe ? '#ff5a5a' : '#6b8aa8'; g.fillText(S.spe ? '⚠ SOLAR STORM: SHIELD UP' : 'SPACE WEATHER: QUIET', w / 2, 200); };
  const commsDraw = (g, w, h) => { g.fillStyle = '#04141a'; g.fillRect(0, 0, w, h); g.font = 'bold 34px monospace'; g.textAlign = 'left'; g.fillStyle = '#7fe0ff'; g.fillText('LONG-RANGE LINK', 20, 50); g.font = '28px monospace';
    g.fillStyle = S.done.commsPower ? '#6bdc5a' : '#ff9a4a'; g.fillText(`RADIO   ${S.done.commsPower ? 'ON' : 'OFF'}`, 20, 110); g.fillStyle = S.flags.station ? '#6bdc5a' : '#6b8aa8'; g.fillText(`STATION ${S.flags.station ? 'LINKED' : '---'}`, 20, 160); g.fillStyle = S.flags.earth ? '#6bdc5a' : '#6b8aa8'; g.fillText(`EARTH   ${S.flags.earth ? 'LINKED' : '---'}`, 20, 210); };
  out.update = (dt, pp) => {
    clock += dt; tAcc += dt;
    const p = S.m.power / 100, k = p < .15 ? .15 + Math.random() * .3 : .3 + .7 * p;
    M.lightPanel.color.setScalar(k * 1.05); const gl = p < .15 ? k * .5 : .25 + .75 * p; M.wallIn.emissiveIntensity = M.ceilIn.emissiveIntensity = M.floorIn.emissiveIntensity = .32 * gl;
    lights.forEach(o => { o.l.intensity = o.I * (p < .15 ? (Math.random() * .4 + .1) : .25 + .75 * p); });
    const warn = S.spe || p < .2, bl = warn ? (Math.sin(clock * 7) > 0 ? 1 : .08) : .55; M.emRed.color.setRGB(bl, bl * .16, bl * .1);
    // sparks
    for (const key in animated.sparks) { const sp = animated.sparks[key], s = S.sys[key], on = s && s.seen && s.st === 2 && key !== 'comms'; sp.visible = on; if (!on) continue; const c = consoles[key], a = sp.geometry.attributes.position; c.getWorldPosition(tmpV);
      for (let i = 0; i < a.count; i++) a.setXYZ(i, tmpV.x + (Math.random() - .5) * .9, tmpV.y + (Math.random() - .3) * .8, tmpV.z + (Math.random() - .5) * .9); a.needsUpdate = true; sp.material.opacity = Math.random() > .35 ? 1 : 0; }
    // plants wilt with the food meter; water tanks follow the water meter; battery LEDs follow power
    const pl = animated.plants, fb = Math.round(S.m.food / 5);
    if (pl && pl.last !== fb) { pl.last = fb; const hs = .25 + .75 * Math.min(1, S.m.food / 100), c = pl.base.clone().lerp(pl.dry, S.m.food < 30 ? 1 - S.m.food / 30 : 0);
      pl.pos.forEach((q, i) => { pl.d.position.set(q[0], q[1] + .15 * hs, q[2]); pl.d.scale.set(1, hs, 1); pl.d.rotation.set(0, i, 0); pl.d.updateMatrix(); pl.stem.setMatrixAt(i, pl.d.matrix);
        pl.d.position.set(q[0], q[1] + .3 * hs + .05, q[2]); pl.d.scale.set(1.5 * hs, hs * (S.m.food < 30 ? .45 : .8), 1.5 * hs); pl.d.updateMatrix(); pl.leaf.setMatrixAt(i, pl.d.matrix); });
      pl.stem.instanceMatrix.needsUpdate = pl.leaf.instanceMatrix.needsUpdate = true; pl.leafMat.color.copy(c); pl.stemMat.color.copy(c).multiplyScalar(.8); }
    animated.water.forEach((w, i) => { const v = Math.max(.02, S.m.water / 100); w.scale.y = v; w.position.y = .15 + .8 * v; });
    animated.battery.forEach((m, i) => m.color.setHex(S.m.power > (i + .5) * 20 ? (S.m.power < 30 ? 0xffc233 : 0x33ff77) : 0x222a33));
    // live screens (throttled)
    if (tAcc > .4) { tAcc = 0; animated.displays.forEach(o => o.d.redraw(o.kind === 'wall' ? wallDraw : o.kind === 'hub' ? hubDraw : commsDraw)); }
    // crew idle
    out.npcs.forEach(n => { if (!n.g) return; n.t += dt; n.g.position.y = n.y0 + Math.sin(n.t * 1.6) * .008; const h = n.g.userData.parts && n.g.userData.parts.head; if (h) h.rotation.y = Math.sin(n.t * .6) * .5; });
    // airlock doors
    out.doors.forEach(d => { const near = Math.hypot(pp.x - d.x, pp.z - d.z) < 3.4; d.open += ((near ? 1 : 0) - d.open) * Math.min(1, dt * 3);
      d.leaves.forEach(l => { const lx = l.s * (OPW / 4 + d.open * (OPW / 2 - .05)); l.m.position.x = lx; const [wx, wz] = d.f.w(lx, d.f.len + .32); l.b.position.x = wx; l.b.position.z = wz; l.b.aabbNeedsUpdate = true; });
      d.lamp.material = d.open > .5 ? M.emGreen : M.emRed; });
  };
  return out;
}
