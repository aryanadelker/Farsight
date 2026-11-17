/* SI generated: written with Claude (an AI assistant) for the Farsight team. See SI_DISCLOSURE.md. */
// Lunar surroundings: terrain, horizon, sky (stars, Earth, Sun) and surface hardware.
// All layout numbers here are INVENTED design values (not NASA data).
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import * as T from './textures.js';
import * as A from './assets.js';
const { M } = A;

// Directions TO the Sun and TO Earth (unit vectors). Near the lunar south pole the Sun hugs the horizon.
export const SUN_DIR = new THREE.Vector3(-0.74, 0.21, 0.64).normalize();
export const EARTH_DIR = new THREE.Vector3(0.22, 0.2, 0.95).normalize();

// ---------- height function (shared by mesh, player and props) ----------
const hash = (x, y) => { let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
const sm = t => t * t * (3 - 2 * t);
function vnoise(x, y) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1), u = sm(xf), v = sm(yf); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
const fbm = (x, y, o = 4) => { let s = 0, a = .5, f = 1; for (let i = 0; i < o; i++) { s += a * vnoise(x * f, y * f); a *= .5; f *= 2.03; } return s; };
const smooth = (a, b, v) => sm(Math.max(0, Math.min(1, (v - a) / (b - a))));

export const PLATEAU = { x: 0, z: -2, flat: 62, blend: 105 };   // flat build site
const craters = [];
(function () { // seeded crater list outside the build site
  let s = 77; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const big = [[-150, 120, 46], [190, -90, 60], [60, -230, 52], [-210, -160, 70], [230, 190, 40], [-60, 250, 55], [10, 150, 24], [-125, -30, 22], [150, 40, 18], [95, -140, 26]];
  big.forEach(c => craters.push(c));
  for (let i = 0; i < 70; i++) { const a = r() * 6.283, d = 95 + r() * 280, rad = 3 + Math.pow(r(), 2.2) * 22; craters.push([Math.cos(a) * d, Math.sin(a) * d, rad]); }
})();
export function terrainH(x, z) {
  const dx = x - PLATEAU.x, dz = z - PLATEAU.z, dist = Math.hypot(dx, dz);
  const blend = smooth(PLATEAU.flat, PLATEAU.blend, dist);
  if (blend <= 0) return 0;
  let h = (fbm(x * .008 + 11, z * .008 + 5, 4) - .5) * 38 + (fbm(x * .04, z * .04, 3) - .5) * 3.2 + (fbm(x * .22, z * .22, 2) - .5) * .35;
  for (const [cx, cz, r] of craters) {
    const d = Math.hypot(x - cx, z - cz) / r; if (d > 3.2) continue;
    const depth = r * .2, rim = depth * .42;
    h += (d < 1 ? -depth * (1 - d * d) : 0) + rim * Math.exp(-Math.pow((d - 1) / .22, 2)) + (d > 1 ? rim * .35 * Math.exp(-(d - 1) * 2.2) : 0);
  }
  const edge = 1 - smooth(330, 392, Math.max(Math.abs(x), Math.abs(z)));
  return h * blend * edge;
}

