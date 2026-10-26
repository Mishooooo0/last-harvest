import assert from 'node:assert/strict';
import {ColonyEngine} from './dist/colony.js';
import {APPROACHES,CONTRACTS,planError} from './dist/expedition-rules.js';
import {SITE} from './dist/expedition.js';
let passed=0;const test=(name,fn)=>{fn();passed++;console.log('PASS '+name);};
function fresh(kit={}){const g=new ColonyEngine();g.confirmPhases=true;g.start(true);Object.assign(g.s,{food:20,water:20,ammo:50,meds:5});g.beginExpedition('farm',[1,2],kit);g.run.zombies=[];g.run.spawnTimer=1e9;return g;}
function crate(r,loot){const u=r.units[0];return {id:1000+r.site.containers.length,kind:'crate',x:u.x-20,y:u.y-30,w:40,h:30,loot,searched:false};}
const tick=(r,n)=>{for(let i=0;i<n*45;i++)r.step(1/45);};
test('invalid plans and nonfinite supplies are rejected before any resource changes',()=>{
 for(const kit of [{approach:'bogus'},{contract:'bogus'},{shells:NaN},{shells:Infinity},{meds:-1}]){const g=new ColonyEngine();g.start(true);const before=JSON.parse(g.serialize()).s;assert.ok(g.beginExpedition('farm',[1],kit).error);assert.deepEqual(JSON.parse(g.serialize()).s,before);}
 assert.equal(planError({}),null);
});
test('approaches change cargo, search rate and noise independently',()=>{
 const a=fresh(),q=fresh({approach:'quiet'}),s=fresh({approach:'salvage'});
 assert.equal(a.run.capacity,44);assert.equal(s.run.capacity,60);
 const fake={p:{}};a.skill=q.skill=s.skill=()=>0;
 assert.ok(q.run.searchRate(fake)<a.run.searchRate(fake));assert.ok(s.run.searchRate(fake)>a.run.searchRate(fake));
 for(const g of [a,q,s])g.run.noise(g.run.units[0]);assert.ok(q.run.alert<a.run.alert&&s.run.alert>a.run.alert);
 const old=s.run.alert;tick(s.run,1);assert.ok(s.run.alert<old);
});
test('cargo is bounded and overflow can be recovered once after freeing space',()=>{
 const g=fresh(),r=g.run,c=crate(r,[{type:'scrap',n:100},{type:'gas',n:2}]);r.site.containers.push(c);r.collect(c,r.units[0]);
 assert.equal(r.cargoWeight(),r.capacity);assert.equal(c.leftovers[0].n,100-r.capacity);
 const searched=r.searched;r.collect(c,r.units[0]);assert.equal(r.searched,searched);
 assert.ok(r.dropCargo('scrap'));assert.equal(r.recoverCargo(),1);assert.equal(r.recoverCargo(),0);assert.equal(r.cargoWeight(),r.capacity);
 assert.equal(r.dropCargo('bogus'),false);
 r.units.forEach(u=>{u.x=0;u.y=0;});r.dropCargo('scrap');assert.equal(r.recoverCargo(),0,'Distant overflow cannot be teleported');
});
test('extraction requires the whole living squad to rally and hold for five seconds',()=>{
 const g=fresh(),r=g.run;r.obstacles=[];r.headHome();assert.ok(r.units.every(u=>u.order.engage===false));
 r.units.forEach(u=>{Object.assign(u,r.site.truck);u.order=null;});tick(r,3);assert.equal(r.done,false);
 r.units[1].x=0;tick(r,.1);assert.equal(r.extraction,0);
 Object.assign(r.units[1],r.site.truck);tick(r,5.2);assert.equal(r.reason,'home');assert.equal(r.done,true);
 const time=r.time;tick(r,1);assert.equal(r.time,time);
});
test('sunset retreat loses a quarter of bulk cargo but preserves medical supplies',()=>{
 const g=fresh({meds:2}),r=g.run;r.bag.scrap=10;r.bag.gas=3;r.units[0].x=20;r.time=SITE.length-.01;r.step(.02);
 assert.equal(r.reason,'sunset');assert.equal(r.bag.scrap,7);assert.equal(r.bag.gas,2);assert.equal(r.meds,2);assert.deepEqual(r.cargoLost,{scrap:3,gas:1});
 r.end('sunset');assert.equal(r.bag.scrap,7,'Retreat penalty applies once');
});
test('a squad lost at the deadline does not get classified as a safe retreat',()=>{
 const g=fresh(),r=g.run;r.units.forEach(u=>u.p.hp=0);r.time=SITE.length;r.step(.1);assert.equal(r.reason,'lost');
});
test('each contract measures its own objective and pays once on return',()=>{
 for(const contract of Object.keys(CONTRACTS)){const g=fresh({contract}),r=g.run;
 assert.equal(r.objective().complete,false);
 if(contract==='scavenging')r.searched=6;else if(contract==='survey')r.site.buildings.forEach(b=>b.checked=true);else r.kills=8;
 assert.equal(r.objective().complete,true);const before=g.s.scrap;r.end('home');const summary=g.finishExpedition();assert.equal(summary.reward,CONTRACTS[contract].reward);assert.equal(g.s.scrap,before+summary.reward);assert.equal(g.finishExpedition(),null);
 const h=new ColonyEngine();assert.ok(h.restore(g.serialize()).ok);assert.equal(h.s.missions.at(-1).result.reward,summary.reward);
 }
});
test('lost or incomplete expeditions earn no contract reward',()=>{
 for(const lost of [false,true]){const g=fresh(),r=g.run;if(lost){r.searched=6;r.end('lost');}else r.end('home');assert.equal(g.finishExpedition().reward,0);}
});
test('invalid time steps are ignored and alerts remain bounded',()=>{
 const r=fresh().run;for(const dt of [NaN,Infinity,-1,0]){r.update(dt);r.step(dt);}assert.equal(r.time,0);
 for(let i=0;i<100;i++)r.noise(r.units[0]);assert.equal(r.alert,100);assert.equal(r.alertLabel(),'Swarming');
});
console.log(`${passed} expedition overhaul test groups passed.`);
