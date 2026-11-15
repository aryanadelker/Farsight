import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import {GAME,SYSTEMS} from '../data/outpost_data.js';
import {S} from './state.js';
import {buildEnvironment,SUN_DIR,EARTH_DIR} from './env.js';
import * as T from './textures.js';
import * as A from './assets.js';
import {buildBase} from './base.js';

export const scene=new THREE.Scene();scene.background=new THREE.Color(0x000000);
export const camera=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,.1,12000);
export const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(1);renderer.setSize(innerWidth,innerHeight);   // performance: never draw more pixels than the window (high-DPI screens drew up to 2.25x)
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.shadowMap.autoUpdate=false;let shadowTick=0;   // cheaper than soft shadows
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
document.body.prepend(renderer.domElement);
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
export function setQuality(low){   // G key: smaller shadow map + lower resolution for slow computers
 renderer.setPixelRatio(low?.75:1);renderer.setSize(innerWidth,innerHeight);
 const sh=env.sun.shadow;sh.mapSize.set(low?512:1024,low?512:1024);if(sh.map){sh.map.dispose();sh.map=null;}}

export const phys=new CANNON.World({gravity:new CANNON.Vec3(0,-GAME.moonGravity,0)});
phys.defaultContactMaterial.friction=.4;phys.defaultContactMaterial.restitution=.25;
export const dyn=[],consoles={},hits=[],solids=[],lights=[];
// ground under the build site (the player also follows the terrain height beyond it, see player.js)
{const g=new CANNON.Body({mass:0,shape:new CANNON.Box(new CANNON.Vec3(70,1,70))});g.position.set(0,-1,-2);phys.addBody(g);}

{const pm=new THREE.PMREMGenerator(renderer);A.applyEnv(pm.fromEquirectangular(T.skyEnv(SUN_DIR,EARTH_DIR)).texture);pm.dispose();}   // reflections for exterior metal only
phys.solver.iterations=14;phys.solver.tolerance=1e-4;
export const env=buildEnvironment(scene,renderer,phys,hits);
export const base=buildBase({scene,phys,solids,consoles,hits,lights});
phys.bodies.forEach(b=>{if(b.mass===0)b.material=phys.defaultMaterial;});   // every static/kinematic body: low-friction contact with the player (no sticking to walls)
export const rooms=base.rooms;export const beds=base.beds;
export const dish=env.dish;

function dynBox(w,h,d,x,y,z,color,mass){
 const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:.7}));
 m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;scene.add(m);
 const b=new CANNON.Body({mass,shape:new CANNON.Box(new CANNON.Vec3(w/2,h/2,d/2))});b.position.set(x,y,z);phys.addBody(b);
 m.userData.body=b;const o={m,b};dyn.push(o);return o;}
const zone=()=>{const z=base.spawnZones[Math.random()*base.spawnZones.length|0];return [z[0]+Math.random()*(z[1]-z[0]),z[2]+Math.random()*(z[3]-z[2])];};
export const crateCount=()=>dyn.filter(o=>o.m.userData.crate).length;
export function spawnCrate(){const [x,z]=zone();const o=dynBox(.5,.4,.5,x,2.4,z,0xff8c1a,4);o.m.userData.crate=true;
 const s=new THREE.Mesh(new THREE.BoxGeometry(.52,.06,.52),new THREE.MeshStandardMaterial({color:0x222222}));s.position.y=.1;o.m.add(s);}
export function removeObj(o){scene.remove(o.m);phys.removeBody(o.b);dyn.splice(dyn.indexOf(o),1);}
for(let i=0;i<6;i++){const [x,z]=zone();dynBox(.5,.5,.5,x,1.5,z,0x9aa5b1,6);}   // loose props to push and throw

const DISH_DROOP=[0,.35,.9],DISH_TWIST=[0,.15,-.35];
export function update(dt){
 phys.step(1/120,dt,6);
 for(const o of [...dyn]){o.m.position.copy(o.b.position);o.m.quaternion.copy(o.b.quaternion);
  if(o.b.position.y<-30){const c=o.m.userData.crate;removeObj(o);if(c)spawnCrate();}}
 for(const k in consoles){const s=S.sys[k],mat=consoles[k].material;let c;
  if(!s.on&&SYSTEMS[k].load)c=0x444444;else if(k==='comms')c=0x33cc66;else if(!s.seen)c=0x3377ff;else c=[0x33cc66,0xffcc33,0xff3333][s.st];
  mat.emissive.setHex(c);mat.emissiveIntensity=(s.seen&&s.st===2)?.3+Math.random()*.9:.8;}   // flicker = sparks
 const a=S.sys.antenna.st;
 dish.tilt.rotation.x=-dish.elev+DISH_DROOP[a];dish.azimuth.rotation.y=dish.baseYaw+DISH_TWIST[a];   // dish droops until repaired
 const t=performance.now()/400;dish.beacon.material.color.setHex(a===0?0x33ff77:a===1?(Math.sin(t)>0?0xffb020:0x331a00):(Math.sin(t*2)>0?0xff2a1a:0x300000));
 env.update(dt,camera.position,S);base.update(dt,camera.position);
 if(++shadowTick%2===0)renderer.shadowMap.needsUpdate=true;   // performance: shadows redrawn every 2nd frame (the sun never moves)
 renderer.render(scene,camera);
}