// ---------- builder ----------
const _dp = new THREE.Vector3(), _dq = new THREE.Quaternion(), _ds = new THREE.Vector3();
export function buildEnvironment(scene, renderer, phys, hits) {
  const out = { beacons: [], lamps: [], dish: null, arm: null };

  // Lights
  const sun = new THREE.DirectionalLight(0xfff4e6, 3.4);
  sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  const sc = sun.shadow.camera; sc.left = -75; sc.right = 75; sc.top = 75; sc.bottom = -75; sc.near = 1; sc.far = 520;
  sun.shadow.bias = -.0004; sun.shadow.normalBias = .06;
  scene.add(sun, sun.target); out.sun = sun;
  const amb = new THREE.HemisphereLight(0xa9bfff, 0x3a3633, .3); scene.add(amb); out.amb = amb;   // earthshine + bounce

  // Terrain
  const SEG = 320, SIZE = 800, geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), h = terrainH(x, z); pos.setY(i, h - .03);
    const v = .78 + (fbm(x * .05, z * .05, 3) - .5) * .5 + (fbm(x * .5, z * .5, 2) - .5) * .12 + Math.max(0, -h) * .004;
    col[i * 3] = v; col[i * 3 + 1] = v * .99; col[i * 3 + 2] = v * .96;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * SIZE / 7, uv.getY(i) * SIZE / 7);
  geo.computeVertexNormals();
  const ground = T.regolith([1, 1]);
  const gmat = new THREE.MeshStandardMaterial({ map: ground, bumpMap: ground, bumpScale: 2.2, vertexColors: true, roughness: 1, metalness: 0 });
  const terrain = new THREE.Mesh(geo, gmat); terrain.receiveShadow = true; scene.add(terrain);

  // Far plain + mountain ranges so the horizon looks like the Moon
  const far = new THREE.Mesh(new THREE.RingGeometry(300, 3600, 96, 1), new THREE.MeshStandardMaterial({ color: 0x77756f, roughness: 1 }));
  far.rotation.x = -Math.PI / 2; far.position.y = -.4; far.receiveShadow = false; scene.add(far);
  [[2300, 140, 1], [2900, 260, 2], [3300, 380, 3]].forEach(([R, H, k]) => {
    const N = 360, verts = [], idx = [];
    for (let i = 0; i <= N; i++) {
      const a = i / N * Math.PI * 2, n = fbm(Math.cos(a) * 3 + k * 9, Math.sin(a) * 3 + k * 4, 5), ridge = 1 - Math.abs(fbm(a * 6 + k * 3, k, 4) * 2 - 1);
      const h = H * (.25 + n * .9) * (.6 + ridge * .7);
      verts.push(Math.cos(a) * (R + 520), -20, Math.sin(a) * (R + 520), Math.cos(a) * R, h, Math.sin(a) * R);
      if (i < N) { const b = i * 2; idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x6c6a66, roughness: 1, side: THREE.DoubleSide })); scene.add(m);
  });

  // Stars + faint Milky Way band
  { const N = 7000, p = new Float32Array(N * 3), c = new Float32Array(N * 3), tilt = new THREE.Vector3(.3, .85, .4).normalize();
    for (let i = 0; i < N; i++) {
      let v; if (i < 2400) { v = new THREE.Vector3().randomDirection(); v.addScaledVector(tilt, -v.dot(tilt) * (.86 + Math.random() * .12)); v.normalize(); } else v = new THREE.Vector3().randomDirection();
      if (v.y < -.05) v.y = -v.y * .2 + .03; v.normalize();
      p.set([v.x * 9000, v.y * 9000, v.z * 9000], i * 3);
      const b = .35 + Math.pow(Math.random(), 3) * .65, tint = Math.random(); c.set([b * (.85 + tint * .15), b * .92, b * (1.05 - tint * .15)], i * 3);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    const stars = new THREE.Points(g, new THREE.PointsMaterial({ size: 1.9, sizeAttenuation: false, vertexColors: true, depthWrite: false, fog: false })); stars.frustumCulled = false; scene.add(stars); out.stars = stars; }

  // Earth
  const eMap = T.earth(), earth = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), new THREE.MeshStandardMaterial({ map: eMap, emissiveMap: eMap, emissive: 0xffffff, emissiveIntensity: .5, roughness: 1 }));
  earth.scale.setScalar(160); earth.position.copy(EARTH_DIR).multiplyScalar(6500); earth.rotation.set(.4, 2.2, .35); scene.add(earth); out.earth = earth;
  const eg = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow('120,170,255'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: .55 }));
  eg.scale.setScalar(560); eg.position.copy(earth.position).multiplyScalar(.99); scene.add(eg);
  // Sun disc + glow
  const sd = new THREE.Mesh(new THREE.SphereGeometry(55, 24, 16), new THREE.MeshBasicMaterial({ color: 0xfff7e0, toneMapped: false })); sd.position.copy(SUN_DIR).multiplyScalar(7000); scene.add(sd);
  const sg = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow('255,236,200'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); sg.scale.setScalar(1500); sg.position.copy(sd.position); scene.add(sg);

  // ---------- surface hardware ----------
  const place = (obj, x, z, ry = 0, y = 0) => { obj.position.set(x, y, z); obj.rotation.y = ry; scene.add(obj); return obj; };

  // Landing pad + crew lander
  const padTex = T.padMarks(), pad = new THREE.Mesh(new THREE.CircleGeometry(15, 48), new THREE.MeshStandardMaterial({ map: padTex, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 }));
  pad.rotation.x = -Math.PI / 2; pad.position.set(40, .02, 24); pad.receiveShadow = true; scene.add(pad);
  place(A.makeLander(), 40, 24, .5);
  // Rover parked by the airlock
  place(A.makeRover(), 33, -9, 2.4);
  // Robotic arm on a pedestal
  const arm = place(A.makeRobotArm(), 24, -8, 0); out.arm = arm;
  // Antenna dish aimed at Earth (south of the Cupola so it is visible through the windows)
  { const g = new THREE.Group(); g.position.set(11, 0, 38); scene.add(g);
    A.cyl(.8, .8, M.dark, g, 0, .4, 0, 14); A.cyl(.3, 3.2, M.steel, g, 0, 2.2, 0, 12); A.bx(1.4, .6, 1.2, M.white, g, 0, 3.9, 0);
    const az = new THREE.Group(); az.position.y = 4.5; az.rotation.y = Math.atan2(EARTH_DIR.x, EARTH_DIR.z); g.add(az);
    const el = new THREE.Group(); az.add(el); out.dish = { tilt: el, azimuth: az, elev: Math.asin(EARTH_DIR.y), baseYaw: az.rotation.y };
    const pts = []; for (let i = 0; i <= 16; i++) { const r = i / 16 * 3.4; pts.push(new THREE.Vector2(r, r * r / 6.2)); }
    const dish = new THREE.Mesh(new THREE.LatheGeometry(pts, 48), new THREE.MeshStandardMaterial({ color: 0xeef0f2, roughness: .35, metalness: .5, side: THREE.DoubleSide }));
    dish.rotation.x = Math.PI / 2; dish.castShadow = true; el.add(dish);
    A.cyl(.2, .5, M.dark, el, 0, 0, -.3, 10).rotation.x = Math.PI / 2;
    [0, 2.1, 4.2].forEach(a => { const st = A.cyl(.04, 1.9, M.steel, el, Math.cos(a) * .75, Math.sin(a) * .75, 1.3, 6); st.rotation.set(Math.sin(a) * .38, -Math.cos(a) * .38, 0); });
    A.cyl(.14, .5, M.gold, el, 0, 0, 2.15, 10).rotation.x = Math.PI / 2;
    const bc = A.sph(.14, new THREE.MeshBasicMaterial({ color: 0xff2a1a }), g, .6, 3.6, .5, 8, { cast: false }); out.dish.beacon = bc;
    if (hits) { const hp = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.6, 2.0), new THREE.MeshBasicMaterial({ visible: false })); hp.position.y = 1.3; hp.userData.key = 'antenna'; hp.userData.src = 'dish'; g.add(hp); hits.push(hp); }   // repair point at the dish base
    if (phys) {
      // fixed parts: round base, mast, mount box (same sizes as the meshes above)
      const fixed = new CANNON.Body({ mass: 0 }); fixed.addShape(new CANNON.Cylinder(.8, .8, .8, 14), new CANNON.Vec3(0, .4, 0)); fixed.addShape(new CANNON.Cylinder(.3, .3, 3.2, 12), new CANNON.Vec3(0, 2.2, 0));
      fixed.addShape(new CANNON.Box(new CANNON.Vec3(.7, .3, .6)), new CANNON.Vec3(0, 3.9, 0)); fixed.position.set(11, 0, 38); phys.addBody(fixed);
      // moving parts: reflector shell (thin, so the inside of the bowl stays open), rear hub and front feed. Follows the dish when it droops or turns.
      const shell = []; for (let i = 0; i <= 5; i++) { const r = i / 5 * 3.4; shell.push(new THREE.Vector2(r, r * r / 6.2)); }
      const lg = new THREE.LatheGeometry(shell, 20).rotateX(Math.PI / 2);   // same curve and orientation as the visible reflector, low detail
      const mov = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC }); mov.addShape(new CANNON.Trimesh(Array.from(lg.attributes.position.array), Array.from(lg.index.array))); lg.dispose();
      mov.addShape(new CANNON.Box(new CANNON.Vec3(.2, .2, .25)), new CANNON.Vec3(0, 0, -.3)); mov.addShape(new CANNON.Box(new CANNON.Vec3(.14, .14, .25)), new CANNON.Vec3(0, 0, 2.15));
      phys.addBody(mov); out.dish.body = mov; out.dish.syncBody = () => { el.updateWorldMatrix(true, false); el.matrixWorld.decompose(_dp, _dq, _ds); mov.position.set(_dp.x, _dp.y, _dp.z); mov.quaternion.set(_dq.x, _dq.y, _dq.z, _dq.w); mov.aabbNeedsUpdate = true; };
      out.dish.syncBody();
    } }
  // Solar farm facing the Sun
  [[-48, -24], [-52, -4], [-48, 16], [-44, -42], [-30, -46]].forEach(([x, z], i) => place(A.makeSolarArray(SUN_DIR), x, z, 0));
  [[-40, -14], [-40, 6]].forEach(([x, z]) => { A.bx(2.6, 1.8, 1.8, M.white, scene, x, .9, z); A.bx(2.7, .3, 1.9, M.gold, scene, x, 1.8, z); });   // battery cabinets
  // Water / propellant tanks
  place(A.makeTank('H2O'), -38, 30, 0); place(A.makeTank('O2'), -33, 36, 0); place(A.makeTank('H2'), -42, 36, 0);
  // Regolith processing plant (ISRU)
  { const isru = place(A.makeIsru(), -26, -50, .3); out.beacons.push(isru.userData.beacon); }
  // Landing / cable lamps
  [[27, 6], [27, -6], [20, 28], [-4, 31], [30, 16], [-30, -8], [-20, 24], [14, -34], [-8, -36]].forEach(([x, z]) => { const l = place(A.makeLamp(), x, z, Math.random() * 6); out.lamps.push(l.userData.lamp); });
  // Banner
  { const g = new THREE.Group(); g.position.set(24, 0, 12); scene.add(g); A.cyl(.06, 4, M.steel, g, 0, 2, 0, 8);
    A.plane(2.4, .75, T.sign('FARSIGHT', { w: 512, h: 160, bg: '#0b1a3a', fg: '#9ad1ff' }), g, 1.25, 3.5, 0); g.children[1].material.side = THREE.DoubleSide; }
  // Cables from the solar farm run along the ground and plug into the hull sides (never through the modules)
  [[-47, -22, -12, -3.7], [-47, -4, -12, 3.7], [-47, 14, -22, 3.7]].forEach(([x0, z0, x1, z1]) => A.tube([[x0, .12, z0], [(x0 + x1) / 2, .2, (z0 + z1) / 2 + (z1 > 0 ? 5 : -5)], [x1 - 3, .14, z1 * 1.4], [x1, .5, z1]], .1, M.rubber, scene, 32));
  // ---------- colliders for the surface hardware (so the player cannot walk through any of it) ----------
  const sb = (x, y, z, hx, hy, hz, ry = 0) => { if (!phys) return; const b = new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(hx, hy, hz)) }); b.position.set(x, y, z); b.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), ry); phys.addBody(b); };
  const loc = (ox, oz, ry, lx, lz) => [ox + lx * Math.cos(ry) + lz * Math.sin(ry), oz - lx * Math.sin(ry) + lz * Math.cos(ry)];
  sb(40, 3, 24, 2.8, 3, 2.8, .5);                      // lander body
  [0, 1, 2, 3].forEach(i => { const a = i * Math.PI / 2 + Math.PI / 4 + .5; sb(40 + Math.cos(a) * 3.6, .5, 24 + Math.sin(a) * 3.6, .6, .5, .6); });   // landing feet
  sb(33, .9, -9, 1.9, .9, 1.3, 2.4);                    // rover
  sb(24, 1.4, -8, 1.0, 1.4, 1.0);                       // robot arm pedestal
  [[-48, -24], [-52, -4], [-48, 16], [-44, -42], [-30, -46]].forEach(([x, z]) => sb(x, 1.6, z, .6, 1.6, .6));   // solar masts
  [[-40, -14], [-40, 6]].forEach(([x, z]) => sb(x, .95, z, 1.35, .95, .95));                                      // battery cabinets
  [[-38, 30], [-33, 36], [-42, 36]].forEach(([x, z]) => sb(x, 2.6, z, 1.8, 2.6, 1.8));                            // tanks
  [[5, 0, 1.7, 1.7, 2.4], [8.4, 1, 1.2, 1.2, 3], [-3.4, 3.5, 1.8, 1.25, 1.2]].forEach(([lx, lz, hx, hz, hy]) => { const [x, z] = loc(-26, -50, .3, lx, lz); sb(x, hy, z, hx, hy, hz, .3); });   // ISRU
  [[27, 6], [27, -6], [20, 28], [-4, 31], [30, 16], [-30, -8], [-20, 24], [14, -34], [-8, -36]].forEach(([x, z]) => sb(x, 1.5, z, .22, 1.5, .22));   // lamp posts
  sb(24, 2, 12, .2, 2, .2); sb(-12, 3, -40, .4, 3, .4);   // banner pole + beacon mast
  // Paths / tyre tracks
  const dust = T.dust(); [[[26, 0], [40, 24]], [[26, 0], [33, -9]], [[0, 27], [11, 36]], [[-27, 0], [-45, -4]]].forEach(([a, b]) => {
    const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz), t = dust.clone(); t.needsUpdate = true; t.repeat.set(1, len / 6);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2.6, len), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, opacity: .9 }));
    m.rotation.x = -Math.PI / 2; const g = new THREE.Group(); g.position.set((a[0] + b[0]) / 2, .04, (a[1] + b[1]) / 2); g.rotation.y = Math.atan2(dx, dz); g.add(m); scene.add(g);
  });

  // Rocks and pebbles (instanced). Keep the build site tidy.
  { const rg = new THREE.DodecahedronGeometry(1, 0), rm = new THREE.MeshStandardMaterial({ color: 0x7e7c78, roughness: 1, flatShading: true });
    const N = 550, inst = new THREE.InstancedMesh(rg, rm, N), d = new THREE.Object3D(); let n = 0;
    const onBase = (x, z) => (Math.abs(x) < 9 && z > -32 && z < 29) || (Math.abs(z) < 9 && x > -31 && x < 29) || Math.hypot(x, z) < 11;
    const clear = (x, z) => onBase(x, z) || (x > -34 && x < 30 && z > -34 && z < 30) || Math.hypot(x - 40, z - 24) < 17 || (x < -24 && x > -56 && z > -56 && z < 42);
    while (n < N) { const a = Math.random() * 6.283, r = 10 + Math.pow(Math.random(), .7) * 330, x = Math.cos(a) * r, z = Math.sin(a) * r - 2; if (clear(x, z)) continue;
      const s = Math.random() < .08 ? .8 + Math.random() * 2.4 : .08 + Math.pow(Math.random(), 2) * .6;
      d.position.set(x, terrainH(x, z) + s * .25, z); d.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6); d.scale.set(s * (1 + Math.random() * .6), s * .7, s * (1 + Math.random() * .6)); d.updateMatrix(); inst.setMatrixAt(n++, d.matrix);
      if (s > .8 && phys) { const b = new CANNON.Body({ mass: 0, shape: new CANNON.Sphere(s * .8) }); b.position.set(x, terrainH(x, z) + s * .2, z); phys.addBody(b); } }
    inst.castShadow = true; inst.receiveShadow = true; scene.add(inst);
    const N2 = 1000, peb = new THREE.InstancedMesh(rg, rm, N2); n = 0;
    while (n < N2) { const a = Math.random() * 6.283, r = 6 + Math.random() * 60, x = Math.cos(a) * r, z = Math.sin(a) * r - 2; if (onBase(x, z) || (clear(x, z) && Math.random() < .93)) continue;
      const s = .03 + Math.random() * .1; d.position.set(x, terrainH(x, z) + s * .1, z); d.rotation.set(Math.random() * 6, Math.random() * 6, 0); d.scale.set(s, s * .6, s); d.updateMatrix(); peb.setMatrixAt(n++, d.matrix); }
    peb.receiveShadow = true; scene.add(peb); }

  // Beacon on a mast for navigation
  { const g = new THREE.Group(); g.position.set(-12, 0, -40); scene.add(g); A.cyl(.1, 9, M.steel, g, 0, 4.5, 0, 8); const b = A.sph(.28, M.emRed, g, 0, 9.2, 0, 10, { cast: false }); out.beacons.push(b); }

  // per-frame
  const t0 = performance.now();
  out.update = (dt, playerPos, s) => {
    if (out.dish && out.dish.syncBody) out.dish.syncBody();   // dish collision follows the dish
    const t = (performance.now() - t0) / 1000;
    sun.target.position.set(Math.round(playerPos.x / 4) * 4, 0, Math.round(playerPos.z / 4) * 4);
    sun.position.copy(sun.target.position).addScaledVector(SUN_DIR, 260);
    out.beacons.forEach((b, i) => b.visible = ((t * .9 + i * .37) % 1.6) < .22);
    const k = Math.max(.15, s.m.power / 100);
    out.lamps.forEach(l => l.material.color.setScalar(k * (s.m.power < 12 ? .3 + .7 * Math.random() : 1)));
    if (out.arm) { const u = out.arm.userData; u.j1.rotation.z = Math.sin(t * .15) * .06; u.j2.rotation.z = Math.sin(t * .2 + 1) * .08; u.j3.rotation.z = Math.sin(t * .25) * .12; }
  };
  return out;
}
