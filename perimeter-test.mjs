import assert from 'node:assert/strict';
import { ColonyEngine } from './dist/colony.js';
import { GADGETS, FENCE } from './dist/engine.js';
import { FARM_BOUNDARY, SCOUT_GATE, GATE_INSIDE, GATE_OUTSIDE, perimeterLayout, expeditionRoute, routePosition } from './dist/perimeter.js';

let count = 0;
const test = (name, run) => { run(); count++; console.log('PASS ' + name); };
const fresh = () => { const game = new ColonyEngine(); game.start(true); game.s.phaseDuration = 1e6; return game; };
const tick = (game, seconds) => { for (let i = 0; i < Math.ceil(seconds * 60); i++) game.update(1 / 60); };
const ring = game => game.s.fences.filter(f => f.perimeter);
const inside = p => p.x > FARM_BOUNDARY.left && p.x < FARM_BOUNDARY.right && p.y > FARM_BOUNDARY.top && p.y < FARM_BOUNDARY.bottom;

test('a new farm is enclosed by a full boundary with one scouting gate, outside the 60-defense limit', () => {
  const g = fresh(), layout = perimeterLayout();
  assert.equal(ring(g).length, layout.length);
  assert.deepEqual(ring(g).map(f => f.perimeter).sort(), layout.map(f => f.perimeter).sort());
  const gates = ring(g).filter(f => f.kind === 'gate');
  assert.equal(gates.length, 1, 'One scouting gate');
  assert.ok(Math.abs(gates[0].x + gates[0].w / 2 - SCOUT_GATE.x) < 1 && gates[0].open === false, 'Closed, in the south fence');
  assert.ok(ring(g).every(f => f.hp === f.maxHp), 'Every section starts whole');
  assert.equal(g.defenseCount(), 0, 'The boundary does not use custom defense slots');
  g.s.scrap = 1000;
  assert.ok(g.placeGadget('fence', 1000, 600), 'Custom defenses can still be placed inside');
  assert.equal(g.defenseCount(), 1);
  assert.ok(FENCE.max >= 60);
});

test('zombies arrive from outside the boundary', () => {
  const g = fresh();
  for (let i = 0; i < 60; i++) g.spawnZombie();
  assert.ok(g.s.zombies.every(z => !inside(z)), 'No zombie appears inside the fence ring');
});

test('closed boundary sections block zombies until they are smashed', () => {
  const g = fresh();
  const section = ring(g).find(f => f.perimeter === 'east:432');
  assert.ok(g.walls.includes(section), 'Boundary sections are walls for zombies');
  const hp = section.hp;
  g.spawnZombie();
  const z = g.s.zombies.at(-1);
  Object.assign(z, { x: section.x + 30, y: section.y + section.h / 2, hp: 1e6, maxHp: 1e6, speed: 40, radius: 12 });
  Object.assign(g.s, { phase: 'night', phaseTime: 1 });
  tick(g, 6);
  assert.ok(section.hp < hp || !g.s.fences.includes(section), 'A zombie pressing on the boundary damages it');
});

test('the scouting gate opens for a passing scout and closes again behind them', () => {
  const g = fresh(), gate = ring(g).find(f => f.kind === 'gate');
  g.setJob(g.s.people[0].id, 'scout');
  let opened = false;
  for (let i = 0; i < 60 * 40 && !opened; i++) { g.update(1 / 60); opened ||= gate.open; }
  assert.ok(opened, 'The gate opened while the scout passed');
  tick(g, 12);
  assert.equal(gate.open, false, 'It closes once the scout is through');
  assert.ok(g.walls.includes(gate), 'A closed gate blocks zombies again');
  assert.ok(g.setGate(gate.id, true));
  tick(g, 2);
  assert.equal(gate.open, true, 'Opened by hand, it stays open');
  g.setGate(gate.id, false);
  tick(g, 1);
  assert.equal(gate.open, false);
});

