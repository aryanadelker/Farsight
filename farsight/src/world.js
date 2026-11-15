import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import {GAME,SYSTEMS} from '../data/outpost_data.js';
import {S} from './state.js';
export const scene=new THREE.Scene();scene.background=new THREE.Color(0x05060a);
export const camera=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,.1,100);
export const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setSize(innerWidth,innerHeight);document.body.prepend(renderer.domElement);
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
export const phys=new CANNON.World({gravity:new CANNON.Vec3(0,-GAME.moonGravity,0)});
phys.defaultContactMaterial.friction=.4;phys.defaultContactMaterial.restitution=.25;
const hemi=new THREE.HemisphereLight(0xcfe0ff,0x1a1a2a,1);scene.add(hemi);
export const dyn=[],consoles={};

function box(w,h,d,x,y,z,color,mass=0){
 const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color}));
 m.position.set(x,y,z);scene.add(m);
 const b=new CANNON.Body({mass,shape:new CANNON.Box(new CANNON.Vec3(w/2,h/2,d/2))});
 b.position.set(x,y,z);phys.addBody(b);return {m,b};
}
function dynBox(w,h,d,x,y,z,color,mass){const o=box(w,h,d,x,y,z,color,mass);o.m.userData.body=o.b;dyn.push(o);return o;}
// Room 30 x 16 x 5 (floor, ceiling, 4 walls)
box(30,.5,16,0,-.25,0,0x3a3f4a);box(30,.5,16,0,5.25,0,0x2a2f3a);
box(30,5,.5,0,2.5,-8,0x4a5568);box(30,5,.5,0,2.5,8,0x4a5568);
box(.5,5,16,-15,2.5,0,0x4a5568);box(.5,5,16,15,2.5,0,0x4a5568);

function label(t){const c=document.createElement('canvas');c.width=256;c.height=64;const g=c.getContext('2d');
 g.fillStyle='#000a';g.fillRect(0,0,256,64);g.fillStyle='#fff';g.font='bold 24px sans-serif';g.textAlign='center';g.fillText(t,128,42);
 const s=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c)}));s.scale.set(2.4,.6,1);return s;}
[[['power','battery','oxygen','water','greenhouse'],-7,1],[['cooling','shield','antenna','signal','comms'],7,-1]].forEach(([row,z,f])=>row.forEach((k,i)=>{
 const x=-10+i*5;box(1.6,1.2,.8,x,.6,z,0x556070);
 const scr=new THREE.Mesh(new THREE.BoxGeometry(1.3,.7,.1),new THREE.MeshStandardMaterial({color:0x111111,emissive:0x3377ff}));
 scr.position.set(x,1.55,z+f*.3);scr.userData.key=k;scene.add(scr);consoles[k]=scr;
 const l=label(SYSTEMS[k].name);l.position.set(x,2.4,z+f*.3);scene.add(l);
}));
// Antenna dish (tilted until repaired)
export const dish=new THREE.Mesh(new THREE.ConeGeometry(.8,.5,20),new THREE.MeshStandardMaterial({color:0xdddddd}));
dish.position.set(0,3.2,6.2);scene.add(dish);
// Greenhouse plants (wilt when food is low)
const plants=[0,1,2,3].map(i=>{const p=new THREE.Mesh(new THREE.BoxGeometry(.3,1,.3),new THREE.MeshStandardMaterial({color:0x2ecc40}));p.position.set(8.4+i*.8,.5,-5.4);scene.add(p);return p;});

export const crateCount=()=>dyn.filter(o=>o.m.userData.crate).length;
export function spawnCrate(){const o=dynBox(.5,.4,.5,(Math.random()-.5)*20,4,(Math.random()-.5)*6,0xff8c1a,4);o.m.userData.crate=true;}
export function removeObj(o){scene.remove(o.m);phys.removeBody(o.b);dyn.splice(dyn.indexOf(o),1);}
for(let i=0;i<6;i++)dynBox(.5,.5,.5,(Math.random()-.5)*20,1,(Math.random()-.5)*5,0x9aa5b1,6); // loose props to push and throw

export function update(dt){
 phys.step(1/60,dt,3);
 dyn.forEach(o=>{o.m.position.copy(o.b.position);o.m.quaternion.copy(o.b.quaternion);});
 for(const k in consoles){const s=S.sys[k],mat=consoles[k].material;let c;
  if(!s.on&&SYSTEMS[k].load)c=0x444444;else if(k==='comms')c=0x33cc66;else if(!s.seen)c=0x3377ff;else c=[0x33cc66,0xffcc33,0xff3333][s.st];
  mat.emissive.setHex(c);mat.emissiveIntensity=(s.seen&&s.st===2)?.3+Math.random()*.9:.8; // flicker = sparks
 }
 hemi.intensity=.15+.85*S.m.power/100;                       // dim lights when power is low
 dish.rotation.z=[0,.35,.9][S.sys.antenna.st];
 plants.forEach(p=>{const h=.2+S.m.food/100*1.2;p.scale.y=h;p.position.y=h/2;p.material.color.setHex(S.m.food<30?0x8a7a2a:0x2ecc40);});
 renderer.render(scene,camera);
}
