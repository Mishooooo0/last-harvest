import assert from 'node:assert/strict';
import {ColonyEngine,PLACES} from './dist/colony.js';
import {SITE,createSite} from './dist/expedition.js';
import {DAY_LENGTH,MAX_PEOPLE,clearPath,nextWaypoint} from './dist/engine.js';
import {GATE_INSIDE} from './dist/perimeter.js';
let passed=0;
const test=(name,fn)=>{fn();passed++;console.log('PASS '+name);};
const fresh=()=>{const g=new ColonyEngine();g.confirmPhases=true;g.start(true);Object.assign(g.s,{scrap:500,food:20,water:20,ammo:40,meds:3});return g;};
const play=(g,seconds)=>{for(let i=0;i<Math.ceil(seconds*45);i++)g.advance(1/45);};
// Clears the dead off the site so a test controls exactly what happens there.
const quiet=g=>{g.run.zombies=[];g.run.spawnTimer=1e9;};
// Puts a container right where a unit stands, filled with the given loot.
const crateAt=(g,u,loot)=>{const c=g.run.site.containers.find(c=>!c.inside);Object.assign(c,{loot,searched:false,progress:0,x:u.x-c.w/2,y:u.y-c.h-16});return c;};
const zombieAt=(g,x,y,extra={})=>{const z=g.run.makeZombie({kind:'walker',x,y,hp:300,maxHp:300,radius:12,speed:0,state:'wander',home:{x,y},...extra});g.run.zombies.push(z);return z;};

test('expeditions leave after breakfast with a packed kit, one team at a time',()=>{
 const g=fresh(),[a,b,c]=g.s.people;
 const m=g.beginExpedition('farm',[a.id,b.id],{weapons:{[a.id]:'gun',[b.id]:'scythe'},shells:10,meds:1});
 assert.ok(m.id);assert.equal(m.stage,'site');
 assert.deepEqual([g.s.food,g.s.water,g.s.ammo,g.s.meds],[18,18,30,2],'Rations, shells and meds leave the farm');
 assert.equal(a.tool,'gun');assert.equal(b.tool,'scythe');assert.ok(a.expeditionId&&b.expeditionId&&!c.expeditionId);
 assert.equal(g.run.ammo,10);assert.equal(g.run.meds,1);assert.equal(g.canSave(),false);
 assert.ok(g.beginExpedition('farm',[c.id]).error,'One team at a time');
 const late=fresh();late.s.phaseTime=30;assert.ok(late.beginExpedition('farm',[1]).error,'Teams leave after breakfast');
 assert.ok(fresh().beginExpedition('town',[1]).error,'A place nobody has found yet');
 assert.ok(fresh().beginExpedition('farm',[1,2,3],{weapons:{1:'gun',2:'gun',3:'gun'}}).error,'Only the free shotguns can be packed');
});

test('the farm runs its day in the background, and the team gets home at dusk',()=>{
 const g=fresh(),p=g.s.people[0],m=g.beginExpedition('farm',[p.id]);quiet(g);
 play(g,30);
 assert.ok(Math.abs(g.s.phaseTime-30*DAY_LENGTH/SITE.length)<.5,'The farm day passes at the site rate');
 assert.ok(g.run.time>29);
 g.run.headHome();const u=g.run.units[0];Object.assign(u,{x:g.run.site.truck.x,y:g.run.site.truck.y-30});play(g,.1);
 assert.equal(g.run,null);assert.equal(m.stage,'done');
 assert.equal(g.s.phase,'day');assert.equal(g.s.phaseReady,true,'Home at dusk, waiting for the night');
 assert.equal(p.expeditionId,null);assert.equal(p.away,0);assert.ok(Math.abs(p.x-GATE_INSIDE.x)<60&&Math.abs(p.y-GATE_INSIDE.y)<60,'They come in through the south gate');
 assert.ok(g.canSave());
});

