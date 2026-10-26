// Expedition planning and progression. Kept independent of rendering and farm state.
export const APPROACHES = Object.freeze({
 balanced: {name:'Balanced',search:1,speed:1,noise:1,capacity:32,description:'Standard search speed, noise and cargo capacity.'},
 quiet: {name:'Quiet entry',search:.85,speed:.9,noise:.5,capacity:32,description:'Half the noise; searching is 15% slower and movement 10% slower.'},
 salvage: {name:'Salvage crew',search:1.2,speed:.9,noise:1.35,capacity:48,description:'50% more cargo and 20% faster searches; louder and 10% slower.'},
});
export const CONTRACTS = Object.freeze({
 scavenging:{name:'Supply run',description:'Search six containers and return alive.',target:6,reward:18},
 survey:{name:'Site survey',description:'Enter three buildings and return alive.',target:3,reward:15},
 clearance:{name:'Threat reduction',description:'Defeat eight infected and return alive.',target:8,reward:24},
});
export const CARGO_WEIGHTS=Object.freeze({scrap:1,seeds:1,gas:3,component:4});
export function cargoWeight(bag){return Object.entries(CARGO_WEIGHTS).reduce((sum,[key,weight])=>sum+(bag[key]||0)*weight,0);}
export function objectiveProgress(run){
 const spec=CONTRACTS[run.contract];
 const target=run.contract==='survey'?Math.min(spec.target,run.site.buildings.length):run.contract==='scavenging'?Math.min(spec.target,run.site.containers.length):spec.target;
 const current=run.contract==='survey'?run.site.buildings.filter(b=>b.checked).length:run.contract==='clearance'?run.kills:run.searched;
 return {name:spec.name,current:Math.min(current,target),target,complete:current>=target,reward:spec.reward};
}
export function alertLevel(alert){return alert>=70?'Swarming':alert>=35?'Searching':'Unaware';}
export function planError(kit){
 if(kit.approach!==undefined&&!Object.hasOwn(APPROACHES,kit.approach))return 'Choose a valid expedition approach.';
 if(kit.contract!==undefined&&!Object.hasOwn(CONTRACTS,kit.contract))return 'Choose a valid expedition contract.';
 for(const key of ['shells','meds'])if(kit[key]!==undefined&&(!Number.isFinite(kit[key])||kit[key]<0))return 'Packed supplies must be finite, non-negative numbers.';
 return null;
}
