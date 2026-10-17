import assert from 'node:assert/strict';
import { ColonyEngine } from './dist/colony.js';
import { HOMESTEAD, validHomestead } from './dist/homestead.js';
import { DAWN_SUPPLIES } from './dist/engine.js';

// These tests count food and water exactly, so the dawn water delivery is switched off.
DAWN_SUPPLIES.water = 0;

let count = 0;
const test = (name, run) => { run(); count++; console.log('PASS ' + name); };
const fresh = () => { const game = new ColonyEngine(); game.start(true); return game; };
const herd = () => {
  const game = fresh();
  game.s.buildings.pasture = 1;
  game.s.buildings.barn = 1;
  game.syncAnimals();
  game.s.food = 10;
  game.s.hay = 12;
  return game;
};

test('old saves gain an empty homestead without changing their existing resources', () => {
  const g = fresh(), raw = JSON.parse(g.serialize());
  delete raw.s.homestead;
  const h = new ColonyEngine();
  assert.ok(h.restore(JSON.stringify(raw)).ok);
  assert.equal(h.s.food, raw.s.food);
  assert.equal(h.s.water, raw.s.water);
  assert.equal(h.s.scrap, raw.s.scrap);
  assert.equal(h.s.homestead.meals, 0);
  assert.equal(h.s.homestead.pantry, 0);
  assert.equal(h.s.homestead.lastDawnDay, h.s.day);
  assert.ok(validHomestead(h.s));
});

test('malformed homestead saves fail before replacing the live state', () => {
  const source = fresh(), target = fresh();
  for (const change of [
    h => h.meals = -1,
    h => h.pantry = 25,
    h => h.meals = .5,
    h => h.lastDawnDay = 900,
    h => h.bonds = [{ a: 1, b: 1, score: 2, day: 1 }],
    h => h.bonds = [{ a: 1, b: 2, score: 2, day: 1 }, { a: 1, b: 2, score: 2, day: 1 }],
    h => h.breeding = { parents: [1, 2], startedDay: 1, dueDay: 2 },
    h => h.lastMealIds = [1, 1],
  ]) {
    const raw = JSON.parse(source.serialize());
    change(raw.s.homestead);
    const before = target.s;
    assert.ok(target.restore(JSON.stringify(raw)).error);
    assert.equal(target.s, before);
  }
  const raw = JSON.parse(source.serialize());
  raw.s.homestead = null;
  assert.ok(target.restore(JSON.stringify(raw)).error);
});

test('kitchen orders charge exact costs and reject full shelves or missing resources atomically', () => {
  const g = fresh();
  g.s.food = 2; g.s.water = 1;
  assert.ok(g.cookMeal().ok);
  assert.equal(g.s.food, 0); assert.equal(g.s.water, 0); assert.equal(g.s.homestead.meals, 2);
  assert.equal(g.cookMeal().ok, false);
  g.s.food = 10; g.s.water = 10; g.s.homestead.meals = HOMESTEAD.mealCap;
  assert.equal(g.cookMeal().ok, false);
  assert.equal(g.s.food, 10); assert.equal(g.s.water, 10);
  g.s.mode = 'title'; g.s.homestead.meals = 0;
  assert.equal(g.cookMeal().ok, false);
  assert.equal(g.s.food, 10);
  g.s.mode = 'house';
  assert.ok(g.cookMeal().ok, 'The kitchen works at breakfast in the farmhouse');
  g.s.mode = 'paused';
  assert.ok(g.cookMeal().ok);
});

