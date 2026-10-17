import {ensurePerimeter,validPerimeter,perimeterMethods,GATE_INSIDE,GATE_OUTSIDE} from './perimeter.js';
import {SITE,SiteRun,createSite,ensureExpeditions,validExpeditions} from './expedition.js';
import {ensureHomestead,validHomestead,homesteadMethods} from './homestead.js';
import {ensureHouse,validHouse,houseMethods} from './house-systems.js';
import {ensureFarmSystems,farmMethods,validFarmSystems} from './farm-systems.js';
import {GameEngine,BUILDINGS,UPGRADES,GADGETS,JOBS,WORLD,FARMHOUSE,HOUSE_DOOR,DAY_LENGTH,NIGHT_LENGTH,MAX_PEOPLE,COMBAT,PLOT_SPOTS,clearPath} from './engine.js';

// New systems extend the manager engine, keeping its original rules and classic modes intact.
Object.assign(BUILDINGS,{
 barn:{name:'Barn upgrades',x:125,y:110,w:160,h:130,solid:false,about:'Hay storage, more cattle space and reinforced doors.',levels:[{cost:40,hay:20,cows:2,text:'Hay loft · stores 20 hay · room for 2 more cows'},{cost:65,hay:40,cows:4,text:'Expanded stalls · 40 hay · 4 extra cows'},{cost:95,hay:60,cows:6,text:'Reinforced barn · 60 hay · 6 extra cows'}]},
 clinic:{name:'Clinic',x:1030,y:400,w:80,h:54,about:'Medics treat the wounded here. Comfortable beds improve recovery and morale.',levels:[{cost:45,healing:2,text:'Treatment room · 2 health per second'},{cost:75,healing:3,text:'Recovery ward · 3 health per second'},{cost:110,healing:4,text:'Field hospital · 4 health per second'}]},
 radio:{name:'Radio station',x:1060,y:40,w:64,h:48,about:'Repair the aerial with a component from an expedition. Contact another settlement for the campaign.',levels:[{cost:55,text:'Receiver built · find an aerial component'},{cost:80,text:'Aerial repaired · settlement contacted'}]}
});
GADGETS.gate={name:'Gate',cost:6,w:48,h:10,rotates:true,hp:140,work:5,text:'A strong entrance · open or close all gates'};
JOBS.medic='Medic';
UPGRADES.weapons={name:'Weapon blueprints',about:'Recovered expedition plans improve every survivor’s firearm.',levels:[{cost:60,damage:1.15,text:'Improved barrels · 15% more gun damage'},{cost:90,damage:1.3,text:'Precision parts · 30% more gun damage'}]};
export const CROPS={auto:{name:'Seed-stock crop',time:1,food:null,scrap:null},potato:{name:'Potatoes',time:.65,food:2,scrap:2},corn:{name:'Trade corn',time:1.15,food:1,scrap:8},pumpkin:{name:'Pumpkins',time:1.6,food:4,scrap:6}};
// Expedition sites (Update 31) are played on their own maps, never drawn on the farm's. Scouts still find them.
export const PLACES={
 farm:{name:'Abandoned farm',danger:'low',blocks:[3,2],buildings:.5,zombies:7,survivor:.18,component:0,loot:{seeds:5,scrap:4,scythe:1.1,gas:.8,meds:.6,gun:.3},kinds:{walker:.7,runner:.15,crawler:.15},description:'Seeds, scrap and farm tools. The safest place to start.'},
 gas:{name:'Gas station',danger:'medium',blocks:[3,2],buildings:.5,zombies:11,survivor:.2,component:.6,loot:{gas:5,scrap:4,gun:.6,meds:.6,seeds:.5},kinds:{walker:.55,runner:.15,brute:.1,spitter:.1,crawler:.1},description:'Fuel and radio parts. Bring an armed escort.'},
 medical:{name:'Roadside clinic',danger:'medium',blocks:[3,2],buildings:.67,zombies:12,survivor:.45,component:0,loot:{meds:5,scrap:3,gas:.6,seeds:.5,gun:.4},kinds:{walker:.6,runner:.2,crawler:.1,spitter:.1},description:'Medicine, and people who sheltered there.'},
 town:{name:'Silent town',danger:'high',blocks:[4,3],buildings:.75,zombies:18,survivor:.4,component:.6,loot:{scrap:5,gas:2,meds:2,seeds:1.5,gun:1.2,scythe:.5},kinds:{walker:.5,runner:.2,brute:.15,spitter:.08,crawler:.07},description:'Everything worth having, and the most dead.'}
};
export const TRAITS=[
 {good:'Craftsperson',weak:'Slow walker',build:1.18,speed:.9},
 {good:'Green thumb',weak:'Fragile',farm:1.18,hp:54},
 {good:'Sharp-eyed',weak:'Big appetite',scout:1.2,extraMeal:true},
 {good:'Steady nerves',weak:'Heavy sleeper',brave:true,speed:.95}
];
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const ACTIVE=new Set(['playing','paused']);
// Squad orders: how far a finished group attack looks for its next zombie, and how close a blade or fists will chase.
export const SQUAD={retarget:200,chase:120};
const COUNTERS=['gadgetId','siteId','personId','animalId','zombieId','fenceWarning','seedAlarm','shellAlarm','panicWarned','eggTimer','shellTimer','repairTimer','towerCooldown','storageWarning','noticeCooldown','spawnTimer','spawnCount','warningGiven','farmWarning'];
function validState(s){
 if(!s||!['people','plots','sites','zombies','missions','fences','traps','dogs','cows','journal','particles','floaters','tracers','shots','corpses','missionHistory','discoveredPlans'].every(k=>Array.isArray(s[k])))return false;
 if(s.people.length>8||!['clear','rain','dry','fog'].includes(s.weather)||!['day','night'].includes(s.phase)||!Number.isFinite(s.phaseTime)||!Number.isFinite(s.phaseDuration)||s.phaseDuration<=0||!s.today||!s.groups||!s.discoveries)return false;
 if(!s.buildings||!s.upgrades||Object.entries(BUILDINGS).some(([id,b])=>!Number.isInteger(s.buildings[id])||s.buildings[id]<0||s.buildings[id]>b.levels.length)||Object.entries(UPGRADES).some(([id,u])=>!Number.isInteger(s.upgrades[id])||s.upgrades[id]<0||s.upgrades[id]>u.levels.length))return false;
 if(s.plots.length!==BUILDINGS.field.levels[s.buildings.field-1]?.plots)return false;
 if(s.plots.some(p=>!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||!Number.isFinite(p.growth)||p.growth< -1||p.growth>1||!CROPS[p.crop]||!CROPS[p.choice]))return false;
 if(s.people.some(p=>!p||typeof p.name!=='string'||!Number.isFinite(p.y)||!Number.isFinite(p.maxHp)||p.maxHp<=0||!p.skills||!['farming','building','scouting','combat','medicine'].every(k=>Number.isFinite(p.skills[k])&&p.skills[k]>=0)||!p.traits||!Array.isArray(p.orders)||!Array.isArray(p.patrol)||!['normal','hold','conserve'].includes(p.fireMode)))return false;
 if(new Set(s.people.map(p=>p.id)).size!==s.people.length)return false;
 if(s.missions.some(m=>!m||!PLACES[m.place]||!['travel','decision','return','site','done'].includes(m.stage)||!Array.isArray(m.members)))return false;
 if(s.sites.some(p=>!p||!Number.isFinite(p.progress)||p.progress<0||p.progress>1||!Number.isFinite(p.work)||p.work<=0||(p.kind==='building'?!BUILDINGS[p.building]:p.kind==='gadget'?!GADGETS[p.gadget]:true)))return false;
 return true;
}

