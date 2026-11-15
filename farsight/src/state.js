import {GAME,REAL_DATA as R,SYSTEMS,EVENTS,OBJECTIVES,PHASES} from '../data/outpost_data.js';
export const bus={say(){},event(){},over(){},crate(){}};
const MULT=[1,.5,0],NAMES=['Working','Degraded','Failed'],VITAL=['power','oxygen','water'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const S={day:1,ap:GAME.apPerDay,parts:GAME.startParts,m:{...GAME.startMeters},sys:{},done:{},flags:{},stable:0,phase:1,spe:false,over:null,hist:[]};
for(const k in SYSTEMS){const d=SYSTEMS[k];S.sys[k]={st:d.start,seen:false,on:!d.startOff};if(d.start>0)S.hist.push({day:1,sys:k,text:`Storm damage to ${d.name}`});}
const say=m=>bus.say(m);
const spend=n=>S.ap>=n?(S.ap-=n,true):(say(`Need ${n} action point(s). Press N to end the day.`),false);
const lockOf=k=>{const l=SYSTEMS[k].lock;return l&&!S.done[l]?OBJECTIVES[l]:null;};
export const ensureParts=()=>bus.crate(Object.values(S.sys).reduce((a,s)=>a+s.st,0)+1);

const CHK={sys:o=>S.sys[o.sys].st===0,stable:o=>S.stable>=o.n,meter:o=>S.m[o.meter]>=o.min,seen:o=>S.sys[o.sys].seen,on:o=>S.sys[o.sys].on,flag:o=>!!S.flags[o.flag]};
export function check(){
 for(let ch=true;ch;){ch=false;for(const o of Object.values(OBJECTIVES))
  if(!S.done[o.id]&&o.requires.every(r=>S.done[r])&&CHK[o.check.type](o.check)){S.done[o.id]=true;ch=true;bus.event({title:'✅ '+o.label});}}
 const p=S.done.commsPower?5:S.done.habitat?4:S.done.power?3:S.day>2?2:1;
 if(p!==S.phase){S.phase=p;bus.event({title:`Phase ${p}: ${PHASES[p-1]}`});}
}
export function interact(k){
 if(S.over)return;const d=SYSTEMS[k],s=S.sys[k];
 if(k==='comms')return commsStep();
 const lk=lockOf(k);if(lk)return say(`🔒 ${d.name} locked. First: ${lk.label}`);
 if(!s.seen){if(!spend(1))return;s.seen=true;say(`${d.name}: ${NAMES[s.st]}`);return check();}
 if(s.st===0)return say(`${d.name} is working.`);
 if(S.parts<1)return say('Need 1 spare part. Find an orange crate.');
 if(!spend(2))return;
 S.parts--;S.m.power=Math.max(0,S.m.power-GAME.repairPower);s.st--;
 say(`🔧 ${d.name}: now ${NAMES[s.st]}`);check();
}
export function toggle(k){
 if(S.over)return;const d=SYSTEMS[k],s=S.sys[k];
 if(!d.load)return say(`${d.name} cannot be switched off.`);
 s.on=!s.on;say(`${d.name} power ${s.on?'ON':'OFF'}`);check();
}
function commsStep(){
 const s=S.sys;
 if(!S.done.commsPower){const o=Object.values(OBJECTIVES).find(o=>!S.done[o.id]);return say(`🔒 Radio locked. Next: ${o.label}`);}
 if(!s.comms.on)return say('Switch the radio on first (Q).');
 if(S.m.power<GAME.commsPowerMin)return say('Not enough power for the radio.');
 if(s.antenna.st||s.signal.st)return say('Antenna or signal gear is damaged again. Re-inspect and repair.');
 if(!spend(1))return;
 if(!S.flags.station){S.flags.station=true;say('📡 Space station handshake complete!');check();}
 else{S.flags.earth=true;check();S.over={win:true,reason:`You reconnected with Earth on Day ${S.day}!`,factor:`You fixed the radio chain in the right order and kept ${S.parts} spare parts.`};bus.over();}
}
export function endDay(){
 if(S.over)return;
 const m=S.m,c=GAME.crew,e=k=>S.sys[k].on?MULT[S.sys[k].st]:0;
 let load=0;for(const k in SYSTEMS)if(S.sys[k].on)load+=SYSTEMS[k].load;
 const cap=GAME.maxPower*[1,.6,.3][S.sys.battery.st];
 m.power=clamp(m.power+GAME.solarGen*MULT[S.sys.power.st]-load,0,cap);
 m.oxygen=clamp(m.oxygen+(R.o2GenMax.v*e('oxygen')-c*R.o2PerCrew.v)*GAME.kO2,0,100);
 m.water=clamp(m.water-(c*R.waterPerCrew.v*(1-R.waterRecovery.v*e('water'))+(S.sys.greenhouse.on?GAME.ghWater:0))*GAME.kWater,0,100);
 m.food=clamp(m.food+(GAME.ghFood*e('greenhouse')-c*R.foodPerCrew.v)*GAME.kFood,0,100);
 const sh=1-GAME.shieldCut*e('shield'),heat=S.sys.cooling.on?[0,2,5][S.sys.cooling.st]:5;
 m.safety=clamp(m.safety+GAME.regen-GAME.radBase*sh-(S.spe?GAME.speDose*sh:0)-heat,0,100);
 const dead=Object.keys(m).find(k=>m[k]<=0);if(dead)return lose(dead);
 S.stable=['oxygen','water','food'].every(k=>m[k]>30)&&!VITAL.some(k=>S.sys[k].st===2)?S.stable+1:0;
 S.day++;S.ap=GAME.apPerDay;S.spe=false;
 if(S.day>GAME.missionDays)return lose('time');
 rollEvent();ensureParts();check();
 bus.say(`☀️ Day ${S.day} begins`);
}
function rollEvent(){
 if(Math.random()>GAME.eventChance)return;
 const p=S.phase-1;
 const pool=EVENTS.filter(e=>e.w[p]>0&&!(S.phase<=2&&VITAL.includes(e.sys)&&S.sys[e.sys].st>=1)); // never stack fatal faults early
 if(!pool.length)return;
 let r=Math.random()*pool.reduce((a,e)=>a+e.w[p],0),ev=pool[0];
 for(const x of pool){r-=x.w[p];if(r<=0){ev=x;break;}}
 let k=ev.sys;
 if(k==='?'){const c=['greenhouse','cooling','shield','battery'].concat(S.phase>=4?['antenna','signal']:[]);k=c[Math.random()*c.length|0];}
 if(k){const s=S.sys[k];if(s.st<2)s.st++;s.seen=false;S.hist.push({day:S.day,sys:k,text:`${ev.name} on Day ${S.day}`});}
 if(ev.spe)S.spe=true;
 bus.event({title:'⚠️ '+ev.name,text:ev.text,fact:ev.fact});
}
function lose(k){
 const rel={oxygen:['oxygen','power'],water:['water','power'],food:['greenhouse','power'],power:['power','battery'],safety:['shield','cooling'],time:['antenna','signal','power']}[k];
 const h=[...S.hist].reverse().find(x=>rel.includes(x.sys)&&S.sys[x.sys].st>0);
 S.over={win:false,reason:k==='time'?'Supplies ran out before you called home.':`Your ${k} meter reached zero.`,factor:h?`Biggest factor: ${h.text} was never fully fixed.`:'Biggest factor: too many systems ran at once.'};
 bus.over();
}
