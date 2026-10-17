import {BUILDINGS,JOBS,GADGETS,FENCE,MAX_PEOPLE} from './engine.js';

export const SPECIALTIES={farming:'Grower',building:'Engineer',scouting:'Pathfinder',combat:'Sharpshooter',medicine:'Field medic'};
export const FARM_EVENTS={
 trader:{title:'A trader at the gate',text:'A traveler offers supplies before moving on.',choices:[{id:'fuel',label:'Buy 2 gasoline · 14 scrap',cost:{scrap:14},gain:{gas:2}},{id:'rations',label:'Buy 4 food and 4 water · 12 scrap',cost:{scrap:12},gain:{food:4,water:4}},{id:'leave',label:'Let the trader move on'}]},
 shelter:{title:'Someone needs shelter',text:'A lone survivor offers to join. They need provisions and a bed.',choices:[{id:'welcome',label:'Welcome them · 3 food + 3 water',cost:{food:3,water:3},rescue:true},{id:'help',label:'Share 1 food · everyone gains 5 morale',cost:{food:1},morale:5},{id:'leave',label:'Keep the gate closed'}]},
 signal:{title:'A broken radio message',text:'A voice describes a supply cache near the abandoned farm. Decoding it costs a radio component.',choices:[{id:'decode',label:'Decode · 1 component → next farm expedition brings +20 scrap',cost:{components:1},cache:true},{id:'share',label:'Share words of hope · 2 gasoline → +10 morale',cost:{gas:2},morale:10},{id:'leave',label:'Save the resources'}]},
 horde:{title:'Supplies behind the horde',text:'Scouts marked a guarded cache. The next expedition can attempt it, but every member faces a higher injury risk.',choices:[{id:'mark',label:'Mark the cache · next expedition +25 scrap, +15% injury risk',guarded:true},{id:'leave',label:'Avoid the horde'}]}
};

// Kept separate from the simulation loop so legacy saves gain these systems in one place.
export function ensureFarmSystems(s){
 s.routines ||= {day:{},night:{},auto:false};s.eventHistory ||= [];s.farmEvent ||= null;s.eventDay ??= 1;s.expeditionBonus ||= null;
 for(const p of s.people){p.specialty ??= null;p.workHistory ||= {farming:0,building:0,scouting:0,combat:0,medicine:0};p.workLog ||= [];}
 for(const site of s.sites)site.priority ??= 0;
}

export function validFarmSystems(s){
 const object=x=>x&&typeof x==='object'&&!Array.isArray(x),number=x=>Number.isFinite(x)&&x>=0;
 if(s.routines!==undefined&&(!object(s.routines)||typeof s.routines.auto!=='boolean'||!['day','night'].every(k=>object(s.routines[k])&&Object.values(s.routines[k]).every(j=>Object.hasOwn(JOBS,j)))))return false;
 if(s.eventHistory!==undefined&&(!Array.isArray(s.eventHistory)||s.eventHistory.some(e=>!object(e)||!number(e.day)||!Object.hasOwn(FARM_EVENTS,e.type)||!FARM_EVENTS[e.type].choices.some(c=>c.id===e.choice))))return false;
 if(s.farmEvent!=null&&(!object(s.farmEvent)||!Object.hasOwn(FARM_EVENTS,s.farmEvent.type)||!number(s.farmEvent.day)))return false;
 if(s.eventDay!==undefined&&!number(s.eventDay))return false;
 const validBonus=b=>object(b)&&[null,'farm'].includes(b.place)&&number(b.scrap)&&number(b.risk)&&b.risk<=.5;
 if(s.expeditionBonus!=null&&!validBonus(s.expeditionBonus))return false;
 if(s.missions.some(m=>m.bonus!=null&&!validBonus(m.bonus)))return false;
 if(s.people.some(p=>(p.specialty!=null&&!Object.hasOwn(SPECIALTIES,p.specialty))||(p.workHistory!==undefined&&(!object(p.workHistory)||Object.values(p.workHistory).some(v=>!number(v))))||(p.workLog!==undefined&&(!Array.isArray(p.workLog)||p.workLog.some(e=>!object(e)||!number(e.day)||typeof e.text!=='string')))))return false;
 return s.sites.every(p=>p.priority===undefined||p.priority===0||p.priority===1);
}

