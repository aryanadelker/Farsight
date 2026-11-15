import * as W from './world.js';
import * as P from './player.js';
import * as U from './ui.js';
import {S,bus,endDay,ensureParts,check} from './state.js';
bus.say=U.say;bus.event=U.event;bus.over=U.over;
bus.crate=need=>{while(S.parts+W.crateCount()<need)W.spawnCrate();};   // parts are always obtainable
ensureParts();check();
U.start(()=>W.renderer.domElement.requestPointerLock());
W.renderer.domElement.addEventListener('click',()=>{if(!S.over&&!document.pointerLockElement&&document.getElementById('overlay').style.display==='none')W.renderer.domElement.requestPointerLock();});
addEventListener('keydown',e=>{
 if(e.repeat)return;
 if(e.code==='KeyH')U.sources();
 if(!document.pointerLockElement)return;
 if(e.code==='KeyE')P.use();if(e.code==='KeyQ')P.power();if(e.code==='KeyN')endDay();
});
let last=performance.now();
(function loop(t){requestAnimationFrame(loop);const dt=Math.min((t-last)/1000,.05);last=t;
 P.update();W.update(dt);U.render();U.prompt(document.pointerLockElement?P.hoverText():'');})(last);
