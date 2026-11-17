/* SI generated: written with Claude (an AI assistant) for the Farsight team. See SI_DISCLOSURE.md. */
import * as W from './world.js';
import * as P from './player.js';
import * as U from './ui.js';
import {S,bus,endDay,ensureParts,check} from './state.js';
import * as MG from './minigames/manager.js';
import * as T from './tasks.js';
import * as SC from './screens.js';
import * as CARD from './cards.js';
import * as SL from './sleep.js';
import * as GUIDE from './guide.js';
bus.say=U.say;bus.event=U.event;
// winning plays the ending + credits first (after the comms panel is closed); losing shows the results straight away
let pendingEnd=false;bus.over=()=>{if(!S.over.win)return U.over();if(MG.isOpen())pendingEnd=true;else SC.ending(U.over);};
bus.crate=need=>{while(S.parts+W.crateCount()<need)W.spawnCrate();};   // parts are always obtainable
let low=false;
ensureParts();check();
// debug handle used by automated tests
window.__fs={S,W,P,U,MG,T,SC,CARD,SL,go:()=>{document.getElementById('overlay').style.display='none';SC.hideAll();}};   // handy for testing
// title screen -> (intro video) -> briefing -> game
if(SC.settings.lowGraphics){low=true;W.setQuality(true);}
SC.title({howTo:U.HOWTO,onQuality:v=>{low=v;W.setQuality(v);},onStart:()=>U.start(()=>W.renderer.domElement.requestPointerLock())});
W.renderer.domElement.addEventListener('click',()=>{if(!S.over&&!SC.active()&&!CARD.isOpen()&&!document.pointerLockElement&&document.getElementById('overlay').style.display==='none')W.renderer.domElement.requestPointerLock();});
addEventListener('keydown',e=>{
 if(e.repeat)return;
 if(e.code==='KeyH')U.sources();if(e.code==='KeyM')U.toggleMap();if(e.code==='KeyG')W.setQuality(low=!low);
 if(!document.pointerLockElement||MG.isOpen()||CARD.isOpen()||SL.active())return;
 if(e.code==='KeyE')P.use();if(e.code==='KeyQ')P.power();if(e.code==='KeyN')SL.hint();
});
// minigame open: stop the player, free the mouse; closing with a click puts the mouse back into the game
MG.configure({open(){P.setBusy(true);U.prompt('');if(document.pointerLockElement)document.exitPointerLock();},
 close({byClick}){P.setBusy(false);if(S.over){if(pendingEnd){pendingEnd=false;SC.ending(U.over);}return;}if(byClick){try{const p=W.renderer.domElement.requestPointerLock();if(p&&p.catch)p.catch(()=>U.say('Click the view to continue'));}catch(e){}}else U.say('Click the view to continue');}});
// info cards: same hand-off as the repair panels (stop the player, free the mouse; a click on ✕ puts the mouse back)
P.setOnInfo(o=>{if(!MG.isOpen())CARD.show(o);});
CARD.configure({open(){P.setBusy(true);U.prompt('');if(document.pointerLockElement)document.exitPointerLock();},
 close({byClick}){P.setBusy(false);if(S.over)return;if(byClick){try{const p=W.renderer.domElement.requestPointerLock();if(p&&p.catch)p.catch(()=>U.say('Click the view to continue'));}catch(e){}}else U.say('Click the view to continue');}});
let last=performance.now();
(function loop(t){requestAnimationFrame(loop);const dt=Math.min((t-last)/1000,.05);last=t;
 if(SC.active())return;   // menus and videos cover the view: skip the 3D work
 P.update();W.update(dt);U.render();
 GUIDE.update(dt,document.getElementById('overlay').style.display==='none');   /* first-task guide, once the briefing is closed */
 U.prompt(document.pointerLockElement&&!MG.isOpen()&&!SL.active()?P.hoverText():'');})(last);
