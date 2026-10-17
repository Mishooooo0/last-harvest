import assert from 'node:assert/strict';
import {ColonyEngine,PLACES} from './dist/colony.js';
import {CHEAT_TOGGLES,CHEAT_ACTIONS} from './dist/cheats.js';
import {FARMHOUSE,MAX_PEOPLE} from './dist/engine.js';
let passed=0;
const test=(name,fn)=>{fn();passed++;console.log('PASS '+name);};
const fresh=()=>{const g=new ColonyEngine();g.start(true);g.s.phaseDuration=1e6;return g;};
const tick=(g,n)=>{for(let i=0;i<Math.ceil(n*60);i++)g.update(1/60);};
const zombie=(g,x,y,extra={})=>{g.spawnZombie();const z=g.s.zombies.at(-1);Object.assign(z,{kind:'walker',x,y,hp:300,maxHp:300,speed:0,radius:12,...extra});return z;};

test('cheats are off by default and change nothing',()=>{
 const g=fresh(),p=g.s.people[0];assert.equal(g.cheatsOn(),false);
 g.hurtPerson(p,10,0);assert.equal(p.hp,p.maxHp-10);assert.equal(g.houseDamage(5),5);assert.equal(g.s.cheated,undefined);
});
test('Nobody gets hurt: no damage on the farm or on an expedition',()=>{
 const g=fresh(),p=g.s.people[0];g.setCheat('unhurt',true);g.hurtPerson(p,50,0);assert.equal(p.hp,p.maxHp);
 Object.assign(g.s,{food:10,water:10});g.beginExpedition('farm',[2]);const u=g.run.units[0];g.run.hurtUnit(u,50,0);assert.equal(u.p.hp,u.p.maxHp);
 assert.equal(g.s.cheated,true,'Switching a cheat on marks the farm');
});
test('Unbreakable farmhouse: the dead cannot damage it',()=>{
 const g=fresh();g.setCheat('house',true);assert.equal(g.houseDamage(5),0);
 for(const p of g.s.people)Object.assign(p,{inside:true});zombie(g,FARMHOUSE.x+FARMHOUSE.w/2,FARMHOUSE.y+FARMHOUSE.h+20);tick(g,4);assert.equal(g.s.farmHp,g.maxFarmHealth());
});
test('Endless shells: guns keep firing and the count stays the same',()=>{
 const g=fresh(),p=g.s.people[0];Object.assign(p,{x:1000,y:650,tool:'gun'});g.s.ammo=0;g.setCheat('ammo',true);const z=zombie(g,1100,650);
 tick(g,2);assert.ok(z.hp<300,'The shotgun fired');assert.equal(g.s.ammo,0,'No shells were used');
 Object.assign(g.s,{food:10,water:10,phaseTime:0});const h=fresh();h.setCheat('ammo',true);Object.assign(h.s,{food:10,water:10});h.beginExpedition('farm',[1],{weapons:{1:'gun'},shells:0});
 const r=h.run,u=r.units[0];r.zombies=[];r.spawnTimer=1e9;const dead=r.makeZombie({kind:'walker',x:u.x+120,y:u.y,hp:300,maxHp:300,radius:12,speed:0,state:'wander',home:{x:u.x+120,y:u.y}});r.zombies.push(dead);
 for(let i=0;i<90;i++)r.step(1/45);assert.ok(dead.hp<300,'Shotguns fire on the site too');assert.equal(r.ammo,0);
});
test('Instant building: orders and defenses are finished at once',()=>{
 const g=fresh();g.s.scrap=500;g.setCheat('build',true);
 g.orderBuild('well');assert.equal(g.level('well'),1);assert.equal(g.s.sites.length,0);
 const fences=g.s.fences.length;g.placeGadget('fence',1200,600);assert.equal(g.s.fences.length,fences+1);
});
test('one-off cheats do their thing and mark the farm',()=>{
 const g=fresh(),s=g.s,before={scrap:s.scrap,ammo:s.ammo,seeds:s.seeds,meds:s.meds,gas:s.gas};
 for(const id of ['scrap','shells','seeds','meds','gas','pantry'])assert.ok(g.useCheat(id).ok);
 assert.deepEqual([s.scrap,s.ammo,s.seeds,s.meds,s.gas],[before.scrap+500,before.ammo+100,before.seeds+30,before.meds+10,before.gas+10]);
 assert.equal(s.food,s.foodCap);assert.equal(s.water,s.waterCap);
 s.people[0].hp=5;s.farmHp=20;g.useCheat('heal');g.useCheat('repair');assert.equal(s.people[0].hp,s.people[0].maxHp);assert.equal(s.farmHp,g.maxFarmHealth());
 zombie(g,900,600);s.wave={total:30,spawned:4,horde:true};g.useCheat('clear');assert.equal(s.zombies.length,0);assert.equal(s.wave.spawned,30);
 g.s.scrap+=100;g.orderBuild('silo');g.useCheat('finish');assert.equal(g.level('silo'),1);assert.equal(s.sites.length,0);
 const count=s.people.length;assert.ok(g.useCheat('survivor').ok);assert.equal(s.people.length,count+1);
 while(s.people.length<MAX_PEOPLE)g.useCheat('survivor');assert.match(g.useCheat('survivor').text,/full/);
 g.useCheat('places');assert.ok(Object.keys(PLACES).every(id=>s.discoveries[id]));
 assert.equal(s.cheated,true);
 assert.equal(new ColonyEngine().useCheat('scrap').ok,false,'Not on the title screen');
});
test('codes work in any case, and always-on codes switch on and off',()=>{
 const g=fresh(),scrap=g.s.scrap;
 assert.ok(g.cheatCode('motherlode').ok);assert.equal(g.s.scrap,scrap+500);
 const on=g.cheatCode('Iron skin');assert.equal(on.on,true);assert.equal(g.cheats.unhurt,true);
 assert.equal(g.cheatCode('IRONSKIN').on,false);assert.equal(g.cheats.unhurt,false);
 assert.equal(g.cheatCode('xyzzy').ok,false);
 const codes=[...Object.values(CHEAT_TOGGLES),...Object.values(CHEAT_ACTIONS)].map(c=>c.code);assert.equal(new Set(codes).size,codes.length,'Every code is different');
});
test('a cheated farm keeps its mark through a save',()=>{
 const g=fresh();g.useCheat('seeds');const h=new ColonyEngine();assert.ok(h.restore(g.serialize()).ok);assert.equal(h.s.cheated,true);
});
console.log(`${passed} cheat test groups passed.`);