test('a returning scout walks back in through the scouting gate', () => {
  const g = fresh(), p = g.s.people[0];
  Object.assign(p, { x: GATE_OUTSIDE.x, y: GATE_OUTSIDE.y + 40, gateReturn: 1 });
  tick(g, 6);
  assert.equal(p.gateReturn, 0, 'Back through the gate');
  assert.ok(inside(p), 'Inside the boundary');
});

test('route positions follow the path through the gate', () => {
  const route = expeditionRoute({ x: 785, y: 250 }, { x: 1460, y: 860 });
  const start = routePosition(route, 0), end = routePosition(route, 1);
  assert.deepEqual({ x: start.x, y: start.y }, { x: 785, y: 250 });
  assert.deepEqual({ x: end.x, y: end.y }, { x: 1460, y: 860 });
  const passes = Array.from({ length: 101 }, (_, i) => routePosition(route, i / 100)).some(p => Math.abs(p.x - SCOUT_GATE.x) < 12 && Math.abs(p.y - SCOUT_GATE.y) < 40);
  assert.ok(passes, 'The team walks through the gate rather than through the fence');
});

test('boundary repairs are costed, queued for builders and rebuild the missing sections', () => {
  const g = fresh();
  const gone = ring(g).filter(f => f.perimeter.startsWith('west:')).slice(0, 2);
  g.s.fences = g.s.fences.filter(f => !gone.includes(f));
  ring(g).find(f => f.perimeter === 'north:0').hp = 10;
  g.updateWalls();
  const status = g.perimeterStatus();
  assert.equal(status.missing, 2);
  assert.equal(status.damaged, 1);
  assert.equal(status.cost, 2 * GADGETS.fence.cost + FENCE.repairCost);
  g.s.scrap = status.cost - 1;
  assert.equal(g.restorePerimeter(), false, 'Not enough scrap: nothing is charged');
  assert.equal(g.s.scrap, status.cost - 1);
  g.s.scrap = 100;
  assert.ok(g.restorePerimeter());
  assert.equal(g.s.scrap, 100 - status.cost);
  assert.equal(g.s.sites.filter(s => s.perimeter).length, 2, 'Missing sections become priority blueprints');
  assert.ok(g.s.sites.every(s => s.priority));
  assert.equal(g.perimeterStatus().cost, 0, 'Nothing more to pay while repairs are queued');
  const teo = g.s.people[2];
  g.setJob(teo.id, 'builder');
  tick(g, 90);
  const after = g.perimeterStatus();
  assert.equal(after.missing, 0, 'Builders closed the gaps');
  assert.equal(ring(g).length, perimeterLayout().length);
});

test('boundary sections cannot be taken back by mistake', () => {
  const g = fresh(), section = ring(g).find(f => f.perimeter === 'east:432'), scrap = g.s.scrap;
  assert.equal(g.removeGadgetAt(section.x + section.w / 2, section.y + section.h / 2), false);
  assert.ok(g.s.fences.includes(section), 'The section is still standing');
  assert.equal(g.s.scrap, scrap);
});

test('saves keep the boundary; older saves gain it; tampered boundaries are rejected', () => {
  const g = fresh();
  ring(g)[5].hp = 20;
  const loaded = new ColonyEngine();
  assert.ok(loaded.restore(g.serialize()).ok);
  assert.equal(ring(loaded).length, perimeterLayout().length);
  assert.equal(ring(loaded)[5].hp, 20, 'Damage is kept');
  const old = JSON.parse(g.serialize());
  old.s.fences = old.s.fences.filter(f => !f.perimeter);
  delete old.s.perimeterVersion;
  const upgraded = new ColonyEngine();
  assert.ok(upgraded.restore(JSON.stringify(old)).ok, 'An older save loads');
  assert.equal(ring(upgraded).length, perimeterLayout().length, 'and gains the boundary');
  const bad = JSON.parse(g.serialize());
  bad.s.fences.find(f => f.perimeter).x += 7;
  const target = fresh(), before = target.s;
  assert.ok(target.restore(JSON.stringify(bad)).error, 'A moved boundary section is rejected');
  assert.equal(target.s, before, 'without replacing the current farm');
});

console.log(`${count} perimeter test groups passed.`);
