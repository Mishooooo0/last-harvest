import assert from 'node:assert/strict';
import {ColonyEngine} from './dist/colony.js';
import {INTERIOR_LAYOUT as l,INTERIOR_BEDS as beds,interiorOccupants} from './dist/interior-art.js';
let passed=0;const test=(name,run)=>{run();passed++;console.log('PASS '+name);};
test('eight beds fit upstairs and leave a continuous stairwell',()=>{
 assert.equal(beds.length,8);for(const b of beds){assert.ok(b.x>l.left&&b.x+b.w<l.right);assert.ok(b.y>=l.upperFloor&&b.y+b.h<l.landing);assert.ok(b.x+b.w<l.stairLeft||b.x>l.stairRight);}for(let i=0;i<beds.length;i++)for(let j=i+1;j<beds.length;j++){const a=beds[i],b=beds[j];assert.ok(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y);}
});
test('breakfast, recovery and waiting use the existing state without moving or changing survivors',()=>{
 const game=new ColonyEngine();game.start(true);const s=game.s,[a,b,c,d]=s.people;s.breakfast={fed:[a.name,b.name],wounded:[b.name],hungry:[c.name]};const before=JSON.stringify(s),out=interiorOccupants(s);assert.deepEqual(out.dining,[a]);assert.deepEqual(out.resting,[b]);assert.deepEqual(out.waiting,[c,d]);assert.ok(out.hungry.has(c.name));assert.equal(JSON.stringify(s),before);
});
test('absent travelers do not appear at home and every available survivor appears exactly once',()=>{
 const game=new ColonyEngine();game.start(true);const s=game.s;s.people[0].expeditionId=1;s.people[1].away=40;s.breakfast={fed:s.people.map(p=>p.name),hungry:[],wounded:[s.people[2].name]};const rooms=interiorOccupants(s),ids=[...rooms.dining,...rooms.waiting,...rooms.resting].map(p=>p.id);assert.deepEqual(ids.sort((a,b)=>a-b),[3,4]);assert.equal(new Set(ids).size,ids.length);
});
test('older farms with missing meal or homestead display fields can still choose interior occupants',()=>{const state={people:[{id:1,name:'Hank',away:0}],breakfast:null};assert.deepEqual(interiorOccupants(state).waiting,state.people);assert.equal(interiorOccupants(state).resting.length,0);});
console.log(`${passed} interior test groups passed.`);
