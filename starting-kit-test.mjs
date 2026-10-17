import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ColonyEngine} from './dist/colony.js';
import {STARTING_PACK} from './dist/engine.js';
import {KIT,currentKit,applyStartingKit,readStartingKit} from './dist/starting-kit.js';
let passed=0;
const test=(name,fn)=>{fn();passed++;console.log('PASS '+name);};
const builtIn={...STARTING_PACK},reset=()=>Object.assign(STARTING_PACK,builtIn);
const file=readFileSync(new URL('./dist/starting-kit.json',import.meta.url),'utf8');
const farm=()=>{const g=new ColonyEngine();g.start(false);return g;};

test('starting-kit.json is valid and lists every part of the kit',()=>{
 const data=JSON.parse(file);assert.deepEqual(applyStartingKit(data).warnings,[]);reset();
 assert.deepEqual(Object.keys(data).filter(k=>!k.startsWith('_')).sort(),Object.keys(KIT).sort());
});
test('the file holds the built-in kit, so a farm starts the same until it is edited',()=>{
 const data=JSON.parse(file);for(const [key,spec] of Object.entries(KIT))assert.equal(data[key],builtIn[spec.field],key);
});
test('a changed kit reaches every new farm, including extra tools',()=>{
 applyStartingKit({scrap:120,shells:40,seeds:12,food:9,water:15,meds:3,gasoline:5,ripeCrops:4,extraShotguns:2,extraScythes:1});
 const g=farm(),s=g.s;
 assert.deepEqual([s.scrap,s.ammo,s.seeds,s.food,s.water,s.meds,s.gas],[120,40,12,9,15,3,5]);
 assert.equal(s.plots.filter(p=>p.growth>=1).length,4);assert.equal(g.toolTotal('gun'),4);assert.equal(g.toolTotal('scythe'),3);
 assert.equal(currentKit().extraShotguns,2);
 reset();assert.equal(farm().toolTotal('gun'),2,'Back to the built-in kit');
});
test('mistakes keep the built-in amount, and too much is capped with a note',()=>{
 const r=applyStartingKit({scrap:'lots',seeds:-4,food:40,water:99,ripeCrops:9,bananas:3});
 assert.equal(STARTING_PACK.scrap,builtIn.scrap);assert.equal(STARTING_PACK.seeds,builtIn.seeds);
 assert.equal(STARTING_PACK.food,10);assert.equal(STARTING_PACK.water,15);assert.equal(STARTING_PACK.ripe,4);
 assert.equal(r.warnings.length,6);assert.ok(r.warnings.some(w=>w.includes('pantry')));assert.ok(r.warnings.some(w=>w.includes('"bananas"')));
 reset();
});
test('a typing mistake is located and the built-in kit stays',()=>{
 const r=readStartingKit('{\n  "scrap": 80\n  "shells": 30\n}');
 assert.equal(r.applied,0);assert.match(r.warnings[0],/line 3/);assert.equal(STARTING_PACK.scrap,builtIn.scrap);
});
console.log(`${passed} starting-kit test groups passed.`);
