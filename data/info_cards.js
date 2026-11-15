/* SI generated: written with Claude (an AI assistant) for the Farsight team. See SI_DISCLOSURE.md. Values marked as sourced come from the cited documents; the file itself is SI generated. */
// Information cards shown when the player clicks a machine.
// what = what it does in the game (simple words). real = the real-world link. refs = REAL_DATA keys whose sources are linked.
// Every number below is either from REAL_DATA (sourced) or simple physics (light travel time). ISS data is marked as ISS data.
export const CARDS = {
  power: { code: 'EPS-1', what: 'Sends electricity from the solar panels and batteries to every system in the base. If it is damaged, the base makes less power each day.',
    real: 'The ISS spreads power from its solar arrays to every module through switching units. Its arrays make 75–90 kW (ISS data, not lunar).', refs: ['issPower'] },
  battery: { code: 'EPS-2', what: 'Stores spare power. A damaged battery holds less, so the power meter has a lower maximum. The emergency generator is started from this rack.',
    real: 'The ISS spends about 35 minutes of every 90-minute orbit in Earth\'s shadow. Batteries keep it running until the Sun comes back (ISS data).', refs: ['issOrbit'] },
  oxygen: { code: 'ECLS-1', what: 'Makes the air the crew breathes. Each crew member needs about 0.84 kg of oxygen a day.',
    real: 'The ISS makes oxygen by splitting water into oxygen and hydrogen with electricity. Its oxygen generator can make up to 9.25 kg a day (ISS data).', refs: ['o2PerCrew', 'o2GenMax'] },
  water: { code: 'ECLS-2', what: 'Cleans used water so it can be drunk again. Each crew member uses about 2.37 kg of water a day for drinking and food.',
    real: 'The ISS recycles about 98% of its water, including sweat and urine (ISS data, secondary report).', refs: ['waterPerCrew', 'waterRecovery'] },
  greenhouse: { code: 'BIO-1', what: 'Grows fresh food, using water and power. Each crew member eats about 0.62 kg of food solids a day.',
    real: 'Astronauts have grown and eaten lettuce on the ISS in a small plant chamber. Growing food will matter more on long Moon missions.', refs: ['foodPerCrew'] },
  cooling: { code: 'TCS-1', what: 'Carries heat away from machines and people. If it fails, the base heats up and the safety meter drops.',
    real: 'The ISS moves heat with water loops inside and ammonia loops outside, then sends it into space from large radiators.', refs: [] },
  shield: { code: 'RAD-1', what: 'Protects the crew from radiation. Solar storms make radiation much stronger for a while. (The game speeds radiation up.)',
    real: 'Radiation measured on the Moon\'s surface is about 1,369 µSv a day, almost twice the ISS (731 µSv a day). These numbers come from China\'s Chang\'e-4 lander.', refs: ['radMoon'] },
  antenna: { code: 'COM-2', what: 'Points at Earth to send and receive radio signals. The storm knocked it out of line. It is repaired at the dish outside.',
    real: 'The ISS talks to Earth mostly through relay satellites. From the Moon\'s near side, Earth stays in almost the same spot in the sky, so a dish can point straight at it.', refs: [] },
  signal: { code: 'COM-3', what: 'Makes the radio signal strong and clean before it goes up to the dish.',
    real: 'Radio travels at the speed of light, so a message takes about 1.3 seconds to cross the 384,400 km between the Moon and Earth.', refs: [] },
  comms: { code: 'COM-1', what: 'Where the final call home is made. It needs the dish, the transmitter and enough power.',
    real: 'ISS crews talk with Mission Control every day using space-to-ground radio.', refs: [] },
  sleep: { code: 'CQ', name: 'Crew Quarters · Sleep Station', what: 'Each crew member has a small private sleep station. Sleep here to end the day: the base keeps running overnight and a new day begins with fresh action points.',
    real: 'ISS crew quarters are about the size of a phone booth. Astronauts sleep in sleeping bags fixed to the wall, because nothing stays put in orbit.', refs: [] }
};
