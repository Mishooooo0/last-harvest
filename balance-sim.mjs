// Balance check: a scripted player runs the farm with the game's current prices for several days.
// It assigns jobs, buys seeds and shells when low, repairs the farmhouse, builds a fence ring and
// works through a sensible build order. Use it after changing prices or night difficulty.
//   node balance-sim.mjs            (12 games, 6 days each)
//   node balance-sim.mjs 3 10       (3 games, 10 days each)
import { BUILDINGS, GADGETS, SHOP } from './dist/engine.js';
import { ColonyEngine } from './dist/colony.js';
import { applyPrices } from './dist/prices.js';
import { readFileSync } from 'node:fs';

// The bot plays with the prices in dist/prices.json, the same file the game reads.
const prices = applyPrices(JSON.parse(readFileSync(new URL('./dist/prices.json', import.meta.url), 'utf8')));
for (const warning of prices.warnings) console.log('prices.json: ' + warning);

const games = Number(process.argv[2]) || 12;
const days = Number(process.argv[3]) || 6;
const BUILD_ORDER = ['well', 'silo', 'field', 'workshop', 'watchtower', 'field', 'well', 'silo', 'watchtower', 'generator', 'field', 'coop'];
// A fence ring around the farmhouse, the way a player would protect it.
const RING = [];
for (let x = 630; x < 950; x += 48) RING.push([x + 24, 20, false], [x + 24, 290, false]);
for (let y = 44; y < 290; y += 48) RING.push([630, y + 12, true], [950, y + 12, true]);

function play(seed) {
  let r = seed;
  Math.random = () => { r = (Math.imul(r, 1664525) + 1013904223) >>> 0; return r / 4294967296; };
  const g = new ColonyEngine(() => {});
  g.start(true);
  const [hank, mara, teo, june] = g.s.people;
  g.setJob(mara.id, 'farmer'); g.setJob(teo.id, 'builder'); g.setJob(hank.id, 'defender'); g.setJob(june.id, 'defender');
  let order = 0, fence = 0, lastPhase = 'day';
  for (let step = 0; step < days * 200 * 30; step++) {
    const s = g.s;
    if (s.mode === 'journal') { g.closeJournal(); g.spinWheel(); g.openHouse(); }
    if (s.mode === 'house') g.startDay();
    if (s.mode === 'prompt') g.answerSurvivors(false);
    if (['gameover', 'won'].includes(s.mode) || s.day > days) break;
    if (step % 30 === 0 && s.mode === 'playing') {
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
    g.update(1 / 30);
  }
  const s = g.s, fell = s.mode === 'gameover';
  return { fell, night: s.day, line: `${fell ? `fell on night ${s.day}` : `alive on day ${s.day}`} · farmhouse ${Math.round(s.farmHp)} · people ${s.people.length} · kills ${s.kills} · scrap left ${s.scrap}` };
}

console.log(`Prices: shells ${SHOP.ammo} · seeds ${SHOP.seeds} · well ${BUILDINGS.well.levels[0].cost} · silo ${BUILDINGS.silo.levels[0].cost} · field +2 plots ${BUILDINGS.field.levels[1].cost} · watchtower ${BUILDINGS.watchtower.levels[0].cost}`);
let alive = 0;
for (let i = 0; i < games; i++) {
  const result = play(11 * (i + 1));
  if (!result.fell) alive++;
  console.log(`game ${i + 1}: ${result.line}`);
}
console.log(`${alive} of ${games} farms survived ${days} nights.`);
