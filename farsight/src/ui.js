import {S} from './state.js';
import {GAME,PHASES,OBJECTIVES,REAL_DATA} from '../data/outpost_data.js';
const $=id=>document.getElementById(id),ICON={oxygen:'🫧',power:'⚡',water:'💧',food:'🌱',safety:'🛡️'};
let n=0,tm={};
const show=(id,html,ms)=>{const e=$(id);e.innerHTML=html;e.style.display=id==='overlay'?'flex':'block';clearTimeout(tm[id]);if(ms)tm[id]=setTimeout(()=>e.style.display='none',ms);};
export const say=m=>show('msg',m,2500);
export const event=e=>show('toast',`<b>${e.title}</b>`+(e.text?`<br>${e.text}`:'')+(e.text?`<br>📚 ${e.fact?`${e.fact.t} <a href="${e.fact.src}" target="_blank">source</a>`:'No verified NASA fact yet.'}`:''),e.text?9000:3500);
export function prompt(t){const e=$('prompt');e.textContent=t;e.style.display=t?'block':'none';}
export function render(){
 if(n++%6)return;
 $('top').textContent=`Day ${S.day}/${GAME.missionDays} · Actions ${S.ap} · Parts ${S.parts} · Phase ${S.phase}: ${PHASES[S.phase-1]}`;
 $('meters').innerHTML=Object.keys(S.m).map(k=>`<div class="m">${ICON[k]} ${k} ${S.m[k]|0}<i><b class="${S.m[k]<25?'lo':''}" style="width:${S.m[k]}%"></b></i></div>`).join('');
 $('obj').innerHTML='<h4>Objectives</h4>'+Object.values(OBJECTIVES).map(o=>{const d=S.done[o.id],l=!d&&!o.requires.every(r=>S.done[r]);return `<div class="${d?'ok':l?'lk':''}">${d?'✅':l?'🔒':'⬜'} ${o.label}</div>`;}).join('');
 $('spe').style.display=S.spe?'block':'none';
}
export function sources(){const e=$('sources');if(e.style.display==='block'){e.style.display='none';return;}
 e.innerHTML='<h3>Sources (H to close)</h3>'+Object.entries(REAL_DATA).map(([k,d])=>`<p><b>${k}</b>: ${d.v} ${d.unit||''} ${d.iss?'· ISS data':''} ${d.secondary?'· secondary source':''} ${d.recheck?'· re-check':''}<br><a href="${d.src}" target="_blank">${d.src}</a><br>${d.note||''}</p>`).join('')+`<p>${GAME.note}</p>`;
 e.style.display='block';}
export function start(onGo){
 show('overlay',`<div><h1>Farsight</h1><p>A solar storm has cut you off from Earth. Repair the base, restore the radio, and call home before your supplies run out.</p>
 <p>WASD move · Mouse look · Space jump · Shift run<br>E inspect / repair / take · Q power on/off<br>Hold click carry · Right click throw · N end day · H sources</p>
 <p><small>${GAME.note}</small></p><button id="go">Start</button></div>`);
 $('go').onclick=()=>{$('overlay').style.display='none';onGo();};
}
export function over(){document.exitPointerLock();const o=S.over;
 show('overlay',`<div><h1>${o.win?'🎉 You called home!':'💀 Mission lost'}</h1><p>${o.reason}</p><p>${o.factor}</p><button onclick="location.reload()">Play again</button></div>`);}
