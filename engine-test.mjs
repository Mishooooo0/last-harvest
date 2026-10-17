import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('./dist/engine.js', import.meta.url), 'utf8');
const {
  GameEngine, BUILDINGS, UPGRADES, GADGETS, WORLD, FARMHOUSE, FARM_CENTER, DAY_LENGTH, NIGHT_LENGTH, GROW_TIME, WHEEL,
  STARTING_PEOPLE, STARTING_PACK, PLOT_SPOTS, PANTRY_SIZE, WATER_CAP, DAWN_SUPPLIES, HORDE, HOUSE_DOOR, WAREHOUSE_DOOR, buildTime,
} = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
let seed = 4031;
const originalRandom = Math.random;
Math.random = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
};
const advance = (game, seconds, each) => {
  for (let i = 0; i < Math.ceil(seconds * 60); i++) {
    each?.(game);
    game.update(1 / 60);
  }
};
// Plays straight through each morning: the journal, the wheel, breakfast, and any knock at the gate.
const play = (game, seconds) => advance(game, seconds, current => {
  if (current.s.mode === 'journal') current.closeJournal();
  if (current.s.mode === 'wheel') {
    current.spinWheel();
    current.openHouse();
  }
  if (current.s.mode === 'house') current.startDay();
  if (current.s.mode === 'prompt') current.answerSurvivors(false);
});
const started = (events = []) => {
  const game = new GameEngine(event => events.push(event));
  assert.equal(game.s.mode, 'title');
  game.start();
  return game;
};
const gap = (body, rect) => Math.hypot(body.x - Math.max(rect.x, Math.min(body.x, rect.x + rect.w)), body.y - Math.max(rect.y, Math.min(body.y, rect.y + rect.h)));
const stuck = (game, body, radius) => game.obstacles.some(rect => gap(body, rect) < radius);
const withRandom = (value, fn) => {
  const saved = Math.random;
  Math.random = () => value;
  try { fn(); } finally { Math.random = saved; }
};
const person = (game, name) => game.s.people.find(other => other.name === name);
const zombieAt = (game, x, y, extra = {}) => {
  Object.getPrototypeOf(game).spawnZombie.call(game);
  const zombie = game.s.zombies.at(-1);
  Object.assign(zombie, { x, y, kind: 'walker', radius: 12, ...extra });
  return zombie;
};
// Keeps the clock in daylight (or night) for as long as a test needs.
const freezeTime = (game, phase = 'day') => Object.assign(game.s, { phase, phaseTime: 1, phaseDuration: 1e6 });

