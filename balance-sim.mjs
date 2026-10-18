// Balance check: a scripted player runs the farm with the game's current prices for several days.
// It assigns jobs, buys seeds and shells when low, repairs the farmhouse, builds a fence ring and
// works through a sensible build order. Use it after changing prices or night difficulty.
// Since Update 38 it also sends expeditions (Update 31): on a calm morning with food and water to
// spare, two people take shotguns to the best place found so far. On the site the bot walks into the
// nearest building, searches it, fights, and heads home at 4:00 or when someone is badly hurt.
//   node balance-sim.mjs            (12 games, 6 days each, plus the expedition report)
//   node balance-sim.mjs 3 10       (3 games, 10 days each)
import { BUILDINGS, GADGETS, SHOP } from './dist/engine.js';
import { ColonyEngine, PLACES } from './dist/colony.js';
import { SITE } from './dist/expedition.js';
import { applyPrices } from './dist/prices.js';
import { applyStartingKit } from './dist/starting-kit.js';
import { readFileSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { cpus } from 'node:os';

const part = process.argv[2] === '--part' ? process.argv[3] : null;
const args = part ? process.argv.slice(4) : process.argv.slice(2);
// The bot plays with the prices in dist/prices.json, the same file the game reads.
const prices = applyPrices(JSON.parse(readFileSync(new URL('./dist/prices.json', import.meta.url), 'utf8')));
// And it starts each farm with the kit in dist/starting-kit.json.
const kit = applyStartingKit(JSON.parse(readFileSync(new URL('./dist/starting-kit.json', import.meta.url), 'utf8')));
if (!part) {
  for (const warning of prices.warnings) console.log('prices.json: ' + warning);
  for (const warning of kit.warnings) console.log('starting-kit.json: ' + warning);
}

const games = Number(args[0]) || 12;
const days = Number(args[1]) || 6;
const BUILD_ORDER = ['well', 'silo', 'field', 'workshop', 'watchtower', 'field', 'well', 'silo', 'watchtower', 'generator', 'field', 'coop'];
// A fence ring around the farmhouse, the way a player would protect it.
const RING = [];
for (let x = 630; x < 950; x += 48) RING.push([x + 24, 20, false], [x + 24, 290, false]);
for (let y = 44; y < 290; y += 48) RING.push([630, y + 12, true], [950, y + 12, true]);

// The expedition plan: from day 2, never on a horde day, only with breakfast still covered after packing.
const EXPEDITION = { from: 2, team: 2, shells: 24, meds: 1, fit: .6, home: 240, hurt: .4, lowShells: 3, danger: 300, fight: 220, patch: .5, think: .5 };
// "Best" is the richest place found so far; between the two medium places, the one visited less.
const RICHEST = { town: 3, gas: 2, medical: 2, farm: 1 };
const STEP = 1 / 30;

function bestPlace(s) {
  return Object.keys(PLACES).filter(id => s.discoveries[id]).sort((a, b) => RICHEST[b] - RICHEST[a] || (s.siteVisits[a] || 0) - (s.siteVisits[b] || 0))[0];
}

function sendExpedition(g, policy) {
  const s = g.s;
  if (s.day < EXPEDITION.from || g.hordeNight(s.day)) return null;
  const place = policy === 'best' ? bestPlace(s) : policy;
  if (policy !== 'best') s.discoveries[place] = true;
  // The farmer and the builder stay home; the fighters go.
  const team = s.people.filter(p => !['farmer', 'builder'].includes(p.job) && p.hp >= p.maxHp * EXPEDITION.fit).slice(0, EXPEDITION.team);
  const n = team.length, eat = s.people.length;
  if (n < EXPEDITION.team || s.food < eat + n || s.water < eat + n || s.ammo < EXPEDITION.shells) return null;
  if (g.toolsFree('gun') + team.filter(p => p.tool === 'gun').length < n) return null;
  const m = g.beginExpedition(place, team.map(p => p.id), { weapons: Object.fromEntries(team.map(p => [p.id, 'gun'])), shells: EXPEDITION.shells, meds: Math.min(EXPEDITION.meds, s.meds) });
  return m?.error ? null : m;
}

// On the site: patch up, head home at 4:00, when hurt or when shells run low, otherwise fight what is close or search the nearest thing.
function lead(run, plan) {
  if (run.done || run.leaving || run.time < plan.think) return;
  plan.think = run.time + EXPEDITION.think;
  const team = run.alive;
  for (const u of team) if (u.p.hp < u.p.maxHp * EXPEDITION.patch && run.meds > 0) run.useMeds(u.id);
  const ids = team.map(u => u.id), at = { x: team.reduce((t, u) => t + u.x, 0) / team.length, y: team.reduce((t, u) => t + u.y, 0) / team.length };
  const near = (list, f) => list.map(x => [x, Math.hypot(f(x).x - at.x, f(x).y - at.y)]).sort((a, b) => a[1] - b[1])[0];
  const threat = near(run.zombies.filter(z => z.hp > 0 && !run.zombieHidden(z) && z.state === 'hunt'), z => z);
  // Low on shells, the team keeps searching a quiet site, but leaves once something is hunting it.
  const low = run.ammo < EXPEDITION.lowShells * team.filter(u => u.p.tool === 'gun').length;
  const why = run.time >= EXPEDITION.home ? 'time' : team.some(u => u.p.hp < u.p.maxHp * EXPEDITION.hurt) ? 'hurt' : low && threat && threat[1] < EXPEDITION.danger ? 'shells' : '';
  if (why) { plan.why = why; run.headHome(); return; }
  if (team.some(u => u.order || u.orders.length)) return;
  if (!low && threat && threat[1] < EXPEDITION.fight) { run.command(ids, threat[0].x, threat[0].y - 12); return; }
  const center = b => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
  const rooms = run.site.buildings.filter(b => !b.checked || run.site.containers.some(c => c.inside === b.id && !c.searched));
  const yards = run.site.containers.filter(c => !c.inside && !c.searched);
  const target = near([...rooms.map(b => ({ b, ...center(b) })), ...yards.map(c => ({ c, ...center(c) }))], t => t);
  if (!target) { plan.why = 'done'; run.headHome(); return; }
  run.command(ids, target[0].x, target[0].y);
}

function play(seed, policy) {
  let r = seed;
  Math.random = () => { r = (Math.imul(r, 1664525) + 1013904223) >>> 0; return r / 4294967296; };
  const g = new ColonyEngine(() => {});
  g.start(true);
  const [hank, mara, teo, june] = g.s.people;
  g.setJob(mara.id, 'farmer'); g.setJob(teo.id, 'builder'); g.setJob(hank.id, 'defender'); g.setJob(june.id, 'defender');
  let order = 0, fence = 0, lastPhase = 'day', run = null, plan = null;
  const trips = [];
  // Play until the dawn after the last night, however long the nights and expeditions take.
  for (let step = 0; step < days * 2000 / STEP; step++) {
    const s = g.s;
    if (s.mode === 'journal') { g.closeJournal(); g.spinWheel(); g.openHouse(); }
    if (s.mode === 'house') {
      g.startDay();
      if (s.day <= days && policy !== 'none') {
        // Survivors who joined become farmers: more food means more expeditions.
        for (const p of s.people) if (p.job === 'rest' && !p.expeditionId) g.setJob(p.id, 'farmer');
        const m = sendExpedition(g, policy);
        if (m) { run = g.run; plan = { think: 0, why: 'sunset', hp: new Map(run.units.map(u => [u.id, u.p.hp])) }; }
      }
    }
    if (s.mode === 'prompt') g.answerSurvivors(false);
    if (['gameover', 'won'].includes(s.mode) || s.day > days) break;
    // While the team is away, nobody can give orders at the farm: it runs on the jobs it has.
    if (step % 30 === 0 && s.mode === 'playing' && !g.run) {
      if (s.seeds < 3 && s.scrap >= SHOP.seeds) g.buy('seeds');
      if (s.ammo < 12 && s.scrap >= SHOP.ammo) g.buy('ammo');
      if (s.farmHp < 55 && s.scrap >= SHOP.repair) g.buy('repair');
      // June scouts for gasoline and water by day, and defends by night.
      if (s.phase !== lastPhase) { lastPhase = s.phase; g.setJob(june.id, s.phase === 'day' ? 'scout' : 'defender'); }
      if (order >= 2 && s.phase === 'day' && fence < RING.length && s.scrap >= GADGETS.fence.cost + 12) { const [x, y, v] = RING[fence++]; g.placeGadget('fence', x, y, v); }
      const next = BUILD_ORDER[order];
      if (next && s.phase === 'day' && !s.sites.some(x => x.kind === 'building')) {
        const cost = BUILDINGS[next].levels[g.level(next)]?.cost;
        if (cost === undefined) order++;
        else if (s.scrap >= cost + 8 && g.orderBuild(next)) order++;
      }
    }
    if (g.run) lead(g.run, plan);
    g.advance(STEP);
    if (run?.done) {
      const res = run.result(), shells = run.mission.kit.shells;
      trips.push({ place: run.mission.place, reason: res.reason, scrap: res.bag.scrap, seeds: res.bag.seeds, gas: res.bag.gas, meds: res.bag.meds, part: res.bag.component, weapons: res.foundTools.gun + res.foundTools.scythe, survivors: res.found.length, deaths: run.units.filter(u => !u.survivor && u.p.hp <= 0).length, damage: res.hurt, injured: run.units.filter(u => !u.survivor && u.p.hp > 0 && u.p.hp < plan.hp.get(u.id)).length, why: res.reason === 'lost' ? 'lost' : plan.why, shells: shells - res.ammo, searched: res.searched, kills: res.kills, time: res.time, lost: res.reason === 'lost' });
      run = null;
    }
  }
  const s = g.s, fell = s.mode === 'gameover';
  const where = Object.entries(trips.reduce((t, x) => ({ ...t, [x.place]: (t[x.place] || 0) + 1 }), {})).map(([id, n]) => `${PLACES[id].name.toLowerCase()} ${n}`).join(', ');
  return { fell, trips, line: `${fell ? `fell on night ${s.day}` : `alive on day ${s.day}`} · farmhouse ${Math.round(s.farmHp)} · people ${s.people.length} · kills ${s.kills} · scrap left ${s.scrap}${policy === 'none' ? '' : ` · trips ${trips.length}${where ? ` (${where})` : ''}`}` };
}

if (part) {
  // A part plays games first+1 to first+games for one policy and prints them as JSON.
  const first = Number(args[2]) || 0;
  process.stdout.write(JSON.stringify(Array.from({ length: games }, (_, i) => play(11 * (first + i + 1), part))));
} else {
  // Six bots play the same farms: with the best place, without expeditions, and always to each place.
  // They run side by side, each split into a few processes so every processor core has work.
  const policies = ['best', 'none', ...Object.keys(PLACES)];
  const size = Math.ceil(games / Math.max(1, Math.floor(cpus().length / policies.length)));
  const runPart = (policy, first) => new Promise((resolve, reject) => execFile(process.execPath, [fileURLToPath(import.meta.url), '--part', policy, String(Math.min(size, games - first)), String(days), String(first)], { maxBuffer: 64 << 20 }, (error, out) => error ? reject(error) : resolve(JSON.parse(out))));
  const results = Object.fromEntries(await Promise.all(policies.map(async policy => {
    const chunks = [];
    for (let first = 0; first < games; first += size) chunks.push(runPart(policy, first));
    return [policy, (await Promise.all(chunks)).flat()];
  })));
  const alive = list => list.filter(x => !x.fell).length;

  console.log(`Prices: shells ${SHOP.ammo} · seeds ${SHOP.seeds} · well ${BUILDINGS.well.levels[0].cost} · silo ${BUILDINGS.silo.levels[0].cost} · field +2 plots ${BUILDINGS.field.levels[1].cost} · watchtower ${BUILDINGS.watchtower.levels[0].cost}`);
  results.best.forEach((result, i) => console.log(`game ${i + 1}: ${result.line}`));
  console.log(`${alive(results.best)} of ${games} farms survived ${days} nights.`);

  console.log(`\nExpeditions: ${EXPEDITION.team} people with shotguns, ${EXPEDITION.shells} shells and ${EXPEDITION.meds} med, from day ${EXPEDITION.from}, never on a horde day.`);
  console.log(`On the site the bot heads home at ${Math.floor(EXPEDITION.home / 60)}:${String(EXPEDITION.home % 60).padStart(2, '0')} of ${Math.floor(SITE.length / 60)}:00, or when someone drops below ${EXPEDITION.hurt * 100}% health.`);
  const tripCount = results.best.reduce((t, x) => t + x.trips.length, 0);
  console.log(`  To the best place found: ${alive(results.best)} of ${games} survived (${tripCount} trips) · without expeditions: ${alive(results.none)} of ${games}.`);
  console.log(`  Always to one place, average per trip:`);
  const cols = [['scrap', 'scrap'], ['seeds', 'seeds'], ['gas', 'gas'], ['meds', 'meds'], ['weapons', 'weapons'], ['survivors', 'people'], ['part', 'radio'], ['deaths', 'deaths'], ['injured', 'injured'], ['damage', 'damage'], ['shells', 'shells'], ['searched', 'searched'], ['time', 'seconds']];
  console.log('  ' + 'place'.padEnd(17) + 'trips'.padStart(6) + cols.map(([, label]) => label.padStart(9)).join('') + '   lost' + '  survived' + '   why the team went home');
  for (const id of Object.keys(PLACES)) {
    const list = results[id], all = list.flatMap(x => x.trips), avg = key => all.length ? all.reduce((t, x) => t + x[key], 0) / all.length : 0;
    console.log('  ' + PLACES[id].name.padEnd(17) + String(all.length).padStart(6) + cols.map(([key]) => avg(key).toFixed(['damage', 'shells', 'searched', 'time'].includes(key) ? 0 : 2).padStart(9)).join('') + String(all.filter(x => x.lost).length).padStart(7) + `  ${alive(list)} of ${games}`.padStart(10) + '   home: ' + Object.entries(all.reduce((t, x) => ({ ...t, [x.why]: (t[x.why] || 0) + 1 }), {})).map(([k, n]) => `${k} ${n}`).join(', '));
  }
  console.log('  people = survivors found · deaths and injured (came home with less health) count the team only · damage = health lost on the site');
  console.log('  shells = shells used · searched = containers searched · seconds on the site · lost = whole team lost · survived = farms alive after the last night');
}
