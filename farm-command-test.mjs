import assert from 'node:assert/strict';
import {ColonyEngine} from './dist/colony.js';
import {commandHtml} from './dist/farm-command-ui.js';
const fresh=()=>{const g=new ColonyEngine();g.start(true);g.s.scrap=500;return g;};
let count=0;const test=(name,fn)=>{fn();count++;console.log('PASS '+name);};
test('old saves gain disabled command settings and invalid plans are rejected without mutation',()=>{
 const g=fresh(),raw=JSON.parse(g.serialize());delete raw.s.command;raw.s.people.forEach(p=>{delete p.workPlan;delete p.guardPost;});const h=fresh();assert.ok(h.restore(JSON.stringify(raw)).ok);assert.equal(h.s.command.queue,false);assert.equal(h.s.people[0].workPlan.enabled,false);
 for(const mutate of [s=>s.command={queue:'bad'},s=>s.people[0].guardPost='void',s=>s.people[0].workPlan={enabled:true,base:'rest',jobs:['fake']},s=>s.people='bad']){const bad=JSON.parse(g.serialize());mutate(bad.s);const before=h.s;assert.ok(h.restore(JSON.stringify(bad)).error);assert.equal(h.s,before);}
});
test('ranked jobs choose available work and direct orders override automation',()=>{
 const g=fresh(),p=g.s.people[0];g.setWorkPlan(p.id,['builder','rest']);g.runPeople(.1);assert.equal(p.job,'rest');g.orderBuild('well');g.commandClock=0;g.runPeople(.1);assert.equal(p.job,'builder');
 g.giveOrder(p,{type:'move',x:700,y:500});g.s.sites=[];g.commandClock=0;g.runPeople(.1);assert.equal(p.job,'builder');assert.equal(p.order.type,'move');assert.match(g.workExplanation(p),/direct order/);
});
test('away survivors retain jobs and disabling auto restores the original job',()=>{
 const g=fresh(),p=g.s.people[0],original=p.job;g.setWorkPlan(p.id,['rest']);g.runPeople(.1);assert.equal(p.job,'rest');g.setWorkPlan(p.id,['rest'],false);assert.equal(p.job,original);
 g.setWorkPlan(p.id,['rest']);p.expeditionId=10;g.commandClock=0;g.runPeople(.1);assert.equal(p.job,original);assert.match(g.workExplanation(p),/expedition/);
});
test('emergency assignments only use enabled eligible priorities',()=>{
 const g=fresh(),p=g.s.people[0];g.s.command.emergencies=true;g.setWorkPlan(p.id,['rest','builder']);g.s.farmHp=20;g.runPeople(.1);assert.equal(p.job,'builder');
 g.s.phase='night';g.setWorkPlan(p.id,['rest','defender']);g.commandClock=0;g.runPeople(.1);assert.equal(p.job,'defender');
});
test('queue movement preserves resources and priority tiers',()=>{
 const g=fresh(),p=g.s.people[0],a=g.orderBuild('well'),b=g.orderBuild('silo');const scrap=g.s.scrap;
 assert.ok(g.moveConstruction(b.id,-1));assert.equal(g.s.scrap,scrap);assert.equal(g.nextSite(p).id,b.id);a.priority=1;assert.equal(g.nextSite(p).id,a.id);assert.equal(g.moveConstruction(b.id,-1),false);
 const report=g.constructionReport();assert.equal(report.length,2);assert.ok(report.every(r=>r.paid>0&&r.remaining===r.paid));
});
test('repair-first mode actually repairs the farmhouse before active projects',()=>{
 const g=fresh(),p=g.s.people[0];g.orderBuild('well');g.s.command.repairsFirst=true;g.s.farmHp=50;g.walkTo=()=>true;
 for(let i=0;i<20;i++)g.buildWork(p,.1);assert.ok(g.s.farmHp>50);assert.equal(g.s.sites[0].progress,0);assert.equal(p.task.fix,'house');
});
test('assigned guard posts and farmhouse fallback change movement destinations',()=>{
 const g=fresh(),p=g.s.people[0];g.setJob(p.id,'defender');let at;g.walkTo=(_p,to)=>{at={...to};return false;};
 assert.ok(g.setGuardPost(p.id,'north'));g.defendWork(p,.1);assert.equal(at.y,-100);g.s.command.fallback=true;g.defendWork(p,.1);assert.equal(at.y,300);g.s.command.fallback=false;g.defendWork(p,.1);assert.equal(at.y,-100);assert.equal(g.setGuardPost(p.id,'bad'),false);
});
test('new perimeter gaps produce a single transition alert',()=>{
 const g=fresh(),events=[];g.notice=text=>events.push(text);g.s.phase='night';g.s.command.queue=false;g.runPeople(.1);const before=g.breachCount();g.s.fences.shift();g.commandClock=0;g.runPeople(.1);assert.equal(g.breachCount(),before+1);assert.equal(events.filter(t=>t.includes('PERIMETER BREACH')).length,1);g.commandClock=0;g.runPeople(.1);assert.equal(events.filter(t=>t.includes('PERIMETER BREACH')).length,1);
});
test('settings and priorities survive save restore and command panel exposes all controls',()=>{
 const g=fresh();g.setWorkPlan(1,['builder','defender','rest']);g.setGuardPost(1,'south');g.s.command.repairsFirst=true;const h=fresh();assert.ok(h.restore(g.serialize()).ok);assert.deepEqual(h.s.people[0].workPlan.jobs,['builder','defender','rest']);assert.equal(h.s.people[0].guardPost,'south');assert.equal(h.s.command.repairsFirst,true);const html=commandHtml(h);for(const key of ['data-command-policy','data-work-rank','data-guard-post','data-command-fallback','Night readiness'])assert.ok(html.includes(key));
});
console.log(`${count} farm command test groups passed.`);