test('the five-minute limit sends the team home with what they carry',()=>{
 const g=fresh();g.beginExpedition('farm',[1]);quiet(g);g.run.bag.scrap=7;g.run.time=SITE.length-.5;const scrap=g.s.scrap;
 play(g,1);
 assert.equal(g.run,null);assert.equal(g.s.scrap,scrap+7);assert.equal(g.s.phaseReady,true);
});

test('searching brings loot home, and a found shotgun arms the finder and joins the stock',()=>{
 const g=fresh(),p=g.s.people[0];g.beginExpedition('farm',[p.id],{weapons:{[p.id]:null}});quiet(g);const u=g.run.units[0];
 const c=crateAt(g,u,[{type:'scrap',n:6},{type:'seeds',n:3},{type:'gas',n:2},{type:'gun',n:1}]);
 const guns=g.toolTotal('gun'),scrap=g.s.scrap,seeds=g.s.seeds,gas=g.s.gas,ammo=g.s.ammo;
 assert.equal(g.run.command([p.id],c.x+c.w/2,c.y+c.h/2).type,'search');
 play(g,SITE.searchTime+.6);
 assert.equal(c.searched,true);assert.equal(p.tool,'gun','The finder takes the shotgun');assert.equal(g.run.ammo,SITE.foundShells);
 const summary=g.finishExpedition();
 assert.equal(g.s.scrap,scrap+6);assert.equal(g.s.seeds,seeds+3);assert.equal(g.s.gas,gas+2);assert.equal(g.s.ammo,ammo+SITE.foundShells);
 assert.equal(g.toolTotal('gun'),guns+1,'The shotgun joins the warehouse');assert.equal(summary.searched,1);
 assert.ok(g.s.discoveredPlans.includes('farm'));assert.equal(g.s.missionHistory.length,1);assert.ok(g.s.house.keepsakes>=1,'A keepsake for the house');
});

test('gunshots draw the dead within earshot, and site kills count for the day',()=>{
 const g=fresh(),p=g.s.people[0];g.beginExpedition('farm',[p.id],{weapons:{[p.id]:'gun'},shells:10});quiet(g);const r=g.run,u=r.units[0];
 const target=zombieAt(g,u.x+150,u.y,{hp:20,maxHp:20}),near=zombieAt(g,u.x-250,u.y-150),far=zombieAt(g,u.x+600,u.y-60);
 play(g,1.2);
 assert.ok(target.hp<=0);assert.equal(r.kills,1);assert.ok(r.ammo<10);
 assert.equal(near.state,'hunt','The shot was heard');assert.equal(far.state,'wander','Too far to hear it');
 const kills=g.s.today.kills;g.finishExpedition();assert.equal(g.s.today.kills,kills+1);assert.equal(g.s.today.expedition.kills,1);
});

test('meds heal on the site, and a medic patches up teammates',()=>{
 const g=fresh(),[a,b]=g.s.people;g.setJob(b.id,'medic');g.beginExpedition('farm',[a.id,b.id],{meds:1});quiet(g);
 a.hp=20;const used=g.run.useMeds(a.id);assert.ok(used.ok);assert.equal(a.hp,20+SITE.medsHeal);assert.equal(g.run.meds,0);
 assert.equal(g.run.useMeds(a.id).ok,false,'No meds left');
 const before=a.hp;play(g,4);assert.ok(a.hp>before,'The medic heals a nearby teammate');
 g.finishExpedition();assert.equal(g.s.meds,2,'Used meds stay used');
});

