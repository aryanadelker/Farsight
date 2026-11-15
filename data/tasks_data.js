/* SI generated: written with Claude (an AI assistant) for the Farsight team. See SI_DISCLOSURE.md. Values marked as sourced come from the cited documents; the file itself is SI generated. */
// Maintenance minigames: which puzzle repairs which system, where it is played, and what must work first.
// Every number here is an invented game-design value (not NASA data).
// needs: 'generator' = emergency generator started; any other name = that system must be Working.
export const TASKS = {
 generator:{game:'generator',code:'PWR-02',title:'Emergency Generator Startup',where:'Power Lab · Battery Bank rack',
  objective:'Follow the start-up checklist to bring the backup fuel-cell generator online.',cost:1},
 power:{game:'power',code:'PWR-01',title:'Power Distribution',where:'Power Lab · Power Distribution rack',needs:['generator'],
  objective:'Rotate the bus links and close the breakers so every load gets power. Keep the locked-out line dead.'},
 battery:{game:'generator',variant:'recharge',code:'PWR-03',title:'Battery Bank Recharge',where:'Power Lab · Battery Bank rack',needs:['generator'],
  objective:'Run the generator start-up checklist again to recharge the damaged battery strings.'},
 greenhouse:{game:'ventilation',code:'ECS-04',title:'Ventilation Repair',where:'Greenhouse · grow-bay air handler',needs:['power'],
  objective:'Rotate the duct sections and clear the blocked ducts so air reaches both grow-bay vents.'},
 oxygen:{game:'scrubber',code:'ECS-01',title:'Oxygen Scrubber Calibration',where:'Life Support · Oxygen Generator',needs:['power'],
  objective:'Turn the three controls until every reading sits inside its green band at the same time.'},
 water:{game:'water',code:'ECS-02',title:'Water Filtration',where:'Life Support · Water Recycler',needs:['power'],
  objective:'Put the right filter modules in the right order, then run the pump. Read what each module needs.'},
 cooling:{game:'coolant',code:'TCS-01',title:'Coolant Circulation',where:'Life Support · Cooling System',needs:['power'],
  objective:'Set the valves and diverters so coolant runs one clean loop through every heat exchanger and the radiator.'},
 shield:{game:'scrubber',variant:'shield',code:'RAD-01',title:'Radiation Shield Field Balance',where:'Hub · Radiation Shield rack',needs:['power'],
  objective:'Balance the shield coils until every reading sits inside its green band at the same time.'},
 antenna:{game:'dish',code:'COM-02',title:'Satellite Dish Repair',where:'Outside · antenna dish south of the Cupola',needs:['power'],outside:true,
  objective:'Use the clutches and the drive wheel to bring every gear mark to its notch, then lock all clutches.'},
 signal:{game:'power',variant:'signal',code:'COM-03',title:'Transmitter RF Chain',where:'Comms Bay · Signal & Transmitter rack',needs:['power'],
  objective:'Rotate the RF links and close the relays so the oscillator drives both outputs. Keep the test port dead.'},
 comms:{game:'comms',code:'COM-01',title:'Communications Restoration',where:'Comms Bay · Radio Terminal',
  objective:'Lock the carrier, sync the waveform, build a strong link, then rebuild the missing packets from Earth.'}
};
export const GENERATOR={powerBoost:10};   // one-time power added when the emergency generator first comes online
export const TUNE={
 power:{cols:7,rows:5,loads:['LIFE SUPPORT','HUB','COMMS BAY']},signal:{cols:6,rows:4,loads:['PWR AMP','FEED HORN']},
 vent:{cols:7,rows:4,clogs:2,clearMs:900},
 scrubber:{band:.07,holdSec:2.5},
 comms:{lockSec:1.2}
};