try {
  // The farm starts with four named people, a warehouse of tools, and you as their leader.
  const farm = started();
  assert.deepEqual(farm.s.people.map(p => p.name), STARTING_PEOPLE);
  assert.equal(STARTING_PEOPLE.length, 4);
  assert.ok(farm.s.people.every(p => p.waiting && p.job === 'rest'), 'Everyone waits for a job');
  assert.equal(farm.s.player, undefined, 'There is no player character any more');
  assert.equal(farm.s.buildings.warehouse, 1, 'The warehouse stands from day one');
  assert.equal(farm.toolTotal('gun'), 2);
  assert.equal(farm.toolTotal('scythe'), 2);
  assert.equal(farm.toolsFree('gun'), 2);
  assert.ok(Object.entries(farm.s.buildings).every(([id, level]) => level === (BUILDINGS[id].starts || 0)), 'Every other building starts as an empty lot');
  assert.equal(farm.s.buildings.field, 1, 'The crop field starts at level 1');
  console.log('PASS four named people, a warehouse with 2 shotguns and 2 scythes, no player character');

  // Farmers fetch a scythe, harvest and plant, and say "Out of seeds" until you buy more.
  const notes = [];
  const fields = started(notes);
  freezeTime(fields);
  const hank = person(fields, 'Hank');
  fields.setJob(hank.id, 'farmer');
  advance(fields, 12);
  assert.equal(hank.tool, 'scythe', 'The farmer fetched a scythe from the warehouse');
  assert.equal(fields.toolsFree('scythe'), 1);
  const harvested = fields.s.harvested;
  fields.s.seeds = 2;
  advance(fields, 25);
  assert.ok(fields.s.harvested >= harvested + 3, `Hank harvests the ripe crops (${fields.s.harvested - harvested})`);
  fields.s.seeds = 1;
  advance(fields, 0.1);
  fields.s.seeds = 0;
  for (const plot of fields.s.plots) if (plot.growth >= 0) plot.growth = -1;
  const heard = notes.length;
  advance(fields, 3);
  assert.equal(hank.status, 'Out of seeds');
  assert.equal(notes.slice(heard).filter(e => e.type === 'notice' && e.text.startsWith('Out of seeds')).length, 1);
  fields.s.scrap = 100;
  fields.buy('seeds');
  advance(fields, 12);
  assert.ok(fields.s.plots.filter(plot => plot.growth >= 0).length >= 3, 'Fresh seeds put the farmer back to work');
  fields.setJob(hank.id, 'scout');
  assert.equal(hank.tool, null, 'Changing jobs returns the tool');
  assert.equal(fields.toolsFree('scythe'), 2);
  console.log('PASS farmers fetch scythes, harvest and plant, run out of seeds, resume, and return tools');

  // Everything is built on site by someone, with progress, by daylight.
  const site = started();
  freezeTime(site);
  site.s.scrap = 500;
  const order = site.orderBuild('silo');
  assert.ok(order, 'The silo is ordered');
  assert.equal(site.s.scrap, 500 - BUILDINGS.silo.levels[0].cost, 'Paid when ordered');
  assert.equal(site.s.buildings.silo, 0, 'Not standing yet');
  assert.equal(site.orderBuild('silo'), false, 'One construction per building at a time');
  advance(site, 5);
  assert.equal(order.progress, 0, 'Nobody is building it yet');
  const teo = person(site, 'Teo');
  site.setJob(teo.id, 'builder');
  advance(site, 11);
  assert.ok(order.progress > 0 && order.progress < 1, `Teo is building (${Math.round(order.progress * 100)}%)`);
  site.s.phase = 'night';
  const paused = order.progress;
  advance(site, 3);
  assert.equal(order.progress, paused, 'Builders wait for daylight');
  site.s.phase = 'day';
  advance(site, buildTime(1) + 2);
  assert.equal(site.s.buildings.silo, 1, 'The silo stands when the work is done');
  assert.equal(site.s.foodCap, PANTRY_SIZE + BUILDINGS.silo.levels[0].storage);
  assert.equal(site.s.sites.length, 0);
  // Two pairs of hands are faster than one.
  const solo = started();
  const duo = started();
  for (const game of [solo, duo]) {
    freezeTime(game);
    game.s.scrap = 500;
    game.orderBuild('well');
    game.setJob(person(game, 'Teo').id, 'builder');
  }
  duo.setJob(person(duo, 'June').id, 'builder');
  advance(solo, 12);
  advance(duo, 12);
  assert.ok(duo.s.sites[0]?.progress > solo.s.sites[0].progress || duo.s.buildings.well === 1, 'Two builders work faster');
  console.log('PASS construction: ordered and paid, built on site with progress, daylight only, more hands go faster');

  // Leading people: select and click. Move, build, field work, attack, take shelter, or open a lot.
  const lead = started();
  freezeTime(lead);
  const mara = person(lead, 'Mara');
  const june = person(lead, 'June');
  let reply = lead.command([mara.id, june.id], 1300, 700);
  assert.equal(reply.type, 'move');
  advance(lead, 12);
  assert.ok(Math.hypot(mara.x - 1300, mara.y - 700) < 10, 'Mara walked to the clicked spot');
  assert.ok(Math.hypot(june.x - 1300, june.y - 700) < 60 && Math.hypot(june.x - mara.x, june.y - mara.y) > 8, 'June stands beside her, not on top of her');
  assert.equal(mara.status, 'Holding position');
  advance(lead, 5);
  assert.ok(Math.hypot(mara.x - 1300, mara.y - 700) < 10, 'They hold the position');
  reply = lead.command([mara.id], BUILDINGS.workshop.x + 20, BUILDINGS.workshop.y + 20);
  assert.deepEqual(reply, { type: 'lot', lot: 'workshop' }, 'Clicking an empty lot asks what to build');
  lead.s.scrap = 500;
  lead.orderBuild('workshop');
  reply = lead.command([mara.id, june.id], BUILDINGS.workshop.x + 20, BUILDINGS.workshop.y + 20);
  assert.equal(reply.type, 'build');
  advance(lead, 30);
  assert.equal(lead.s.buildings.workshop, 1, 'Sent people build the workshop');
  assert.equal(mara.order, null, 'The order ends when the work is done');
  const ripe = lead.s.plots.find(plot => plot.growth >= 1);
  reply = lead.command([mara.id], ripe.x, ripe.y);
  assert.equal(reply.type, 'plot');
  const before = lead.s.harvested;
  advance(lead, 12);
  assert.equal(lead.s.harvested, before + 1, 'Mara harvests the plot she was sent to');
  reply = lead.command([june.id], FARMHOUSE.x + 40, FARMHOUSE.y + 40);
  assert.equal(reply.type, 'house');
  advance(lead, 10);
  assert.equal(june.inside, true, 'June goes inside');
  lead.clearOrders([june.id]);
  advance(lead, 1);
  assert.equal(june.inside, false, 'Without the order she comes back out in daylight');
  console.log('PASS leading people: move and hold, open a lot, build, harvest, shelter in the house');

  // Defenders take shotguns and fire the farm's shells; an attack order picks the target.
  const notes2 = [];
  const guard = started(notes2);
  freezeTime(guard);
  const [g1, g2, g3] = guard.s.people;
  for (const p of [g1, g2, g3]) guard.setJob(p.id, 'defender');
  advance(guard, 15);
  assert.equal([g1, g2, g3].filter(p => p.tool === 'gun').length, 2, 'Only two shotguns to go around');
  assert.equal(guard.toolsFree('gun'), 0);
  const armed = g1.tool === 'gun' ? g1 : g2;
  freezeTime(guard, 'night');
  guard.spawnZombie = () => {};
  advance(guard, 8);
  const target = zombieAt(guard, armed.x + 150, armed.y, { speed: 0, hp: 300, maxHp: 300 });
  const shells = guard.s.ammo;
  reply = guard.command([armed.id], target.x, target.y - 12);
  assert.equal(reply.type, 'attack');
  advance(guard, 3);
  assert.ok(target.hp < 300, 'The defender shoots');
  assert.ok(guard.s.ammo < shells, 'Each shot uses one of the farm\'s shells');
  guard.s.ammo = 0;
  target.hp = 300;
  advance(guard, 2);
  assert.equal(guard.s.ammo, 0);
  assert.ok(notes2.some(e => e.type === 'notice' && e.text.startsWith('Out of shells!')));
  console.log('PASS defenders take the two shotguns, shoot with shared shells, follow attack orders, run dry');

  // The dog bug: a zombie biting a dog hurts only the dog — nobody else, however near or far.
  for (const offset of [13.5, 14, 14.5, 15, 15.5, 16, 17, 18]) {
    const kennel = started();
    freezeTime(kennel, 'night');
    kennel.raise('doghouse', true);
    const rex = kennel.s.dogs[0];
    Object.assign(rex, { x: 1400, y: 900, hp: 1000, maxHp: 1000 });
    kennel.spawnZombie = () => {};
    const biter = zombieAt(kennel, rex.x + offset, rex.y, { speed: 0, attackCooldown: 0 });
    biter.hp = 1e6;
    const people = kennel.s.people.map(p => p.hp);
    const farmHp = kennel.s.farmHp;
    for (let i = 0; i < 120; i++) {
      rex.x = 1400;
      rex.y = 900;
      biter.x = 1400 + offset;
      biter.y = 900;
      kennel.update(1 / 60);
    }
    assert.deepEqual(kennel.s.people.map(p => p.hp), people, `A bite on the dog at ${offset}px hurts no person`);
    assert.equal(kennel.s.farmHp, farmHp, 'Nor the farmhouse');
  }
  console.log('PASS bitten dogs no longer hurt anyone else');

  // Nights: with lights people sleep inside; in the dark they panic; defenders stay out.
  const dusk = started();
  dusk.setJob(person(dusk, 'Mara').id, 'defender');
  dusk.s.scrap = 100;
  dusk.raise('generator', true);
  freezeTime(dusk, 'night');
  dusk.spawnZombie = () => {};
  advance(dusk, 14);
  assert.equal(dusk.s.lit, true);
  assert.ok(dusk.s.people.filter(p => p.job !== 'defender').every(p => p.inside), 'With the lights on, people sleep inside');
  assert.equal(person(dusk, 'Mara').inside, false, 'The defender stays out on her post');
  dusk.toggleGenerator();
  advance(dusk, 0.3);
  assert.ok(dusk.s.people.filter(p => p.job !== 'defender').every(p => p.panic && !p.inside), 'In the dark they panic outside');
  assert.equal(person(dusk, 'Mara').panic, false, 'Defenders never panic');
  console.log('PASS nights: inside with lights, panic in the dark, defenders hold their posts');

  // The morning: journal, wheel, breakfast in the farmhouse, then the new day. No planning map.
  const morning = started();
  morning.s.food = 3;
  morning.s.water = 10;
  morning.command([person(morning, 'Hank').id], 1200, 500);
  morning.s.phase = 'night';
  morning.s.phaseTime = NIGHT_LENGTH - 0.05;
  morning.s.phaseDuration = NIGHT_LENGTH;
  advance(morning, 0.1);
  assert.equal(morning.s.mode, 'journal');
  assert.equal(morning.openHouse(), false, 'The wheel comes first');
  morning.closeJournal();
  assert.equal(morning.s.mode, 'wheel');
  assert.ok(morning.spinWheel());
  assert.equal(morning.openHouse(), true);
  assert.equal(morning.s.mode, 'house');
  assert.equal(morning.s.breakfast.fed.length, 3, 'Three breakfasts from 3 food');
  assert.equal(morning.s.breakfast.hungry.length, 1);
  assert.ok(morning.s.people.every(p => p.inside && !p.order), 'Everyone wakes up inside with no orders');
  assert.equal(morning.startDay(), true);
  assert.equal(morning.s.day, 2);
  assert.equal(morning.s.mode === 'playing' || morning.s.mode === 'prompt', true);
  assert.equal(morning.s.phaseDuration, DAY_LENGTH);
  assert.equal(typeof morning.openPlanning, 'undefined', 'The planning step is gone');
  console.log('PASS mornings: journal → wheel → breakfast in the farmhouse → day; no planning map');

  // The journal counts hits on people, kills, farmhouse damage, animals, and deaths.
  const diary = started();
  freezeTime(diary, 'night');
  const victim = person(diary, 'June');
  diary.hurtPerson(victim, 10, 0);
  diary.hurtPerson(victim, 999, 0);
  diary.s.phaseDuration = 0.01;
  advance(diary, 0.1);
  const page = diary.s.journal.at(-1);
  assert.equal(page.hits, 2);
  assert.deepEqual(page.deaths, ['June']);
  assert.equal(page.survivors, 3);
  assert.equal(page.animals, 3);
  console.log('PASS the journal counts hits on people and deaths');

  // Losing: the farmhouse falls, or nobody is left.
  const fall = started();
  freezeTime(fall);
  fall.s.people.forEach(p => fall.command([p.id], -900, 1100));
  zombieAt(fall, 725, 240, { speed: 0, hp: 1e6, maxHp: 1e6 });
  advance(fall, 56);
  assert.equal(fall.s.mode, 'gameover');
  assert.equal(fall.s.farmHp, 0);
  assert.equal(fall.s.journal.at(-1).fell, true);
  const empty = started();
  for (const p of [...empty.s.people]) empty.hurtPerson(p, 999, 0);
  advance(empty, 0.1);
  assert.equal(empty.s.mode, 'gameover', 'With nobody left the farm is lost');
  console.log('PASS the farm falls when the farmhouse does or when everyone is gone');

  // Story mode: three 2-minute days and 1-minute nights. Endless keeps going.
  const victory = started();
  victory.spawnZombie = () => {};
  victory.s.food = 100;
  victory.s.water = 100;
  victory.s.waterCap = 100;
  play(victory, 3 * (DAY_LENGTH + NIGHT_LENGTH) + 1);
  assert.equal(victory.s.mode, 'won');
  assert.equal(victory.s.day, 3);
  assert.equal(victory.s.journal.length, 3);
  const forever = started();
  forever.restart(true);
  forever.spawnZombie = () => {};
  Object.assign(forever.s, { food: 100, water: 100, waterCap: 100, foodCap: 100 });
  play(forever, 3 * (DAY_LENGTH + NIGHT_LENGTH) + 1);
  assert.equal(forever.s.day, 4, 'Endless mode does not stop at three nights');
  assert.ok(forever.nightPlan(6).count > forever.nightPlan(3).count, 'Each horde is bigger than the last');
  const encore = started();
  encore.s.mode = 'won';
  withRandom(0.9, () => assert.equal(encore.continueEndless(), true));
  assert.equal(encore.s.mode, 'house', 'A won farm goes on, starting with breakfast');
  console.log('PASS story victory after three nights; endless keeps going');

  // Hordes come every third night, five bigger each time; the nights between bring a few stragglers.
  const hordes = started();
  assert.deepEqual([1, 2, 3, 4, 5, 6, 9].map(d => hordes.hordeNight(d)), [false, false, true, false, false, true, true]);
  assert.deepEqual([3, 6, 9, 12].map(d => hordes.nightPlan(d).count), [30, 35, 40, 45], 'Hordes of 30, 35, 40, 45');
  assert.ok([1, 2, 4, 5].every(d => hordes.nightPlan(d).count <= 4 && !hordes.nightPlan(d).horde), 'Quiet nights bring only a few stragglers');
  assert.deepEqual([1, 2, 3, 4].map(d => hordes.nightsToHorde(d)), [2, 1, 0, 2]);
  assert.equal(HORDE.every, 3);

  // A night lasts until its zombies are gone, however long that takes.
  const siegeNight = started();
  siegeNight.restart(true);
  siegeNight.s.day = 3;
  siegeNight.changePhase();
  assert.equal(siegeNight.s.phase, 'night');
  assert.deepEqual(siegeNight.s.wave, { total: 30, spawned: 0, horde: true });
  siegeNight.s.farmHp = 1e9;
  advance(siegeNight, 60);
  assert.equal(siegeNight.s.phase, 'night', 'Still night after a minute while zombies remain');
  assert.equal(siegeNight.s.wave.spawned, 30, 'All 30 have arrived');
  for (const z of siegeNight.s.zombies) z.hp = 0;
  advance(siegeNight, 0.2);
  assert.equal(siegeNight.s.mode, 'journal', 'Clearing the horde ends the night');
  assert.equal(siegeNight.s.journal.at(-1).horde, true);
  assert.equal(siegeNight.s.journal.at(-1).wave, 30);

  // As a safety valve, first light ends a night that drags on too long.
  const longNight = started();
  longNight.changePhase();
  longNight.s.farmHp = 1e9;
  for (const p of longNight.s.people) p.hp = p.maxHp = 1e9;
  advance(longNight, 12);
  assert.ok(longNight.s.zombies.length > 0 && longNight.s.phase === 'night');
  for (const z of longNight.s.zombies) Object.assign(z, { speed: 0, hp: 1e9, maxHp: 1e9 });
  advance(longNight, HORDE.limit);
  assert.equal(longNight.s.mode, 'journal', 'First light drives off what is left');
  assert.equal(longNight.s.zombies.length, 0);
  console.log('PASS hordes every third night: 30, 35, 40 …, quiet nights between, nights end when their zombies are gone');

  // A zombie behind the farmhouse, out of sight of the posts, is hunted down rather than left to wreck the house.
  const behind = started();
  behind.restart(true);
  const sentry = person(behind, 'Hank');
  behind.setJob(sentry.id, 'defender');
  freezeTime(behind);
  advance(behind, 15);
  assert.equal(sentry.tool, 'gun', 'Hank has a shotgun');
  Object.assign(behind.s, { phase: 'night', phaseTime: 1, phaseDuration: 1e6, wave: { total: 1, spawned: 1, horde: false } });
  const lurker = zombieAt(behind, FARMHOUSE.x + FARMHOUSE.w / 2, FARMHOUSE.y - 18, { speed: 0, hp: 40, maxHp: 40 });
  advance(behind, 25);
  assert.ok(lurker.hp <= 0 || !behind.s.zombies.includes(lurker), 'The defender went round the house and shot it');
  console.log('PASS defenders hunt down zombies that attack the farmhouse out of sight');

  // Defenses: placed with the mouse, built on site by a builder; fences hold zombies; traps bite.
  const walls = started();
  freezeTime(walls);
  walls.s.scrap = 200;
  const fenceSite = walls.placeGadget('fence', 1200, 600, true);
  assert.ok(fenceSite, 'A fence blueprint is placed');
  assert.equal(walls.s.scrap, 200 - GADGETS.fence.cost);
  assert.equal(GADGETS.fence.cost, 2);
  assert.equal(walls.s.fences.length, 0, 'Not built yet');
  assert.equal(walls.placeGadget('wire', 1200, 600), false, 'Not on top of a blueprint');
  assert.equal(walls.placeGadget('mine', BUILDINGS.workshop.x + 20, BUILDINGS.workshop.y + 20), false, 'Not on a lot');
  walls.setJob(person(walls, 'Teo').id, 'builder');
  advance(walls, 25);
  assert.equal(walls.s.fences.length, 1, 'The builder puts the fence up');
  const wall = walls.s.fences[0];
  freezeTime(walls, 'night');
  walls.spawnZombie = () => {};
  walls.s.people.forEach(p => walls.command([p.id], wall.x - 300, wall.y));
  advance(walls, 6);
  const smasher = zombieAt(walls, wall.x + 40, wall.y + wall.h / 2, { speed: 40, hp: 1e6, maxHp: 1e6 });
  advance(walls, 1.5);
  assert.ok(smasher.x > wall.x + wall.w, 'The fence holds the zombie back');
  assert.ok(wall.hp < wall.maxHp, 'The zombie smashes at it');
  assert.equal(walls.removeGadgetAt(wall.x + 4, wall.y + 10), true, 'You can take a defense back');
  const trapGame = started();
  trapGame.s.scrap = 100;
  const mineSite = trapGame.placeGadget('mine', 1500, 300);
  trapGame.finishSite(mineSite);
  freezeTime(trapGame, 'night');
  trapGame.spawnZombie = () => {};
  const walker = zombieAt(trapGame, 1525, 300, { speed: 40, hp: 500, maxHp: 500, waypoint: { x: 1200, y: 300 }, routeTimer: 99 });
  advance(trapGame, 1.5);
  assert.ok(walker.hp < 450, 'The landmine blows up under a zombie');
  console.log('PASS defenses: 2-scrap fences as blueprints, built by builders, hold zombies; traps work; take back');

  // A builder mends a damaged fence for free.
  const mend = started();
  mend.s.scrap = 50;
  mend.finishSite(mend.placeGadget('fence', 600, 650));
  mend.s.fences[0].hp = 10;
  freezeTime(mend);
  mend.setJob(person(mend, 'Hank').id, 'builder');
  advance(mend, 15);
  assert.equal(mend.s.fences[0].hp, mend.s.fences[0].maxHp);
  console.log('PASS builders mend defenses');

  // The warehouse can be upgraded for more tools.
  const tools = started();
  freezeTime(tools);
  tools.s.scrap = 200;
  tools.raise('warehouse', true);
  assert.equal(tools.toolTotal('gun'), 3);
  assert.equal(tools.toolTotal('scythe'), 3);
  console.log('PASS warehouse upgrades add shotguns and scythes');

  // Buildings still do their jobs once standing.
  const works = started();
  works.s.scrap = 2000;
  for (let i = 0; i < 4; i++) works.raise('silo', true);
  assert.equal(works.s.foodCap, PANTRY_SIZE + BUILDINGS.silo.levels[3].storage, 'The second silo holds the most food');
  for (let i = 0; i < 3; i++) works.raise('well', true);
  works.s.plots[3].growth = 0;
  freezeTime(works);
  advance(works, GROW_TIME / 2 + 0.1);
  assert.equal(works.s.plots[3].growth, 1, 'A level 3 well halves the grow time');
  works.raise('waterTank', true);
  assert.equal(works.s.waterCap, WATER_CAP + BUILDINGS.waterTank.levels[0].water);
  const eggs = started();
  eggs.s.food = 0;
  eggs.raise('coop', true);
  freezeTime(eggs);
  advance(eggs, 24.1);
  assert.equal(eggs.s.food, 2, 'Hens lay an egg every 12s');
  const tower = started();
  tower.raise('watchtower', true);
  freezeTime(tower, 'night');
  tower.spawnZombie = () => {};
  tower.s.people.forEach(p => tower.command([p.id], -900, 1100));
  advance(tower, 1);
  zombieAt(tower, 599, 300, { speed: 0 });
  advance(tower, 4);
  assert.equal(tower.s.kills, 1, 'The watchtower shoots on its own');
  const crops = started();
  crops.s.scrap = 500;
  crops.research('crops');
  crops.research('crops');
  crops.research('crops');
  crops.s.food = 0;
  crops.harvestPlot(crops.s.plots[0]);
  assert.equal(crops.s.food, 3, 'Pumpkins give 3 food');
  console.log('PASS silos, well, water tank, coop, watchtower and crop upgrades');

  // Cows sleep in the barn; dogs guard the house and bite.
  const ranch = started();
  ranch.raise('pasture', true);
  ranch.raise('doghouse', true);
  assert.equal(ranch.s.cows.length, 2);
  assert.equal(ranch.animalCount(), 2 + 1 + 3);
  ranch.s.phaseTime = DAY_LENGTH - 13;
  advance(ranch, 12.5);
  assert.ok(ranch.s.cows.every(cow => cow.inside), 'Cows sleep in the barn');
  freezeTime(ranch, 'night');
  ranch.spawnZombie = () => {};
  ranch.s.people.forEach(p => ranch.command([p.id], -900, 1100));
  advance(ranch, 1);
  zombieAt(ranch, HOUSE_DOOR.x + 120, HOUSE_DOOR.y + 80, { speed: 0, hp: 40, maxHp: 40 });
  advance(ranch, 8);
  assert.equal(ranch.s.kills, 1, 'Rex bites the zombie by the house');
  console.log('PASS cows sleep in the barn; dogs guard the farmhouse');

  // Survivors may knock every second day with a 25% chance, at breakfast, before the day is planned.
  const camp = started();
  Object.assign(camp.s, { day: 3, food: 50, water: 50, mode: 'wheel', wheel: { result: { id: 'scrap' } } });
  withRandom(0.1, () => camp.openHouse());
  assert.equal(camp.s.mode, 'prompt', 'Someone knocks at breakfast before day 4');
  const visitors = camp.s.visitors.length;
  camp.answerSurvivors(true);
  assert.equal(camp.s.mode, 'house', 'Back to breakfast once they are answered');
  assert.equal(camp.s.people.length, 4 + visitors);
  assert.ok(camp.s.people.at(-1).waiting && camp.s.people.at(-1).inside, 'The newcomers wait inside for a job');
  assert.ok(camp.startDay());
  assert.equal(camp.s.mode, 'playing', 'Nobody knocks again at dawn');
  const quiet = started();
  Object.assign(quiet.s, { day: 3, food: 50, water: 50, mode: 'wheel', wheel: { result: { id: 'scrap' } } });
  withRandom(0.3, () => quiet.openHouse());
  assert.equal(quiet.s.mode, 'house');
  console.log('PASS survivors arrive every 2nd day with a 25% roll');

  // Scouts leave by the south road and return with loot before dark.
  const scouting = started();
  const scout = person(scouting, 'June');
  scouting.setJob(scout.id, 'scout');
  const stock = { water: scouting.s.water, food: scouting.s.food, gas: scouting.s.gas };
  let wentAway = false;
  advance(scouting, DAY_LENGTH - 0.5, current => { wentAway ||= scout.away > 0; });
  assert.ok(wentAway);
  assert.equal(scout.away, 0, 'Home before dark');
  assert.ok(scouting.s.water > stock.water || scouting.s.food > stock.food || scouting.s.gas > stock.gas);
  console.log('PASS scouts leave and come back with loot');

  // Healing goes to whoever is hurt worst, or the one you chose.
  const care = started();
  care.s.meds = 2;
  care.s.scrap = 100;
  person(care, 'Teo').hp = 20;
  person(care, 'Mara').hp = 60;
  care.useMeds();
  assert.equal(person(care, 'Teo').hp, 70, 'Meds go to the worst hurt');
  care.buy('heal', person(care, 'Mara').id);
  assert.equal(person(care, 'Mara').hp, 80, 'Or to the chosen person');
  console.log('PASS healing: meds, meals and first aid go to the worst hurt or the chosen person');

  // The wheel: a quarter of it is a free upgrade.
  assert.equal(WHEEL.filter(slice => slice.id === 'upgrade').length, 1);
  assert.equal(WHEEL.length, 4);
  const lucky = started();
  lucky.raise('silo', true);
  lucky.s.mode = 'journal';
  lucky.closeJournal();
  let spin;
  withRandom(0.1, () => { spin = lucky.spinWheel(); });
  assert.equal(spin.id, 'upgrade');
  assert.ok(lucky.s.buildings.silo === 2 || lucky.s.buildings.warehouse === 2 || lucky.s.buildings.field === 2 || lucky.s.upgrades.crops === 1);
  // A free upgrade that replaces an order you already paid for gives the scrap back.
  const refund = started();
  refund.s.scrap = 500;
  refund.raise('silo', true);
  const paidFrom = refund.s.scrap;
  assert.ok(refund.orderBuild('silo'));
  refund.s.mode = 'journal';
  refund.closeJournal();
  const pool = ['field', 'warehouse', 'silo', 'generator', 'crops'];
  let free;
  // First roll lands on the upgrade slice, the second picks the silo.
  const rolls = [0.1, (pool.indexOf('silo') + 0.5) / pool.length];
  const savedRandom = Math.random;
  Math.random = () => (rolls.length ? rolls.shift() : 0.5);
  try { free = refund.spinWheel(); } finally { Math.random = savedRandom; }
  assert.equal(free.id, 'upgrade');
  assert.equal(refund.s.buildings.silo, 2, 'The wheel upgraded the silo');
  assert.equal(refund.s.sites.length, 0, 'The paid order is replaced');
  assert.equal(refund.s.scrap, paidFrom, 'Its scrap comes back');
  console.log('PASS the wheel: 1 in 4 free upgrades, refunding any order they replace');

  // Zombies still find the farmhouse past every building at its top level.
  const maze = started();
  for (const id of Object.keys(BUILDINGS)) while (maze.level(id) < BUILDINGS[id].levels.length) maze.raise(id, true);
  Object.assign(maze.s, { cows: [], dogs: [], people: [], farmHp: 1e9 });
  maze.end = () => {};
  const starts = [[40, -60], [360, 110], [480, 105], [600, 110], [930, 30], [1000, 320], [800, 505], [930, 578], [416, 578], [250, 362], [22, 300], [480, 578], [-500, 200], [1500, -400], [1400, 900], [500, 1100]];
  for (const [x, y] of starts) {
    for (const radius of [12, 17]) {
      maze.s.zombies = [];
      maze.s.phaseTime = 0;
      maze.s.phase = 'day';
      const zombie = zombieAt(maze, x, y, { radius, hp: 1e6, maxHp: 1e6, speed: 60 });
      assert.ok(!stuck(maze, zombie, radius), `Start ${x},${y} must be open ground`);
      let arrived = false;
      for (let i = 0; i < 45 * 60 && !arrived; i++) {
        maze.update(1 / 60);
        assert.ok(!stuck(maze, zombie, radius - 0.5), `Zombie from ${x},${y} walked into a building`);
        arrived = gap(zombie, FARMHOUSE) < radius + 12;
      }
      assert.ok(arrived, `Zombie (radius ${radius}) from ${x},${y} must reach the farmhouse`);
    }
  }
  console.log(`PASS zombies from ${starts.length} directions reach the farmhouse past every building`);

  // People also find their way around every building.
  const walkers = started();
  for (const id of Object.keys(BUILDINGS)) while (walkers.level(id) < BUILDINGS[id].levels.length) walkers.raise(id, true);
  freezeTime(walkers);
  const runner = person(walkers, 'Hank');
  for (const [x, y] of [[-200, 200], [1100, 200], [520, -100], [300, 600]]) {
    walkers.command([runner.id], x, y);
    advance(walkers, 25);
    assert.ok(Math.hypot(runner.x - x, runner.y - y) < 12, `Hank reaches ${x},${y}`);
  }
  console.log('PASS people find their way around the whole farm');

  // A new farm opens its starting pack: 4 plots (2 ripe), and the supplies listed on the pack screen.
  const pack = started();
  for (const key of ['scrap', 'ammo', 'seeds', 'food', 'water', 'meds', 'gas']) assert.equal(pack.s[key], STARTING_PACK[key], `starting ${key}`);
  assert.equal(pack.s.plots.length, 4, 'The field starts with 4 plots');
  assert.equal(pack.s.plots.filter(plot => plot.growth >= 1).length, STARTING_PACK.ripe, 'Two plots are ready to harvest');
  assert.deepEqual(pack.s.plots.map(({ x, y }) => ({ x, y })), PLOT_SPOTS.slice(0, 4));
  assert.equal(pack.s.buildings.generator, 1, 'A small generator comes with the farm');
  assert.equal(pack.powered(), true, 'The farm has light on the first night');
  assert.equal(pack.s.scrap, 50, 'A new farm starts with 50 scrap');
  assert.equal(pack.s.foodCap, 10, 'The farmhouse pantry holds 10 food before any silo');
  assert.equal(pack.s.waterCap, 15, 'and 15 water');
  for (const id of ['silo', 'workshop', 'market', 'coop']) assert.equal(BUILDINGS[id].levels[0].cost, 15, `The basic ${id} costs 15`);
  console.log('PASS the starting pack: 4 crop plots (2 ripe), a generator with 2 gasoline, and the listed supplies');

  // Every dawn brings shells, seeds and water, before breakfast.
  const dawnFarm = started();
  Object.assign(dawnFarm.s, { ammo: 0, seeds: 0, water: 0, food: 10 });
  dawnFarm.s.phase = 'night';
  dawnFarm.s.phaseTime = NIGHT_LENGTH - 0.05;
  dawnFarm.s.phaseDuration = NIGHT_LENGTH;
  advance(dawnFarm, 0.1);
  dawnFarm.closeJournal();
  dawnFarm.spinWheel();
  dawnFarm.openHouse();
  assert.deepEqual(DAWN_SUPPLIES, { ammo: 6, seeds: 4, water: 4 });
  assert.ok(dawnFarm.s.ammo >= 6, `+6 shells (${dawnFarm.s.ammo})`);
  assert.ok(dawnFarm.s.seeds >= 4, `+4 seeds (${dawnFarm.s.seeds})`);
  assert.equal(dawnFarm.s.breakfast.fed.length, 4, 'The dawn water lets all four drink at breakfast');
  assert.equal(dawnFarm.s.water, 0, 'They drank all 4');
  console.log('PASS every dawn brings +6 shells, +4 seeds and +4 water before breakfast');

  // The field grows two plots per expansion, built by a builder, up to 12.
  const grow = started();
  freezeTime(grow);
  grow.s.scrap = 500;
  const tiller = person(grow, 'Teo');
  grow.setJob(tiller.id, 'builder');
  assert.ok(grow.orderBuild('field'), 'The field expansion can be ordered');
  assert.equal(grow.s.plots.length, 4, 'Ordering pays; the plots appear once it is built');
  advance(grow, 45);
  assert.equal(grow.level('field'), 2);
  assert.equal(grow.s.plots.length, 6, 'An expansion adds two plots');
  assert.ok(grow.s.plots.slice(4).every(plot => plot.growth === -1), 'New plots are empty, ready to plant');
  while (grow.level('field') < BUILDINGS.field.levels.length) grow.raise('field', true);
  assert.equal(grow.s.plots.length, 12, 'The whole field holds 12 plots');
  assert.equal(grow.orderBuild('field'), false, 'Twelve is the limit');
  const third = grow.s.plots[2];
  assert.equal(grow.lotAt(third.x, third.y), null, 'Clicking a plot means the plot, not the field');
  assert.equal(grow.lotAt(BUILDINGS.field.x + 4, BUILDINGS.field.y + BUILDINGS.field.h - 4), 'field', 'Empty field ground opens the field');
  console.log('PASS the crop field expands from 4 to 12 plots, two at a time, built by a builder');

  // With confirmations on, day and night wait for the leader's button.
  const wait = started();
  wait.confirmPhases = true;
  wait.spawnZombie = () => {};
  advance(wait, DAY_LENGTH + 5);
  assert.equal(wait.s.phase, 'day', 'The day holds at sunset until confirmed');
  assert.equal(wait.s.phaseReady, true);
  assert.ok(wait.confirmPhase(), 'Confirming starts the night');
  assert.equal(wait.s.phase, 'night');
  assert.equal(wait.confirmPhase(), false, 'The night cannot be skipped before it is over');
  advance(wait, NIGHT_LENGTH + 5);
  assert.equal(wait.s.phase, 'night', 'The night holds at dawn until confirmed');
  assert.ok(wait.confirmPhase());
  assert.equal(wait.s.mode, 'journal', 'Confirming the dawn opens the journal');
  const early = started();
  early.confirmPhases = true;
  advance(early, 10);
  assert.ok(early.confirmPhase(), 'The leader may end a day early');
  assert.equal(early.s.phase, 'night');
  console.log('PASS day and night wait for the leader to confirm the switch');
} finally {
  Math.random = originalRandom;
}