export class ColonyEngine extends GameEngine{
 reset(mode,endless=false){super.reset(mode,endless);Object.assign(this.s,{campaign:false,weather:'clear',hay:0,components:0,missions:[],discoveries:{farm:true},missionHistory:[],groups:{},forecast:false,discoveredPlans:[],tutorial:true,campaignWon:false,radioContact:false});ensureFarmSystems(this.s);ensureHomestead(this.s);ensureHouse(this.s);ensureExpeditions(this.s);ensurePerimeter(this);this.run=null;this.missionId=0;this.rainTimer=0;this.medTimer=0;this.siegeSpawned=false;this.worker=null;this.fighter=null;for(const p of this.s.people)this.enrich(p);for(const p of this.s.plots){p.choice='auto';p.crop='auto';}}
 enrich(p){if(!p.traits){p.traits={...TRAITS[(p.id-1)%TRAITS.length]};p.skills={farming:0,building:0,scouting:0,combat:0,medicine:0};p.morale=70;p.orders=[];p.fireMode='normal';p.patrol=[];p.maxHp=p.traits.hp||p.maxHp;p.hp=Math.min(p.hp,p.maxHp);}ensureFarmSystems({people:[p],sites:[]});return p;}
 makePerson(...args){return this.enrich(super.makePerson(...args));}
 makePlot(spot,growth){return {...super.makePlot(spot,growth),choice:'auto',crop:'auto'};}
 start(endless=false,campaign=false){super.start(endless||campaign);this.s.campaign=campaign;this.s.weather='clear';this.emit('autosave');}
 restart(endless=this.s.endless){const campaign=this.s.campaign;this.reset('title');this.start(endless,campaign);}
 continueEndless(){this.s.campaign=false;return super.continueEndless();}
 skill(p,key){return Math.min(5,Math.floor((p.skills?.[key]||0)/20));}
 xp(p,key,n=1){if(!p?.skills)return;const before=this.skill(p,key);p.skills[key]+=n;p.workHistory[key]=(p.workHistory[key]||0)+n;if(this.skill(p,key)>before)this.notice(`${p.name}: ${key} skill reached level ${this.skill(p,key)}.`,true);}
 bonus(p,key){return (p.specialty===key?1.2:1)*(1+this.skill(p,key)*.07)*(.75+(p.morale||0)/280);}
 setJob(id,job){const p=this.s.people.find(p=>p.id===id);if(!p||p.expeditionId||p.job===job)return false;if(p){p.orders=[];p.patrol=[];}const changed=super.setJob(id,job);if(changed)this.logWork(p,'Assigned to '+JOBS[job]);return changed;}
 clearOrders(ids){super.clearOrders(ids);for(const p of this.s.people)if(ids.includes(p.id)){p.orders=[];p.patrol=[];}}
 giveOrder(p,order){p.orders=[];p.patrol=[];super.giveOrder(p,order);}
 command(ids,x,y,queued=false){if(!queued)return this.engageMoves(super.command(ids,x,y),ids);const group=this.s.people.filter(p=>ids.includes(p.id)&&!p.expeditionId);if(!group.length)return null;const stored=group.map(p=>[p,p.order,p.task,[...p.orders],[...p.patrol]]);const reply=this.engageMoves(super.command(ids,x,y),ids);if(reply?.type==='lot')return reply;for(const [p,old,task,queue,patrol] of stored){const next=p.order;if(old){p.order=old;p.task=task;p.orders=[...queue,next].filter(Boolean);p.patrol=patrol;}}return reply?{...reply,text:'Order added to the selected squad’s queue.'}:null;}
 // Squad orders (Update 30): a right-click on the ground is an attack-move, and a group attack moves on to the next zombie nearby.
 engageMoves(reply,ids){if(reply?.type==='move')for(const p of this.s.people)if(ids.includes(p.id)&&p.order?.type==='move')p.order.engage=true;return reply;}
 nearestZombie(p,reach){let best=null,bestDistance=reach;for(const z of this.s.zombies){const d=dist(z,p);if(z.hp>0&&d<bestDistance){best=z;bestDistance=d;}}return best;}
 // What an attack-moving person stops for: a zombie in sight for a loaded shotgun, or one close enough to run at with a blade or fists.
 engageTarget(p){if(p.fireMode==='hold')return null;const gun=p.tool==='gun'&&this.s.ammo>0,reach=gun?COMBAT.gun.range*(this.s.weather==='fog'?.7:1):SQUAD.chase;let best=null,bestDistance=Infinity;for(const z of this.s.zombies){const d=dist(z,p)-z.radius;if(z.hp>0&&d<reach&&d<bestDistance&&(!gun||clearPath(p,z,0,this.obstacles))){best=z;bestDistance=d;}}return best&&{zombie:best,chase:!gun};}
 followOrder(p,dt){const attack=p.order?.type==='attack'?p.order:null;if(attack&&!this.s.zombies.some(z=>z.id===attack.zombieId&&z.hp>0)){const next=this.nearestZombie(p,SQUAD.retarget);if(next)attack.zombieId=next.id;else p.order=null;}
  if(p.order?.type==='move'){if(p.inside){p.inside=false;p.x=HOUSE_DOOR.x;p.y=HOUSE_DOOR.y+4;}p.panic=false;const threat=p.order.engage&&this.engageTarget(p);if(threat){p.status='Fighting';if(threat.chase)this.walkTo(p,threat.zombie,100,dt);}else{const arrived=this.walkTo(p,p.order,95,dt);p.status=arrived?'Holding position':'On the way';if(arrived&&(p.orders.length||p.patrol.length))p.order=null;}}else if(p.order)super.followOrder(p,dt);if(!p.order&&p.orders.length){const next=p.orders.shift(),remaining=p.orders;super.giveOrder(p,next);p.orders=remaining;}if(!p.order&&p.patrol.length){p.patrolIndex=((p.patrolIndex||0)+1)%p.patrol.length;super.giveOrder(p,{type:'move',...p.patrol[p.patrolIndex]});}}
 setPatrol(ids,x,y){if(!ACTIVE.has(this.s.mode))return false;for(const p of this.s.people.filter(p=>ids.includes(p.id)&&!p.expeditionId)){p.patrol=[{x:p.x,y:p.y},{x:clamp(x,WORLD.left+20,WORLD.right-20),y:clamp(y,WORLD.top+20,WORLD.bottom-20)}];p.orders=[];p.patrolIndex=1;super.giveOrder(p,{type:'move',...p.patrol[1]});}return true;}
 retreat(ids=this.s.people.map(p=>p.id)){return this.command(ids,HOUSE_DOOR.x,FARMHOUSE.y+80);}
 holdPosition(ids){if(!ACTIVE.has(this.s.mode))return false;for(const p of this.s.people.filter(p=>ids.includes(p.id)&&!p.expeditionId))this.giveOrder(p,{type:'move',x:p.x,y:p.y});return true;}
 setFireMode(ids,mode){if(!['normal','hold','conserve'].includes(mode))return false;for(const p of this.s.people)if(ids.includes(p.id))p.fireMode=mode;return true;}
 saveGroup(slot,ids){if(slot<1||slot>4)return false;this.s.groups[slot]=ids.filter(id=>this.s.people.some(p=>p.id===id));return true;}
 group(slot){return (this.s.groups[slot]||[]).filter(id=>this.s.people.some(p=>p.id===id));}
 walkTo(p,to,speed,dt){if(p.gateReturn){const point=p.gateReturn===1?GATE_OUTSIDE:GATE_INSIDE;if(super.walkTo(p,point,speed,dt)){if(p.gateReturn===1)p.gateReturn=2;else p.gateReturn=0;}return false;}const waking=p.traits?.weak==='Heavy sleeper'&&this.s.phase==='day'&&this.s.phaseTime<15?.85:1;return super.walkTo(p,to,speed*(p.traits?.speed||1)*waking,dt);}
 plotWork(p){return super.plotWork(p)/this.bonus(p,'farming')/(p.traits?.farm||1);}
 workPlot(p,plot,dt){this.worker=p;const done=super.workPlot(p,plot,dt);this.worker=null;if(done)this.xp(p,'farming',2);return done;}
 workSite(p,site,dt){const before=site.progress;super.workSite(p,site,dt*this.bonus(p,'building')*(p.traits?.build||1));if(site.progress>before)this.xp(p,'building',dt*.8);}
 buildWork(p,dt){if(this.workHouseProject(p,dt))return;super.buildWork(p,dt*(this.nextSite(p)?1:this.bonus(p,'building')));if(p.hammering)this.xp(p,'building',dt*.6);}
 harvestPlot(plot){if((plot.crop||'auto')==='auto'){super.harvestPlot(plot);}else{const spec=CROPS[plot.crop];plot.growth=-1;this.s.harvested++;this.s.today.harvested++;this.s.scrap+=spec.scrap;this.storeFood(spec.food,plot.x,plot.y-26,'food');if(this.s.harvested%2===0)this.s.seeds++;this.floater(plot.x,plot.y-14,`+${spec.scrap} scrap`,'#ffd772');this.burst(plot.x,plot.y,'#eac75c',10,45);this.emit('sound',{name:'harvest'});}if(this.level('barn'))this.s.hay=Math.min(this.stat('barn','hay'),this.s.hay+1);}
 plantPlot(plot){plot.crop='auto';plot.choice='auto';super.plantPlot(plot);}
 growTimeFor(plot){return this.growTime()*CROPS[plot.crop||'auto'].time*(this.s.weather==='dry'?(this.s.water>this.s.people.length?1.05:1.5):1);}
 chooseCrop(){return false;} // Legacy API: planting now always follows the Crops upgrade level.
 stat(id,key,fallback=0){let n=super.stat(id,key,fallback);if(id==='pasture'&&key==='cows'&&super.level('pasture'))n+=super.stat('barn','cows',0);if(id==='waterTank'&&key==='rain'&&this.s.weather!=='rain')return 0;return n;}
 finishSite(site){if(site.gadget==='gate'){this.s.sites=this.s.sites.filter(s=>s!==site);this.s.fences.push({id:++this.gadgetId,kind:'gate',perimeter:site.perimeter,manualOpen:false,...site.rect,vertical:site.vertical,hp:140,maxHp:140,hurt:0,open:false});this.updateWalls();this.emit('sound',{name:'build'});}else{super.finishSite(site);if(site.perimeter){const built=this.s.fences.at(-1);if(built)built.perimeter=site.perimeter;}}}
 updateWalls(){super.updateWalls();this.walls=this.walls.filter(r=>!(r.kind==='gate'&&r.open));}
 nextSite(person){const eligible=this.s.sites.filter(s=>s.kind==='gadget'||this.s.phase==='day');const high=eligible.filter(s=>s.priority);if(!high.length)return super.nextSite(person);return high.sort((a,b)=>dist(this.siteSpot(a,person),person)-dist(this.siteSpot(b,person),person))[0];}
 setGates(open){if(!ACTIVE.has(this.s.mode))return false;for(const g of this.s.fences)if(g.kind==='gate'){g.open=!!open;if(g.perimeter)g.manualOpen=!!open;}this.updateWalls();return true;}
 moveBody(p,dx,dy,radius,solids=this.obstacles){if(p.kind==='crawler'&&solids===this.walls)solids=solids.filter(r=>r.kind!=='fence');return super.moveBody(p,dx,dy,radius,solids);}
 orderBuild(id){if(id==='radio'&&this.level('radio')===1&&this.s.components<1){this.notice('Find an aerial component at the gas station or town first.',true);return false;}const site=super.orderBuild(id);if(site&&id==='radio'&&site.level===2){this.s.components--;site.component=true;}return site;}
 raise(id,free){super.raise(id,free);if(id==='barn'){for(const c of this.s.cows){c.maxHp=50+this.level('barn')*10;c.hp=c.maxHp;}}if(id==='radio'&&this.level(id)>=2){this.s.radioContact=true;this.notice('Signal received. Hold the farm through the day-10 siege to complete the campaign.',true);}}
 research(id){if(id==='weapons'&&!this.s.discoveredPlans.length){this.notice('Recover weapon blueprints on an expedition first.',true);return false;}return super.research(id);}
 runPeople(dt){const travelers=this.s.people.filter(p=>p.expeditionId);this.s.people=this.s.people.filter(p=>!p.expeditionId);if(this.s.phase==='night'&&!this.powered())for(const p of this.s.people)if(p.traits.brave&&p.job!=='defender'&&!p.order)super.giveOrder(p,{type:'house'});super.runPeople(dt);this.s.people.push(...travelers);this.s.people.sort((a,b)=>a.id-b.id);for(const p of this.s.people){if(p.expeditionId||p.job!=='medic'||p.order)continue;this.medicWork(p,dt);}}
 medicWork(p,dt){const clinic=BUILDINGS.clinic;if(!this.level('clinic')){p.status='Needs a clinic';return;}if(this.s.phase==='night'&&!this.s.lit){p.status='Waiting for safe daylight';return;}if(p.inside){p.inside=false;p.x=HOUSE_DOOR.x;p.y=HOUSE_DOOR.y+4;}const point={x:clinic.x+clinic.w/2,y:clinic.y+clinic.h+14};if(!this.walkTo(p,point,80,dt)){p.status='Heading to the clinic';return;}p.status='Treating the wounded';p.medTimer=(p.medTimer||0)+dt;if(p.medTimer>=1){p.medTimer-=1;const patients=this.s.people.filter(q=>q!==p&&!q.expeditionId&&q.hp<q.maxHp&&dist(q,p)<110);for(const q of patients){this.heal(q,Math.round(this.stat('clinic','healing')*this.bonus(p,'medicine')*10)/10);this.xp(p,'medicine',.5);}}p.hp=Math.min(p.maxHp,p.hp+dt*.5);}
 sendToClinic(ids){if(!this.level('clinic'))return false;const c=BUILDINGS.clinic;return this.command(ids,c.x+c.w/2,c.y+c.h+28);}
 personFight(p){if(p.fireMode==='hold')return false;if(p.fireMode==='conserve'&&p.tool==='gun'&&this.s.ammo<=5&&!this.s.zombies.some(z=>dist(z,p)<85))return false;this.fighter=p;const range=COMBAT.gun.range;if(this.s.weather==='fog')COMBAT.gun.range*=.7;let hit;try{hit=super.personFight(p);}finally{COMBAT.gun.range=range;this.fighter=null;}if(hit){this.xp(p,'combat',1);if(p.fireMode==='conserve')p.cooldown*=1.4;}return hit;}
 damageZombie(z,n,angle,k){if(this.fighter){n*=(1+this.skill(this.fighter,'combat')*.08)*(this.fighter.specialty==='combat'?1.2:1);if(this.fighter.tool==='gun')n*=this.upgradeStat('weapons','damage',1);}return super.damageZombie(z,n,angle,k);}
 hurtPerson(p,n,a){p.morale=Math.max(0,p.morale-2);super.hurtPerson(p,n,a);this.observeHouse();if(p.hp<=0)for(const q of this.s.people)q.morale=Math.max(0,q.morale-10);}
 scoutReturns(p){if(p.expeditionId)return;super.scoutReturns(p);p.gateReturn=1;this.xp(p,'scouting',4);this.s.forecast=true;for(const [id,place] of Object.entries(PLACES))if(!this.s.discoveries[id]){this.s.discoveries[id]=true;this.notice(`${p.name} found the ${place.name.toLowerCase()}. Expeditions are now available.`,true);break;}}
 nightBrief(){const day=this.s.day;if(this.hordeNight(day)){const p=this.nightPlan(day);return (this.siegeNight(day)?'Siege tonight: a Colossus leads ':'Horde tonight: ')+p.count+' zombies'+(day>=3?', with crawlers, spitters and screamers.':'.');}const n=this.nightsToHorde(day);return 'A quiet night: a few stragglers. The next horde comes in '+n+' night'+(n===1?'':'s')+'.';}
 hordeNight(day=this.s.day){return super.hordeNight(day)||(!!this.s.campaign&&day===10);}
 siegeNight(day=this.s.day){return this.hordeNight(day)&&(this.hordeNumber(day)%2===0||(!!this.s.campaign&&day===10));}
  spawnZombie(){super.spawnZombie();const z=this.s.zombies.at(-1);if(this.s.day<2)return;const r=Math.random();if(r<.16){Object.assign(z,{kind:'crawler',radius:8,speed:50,hp:32,maxHp:32});}else if(r<.3){Object.assign(z,{kind:'spitter',speed:30,hp:55,maxHp:55,specialTimer:3});}else if(r<.38&&this.s.day>=3){Object.assign(z,{kind:'screamer',speed:32,hp:45,maxHp:45,specialTimer:10,screamed:false});}}
 changePhase(){const night=this.s.phase==='day';super.changePhase();if(this.s.routines.auto)this.applyRoutine(night?'night':'day');if(night){this.siegeSpawned=false;this.notice(this.nightBrief(),true);}}
 specialZombies(dt){const s=this.s;if(s.phase==='night'&&this.siegeNight(s.day)&&!this.siegeSpawned){this.siegeSpawned=true;super.spawnZombie();const boss=s.zombies.at(-1);Object.assign(boss,{kind:'brute',boss:true,hp:380+s.day*12,maxHp:380+s.day*12,speed:37,radius:22});this.notice('SIEGE: the Colossus is coming. Concentrate your defenders!',true);}
 for(const z of [...s.zombies]){z.specialTimer=(z.specialTimer||0)-dt;if(z.kind==='spitter'&&z.specialTimer<=0){const prey=s.people.filter(p=>!p.inside&&!p.away&&p.hp>0&&dist(p,z)>35&&dist(p,z)<200&&clearPath(z,p,0,this.obstacles)).sort((a,b)=>dist(a,z)-dist(b,z))[0];if(prey){z.specialTimer=3.5;s.shots.push({x1:z.x,y1:z.y-12,x2:prey.x,y2:prey.y-8,life:.25,acid:true});this.hurtPerson(prey,5,Math.atan2(prey.y-z.y,prey.x-z.x));this.burst(prey.x,prey.y,'#b6d87c',7,45);}}
 if(z.kind==='screamer'&&!z.screamed&&dist(z,{x:785,y:240})<450){z.screamed=true;for(let i=0;i<2;i++)super.spawnZombie();this.notice('A screamer called two more walkers. Stop it before it reaches the farm!',true);this.emit('sound',{name:'warning'});}}
 }
 // ===== Expeditions (Update 31): the team leaves after breakfast and the leader goes with them =====
 toolTotal(kind){return super.toolTotal(kind)+(this.s.extraTools?.[kind]||0);}
 roomForSurvivors(){return Math.max(0,MAX_PEOPLE-this.s.people.length);}
 beginExpedition(placeId,ids,kit={}){const s=this.s,place=PLACES[placeId];
  if(!place||!ACTIVE.has(s.mode)||s.phase!=='day')return {error:'Expeditions leave by daylight.'};
  if(s.phaseTime>SITE.departure)return {error:'Teams leave after breakfast. Plan an expedition in the morning.'};
  if(!s.discoveries[placeId])return {error:'Nobody knows the way there yet. Scouts find new places.'};
  if(this.run||s.missions.some(m=>m.stage!=='done'))return {error:'Finish the current expedition before sending another.'};
  const team=s.people.filter(p=>ids.includes(p.id)&&!p.expeditionId&&!p.away&&p.hp>=p.maxHp*.35);
  if(!team.length)return {error:'Select at least one healthy person for the team.'};
  if(s.food<team.length||s.water<team.length)return {error:`Pack ${team.length} food and ${team.length} water first.`};
  const want=Object.fromEntries(team.map(p=>[p.id,kit.weapons&&Object.hasOwn(kit.weapons,p.id)?kit.weapons[p.id]:p.tool]));
  if(Object.values(want).some(t=>t!==null&&t!=='gun'&&t!=='scythe'))return {error:'Choose a shotgun, a scythe or bare hands.'};
  for(const kind of ['gun','scythe']){const need=team.filter(p=>want[p.id]===kind).length,have=this.toolsFree(kind)+team.filter(p=>p.tool===kind).length;if(need>have)return {error:`Only ${have} ${kind==='gun'?'shotgun':'scythe'}${have===1?'':'s'} can be packed.`};}
  const guns=team.filter(p=>want[p.id]==='gun').length,shells=clamp(Math.floor(kit.shells??Math.min(s.ammo,guns*12)),0,s.ammo),meds=clamp(Math.floor(kit.meds??0),0,s.meds);
  s.food-=team.length;s.water-=team.length;s.ammo-=shells;s.meds-=meds;
  const m={id:++this.missionId,place:placeId,members:team.map(p=>p.id),stage:'site',day:s.day,kit:{shells,meds}};
  if(s.expeditionBonus&&(!s.expeditionBonus.place||s.expeditionBonus.place===placeId)){m.bonus={...s.expeditionBonus};s.expeditionBonus=null;}
  s.missions.push(m);
  for(const p of team){p.tool=want[p.id]??null;Object.assign(p,{expeditionId:m.id,away:1e6,inside:false,order:null,task:null,orders:[],patrol:[],status:`Expedition: ${place.name}`});this.logWork(p,'Expedition to the '+place.name.toLowerCase());}
  const visit=s.siteVisits[placeId]||0;s.siteVisits[placeId]=visit+1;
  this.run=new SiteRun(this,m,createSite(placeId,place,{visit,seed:Math.floor(Math.random()*2**31),day:s.day,bonus:m.bonus}),team);
  this.emit('notice',{site:true,text:`${team.map(p=>p.name).join(', ')} set out for the ${place.name.toLowerCase()}. The farm runs itself until dusk.`});
  return m;}
 // The site plays in real time while the farm's day passes in the background, so the day ends with the visit.
 farmRate(){return DAY_LENGTH/SITE.length;}
 advance(dt){if(!this.run){this.update(dt);return;}this.update(dt*this.farmRate());this.stepSite(dt);}
 stepSite(dt){if(!this.run||this.s.mode!=='playing'||!Number.isFinite(dt)||dt<=0)return;this.run.update(dt);if(this.run?.done)this.finishExpedition();}
 // Saving waits until the team is home; the dawn autosave is the morning they left.
 canSave(){return !this.run;}
 loseOnSite(p){const s=this.s;s.people=s.people.filter(q=>q!==p);s.today.deaths.push(p.name);for(const q of s.people)q.morale=Math.max(0,q.morale-10);this.observeHouse?.();}
 finishExpedition(m=this.s.missions.find(x=>x.stage==='site')){const s=this.s,run=this.run;if(!m||m.stage==='done')return null;
  const r=run&&run.mission===m?run.result():{reason:'home',bag:{},foundTools:{},found:[],kills:0,searched:0,meds:0,ammo:0,medsUsed:0,deaths:[],hurt:0};
  this.run=null;const lost=r.reason==='lost',place=PLACES[m.place];
  // The farm's day runs out while the team is still on the road, so they walk in at dusk.
  this.toDusk();
  if(!lost){for(const k of ['scrap','seeds','gas'])s[k]+=r.bag[k]||0;s.components+=r.bag.component||0;s.meds+=r.meds;s.ammo+=r.ammo;for(const k of ['gun','scythe'])s.extraTools[k]+=r.foundTools[k]||0;}
  const team=s.people.filter(p=>p.expeditionId===m.id);
  team.forEach((p,i)=>{Object.assign(p,{expeditionId:null,away:0,inside:false,panic:false,order:null,task:null,orders:[],patrol:[],gateReturn:0,waypoint:null,goal:null,x:GATE_INSIDE.x-((team.length-1)/2-i)*18,y:GATE_INSIDE.y-24});this.xp(p,'scouting',6);p.morale=Math.min(100,p.morale+5);});
  const joined=[];if(!lost)for(const p of r.found){if(s.people.length>=MAX_PEOPLE)break;Object.assign(p,{expeditionId:null,away:0,inside:false,order:null,task:null,waypoint:null,goal:null,x:GATE_INSIDE.x-20+joined.length*18,y:GATE_INSIDE.y-50});s.people.push(p);s.today.arrivals.push(p.name);joined.push(p.name);}
  s.kills+=r.kills;s.today.kills+=r.kills;m.stage='done';
  m.result={reason:r.reason,searched:r.searched,kills:r.kills,joined:joined.length,deaths:r.deaths.length};
  s.today.expedition={place:m.place,searched:r.searched,kills:r.kills,joined:joined.length,deaths:r.deaths.length,lost};
  if(!lost&&!s.discoveredPlans.includes(m.place))s.discoveredPlans.push(m.place);
  s.missionHistory.push({place:m.place,day:s.day,choice:'site',injured:r.hurt>0});s.forecast=true;
  if(team.length)this.homesteadExpedition(m);
  const summary={place:m.place,name:place.name,reason:r.reason,bag:lost?{}:r.bag,tools:lost?{}:r.foundTools,joined,deaths:r.deaths,kills:r.kills,searched:r.searched,medsUsed:r.medsUsed,meds:lost?0:r.meds,ammo:lost?0:r.ammo,team:team.map(p=>p.name)};
  this.notice(lost?`Nobody came back from the ${place.name.toLowerCase()}.`:`The team is back from the ${place.name.toLowerCase()}. It is already dusk.`,true);
  this.emit('sound',{name:lost?'lose':'scout'});this.emit('expedition-home',{summary});
  return summary;}
 // Whatever is left of the day passes at once, so the team gets home at dusk.
 toDusk(){const s=this.s;if(s.phase!=='day'||s.mode!=='playing')return;const hold=this.confirmPhases;this.confirmPhases=true;for(let i=0;i<20000&&s.phase==='day'&&!s.phaseReady&&s.mode==='playing';i++)this.step(Math.min(1/45,Math.max(.001,s.phaseDuration-s.phaseTime)));this.confirmPhases=hold;}
 // Saves from before Update 31 may have a team out on the old road: they walk home with nothing.
 bringTeamsHome(){const s=this.s;for(const m of s.missions){if(m.stage==='done')continue;m.stage='done';const team=s.people.filter(p=>p.expeditionId===m.id);team.forEach((p,i)=>Object.assign(p,{expeditionId:null,away:0,order:null,task:null,x:GATE_INSIDE.x-((team.length-1)/2-i)*18,y:GATE_INSIDE.y-24}));if(team.length)this.notice(`${team.map(p=>p.name).join(', ')} made it home from the road, empty-handed.`,true);}for(const p of s.people)if(p.expeditionId&&!s.missions.some(m=>m.id===p.expeditionId&&m.stage!=='done'))Object.assign(p,{expeditionId:null,away:0,x:GATE_INSIDE.x,y:GATE_INSIDE.y-24});}
 endNight(){if(this.s.campaign){if(this.s.day>=10&&this.s.radioContact){this.writeJournal(false);this.s.campaignWon=true;this.end(true);return;}const old=this.s.endless;this.s.endless=true;super.endNight();this.s.endless=old;}else super.endNight();}
 morning(){this.beginHomesteadBreakfast();const expeditionPeople=this.s.people.filter(p=>p.expeditionId),old=this.s.people.map(p=>({id:p.id,morale:p.morale}));super.morning();for(const p of expeditionPeople){if(this.s.people.includes(p)){p.inside=false;p.away=1e6;}}for(const p of this.s.people){if(p.expeditionId||p.away>0)continue;const fed=this.s.breakfast.fed.includes(p.name);p.morale=clamp((old.find(x=>x.id===p.id)?.morale??70)+(fed?5:-12)+this.level('clinic')*2+this.level('barn'),0,100);if(fed)p.hp=Math.min(p.maxHp,p.hp+this.level('clinic')*4);if(p.traits.extraMeal&&this.s.food>0)this.s.food--;p.orders=[];p.patrol=[];}const hay=Math.min(this.s.hay,this.s.cows.length);this.s.hay-=hay;for(const c of this.s.cows.slice(0,hay))c.hp=Math.min(c.maxHp,c.hp+20);this.s.weather=['clear','rain','dry','fog'][Math.floor(Math.random()*4)];this.finishHomesteadBreakfast();this.houseMorning();this.prepareFarmEvent(this.s.day+1);this.emit('autosave');}
 dawn(){super.dawn();this.homesteadDawn();this.siegeSpawned=false;if(this.s.routines.auto)this.applyRoutine('day');this.prepareFarmEvent();this.emit('autosave');}
 alerts(){const s=this.s,out=[];if(s.sites.length&&!s.people.some(p=>p.job==='builder'||p.order?.type==='build'))out.push('Construction is waiting: assign a builder.');const meals=s.people.length;if(s.food<meals||s.water<meals)out.push(`Breakfast needs ${meals} food + ${meals} water. Stores: ${s.food} food, ${s.water} water.`);if(s.ammo<=5)out.push(`Only ${s.ammo} shells left. Restock or craft ammunition.`);if(s.phase==='night'&&!this.powered())out.push('The farm is dark. Fuel the generator.');if(s.house.project&&!s.people.some(p=>p.job==='builder'))out.push('House improvements need a builder.');if(s.farmHp<this.maxFarmHealth()*.35)out.push('Farmhouse critically damaged. Send builders or buy repairs.');if(s.people.some(p=>p.hp<p.maxHp*.4))out.push('Someone is badly wounded. Heal them or send them to the clinic.');return out;}
 tutorialSteps(){const s=this.s;return [{text:'Assign someone the Farmer job',done:s.people.some(p=>p.job==='farmer')},{text:'Assign a Builder and order a building',done:s.people.some(p=>p.job==='builder')&&(s.sites.some(p=>p.kind==='building')||Object.entries(s.buildings).some(([k,n])=>n>(BUILDINGS[k].starts||0)))},{text:'Assign a Defender to fetch a shotgun',done:s.people.some(p=>p.job==='defender'&&p.tool==='gun')},{text:'Stock food and water for all four people',done:s.food>=s.people.length&&s.water>=s.people.length},{text:'Place and build your first fence',done:s.fences.some(f=>!f.perimeter)}];}
 update(dt){if(this.s.mode!=='playing'||(this.confirmPhases&&this.s.phaseReady)||!Number.isFinite(dt)||dt<=0)return;super.update(dt);}
 step(dt){if(this.confirmPhases&&this.s.phaseReady)return;super.step(dt);if(this.s.mode!=='playing'||(this.confirmPhases&&this.s.phaseReady))return;this.stepHouse(dt);this.specialZombies(dt);this.updateScoutGate();this.rainTimer+=dt;if(this.rainTimer>=15){this.rainTimer-=15;if(this.s.weather==='rain')this.storeWater(this.stat('waterTank','rain')*2);else if(this.s.weather==='dry'&&this.s.water>this.s.people.length){this.s.water--;}}}
 serialize(){const state={format:'last-harvest-colony',version:2,savedAt:new Date().toISOString(),s:this.s,counters:Object.fromEntries(COUNTERS.map(k=>[k,this[k]])),missionId:this.missionId,rainTimer:this.rainTimer,siegeSpawned:this.siegeSpawned};return JSON.stringify(state,(key,value)=>{if(['goal','waypoint'].includes(key))return null;if(key==='plot'&&value&&typeof value==='object')return {$plot:this.s.plots.indexOf(value)};if(key==='fix'&&value&&typeof value==='object')return {$gadget:value.id};return value;});}
 restore(raw){let saved;try{saved=JSON.parse(raw);}catch{return {error:'This save is unreadable.'};}const s=saved?.s;if(saved?.format==='last-harvest-colony'&&saved.version===1&&s?.buildings&&Array.isArray(s.plots)){s.buildings.field=BUILDINGS.field.levels.length;s.plots=s.plots.slice(0,PLOT_SPOTS.length).map((p,i)=>({...p,...PLOT_SPOTS[i]}));s.phaseReady=false;saved.version=2;}if(!validState(s)||!validFarmSystems(s)||!validExpeditions(s)||!validHouse(s)||!validHomestead(s)||!validPerimeter(s)||saved?.format!=='last-harvest-colony'||saved.version!==2||!s||!Array.isArray(s.people)||!Array.isArray(s.plots)||!Array.isArray(s.sites)||!Array.isArray(s.zombies)||!Array.isArray(s.missions)||!Number.isFinite(s.day)||s.day<1||!Number.isFinite(s.farmHp)||!['playing','paused','house','journal','wheel','prompt'].includes(s.mode)||s.people.some(p=>!Number.isFinite(p.id)||!Number.isFinite(p.hp)||!Number.isFinite(p.x)||!JOBS[p.job])||['scrap','food','water','ammo','seeds','gas','meds','hay','components'].some(k=>!Number.isFinite(s[k])||s[k]<0))return {error:'This save is invalid or from an unsupported version.'};const restoreRefs=obj=>{if(!obj||typeof obj!=='object')return;for(const [k,v] of Object.entries(obj)){if(v&&typeof v==='object'&&'$plot' in v)obj[k]=s.plots[v.$plot]||null;else if(v&&typeof v==='object'&&'$gadget' in v)obj[k]=[...s.fences,...s.traps].find(g=>g.id===v.$gadget)||null;else restoreRefs(v);}};restoreRefs(s);for(const p of s.people){if(p.order&&'plot' in p.order&&!p.order.plot)p.order=null;if(p.task&&'plot' in p.task&&!p.task.plot)p.task=null;p.orders=p.orders.filter(o=>o&&(!('plot' in o)||o.plot));}ensureFarmSystems(s);ensureHomestead(s);ensureHouse(s);this.s=s;for(const key of COUNTERS)this[key]=saved.counters?.[key]??0;this.missionId=saved.missionId||0;this.rainTimer=saved.rainTimer||0;this.siegeSpawned=!!saved.siegeSpawned;this.worker=null;this.fighter=null;for(const p of s.people){this.enrich(p);p.routeTimer=0;p.goal=null;p.waypoint=null;}for(const z of s.zombies){z.routeTimer=0;z.waypoint=null;}ensureExpeditions(s);this.run=null;this.bringTeamsHome();ensurePerimeter(this);this.updateObstacles();if(s.mode==='playing')s.mode='paused';return {ok:true,day:s.day};}
}

Object.assign(ColonyEngine.prototype,farmMethods,homesteadMethods,perimeterMethods,houseMethods);
