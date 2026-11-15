// Selene Base: a hub-and-spoke station inspired by the ISS (node + lab + habitation + greenhouse + airlock + cupola).
// Layout and sizes are INVENTED design values. Module names map to ISS analogues in docs/ASSETS.md.
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import * as T from './textures.js';
import * as A from './assets.js';
import { prismConvex, revolvedConvex, arc } from './collide.js';
import { SYSTEMS } from '../data/outpost_data.js';
import { S } from './state.js';
const { M } = A;

const W = 4.8, H = 3.4, TH = .2, OPW = 2.8, OPH = 2.8, GAP = 1.4;      // module width/height, wall thickness, hatch opening, gap between modules
const HUB = { half: 4, h: 4.2 };
const PI = Math.PI;

export function buildBase(ctx) {
  const { scene, phys, solids, consoles, hits, lights } = ctx;
  const out = { rooms: [], beds: [], spawnZones: [], npcs: [], doors: [], update: null };
  const animated = { plants: null, water: [], battery: [], displays: [], sparks: {} };

  A.opt.cast = false;   // interior decor does not cast shadows (saves draw calls)
  // ---------- physics + frame helpers ----------
  const body = (x, y, z, hx, hy, hz) => { const b = new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(hx, hy, hz)) }); b.position.set(x, y, z); phys.addBody(b); return b; };
  class Frame {
    constructor(ox, oz, rot) { this.g = new THREE.Group(); this.g.position.set(ox, 0, oz); this.g.rotation.y = rot; scene.add(this.g); this.ox = ox; this.oz = oz; this.rot = rot; this.c = Math.cos(rot); this.s = Math.sin(rot); }
    convex(shapes) { const b = new CANNON.Body({ mass: 0 }); shapes.forEach(([sh, off]) => { const o = sh.offset ? sh.offset.clone() : new CANNON.Vec3(); if (off) o.vadd(new CANNON.Vec3(...off), o); b.addShape(sh, o); }); b.position.set(this.ox, 0, this.oz); b.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), this.rot); phys.addBody(b); return b; }
    w(lx, lz) { return [this.ox + lx * this.c + lz * this.s, this.oz - lx * this.s + lz * this.c]; }
    solid(sx, sy, sz, lx, ly, lz) { const [x, z] = this.w(lx, lz), sw = Math.abs(this.s) > .5; return body(x, ly, z, (sw ? sz : sx) / 2, sy / 2, (sw ? sx : sz) / 2); }
    // solid slab: visible from inside with inMat, other faces outMat. inward = local face normal pointing into the room.
    slab(sx, sy, sz, lx, ly, lz, inMat, outMat, inward, collide = true, thick = true) {
      const idx = { '+x': 0, '-x': 1, '+y': 2, '-y': 3, '+z': 4, '-z': 5 }, mats = Array(6).fill(outMat);
      if (inward) mats[idx[inward]] = inMat; if (inward === 'both') mats.fill(inMat);
      const m = A.tiledBox(sx, sy, sz, mats, 1.5); m.position.set(lx, ly, lz); m.castShadow = m.receiveShadow = true; this.g.add(m);
      if (collide) {   // collision is thicker than the thin visible wall (grows AWAY from the room) so nothing can squeeze through
        let [cx, cy, cz] = [lx, ly, lz], [bx_, by_, bz_] = [sx, sy, sz]; const T_ = thick ? .55 : 0, mn = Math.min(sx, sy, sz);
        if (mn < T_) { const ex = T_ - mn, sg = inward && inward !== 'both' ? (inward[0] === '+' ? -1 : 1) : 0, ax = inward && inward !== 'both' ? inward[1] : null;
          if (mn === sy) { by_ = T_; cy += (ax === 'y' ? sg : 0) * ex / 2; } else if (mn === sx) { bx_ = T_; cx += (ax === 'x' ? sg : 0) * ex / 2; } else { bz_ = T_; cz += (ax === 'z' ? sg : 0) * ex / 2; } }
        this.solid(bx_, by_, bz_, cx, cy, cz); solids.push(m); } return m;
    }
  }
  const hullMat = (rx, ry) => { const m = M.hull.clone(); m.map = M.hull.map.clone(); m.bumpMap = M.hull.bumpMap.clone(); [m.map, m.bumpMap].forEach(t => { t.repeat.set(rx, ry); t.needsUpdate = true; }); return m; };
  const kbody = (x, y, z, hx, hy, hz) => { const b = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC, shape: new CANNON.Box(new CANNON.Vec3(hx, hy, hz)) }); b.position.set(x, y, z); phys.addBody(b); return b; };
  // sliding hatch: two leaves that slide into the wall when the player is near. Real (kinematic) physics bodies follow the leaves.
  function addDoor(f, pos, label) {
    const sw = Math.abs(f.s) > .5, lw = OPW / 4 + .03, lamp = new THREE.MeshBasicMaterial({ color: 0xff2a1a });
    const leaves = [-1, 1].map(s => { const m = new THREE.Mesh(new THREE.BoxGeometry(OPW / 2 + .06, OPH, .08), M.doorLeaf); m.position.set(s * OPW / 4, OPH / 2, pos); m.castShadow = m.receiveShadow = true; f.g.add(m);
      const [wx, wz] = f.w(s * OPW / 4, pos), b = kbody(wx, OPH / 2, wz, sw ? .12 : lw, OPH / 2, sw ? lw : .12); return { m, b, s }; });
    [-1, 1].forEach(sd => { const z = pos + sd * .13; [-1, 1].forEach(s => A.bx(.12, .12, .05, lamp, f.g, s * (OPW / 2 + .32), OPH - .05, z, { cast: false, recv: false }));   /* corner lamps, clear of the room sign */ [-1, 1].forEach(s => { A.bx(.16, .24, .05, M.dark, f.g, s * (OPW / 2 + .32), 1.3, z, { cast: false }); A.bx(.1, .06, .02, M.emAmber, f.g, s * (OPW / 2 + .32), 1.36, z + sd * .03, { cast: false }); }); });
    const [dx, dz] = f.w(0, pos); const d = { f, leaves, lamp, x: dx, z: dz, open: 0, pos }; out.doors.push(d); return d;
  }
  // wall plane z=pos (local) with a centred opening
  function bulkhead(f, pos, Wd, Hh, opW, opH, inward, mat = M.wallIn) {
    const jw = (Wd - opW) / 2, fh = Hh + .5, cy = (Hh - .1) / 2;
    [-1, 1].forEach(s => f.slab(jw, fh, TH, s * (opW / 2 + jw / 2), cy, pos, mat, M.dark, inward, true, false));
    f.slab(opW, Hh + .2 - opH, TH, 0, (opH + Hh + .2) / 2, pos, mat, M.dark, inward, true, false);
    // hatch ring around the opening
    const r = (s, w, h, x, y) => A.bx(w, h, TH + .12, M.steel, f.g, x, y, pos, { cast: false });
    r(0, .12, opH, -opW / 2, opH / 2); r(0, .12, opH, opW / 2, opH / 2); r(0, opW + .24, .12, 0, opH);
    for (let i = 0; i < 10; i++) A.bx(.06, .06, TH + .2, M.dark, f.g, -opW / 2 + (i + .5) * opW / 10, opH, pos, { cast: false });
  }
  const fullWall = (f, pos, Wd, Hh, inward, mat = M.wallIn) => f.slab(Wd, Hh + .5, TH, 0, (Hh - .1) / 2, pos, mat, M.dark, inward);

  // ---------- fixtures ----------
  const lightStrip = (g, x, y, z, w = 1.5, d = .5, rot = 0) => { const m = A.bx(w, .06, d, M.lightPanel, g, x, y, z, { cast: false, recv: false }); m.rotation.y = rot; A.bx(w + .1, .04, d + .1, M.grey, g, x, y + .03, z, { cast: false }); return m; };
  // Performance: rooms register light SPOTS; only LIGHT_POOL real point lights exist and follow the player to the nearest spots.
  // (Every lit pixel pays for every point light, so 4 instead of 10 is much cheaper. The count never changes, so shaders never recompile.)
  const spots = [], LIGHT_POOL = 4;
  const roomLight = (x, y, z, color = 0xfff0dd, I = 16, dist = 13, decay = 1.4) => { spots.push({ p: new THREE.Vector3(x, y, z), color, I, dist, decay }); };
  for (let i = 0; i < LIGHT_POOL; i++) { const l = new THREE.PointLight(0xfff0dd, 0, 13, 1.4); scene.add(l); lights.push({ l, I: 0 }); }
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
    if (!spec.windows) f.slab(W + .4, .2, len, 0, H + .1, len / 2, M.ceilIn, M.dark, '-y', false);   // collision: hull roof below
    [-1, 1].forEach(s => { if (!spec.windows) { f.slab(.2, H + .5, len, s * (W / 2 + .1), (H - .1) / 2, len / 2, M.wallIn, M.dark, s < 0 ? '+x' : '-x', false); f.solid(.55, 2.5, len, s * (W / 2 + .275), .95, len / 2); f.solid(.2, 1.4, len, s * (W / 2 + .1), 2.9, len / 2); } });   // lower wall box; above y=2.2 the hull roof takes over
    // start bulkhead + connecting tunnel
    bulkhead(f, -.1, W + .4, H, OPW, OPH, '+z'); addDoor(f, -.1);
    f.slab(OPW + .4, .2, 1.0, 0, OPH + .1, -.7, M.ceilIn, M.dark, '-y', false); [-1, 1].forEach(s => f.slab(.2, OPH + .5, 1.0, s * (OPW / 2 + .1), (OPH - .1) / 2, -.7, M.wallIn, M.dark, s < 0 ? '+x' : '-x'));
    A.bx(OPW, .35, .35, M.hazard, g, 0, .01, -.1, { cast: false }).scale.y = .02;
    // end
    if (endType === 'wall') fullWall(f, len + .1, W + .4, H, '-z');
    else if (endType === 'open') { bulkhead(f, len + .1, W + .4, H, OPW, OPH, '-z'); addDoor(f, len + .1); }
    // ceiling kit: lights, duct, cables, beacon, signs
    for (let u = 1.6; u < len - .6; u += 2.8) lightStrip(g, 0, H - .03, u, 1.6, .45);
    [-1, 1].forEach(s => { f.solid(.28, .28, len - 1, s * 1.55, H - .3, len / 2); const d = A.cyl(.14, len - 1, M.steel, g, s * 1.55, H - .3, len / 2, 14); d.rotation.x = PI / 2; for (let u = 1.2; u < len - 1; u += 1.6) { const r = A.cyl(.16, .05, M.dark, g, s * 1.55, H - .3, u, 14); r.rotation.x = PI / 2; } });
    A.tube([[-.9, H - .12, 0.6], [-.9, H - .12, len * .5], [-.5, H - .12, len - .6]], .06, M.rubber, g, 20); A.tube([[-.7, H - .1, 0.6], [-.7, H - .1, len * .5], [-.3, H - .1, len - .6]], .045, M.blue, g, 20);
    A.cyl(.18, .14, M.emRed, g, W / 2 - .4, H - .15, .35, 10, { cast: false });
    sign(g, spec.prevName || 'HUB', 0, 3.12, .02, 0, 1.7, .3, { bg: '#123c6e', sub: '' });
    if (endType !== 'none') sign(g, nextName || name, 0, 3.12, len - .02, PI, 1.7, .3, { bg: nextName ? '#123c6e' : '#0a2a52' });
    // exterior: hull cylinder, end plates, ports, plaques (no stones on top: the roof is clean hull)
    A.opt.cast = true;
    const hm = hullMat(6, (len + .4) / 2.8);
    if (!spec.windows) {
      const hull = new THREE.Mesh(new THREE.CylinderGeometry(3.0, 3.0, len + .4, 32, 1, true), hm); hull.rotation.x = PI / 2; hull.position.set(0, 1.7, len / 2); hull.castShadow = hull.receiveShadow = true; g.add(hull);
      const ring = (u, face, inner) => { const r = new THREE.Mesh(new THREE.RingGeometry(inner, 3.0, 32), hm); r.position.set(0, 1.55, u); r.rotation.y = face; r.castShadow = r.receiveShadow = true; g.add(r); };
      ring(-.2, PI, 2.3); if (endType !== 'wall') ring(len + .2, 0, 2.3);
      if (endType === 'wall') { const cap = new THREE.Mesh(new THREE.SphereGeometry(3.0, 32, 12, 0, PI * 2, 0, PI / 2), hm); cap.scale.y = .45; cap.rotation.x = PI / 2; cap.position.set(0, 1.7, len + .2); cap.castShadow = cap.receiveShadow = true; g.add(cap); }
      for (let u = 1.2; u < len; u += 2.9) { const band = new THREE.Mesh(new THREE.TorusGeometry(3.02, .05, 6, 48), M.steel); band.position.set(0, 1.7, u); band.castShadow = true; g.add(band); }
      // warm lit portholes + name plaque on both sides
      [-1, 1].forEach(sd => {
        [len * .28, len * .72].forEach(u => { const win = new THREE.Mesh(new THREE.CircleGeometry(.2, 20), M.window); win.position.set(sd * 2.975, 2.3, u); win.rotation.y = sd * PI / 2; g.add(win);
          const rim = new THREE.Mesh(new THREE.RingGeometry(.2, .27, 20), M.steel); rim.position.set(sd * 2.978, 2.3, u); rim.rotation.y = sd * PI / 2; g.add(rim); });
        A.plane(2.2, .3, T.sign(name, { w: 512, h: 72, bg: '#e9ecef', fg: '#15202e', fs: 44 }), g, sd * 2.99, 2.0, len * .5, sd * PI / 2);
      });
      // roof antenna + beacon
      A.cyl(.025, 1.0, M.steel, g, .9, 5.15, len * .55, 8); A.sph(.05, M.emRed, g, .9, 5.68, len * .55, 8, { cast: false }); A.cyl(.14, .06, M.dark, g, .9, 4.72, len * .55, 12);
    }
    // vestibule tunnel between modules (open ended tube + two flange rings, all OUTSIDE the walls)
    const tubeM = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 1.0, 28, 1, true), hullMat(4, .5)); tubeM.rotation.x = PI / 2; tubeM.position.set(0, 1.4, -.7); tubeM.castShadow = tubeM.receiveShadow = true; g.add(tubeM);
    [-1.12, -.28].forEach(u => { const r = new THREE.Mesh(new THREE.TorusGeometry(2.3, .07, 8, 36), M.steel); r.position.set(0, 1.4, u); r.castShadow = true; g.add(r); });
    A.opt.cast = false;
    // exterior collision: nobody can walk into the tunnel pockets or the rounded end caps
    // ---- roof collision that follows the visible hull (circle r=3.0 centred 1.7 m up) ----
    const HC = 1.7, HR = 3.0, aCeil = Math.acos((H - HC) / HR), aLow = Math.acos((2.2 - HC) / HR);
    const roof = [];
    // tunnel between modules: curved top of the connector tube, and the two side slots filled up to the hull outline
    roof.push([prismConvex(arc(0, 1.4, 2.3, -Math.acos((OPH - 1.4) / 2.3), Math.acos((OPH - 1.4) / 2.3), 10), -1.2, -.2)]);
    [-1, 1].forEach(sd => { const aTop = Math.acos((1.4 - HC) / HR), aBot = Math.acos(-HC / HR); roof.push([prismConvex([[2.3 * sd, 0], [2.3 * sd, 1.4], ...arc(0, HC, HR, aTop * sd, aBot * sd, 6)], -1.2, -.2)]); });
    if (!spec.windows) {
      roof.push([prismConvex(arc(0, HC, HR, -aCeil, aCeil, 14), -.2, len + .2)]);                                     // curved roof (bottom face = interior ceiling)
      [-1, 1].forEach(sd => roof.push([prismConvex([[sd * W / 2, 2.2], ...arc(0, HC, HR, aLow * sd, aCeil * sd, 5), [sd * W / 2, H]], -.2, len + .2)]));   // shoulders between wall top and roof
      if (endType === 'wall') { const p = []; for (let i = 0; i <= 5; i++) { const t = i / 5 * PI / 2; p.push([len + .2 + 1.35 * Math.sin(t), HR * Math.cos(t)]); } roof.push([revolvedConvex(p, 'z', 20), [0, HC, 0]]); }   // rounded end cap
    }
    f.convex(roof);
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
      const hp = new THREE.Mesh(new THREE.BoxGeometry(.25, 2.0, 1.2), new THREE.MeshBasicMaterial({ visible: false })); hp.position.set(-W / 2 + 1.0, 1.05, u); hp.userData.key = 'sleep'; f.g.add(hp); hits.push(hp);   // E: sleep / click: info
      if (i === 0) { const [bx, bz] = f.w(-W / 2 + .5, 4.6); out.beds.push({ x: bx, z: bz }); }
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
    [-.5, .5].forEach(x => A.cyl(.03, 1.0, M.steel, f.g, x, .55, tmu - .8, 8)); A.bx(1.0, .05, .06, M.steel, f.g, tmx, 1.05, tmu - .8); A.bx(.4, .22, .04, M.dark, f.g, tmx, 1.2, tmu - .85).rotation.x = -.4; f.solid(1.0, 1.1, 1.9, tmx, .55, tmu);
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
    crewAt(f, -.95, 0, 5.2, -PI / 2, { color: 0x2f8f5a, hair: 'short', hairColor: 0xb88a4a, skin: 0xd9a784, name: 'LINDQVIST' }, 'work');
    // plants (instanced so we can wilt them)
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x2f9a3a, roughness: .9 }), leafMat = new THREE.MeshStandardMaterial({ color: 0x2ecc40, roughness: .8 });
    const stem = new THREE.InstancedMesh(new THREE.CylinderGeometry(.012, .02, .3, 5), stemMat, plantPos.length), leaf = new THREE.InstancedMesh(new THREE.SphereGeometry(.075, 7, 5), leafMat, plantPos.length);
    const d = new THREE.Object3D(); plantPos.forEach((p, i) => { d.position.set(p[0], p[1] + .15, p[2]); d.scale.set(1, 1, 1); d.rotation.set(0, i, 0); d.updateMatrix(); stem.setMatrixAt(i, d.matrix); });
    f.g.add(stem, leaf); stem.castShadow = leaf.castShadow = true;
    animated.plants = { stem, leaf, leafMat, stemMat, pos: plantPos, last: -1, d, base: new THREE.Color(0x2ecc40), dry: new THREE.Color(0x8a7a2a) };
    // pink grow-lamp glow
    const [gx, gz] = f.w(0, 6); roomLight(gx, 2.6, gz, 0xff6ad5, 9, 11, 1.5);
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
    // EVA suits on hooks (left wall)
    [0, 1].forEach(i => { crewAt(f, -W / 2 + .85, .02, 4.0 + i * 1.5, PI / 2, { eva: true }, 'hang'); A.bx(.05, 2.2, .7, M.steel, f.g, -W / 2 + .12, 1.2, 4.0 + i * 1.5, { cast: false }); });
    A.bx(1.4, .45, .5, M.white, f.g, W / 2 - .9, .22, 6.3); f.solid(.5, .9, 1.4, W / 2 - .9, .45, 6.3);
    for (let i = 0; i < 3; i++) A.bx(.3, .03, 1.6, M.yellow, f.g, -.7 + i * .7, .012, 4.6, { cast: false }).scale.y = .6;
    bulkhead(f, f.len + .1, W + .4, H, OPW, OPH, '-z'); const door = addDoor(f, f.len + .1); door.range = 3.6;
    A.opt.cast = true; A.bx(OPW + .6, .2, 1.6, M.hull, f.g, 0, OPH + .5, f.len + 1.0); f.solid(OPW + .6, .2, 1.6, 0, OPH + .5, f.len + 1.0); [-1, 1].forEach(s => A.bx(.14, 3.0, 1.4, M.steel, f.g, s * (OPW / 2 + .27), 1.5, f.len + 1.0)); A.opt.cast = false;
    [-1, 1].forEach(s => f.solid(.3, 3.4, 1.5, s * (OPW / 2 + .35), 1.7, f.len + 1.0));
    const ap = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshStandardMaterial({ map: T.apron(), roughness: 1 })); ap.rotation.x = -PI / 2; ap.position.set(0, .03, f.len + 5.2); ap.receiveShadow = true; ap.material.map.repeat.set(3, 3); f.g.add(ap);
    A.bx(9.2, .02, .25, M.hazard, f.g, 0, .035, f.len + .7, { cast: false }); A.bx(9.2, .02, .25, M.hazard, f.g, 0, .035, f.len + 9.7, { cast: false });
    [-1, 1].forEach(s => { const fl = A.bx(.4, .15, .3, M.lightPanel, f.g, s * 1.2, OPH + .38, f.len + 1.5, { cast: false, recv: false }); });
    A.bx(OPW + .4, .02, 2.4, M.hazard, f.g, 0, .005, f.len + 1.9, { cast: false }).scale.y = .5;
  }
  function commsBay(f) {
    rackRow(f, -1, 1.3, [{ kind: 'panel', key: 'signal', label: 'SIGNAL & TRANSMITTER' }, { kind: 'cables', label: 'WAVEGUIDES' }, { kind: 'vents', label: 'AMPLIFIERS' }, { kind: 'drawers' }, { kind: 'lockers' }, { kind: 'panel', label: 'MODEMS' }]);
    rackRow(f, 1, 1.3, [{ kind: 'panel', key: 'antenna', label: 'ANTENNA CONTROL' }, { kind: 'cables' }, { kind: 'drawers', label: 'RF SPARES' }, { kind: 'lockers' }, { w: 1.4, kind: 'display', key: 'comms', label: 'RADIO TERMINAL' }, { kind: 'drawers' }]);
    // chair at the radio terminal, live link display on the left wall
    stool(f.g, W / 2 - 1.25, 6.4, .5); crewAt(f, W / 2 - 1.12, .0, 6.4, PI / 2, { color: 0x6b3fa0, hair: 'bun', hairColor: 0x1a1210, skin: 0x8d5a3b, name: 'NAIR' }, 'sit');
    const disp = T.statusScreen(() => { }); animated.displays.push({ kind: 'comms', d: disp });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.8, .9), new THREE.MeshBasicMaterial({ map: disp.t })); m.position.set(-W / 2 + .12, 1.9, 9.3); m.rotation.y = PI / 2; f.g.add(m);
    A.bx(.06, 1.0, 1.9, M.dark, f.g, -W / 2 + .07, 1.9, 9.3);
  }
  function cupola(f) {
    // glass bay with a clear view of the dish and Earth
    const mat = M.wallIn, windows = [[1.0, 2.6], [3.2, 4.8], [5.0, 6.4]];
    [-1, 1].forEach(s => {
      const x = s * (W / 2 + .1), inw = s < 0 ? '+x' : '-x';
      f.slab(.2, 1.2, f.len, x, .3, f.len / 2, mat, M.hull, inw); f.slab(.2, .7, f.len, x, H - .15, f.len / 2, mat, M.hull, inw, true, false);
      const pts = [0, ...windows.flat(), f.len]; for (let i = 0; i < pts.length; i += 2) { const a = pts[i], b = pts[i + 1]; if (b - a > .05) f.slab(.2, H - .9 - .3, b - a, x, (.9 + H - .3) / 2, (a + b) / 2, mat, M.hull, inw); }
      windows.forEach(([a, b]) => { f.solid(.3, H, b - a, x, H / 2, (a + b) / 2); const gl = new THREE.Mesh(new THREE.PlaneGeometry(b - a, H - 1.2), M.glass); gl.position.set(x, (.9 + H - .3) / 2, (a + b) / 2); gl.rotation.y = PI / 2; gl.material.side = THREE.DoubleSide; f.g.add(gl); A.bx(.3, .08, b - a + .1, M.steel, f.g, x, .9, (a + b) / 2, { cast: false }); A.bx(.3, .08, b - a + .1, M.steel, f.g, x, H - .3, (a + b) / 2, { cast: false }); });
    });
    // big end window
    f.slab(W + .4, 1.2, .2, 0, .3, f.len + .1, mat, M.hull, '-z'); f.slab(W + .4, .7, .2, 0, H - .15, f.len + .1, mat, M.hull, '-z'); [-1, 1].forEach(s => f.slab(.5, H - .9 - .3, .2, s * (W / 2 - .05), (.9 + H - .3) / 2, f.len + .1, mat, M.hull, '-z'));
    const eg = new THREE.Mesh(new THREE.PlaneGeometry(W - .8, H - 1.2), M.glass); eg.position.set(0, (.9 + H - .3) / 2, f.len + .1); eg.material.side = THREE.DoubleSide; f.g.add(eg);
    f.solid(W, H, .35, 0, H / 2, f.len + .1);
    for (let i = -1; i <= 1; i++) A.bx(.08, H - 1.2, .1, M.steel, f.g, i * 1.5, (.9 + H - .3) / 2, f.len + .1, { cast: false });
    // ceiling with a skylight hole
    { const hv = 1.2, hu = 1.5; [-1, 1].forEach(sd => f.slab(W / 2 + .2 - hv, .2, f.len, sd * ((W / 2 + .2 + hv) / 2), H + .1, f.len / 2, M.ceilIn, M.hull, '-y', false));
      [-1, 1].forEach(sd => f.slab(2 * hv, .2, f.len / 2 - hu, 0, H + .1, f.len / 2 + sd * (hu + (f.len / 2 - hu) / 2), M.ceilIn, M.hull, '-y', false));
      f.solid(W + .4, .2, f.len, 0, H + .1, f.len / 2); }   // whole roof incl. skylight glass
    const sk = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.0), M.glass); sk.rotation.x = PI / 2; sk.position.set(0, H + .12, f.len / 2); f.g.add(sk); A.bx(2.6, .1, .12, M.steel, f.g, 0, H + .12, f.len / 2 - 1.55, { cast: false }); A.bx(2.6, .1, .12, M.steel, f.g, 0, H + .12, f.len / 2 + 1.55, { cast: false });
    // control desk with arm joysticks + two seats
    A.bx(2.8, .8, .8, M.white, f.g, 0, .4, f.len - 1.3); A.bx(2.9, .06, .9, M.dark, f.g, 0, .83, f.len - 1.3); f.solid(2.8, .9, .8, 0, .45, f.len - 1.3);
    [-.8, .8].forEach(x => { A.cyl(.03, .25, M.steel, f.g, x, 1.0, f.len - 1.3, 8); A.sph(.07, M.red, f.g, x, 1.15, f.len - 1.3, 8); });
    const scr = A.bx(.8, .45, .04, M.lightPanel, f.g, 0, 1.25, f.len - 1.55, { cast: false }); scr.material = new THREE.MeshBasicMaterial({ color: 0x69b7ff }); scr.rotation.x = -.3;
    [-.7, .7].forEach(x => { stool(f.g, x, f.len - 2.3, .5); A.bx(.4, .5, .08, M.dark, f.g, x, .8, f.len - 2.5); });
    sign(f.g, 'CUPOLA  OBSERVATION', 0, 3.0, 1.4, 0, 2.2, .32, { bg: '#0a2a52' });
    // gold sun visor frame outside
    A.opt.cast = true; A.bx(W + .6, .12, 1.0, M.gold, f.g, 0, H + .3, f.len + .55); A.opt.cast = false; f.solid(W + .6, .12, 1.0, 0, H + .3, f.len + .55);
    [-1, 1].forEach(s => lightStrip(f.g, s * 1.2, H - .03, f.len - 1.5, 1.2, .35));
    // exterior floodlights
    [-1, 1].forEach(s => A.bx(.3, .2, .3, M.lightPanel, f.g, s * (W / 2 + .3), H + .25, f.len + .2, { cast: false, recv: false }));
  }

  // ---------- central hub (Node) ----------
  // Hub drum mesh without the parts that sit inside a wing's hull (they used to show up as a wall inside the first room of each wing)
  function drumGeometry(r, ht, cy) {
    const src = new THREE.CylinderGeometry(r, r, ht, 192, 46).toNonIndexed(), P = src.attributes.position, keep = [];
    const inWing = (x, y, z) => { const wy = y + cy - 1.7; return (Math.abs(x) > 5.0 && z * z + wy * wy < 9.0) || (Math.abs(z) > 5.0 && x * x + wy * wy < 9.0); };
    for (let t = 0; t < P.count; t += 3) { let all = true; for (let k = 0; k < 3; k++) if (!inWing(P.getX(t + k), P.getY(t + k), P.getZ(t + k))) all = false; if (!all) keep.push(t, t + 1, t + 2); }
    const g = new THREE.BufferGeometry(); ['position', 'normal', 'uv'].forEach(n => { const A_ = src.attributes[n], o = new Float32Array(keep.length * A_.itemSize); keep.forEach((v, i) => { for (let c = 0; c < A_.itemSize; c++) o[i * A_.itemSize + c] = A_.array[v * A_.itemSize + c]; }); g.setAttribute(n, new THREE.BufferAttribute(o, A_.itemSize)); });
    src.dispose(); return g;
  }
  function hub() {
    const f = new Frame(0, 0, 0), g = f.g, h = HUB.h, hw = HUB.half;
    f.slab(8.8, .3, 8.8, 0, -.15, 0, M.floorIn, M.dark, '+y'); f.slab(8.8, .2, 8.8, 0, h + .1, 0, M.ceilIn, M.dark, '-y', false);   // collision: dome body below
    [0, PI / 2, PI, -PI / 2].forEach(r => { const fr = new Frame(0, 0, r); bulkhead(fr, hw + .1, 8.4, h, OPW, OPH, '-z'); addDoor(fr, hw + .1); });
    // hub hull: low drum + dome (regolith-covered storm shelter)
    const hm = hullMat(8, 2);
    const drum = new THREE.Mesh(drumGeometry(6.35, 4.6, 2.0), hm); drum.position.y = 2.0; drum.castShadow = drum.receiveShadow = true; g.add(drum);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(6.35, 28, 10, 0, PI * 2, 0, PI / 2), hm); dome.scale.y = .38; dome.position.y = 4.3; dome.castShadow = dome.receiveShadow = true; g.add(dome);
    // clean roof: no stones. Warm portholes + panel battens only between the spokes (45 degrees off each hatch)
    for (let k = 0; k < 24; k++) { const deg = k * 15, m90 = deg % 90, a = deg * PI / 180;
      if (m90 === 30 || m90 === 60) { const px = Math.cos(a) * 6.365, pz = Math.sin(a) * 6.365, win = new THREE.Mesh(new THREE.CircleGeometry(.24, 20), M.window); win.position.set(px, 2.7, pz); win.rotation.y = PI / 2 - a; g.add(win);
        const rim = new THREE.Mesh(new THREE.RingGeometry(.24, .31, 20), M.steel); rim.position.set(Math.cos(a) * 6.37, 2.7, Math.sin(a) * 6.37); rim.rotation.y = PI / 2 - a; g.add(rim); }
      if (m90 === 45) { const r = new THREE.Mesh(new THREE.BoxGeometry(.1, 4.6, .1), M.steel); r.position.set(Math.cos(a) * 6.37, 2.0, Math.sin(a) * 6.37); g.add(r); } }
    [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([x, z]) => { const a = Math.atan2(z, x), pl = A.plane(2.6, .34, T.sign('SELENE BASE · COMMAND NODE', { w: 512, h: 72, bg: '#e9ecef', fg: '#15202e', fs: 36 }), g, Math.cos(a) * 6.36, 3.3, Math.sin(a) * 6.36, PI / 2 - a); });
    A.cyl(.5, .5, M.dark, g, 0, 5.55, 0, 18); A.cyl(.03, 1.3, M.steel, g, 0, 6.2, 0, 8); A.sph(.07, M.emRed, g, 0, 6.88, 0, 8, { cast: false });   // roof mast
    // drum collision (outside, skipped where a module attaches)
    { const dome = new CANNON.Body({ mass: 0 }), p = [[h, 6.35], [4.3, 6.35]]; for (let i = 1; i <= 6; i++) { const t = i / 6 * PI / 2; p.push([4.3 + 6.35 * .38 * Math.sin(t), 6.35 * Math.cos(t)]); }
      const ds = revolvedConvex(p, 'y', 32); dome.addShape(ds, ds.offset); phys.addBody(dome); }   // one body: roof + dome, bottom face = hub ceiling
    // drum wall between the wings: three flat boxes per arc, corners on the visible curve
    [45, 135, 225, 315].forEach(deg => [-11, 0, 11].forEach(d => { const a = (deg + d) * PI / 180, half = 6.35 * Math.sin(5.5 * PI / 180), rIn = 6.35 * Math.cos(5.5 * PI / 180) - .275;
      const b = body(Math.cos(a) * rIn, h / 2, Math.sin(a) * rIn, half, h / 2, .275); b.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), PI / 2 - a); }));
    // corner pillars: close off the four corner pockets so no wall or rack can overlap another
    [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([x, z]) => { A.bx(.65, h, .65, M.wallIn, g, x * 3.675, h / 2, z * 3.675, { cast: false }); A.bx(.1, h - .3, .08, M.lightPanel, g, x * 3.35, h / 2, z * 3.675, { cast: false, recv: false }); A.bx(.08, h - .3, .1, M.lightPanel, g, x * 3.675, h / 2, z * 3.35, { cast: false, recv: false }); body(x * 3.675, h / 2, z * 3.675, .325, h / 2, .325); });
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
    const seg = (r, sd, fn) => { const fr = new Frame(0, 0, r), hold = new THREE.Group(); hold.position.set(sd * 2.5, 0, hw - .3); hold.rotation.y = PI; fr.g.add(hold); fn(hold); };
    const north = (sd, fn) => seg(PI, sd, fn), east = (sd, fn) => seg(PI / 2, sd, fn), south = (sd, fn) => seg(0, sd, fn), west = (sd, fn) => seg(-PI / 2, sd, fn);
    north(1, (hold) => { const u1 = A.rackUnit('panel', 1.7, 2.0, .6); u1.position.y = 1; hold.add(u1); solids.push(u1); addConsole(hold, 'shield', 'RADIATION SHIELD', 1.35, 1.0);
      A.plane(.5, .5, T.radiationSign(), hold, -.5, 2.45, .31); A.plane(.5, .5, T.radiationSign(), hold, .5, 2.45, .31);
      [.06, 2.06].forEach(y => { const hz = A.tiledBox(1.7, .12, .62, M.hazard, 1); hz.position.set(0, y, 0); hold.add(hz); }); });
    north(-1, (hold) => { const u1 = A.rackUnit('lockers', 1.7, 1.1, .5); u1.position.set(0, .55, 0); hold.add(u1); solids.push(u1);
      const disp = T.statusScreen(() => { }); animated.displays.push({ kind: 'wall', d: disp });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1.5, .9), new THREE.MeshBasicMaterial({ map: disp.t })); m.position.set(0, 2.0, .27); hold.add(m); A.bx(1.62, 1.02, .08, M.dark, hold, 0, 2.0, .22); });
    const generic = (fn, sd, label, kind) => fn(sd, (hold) => { const u1 = A.rackUnit(kind, 1.7, 2.0, .6); u1.position.y = 1; hold.add(u1); solids.push(u1); const u2 = A.rackUnit('lockers', 1.7, 1.0, .5); u2.position.set(0, 2.55, 0); hold.add(u2); sign(hold, label, 0, 2.1, .31, 0, 1.4, .26, { bg: '#2a2f37', fg: '#d5dbe3' }); });
    generic(east, 1, 'FIRST AID', 'lockers'); generic(east, -1, 'EMERGENCY GEAR', 'drawers'); generic(south, 1, 'SUIT SPARES', 'panel'); generic(south, -1, 'DATA & LOGS', 'cables');
    generic(west, 1, 'FOOD STORE', 'lockers'); generic(west, -1, 'MEDICAL', 'drawers');
    // wall collision strips (hub wall segments are already solid slabs, racks protrude 0.6)
    [[0, -1], [0, 1], [1, 0], [-1, 0]].forEach(([x, z]) => { [-1, 1].forEach(s => { const sx = x ? .6 : 1.8, sz = x ? 1.8 : .6; body(x * (hw - .3) + (x ? 0 : s * 2.5), 1.7, z * (hw - .3) + (z ? 0 : s * 2.5), sx / 2, 1.7, sz / 2); }); });
    // extinguishers + beacons
    extinguisher(g, 2.2, .0, -3.7); extinguisher(g, -2.2, 0, 3.7);
    [[2.8, 3.6], [-2.8, -3.6]].forEach(([x, z]) => A.cyl(.16, .14, M.emRed, g, x, h - .15, z, 10, { cast: false }));
    [['LIFE SUPPORT + AIRLOCK  EAST', -PI / 2, hw - .1, 0], ['GREENHOUSE + CARGO  WEST', PI / 2, -hw + .1, 0], ['POWER LAB + CREW  NORTH', 0, 0, -hw + .1], ['COMMS + CUPOLA  SOUTH', PI, 0, hw - .1]].forEach(([t, ry, x, z]) => sign(g, t, x, 3.55, z, ry, 2.5, .28, { bg: '#123c6e' }));
    out.rooms.push({ id: 'hub', name: 'HUB · COMMAND NODE', x0: -hw, x1: hw, z0: -hw, z1: hw });
    [[0, 3.6, 0, 0xfff0dd, 20, 14]].forEach(([x, y, z, c, I, d]) => roomLight(x, y, z, c, I, d));
    // crew in the hub
    crewAt(f, 0, 0, 1.32, PI, { color: 0xd8472c, hair: 'long', hairColor: 0x3a2312, skin: 0xb98562, name: 'REYES' }, 'table');
    crewAt(f, 2.3, 0, -2.75, PI, { color: 0x2a5db0, hair: 'short', hairColor: 0x151515, skin: 0xe0b894, name: 'OKAFOR' }, 'gesture');
    return f;
  }
  function crewAt(f, lx, ly, lz, ry, opts, mode, solid = true) { const a = A.makeCrew(opts); a.position.set(lx, ly, lz); a.rotation.y = ry; f.g.add(a); a.traverse(o => { if (o.isMesh) o.castShadow = true; }); out.npcs.push({ g: a, mode, t: Math.random() * 6 }); if (solid) f.solid(.55, 1.9, .55, lx, .95, lz); return a; }

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
    if (pp) { spots.forEach(sp => { sp.d = sp.p.distanceToSquared(pp); }); const near = [...spots].sort((a, b) => a.d - b.d);
      lights.forEach((o, i) => { const sp = near[i]; if (!sp) { o.I = 0; return; } o.l.position.copy(sp.p); o.l.color.setHex(sp.color); o.l.distance = sp.dist; o.l.decay = sp.decay; o.I = sp.I; }); }
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
    out.npcs.forEach(n => { n.t += dt; A.animateCrew(n.g, n.t, n.mode); });
    M.window.color.setRGB(.95, .6, .25).multiplyScalar(.25 + .75 * p);
    // sliding doors (open when the player is near; the physics leaves follow)
    out.doors.forEach(d => { const near = Math.hypot(pp.x - d.x, pp.z - d.z) < (d.range || 3.0); d.open += ((near ? 1 : 0) - d.open) * Math.min(1, dt * 4); const e = d.open * d.open * (3 - 2 * d.open);
      d.leaves.forEach(l => { const lx = l.s * (OPW / 4 + e * 1.25); l.m.position.x = lx; const [wx, wz] = d.f.w(lx, d.pos); l.b.position.x = wx; l.b.position.z = wz; l.b.aabbNeedsUpdate = true; });
      d.lamp.color.setHex(d.open > .5 ? 0x33ff77 : 0xff2a1a); });
  };
  return out;
}