test('survivors hiding in a building join the farm, but only if there is a bed',()=>{
 const g=fresh();g.beginExpedition('farm',[1]);quiet(g);const r=g.run,b=r.site.buildings[0];b.hider={name:'Ruth'};
 Object.assign(r.units[0],{x:b.x+b.w/2,y:b.y+b.h/2});play(g,.1);
 assert.equal(b.checked,true,'Walking in checks the building');assert.equal(r.found.length,1);assert.equal(r.units.length,2,'They join the team on the site');
 const count=g.s.people.length;g.finishExpedition();assert.equal(g.s.people.length,count+1);assert.ok(g.s.today.arrivals.includes('Ruth'));
 const full=fresh();while(full.s.people.length<MAX_PEOPLE)full.s.people.push(full.makePerson('Guest '+full.s.people.length,700,500));
 full.beginExpedition('farm',[1]);quiet(full);const r2=full.run,b2=r2.site.buildings[0];b2.hider={name:'Ruth'};
 Object.assign(r2.units[0],{x:b2.x+b2.w/2,y:b2.y+b2.h/2});play(full,.1);
 assert.equal(r2.found.length,0);assert.equal(b2.hider.left,true);
});

test('a death on the site is recorded, and a lost team brings nothing home',()=>{
 const g=fresh(),[a,b,home]=g.s.people;g.beginExpedition('farm',[a.id,b.id]);quiet(g);const morale=home.morale;
 g.run.hurtUnit(g.run.units[0],999,0);
 assert.ok(!g.s.people.includes(a));assert.ok(g.s.today.deaths.includes(a.name));assert.ok(home.morale<morale,'The farm grieves');
 g.run.bag.scrap=50;const scrap=g.s.scrap;g.run.hurtUnit(g.run.units[1],999,0);play(g,.1);
 assert.equal(g.run,null);assert.equal(g.s.scrap,scrap,'Nothing comes back from a lost team');
});

test('saving waits until the team is home, and old saves bring a team on the road home',()=>{
 const g=fresh();g.beginExpedition('farm',[1]);assert.equal(g.canSave(),false);
 const old=fresh(),raw=JSON.parse(old.serialize());
 raw.s.missions.push({id:1,place:'farm',members:[1],stage:'travel',remaining:20,risk:.1,roll:.5,origin:{x:785,y:250}});Object.assign(raw.s.people[0],{expeditionId:1,away:1e6});
 const h=new ColonyEngine();assert.ok(h.restore(JSON.stringify(raw)).ok);
 assert.equal(h.s.missions[0].stage,'done');assert.equal(h.s.people[0].expeditionId,null);assert.equal(h.s.people[0].away,0);
 const bad=JSON.parse(old.serialize());bad.s.extraTools={gun:-1,scythe:0};assert.ok(new ColonyEngine().restore(JSON.stringify(bad)).error);
});

test('every place makes a walkable site with buildings to check and loot to find',()=>{
 const reachable=(site,from,to)=>{let at=from;for(let hop=0;hop<60;hop++){const next=nextWaypoint(at,to,10,site.obstacles);if(!clearPath(at,next,10,site.obstacles))return false;if(next===to)return true;at=next;}return false;};
 for(const [id,place] of Object.entries(PLACES))for(const seed of [1,2,3]){
  const site=createSite(id,place,{seed});
  assert.ok(site.buildings.length>=2&&site.containers.length>=4&&site.zombies.length>0,id+' has places, loot and the dead');
  assert.ok(site.containers.some(c=>c.loot.length));
  const start={x:site.truck.x,y:site.truck.y-90};
  for(const b of site.buildings){assert.ok(reachable(site,start,b.doorAt),`${id}/${seed}: the ${b.name} door can be reached`);assert.ok(reachable(site,b.doorAt,{x:b.x+b.w/2,y:b.y+b.h/2}),`${id}/${seed}: the ${b.name} can be entered`);}
  assert.deepEqual(createSite(id,place,{seed}),site,'The same visit makes the same site');
 }
 const scrap=site=>site.containers.reduce((t,c)=>t+c.loot.reduce((n,i)=>n+(i.type==='scrap'?i.n:0),0),0);
 const haul=visit=>Array.from({length:20},(_,i)=>scrap(createSite('town',PLACES.town,{seed:i+1,visit}))).reduce((a,b)=>a+b,0);
 assert.ok(haul(4)<haul(0)*.7,'Repeat visits find less');
});

console.log(`${passed} expedition test groups passed.`);
