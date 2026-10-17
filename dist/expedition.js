// Playable expeditions (Update 31). The team spends the whole day on a site away from the farm:
// SITE.length seconds of searching buildings, looting and fighting, while the farm runs its day
// in the background with the jobs set before leaving. Rules only; site-art.js draws the site.
import {COMBAT,clearPath,nextWaypoint,circleHitsRect} from './engine.js';

export const SITE = Object.freeze({
  length: 300, departure: 3, searchTime: 2.5, searchReach: 30, noise: 400, sight: 210,
  spawnFirst: 20, spawnLast: 8, maxZombies: 40, retarget: 200, chase: 120,
  medicHeal: 1.2, medicReach: 90, medsHeal: 50, foundShells: 6, visitFade: .8, minVisit: .4,
});
export const LOOT_LABELS = { scrap: 'scrap', seeds: 'seeds', gas: 'gasoline', meds: 'meds', gun: 'shotgun', scythe: 'scythe', component: 'radio part' };
const BLOCK = { w: 380, h: 300, road: 90, margin: 60, south: 200, wall: 10, door: 48, inset: 40 };
const SURVIVOR_NAMES = ['Esme', 'Bo', 'Ruth', 'Silas', 'Mae', 'Jonah', 'Ada', 'Eli', 'Vera', 'Ned', 'Ivy', 'Moss'];
const KINDS = {
  walker: { hp: day => 48 + day * 3, speed: [34, 43], radius: 12, bite: 8 },
  runner: { hp: day => 34 + Math.max(0, day - 3) * 2, speed: [70, 77], radius: 12, bite: 6 },
  brute: { hp: day => 110 + Math.max(0, day - 3) * 8, speed: [30, 32], radius: 17, bite: 13 },
  crawler: { hp: () => 32, speed: [48, 52], radius: 8, bite: 6 },
  spitter: { hp: () => 55, speed: [29, 31], radius: 12, bite: 8 },
};
const ROOMS = {
  farm: ['Farmhouse', 'Barn', 'Tool shed', 'Grain store'],
  gas: ['Gas station shop', 'Garage', 'Diner', 'Motel office'],
  medical: ['Clinic ward', 'Pharmacy', 'Waiting room', 'Staff house'],
  town: ['General store', 'Hardware store', 'Pharmacy', 'Police post', 'School', 'Bar', 'Church', 'Row houses'],
};
const INDOOR = ['cabinet', 'shelf', 'locker', 'desk', 'crate'];
const OUTDOOR = { farm: ['crate', 'hay'], gas: ['pump', 'crate'], medical: ['crate', 'bin'], town: ['bin', 'crate'] };
const VEHICLE = { farm: 'tractor', gas: 'car', medical: 'ambulance', town: 'car' };

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const inRect = (p, r, pad = 0) => p.x >= r.x - pad && p.x <= r.x + r.w + pad && p.y >= r.y - pad && p.y <= r.y + r.h + pad;
function seeded(seed) { let t = seed >>> 0; return () => { t = (t + 0x6D2B79F5) >>> 0; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
function weighted(rnd, weights) { const entries = Object.entries(weights).filter(([, w]) => w > 0), total = entries.reduce((t, [, w]) => t + w, 0); let roll = rnd() * total; for (const [key, w] of entries) { roll -= w; if (roll <= 0) return key; } return entries.at(-1)[0]; }

// A site is a grid of blocks with roads between them and the team's truck to the south. Blocks are
// buildings (walls with one door, a roof until someone checks inside) or yards with vehicles and crates.
export function createSite(placeId, place, { visit = 0, seed = 1, day = 1, bonus = null } = {}) {
  const rnd = seeded(seed), pick = list => list[Math.floor(rnd() * list.length)];
  const [cols, rows] = place.blocks, factor = Math.max(SITE.minVisit, SITE.visitFade ** visit);
  const width = BLOCK.margin * 2 + cols * BLOCK.w + (cols - 1) * BLOCK.road;
  const blocksBottom = BLOCK.margin + rows * BLOCK.h + (rows - 1) * BLOCK.road;
  const height = blocksBottom + BLOCK.south;
  const truck = { x: width / 2, y: height - 70 };
  const site = {
    place: placeId, name: place.name, theme: placeId, kinds: { ...place.kinds }, width, height, seed, visit, truck,
    exit: { x: truck.x - 100, y: truck.y - 80, w: 200, h: 130 },
    roads: [], buildings: [], yards: [], containers: [], obstacles: [], props: [], zombies: [],
  };
  for (let c = 1; c < cols; c++) site.roads.push({ x: BLOCK.margin + c * BLOCK.w + (c - 1) * BLOCK.road, y: 0, w: BLOCK.road, h: blocksBottom + 40 });
  for (let r = 1; r < rows; r++) site.roads.push({ x: 0, y: BLOCK.margin + r * BLOCK.h + (r - 1) * BLOCK.road, w: width, h: BLOCK.road });
  site.roads.push({ x: 0, y: blocksBottom + 10, w: width, h: 70 }, { x: truck.x - 50, y: blocksBottom + 10, w: 100, h: height - blocksBottom - 10 });
  let containerId = 0, buildingId = 0;
  const addContainer = (kind, x, y, w, h, inside = null) => { const c = { id: ++containerId, kind, x, y, w, h, inside, loot: [], searched: false, progress: 0 }; site.containers.push(c); return c; };
  const names = [...ROOMS[placeId] || ROOMS.town];
  const blocks = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) blocks.push({ c, r, x: BLOCK.margin + c * (BLOCK.w + BLOCK.road), y: BLOCK.margin + r * (BLOCK.h + BLOCK.road) });
  // At least two buildings to check on every site.
  const order = blocks.map((b, i) => [rnd(), i]).sort((a, b) => a[0] - b[0]).map(([, i]) => i);
  const buildingCount = clamp(Math.round(blocks.length * place.buildings), 2, blocks.length);
  const isBuilding = new Set(order.slice(0, buildingCount));
  blocks.forEach((block, i) => {
    if (isBuilding.has(i)) {
      const b = { id: ++buildingId, name: names.length ? names.splice(Math.floor(rnd() * names.length), 1)[0] : 'House', x: block.x + BLOCK.inset, y: block.y + BLOCK.inset, w: BLOCK.w - BLOCK.inset * 2, h: BLOCK.h - BLOCK.inset * 2, checked: false, hider: null };
      const sides = ['south']; if (block.c > 0) sides.push('west'); if (block.c < cols - 1) sides.push('east'); if (block.r > 0) sides.push('north');
      b.door = pick(sides);
      const t = BLOCK.wall, d = BLOCK.door, walls = [];
      const horizontal = (y, gap) => gap ? [{ x: b.x, y, w: (b.w - d) / 2, h: t }, { x: b.x + (b.w + d) / 2, y, w: (b.w - d) / 2, h: t }] : [{ x: b.x, y, w: b.w, h: t }];
      const vertical = (x, gap) => gap ? [{ x, y: b.y, w: t, h: (b.h - d) / 2 }, { x, y: b.y + (b.h + d) / 2, w: t, h: (b.h - d) / 2 }] : [{ x, y: b.y, w: t, h: b.h }];
      walls.push(...horizontal(b.y, b.door === 'north'), ...horizontal(b.y + b.h - t, b.door === 'south'), ...vertical(b.x, b.door === 'west'), ...vertical(b.x + b.w - t, b.door === 'east'));
      for (const wall of walls) site.obstacles.push({ ...wall, kind: 'wall', building: b.id });
      b.doorAt = { south: { x: b.x + b.w / 2, y: b.y + b.h + 14 }, north: { x: b.x + b.w / 2, y: b.y - 14 }, west: { x: b.x - 14, y: b.y + b.h / 2 }, east: { x: b.x + b.w + 14, y: b.y + b.h / 2 } }[b.door];
      // Furniture along the walls holds what is left to find.
      const slots = [[30, 26], [b.w - 86, 26], [30, b.h - 66], [b.w - 86, b.h - 66], [b.w / 2 - 28, 26]];
      const count = 2 + Math.floor(rnd() * 2);
      for (const [sx, sy] of slots.sort(() => rnd() - .5).slice(0, count)) addContainer(pick(INDOOR), b.x + sx, b.y + sy, 56, 34, b.id);
      site.buildings.push(b);
    } else {
      const y = { id: i + 1, x: block.x, y: block.y, w: BLOCK.w, h: BLOCK.h };
      site.yards.push(y);
      // A vehicle to search, a crate or two, and a few trees or bales as cover.
      const vx = block.x + 60 + rnd() * 160, vy = block.y + 50 + rnd() * 120;
      const vehicle = { kind: VEHICLE[placeId] || 'car', x: vx, y: vy, w: 92, h: 44 };
      site.props.push(vehicle); site.obstacles.push({ ...vehicle, kind: 'vehicle' });
      addContainer(vehicle.kind, vx, vy, vehicle.w, vehicle.h);
      for (let k = 0, n = 1 + Math.floor(rnd() * 2); k < n; k++) addContainer(pick(OUTDOOR[placeId] || OUTDOOR.town), block.x + 30 + rnd() * (BLOCK.w - 100), block.y + 190 + rnd() * 60, 40, 30);
      for (let k = 0, n = 2 + Math.floor(rnd() * 3); k < n; k++) {
        const tree = { kind: placeId === 'farm' ? pick(['tree', 'bale']) : pick(['tree', 'barrel']), x: block.x + 20 + rnd() * (BLOCK.w - 50), y: block.y + 20 + rnd() * (BLOCK.h - 50), w: 22, h: 22 };
        if (site.containers.some(c => inRect({ x: tree.x + 11, y: tree.y + 11 }, c, 30)) || inRect({ x: tree.x + 11, y: tree.y + 11 }, vehicle, 30)) continue;
        site.props.push(tree); site.obstacles.push({ ...tree, kind: tree.kind });
      }
    }
  });
  // Fill the containers: some are empty, and each repeat visit finds less.
  const amount = (type, outside) => ({ scrap: 3 + Math.floor(rnd() * 6), seeds: 2 + Math.floor(rnd() * 3), gas: 1 + Math.floor(rnd() * (outside ? 2 : 1.5)), meds: 1 })[type] || 1;
  for (const c of site.containers) {
    if (c.kind === 'pump') { c.loot.push({ type: 'gas', n: Math.max(1, Math.round((1 + rnd() * 2) * factor)) }); continue; }
    if (rnd() < .18 + (1 - factor) * .45) continue;
    const weights = { ...place.loot }; if (['car', 'tractor', 'ambulance'].includes(c.kind)) { weights.gas = (weights.gas || 0) + 2; weights.scrap = (weights.scrap || 0) + 1; }
    const type = weighted(rnd, weights), n = ['gun', 'scythe'].includes(type) ? 1 : Math.max(1, Math.round(amount(type, !c.inside) * factor));
    c.loot.push({ type, n });
  }
  const indoor = site.containers.filter(c => c.inside);
  if (place.component && indoor.length && rnd() < place.component * factor) pick(indoor).loot.push({ type: 'component', n: 1 });
  if (bonus?.scrap) { const spot = site.yards[0] || site.buildings[0], c = addContainer('cache', spot.x + spot.w / 2 - 22, spot.y + spot.h - 70, 44, 32, site.yards[0] ? null : spot.id); c.marked = true; c.loot.push({ type: 'scrap', n: bonus.scrap }); }
  // Someone may be hiding inside a building.
  const hideChance = place.survivor * factor;
  for (const b of site.buildings) if (site.buildings.filter(x => x.hider).length < 2 && rnd() < hideChance) b.hider = { name: SURVIVOR_NAMES[Math.floor(rnd() * SURVIVOR_NAMES.length)] };
  // The dead: some wait inside buildings, the rest wander the streets and yards, away from the truck.
  const total = Math.round(place.zombies * (1 + (bonus?.risk || 0) * 2) * (1 + Math.min(day, 15) * .03));
  const zombie = (x, y, state) => { const kind = weighted(rnd, place.kinds), spec = KINDS[kind], hp = spec.hp(day); site.zombies.push({ kind, x, y, hp, maxHp: hp, radius: spec.radius, speed: spec.speed[0] + rnd() * (spec.speed[1] - spec.speed[0]), state, home: { x, y } }); };
  const free = (x, y, r = 18) => x > 30 && y > 30 && x < width - 30 && y < height - 30 && !site.obstacles.some(o => circleHitsRect(x, y, r, o));
  let indoorDead = 0;
  for (const b of site.buildings) for (let k = 0, n = Math.floor(rnd() * 3); k < n && indoorDead < total * .4; k++) { const x = b.x + 40 + rnd() * (b.w - 80), y = b.y + 40 + rnd() * (b.h - 80); if (free(x, y)) { zombie(x, y, 'idle'); indoorDead++; } }
  for (let tries = 0; site.zombies.length < total && tries < 400; tries++) {
    const x = 40 + rnd() * (width - 80), y = 40 + rnd() * (blocksBottom + 40);
    if (dist({ x, y }, truck) < 480 || !free(x, y) || site.buildings.some(b => inRect({ x, y }, b, 6))) continue;
    zombie(x, y, 'wander');
  }
  return site;
}

// One day on the site. Units are the team members' positions and moment-to-moment state here; health,
// skills and tools stay on the person objects, so they carry home.
export class SiteRun {
  constructor(game, mission, site, team) {
    Object.assign(this, { game, mission, site, time: 0, ammo: mission.kit.shells, meds: mission.kit.meds, medsUsed: 0, leaving: false, done: false, reason: '' });
    this.bag = { scrap: 0, seeds: 0, gas: 0, meds: 0, component: 0, gun: 0, scythe: 0 };
    this.foundTools = { gun: 0, scythe: 0 };
    Object.assign(this, { found: [], deaths: [], kills: 0, searched: 0, hurt: 0, log: [], floaters: [], shots: [], particles: [], zombieId: 0, spawnTimer: SITE.spawnFirst });
    this.obstacles = site.obstacles;
    // The path graphs for every body size are built now, at the truck, rather than in the first fight.
    const room = site.buildings[0];
    if (room) for (const radius of [8, 10, 12, 17]) nextWaypoint({ x: site.truck.x, y: site.truck.y - 90 }, { x: room.x + room.w / 2, y: room.y + room.h / 2 }, radius, this.obstacles);
    this.units = team.map((p, i) => this.makeUnit(p, site.truck.x + (i - (team.length - 1) / 2) * 30, site.truck.y - 90));
    this.zombies = site.zombies.map(z => this.makeZombie(z));
  }
  makeUnit(p, x, y, survivor = false) {
    return { id: p.id, p, x, y, angle: -Math.PI / 2, walk: 0, moving: false, order: null, waypoint: null, goal: null, routeTimer: 0, cooldown: 0, flash: 0, swing: 0, hurt: 0, hurtCooldown: 0, status: 'Ready', survivor };
  }
  makeZombie(z) { return { ...z, id: ++this.zombieId, angle: 0, hurt: 0, attackCooldown: .5, routeTimer: Math.random() * .5, waypoint: null, walk: Math.random() * 6, specialTimer: 3, wanderTimer: 0, goal: null }; }

  get alive() { return this.units.filter(u => u.p.hp > 0); }
  timeLeft() { return Math.max(0, SITE.length - this.time); }
  building(id) { return this.site.buildings.find(b => b.id === id); }
  // Inside a building that nobody has checked yet, things stay hidden.
  hidden(thing) { const b = thing.inside ? this.building(thing.inside) : null; return !!b && !b.checked; }
  zombieHidden(z) { return z.state === 'idle' && this.site.buildings.some(b => !b.checked && inRect(z, b)); }

  say(text) { this.log.push({ time: this.time, text }); if (this.log.length > 30) this.log.shift(); this.game.emit('notice', { text, site: true }); }
  floater(x, y, text, color = '#ffe4a2') { this.floaters.push({ x, y, text, color, life: 1.4 }); if (this.floaters.length > 30) this.floaters.shift(); }
  burst(x, y, color, count = 6, speed = 60) { for (let i = 0; i < count; i++) { const a = Math.random() * Math.PI * 2, v = speed * (.3 + Math.random() * .7), life = .3 + Math.random() * .4; this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life, maxLife: life, color, size: 2 + Math.random() * 2 }); } if (this.particles.length > 300) this.particles.splice(0, this.particles.length - 300); }

  // ===== What is under the mouse =====
  unitAt(x, y) { let best = null, bestDistance = 18; for (const u of this.alive) { const d = Math.hypot(u.x - x, u.y - 12 - y); if (d < bestDistance) { best = u; bestDistance = d; } } return best; }
  zombieAt(x, y) { return this.zombies.find(z => z.hp > 0 && !this.zombieHidden(z) && Math.hypot(z.x - x, z.y - 12 - y) < z.radius + 8) || null; }
  containerAt(x, y) { return this.site.containers.find(c => !c.searched && !this.hidden(c) && inRect({ x, y }, c, 8)) || null; }
  buildingAt(x, y) { return this.site.buildings.find(b => inRect({ x, y }, b)) || null; }

  // ===== Orders: the same squad commands as on the farm =====
  command(ids, x, y) {
    const group = this.alive.filter(u => ids.includes(u.id));
    if (!group.length || this.done) return null;
    const names = group.map(u => u.p.name), list = names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
    const zombie = this.zombieAt(x, y);
    if (zombie) { for (const u of group) this.give(u, { type: 'attack', zombieId: zombie.id }); return { type: 'attack', text: `${list}: attacking.` }; }
    const container = this.containerAt(x, y);
    if (container) { for (const u of group) this.give(u, { type: 'search', containerId: container.id }); return { type: 'search', text: `${list}: searching the ${container.kind}.` }; }
    group.forEach((u, i) => { const angle = i * 2.4, reach = i ? 18 + i * 6 : 0; this.give(u, { type: 'move', engage: true, x: clamp(x + Math.cos(angle) * reach, 20, this.site.width - 20), y: clamp(y + Math.sin(angle) * reach, 20, this.site.height - 20) }); });
    return { type: 'move', text: `${list}: on the way.` };
  }
  give(u, order) { u.order = order; u.waypoint = null; u.goal = null; }
  holdAll(ids) { for (const u of this.alive) if (ids.includes(u.id)) this.give(u, { type: 'move', x: u.x, y: u.y }); }
  // Everyone walks back to the truck; the day ends when they are all aboard.
  headHome() { if (this.done) return false; this.leaving = true; this.alive.forEach((u, i) => this.give(u, { type: 'move', engage: true, x: this.site.truck.x + ((i % 4) - 1.5) * 26, y: this.site.truck.y - 40 + Math.floor(i / 4) * 22 })); this.say('Everyone back to the truck.'); return true; }
  // Meds patch up the chosen person, or whoever is hurt worst.
  useMeds(targetId) {
    const hurt = this.alive.filter(u => u.p.hp < u.p.maxHp), u = hurt.find(x => x.id === targetId) || hurt.sort((a, b) => a.p.hp / a.p.maxHp - b.p.hp / b.p.maxHp)[0];
    if (this.meds <= 0) return { ok: false, text: 'No meds left on the team.' };
    if (!u) return { ok: false, text: 'Nobody needs patching up.' };
    this.meds--; this.medsUsed++; u.p.hp = Math.min(u.p.maxHp, u.p.hp + SITE.medsHeal); this.floater(u.x, u.y - 40, `+${SITE.medsHeal} health`, '#b7d486'); this.game.emit('sound', { site: true, name: 'eat' });
    return { ok: true, text: `${u.p.name} is patched up.` };
  }

  // ===== The simulation =====
  update(dt) { let left = Math.min(dt, .25); while (left > 0 && !this.done) { const step = Math.min(left, 1 / 45); this.step(step); left -= step; } }
  step(dt) {
    this.time += dt;
    if (this.time >= SITE.length) { this.end('sunset'); return; }
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) { this.spawnWanderer(); this.spawnTimer = SITE.spawnFirst + (SITE.spawnLast - SITE.spawnFirst) * clamp(this.time / SITE.length, 0, 1); }
    for (const u of this.alive) {
      for (const k of ['cooldown', 'flash', 'swing', 'hurt', 'hurtCooldown']) u[k] = Math.max(0, u[k] - dt);
      u.moving = false; u.hammering = false;
      this.checkBuildings(u);
      if (u.p.job === 'medic') this.medic(u, dt);
      this.fight(u);
      if (u.order) this.followOrder(u, dt); else u.status = 'Waiting for orders';
    }
    for (const z of this.zombies) this.runZombie(z, dt);
    const fallen = this.zombies.filter(z => z.hp <= 0);
    if (fallen.length) { this.zombies = this.zombies.filter(z => z.hp > 0); }
    for (const p of this.particles) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 1 - dt * 3; p.vy *= 1 - dt * 3; }
    this.particles = this.particles.filter(p => p.life > 0);
    for (const f of this.floaters) { f.life -= dt; f.y -= dt * 22; }
    this.floaters = this.floaters.filter(f => f.life > 0);
    for (const s of this.shots) s.life -= dt;
    this.shots = this.shots.filter(s => s.life > 0);
    if (!this.alive.length) { this.end('lost'); return; }
    if (this.leaving && this.alive.every(u => inRect(u, this.site.exit))) this.end('home');
  }
  end(reason) { if (this.done) return; this.done = true; this.reason = reason; if (reason === 'sunset') this.say('The sun is setting. The team heads home with what they carry.'); }

  spawnWanderer() {
    if (this.zombies.length >= SITE.maxZombies) return;
    const { width: w, height: h } = this.site, team = this.alive;
    for (let tries = 0; tries < 20; tries++) {
      const side = Math.floor(Math.random() * 3), x = side === 0 ? 30 : side === 1 ? w - 30 : 40 + Math.random() * (w - 80), y = side === 2 ? 30 : 40 + Math.random() * (h - 260);
      if (team.some(u => dist(u, { x, y }) < 450) || this.obstacles.some(o => circleHitsRect(x, y, 18, o))) continue;
      const kind = weighted(Math.random, this.site.kinds || { walker: 1 }), spec = KINDS[kind], day = this.game.s.day, hp = spec.hp(day);
      this.zombies.push(this.makeZombie({ kind, x, y, hp, maxHp: hp, radius: spec.radius, speed: spec.speed[0] + Math.random() * (spec.speed[1] - spec.speed[0]), state: 'wander', home: { x, y } }));
      return;
    }
  }

  // Walking into a building checks it: the roof lifts, what is inside shows, and anyone hiding is found.
  checkBuildings(u) {
    for (const b of this.site.buildings) {
      if (b.checked || !inRect(u, { x: b.x + 8, y: b.y + 8, w: b.w - 16, h: b.h - 16 })) continue;
      b.checked = true;
      const inside = this.zombies.filter(z => z.state === 'idle' && inRect(z, b));
      for (const z of inside) z.state = 'hunt';
      this.say(inside.length ? `${u.p.name} checked the ${b.name.toLowerCase()}. ${inside.length} of the dead were inside!` : `${u.p.name} checked the ${b.name.toLowerCase()}.`);
      if (b.hider) this.recruit(b, u);
    }
  }
  recruit(b, u) {
    const pending = this.found.length, room = this.game.roomForSurvivors?.() ?? 0;
    if (pending >= room) { b.hider.left = true; this.say(`${b.hider.name} was hiding in the ${b.name.toLowerCase()}, but there is no free bed at the farm.`); return; }
    const taken = new Set([...this.game.s.people.map(p => p.name), ...this.found.map(p => p.name)]);
    const name = taken.has(b.hider.name) ? SURVIVOR_NAMES.find(n => !taken.has(n)) || `${b.hider.name} ${this.game.s.day}` : b.hider.name;
    const p = this.game.makePerson(name, u.x, u.y);
    p.hp = Math.round(p.maxHp * .7);
    this.found.push(p);
    this.units.push(this.makeUnit(p, u.x + 16, u.y + 8, true));
    b.hider.joined = name;
    this.floater(u.x, u.y - 40, `${name} joins!`, '#b7d486');
    this.say(`${name} was hiding in the ${b.name.toLowerCase()} and joins the team.`);
    this.game.emit('sound', { site: true, name: 'survivors' });
  }

  medic(u, dt) {
    const bonus = this.game.bonus?.(u.p, 'medicine') ?? 1;
    for (const other of this.alive) if (other !== u && other.p.hp < other.p.maxHp && dist(other, u) < SITE.medicReach) { other.p.hp = Math.min(other.p.maxHp, other.p.hp + SITE.medicHeal * bonus * dt); this.game.xp?.(u.p, 'medicine', dt * .2); }
  }

  // ===== People: fighting, walking, searching =====
  weapon(u) { return COMBAT[u.p.tool || 'fists']; }
  canShoot(u) { return u.p.tool === 'gun' && (this.ammo > 0 || !!this.game.cheats?.ammo); }
  fight(u) {
    if (u.cooldown > 0 || u.p.fireMode === 'hold') return false;
    const gun = u.p.tool === 'gun', weapon = this.weapon(u);
    const canHit = z => z.hp > 0 && !this.zombieHidden(z) && dist(z, u) - z.radius < weapon.range && (!gun || clearPath(u, z, 0, this.obstacles));
    let target = u.order?.type === 'attack' ? this.zombies.find(z => z.id === u.order.zombieId) : null;
    if (!target || !canHit(target)) { target = null; let best = Infinity; for (const z of this.zombies) if (canHit(z) && dist(z, u) < best) { target = z; best = dist(z, u); } }
    if (!target) return false;
    u.angle = Math.atan2(target.y - u.y, target.x - u.x);
    if (gun) {
      if (this.ammo <= 0 && !this.game.cheats?.ammo) { u.cooldown = .5; if (!this.dryWarned) { this.dryWarned = true; this.say('The team is out of shells!'); } return false; }
      if (!this.game.cheats?.ammo) this.ammo--; u.flash = .08;
      this.shots.push({ x1: u.x + Math.cos(u.angle) * 14, y1: u.y - 10 + Math.sin(u.angle) * 14, x2: target.x, y2: target.y - 10, life: .1 });
      this.game.emit('sound', { site: true, name: 'rifle' });
      this.noise(u);
    } else { u.swing = .2; this.game.emit('sound', { site: true, name: 'sickle' }); }
    u.cooldown = weapon.cooldown;
    const p = u.p, skill = this.game.skill?.(p, 'combat') || 0;
    let damage = weapon.damage * (1 + skill * .08) * (p.specialty === 'combat' ? 1.2 : 1);
    if (gun) damage *= this.game.upgradeStat?.('weapons', 'damage', 1) || 1;
    this.hitZombie(target, damage, u.angle, gun ? 8 : 4, u);
    return true;
  }
  // Gunshots carry: every zombie within earshot comes looking.
  noise(at) { for (const z of this.zombies) if (z.state !== 'hunt' && dist(z, at) < SITE.noise) z.state = 'hunt'; }
  hitZombie(z, damage, angle, knockback, u) {
    if (z.hp <= 0) return;
    z.hp -= damage; z.hurt = .15;
    this.moveBody(z, Math.cos(angle) * knockback, Math.sin(angle) * knockback, z.radius);
    this.burst(z.x, z.y, '#a6a956', 4);
    if (z.state !== 'hunt') z.state = 'hunt';
    if (z.hp > 0) return;
    this.kills++; this.floater(z.x, z.y - 12, 'down', '#d8d095'); this.burst(z.x, z.y, '#708655', 8, 75);
    this.game.emit('sound', { site: true, name: 'kill' });
    if (u) this.game.xp?.(u.p, 'combat', 1);
  }
  nearestZombie(u, reach) { let best = null, bestDistance = reach; for (const z of this.zombies) { const d = dist(z, u); if (z.hp > 0 && !this.zombieHidden(z) && d < bestDistance) { best = z; bestDistance = d; } } return best; }
  engageTarget(u) {
    if (u.p.fireMode === 'hold') return null;
    const gun = this.canShoot(u), reach = gun ? COMBAT.gun.range : SITE.chase;
    let best = null, bestDistance = Infinity;
    for (const z of this.zombies) { const d = dist(z, u) - z.radius; if (z.hp > 0 && !this.zombieHidden(z) && d < reach && d < bestDistance && (!gun || clearPath(u, z, 0, this.obstacles))) { best = z; bestDistance = d; } }
    return best && { zombie: best, chase: !gun };
  }
  searchRate(u) { const p = u.p; return (1 + (this.game.skill?.(p, 'scouting') || 0) * .1) * (p.specialty === 'scouting' ? 1.3 : 1) * (p.traits?.scout || 1) / SITE.searchTime; }
  followOrder(u, dt) {
    const o = u.order;
    if (o.type === 'attack') {
      let z = this.zombies.find(x => x.id === o.zombieId && x.hp > 0);
      if (!z) { z = this.nearestZombie(u, SITE.retarget); if (z) o.zombieId = z.id; else { u.order = null; u.status = 'Waiting for orders'; return; } }
      const gun = this.canShoot(u), reach = gun ? 180 : this.weapon(u).range - 4;
      if (!(dist(z, u) - z.radius < reach && (!gun || clearPath(u, z, 0, this.obstacles)))) this.walkTo(u, z, 105, dt);
      u.status = 'Attacking';
    } else if (o.type === 'move') {
      const threat = o.engage && this.engageTarget(u);
      if (threat) { u.status = 'Fighting'; if (threat.chase) this.walkTo(u, threat.zombie, 100, dt); }
      else u.status = this.walkTo(u, o, 95, dt) ? (this.leaving ? 'At the truck' : 'Holding position') : 'On the way';
    } else if (o.type === 'search') {
      const c = this.site.containers.find(x => x.id === o.containerId);
      if (!c || c.searched) { u.order = null; return; }
      const spot = { x: c.x + c.w / 2, y: c.y + c.h + 16 };
      if (dist(u, spot) > SITE.searchReach && !this.walkTo(u, spot, 95, dt)) { u.status = `Off to search the ${c.kind}`; return; }
      u.status = `Searching the ${c.kind}`; u.angle = -Math.PI / 2; u.hammering = true;
      c.progress = Math.min(1, c.progress + dt * this.searchRate(u));
      if (c.progress >= 1) this.collect(c, u);
    }
  }
  collect(c, u) {
    c.searched = true; this.searched++;
    this.game.xp?.(u.p, 'scouting', 2);
    for (const u2 of this.alive) if (u2.order?.type === 'search' && u2.order.containerId === c.id) u2.order = null;
    if (!c.loot.length) { this.floater(c.x + c.w / 2, c.y - 6, 'Nothing useful', '#c7bfa0'); return; }
    const got = [];
    for (const item of c.loot) {
      if (item.type === 'gun' || item.type === 'scythe') { this.foundTools[item.type]++; this.arm(item.type, u); if (item.type === 'gun') this.ammo += SITE.foundShells; got.push(item.type === 'gun' ? `a shotgun (+${SITE.foundShells} shells)` : 'a scythe'); continue; }
      if (item.type === 'meds') { this.meds += item.n; this.bag.meds += item.n; } else this.bag[item.type] += item.n;
      got.push(`${item.n} ${LOOT_LABELS[item.type]}`);
    }
    this.floater(c.x + c.w / 2, c.y - 6, '+' + got.join(', +'), '#ffd772');
    this.game.emit('sound', { site: true, name: 'harvest' });
    if (c.loot.some(i => i.type === 'component')) this.say(`${u.p.name} found a radio part!`);
  }
  // A found weapon goes to the finder if they are unarmed (or trading a scythe for a gun), else to anyone unarmed, else the bag.
  arm(kind, finder) {
    const better = u => !u.p.tool || (kind === 'gun' && u.p.tool === 'scythe');
    const u = better(finder) ? finder : this.alive.find(x => !x.p.tool);
    if (!u) { this.bag[kind]++; return; }
    if (u.p.tool === 'scythe') this.bag.scythe++;
    u.p.tool = kind;
    this.floater(u.x, u.y - 46, `${u.p.name} takes the ${kind === 'gun' ? 'shotgun' : 'scythe'}`, '#d8d095');
  }

  walkTo(body, target, speed, dt) {
    if (dist(body, target) < 6) return true;
    body.routeTimer -= dt;
    if (body.routeTimer <= 0 || !body.waypoint || body.goal !== target || dist(body, body.waypoint) < 5) { body.waypoint = nextWaypoint(body, target, 10, this.obstacles); body.goal = target; body.routeTimer = .5; }
    const dx = body.waypoint.x - body.x, dy = body.waypoint.y - body.y, length = Math.hypot(dx, dy) || 1, stride = Math.min(length, speed * (body.p?.traits?.speed || 1) * dt);
    body.angle = Math.atan2(dy, dx);
    this.moveBody(body, dx / length * stride, dy / length * stride, 10);
    body.walk = (body.walk || 0) + dt * 11; body.moving = true;
    return false;
  }
  moveBody(body, dx, dy, radius) {
    const { width, height } = this.site;
    const nx = clamp(body.x + dx, radius + 5, width - radius - 5); if (!this.obstacles.some(o => circleHitsRect(nx, body.y, radius, o))) body.x = nx;
    const ny = clamp(body.y + dy, radius + 5, height - radius - 5); if (!this.obstacles.some(o => circleHitsRect(body.x, ny, radius, o))) body.y = ny;
  }

  // ===== The dead =====
  runZombie(z, dt) {
    z.hurt = Math.max(0, z.hurt - dt); z.attackCooldown = Math.max(0, z.attackCooldown - dt); z.routeTimer -= dt; z.specialTimer -= dt;
    if (z.state === 'idle') return;
    const team = this.alive;
    let prey = null, preyDistance = Infinity;
    for (const u of team) { const d = dist(z, u); if (d < preyDistance) { prey = u; preyDistance = d; } }
    if (z.state === 'wander' && prey && preyDistance < SITE.sight && clearPath(z, prey, 0, this.obstacles)) z.state = 'hunt';
    if (z.state === 'wander' || !prey) {
      z.wanderTimer -= dt;
      if (!z.goal || z.wanderTimer <= 0) { z.goal = { x: clamp(z.home.x + (Math.random() - .5) * 360, 30, this.site.width - 30), y: clamp(z.home.y + (Math.random() - .5) * 240, 30, this.site.height - 30) }; z.wanderTimer = 3 + Math.random() * 4; }
      this.zombieWalk(z, z.goal, .35, dt);
      return;
    }
    if (z.kind === 'spitter' && z.specialTimer <= 0 && preyDistance > 35 && preyDistance < 200 && clearPath(z, prey, 0, this.obstacles)) {
      z.specialTimer = 3.5; this.shots.push({ x1: z.x, y1: z.y - 12, x2: prey.x, y2: prey.y - 8, life: .25, acid: true });
      this.hurtUnit(prey, 5, Math.atan2(prey.y - z.y, prey.x - z.x)); this.burst(prey.x, prey.y, '#b6d87c', 7, 45);
    }
    if (preyDistance < z.radius + 15) {
      z.angle = Math.atan2(prey.y - z.y, prey.x - z.x);
      if (z.attackCooldown <= 0 && prey.hurtCooldown <= 0) { z.attackCooldown = 1.1; this.hurtUnit(prey, KINDS[z.kind]?.bite || 8, z.angle); }
      return;
    }
    this.zombieWalk(z, prey, 1, dt);
  }
  zombieWalk(z, goal, pace, dt) {
    if (z.routeTimer <= 0 || !z.waypoint || dist(z, z.waypoint) < 7) { z.waypoint = nextWaypoint(z, goal, z.radius, this.obstacles); z.routeTimer = .35 + Math.random() * .3; }
    let dx = z.waypoint.x - z.x, dy = z.waypoint.y - z.y; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    let sx = 0, sy = 0;
    for (const other of this.zombies) { if (other === z) continue; const space = Math.hypot(z.x - other.x, z.y - other.y), min = z.radius + other.radius + 3; if (space > .01 && space < min) { sx += (z.x - other.x) / space * (1 - space / min) * 32; sy += (z.y - other.y) / space * (1 - space / min) * 32; } }
    z.angle = Math.atan2(dy, dx); z.walk += dt * (z.kind === 'runner' ? 12 : 6) * pace;
    const slow = (z.hurt > 0 ? .35 : 1) * pace;
    this.moveBody(z, (dx * z.speed * slow + sx) * dt, (dy * z.speed * slow + sy) * dt, z.radius);
  }
  hurtUnit(u, damage, angle) {
    if (this.game.cheats?.unhurt) return;
    const p = u.p; p.hp = Math.max(0, p.hp - damage); u.hurt = .35; u.hurtCooldown = .8; this.hurt += damage;
    const today = this.game.s.today; if (today) { today.hits++; today.damage += damage; }
    p.morale = Math.max(0, (p.morale ?? 70) - 2);
    this.moveBody(u, Math.cos(angle) * 12, Math.sin(angle) * 12, 10);
    this.burst(u.x, u.y, '#dc8b6b', 8, 75); this.game.emit('sound', { site: true, name: 'hurt' });
    if (p.hp > 0) return;
    // A fallen member's weapon is picked up by whoever is unarmed, or carried in the bag.
    const tool = p.tool; p.tool = null;
    if (tool) { const other = this.alive.find(x => !x.p.tool); if (other) other.p.tool = tool; else this.bag[tool]++; }
    this.deaths.push(p.name);
    this.burst(u.x, u.y, '#9b5a44', 16, 90);
    if (u.survivor) { this.found = this.found.filter(x => x !== p); this.say(`${p.name} was caught by the dead.`); }
    else this.game.loseOnSite?.(p);
    this.game.emit('sound', { site: true, name: 'lose' });
  }

  // What the team brings home.
  result() {
    return { reason: this.reason, bag: { ...this.bag }, foundTools: { ...this.foundTools }, found: this.found.filter(p => p.hp > 0), kills: this.kills, searched: this.searched, meds: this.meds, ammo: this.ammo, medsUsed: this.medsUsed, deaths: [...this.deaths], hurt: this.hurt, time: this.time };
  }
}

// Saved farms keep only what lasts beyond a day on a site.
export function ensureExpeditions(s) { s.siteVisits ??= {}; s.extraTools ??= { gun: 0, scythe: 0 }; }
export function validExpeditions(s) {
  const count = n => Number.isSafeInteger(n) && n >= 0 && n <= 1000;
  if (s.siteVisits !== undefined && (!s.siteVisits || typeof s.siteVisits !== 'object' || Array.isArray(s.siteVisits) || Object.values(s.siteVisits).some(n => !count(n)))) return false;
  if (s.extraTools !== undefined && (!s.extraTools || typeof s.extraTools !== 'object' || !count(s.extraTools.gun) || !count(s.extraTools.scythe))) return false;
  return true;
}