test('prepared breakfast portions replace food, still require drinking water and add capped morale', () => {
  const g = fresh();
  g.s.people = g.s.people.slice(0, 2);
  for (const p of g.s.people) p.morale = 50;
  g.s.food = 2; g.s.water = 3;
  g.cookMeal();
  g.morning();
  assert.equal(g.s.breakfast.fed.length, 2);
  assert.equal(g.s.breakfast.prepared, 2);
  assert.equal(g.s.food, 0);
  assert.equal(g.s.water, 0);
  assert.equal(g.s.homestead.meals, 0);
  assert.equal(g.s.homestead.totalMeals, 2);
  assert.ok(g.s.people.every(p => p.morale === 58));
  const bonds = JSON.stringify(g.s.homestead.bonds);
  const reloaded = new ColonyEngine();
  assert.ok(reloaded.restore(g.serialize()).ok);
  reloaded.finishHomesteadBreakfast();
  assert.equal(JSON.stringify(reloaded.s.homestead.bonds), bonds);
  assert.equal(reloaded.s.homestead.totalMeals, 2);
});

test('a breakfast without drinking water keeps prepared food for a later morning', () => {
  const g = fresh();
  g.s.people = g.s.people.slice(0, 2);
  g.s.food = 2; g.s.water = 1;
  g.cookMeal();
  g.morning();
  assert.equal(g.s.breakfast.fed.length, 0);
  assert.equal(g.s.homestead.meals, 2);
  assert.equal(g.s.homestead.totalMeals, 0);
  g.dawn(); g.s.water = 2;
  g.morning();
  assert.equal(g.s.homestead.meals, 0);
  assert.equal(g.s.breakfast.fed.length, 2);
});

test('preservation uses separate capped storage and opening rations never overfills ordinary food', () => {
  const g = fresh();
  g.s.food = 6; g.s.scrap = 1;
  assert.ok(g.preserveFood().ok);
  assert.equal(g.s.food, 3); assert.equal(g.s.scrap, 0); assert.equal(g.s.homestead.pantry, 3);
  assert.equal(g.preserveFood().ok, false);
  g.s.food = g.s.foodCap - 2;
  assert.equal(g.openPantry().ok, false);
  assert.equal(g.s.homestead.pantry, 3);
  g.s.food = g.s.foodCap - 3;
  assert.ok(g.openPantry().ok);
  assert.equal(g.s.food, g.s.foodCap); assert.equal(g.s.homestead.pantry, 0);
  assert.equal(g.openPantry().ok, false);
  g.s.homestead.pantry = HOMESTEAD.pantryCap; g.s.scrap = 4;
  const before = { food: g.s.food, scrap: g.s.scrap };
  assert.equal(g.preserveFood().ok, false);
  assert.deepEqual({ food: g.s.food, scrap: g.s.scrap }, before);
});

test('the barn reserves one breeding place beyond normal auto-filled cattle stalls', () => {
  const g = herd(), status = g.homesteadStatus();
  assert.equal(status.normalCowCapacity, g.stat('pasture', 'cows'));
  assert.equal(status.nurseryCapacity, 1);
  assert.equal(status.cowCapacity, status.normalCowCapacity + 1);
  assert.equal(g.s.cows.length, status.normalCowCapacity);
  assert.equal(status.actions.breed.available, true);
  assert.ok(g.breedCows().ok);
  assert.equal(g.s.food, 8); assert.equal(g.s.hay, 8);
  assert.equal(g.breedCows().ok, false);
  assert.equal(g.s.food, 8); assert.equal(g.s.hay, 8);
});

test('breeding completes after two dawns and survives a reload without duplicate births', () => {
  const g = herd(); g.breedCows();
  const cows = g.s.cows.length;
  g.dawn();
  assert.equal(g.s.cows.length, cows);
  assert.equal(g.homesteadStatus().breeding.daysLeft, 1);
  const loaded = new ColonyEngine(); assert.ok(loaded.restore(g.serialize()).ok);
  loaded.dawn();
  assert.equal(loaded.s.cows.length, cows + 1);
  assert.equal(loaded.s.cows.at(-1).maxHp, 60);
  assert.equal(loaded.s.homestead.breeding, null);
  assert.equal(loaded.s.homestead.births, 1);
  loaded.homesteadDawn(); loaded.homesteadDawn();
  const again = new ColonyEngine(); assert.ok(again.restore(loaded.serialize()).ok);
  again.homesteadDawn(); again.dawn();
  assert.equal(again.s.cows.length, cows + 1);
  assert.equal(again.s.homestead.births, 1);
  assert.equal(again.breedCows().ok, false);
});

