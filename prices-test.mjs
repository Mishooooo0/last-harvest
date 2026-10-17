import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ColonyEngine } from './dist/colony.js';
import { BUILDINGS, UPGRADES, GADGETS, FENCE, SHOP } from './dist/engine.js';
import { applyPrices, currentPrices, jsonErrorWhere } from './dist/prices.js';

let count = 0;
const test = (name, run) => { run(); count++; console.log('PASS ' + name); };
const fileText = readFileSync(new URL('./dist/prices.json', import.meta.url), 'utf8');
const builtIn = JSON.stringify(currentPrices());
const restore = () => applyPrices(JSON.parse(builtIn));
const prices = (changes) => ({ ...JSON.parse(builtIn), ...changes });
const countPrices = data => Object.values(data).reduce((n, group) => n + Object.values(group).reduce((m, v) => m + (typeof v === 'object' ? Object.keys(v).length : 1), 0), 0);

// This one checks the hand-edited file, so a typo shows up when the tests run.
test('prices.json is valid and every price in it is used', () => {
  let data;
  try { data = JSON.parse(fileText); } catch (error) { assert.fail(`prices.json has a typing mistake at ${jsonErrorWhere(fileText, error) || 'an unknown place'}: ${error.message}`); }
  const report = applyPrices(data);
  assert.deepEqual(report.warnings, [], 'prices.json problems:\n' + report.warnings.join('\n'));
  const listed = Object.entries(data).filter(([k]) => !k.startsWith('_')).reduce((n, [, group]) => n + Object.entries(group).filter(([k]) => !k.startsWith('_')).reduce((m, [, v]) => m + (typeof v === 'object' ? Object.keys(v).length : 1), 0), 0);
  assert.equal(report.applied, listed, 'Every listed price was applied');
  restore();
});

test('the file covers every price the game charges', () => {
  const all = JSON.parse(builtIn);
  assert.equal(applyPrices(all).applied, countPrices(all));
  for (const id of Object.keys(BUILDINGS)) assert.ok(all.buildings[id], `${id} is in the file layout`);
  for (const id of Object.keys(UPGRADES)) assert.ok(all.upgrades[id], `${id} is in the file layout`);
  for (const id of Object.keys(GADGETS)) assert.ok(id in all.defenses, `${id} is in the file layout`);
  assert.equal(all.buildings.field['level 1'], undefined, 'A level the farm starts with has no price');
  assert.equal(all.buildings.field['level 2'], BUILDINGS.field.levels[1].cost);
  restore();
});

test('changed prices reach the shop, the builders and the defenses', () => {
  const report = applyPrices(prices({
    shop: { ammo: 3 },
    buildings: { silo: { 'level 1': 7 } },
    upgrades: { crops: { 'level 1': 11 } },
    defenses: { fence: 4, fenceRepair: 2 },
  }));
  assert.deepEqual(report.warnings, []);
  assert.equal(SHOP.ammo, 3);
  assert.equal(BUILDINGS.silo.levels[0].cost, 7);
  assert.equal(UPGRADES.crops.levels[0].cost, 11);
  assert.equal(GADGETS.fence.cost, 4);
  assert.equal(FENCE.cost, 4, 'The fence copy follows too');
  assert.equal(FENCE.repairCost, 2);
  const g = new ColonyEngine(() => {});
  g.start(true);
  g.s.scrap = 100;
  g.buy('ammo');
  assert.equal(g.s.scrap, 97, 'Shells cost the new price');
  assert.ok(g.orderBuild('silo'));
  assert.equal(g.s.scrap, 90, 'The silo costs the new price');
  assert.ok(g.placeGadget('fence', 1000, 600));
  assert.equal(g.s.scrap, 86, 'A fence costs the new price');
  restore();
});

test('mistakes keep the built-in price and say what is wrong', () => {
  const before = { ammo: SHOP.ammo, silo: BUILDINGS.silo.levels[0].cost, field: BUILDINGS.field.levels[0].cost, wire: GADGETS.wire.cost };
  const report = applyPrices({
    shop: { ammo: -5, sheels: 4 },
    buildings: { silo: { 'level 1': '12' }, sillo: { 'level 1': 3 }, field: { 'level 1': 9, 'level 9': 9 } },
    defenses: { wire: 2.5 },
    stuff: {},
  });
  assert.equal(report.applied, 0);
  assert.equal(report.warnings.length, 8, report.warnings.join('\n'));
  assert.ok(report.warnings.some(w => w.includes('"sheels" does not exist')));
  assert.ok(report.warnings.some(w => w.includes('"sillo" does not exist')));
  assert.ok(report.warnings.some(w => w.includes('"level 1" is not a level you can buy (use level 2 to 5)')));
  assert.ok(report.warnings.some(w => w.includes('Unknown group "stuff"')));
  assert.deepEqual({ ammo: SHOP.ammo, silo: BUILDINGS.silo.levels[0].cost, field: BUILDINGS.field.levels[0].cost, wire: GADGETS.wire.cost }, before);
  assert.ok(applyPrices([]).warnings.length, 'A list instead of an object is rejected');
  assert.equal(applyPrices({ _readme: ['notes are ignored'], shop: { _what: 'ignored too' } }).warnings.length, 0);
});

test('a typing mistake in the file is located by line and column', () => {
  const broken = '{\n  "shop": {\n    "ammo": 10\n    "seeds": 6\n  }\n}';
  let error;
  try { JSON.parse(broken); } catch (e) { error = e; }
  assert.ok(error);
  assert.equal(jsonErrorWhere(broken, error), 'line 4, column 5');
});

console.log(`${count} prices test groups passed.`);
