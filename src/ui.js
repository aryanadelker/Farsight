/* SI generated: written with Claude (an AI assistant) for the Farsight team. See SI_DISCLOSURE.md. */
import {S} from './state.js';
import {rooms,consoles,dyn,beds} from './world.js';
import {sourcesHTML} from './sourcesInfo.js';
import {pos,heading} from './player.js';
import {GAME,PHASES,OBJECTIVES,REAL_DATA} from '../data/outpost_data.js';
const $=id=>document.getElementById(id),ICON={oxygen:'🫧',power:'⚡',water:'💧',food:'🌱',safety:'🛡️'};
let n=0,tm={};
const show=(id,html,ms)=>{const e=$(id);e.innerHTML=html;e.style.display=id==='overlay'?'flex':'block';clearTimeout(tm[id]);if(ms)tm[id]=setTimeout(()=>e.style.display='none',ms);};
export const say=m=>show('msg',m,2500);
export const event=e=>show('toast',`<b>${e.title}</b>`+(e.text?`<br>${e.text}`:'')+(e.text?`<br>📚 ${e.fact?`${e.fact.t} <a href="${e.fact.src}" target="_blank">source</a>`:'No verified NASA fact yet.'}`:''),e.text?9000:3500);
export function prompt(t){const e=$('prompt');e.textContent=t;e.style.display=t?'block':'none';}
let mapOn=true;export const toggleMap=()=>{mapOn=!mapOn;$('map').style.display=mapOn?'block':'none';};
const MAP={x:-1,z:-1.5,s:6.3};   // metres -> pixels (380px canvas)
function minimap(){
 if(!mapOn)return;const c=$('map'),g=c.getContext('2d'),W=c.width,P=pos(),X=x=>W/2+(x-MAP.x)*MAP.s,Z=z=>W/2+(z-MAP.z)*MAP.s;
 g.clearRect(0,0,W,W);g.fillStyle='#0a1226';g.fillRect(0,0,W,W);
 const here=rooms.find(r=>P.x>r.x0-.3&&P.x<r.x1+.3&&P.z>r.z0-.3&&P.z<r.z1+.3);
 rooms.forEach(r=>{g.fillStyle=r===here?'#2e6fb5':'#2a3b5c';g.fillRect(X(r.x0),Z(r.z0),(r.x1-r.x0)*MAP.s,(r.z1-r.z0)*MAP.s);g.strokeStyle='#7fa8d8';g.lineWidth=2;g.strokeRect(X(r.x0),Z(r.z0),(r.x1-r.x0)*MAP.s,(r.z1-r.z0)*MAP.s);});
 for(const k in consoles){const m=consoles[k],w=m.getWorldPosition(new (m.position.constructor)());const s=S.sys[k];
  g.fillStyle=!s.seen?'#4a8dff':['#4ade80','#fbbf24','#f87171'][s.st];g.beginPath();g.arc(X(w.x),Z(w.z),5,0,7);g.fill();}
 beds.forEach(b=>{g.fillStyle='#c4b5fd';g.font='bold 13px sans-serif';g.fillText('z',X(b.x)-3,Z(b.z)+4);});
 dyn.forEach(o=>{if(!o.m.userData.crate)return;g.fillStyle='#ff8c1a';g.fillRect(X(o.m.position.x)-4,Z(o.m.position.z)-4,8,8);});
 const px=Math.max(8,Math.min(W-8,X(P.x))),pz=Math.max(8,Math.min(W-8,Z(P.z)));g.save();g.translate(px,pz);g.rotate(-heading());g.fillStyle='#fff';g.beginPath();g.moveTo(0,-10);g.lineTo(7,8);g.lineTo(-7,8);g.closePath();g.fill();g.restore();
 g.fillStyle='#9fb6d8';g.font='bold 16px sans-serif';g.fillText('N',W/2-5,18);g.font='12px sans-serif';g.fillText('M: hide map · dot = system · orange = parts · z = bed',8,W-8);
 return here;}
export function render(){
 if(n++%6)return;
 const here=minimap();
 const wh=$('where');wh.textContent=here?here.name:'🌑 MOON SURFACE';$('visor').style.display=here?'none':'block';
 $('top').innerHTML=`Day ${S.day}/${GAME.missionDays} · Actions <span class="ap${S.ap?'':' zero'}">${S.ap}</span> · Parts ${S.parts} · Phase ${S.phase}: ${PHASES[S.phase-1]}`+(S.ap?'':'<div class="ap-hint">💤 No actions left: sleep in Crew Quarters to start a new day</div>');
 $('meters').innerHTML=Object.keys(S.m).map(k=>`<div class="m">${ICON[k]} ${k} ${S.m[k]|0}<i><b class="${S.m[k]<25?'lo':''}" style="width:${S.m[k]}%"></b></i></div>`).join('');
 $('obj').innerHTML='<h4>Objectives</h4>'+Object.values(OBJECTIVES).map(o=>{const d=S.done[o.id],l=!d&&!o.requires.every(r=>S.done[r]);return `<div class="${d?'ok':l?'lk':''}">${d?'✅':l?'🔒':'⬜'} ${o.label}</div>`;}).join('');
 $('spe').style.display=S.spe?'block':'none';
}
export function sources(){const e=$('sources');if(e.style.display==='block'){e.style.display='none';return;}
 e.innerHTML='<p style="text-align:right;margin:0">H to close</p>'+sourcesHTML();e.style.display='block';}
export const HOWTO=`<p>WASD move · Mouse look · Space jump · Shift run<br>E inspect / repair (opens a repair panel, Esc closes it) / take · Q power on/off<br>Click a machine: info card · Hold click carry · Right click throw<br>Sleep in a Crew Quarters sleep station (E) to end the day<br>M map · G faster graphics · H sources<br>Walk through the Airlock (east) to go outside.</p>`;
export function start(onGo){
 show('overlay',`<div><h1>Farsight</h1><p>A solar storm has cut you off from Earth. Repair the base, restore the radio, and call home before your supplies run out.</p>
 <p>WASD move · Mouse look · Space jump · Shift run<br>E inspect / repair (opens a repair panel, Esc closes it) / take · Q power on/off<br>Click a machine: info card · Hold click carry · Right click throw<br>Sleep in a Crew Quarters sleep station (E) to end the day<br>M map · G faster graphics · H sources<br><small>Walk through the Airlock (east) to go outside.</small></p>
 <p><small>${GAME.note}</small></p><button id="go">Start</button></div>`);
 $('go').onclick=()=>{$('overlay').style.display='none';onGo();};
}
export function over(){document.exitPointerLock();const o=S.over;
 show('overlay',`<div><h1>${o.win?'🎉 You called home!':'💀 Mission lost'}</h1><p>${o.reason}</p><p>${o.factor}</p><button onclick="location.reload()">Back to title screen</button></div>`);}