test('breeding rejects unhealthy parents, missing hay and full capacity without spending', () => {
  const g = herd();
  for (const c of g.s.cows) c.hp = c.maxHp * .5;
  assert.equal(g.breedCows().ok, false);
  assert.equal(g.s.food, 10); assert.equal(g.s.hay, 12);
  for (const c of g.s.cows) c.hp = c.maxHp;
  g.s.hay = 3;
  assert.equal(g.breedCows().ok, false);
  assert.equal(g.s.food, 10); assert.equal(g.s.hay, 3);
  g.s.hay = 12; g.addCow();
  assert.equal(g.breedCows().ok, false);
  assert.equal(g.s.food, 10); assert.equal(g.s.hay, 12);
});

test('a full herd delays an ordered birth and a lost parent cancels it', () => {
  const g = herd(); g.breedCows(); g.addCow();
  const size = g.s.cows.length;
  g.dawn(); g.dawn();
  assert.equal(g.s.cows.length, size);
  assert.ok(g.s.homestead.breeding);
  g.s.cows.pop(); g.dawn();
  assert.equal(g.s.cows.length, size);
  assert.equal(g.s.homestead.births, 1);
  const h = herd(); h.breedCows();
  const parent = h.s.homestead.breeding.parents[0];
  h.s.cows = h.s.cows.filter(c => c.id !== parent);
  const survivors = h.s.cows.length;
  h.dawn(); h.dawn();
  assert.equal(h.s.cows.length, survivors);
  assert.equal(h.s.homestead.breeding, null);
  assert.equal(h.s.homestead.births, 0);
});

test('shared meals grow only home survivors bonds once per morning and morale stays bounded', () => {
  const g = fresh(); g.s.food = 10; g.s.water = 10;
  const away = g.s.people[3]; away.expeditionId = 999; away.away = 1e6;
  g.morning();
  assert.equal(g.s.homestead.bonds.length, 3);
  assert.ok(g.s.homestead.bonds.every(b => b.a !== away.id && b.b !== away.id && b.score === 1));
  g.s.food = 10; g.s.water = 10; g.morning();
  assert.ok(g.s.homestead.bonds.every(b => b.score === 1));
  g.growHomesteadBonds(g.s.people.map(p => p.id), 100);
  assert.ok(g.s.homestead.bonds.every(b => b.score === 10));
  assert.equal(g.homesteadBondMorale(1, [2, 3, 4]), 2);
  assert.equal(g.homesteadBondMorale(1, []), 0);
  g.s.people.pop(); g.growHomesteadBonds([1, 2], 1);
  assert.ok(g.s.homestead.bonds.every(b => b.a !== away.id && b.b !== away.id));
});

test('completed team expeditions grow trust once and retain that guard in saves', () => {
  const g = fresh(); g.s.food = 10; g.s.water = 10;
  const m = g.beginExpedition('farm', [1, 2]);
  m.choice = 'return'; m.roll = 1;
  g.finishExpedition(m);
  assert.equal(g.s.homestead.bonds.length, 1);
  assert.equal(g.s.homestead.bonds[0].score, 2);
  assert.equal(m.homesteadBonded, true);
  g.homesteadExpedition(m);
  assert.equal(g.s.homestead.bonds[0].score, 2);
  const h = new ColonyEngine(); assert.ok(h.restore(g.serialize()).ok);
  h.homesteadExpedition(h.s.missions[0]);
  assert.equal(h.s.homestead.bonds[0].score, 2);
});

console.log(`${count} homestead test groups passed.`);
