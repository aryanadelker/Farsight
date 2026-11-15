// All numbers live here. REAL_DATA = sourced. GAME = invented balance values (not NASA).
const NTRS='https://ntrs.nasa.gov/api/citations/20100036823/downloads/20100036823.pdf';
export const REAL_DATA={
 o2PerCrew:{v:0.84,unit:'kg/day per crew',src:NTRS,note:'NTRS 20100036823'},
 waterPerCrew:{v:2.37,unit:'kg/day per crew (drink + food prep)',src:NTRS,note:'NTRS 20100036823'},
 foodPerCrew:{v:0.62,unit:'kg/day per crew (food solids)',src:'https://ntrs.nasa.gov/api/citations/20190027610/downloads/20190027610.pdf'},
 o2GenMax:{v:9.25,unit:'kg/day',iss:true,src:'https://ntrs.nasa.gov/api/citations/20240006776/downloads/ICES%202024%20101%20AOGA%20final.pdf',note:'ISS data, not lunar'},
 waterRecovery:{v:0.98,unit:'fraction',iss:true,secondary:true,src:'https://phys.org/news/2023-06-nasa-recovery-milestone-international-space.pdf',note:'ISS data; secondary report'},
 issPower:{v:'75-90',unit:'kW',iss:true,src:'https://www.nasa.gov/international-space-station/space-station-facts-and-figures/',note:'ISS data, not lunar'},
 issOrbit:{v:'90 min, ~35 in shadow',iss:true,secondary:true,src:'https://en.wikipedia.org/wiki/Electrical_system_of_the_International_Space_Station',note:'ISS data; secondary'},
 radMoon:{v:1369,unit:'uSv/day (ISS: 731)',secondary:true,src:'https://www.sci.news/space/radiation-dose-rates-lunar-surface-08893.html',note:"Chinese Chang'e-4 lander, quiet Sun, not NASA"},
 doseLimit:{v:600,unit:'mSv career',src:'https://www.frontiersin.org/journals/nuclear-medicine/articles/10.3389/fnume.2022.997718/pdf',note:'waivers allowed'},
 cabinTemp:{v:'20-25 C',recheck:true,src:'https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-002-eclss.pdf',note:'not in verified PDF; re-check'}
};
const R=REAL_DATA;
export const GAME={crew:4,missionDays:30,apPerDay:5,startParts:1,eventChance:0.6,
 startMeters:{oxygen:80,power:80,water:90,food:90,safety:90},
 solarGen:14,maxPower:100,repairPower:3,commsPowerMin:40,
 kO2:3,kWater:2,kFood:3,ghFood:2.2,ghWater:0.5,
 radBase:1.5,speDose:15,shieldCut:0.7,regen:2,   // radiation is sped up on purpose
 moonGravity:1.62,note:'Real radiation alone would not kill the crew; the game speeds it up.'};
export const PHASES=['The Incident','Stabilisation','Infrastructure Recovery','Communication Preparation','Reconnection'];
// start: 0 Working, 1 Degraded, 2 Failed. lock = objective that must be done first. load = power use per day.
export const SYSTEMS={
 power:{name:'Power Distribution',load:0,start:1},
 battery:{name:'Battery Bank',load:0,start:0},
 oxygen:{name:'Oxygen Generator',load:3,start:1},
 water:{name:'Water Recycler',load:2,start:0},
 greenhouse:{name:'Greenhouse',load:3,start:1},
 cooling:{name:'Cooling System',load:2,start:0},
 shield:{name:'Radiation Shield',load:3,start:0},
 antenna:{name:'Antenna',load:0,start:2,lock:'habitat'},
 signal:{name:'Signal & Transmitter',load:0,start:2,lock:'antenna'},
 comms:{name:'Radio Terminal',load:4,start:0,startOff:true}
};
// Dependency graph. Only ESSENTIAL steps. Optional (not listed): backup battery, extra shielding, cooling, greenhouse.
export const OBJECTIVES={
 power:{label:'Fix the power bus',requires:[],check:{type:'sys',sys:'power'}},
 reserve:{label:'Power reserve above 40',requires:['power'],check:{type:'meter',meter:'power',min:40}},
 habitat:{label:'Air, water, food safe 3 days',requires:['power'],check:{type:'stable',n:3}},
 antInspect:{label:'Inspect the antenna',requires:['habitat'],check:{type:'seen',sys:'antenna'}},
 antenna:{label:'Repair the antenna',requires:['antInspect'],check:{type:'sys',sys:'antenna'}},
 signal:{label:'Repair signal & transmitter',requires:['antenna'],check:{type:'sys',sys:'signal'}},
 commsPower:{label:'Switch on the radio',requires:['signal','reserve'],check:{type:'on',sys:'comms'}},
 handshake:{label:'Call the space station',requires:['commsPower'],check:{type:'flag',flag:'station'}},
 earth:{label:'Call Earth',requires:['handshake'],check:{type:'flag',flag:'earth'}}
};
// w = weight in phases 1..5. sys '?' = random non-vital system. fact null = no verified fact yet (do not invent).
export const EVENTS=[
 {name:'Power distribution fault',sys:'power',w:[3,3,2,1,1],text:'Several systems lose power.',fact:{t:'The ISS makes 75-90 kW from eight solar arrays (ISS data, not lunar).',src:R.issPower.src}},
 {name:'Oxygen generator malfunction',sys:'oxygen',w:[3,3,2,1,1],text:'Oxygen production drops.',fact:{t:'The ISS oxygen generator makes up to 9.25 kg a day (ISS data).',src:R.o2GenMax.src}},
 {name:'Water pump failure',sys:'water',w:[1,3,2,1,1],text:'Water recycling slows.',fact:{t:'The ISS now recovers about 98% of its water (2023, news report).',src:R.waterRecovery.src}},
 {name:'Greenhouse malfunction',sys:'greenhouse',w:[1,2,3,1,1],text:'Food production drops.',fact:{t:'An astronaut needs about 0.62 kg of food solids a day.',src:R.foodPerCrew.src}},
 {name:'Battery degradation',sys:'battery',w:[0,1,3,2,1],text:'Power reserves shrink.',fact:{t:'The ISS spends about 35 of every 90 minutes in shadow (ISS data, secondary).',src:R.issOrbit.src}},
 {name:'Micrometeorite impact',sys:'?',w:[1,2,2,2,2],text:'Equipment damage.',fact:null},
 {name:'Solar particle event',sys:null,spe:true,w:[1,2,2,2,2],text:'Radiation rises. Shielding helps!',fact:{t:"Moon surface radiation is ~1,369 uSv/day, 2.6x the ISS. Measured by China's Chang'e-4, quiet Sun.",src:R.radMoon.src}},
 {name:'Cooling system failure',sys:'cooling',w:[1,2,2,1,1],text:'Temperature becomes unstable.',fact:{t:'Cabins are kept at 20-25 C (re-check before citing).',src:R.cabinTemp.src}},
 {name:'Antenna damage',sys:'antenna',w:[0,0,1,4,2],text:'Communication gear needs repair.',fact:null}
];
for(const o of [SYSTEMS,OBJECTIVES])for(const k in o)o[k].id=k;
