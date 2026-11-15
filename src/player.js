/* SI generated: written with Claude (an AI assistant) for the Farsight team. See SI_DISCLOSURE.md. */
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import {camera,phys,dyn,hits,solids,removeObj} from './world.js';
import {terrainH} from './env.js';
import {S,bus,toggle} from './state.js';
import * as T from './tasks.js';
let onInfo=()=>{};export const setOnInfo=f=>{onInfo=f;};
import {SYSTEMS} from '../data/outpost_data.js';
const R=.45,EYE=1.15,LIMIT=330;
const pm=new CANNON.Material('player');
phys.addContactMaterial(new CANNON.ContactMaterial(pm,phys.defaultMaterial,{friction:0,restitution:0}));
export const body=new CANNON.Body({mass:70,shape:new CANNON.Sphere(R),material:pm,fixedRotation:true,position:new CANNON.Vec3(0,R+.05,2)});
const HEAD=.3;body.addShape(new CANNON.Sphere(HEAD),new CANNON.Vec3(0,EYE,0));   // head: the camera sits inside it, so jumps stop at ceilings instead of poking through
phys.addBody(body);
const K={},ray=new THREE.Raycaster();ray.far=3.5;
let yaw=0,pitch=0,grab=null,lift=0;
const fwd=()=>new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
addEventListener('keydown',e=>K[e.code]=1);addEventListener('keyup',e=>K[e.code]=0);
addEventListener('mousemove',e=>{if(!document.pointerLockElement)return;yaw-=e.movementX*.0022;pitch=Math.max(-1.5,Math.min(1.5,pitch-e.movementY*.0022));});
addEventListener('contextmenu',e=>e.preventDefault());
addEventListener('mousedown',e=>{
 if(!document.pointerLockElement)return;
 if(e.button===0&&!busy){const o=look();if(o&&o.userData.body)grab=o.userData.body;else if(o&&o.userData.key)onInfo(o);}   // hold left: carry · click a machine: info card
 if(e.button===2&&grab){const f=fwd();grab.velocity.set(f.x*8,f.y*8,f.z*8);grab=null;} // right: throw
});
addEventListener('mouseup',e=>{if(e.button===0)grab=null;});                     // release: drop
// First thing the ray hits. Walls and racks block it, so you cannot press buttons through a wall.
function look(){ray.setFromCamera({x:0,y:0},camera);
 const h=ray.intersectObjects([...hits,...dyn.map(o=>o.m),...solids],false)[0];
 const o=h&&h.object;return o&&(o.userData.key||o.userData.body)?o:null;}
export const target=()=>look();   // what the crosshair is on (used by tests)
export function use(){
 const o=look();if(!o)return;
 if(o.userData.crate){S.parts++;removeObj(dyn.find(d=>d.m===o));bus.say('+1 spare part');}
 else if(o.userData.key)T.activate(o.userData.key,o.userData.src);   // inspect / repair minigame / comms
}
export function power(){const o=look();if(o&&o.userData.key)toggle(o.userData.key);}
export function hoverText(){
 const o=look();if(!o)return '';
 if(o.userData.crate)return 'E: take spare part · hold click: carry';
 if(o.userData.body)return 'Hold click: carry · right click: throw';
 return T.hover(o.userData.key,o.userData.src)+' · Click: info';
}
export const pos=()=>body.position;
export const heading=()=>yaw;
export function teleport(x,z,y=0,p=0,l=0){lift=l;body.position.set(x,R+.05,z);body.velocity.set(0,0,0);yaw=y;pitch=p;}
// standing on something = a contact under the feet sphere pushing up
function onGround(){for(const c of phys.contacts){const me=c.bi===body?1:c.bj===body?-1:0;if(!me)continue;const sh=me>0?c.si:c.sj;if(sh!==body.shapes[0])continue;if(-c.ni.y*me>.5&&body.velocity.y<.3)return true;}return false;}
let busy=false;export const setBusy=b=>{busy=b;for(const k in K)K[k]=0;grab=null;};   // minigame open: no walking, jumping or grabbing
export function update(){
 const f=busy?0:(K.KeyW?1:0)-(K.KeyS?1:0),s=busy?0:(K.KeyD?1:0)-(K.KeyA?1:0),sp=K.ShiftLeft?6:3.5;
 const dx=-Math.sin(yaw)*f+Math.cos(yaw)*s,dz=-Math.cos(yaw)*f-Math.sin(yaw)*s,n=Math.hypot(dx,dz)||1;
 body.velocity.x=dx/n*sp;body.velocity.z=dz/n*sp;
 const p=body.position,g=terrainH(p.x,p.z)+R;                 // follow the moon ground outside the flat build site
 if(p.y<g){p.y=g;if(body.velocity.y<0)body.velocity.y=0;}
 if(K.Space&&!busy&&(p.y<g+.08||onGround()))body.velocity.y=2.0;   // low-gravity jump (from the floor, a roof or a crate)
 const r=Math.hypot(p.x,p.z);if(r>LIMIT){body.velocity.x-=p.x/r*8;body.velocity.z-=p.z/r*8;}   // soft edge of the map
 camera.position.set(p.x,p.y+EYE+lift,p.z);camera.rotation.set(pitch,yaw,0,'YXZ');
 if(grab){const t=camera.position.clone().add(fwd().multiplyScalar(2.2)),q=grab.position;
  grab.velocity.set((t.x-q.x)*10,(t.y-q.y)*10,(t.z-q.z)*10);grab.angularVelocity.scale(.9,grab.angularVelocity);}
}
