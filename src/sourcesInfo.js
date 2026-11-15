// The "Sources" page (title screen) and the in-game H panel: how the meters are worked out, the real data used,
// how the base follows the ISS, and what is made up. Numbers are read from the data file, so this page never goes out of date.
import { GAME, REAL_DATA as R, SYSTEMS } from '../data/outpost_data.js';
const n = v => typeof v === 'number' ? +v.toFixed(2) : v;
export function sourcesHTML() {
  const g = GAME, load = Object.entries(SYSTEMS).filter(([, d]) => d.load).map(([, d]) => `${d.name} ${d.load}`).join(', ');
  const data = Object.entries(R).map(([k, d]) => `<tr><td>${label[k] || k}</td><td>${d.v} ${d.unit || ''}</td><td>${[d.iss ? 'ISS data, not lunar' : '', d.secondary ? 'secondary source' : '', d.recheck ? 'needs re-checking' : '', d.note || ''].filter(Boolean).join(' · ')}</td><td><a href="${d.src}" target="_blank" rel="noopener">open</a></td></tr>`).join('');
  return `<h2>Sources and how the game works</h2>
<h3>How the meters change each night</h3>
<p>When the crew sleeps, every meter changes once. "Output" means how well a system works: Working 100%, Degraded 50%, Failed or switched off 0%.</p>
<ul>
<li><b>Power</b>: + ${g.solarGen} × Power Distribution output, − the power used by every switched-on system (${load}). The most it can hold is ${g.maxPower} × battery state (Working 100%, Degraded 60%, Failed 30%). Each repair also uses ${g.repairPower} power.</li>
<li><b>Oxygen</b>: + oxygen generator (up to ${R.o2GenMax.v} kg/day) × its output, − ${g.crew} crew × ${R.o2PerCrew.v} kg each. The result is multiplied by ${g.kO2} so changes show up within a 30-day game.</li>
<li><b>Water</b>: − ${g.crew} crew × ${R.waterPerCrew.v} kg × (1 − ${R.waterRecovery.v} recycling × Water Recycler output), − ${g.ghWater} if the Greenhouse is on. Multiplied by ${g.kWater}.</li>
<li><b>Food</b>: + ${g.ghFood} × Greenhouse output, − ${g.crew} crew × ${R.foodPerCrew.v} kg each. Multiplied by ${g.kFood}.</li>
<li><b>Safety</b>: + ${g.regen} recovery, − ${g.radBase} radiation × (1 − ${g.shieldCut} × Shield output), − ${g.speDose} more on solar-storm days (also reduced by the shield), − heat: 0 if cooling works, 2 if degraded, 5 if failed or off.</li>
</ul>
<p>Any meter at 0 ends the mission. Reaching Day ${g.missionDays + 1} without calling Earth also ends it. ${g.note}</p>
<h3>Real data used</h3>
<table class="src-t"><tr><th>What</th><th>Value</th><th>Notes</th><th>Source</th></tr>${data}</table>
<h3>How the base follows the International Space Station</h3>
<p>The base layout was planned with the ISS as a visual guide (reference: the NASA ISS Virtual Tour, <a href="https://www.nasa.gov/feature/iss-virtual-tour/" target="_blank" rel="noopener">nasa.gov/feature/iss-virtual-tour</a>). Sizes, colours and the exact layout are our own design.</p>
<ul>
<li><b>Hub</b>: like the ISS "nodes", small modules whose job is to join other modules together through hatches.</li>
<li><b>Crew Quarters</b>: four private sleep stations, like the four crew quarters on the ISS.</li>
<li><b>Life Support</b>: oxygen, water recycling and cooling racks, like the ISS life-support racks.</li>
<li><b>Power Lab</b>: power switching and batteries, like the ISS electrical power system.</li>
<li><b>Airlock</b>: spacesuits stored next to the outside hatch, like the ISS airlock used for spacewalks.</li>
<li><b>Cupola</b>: a room of windows for looking outside, named after the ISS Cupola.</li>
<li><b>Walls of racks, handrails, hatches and lights</b>: copied in style from ISS module interiors.</li>
</ul>
<p><b>What is different on the Moon:</b> there is gravity (1/6 of Earth's), so the base has floors and you walk. The base sits on lunar soil, gets more radiation than the ISS, and points its dish straight at Earth instead of using relay satellites.</p>
<h3>What is made up</h3>
<p>The story, characters, events, puzzle readings and all "game balance" numbers (the multipliers above, power use, radiation speed-up, repair costs) are invented to make the game playable. Values marked "ISS data" come from the space station, not from a real Moon base.</p>
<h3>Software</h3>
<p>Built with three.js and cannon-es (both MIT License). The videos and title art were drawn by our own scripts.</p>`;
}
const label = { o2PerCrew: 'Oxygen per person', waterPerCrew: 'Water per person', foodPerCrew: 'Food per person', o2GenMax: 'ISS oxygen generator, maximum', waterRecovery: 'ISS water recycling', issPower: 'ISS solar power', issOrbit: 'ISS orbit and time in shadow', radMoon: 'Radiation on the Moon', doseLimit: 'Career radiation limit', cabinTemp: 'Cabin temperature' };
