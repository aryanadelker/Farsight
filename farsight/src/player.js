import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import {camera,phys,dyn,consoles,removeObj} from './world.js';
import {S,bus,interact,toggle} from './state.js';
import {SYSTEMS} from '../data/outpost_data.js';
const pm=new CANNON.Material('player');
phys.addContactMaterial(new CANNON.ContactMaterial(pm,phys.defaultMaterial,{friction:0,restitution:0}));
export const body=new CANNON.Body({mass:70,shape:new CANNON.Sphere(.5),material:pm,fixedRotation:true,position:new CANNON.Vec3(0,1,2)});
phys.addBody(body);
const K={},ray=new THREE.Raycaster();ray.far=3.5;
let yaw=0,pitch=0,grab=null;
const fwd=()=>new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
addEventListener('keydown',e=>K[e.code]=1);addEventListener('keyup',e=>K[e.code]=0);
addEventListener('mousemove',e=>{if(!document.pointerLockElement)return;yaw-=e.movementX*.0022;pitch=Math.max(-1.5,Math.min(1.5,pitch-e.movementY*.0022));});
addEventListener('contextmenu',e=>e.preventDefault());
addEventListener('mousedown',e=>{
 if(!document.pointerLockElement)return;
 if(e.button===0){const o=look();if(o&&o.userData.body)grab=o.userData.body;}   // hold left: carry
 if(e.button===2&&grab){const f=fwd();grab.velocity.set(f.x*8,f.y*8,f.z*8);grab=null;} // right: throw
});
addEventListener('mouseup',e=>{if(e.button===0)grab=null;});                     // release: drop
function look(){ray.setFromCamera({x:0,y:0},camera);const h=ray.intersectObjects([...Object.values(consoles),...dyn.map(o=>o.m)])[0];return h&&h.object;}
export function use(){
 const o=look();if(!o)return;
 if(o.userData.crate){S.parts++;removeObj(dyn.find(d=>d.m===o));bus.say('+1 spare part');}
 else if(o.userData.key)interact(o.userData.key);
}
export function power(){const o=look();if(o&&o.userData.key)toggle(o.userData.key);}
export function hoverText(){
 const o=look();if(!o)return '';
 if(o.userData.crate)return 'E: take spare part · hold click: carry';
 if(o.userData.body)return 'Hold click: carry · right click: throw';
 const k=o.userData.key,d=SYSTEMS[k],s=S.sys[k];
 if(k==='comms')return 'E: call home · Q: radio power';
 if(d.lock&&!S.done[d.lock])return `🔒 ${d.name}`;
 const a=!s.seen?'E: inspect (1 action)':s.st?'E: repair (2 actions + 1 part)':`${d.name} works`;
 return a+(d.load?' · Q: power on/off':'');
}
export function update(){
 const f=(K.KeyW?1:0)-(K.KeyS?1:0),s=(K.KeyD?1:0)-(K.KeyA?1:0),sp=K.ShiftLeft?6:3.5;
 const dx=-Math.sin(yaw)*f+Math.cos(yaw)*s,dz=-Math.cos(yaw)*f-Math.sin(yaw)*s,n=Math.hypot(dx,dz)||1;
 body.velocity.x=dx/n*sp;body.velocity.z=dz/n*sp;
 if(K.Space&&body.position.y<.56)body.velocity.y=2.6;      // low-gravity jump
 camera.position.set(body.position.x,body.position.y+.7,body.position.z);camera.rotation.set(pitch,yaw,0,'YXZ');
 if(grab){const t=camera.position.clone().add(fwd().multiplyScalar(2.2)),p=grab.position;
  grab.velocity.set((t.x-p.x)*10,(t.y-p.y)*10,(t.z-p.z)*10);grab.angularVelocity.scale(.9,grab.angularVelocity);}
}