export const farmMethods={
 logWork(p,text){p.workLog.push({day:this.s.day,text});if(p.workLog.length>20)p.workLog.shift();},
 cropName(){return this.upgradeStat('crops','crop','wheat');},
 forecast(){const s=this.s,food=s.people.length+s.people.filter(p=>p.traits.extraMeal).length,water=s.people.length,burn=this.stat('generator','burn',1),remaining=s.phase==='day'?Math.max(0,s.phaseDuration-s.phaseTime):0;
  return {food,water,foodShort:Math.max(0,food-s.food),waterShort:Math.max(0,water-s.water),nights:burn?s.gas/burn:0,guns:this.toolTotal('gun'),freeGuns:this.toolsFree('gun'),daylight:remaining};},
 saveRoutine(phase,assignments){if(!['day','night'].includes(phase))return false;const out={};for(const p of this.s.people){const job=assignments?.[p.id]??p.job;if(JOBS[job])out[p.id]=job;}this.s.routines[phase]=out;return true;},
 applyRoutine(phase){const routine=this.s.routines[phase];if(!routine)return false;for(const p of this.s.people){const job=routine[p.id];if(!p.expeditionId&&JOBS[job]&&(job!=='medic'||this.level('clinic')))this.setJob(p.id,job);}return true;},
 specialize(id,skill){const p=this.s.people.find(p=>p.id===id);if(!['playing','paused','house'].includes(this.s.mode)||!p||p.specialty||!Object.hasOwn(SPECIALTIES,skill)||this.skill(p,skill)<2)return false;p.specialty=skill;this.logWork(p,'Specialized as '+SPECIALTIES[skill]);this.notice(`${p.name} is now a ${SPECIALTIES[skill]}.`,true);return true;},
 prioritizeSite(id){const site=this.s.sites.find(s=>s.id===id);if(!site)return false;site.priority=site.priority?0:1;return true;},
 cancelConstruction(id){const s=this.s,site=s.sites.find(x=>x.id===id);if(!site)return false;const spec=site.kind==='building'?BUILDINGS[site.building].levels[site.level-1]:GADGETS[site.gadget];const refund=Math.floor(spec.cost*(1-site.progress));s.scrap+=refund;if(site.component)s.components++;s.sites=s.sites.filter(x=>x!==site);for(const p of s.people){if(p.order?.siteId===id)p.order=null;if(p.task?.siteId===id)p.task=null;p.orders=p.orders.filter(o=>o.siteId!==id);}this.notice(`Construction cancelled · ${refund} scrap refunded.`,true);return true;},
 setGate(id,open){if(!['playing','paused'].includes(this.s.mode))return false;const gate=this.s.fences.find(g=>g.id===id&&g.kind==='gate');if(!gate)return false;gate.open=!!open;if(gate.perimeter)gate.manualOpen=!!open;this.updateWalls();return true;},
 fenceLine(from,to){const dx=to.x-from.x,dy=to.y-from.y,vertical=Math.abs(dy)>Math.abs(dx),spec=GADGETS.fence,step=spec.w,axis=vertical?'y':'x',other=vertical?'x':'y',start=Math.round(from[axis]/FENCE.grid)*FENCE.grid,end=Math.round(to[axis]/FENCE.grid)*FENCE.grid,sign=end>=start?1:-1;
  const points=[];for(let v=start;sign>0?v<=end:v>=end;v+=sign*step){const p={[axis]:v,[other]:Math.round(from[other]/FENCE.grid)*FENCE.grid};points.push({...this.gadgetGhost('fence',p.x,p.y,vertical),x:p.x,y:p.y});if(points.length>FENCE.max)break;}
  return {points,cost:points.reduce((n,p)=>n+p.cost,0),valid:points.length>0&&points.every(p=>p.valid&&!p.repair)};},
 placeFenceLine(from,to){if(!['playing','paused'].includes(this.s.mode))return false;const line=this.fenceLine(from,to);if(!line.valid){this.notice('The fence line is blocked. Adjust the preview before placing.');return false;}if(this.s.scrap<line.cost){this.notice(`Fence line needs ${line.cost} scrap; you have ${this.s.scrap}.`);return false;}if(this.defenseCount()+line.points.length>FENCE.max){this.notice('Too many defenses in this line.');return false;}for(const p of line.points)this.placeGadget('fence',p.x,p.y,p.vertical);return true;},
 prepareFarmEvent(day=this.s.day){const s=this.s;if(day<2||s.eventDay>=day||s.farmEvent)return;const type=['trader','shelter','signal','horde'][(day-2)%4];s.farmEvent={type,day};s.eventDay=day;this.notice(`${FARM_EVENTS[type].title} · decide in Farm life at breakfast.`,true);},
 eventChoiceAvailable(choice){const s=this.s;return !Object.entries(choice.cost||{}).some(([k,v])=>s[k]<v)&&(!choice.rescue||s.people.length<MAX_PEOPLE)&&(!choice.gain?.food||s.foodCap-s.food>=choice.gain.food)&&(!choice.gain?.water||s.waterCap-s.water>=choice.gain.water)&&(!(choice.guarded||choice.cache)||!s.expeditionBonus);},
 resolveFarmEvent(id){const s=this.s,event=s.farmEvent,spec=FARM_EVENTS[event?.type],choice=spec?.choices.find(c=>c.id===id);if(!['playing','paused','house'].includes(s.mode)||!choice||!this.eventChoiceAvailable(choice))return false;for(const [k,v] of Object.entries(choice.cost||{}))s[k]-=v;for(const [k,v] of Object.entries(choice.gain||{})){if(k==='food')this.storeFood(v,0,0,'supplies');else if(k==='water')this.storeWater(v);else s[k]+=v;}if(choice.morale)for(const p of s.people)p.morale=Math.min(100,p.morale+choice.morale);if(choice.rescue){const p=this.makePerson(`Robin ${s.day}`,785,270);s.people.push(p);s.today.arrivals.push(p.name);}if(choice.cache)s.expeditionBonus={place:'farm',scrap:20,risk:0};if(choice.guarded)s.expeditionBonus={place:null,scrap:25,risk:.15};s.eventHistory.push({day:s.day,type:event.type,choice:id});s.farmEvent=null;this.observeHouse?.();this.emit('autosave');return true;}
};
