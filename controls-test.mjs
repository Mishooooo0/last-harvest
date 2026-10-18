import assert from 'node:assert/strict';
import {ColonyEngine,PLACES} from './dist/colony.js';
import {SiteRun,createSite} from './dist/expedition.js';
import {GADGETS} from './dist/engine.js';
import {BOUNDARY_RESERVE} from './dist/perimeter.js';
let passed=0;const test=(name,fn)=>{fn();passed++;console.log('PASS '+name);};
const fresh=()=>{const g=new ColonyEngine();g.start(true);g.confirmPhases=true;g.s.phaseDuration=1e6;g.s.scrap=1000;g.s.food=30;g.s.water=30;for(const p of g.s.people)g.setJob(p.id,'rest');return g;};
const play=(g,seconds)=>{for(let i=0;i<Math.ceil(seconds*45);i++)g.update(1/45);};
const builder=g=>{const p=g.s.people[0];g.setJob(p.id,'builder');Object.assign(p,{x:24,y:680,inside:false});return p;};
const section=g=>g.s.fences.find(f=>f.perimeter==='south:0');
const run=(n=1)=>{const g=fresh();g.s.phaseDuration=120;g.beginExpedition('farm',g.s.people.slice(0,n).map(p=>p.id));g.run.zombies=[];g.run.spawnTimer=1e9;return g.run;};
const tick=(r,seconds)=>{for(let i=0;i<Math.ceil(seconds*45);i++)r.update(1/45);};
const crates=r=>{r.obstacles=[];const u=r.units[0];return r.site.containers=[{id:900,kind:'crate',x:u.x-20,y:u.y-46,w:40,h:30,inside:null,progress:0,searched:false,loot:[{type:'scrap',n:5}]},{id:901,kind:'crate',x:u.x+45,y:u.y-46,w:40,h:30,inside:null,progress:0,searched:false,loot:[{type:'scrap',n:7}]}];};
const click=(r,c,queued=false,replace=false)=>r.command(r.alive.map(u=>u.id),c.x+c.w/2,c.y+c.h/2,queued,replace);

test('builders automatically replace a destroyed boundary and keep its identity through a save',()=>{
 const g=fresh(),p=builder(g),gone=section(g),scrap=g.s.scrap;g.damageGadget(gone,1000);play(g,8);
 assert(section(g));assert.equal(section(g).hp,GADGETS.fence.hp);assert.equal(g.s.scrap,scrap-GADGETS.fence.cost);assert.equal(g.s.sites.filter(s=>s.perimeter===gone.perimeter).length,0);
 const loaded=new ColonyEngine();assert(loaded.restore(g.serialize()).ok);assert(section(loaded));assert.equal(p.job,'builder');
});
test('builders mend damaged boundary sections automatically without repeatedly charging scrap',()=>{
 const g=fresh();builder(g);section(g).hp=10;const scrap=g.s.scrap;play(g,8);assert.equal(section(g).hp,section(g).maxHp);assert.equal(g.s.scrap,scrap);
});
test('automatic rebuilds wait for safety, scrap and a free builder, and resume at night',()=>{
 const g=fresh(),p=builder(g),gone=section(g);g.damageGadget(gone,1000);g.s.scrap=0;play(g,1);assert.equal(g.s.sites.length,0);
 g.s.scrap=30;g.giveOrder(p,{type:'move',x:p.x,y:p.y});play(g,1);assert.equal(g.s.sites.length,0);g.clearOrders([p.id]);
 g.spawnZombie();const z=g.s.zombies[0];Object.assign(z,{x:24,y:740,speed:0,hp:1e6});play(g,1);assert.equal(g.s.sites.length,0);assert.equal(g.s.scrap,30);
 g.s.zombies=[];g.s.phase='night';g.s.wave={total:1,spawned:0,horde:false};g.spawnTimer=1e9;play(g,8);assert(section(g));assert.equal(g.s.scrap,28);
});
test('automatic rebuilds keep 20 scrap back for a farmhouse repair (Update 38)',()=>{
 const g=fresh();builder(g);const gone=section(g);g.damageGadget(gone,1000);g.s.scrap=BOUNDARY_RESERVE+GADGETS.fence.cost-1;play(g,1);
 assert.equal(g.s.sites.length,0);assert.equal(g.s.scrap,BOUNDARY_RESERVE+GADGETS.fence.cost-1);
 g.s.scrap=BOUNDARY_RESERVE+GADGETS.fence.cost;play(g,8);assert(section(g));assert.equal(g.s.scrap,BOUNDARY_RESERVE);
});
test('a new threat interrupts automatic construction without losing its paid blueprint',()=>{
 const g=fresh(),p=builder(g),gone=section(g);g.damageGadget(gone,1000);play(g,.1);const site=g.s.sites.find(s=>s.perimeter===gone.perimeter);assert(site);const scrap=g.s.scrap;
 g.spawnZombie();Object.assign(g.s.zombies[0],{x:24,y:740,speed:0,hp:1e6});g.maintainBoundary(.6);assert.equal(p.order,null);assert(g.s.sites.includes(site));assert.equal(g.nextSite(p),null);
 g.s.zombies=[];g.maintainBoundary(.6);assert.equal(p.order.siteId,site.id);assert.equal(g.s.scrap,scrap);play(g,8);assert(section(g));
});
test('multiple builders share rebuild work without duplicate blueprints or duplicate payment',()=>{
 const g=fresh();builder(g);const other=g.s.people[1];g.setJob(other.id,'builder');Object.assign(other,{x:50,y:680});const gone=section(g),scrap=g.s.scrap;g.damageGadget(gone,1000);g.maintainBoundary(1);
 assert.equal(g.s.sites.filter(s=>s.perimeter===gone.perimeter).length,1);assert.equal(g.s.scrap,scrap-2);assert.equal(g.s.people.filter(p=>p.order?.autoBoundary&&p.order.type==='build').length,1);
 const loaded=new ColonyEngine();assert(loaded.restore(g.serialize()).ok);loaded.resume();play(loaded,8);assert(section(loaded));
});
test('queuing a farm order preserves the repair already in progress and its walking state',()=>{
 const g=fresh(),p=builder(g),f=section(g);f.hp=10;g.giveOrder(p,{type:'repair',gadgetId:f.id});p.timer=.4;
 const waypoint={x:24,y:739},goal={x:24,y:739};p.waypoint=waypoint;p.goal=goal;p.waiting=true;
 assert(g.command([p.id],1100,600,true));assert.equal(p.order.type,'repair');assert.equal(p.timer,.4);assert.equal(p.waypoint,waypoint);assert.equal(p.goal,goal);assert.equal(p.waiting,true);assert.equal(p.orders.length,1);
 Object.assign(p,{x:24,y:739});g.followOrder(p,.5);assert.equal(f.hp,f.maxHp);assert.equal(p.order.type,'move');
});
for(const kind of ['fence','wire'])test(kind+' rows snap to blueprints, extend existing rows, and charge once',()=>{
 const g=fresh(),a={x:1000,y:600},b={x:1096,y:600},preview=g.defenseLine(kind,a,b);assert(preview.valid);assert.equal(preview.points.length,3);const scrap=g.s.scrap;
 assert(g.placeDefenseLine(kind,a,b));assert.equal(g.s.scrap,scrap-3*GADGETS[kind].cost);assert.equal(g.s.sites.length,3);
 const end=preview.points.at(-1),ghost=g.gadgetGhost(kind,end.x+43,end.y+7,false);assert.equal(ghost.rect.x,end.rect.x+end.rect.w);assert.equal(ghost.rect.y,end.rect.y);
 assert(g.placeDefenseLine(kind,{x:end.x,y:end.y},{x:end.x+96,y:end.y}));assert.equal(g.s.sites.length,5);assert.equal(g.s.scrap,scrap-5*GADGETS[kind].cost);
 assert.equal(g.placeDefenseLine(kind,a,b),false);assert.equal(g.s.scrap,scrap-5*GADGETS[kind].cost);
});
test('vertical wire rows join end to end and invalid or unaffordable batches place nothing',()=>{
 const g=fresh(),a={x:1000,y:500},b={x:1000,y:650},line=g.defenseLine('wire',a,b);assert(line.valid);assert(line.points.every(p=>p.vertical));
 g.s.scrap=line.cost-1;assert.equal(g.placeDefenseLine('wire',a,b),false);assert.equal(g.s.sites.length,0);g.s.scrap=100;assert(g.placeDefenseLine('wire',a,b));
 for(let i=1;i<g.s.sites.length;i++)assert.equal(g.s.sites[i-1].rect.y+g.s.sites[i-1].rect.h,g.s.sites[i].rect.y);
 const count=g.s.sites.length,scrap=g.s.scrap;assert.equal(g.placeDefenseLine('fence',{x:700,y:200},{x:850,y:200}),false);assert.equal(g.s.sites.length,count);assert.equal(g.s.scrap,scrap);
});
test('repeated search clicks queue, finish in order, preserve progress and never duplicate loot',()=>{
 const r=run(),[a,b]=crates(r),u=r.units[0];click(r,a);tick(r,.6);const progress=a.progress;assert(progress>0);click(r,b);click(r,b);
 assert.equal(u.order.containerId,a.id);assert.equal(u.orders.length,1);assert.equal(a.progress,progress);tick(r,8);assert(a.searched&&b.searched);assert.equal(r.searched,2);assert.equal(r.bag.scrap,12);
});
test('Shift queues movement and attacks, Alt replaces, Hold and Head home clear queues',()=>{
 const r=run(),[a,b]=crates(r),u=r.units[0];click(r,a);click(r,b);r.command([u.id],u.x+100,u.y,true);assert.equal(u.orders.length,2);
 r.command([u.id],u.x+150,u.y,false,true);assert.equal(u.order.type,'move');assert.equal(u.orders.length,0);click(r,a,false,true);r.command([u.id],u.x+20,u.y,true);r.holdAll([u.id]);assert.equal(u.orders.length,0);
 click(r,a);click(r,b);r.headHome();assert.equal(u.orders.length,0);assert.equal(r.command([u.id],a.x,a.y),null);
});
test('queued movement completes and already searched queued chests are skipped',()=>{
 const r=run(),[a,b]=crates(r),u=r.units[0];r.command([u.id],u.x+12,u.y);click(r,a,true);click(r,b,true);a.searched=true;tick(r,8);assert(b.searched);assert.equal(r.bag.scrap,7);
});
test('a queued attack runs after searching and advances when its target falls',()=>{
 const r=run(),[a,b]=crates(r),u=r.units[0],z=r.makeZombie({kind:'walker',x:u.x+300,y:u.y,hp:100,maxHp:100,radius:12,speed:0,state:'wander',home:{x:u.x+300,y:u.y}});r.zombies.push(z);
 click(r,a);r.command([u.id],z.x,z.y-12,true);click(r,b,true);assert.equal(u.orders[0].type,'attack');
 tick(r,3);assert(a.searched);assert.equal(u.order.type,'attack');z.hp=0;tick(r,.1);assert.equal(u.order.containerId,b.id);tick(r,10);assert(b.searched);
});
test('a four-person building entry splits cover and searching, then clears every chest through real doors',()=>{
 const r=run(4),b=r.site.buildings[0],ids=r.alive.map(u=>u.id);r.units[0].p.tool='gun';r.ammo=10;
 r.units.forEach((u,i)=>Object.assign(u,{x:b.doorAt.x,y:b.doorAt.y}));
 assert.equal(r.command(ids,b.x+b.w/2,b.y+b.h/2).type,'sweep');assert.equal(r.alive.filter(u=>u.order.role==='guard').length,2);assert.equal(r.units[0].order.role,'guard');
 tick(r,50);assert(b.checked);assert(r.site.containers.filter(c=>c.inside===b.id).every(c=>c.searched));assert(r.searched>=2);
});
test('generated rooms keep search standing points clear of walls across door orientations',()=>{
 const doors=new Set();
 for(const seed of [1,2,3,5,8,13,21,34]){
  const site=createSite('farm',PLACES.farm,{seed});
  for(const b of site.buildings){
   const g=fresh(),r=new SiteRun(g,{kit:{shells:10,meds:0}},structuredClone(site),g.s.people);r.zombies=[];r.spawnTimer=1e9;
   r.units.forEach(u=>Object.assign(u,{x:b.doorAt.x,y:b.doorAt.y}));r.command(r.units.map(u=>u.id),b.x+b.w/2,b.y+b.h/2);tick(r,50);
   assert(r.site.containers.filter(c=>c.inside===b.id).every(c=>c.searched),`seed ${seed}, ${b.door} doorway`);doors.add(b.door);
  }
 }
 assert.equal(doors.size,4);
});
test('odd teams give the extra person to searching, and the sole survivor takes over after a searcher dies',()=>{
 const r=run(3),[a]=crates(r);click(r,a);assert.equal(r.alive.filter(u=>u.order.role==='guard').length,1);assert.equal(r.alive.filter(u=>u.order.role==='search').length,2);
 for(const u of r.alive.filter(u=>u.order.role==='search'))u.p.hp=0;tick(r,4);assert(a.searched);
});
test('a lone explorer searches, interrupts for a nearby enemy, then resumes the same chest',()=>{
 const r=run(),[a]=crates(r),u=r.units[0];click(r,a);assert.equal(u.order.role,'search');tick(r,.2);const before=a.progress;
 const z=r.makeZombie({kind:'walker',x:u.x+40,y:u.y,hp:1e6,maxHp:1e6,radius:12,speed:0,state:'hunt',home:{x:u.x+40,y:u.y}});r.zombies.push(z);tick(r,.2);assert.equal(a.progress,before);assert.match(u.status,/Defending/);
 r.zombies=[];tick(r,5);assert(a.searched);
});
console.log(`${passed} controls test groups passed.`);
