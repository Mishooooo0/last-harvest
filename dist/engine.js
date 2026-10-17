// The world is ten times the old farm's area. The original farm keeps its coordinates and now sits
// in the middle, so the world reaches into negative x and y.
export const WORLD = { left: -1040, top: -650, right: 2000, bottom: 1250 };
WORLD.width = WORLD.right - WORLD.left;
WORLD.height = WORLD.bottom - WORLD.top;
export const FARM_CENTER = { x: 520, y: 290 };

// One day lasts two minutes and one night lasts one.
export const DAY_LENGTH = 120;
export const NIGHT_LENGTH = 60;
// Every third night a horde comes, five zombies bigger each time; the nights between bring a few
// stragglers. A night ends when its zombies are gone, or at first light after HORDE.limit seconds.
export const HORDE = { every: 3, first: 30, growth: 5, stragglers: 2, limit: 240 };
export const GROW_TIME = 45;

export const FARMHOUSE = { x: 680, y: 70, w: 210, h: 155 };
export const BARN = { x: 125, y: 110, w: 160, h: 130 };
export const BARN_DOOR = { x: 205, y: 254 };
export const OBSTACLES = [
  { ...BARN, kind: 'barn' },
  { ...FARMHOUSE, kind: 'house' },
  { x: 100, y: 395, w: 130, h: 90, kind: 'pond' },
];

// The farmhouse pantry holds a little food and a few barrels of water; buildings hold much more.
export const PANTRY_SIZE = 10;
export const WATER_CAP = 15;
export const DAWN_SUPPLIES = { ammo: 6, seeds: 4, water: 4 };
export const MEAL_COST = 3;

// Farm buildings start as empty lots (the warehouse is already standing). Every new level is
// ordered here and then built on site by someone, by daylight.
// Crop plot positions, in the order the field grows: a 2×2 bed first, then two plots per expansion.
export const PLOT_SPOTS = [[0, 0], [1, 0], [0, 1], [1, 1], [2, 0], [2, 1], [3, 0], [3, 1], [0, 2], [1, 2], [2, 2], [3, 2]]
  .map(([col, row]) => ({ x: 378 + col * 56, y: 280 + row * 48 }));

export const BUILDINGS = {
  field: {
    name: 'Crop field', x: 342, y: 258, w: 242, h: 143, starts: 1, solid: false, card: true,
    about: 'Tilled beds for your farmers. Every expansion adds two plots, up to twelve.',
    levels: [
      { cost: 0, plots: 4, text: '4 crop plots' },
      { cost: 20, plots: 6, text: '6 crop plots' },
      { cost: 35, plots: 8, text: '8 crop plots' },
      { cost: 50, plots: 10, text: '10 crop plots' },
      { cost: 70, plots: 12, text: '12 crop plots · the whole field' },
    ],
  },
  warehouse: {
    name: 'Warehouse', x: 20, y: 0, w: 96, h: 64, starts: 1,
    about: 'Keeps the farm\'s shotguns and scythes. People fetch the tool their job needs.',
    levels: [
      { cost: 0, guns: 2, scythes: 2, text: '2 shotguns · 2 scythes' },
      { cost: 50, guns: 3, scythes: 3, text: '3 shotguns · 3 scythes' },
      { cost: 80, guns: 4, scythes: 4, text: '4 shotguns · 4 scythes' },
    ],
  },
  silo: {
    name: 'Silo', x: 322, y: 30, w: 46, h: 52, twin: 56,
    about: 'Stores your harvest so nothing goes to waste. The top upgrade adds a second silo.',
    levels: [
      { cost: 15, storage: 20, text: 'Holds 30 food' },
      { cost: 40, storage: 45, text: 'Holds 55 food' },
      { cost: 70, storage: 80, text: 'Holds 90 food' },
      { cost: 110, storage: 175, text: 'A second silo · holds 185 food' },
    ],
  },
  well: {
    name: 'Well', x: 232, y: 298, w: 40, h: 32,
    about: 'Fresh water makes every crop grow faster.',
    levels: [
      { cost: 25, growth: 1.3, water: 2, text: 'Crops grow 30% faster · 2 water each dawn' },
      { cost: 45, growth: 1.6, water: 4, text: 'Crops grow 60% faster · 4 water each dawn' },
      { cost: 70, growth: 2, water: 6, text: 'Crops grow twice as fast · 6 water each dawn' },
    ],
  },
  waterTank: {
    name: 'Water tank', x: 950, y: 96, w: 48, h: 46,
    about: 'Stores drinking water and catches the rain.',
    levels: [
      { cost: 35, water: 40, rain: 2, text: 'Holds 55 water · catches 2 rain each dawn' },
      { cost: 60, water: 90, rain: 3, text: 'Holds 105 water · catches 3 rain each dawn' },
      { cost: 90, water: 190, rain: 5, text: 'Holds 205 water · catches 5 rain each dawn' },
    ],
  },
  coop: {
    name: 'Chicken coop', x: 768, y: 420, w: 62, h: 38,
    about: 'Hens lay eggs for your stores, day and night.',
    levels: [
      { cost: 15, eggEvery: 12, hens: 4, text: '4 hens · an egg every 12s' },
      { cost: 45, eggEvery: 8, hens: 6, text: '6 hens · an egg every 8s' },
      { cost: 70, eggEvery: 5, hens: 8, text: '8 hens · an egg every 5s' },
    ],
  },
  pasture: {
    name: 'Pasture', x: -310, y: 120, w: 270, h: 170, solid: false,
    about: 'Cows graze and give milk by day, and sleep in the barn at night.',
    levels: [
      { cost: 45, cows: 2, milkEvery: 30, text: '2 cows · each gives milk every 30s' },
      { cost: 65, cows: 4, milkEvery: 24, text: '4 cows · milk every 24s' },
      { cost: 90, cows: 6, milkEvery: 18, text: '6 cows · milk every 18s' },
    ],
  },
  doghouse: {
    name: 'Doghouse', x: 930, y: 262, w: 34, h: 28,
    about: 'Loyal dogs guard the farmhouse and bite the dead.',
    levels: [
      { cost: 30, dogs: 1, bite: 16, speed: 125, text: 'Rex guards the house and bites for 16' },
      { cost: 50, dogs: 1, bite: 26, speed: 150, text: 'Rex bites for 26 and runs faster' },
      { cost: 75, dogs: 2, bite: 26, speed: 150, text: 'Rex and Biscuit, two fierce dogs' },
    ],
  },
  market: {
    name: 'Market stall', x: 380, y: 522, w: 72, h: 32,
    about: 'Trade surplus food for scrap with passing survivors.',
    levels: [
      { cost: 15, price: 2, text: 'Buys food for 2 scrap each' },
      { cost: 35, price: 3, text: 'Buys food for 3 scrap each' },
      { cost: 55, price: 4, text: 'Buys food for 4 scrap each' },
    ],
  },
  workshop: {
    name: 'Workshop', x: 432, y: 138, w: 96, h: 62,
    about: 'Crafts shotgun shells and patches up the farmhouse.',
    levels: [
      { cost: 15, shellEvery: 6, repairEvery: 0, text: 'Crafts a shell every 6s' },
      { cost: 45, shellEvery: 4, repairEvery: 4, text: 'A shell every 4s · repairs the farmhouse' },
      { cost: 75, shellEvery: 2.5, repairEvery: 2, text: 'A shell every 2.5s · repairs twice as fast' },
    ],
  },
  watchtower: {
    name: 'Watchtower', x: 582, y: 150, w: 34, h: 34,
    about: 'A lookout shoots the dead before they reach the house.',
    levels: [
      { cost: 45, range: 170, damage: 20, rate: 1.3, text: 'Range 170 · a shot every 1.3s' },
      { cost: 70, range: 205, damage: 24, rate: 0.95, text: 'Range 205 · a shot every 0.95s' },
      { cost: 105, range: 240, damage: 30, rate: 0.65, text: 'Range 240 · a heavy shot every 0.65s' },
    ],
  },
  generator: {
    name: 'Generator', x: 700, y: 318, w: 36, h: 28, starts: 1,
    about: 'Burns gasoline to light the farm at night. People panic in the dark.',
    levels: [
      { cost: 40, burn: 1, lamps: 4, text: '4 lamps · burns 1 gasoline a night' },
      { cost: 60, burn: 0.6, lamps: 6, text: '6 lamps · burns 0.6 gasoline a night' },
      { cost: 85, burn: 0.35, lamps: 8, text: '8 lamps · burns 0.35 gasoline a night' },
    ],
  },
};
export const GENERATOR_STARTER_GAS = 2;
// Seconds of one person's work to put up each level; more hands finish sooner.
export const buildTime = level => 10 + level * 6;

// Upgrades that are not buildings on the map.
export const UPGRADES = {
  crops: {
    name: 'Crops',
    about: 'Better seed stock for every plot on the farm.',
    levels: [
      { cost: 45, food: 2, scrap: 5, growth: 1, crop: 'corn', text: 'Corn · 2 food per harvest' },
      { cost: 70, food: 2, scrap: 5, growth: 1.3, crop: 'corn', text: 'Fertilizer · crops grow 30% faster' },
      { cost: 105, food: 3, scrap: 9, growth: 1.3, crop: 'pumpkin', text: 'Pumpkins · 3 food and 9 scrap per harvest' },
    ],
  },
};

// Lamp posts the generator powers, in the order its upgrades switch them on.
export const LAMPS = [[300, 252], [640, 238], [905, 236], [452, 446], [690, 456], [306, 374], [468, 510], [872, 396]];

// Defenses: placed with the mouse, then built on site. Fences block zombies until smashed; the rest
// are traps zombies walk over. People pass everything.
export const GADGETS = {
  fence: { name: 'Fence', cost: 2, w: 48, h: 10, rotates: true, hp: 80, work: 3, text: 'Blocks zombies until they smash it' },
  wire: { name: 'Barbed wire', cost: 7, w: 48, h: 14, rotates: true, hp: 30, work: 3, text: 'Slows zombies and scratches them' },
  spikes: { name: 'Spike trap', cost: 9, w: 24, h: 24, rotates: false, hp: 15, work: 4, text: 'Stabs zombies that step on it' },
  mine: { name: 'Landmine', cost: 16, w: 18, h: 18, rotates: false, hp: 1, work: 5, text: 'One big blast' },
};
export const FENCE = { cost: GADGETS.fence.cost, repairCost: 1, hp: GADGETS.fence.hp, grid: 24, max: 60 };

// The farm's people. You lead them: select, then click where to go or what to do.
export const STARTING_PEOPLE = ['Hank', 'Mara', 'Teo', 'June'];
// Supply stash prices in scrap, and the price of a cow.
export const SHOP = { ammo: 10, seeds: 6, heal: 12, repair: 18, cow: 20 };

// What every new farm starts with. The starting pack screen shows the same numbers.
// starting-kit.json (Update 33) can change these; guns and scythes are extra tools beyond the warehouse's own.
export const STARTING_PACK = { scrap: 50, ammo: 24, seeds: 6, food: 3, water: 8, meds: 1, gas: 2, ripe: 2, guns: 0, scythes: 0 };
export const MAX_PEOPLE = 8;
export const SURVIVOR_EVERY = 2;
export const SURVIVOR_CHANCE = 0.25;
export const JOBS = { farmer: 'Farmer', builder: 'Builder', defender: 'Defender', scout: 'Scout', rest: 'Resting' };
// Jobs that want a tool from the warehouse.
export const JOB_TOOLS = { farmer: 'scythe', defender: 'gun' };
export const TOOLS = { gun: 'Shotgun', scythe: 'Scythe' };
export const COMBAT = {
  gun: { range: 230, damage: 26, cooldown: 1 },
  scythe: { range: 26, damage: 32, cooldown: 0.8 },
  fists: { range: 20, damage: 8, cooldown: 1 },
};
const SURVIVOR_NAMES = ['Rosa', 'Ike', 'Abe', 'Nell', 'Otis', 'Wren', 'Cal', 'Hazel', 'Gus', 'Lou', 'Pip', 'Dot'];
const DOG_NAMES = ['Rex', 'Biscuit'];
export const HOUSE_DOOR = { x: 785, y: 240 };
export const WAREHOUSE_DOOR = { x: 68, y: 80 };
const CAMPFIRE = { x: 640, y: 505 };
const FIELD_EDGE = { x: 470, y: 425 };
const WORKBENCH = { x: 480, y: 222 };
const ROAD_EXIT = { x: 510, y: 1190 };
// Night posts for defenders, around the farmhouse.
const POSTS = [[725, 268], [845, 268], [640, 140], [925, 190], [785, 300], [700, 36], [870, 36], [640, 268]];

// After each night's journal: one spin. A quarter of the wheel is a free random upgrade.
export const WHEEL = [
  { id: 'upgrade', label: 'Free upgrade' },
  { id: 'scrap', label: '+10 scrap', scrap: 10 },
  { id: 'shells', label: '+8 shells', ammo: 8 },
  { id: 'seeds', label: '+4 seeds', seeds: 4 },
];

const TAU = Math.PI * 2;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const random = (min, max) => min + Math.random() * (max - min);

export function circleHitsRect(x, y, radius, rect) {
  return Math.hypot(x - clamp(x, rect.x, rect.x + rect.w), y - clamp(y, rect.y, rect.y + rect.h)) < radius;
}

function rectGap(body, rect) {
  return Math.hypot(body.x - clamp(body.x, rect.x, rect.x + rect.w), body.y - clamp(body.y, rect.y, rect.y + rect.h));
}

function rectsOverlap(a, b, margin = 0) {
  return a.x < b.x + b.w + margin && a.x + a.w + margin > b.x && a.y < b.y + b.h + margin && a.y + a.h + margin > b.y;
}

const inRect = (x, y, rect, pad = 0) => x >= rect.x - pad && x <= rect.x + rect.w + pad && y >= rect.y - pad && y <= rect.y + rect.h + pad;
const listNames = names => names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;

function segmentHitsRect(ax, ay, bx, by, rect, padding = 0) {
  let near = 0;
  let far = 1;
  const axes = [
    [ax, bx - ax, rect.x - padding, rect.x + rect.w + padding],
    [ay, by - ay, rect.y - padding, rect.y + rect.h + padding],
  ];
  for (const [origin, direction, minimum, maximum] of axes) {
    if (Math.abs(direction) < 0.00001) {
      if (origin < minimum || origin > maximum) return false;
    } else {
      let t1 = (minimum - origin) / direction;
      let t2 = (maximum - origin) / direction;
      if (t1 > t2) [t1, t2] = [t2, t1];
      near = Math.max(near, t1);
      far = Math.min(far, t2);
      if (near > far) return false;
    }
  }
  return true;
}

function segmentDistance(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

export function clearPath(a, b, radius, obstacles) {
  // Swept-circle clearance matches moveBody, including rounded building corners.
  // A padded box would incorrectly trap legal positions touching a wall/corner.
  const clearance = Math.max(0, radius - 0.01);
  return !obstacles.some(rect => {
    if (segmentHitsRect(a.x, a.y, b.x, b.y, rect)) return true;
    if (clearance === 0) return false;
    if (circleHitsRect(a.x, a.y, clearance, rect) || circleHitsRect(b.x, b.y, clearance, rect)) return true;
    return [
      [rect.x, rect.y],
      [rect.x + rect.w, rect.y],
      [rect.x, rect.y + rect.h],
      [rect.x + rect.w, rect.y + rect.h],
    ].some(([x, y]) => segmentDistance(x, y, a.x, a.y, b.x, b.y) < clearance);
  });
}

// The corner-to-corner links only change when a building goes up, so they are worked out once
// per obstacle layout and body size. Big endless hordes would otherwise redo this constantly.
const cornerGraphs = new WeakMap();
function cornerGraph(radius, obstacles) {
  let bySize = cornerGraphs.get(obstacles);
  if (!bySize) cornerGraphs.set(obstacles, bySize = new Map());
  if (bySize.has(radius)) return bySize.get(radius);
  const padding = radius + 3;
  const nodes = [];
  for (const rect of obstacles) {
    nodes.push(
      { x: rect.x - padding, y: rect.y - padding },
      { x: rect.x + rect.w + padding, y: rect.y - padding },
      { x: rect.x - padding, y: rect.y + rect.h + padding },
      { x: rect.x + rect.w + padding, y: rect.y + rect.h + padding },
    );
  }
  const links = nodes.map(() => []);
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      if (!clearPath(nodes[i], nodes[j], radius, obstacles)) continue;
      const d = distance(nodes[i], nodes[j]);
      links[i].push([j, d]);
      links[j].push([i, d]);
    }
  }
  const graph = { nodes, links };
  bySize.set(radius, graph);
  return graph;
}

// A tiny visibility graph gives everyone a reliable way around the farm buildings.
export function nextWaypoint(from, to, radius, obstacles) {
  if (clearPath(from, to, radius, obstacles)) return to;
  const { nodes, links } = cornerGraph(radius, obstacles);
  const costs = nodes.map(node => clearPath(from, node, radius, obstacles) ? distance(from, node) : Infinity);
  const previous = nodes.map(() => -1);
  const visited = nodes.map(() => false);
  let best = Infinity;
  let last = -1;
  for (let step = 0; step < nodes.length; step++) {
    let current = -1;
    for (let i = 0; i < nodes.length; i++) {
      if (!visited[i] && (current === -1 || costs[i] < costs[current])) current = i;
    }
    if (current === -1 || costs[current] >= best) break;
    visited[current] = true;
    if (clearPath(nodes[current], to, radius, obstacles)) {
      const total = costs[current] + distance(nodes[current], to);
      if (total < best) {
        best = total;
        last = current;
      }
    }
    for (const [i, d] of links[current]) {
      if (!visited[i] && costs[current] + d < costs[i]) {
        costs[i] = costs[current] + d;
        previous[i] = current;
      }
    }
  }
  if (last === -1) return to;
  let cursor = last;
  while (previous[cursor] !== -1) cursor = previous[cursor];
  return nodes[cursor];
}

export class GameEngine {
  constructor(onEvent = () => {}) {
    this.confirmPhases = false;
    this.onEvent = onEvent;
    this.reset('title');
  }

  reset(mode, endless = false) {
    this.s = {
      mode,
      endless,
      day: 1,
      phase: 'day',
      phaseTime: 0,
      phaseDuration: DAY_LENGTH,
      phaseReady: false,
      wave: null,
      elapsed: 0,
      farmHp: 100,
      farmHurt: 0,
      seeds: STARTING_PACK.seeds,
      food: STARTING_PACK.food,
      foodCap: PANTRY_SIZE,
      scrap: STARTING_PACK.scrap,
      ammo: STARTING_PACK.ammo,
      kills: 0,
      harvested: 0,
      plots: PLOT_SPOTS.slice(0, BUILDINGS.field.levels[0].plots).map((spot, i) => this.makePlot(spot, i < STARTING_PACK.ripe ? 1 : 0.45)),
      buildings: Object.fromEntries(Object.entries(BUILDINGS).map(([id, b]) => [id, b.starts || 0])),
      upgrades: Object.fromEntries(Object.keys(UPGRADES).map(id => [id, 0])),
      water: STARTING_PACK.water,
      waterCap: WATER_CAP,
      gas: STARTING_PACK.gas,
      meds: STARTING_PACK.meds,
      generatorOn: true,
      lit: false,
      fences: [],
      traps: [],
      sites: [],
      people: [],
      visitors: null,
      dogs: [],
      cows: [],
      barnOpen: 0,
      journal: [],
      today: this.freshDay(),
      breakfast: null,
      wheel: null,
      zombies: [],
      particles: [],
      floaters: [],
      tracers: [],
      shots: [],
      corpses: [],
      towerAngle: Math.PI / 2,
      shake: 0,
    };
    this.obstacles = OBSTACLES;
    this.walls = OBSTACLES;
    this.gadgetId = 0;
    this.siteId = 0;
    this.personId = 0;
    this.animalId = 0;
    this.zombieId = 0;
    this.fenceWarning = 0;
    this.seedAlarm = false;
    this.shellAlarm = false;
    this.panicWarned = false;
    this.eggTimer = 0;
    this.shellTimer = 0;
    this.repairTimer = 0;
    this.towerCooldown = 0;
    this.storageWarning = 0;
    this.noticeCooldown = 0;
    this.spawnTimer = 1.2;
    this.spawnCount = 0;
    this.warningGiven = false;
    this.farmWarning = false;
    this.updateObstacles();
    // Four people live on the farm from day one. They wait for you to give them jobs.
    STARTING_PEOPLE.forEach((name, i) => this.s.people.push(this.makePerson(name, CAMPFIRE.x - 60 + i * 38, CAMPFIRE.y + 34)));
  }

  makePlot(spot, growth = -1) {
    return { x: spot.x, y: spot.y, growth };
  }

  // A finished field expansion tills the next plots, empty and ready to plant.
  syncPlots() {
    const want = this.stat('field', 'plots') || BUILDINGS.field.levels[0].plots;
    while (this.s.plots.length < Math.min(want, PLOT_SPOTS.length)) this.s.plots.push(this.makePlot(PLOT_SPOTS[this.s.plots.length]));
  }

  // The journal tallies each day from dawn to the end of the night.
  freshDay() {
    return { hits: 0, damage: 0, kills: 0, farmDamage: 0, harvested: 0, deaths: [], animalDeaths: [], arrivals: [], left: [] };
  }

  emit(type, extra = {}) {
    this.onEvent({ type, ...extra });
  }

  notice(text, force = false) {
    if (!force && this.noticeCooldown > 0) return;
    this.noticeCooldown = 1.5;
    this.emit('notice', { text });
  }

  start(endless = false) {
    if (this.s.mode === 'paused') return this.resume();
    if (this.s.mode === 'playing') return;
    this.reset('playing', endless);
    this.emit('phase', { name: 'day', text: endless ? 'Day 1 · Endless. How long can the farm hold?' : 'Day 1 · Make it grow. Make it home.' });
    this.notice('Hank, Mara, Teo and June are waiting for jobs. Click someone, then click where to send them.', true);
  }

  restart(endless = this.s.endless) {
    this.reset('title');
    this.start(endless);
  }

  pause() {
    if (this.s.mode === 'playing') this.s.mode = 'paused';
  }

  resume() {
    if (this.s.mode === 'paused') this.s.mode = 'playing';
  }

  // ===== The morning: journal → wheel → breakfast in the farmhouse → a new day =====

  // After three nights the same farm can keep going, night after night.
  continueEndless() {
    if (this.s.mode !== 'won') return false;
    this.s.endless = true;
    this.s.mode = 'house';
    this.morning();
    this.knockAtBreakfast();
    return true;
  }

  // Strangers knock at breakfast, so whoever is taken in can be given a job when the day is planned.
  knockAtBreakfast() {
    const s = this.s;
    if ((s.day + 1) % SURVIVOR_EVERY === 0 && s.people.length < MAX_PEOPLE && Math.random() < SURVIVOR_CHANCE && this.offerSurvivors()) s.promptReturn = 'house';
  }

  closeJournal() {
    if (this.s.mode !== 'journal') return false;
    this.s.mode = 'wheel';
    this.s.wheel = { result: null };
    return true;
  }

  // Spins the morning wheel once. Returns the slice it landed on, already applied.
  spinWheel() {
    const s = this.s;
    if (s.mode !== 'wheel' || s.wheel?.result) return null;
    const index = Math.min(WHEEL.length - 1, Math.floor(Math.random() * WHEEL.length));
    const slice = WHEEL[index];
    const result = { index, id: slice.id, label: slice.label, text: '' };
    if (slice.id === 'upgrade') {
      const prize = this.randomUpgrade();
      if (prize) {
        result.text = prize.text;
        result.upgrade = prize.id;
      } else {
        s.scrap += 20;
        result.text = 'Everything is fully upgraded, so the wheel pays 20 scrap instead.';
      }
      this.emit('sound', { name: 'jackpot' });
    } else {
      s.scrap += slice.scrap || 0;
      s.ammo += slice.ammo || 0;
      s.seeds += slice.seeds || 0;
      result.text = `${slice.label}. Better luck with the upgrade tomorrow.`;
      this.emit('sound', { name: 'buy' });
    }
    s.wheel.result = result;
    return result;
  }

  // A free level for something on the farm: a building already standing if possible, or the crops.
  randomUpgrade() {
    const s = this.s;
    const growable = Object.keys(BUILDINGS).filter(id => this.level(id) > 0 && this.level(id) < BUILDINGS[id].levels.length);
    if (s.upgrades.crops < UPGRADES.crops.levels.length) growable.push('crops');
    const pool = growable.length ? growable : Object.keys(BUILDINGS).filter(id => !this.level(id));
    if (!pool.length) return null;
    const id = pool[Math.min(pool.length - 1, Math.floor(Math.random() * pool.length))];
    if (id === 'crops') {
      const next = UPGRADES.crops.levels[s.upgrades.crops];
      s.upgrades.crops++;
      return { id, text: `Free upgrade: Crops → ${next.text}` };
    }
    const level = this.level(id);
    // A paid order for the same building is replaced by the free upgrade, so its scrap comes back.
    for (const site of s.sites.filter(other => other.building === id)) s.scrap += BUILDINGS[id].levels[site.level - 1]?.cost || 0;
    s.sites = s.sites.filter(site => site.building !== id);
    this.raise(id, true);
    return { id, text: `Free upgrade: ${BUILDINGS[id].name} ${level ? `→ level ${level + 1}` : 'raised'} · ${BUILDINGS[id].levels[level].text}` };
  }

  openHouse() {
    if (this.s.mode !== 'wheel' || !this.s.wheel?.result) return false;
    this.s.mode = 'house';
    this.morning();
    this.knockAtBreakfast();
    return true;
  }

  // Everyone wakes up in the farmhouse and has breakfast: 1 food and 1 water each.
  // Two hungry mornings in a row and a person leaves the farm.
  morning() {
    const s = this.s;
    s.today = this.freshDay();
    Object.assign(s, { zombies: [], shots: [], corpses: [], tracers: [] });
    // Every dawn brings shells, seeds and water before breakfast.
    s.ammo += DAWN_SUPPLIES.ammo;
    s.seeds += DAWN_SUPPLIES.seeds;
    const water = this.storeWater(DAWN_SUPPLIES.water) + this.storeWater(this.stat('well', 'water')) + this.storeWater(this.stat('waterTank', 'rain'));
    const fed = [];
    const hungry = [];
    const left = [];
    for (const person of [...s.people]) {
      if (person.expeditionId || person.away > 0) continue;
      if ((s.food >= 1 || this.breakfastMealAvailable?.()) && s.water >= 1) {
        if (!this.consumeBreakfastMeal?.(person)) s.food--;
        s.water--;
        person.hungry = false;
        person.hp = Math.min(person.maxHp, person.hp + 25);
        fed.push(person.name);
      } else if (person.hungry) {
        left.push(person.name);
        s.today.left.push(person.name);
        s.people = s.people.filter(other => other !== person);
      } else {
        person.hungry = true;
        hungry.push(person.name);
      }
    }
    for (const person of s.people.filter(p => !p.expeditionId && !(p.away > 0))) Object.assign(person, { inside: true, panic: false, order: null, task: null, away: 0, x: HOUSE_DOOR.x, y: HOUSE_DOOR.y + 4 });
    for (const dog of s.dogs) Object.assign(dog, { hp: dog.maxHp, out: false });
    s.breakfast = { fed, hungry, left, water, wounded: s.people.filter(person => person.hp < person.maxHp * 0.6).map(person => person.name) };
  }

  startDay() {
    if (this.s.mode !== 'house') return false;
    this.s.mode = 'playing';
    this.dawn();
    return true;
  }

  dawn() {
    const s = this.s;
    s.day++;
    s.phase = 'day';
    s.phaseTime = 0;
    s.phaseDuration = DAY_LENGTH;
    this.warningGiven = false;
    this.emit('phase', { name: 'day', text: `Day ${s.day} · Another chance to grow` });
    this.emit('sound', { name: 'day' });
  }

  // ===== Buildings, upgrades, storage =====

  level(id) {
    return this.s.buildings[id] || 0;
  }

  // A building's stat at its current level, or the fallback while it is unbuilt.
  stat(id, key, fallback = 0) {
    const level = this.level(id);
    return level ? BUILDINGS[id].levels[level - 1][key] : fallback;
  }

  upgradeStat(id, key, fallback = 0) {
    const level = this.s.upgrades[id] || 0;
    return level ? UPGRADES[id].levels[level - 1][key] : fallback;
  }

  growTime() {
    return GROW_TIME / (this.stat('well', 'growth', 1) * this.upgradeStat('crops', 'growth', 1));
  }

  // The footprint a raised building blocks. The top silo upgrade adds its twin alongside.
  footprint(id, level = this.level(id)) {
    const b = BUILDINGS[id];
    return { x: b.x, y: b.y, w: id === 'silo' && level >= 4 ? b.w + b.twin : b.w, h: b.h, kind: id };
  }

  updateObstacles() {
    const raised = Object.keys(BUILDINGS).filter(id => this.level(id) > 0 && BUILDINGS[id].solid !== false);
    this.obstacles = [...OBSTACLES, ...raised.map(id => this.footprint(id))];
    this.s.foodCap = PANTRY_SIZE + this.stat('silo', 'storage');
    this.s.waterCap = WATER_CAP + this.stat('waterTank', 'water');
    this.updateWalls();
  }

  // Zombies collide with buildings and fences; people only with buildings.
  updateWalls() {
    this.walls = [...this.obstacles, ...this.s.fences];
  }

  powered() {
    return this.level('generator') > 0 && this.s.generatorOn && this.s.gas > 0;
  }

  // Upgrades that are not buildings (better crops) can be bought any time.
  research(id) {
    const upgrade = UPGRADES[id];
    if (!upgrade || !['playing', 'paused'].includes(this.s.mode)) return false;
    const level = this.s.upgrades[id];
    const next = upgrade.levels[level];
    if (!next) return false;
    if (this.s.scrap < next.cost) {
      this.notice(`You need ${next.cost - this.s.scrap} more scrap.`, true);
      this.emit('sound', { name: 'empty' });
      return false;
    }
    this.s.scrap -= next.cost;
    this.s.upgrades[id] = level + 1;
    this.emit('sound', { name: 'build' });
    this.notice(`${upgrade.name} upgraded · ${next.text}`, true);
    return true;
  }

  storeWater(amount) {
    const stored = Math.max(0, Math.min(amount, this.s.waterCap - this.s.water));
    this.s.water += stored;
    return stored;
  }

  // Adds food up to the storage limit and returns how much actually fit.
  storeFood(amount, x, y, label) {
    const stored = Math.max(0, Math.min(amount, this.s.foodCap - this.s.food));
    this.s.food += stored;
    if (stored) this.floater(x, y, `+${stored} ${label}`, '#b7d486');
    if (stored < amount) {
      this.floater(x, y, 'Storage full', '#e0a07a');
      if (this.storageWarning <= 0) {
        this.storageWarning = 25;
        this.notice(this.level('silo') ? 'The silo is full. Upgrade it, cook, or sell food.' : 'The pantry is full. Build a silo to store more food.', true);
      }
    }
    return stored;
  }

  siteFor(id) {
    return this.s.sites.find(site => site.building === id) || null;
  }

  // Orders the next level of a building. It is paid now and built on site by people, by daylight.
  orderBuild(id) {
    const s = this.s;
    const building = BUILDINGS[id];
    if (!building || !['playing', 'paused'].includes(s.mode)) return false;
    if (this.siteFor(id)) {
      this.notice(`The ${building.name.toLowerCase()} is already being built.`, true);
      return false;
    }
    const level = this.level(id);
    const next = building.levels[level];
    if (!next) {
      this.notice(`The ${building.name.toLowerCase()} is fully upgraded.`, true);
      return false;
    }
    if (s.scrap < next.cost) {
      this.notice(`You need ${next.cost - s.scrap} more scrap.`, true);
      this.emit('sound', { name: 'empty' });
      return false;
    }
    s.scrap -= next.cost;
    const site = { id: ++this.siteId, kind: 'building', building: id, level: level + 1, progress: 0, work: buildTime(level + 1) };
    s.sites.push(site);
    this.emit('sound', { name: 'build' });
    const builders = s.people.filter(person => person.job === 'builder').length;
    this.notice(`${building.name} ${level ? `level ${level + 1}` : ''} ordered.${builders ? ' Your builders are on it.' : ' Send someone to build it, or give someone the Builder job.'}`, true);
    return site;
  }

  // A finished site: the building gains its level, or the defense goes up.
  finishSite(site) {
    const s = this.s;
    s.sites = s.sites.filter(other => other !== site);
    if (site.kind === 'building') {
      this.raise(site.building, false);
      return;
    }
    const gadget = { id: ++this.gadgetId, kind: site.gadget, ...site.rect, vertical: site.vertical, hp: GADGETS[site.gadget].hp, maxHp: GADGETS[site.gadget].hp, hurt: 0 };
    if (site.gadget === 'fence') {
      s.fences.push(gadget);
      this.updateWalls();
    } else {
      s.traps.push(gadget);
    }
    this.burst(site.rect.x + site.rect.w / 2, site.rect.y + site.rect.h / 2, '#b39b74', 10, 50);
    this.floater(site.rect.x + site.rect.w / 2, site.rect.y - 14, `${GADGETS[site.gadget].name} up`, '#b7d486');
    this.emit('sound', { name: 'fence' });
  }

  raise(id, free) {
    const building = BUILDINGS[id];
    const level = this.level(id);
    const next = building.levels[level];
    this.s.buildings[id] = level + 1;
    if (id === 'generator' && !level) this.s.gas += GENERATOR_STARTER_GAS;
    if (id === 'field') this.syncPlots();
    this.updateObstacles();
    this.syncAnimals();
    for (const person of this.s.people) this.unstick(person, 10);
    for (const zombie of this.s.zombies) this.unstick(zombie, zombie.radius);
    const spot = this.footprint(id);
    this.burst(spot.x + spot.w / 2, spot.y + spot.h / 2, '#c9b07a', 22, 90);
    this.s.shake = Math.max(this.s.shake, 2);
    if (free) return;
    this.emit('sound', { name: 'build' });
    const extra = id === 'generator' && !level ? ` · Comes with ${GENERATOR_STARTER_GAS} gasoline` : '';
    this.notice(`${building.name} ${level ? `upgraded to level ${level + 1}` : 'built'} · ${next.text}${extra}`, true);
  }

  // Moves a body standing where a building was just raised onto the nearest open ground.
  unstick(body, radius) {
    const rect = this.obstacles.find(r => circleHitsRect(body.x, body.y, radius, r));
    if (!rect) return;
    const spots = [
      { x: body.x, y: rect.y + rect.h + radius + 2 },
      { x: body.x, y: rect.y - radius - 2 },
      { x: rect.x - radius - 2, y: body.y },
      { x: rect.x + rect.w + radius + 2, y: body.y },
    ].filter(p => p.x > WORLD.left + radius + 5 && p.x < WORLD.right - radius - 5 && p.y > WORLD.top + radius + 5 && p.y < WORLD.bottom - radius - 5
      && !this.obstacles.some(r => circleHitsRect(p.x, p.y, radius, r)));
    spots.sort((a, b) => distance(a, body) - distance(b, body));
    if (spots[0]) Object.assign(body, spots[0]);
  }

  sellFood() {
    if (!['playing', 'paused'].includes(this.s.mode)) return false;
    const price = this.stat('market', 'price');
    if (!price) {
      this.notice('Build a market stall to trade food for scrap.', true);
      return false;
    }
    const amount = Math.min(5, this.s.food);
    if (!amount) {
      this.notice('No food to sell. Harvest crops or keep hens.', true);
      this.emit('sound', { name: 'empty' });
      return false;
    }
    const stall = BUILDINGS.market;
    this.s.food -= amount;
    this.s.scrap += amount * price;
    this.floater(stall.x + stall.w / 2, stall.y - 40, `+${amount * price} scrap`, '#ffd772');
    this.emit('sound', { name: 'sell' });
    this.notice(`Sold ${amount} food for ${amount * price} scrap.`, true);
    return true;
  }

  // Healing goes to the chosen person, or to whoever is hurt worst.
  patient(targetId) {
    const hurt = this.s.people.filter(person => person.hp < person.maxHp);
    return hurt.find(person => person.id === targetId) || hurt.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0] || null;
  }

  heal(person, amount) {
    person.hp = Math.min(person.maxHp, person.hp + amount);
    this.floater(person.x, person.y - 36, `+${amount} health`, '#b7d486');
    this.emit('sound', { name: 'eat' });
  }

  eat(targetId) {
    if (!['playing', 'paused'].includes(this.s.mode)) return false;
    const person = this.patient(targetId);
    if (!person) {
      this.notice('Everyone is healthy.', true);
      return false;
    }
    if (this.s.food < MEAL_COST) {
      this.notice(`A hot meal takes ${MEAL_COST} food.`, true);
      this.emit('sound', { name: 'empty' });
      return false;
    }
    this.s.food -= MEAL_COST;
    this.heal(person, 30);
    return true;
  }

  useMeds(targetId) {
    if (!['playing', 'paused'].includes(this.s.mode)) return false;
    if (this.s.meds <= 0) {
      this.notice('No meds left. Send a scout to look for some.', true);
      this.emit('sound', { name: 'empty' });
      return false;
    }
    const person = this.patient(targetId);
    if (!person) {
      this.notice('Everyone is healthy.', true);
      return false;
    }
    this.s.meds--;
    this.heal(person, 50);
    return true;
  }

  buy(kind, targetId) {
    if (!['playing', 'paused'].includes(this.s.mode)) return false;
    const goods = {
      ammo: { cost: SHOP.ammo, label: '12 shells' },
      seeds: { cost: SHOP.seeds, label: '6 seeds' },
      heal: { cost: SHOP.heal, label: '35 health' },
      repair: { cost: SHOP.repair, label: '35 farmhouse health' },
    };
    const item = goods[kind];
    if (!item) return false;
    const person = kind === 'heal' ? this.patient(targetId) : null;
    if (kind === 'heal' && !person) {
      this.notice('Everyone is healthy.', true);
      return false;
    }
    if (kind === 'repair' && this.s.farmHp >= (this.maxFarmHealth?.() ?? 100)) {
      this.notice('The farmhouse is already fully repaired.', true);
      return false;
    }
    if (this.s.scrap < item.cost) {
      this.notice(`You need ${item.cost - this.s.scrap} more scrap.`, true);
      this.emit('sound', { name: 'empty' });
      return false;
    }
    this.s.scrap -= item.cost;
    if (kind === 'ammo') this.s.ammo += 12;
    if (kind === 'seeds') this.s.seeds += 6;
    if (kind === 'heal') this.heal(person, 35);
    if (kind === 'repair') {
      this.s.farmHp = Math.min(this.maxFarmHealth?.() ?? 100, this.s.farmHp + 35);
      if (this.s.farmHp > 30) this.farmWarning = false;
    }
    this.emit('sound', { name: 'buy' });
    this.notice(`Supplies ready · +${item.label}${person ? ` for ${person.name}` : ''}`, true);
    return true;
  }

  toggleGenerator() {
    if (!this.level('generator')) {
      this.notice('Build a generator first.', true);
      return false;
    }
    this.s.generatorOn = !this.s.generatorOn;
    this.s.lit = this.powered();
    const g = BUILDINGS.generator;
    this.floater(g.x + g.w / 2, g.y - 18, this.s.generatorOn ? 'ON' : 'OFF', this.s.generatorOn ? '#ffd772' : '#e0a07a');
    this.emit('sound', { name: this.s.generatorOn ? 'generator' : 'lightsout' });
    if (this.s.generatorOn && this.s.gas <= 0) this.notice('The generator is switched on, but the tank is empty. Scouts can find gasoline.', true);
    else this.notice(this.s.generatorOn ? 'Generator on. The farm lights will burn tonight.' : 'Generator off. Saving gasoline, but the farm will be dark.', true);
    return true;
  }

  // ===== Tools =====

  toolTotal(kind) {
    return this.stat('warehouse', kind === 'gun' ? 'guns' : 'scythes');
  }

  toolsFree(kind) {
    return this.toolTotal(kind) - this.s.people.filter(person => person.tool === kind).length;
  }

  // ===== Defenses =====

  // The rectangle a gadget covers when centred on a point (snapped to the grid).
  gadgetRect(kind, x, y, vertical) {
    const spec = GADGETS[kind];
    const cx = Math.round(x / FENCE.grid) * FENCE.grid;
    const cy = Math.round(y / FENCE.grid) * FENCE.grid;
    const [w, h] = spec.rotates && vertical ? [spec.h, spec.w] : [spec.w, spec.h];
    return { x: cx - w / 2, y: cy - h / 2, w, h };
  }

  gadgetAt(rect) {
    return [...this.s.fences, ...this.s.traps].find(gadget => rectsOverlap(gadget, rect)) || null;
  }

  // Can this gadget go here? Damaged gadgets of the same kind are marked for repair instead.
  gadgetGhost(kind, x, y, vertical) {
    const s = this.s;
    const rect = this.gadgetRect(kind, x, y, vertical);
    const existing = this.gadgetAt(rect);
    const planned = s.sites.find(site => site.kind === 'gadget' && rectsOverlap(site.rect, rect));
    const repair = existing && existing.kind === kind && existing.hp < existing.maxHp ? existing : null;
    let reason = '';
    if (existing) reason = repair ? '' : 'Something is already built here';
    else if (planned) reason = 'Something is already planned here';
    else if (rect.x < WORLD.left + 10 || rect.y < WORLD.top + 10 || rect.x + rect.w > WORLD.right - 10 || rect.y + rect.h > WORLD.bottom - 10) reason = 'Too close to the edge of the world';
    else if ([...OBSTACLES, ...Object.keys(BUILDINGS).map(id => this.footprint(id))].some(r => rectsOverlap(r, rect, 4))) reason = 'Blocked by a building or lot';
    else if (s.plots.some(plot => rectsOverlap({ x: plot.x - 20, y: plot.y - 20, w: 40, h: 40 }, rect))) reason = 'Keep the crop rows clear';
    else if (s.zombies.some(zombie => circleHitsRect(zombie.x, zombie.y, zombie.radius, rect))) reason = 'Something is standing there';
    else if ((this.defenseCount?.() ?? (s.fences.length + s.traps.length + s.sites.filter(site => site.kind === 'gadget').length)) >= FENCE.max) reason = `All ${FENCE.max} defenses are placed`;
    return { kind, rect, vertical: !!vertical && GADGETS[kind].rotates, repair, valid: !reason, reason, cost: repair ? FENCE.repairCost : GADGETS[kind].cost };
  }

  // Placing a defense pays for it and leaves a blueprint for someone to build.
  placeGadget(kind, x, y, vertical) {
    const s = this.s;
    if (!GADGETS[kind] || !['playing', 'paused'].includes(s.mode)) return false;
    const ghost = this.gadgetGhost(kind, x, y, vertical);
    if (!ghost.valid) {
      this.notice(`${ghost.reason}.`);
      this.emit('sound', { name: 'empty' });
      return false;
    }
    if (s.scrap < ghost.cost) {
      this.notice(`You need ${ghost.cost - s.scrap} more scrap.`, true);
      this.emit('sound', { name: 'empty' });
      return false;
    }
    s.scrap -= ghost.cost;
    if (ghost.repair) {
      ghost.repair.repairPlanned = true;
      this.floater(ghost.rect.x + ghost.rect.w / 2, ghost.rect.y - 14, 'Marked for repair', '#ffd772');
      this.emit('sound', { name: 'select' });
      return true;
    }
    const site = { id: ++this.siteId, kind: 'gadget', gadget: kind, rect: ghost.rect, vertical: ghost.vertical, progress: 0, work: GADGETS[kind].work };
    s.sites.push(site);
    this.emit('sound', { name: 'select' });
    return site;
  }

  // Takes a defense (or its blueprint) back for half its price.
  removeGadgetAt(x, y) {
    const s = this.s;
    if (!['playing', 'paused'].includes(s.mode)) return false;
    const point = { x: x - 4, y: y - 4, w: 8, h: 8 };
    const site = s.sites.find(other => other.kind === 'gadget' && rectsOverlap(other.rect, point));
    if (site) {
      s.sites = s.sites.filter(other => other !== site);
      s.scrap += GADGETS[site.gadget].cost;
      this.notice(`${GADGETS[site.gadget].name} cancelled · +${GADGETS[site.gadget].cost} scrap`, true);
      this.emit('sound', { name: 'sell' });
      return true;
    }
    const gadget = this.gadgetAt(point);
    if (!gadget) return false;
    // The farm boundary is repaired, never taken down.
    if (gadget.perimeter) {
      this.notice('The farm boundary stays up. Repair damaged sections from Fields & gates.', true);
      return false;
    }
    const refund = Math.floor(GADGETS[gadget.kind].cost * gadget.hp / gadget.maxHp / 2);
    s.scrap += refund;
    s.fences = s.fences.filter(other => other !== gadget);
    s.traps = s.traps.filter(other => other !== gadget);
    this.updateWalls();
    this.emit('sound', { name: 'sell' });
    this.notice(`${GADGETS[gadget.kind].name} taken down · +${refund} scrap`, true);
    return true;
  }

  damageGadget(gadget, damage) {
    gadget.hp -= damage;
    gadget.hurt = 0.2;
    this.burst(gadget.x + gadget.w / 2, gadget.y + gadget.h / 2, '#a08a5c', 3, 40);
    if (gadget.hp > 0) return;
    this.s.fences = this.s.fences.filter(other => other !== gadget);
    this.s.traps = this.s.traps.filter(other => other !== gadget);
    if (gadget.kind === 'fence' || gadget.kind === 'gate') this.updateWalls();
    this.burst(gadget.x + gadget.w / 2, gadget.y + gadget.h / 2, '#8b7851', 14, 80);
    this.emit('sound', { name: 'fencebreak' });
    if (this.fenceWarning <= 0 && gadget.kind !== 'mine') {
      this.fenceWarning = 6;
      this.notice(gadget.kind === 'fence' ? 'A fence gave way!' : `A ${GADGETS[gadget.kind].name.toLowerCase()} is worn out.`, true);
    }
  }

  // Traps hurt and slow the zombies that walk over them.
  runTraps(zombie, dt) {
    zombie.wired = false;
    zombie.spikeCooldown = Math.max(0, (zombie.spikeCooldown || 0) - dt);
    for (const trap of this.s.traps) {
      if (trap.hp <= 0 || !circleHitsRect(zombie.x, zombie.y, zombie.radius * 0.7, trap)) continue;
      if (trap.kind === 'wire') {
        zombie.wired = true;
        zombie.wireTimer = (zombie.wireTimer || 0) + dt;
        if (zombie.wireTimer >= 0.5) {
          zombie.wireTimer = 0;
          this.damageZombie(zombie, 3, 0, 0);
          this.damageGadget(trap, 1);
        }
      } else if (trap.kind === 'spikes' && zombie.spikeCooldown <= 0) {
        zombie.spikeCooldown = 0.6;
        this.damageZombie(zombie, 14, 0, 0);
        this.damageGadget(trap, 1);
      } else if (trap.kind === 'mine') {
        this.explode(trap.x + trap.w / 2, trap.y + trap.h / 2);
        this.damageGadget(trap, trap.hp);
      }
    }
  }

  explode(x, y) {
    for (const zombie of this.s.zombies) {
      const d = Math.hypot(zombie.x - x, zombie.y - y);
      if (d < 75) this.damageZombie(zombie, 90 * (1 - d / 150), Math.atan2(zombie.y - y, zombie.x - x), 18);
    }
    this.burst(x, y, '#f0a050', 30, 160);
    this.burst(x, y, '#5a5248', 20, 110);
    this.s.shake = Math.max(this.s.shake, 7);
    this.emit('sound', { name: 'boom' });
  }

  // ===== What is under the mouse (for selection, orders and hover info) =====

  personAt(x, y) {
    let best = null;
    let bestDistance = 18;
    for (const person of this.s.people) {
      if (person.inside || person.away > 0) continue;
      const d = Math.hypot(person.x - x, person.y - 12 - y);
      if (d < bestDistance) {
        best = person;
        bestDistance = d;
      }
    }
    return best;
  }

  zombieAt(x, y) {
    return this.s.zombies.find(zombie => zombie.hp > 0 && Math.hypot(zombie.x - x, zombie.y - 12 - y) < zombie.radius + 8) || null;
  }

  plotAt(x, y) {
    return this.s.plots.find(plot => Math.abs(plot.x - x) < 24 && Math.abs(plot.y - 8 - y) < 24) || null;
  }

  lotAt(x, y) {
    return Object.keys(BUILDINGS).find(id => (id !== 'field' || !this.plotAt(x, y)) && inRect(x, y, this.footprint(id, Math.max(1, this.siteFor(id)?.level || this.level(id))), 4)) || null;
  }

  gadgetSiteAt(x, y) {
    return this.s.sites.find(site => site.kind === 'gadget' && inRect(x, y, site.rect, 8)) || null;
  }

  builtGadgetAt(x, y) {
    return [...this.s.fences, ...this.s.traps].find(gadget => inRect(x, y, gadget, 8)) || null;
  }

  // ===== Leading people =====

  makePerson(name, x, y) {
    const id = ++this.personId;
    return {
      id, name, look: id, job: 'rest', waiting: true, tool: null,
      x, y, angle: -Math.PI / 2, walk: 0, moving: false,
      hp: 80, maxHp: 80, hurt: 0, hurtCooldown: 0, cooldown: 0, flash: 0, swing: 0,
      inside: false, away: 0, panic: false, hungry: false,
      order: null, task: null, timer: 0, waypoint: null, goal: null, routeTimer: 0,
      status: 'Waiting for a job', bubble: '',
    };
  }

  setJob(id, job) {
    const person = this.s.people.find(other => other.id === id);
    if (!person || !JOBS[job] || person.job === job) return false;
    person.job = job;
    person.waiting = false;
    person.order = null;
    person.task = null;
    person.bubble = '';
    // A tool this job doesn't need goes back to the warehouse.
    if (person.tool && JOB_TOOLS[job] !== person.tool) {
      this.floater(person.x, person.y - 34, `${TOOLS[person.tool]} returned`, '#d8d095');
      person.tool = null;
    }
    this.emit('sound', { name: 'select' });
    return true;
  }

  giveOrder(person, order) {
    person.order = order;
    person.task = null;
    person.waypoint = null;
    person.waiting = false;
    person.timer = order.type === 'plot' ? this.plotWork(person) : order.type === 'repair' ? 1.5 : 0;
  }

  clearOrders(ids) {
    for (const person of this.s.people) if (ids.includes(person.id)) person.order = null;
  }

  // Sends the chosen people to whatever was clicked: a zombie to fight, something to build or
  // repair, a crop to work, the farmhouse to shelter in, or just a place to stand.
  command(ids, x, y) {
    const s = this.s;
    const group = s.people.filter(person => ids.includes(person.id) && person.away <= 0);
    if (!group.length || !['playing', 'paused'].includes(s.mode)) return null;
    const names = listNames(group.map(person => person.name));
    const zombie = this.zombieAt(x, y);
    if (zombie) {
      group.forEach(person => this.giveOrder(person, { type: 'attack', zombieId: zombie.id }));
      this.emit('sound', { name: 'select' });
      return { type: 'attack', text: `${names}: attacking.` };
    }
    const gadgetSite = this.gadgetSiteAt(x, y);
    const lot = gadgetSite ? null : this.lotAt(x, y);
    const site = gadgetSite || (lot && this.siteFor(lot));
    if (site) {
      group.forEach(person => this.giveOrder(person, { type: 'build', siteId: site.id }));
      this.emit('sound', { name: 'select' });
      return { type: 'build', text: `${names}: off to build.` };
    }
    // A built pasture is open ground people can walk into; any other lot asks what to build.
    if (lot && !(BUILDINGS[lot].solid === false && this.level(lot))) return { type: 'lot', lot };
    const gadget = this.builtGadgetAt(x, y);
    if (gadget && gadget.hp < gadget.maxHp) {
      group.forEach(person => this.giveOrder(person, { type: 'repair', gadgetId: gadget.id }));
      return { type: 'repair', text: `${names}: off to mend the ${GADGETS[gadget.kind].name.toLowerCase()}.` };
    }
    const plot = this.plotAt(x, y);
    if (plot && this.plotNeedsWork(plot)) {
      const open = s.plots.filter(other => this.plotNeedsWork(other)).sort((a, b) => distance(a, plot) - distance(b, plot));
      group.forEach((person, i) => {
        const target = open[i];
        if (target) this.giveOrder(person, { type: 'plot', plot: target, x: target.x, y: target.y + 14 });
        else this.giveOrder(person, { type: 'move', x: plot.x + (i % 3 - 1) * 26, y: plot.y + 40 + Math.floor(i / 3) * 24 });
      });
      return { type: 'plot', text: `${names}: off to the field.` };
    }
    if (inRect(x, y, FARMHOUSE)) {
      group.forEach(person => this.giveOrder(person, { type: 'house' }));
      return { type: 'house', text: `${names}: inside the farmhouse.` };
    }
    // A loose ring around the clicked spot so a group doesn't stand on one tile.
    group.forEach((person, i) => {
      const angle = i * 2.4;
      const reach = i ? 18 + i * 6 : 0;
      this.giveOrder(person, { type: 'move', x: clamp(x + Math.cos(angle) * reach, WORLD.left + 20, WORLD.right - 20), y: clamp(y + Math.sin(angle) * reach, WORLD.top + 20, WORLD.bottom - 20) });
    });
    return { type: 'move', text: `${names}: on the way.` };
  }

  // Walks a person or animal toward a point, steering around buildings. Returns true on arrival.
  walkTo(body, target, speed, dt) {
    if (distance(body, target) < 6) return true;
    body.routeTimer -= dt;
    if (body.routeTimer <= 0 || !body.waypoint || body.goal !== target || distance(body, body.waypoint) < 5) {
      body.waypoint = nextWaypoint(body, target, 10, this.obstacles);
      body.goal = target;
      body.routeTimer = 0.5;
    }
    const dx = body.waypoint.x - body.x;
    const dy = body.waypoint.y - body.y;
    const length = Math.hypot(dx, dy) || 1;
    const stride = Math.min(length, speed * dt);
    body.angle = Math.atan2(dy, dx);
    this.moveBody(body, dx / length * stride, dy / length * stride, 10);
    body.walk += dt * 11;
    body.moving = true;
    return false;
  }

  // Ambles between random spots near a point.
  wander(body, center, spread, dt) {
    body.timer -= dt;
    if (!body.task?.wander || body.timer <= 0) {
      body.task = { wander: true, x: clamp(center.x + random(-spread, spread), WORLD.left + 20, WORLD.right - 20), y: clamp(center.y + random(-spread * 0.6, spread * 0.6), WORLD.top + 20, WORLD.bottom - 20) };
      body.timer = random(1.5, 3.5);
    }
    this.walkTo(body, body.task, 38, dt);
  }

  plotNeedsWork(plot) {
    return plot.growth >= 1 || (plot.growth < 0 && this.s.seeds > 0);
  }

  // A scythe makes field work quick; bare hands are slow.
  plotWork(person) {
    return person.tool === 'scythe' ? 0.8 : 1.8;
  }

  harvestPlot(plot) {
    const scrap = this.upgradeStat('crops', 'scrap', 5);
    plot.growth = -1;
    this.s.harvested++;
    this.s.today.harvested++;
    this.s.scrap += scrap;
    if (this.s.harvested % 2 === 0) this.s.seeds++;
    this.floater(plot.x, plot.y - 15, `+${scrap} scrap`, '#ffd772');
    this.storeFood(this.upgradeStat('crops', 'food', 1), plot.x, plot.y - 30, 'food');
    this.burst(plot.x, plot.y, '#eac75c', 12, 55);
    this.emit('sound', { name: 'harvest' });
  }

  plantPlot(plot) {
    this.s.seeds--;
    plot.growth = 0;
    this.floater(plot.x, plot.y - 12, 'Planted', '#b7d486');
    this.burst(plot.x, plot.y, '#a2c473', 6, 25);
    this.emit('sound', { name: 'plant' });
  }

  workPlot(person, plot, dt) {
    const ripe = plot.growth >= 1;
    plot.spot ||= { x: plot.x, y: plot.y + 14 };
    if (!this.walkTo(person, plot.spot, 72, dt)) {
      person.status = ripe ? 'Off to harvest' : 'Off to plant';
      return false;
    }
    person.status = ripe ? 'Harvesting' : 'Planting';
    person.angle = -Math.PI / 2;
    person.timer -= dt;
    if (person.timer > 0) return false;
    if (ripe) this.harvestPlot(plot);
    else this.plantPlot(plot);
    return true;
  }

  // Farmers harvest ripe crops first, then plant empty rows while there are seeds.
  farmWork(person, dt) {
    const s = this.s;
    if (person.task?.plot && !this.plotNeedsWork(person.task.plot)) person.task = null;
    if (!person.task?.plot) {
      const claimed = new Set(s.people.filter(other => other !== person).map(other => other.task?.plot || other.order?.plot).filter(Boolean));
      const open = s.plots.filter(plot => this.plotNeedsWork(plot) && !claimed.has(plot));
      open.sort((a, b) => (b.growth >= 1) - (a.growth >= 1) || distance(a, person) - distance(b, person));
      if (open[0]) {
        person.task = { plot: open[0] };
        person.timer = this.plotWork(person);
      }
    }
    const plot = person.task?.plot;
    if (!plot) {
      const idle = s.plots.some(other => other.growth < 0) && s.seeds <= 0;
      person.status = idle ? 'Out of seeds' : 'Waiting for the crops';
      person.bubble = idle ? 'Out of seeds' : '';
      if (idle && !this.seedAlarm) {
        this.seedAlarm = true;
        this.notice(`Out of seeds! ${person.name} can't plant until you buy more.`, true);
        this.emit('sound', { name: 'empty' });
      }
      // Idle farmhands wait along the field's edge, each at their own spot.
      this.wander(person, { x: FIELD_EDGE.x + (person.id % 4 - 1.5) * 55, y: FIELD_EDGE.y }, 20, dt);
      return;
    }
    person.bubble = '';
    if (this.workPlot(person, plot, dt)) person.task = null;
  }

  // Where a builder stands to work on a site; several builders spread along its front.
  siteSpot(site, person) {
    if (site.kind === 'gadget') return { x: site.rect.x + site.rect.w / 2 + (person.id % 3 - 1) * 14, y: site.rect.y + site.rect.h + 14 };
    const lot = this.footprint(site.building, site.level);
    return { x: lot.x + 8 + (person.id * 23) % Math.max(10, lot.w - 16), y: lot.y + lot.h + 14 };
  }

  siteName(site) {
    return site.kind === 'gadget' ? GADGETS[site.gadget].name.toLowerCase() : BUILDINGS[site.building].name.toLowerCase();
  }

  // Building happens by daylight; defenses can go up any time.
  workSite(person, site, dt) {
    person.task ||= {};
    person.task.spot ||= {};
    Object.assign(person.task.spot, this.siteSpot(site, person));
    if (!this.walkTo(person, person.task.spot, 80, dt)) {
      person.status = `Off to build the ${this.siteName(site)}`;
      return;
    }
    if (site.kind === 'building' && this.s.phase !== 'day') {
      person.status = 'Waiting for daylight to build';
      return;
    }
    person.status = `Building the ${this.siteName(site)}`;
    person.hammering = true;
    person.angle = -Math.PI / 2;
    site.progress = Math.min(1, site.progress + dt / site.work);
    if (site.progress >= 1) this.finishSite(site);
  }

  nextSite(person) {
    const day = this.s.phase === 'day';
    return this.s.sites.filter(site => site.kind === 'gadget' || day)
      .sort((a, b) => distance(this.siteSpot(a, person), person) - distance(this.siteSpot(b, person), person))[0] || null;
  }

  // Builders put up what you ordered, then mend defenses and the farmhouse.
  buildWork(person, dt) {
    const s = this.s;
    person.bubble = '';
    const site = this.nextSite(person);
    if (site) {
      this.workSite(person, site, dt);
      return;
    }
    const gadgets = [...s.fences, ...s.traps];
    const fix = person.task?.fix;
    const needed = fix === 'house' ? s.farmHp < (this.maxFarmHealth?.() ?? 100) : !!fix && gadgets.includes(fix) && fix.hp < fix.maxHp;
    if (!needed) {
      const center = gadget => ({ x: gadget.x + gadget.w / 2, y: gadget.y + gadget.h / 2 });
      const broken = gadgets.filter(gadget => gadget.hp < gadget.maxHp).sort((a, b) => distance(center(a), person) - distance(center(b), person))[0];
      if (broken) person.task = { fix: broken, x: broken.x + broken.w / 2, y: broken.y + broken.h + 14 };
      else if (s.farmHp < (this.maxFarmHealth?.() ?? 100)) person.task = { fix: 'house', x: HOUSE_DOOR.x - 50, y: HOUSE_DOOR.y + 6 };
      else if (fix) person.task = null;
      if (person.task?.fix) person.timer = 1.5;
    }
    const task = person.task;
    if (!task?.fix) {
      person.status = s.sites.length ? 'Waiting for daylight to build' : 'Nothing to build right now';
      this.wander(person, WORKBENCH, 30, dt);
      return;
    }
    const house = task.fix === 'house';
    if (!this.walkTo(person, task, 76, dt)) {
      person.status = house ? 'Off to patch the farmhouse' : 'Off to mend a defense';
      return;
    }
    person.status = house ? 'Patching the farmhouse' : 'Mending a defense';
    person.hammering = true;
    person.timer -= dt;
    if (person.timer > 0) return;
    if (house) {
      s.farmHp = Math.min(this.maxFarmHealth?.() ?? 100, s.farmHp + 3);
      this.floater(person.x, person.y - 34, '+3 farmhouse', '#b7d486');
      person.timer = 1.5;
    } else {
      task.fix.hp = task.fix.maxHp;
      task.fix.repairPlanned = false;
      this.floater(person.x, person.y - 34, 'Mended', '#b7d486');
      person.task = null;
    }
  }

  // Walks to the warehouse to pick up the tool a job needs.
  fetchTool(person, kind, dt) {
    person.status = `Fetching a ${TOOLS[kind].toLowerCase()}`;
    person.bubble = '';
    if (!this.walkTo(person, WAREHOUSE_DOOR, 90, dt)) return;
    if (this.toolsFree(kind) <= 0) return;
    person.tool = kind;
    this.floater(person.x, person.y - 34, `took a ${TOOLS[kind].toLowerCase()}`, '#ffd772');
    this.emit('sound', { name: 'select' });
  }

  // Defenders hold posts around the farmhouse at night and guard the porch by day.
  defendWork(person, dt) {
    const s = this.s;
    const night = s.phase === 'night';
    const squad = s.people.filter(other => other.job === 'defender' && !other.order);
    const index = Math.max(0, squad.indexOf(person));
    Object.assign(person, { panic: false, inside: false });
    person.bubble = person.tool === 'gun' && s.ammo <= 0 ? 'No shells!' : '';
    const [px, py] = POSTS[index % POSTS.length];
    const post = night ? { x: px, y: py } : { x: HOUSE_DOOR.x - 90 + (index % 5) * 45, y: HOUSE_DOOR.y + 46 };
    if (person.tool !== 'gun') {
      // Without a gun, a defender charges zombies that come near their post.
      const threat = s.zombies.filter(zombie => zombie.hp > 0 && distance(zombie, post) < 170).sort((a, b) => distance(a, person) - distance(b, person))[0];
      if (threat) {
        person.status = 'Fighting';
        this.walkTo(person, threat, 100, dt);
        return;
      }
    }
    // A zombie the posts can't see (behind the farmhouse, say) is hunted down instead of being left
    // to wreck the farm; once it is in sight the defender stands and fires rather than walking back.
    if (night && person.tool === 'gun' && s.ammo > 0) {
      const center = { x: FARMHOUSE.x + FARMHOUSE.w / 2, y: FARMHOUSE.y + FARMHOUSE.h / 2 };
      const near = s.zombies.filter(zombie => zombie.hp > 0 && distance(zombie, center) < 340);
      if (near.length) {
        const inSight = near.some(zombie => distance(zombie, person) < COMBAT.gun.range && clearPath(person, zombie, 0, this.obstacles));
        if (!inSight) {
          const prey = near.sort((a, b) => distance(a, person) - distance(b, person))[0];
          person.status = 'Hunting a zombie near the house';
          this.walkTo(person, prey, 105, dt);
          return;
        }
        if (distance(person, post) > 40) {
          person.status = 'Fighting';
          return;
        }
      }
    }
    person.post ||= {};
    Object.assign(person.post, post);
    if (distance(person, person.post) > 12) this.walkTo(person, person.post, night ? 110 : 70, dt);
    person.status = person.bubble ? 'Out of shells!' : night ? 'Holding a post by the house' : 'Standing guard by the porch';
  }

  scoutWork(person, dt) {
    const s = this.s;
    const daylightLeft = s.phaseDuration - s.phaseTime;
    person.cooldown2 = Math.max(0, (person.cooldown2 || 0) - dt);
    person.bubble = '';
    if (person.task?.leaving) {
      person.status = 'Heading out to scout';
      if (this.walkTo(person, ROAD_EXIT, 82, dt)) {
        person.away = Math.min(random(30, 50), daylightLeft - 12);
        person.task = null;
        this.floater(ROAD_EXIT.x, ROAD_EXIT.y - 30, `${person.name} left to scout`, '#d8d095');
      }
      return;
    }
    // A scout only sets out with time to get back before dark.
    if (person.cooldown2 <= 0 && daylightLeft > 35) {
      person.task = { leaving: true };
      return;
    }
    person.status = daylightLeft > 35 ? 'Resting between trips' : 'Waiting for first light';
    this.wander(person, CAMPFIRE, 30, dt);
  }

  rollLoot() {
    const roll = Math.random();
    return {
      gas: roll < 0.15 ? 0 : roll < 0.7 ? 1 : 2,
      meds: Math.random() < 0.35 ? 1 : 0,
      cans: 1 + Math.floor(Math.random() * 3),
      water: 1 + Math.floor(Math.random() * 3),
    };
  }

  scoutReturns(person) {
    const s = this.s;
    const loot = this.rollLoot();
    person.away = 0;
    person.cooldown2 = 5;
    person.task = null;
    Object.assign(person, { x: ROAD_EXIT.x, y: ROAD_EXIT.y });
    s.gas += loot.gas;
    s.meds += loot.meds;
    const water = this.storeWater(loot.water);
    const cans = this.storeFood(loot.cans, ROAD_EXIT.x, ROAD_EXIT.y - 44, 'canned food');
    const found = [loot.gas && `${loot.gas} gasoline`, loot.meds && `${loot.meds} meds`, cans && `${cans} canned food`, water && `${water} water`].filter(Boolean);
    if (!found.length) found.push('nothing useful');
    this.floater(ROAD_EXIT.x, ROAD_EXIT.y - 30, `${person.name} is back`, '#ffd772');
    this.notice(`${person.name} is back from scouting with ${listNames(found)}.`, true);
    this.emit('sound', { name: 'scout' });
  }

  // Anyone holding a weapon fights back: shotguns at range (using the farm's shells), scythes and
  // fists up close. An attack order picks the target; otherwise the nearest zombie in reach.
  personFight(person) {
    const s = this.s;
    if (person.cooldown > 0) return false;
    const weapon = COMBAT[person.tool || 'fists'];
    const reach = zombie => distance(zombie, person) - zombie.radius;
    const canHit = zombie => zombie.hp > 0 && reach(zombie) < weapon.range && (person.tool !== 'gun' || clearPath(person, zombie, 0, this.obstacles));
    let target = person.order?.type === 'attack' ? s.zombies.find(zombie => zombie.id === person.order.zombieId) : null;
    if (!target || !canHit(target)) {
      target = null;
      let best = Infinity;
      for (const zombie of s.zombies) {
        if (canHit(zombie) && reach(zombie) < best) {
          target = zombie;
          best = reach(zombie);
        }
      }
    }
    if (!target) return false;
    person.angle = Math.atan2(target.y - person.y, target.x - person.x);
    if (person.tool === 'gun') {
      if (s.ammo <= 0) {
        person.cooldown = 0.5;
        if (!this.shellAlarm) {
          this.shellAlarm = true;
          this.notice('Out of shells! Your shotguns are useless. Buy shells or build a workshop.', true);
          this.emit('sound', { name: 'empty' });
        }
        return false;
      }
      s.ammo--;
      person.flash = 0.08;
      s.shots.push({ x1: person.x + Math.cos(person.angle) * 14, y1: person.y - 10 + Math.sin(person.angle) * 14, x2: target.x, y2: target.y - 10, life: 0.1 });
      this.emit('sound', { name: 'rifle' });
    } else {
      person.swing = 0.2;
      this.emit('sound', { name: 'sickle' });
    }
    person.cooldown = weapon.cooldown;
    this.damageZombie(target, weapon.damage, person.angle, person.tool === 'fists' || !person.tool ? 3 : 8);
    return true;
  }

  // Carries out a direct order. Orders last until done, replaced, or cleared at dawn.
  followOrder(person, dt) {
    const s = this.s;
    const order = person.order;
    person.bubble = '';
    if (person.inside && order.type !== 'house') Object.assign(person, { inside: false, x: HOUSE_DOOR.x, y: HOUSE_DOOR.y + 4 });
    person.panic = false;
    if (order.type === 'move') {
      person.status = this.walkTo(person, order, 95, dt) ? 'Holding position' : 'On the way';
    } else if (order.type === 'house') {
      if (person.inside) person.status = 'Staying inside';
      else if (this.walkTo(person, HOUSE_DOOR, 95, dt)) person.inside = true;
      else person.status = 'Heading inside';
    } else if (order.type === 'build') {
      const site = s.sites.find(other => other.id === order.siteId);
      if (site) this.workSite(person, site, dt);
      if (!site || !s.sites.includes(site)) person.order = null;
    } else if (order.type === 'plot') {
      if (!this.plotNeedsWork(order.plot) || this.workPlot(person, order.plot, dt)) person.order = null;
    } else if (order.type === 'attack') {
      const zombie = s.zombies.find(other => other.id === order.zombieId && other.hp > 0);
      if (!zombie) {
        person.order = null;
        return;
      }
      const gun = person.tool === 'gun';
      const inReach = distance(zombie, person) - zombie.radius < (gun ? 180 : COMBAT[person.tool || 'fists'].range - 4) && (!gun || clearPath(person, zombie, 0, this.obstacles));
      if (!inReach) this.walkTo(person, zombie, 105, dt);
      person.status = 'Attacking';
    } else if (order.type === 'repair') {
      const gadget = [...s.fences, ...s.traps].find(other => other.id === order.gadgetId);
      if (!gadget || gadget.hp >= gadget.maxHp) {
        person.order = null;
        return;
      }
      gadget.spot ||= { x: gadget.x + gadget.w / 2, y: gadget.y + gadget.h + 14 };
      if (!this.walkTo(person, gadget.spot, 80, dt)) {
        person.status = 'Off to mend a defense';
        return;
      }
      person.status = 'Mending a defense';
      person.hammering = true;
      person.timer -= dt;
      if (person.timer <= 0) {
        gadget.hp = gadget.maxHp;
        gadget.repairPlanned = false;
        this.floater(person.x, person.y - 34, 'Mended', '#b7d486');
        person.order = null;
      }
    }
  }

  hurtPerson(person, damage, angle) {
    person.hp = Math.max(0, person.hp - damage);
    person.hurt = 0.35;
    person.hurtCooldown = 0.8;
    this.s.today.hits++;
    this.s.today.damage += damage;
    this.burst(person.x, person.y, '#dc8b6b', 8, 75);
    this.moveBody(person, Math.cos(angle) * 12, Math.sin(angle) * 12, 10);
    this.emit('sound', { name: 'hurt' });
    if (person.hp > 0) return;
    this.s.people = this.s.people.filter(other => other !== person);
    this.s.today.deaths.push(person.name);
    this.burst(person.x, person.y, '#9b5a44', 16, 90);
    this.notice(`${person.name} was caught by the dead.`, true);
    this.emit('sound', { name: 'lose' });
  }

  // People work by day and sleep in the farmhouse at night, unless the lights go out.
  // Defenders and anyone on a direct order stay out.
  runPeople(dt) {
    const s = this.s;
    const night = s.phase === 'night';
    s.lit = this.powered();
    if (this.seedAlarm && s.seeds > 0) {
      this.seedAlarm = false;
      if (s.people.some(person => person.job === 'farmer')) this.notice('Fresh seeds! The farmers are back to work.', true);
    }
    if (this.shellAlarm && s.ammo > 0) this.shellAlarm = false;
    const shelterLit = this.houseLit?.() ?? s.lit;
    const panicking = night && !shelterLit && s.people.some(person => !person.away && !person.order && person.job !== 'defender');
    if (panicking && !this.panicWarned) {
      this.notice(this.level('generator') ? 'The lights are out! People are panicking outside!' : 'It is pitch dark! Without a generator, people panic outside!', true);
      this.emit('sound', { name: 'panic' });
    }
    this.panicWarned = panicking;
    for (const person of [...s.people]) {
      for (const key of ['hurt', 'hurtCooldown', 'cooldown', 'flash', 'swing']) person[key] = Math.max(0, person[key] - dt);
      person.moving = false;
      person.hammering = false;
      if (person.away > 0) {
        person.away -= dt;
        person.status = `Scouting · back in ${Math.max(1, Math.ceil(person.away))}s`;
        if (person.away <= 0 || night) this.scoutReturns(person);
        continue;
      }
      if (!person.inside) this.personFight(person);
      if (person.order) {
        this.followOrder(person, dt);
        continue;
      }
      const wants = JOB_TOOLS[person.job];
      if (wants && person.tool !== wants && this.toolsFree(wants) > 0 && (!night || person.job === 'defender')) {
        if (person.inside) Object.assign(person, { inside: false, x: HOUSE_DOOR.x, y: HOUSE_DOOR.y + 4 });
        this.fetchTool(person, wants, dt);
        continue;
      }
      if (person.job === 'defender') {
        this.defendWork(person, dt);
        continue;
      }
      if (night && shelterLit) {
        person.panic = false;
        person.bubble = '';
        if (person.inside) person.status = 'Sleeping in the farmhouse';
        else {
          person.status = 'Heading inside';
          if (this.walkTo(person, HOUSE_DOOR, 80, dt)) person.inside = true;
        }
        continue;
      }
      if (night) {
        if (!person.panic) {
          if (person.inside) Object.assign(person, { x: HOUSE_DOOR.x + random(-12, 12), y: HOUSE_DOOR.y + 6 });
          Object.assign(person, { inside: false, panic: true, task: null, timer: 0 });
        }
        person.status = 'Panicking in the dark!';
        person.bubble = '!';
        person.timer -= dt;
        if (!person.task || person.timer <= 0) {
          person.task = { x: HOUSE_DOOR.x + random(-200, 200), y: HOUSE_DOOR.y + random(-40, 220) };
          person.timer = random(1.2, 2.6);
        }
        this.walkTo(person, person.task, 100, dt);
        continue;
      }
      if (person.inside || person.panic) {
        if (person.inside) Object.assign(person, { x: HOUSE_DOOR.x, y: HOUSE_DOOR.y + 4 });
        Object.assign(person, { inside: false, panic: false, task: null, bubble: '' });
      }
      if (person.job === 'farmer') this.farmWork(person, dt);
      else if (person.job === 'builder') this.buildWork(person, dt);
      else if (person.job === 'scout') this.scoutWork(person, dt);
      else {
        person.status = person.waiting ? 'Waiting for a job' : 'Resting by the fire';
        person.bubble = person.waiting ? '?' : '';
        this.wander(person, CAMPFIRE, 36, dt);
      }
    }
  }

  // ===== Survivors at the gate =====

  offerSurvivors(count = 1 + Math.floor(Math.random() * 3)) {
    const s = this.s;
    const room = MAX_PEOPLE - s.people.length;
    if (room <= 0) return false;
    const taken = new Set(s.people.map(person => person.name));
    const names = SURVIVOR_NAMES.filter(name => !taken.has(name));
    const visitors = [];
    while (visitors.length < Math.min(count, room) && names.length) visitors.push(names.splice(Math.floor(Math.random() * names.length), 1)[0]);
    s.visitors = visitors;
    s.mode = 'prompt';
    this.emit('sound', { name: 'survivors' });
    this.emit('survivors', { names: visitors });
    return true;
  }

  answerSurvivors(accept) {
    const s = this.s;
    if (s.mode !== 'prompt' || !s.visitors) return false;
    const names = s.visitors;
    if (accept) {
      names.forEach((name, i) => {
        const person = this.makePerson(name, FIELD_EDGE.x - 18 + i * 18, FIELD_EDGE.y + 150);
        // Taken in at breakfast, they join the others inside the farmhouse.
        if (s.promptReturn === 'house') Object.assign(person, { inside: true, x: HOUSE_DOOR.x, y: HOUSE_DOOR.y + 4 });
        s.people.push(person);
      });
      const water = this.storeWater(2 * names.length);
      s.today.arrivals.push(...names);
      this.notice(`${listNames(names)} moved in${water ? ` with ${water} water` : ''}. Give them jobs.`, true);
    } else {
      this.notice(`You turned ${listNames(names)} away. The road swallows them.`, true);
    }
    s.visitors = null;
    s.mode = s.promptReturn || 'playing';
    s.promptReturn = null;
    this.observeHouse?.();
    return true;
  }

  // ===== Animals =====

  // Raising or upgrading the pasture and doghouse brings the animals that go with them.
  syncAnimals() {
    const s = this.s;
    while (s.dogs.length < this.stat('doghouse', 'dogs')) {
      const house = BUILDINGS.doghouse;
      s.dogs.push(this.makeAnimal('dog', house.x + house.w / 2 - s.dogs.length * 16, house.y + house.h + 14, { name: DOG_NAMES[s.dogs.length] || 'Pup', hp: 60 }));
    }
    while (s.cows.length < this.stat('pasture', 'cows')) this.addCow();
  }

  makeAnimal(species, x, y, extra = {}) {
    return {
      id: ++this.animalId, species, x, y, hp: extra.hp || 50, maxHp: extra.hp || 50, angle: 0, walk: random(0, TAU), moving: false,
      hurt: 0, hurtCooldown: 0, cooldown: 0, timer: 0, task: null, waypoint: null, goal: null, routeTimer: 0,
      inside: false, out: false, ...extra,
    };
  }

  addCow() {
    const pasture = BUILDINGS.pasture;
    const cow = this.makeAnimal('cow', pasture.x + random(30, pasture.w - 30), pasture.y + random(40, pasture.h - 20));
    cow.milkTimer = random(0, 10);
    this.s.cows.push(cow);
    return cow;
  }

  buyCow() {
    const s = this.s;
    if (!['playing', 'paused'].includes(s.mode) || !this.level('pasture')) return false;
    if (s.cows.length >= this.stat('pasture', 'cows')) {
      this.notice('The pasture is full. Upgrade it for more cows.', true);
      return false;
    }
    if (s.scrap < SHOP.cow) {
      this.notice(`You need ${SHOP.cow - s.scrap} more scrap.`, true);
      this.emit('sound', { name: 'empty' });
      return false;
    }
    s.scrap -= SHOP.cow;
    this.addCow();
    this.emit('sound', { name: 'buy' });
    this.notice('A new cow joins the herd.', true);
    return true;
  }

  inPasture(body) {
    const p = BUILDINGS.pasture;
    return body.x > p.x + 8 && body.x < p.x + p.w - 8 && body.y > p.y + 8 && body.y < p.y + p.h - 8;
  }

  hurtAnimal(animal, damage, angle) {
    animal.hp = Math.max(0, animal.hp - damage);
    animal.hurt = 0.35;
    animal.hurtCooldown = 0.8;
    this.burst(animal.x, animal.y, '#dc8b6b', 6, 70);
    this.moveBody(animal, Math.cos(angle) * 10, Math.sin(angle) * 10, 10);
    if (animal.hp > 0) return;
    if (animal.species === 'dog') {
      // Dogs are too stubborn to die. They limp home and are back on their feet at dawn.
      const house = BUILDINGS.doghouse;
      Object.assign(animal, { out: true, x: house.x + house.w / 2, y: house.y + house.h + 10, task: null });
      this.notice(`${animal.name} is hurt and limps back to the doghouse.`, true);
      return;
    }
    this.s.cows = this.s.cows.filter(other => other !== animal);
    this.s.today.animalDeaths.push('a cow');
    this.burst(animal.x, animal.y, '#9b5a44', 14, 90);
    this.notice('The dead got one of your cows!', true);
    this.emit('sound', { name: 'lose' });
  }

  animalCount() {
    return this.s.dogs.length + this.s.cows.length + (this.level('coop') ? this.stat('coop', 'hens') : 3);
  }

  // Cows graze and give milk by day and sleep in the barn at night. Dogs guard the farmhouse.
  runAnimals(dt) {
    const s = this.s;
    const dusk = s.phase === 'night' || s.phaseDuration - s.phaseTime < 14;
    const pasture = BUILDINGS.pasture;
    const milkEvery = this.stat('pasture', 'milkEvery');
    for (const animal of [...s.cows, ...s.dogs]) {
      animal.hurt = Math.max(0, animal.hurt - dt);
      animal.hurtCooldown = Math.max(0, animal.hurtCooldown - dt);
      animal.cooldown = Math.max(0, animal.cooldown - dt);
      animal.moving = false;
    }
    for (const cow of s.cows) {
      if (dusk) {
        if (!cow.inside && this.walkTo(cow, BARN_DOOR, 44, dt)) cow.inside = true;
        continue;
      }
      if (cow.inside) Object.assign(cow, { inside: false, x: BARN_DOOR.x + random(-10, 10), y: BARN_DOOR.y + 8, task: null });
      const grazing = this.inPasture(cow);
      cow.timer -= dt;
      if (!cow.task || cow.timer <= 0) {
        cow.task = { x: pasture.x + random(30, pasture.w - 30), y: pasture.y + random(40, pasture.h - 20) };
        cow.timer = random(3, 8);
      }
      this.walkTo(cow, cow.task, grazing ? 14 : 42, dt);
      if (grazing && milkEvery) {
        cow.milkTimer += dt;
        if (cow.milkTimer >= milkEvery) {
          cow.milkTimer -= milkEvery;
          this.storeFood(1, cow.x, cow.y - 28, 'milk');
        }
      }
    }
    const speed = this.stat('doghouse', 'speed', 125);
    s.dogs.forEach((dog, index) => {
      if (dog.out) return;
      const home = { x: HOUSE_DOOR.x - 50 + index * 100, y: HOUSE_DOOR.y + 64 };
      let target = null;
      let best = Infinity;
      for (const zombie of s.zombies) {
        const fromDog = distance(zombie, dog);
        if (zombie.hp > 0 && (distance(zombie, home) < 260 || fromDog < 140) && fromDog < best) {
          target = zombie;
          best = fromDog;
        }
      }
      if (target && best < target.radius + 14) {
        dog.angle = Math.atan2(target.y - dog.y, target.x - dog.x);
        if (dog.cooldown <= 0) {
          dog.cooldown = 0.7;
          this.damageZombie(target, this.stat('doghouse', 'bite'), dog.angle, 6);
          this.emit('sound', { name: 'bark' });
        }
      } else if (target) {
        this.walkTo(dog, target, speed, dt);
      } else {
        dog.timer -= dt;
        if (!dog.task || dog.timer <= 0) {
          dog.task = { x: home.x + random(-40, 40), y: home.y + random(-20, 30) };
          dog.timer = random(2, 5);
        }
        this.walkTo(dog, dog.task, 50, dt);
      }
    });
    // The barn doors swing open for anyone who walks up to them.
    const visitors = [...s.cows.filter(cow => !cow.inside), ...s.people.filter(person => !person.inside && person.away <= 0)];
    const near = visitors.some(body => distance(body, BARN_DOOR) < 72);
    s.barnOpen = clamp(s.barnOpen + (near ? 2.5 : -2.5) * dt, 0, 1);
  }

  // Raised buildings keep working in the background, day and night.
  runBuildings(dt) {
    const s = this.s;
    // The generator only burns fuel while it is switched on after dark.
    if (s.phase === 'night' && this.powered()) {
      s.gas = Math.max(0, s.gas - dt * this.stat('generator', 'burn') / NIGHT_LENGTH);
      if (s.gas === 0) {
        this.notice('The generator ran out of gasoline. The lights are out!', true);
        this.emit('sound', { name: 'lightsout' });
      }
    }
    const eggEvery = this.stat('coop', 'eggEvery');
    if (eggEvery) {
      this.eggTimer += dt;
      if (this.eggTimer >= eggEvery) {
        this.eggTimer -= eggEvery;
        const coop = BUILDINGS.coop;
        if (this.storeFood(1, coop.x + 14, coop.y + coop.h + 4, 'egg')) this.emit('sound', { name: 'egg' });
      }
    }
    const shellEvery = this.stat('workshop', 'shellEvery');
    if (shellEvery) {
      this.shellTimer += dt;
      if (this.shellTimer >= shellEvery) {
        this.shellTimer -= shellEvery;
        s.ammo++;
        const shop = BUILDINGS.workshop;
        this.floater(shop.x + shop.w / 2, shop.y - 44, '+1 shell', '#e8d391');
      }
    }
    const repairEvery = this.stat('workshop', 'repairEvery');
    if (repairEvery && s.farmHp < (this.maxFarmHealth?.() ?? 100)) {
      this.repairTimer += dt;
      if (this.repairTimer >= repairEvery) {
        this.repairTimer -= repairEvery;
        s.farmHp = Math.min(this.maxFarmHealth?.() ?? 100, s.farmHp + 1);
        if (s.farmHp > 30) this.farmWarning = false;
      }
    }
    const range = this.stat('watchtower', 'range');
    this.towerCooldown = Math.max(0, this.towerCooldown - dt);
    if (range && this.towerCooldown <= 0) {
      const tower = BUILDINGS.watchtower;
      const post = { x: tower.x + tower.w / 2, y: tower.y + tower.h / 2 };
      let target = null;
      let best = range;
      for (const zombie of s.zombies) {
        const d = distance(post, zombie);
        if (zombie.hp > 0 && d < best) {
          target = zombie;
          best = d;
        }
      }
      if (target) {
        // The lookout fires from up high, so buildings never block the shot.
        s.towerAngle = Math.atan2(target.y - post.y, target.x - post.x);
        s.tracers.push({ x: target.x, y: target.y - 10, life: 0.12 });
        this.towerCooldown = this.stat('watchtower', 'rate');
        this.damageZombie(target, this.stat('watchtower', 'damage'), s.towerAngle, 4);
        this.emit('sound', { name: 'tower' });
      }
    }
  }

  // ===== Zombies, nights and the flow of time =====

  // Each night is harder than the last; endless mode keeps the climb going past night three.
  hordeNight(day = this.s.day) {
    return day % HORDE.every === 0;
  }

  hordeNumber(day = this.s.day) {
    return Math.max(1, Math.round(day / HORDE.every));
  }

  // Nights from now until the next horde (0 means tonight).
  nightsToHorde(day = this.s.day) {
    for (let ahead = 0; ahead < 60; ahead++) if (this.hordeNight(day + ahead)) return ahead;
    return 0;
  }

  nightPlan(day) {
    if (this.hordeNight(day)) {
      const n = this.hordeNumber(day), count = HORDE.first + (n - 1) * HORDE.growth;
      return { count, every: Math.max(0.55, 42 / count), horde: true, bruteAbove: Math.max(0.65, 0.82 - (n - 1) * 0.04) };
    }
    return { count: HORDE.stragglers + Math.floor(day / HORDE.every), every: 4, horde: false, bruteAbove: 1 };
  }

  // A night is over when all of its zombies have come and gone. As a safety valve, first light
  // drives off anything left after HORDE.limit seconds, so a stuck zombie can never hold up the game.
  nightOver() {
    const s = this.s, wave = s.wave;
    if (!wave) return s.phaseTime >= s.phaseDuration;
    if (wave.spawned >= wave.total && !s.zombies.length) return true;
    if (s.phaseTime < s.phaseDuration) return false;
    if (s.zombies.length) this.notice('First light. The last of them slink back into the woods.', true);
    s.zombies = [];
    wave.spawned = wave.total;
    return true;
  }

  moveBody(body, dx, dy, radius, solids = this.obstacles) {
    const nextX = clamp(body.x + dx, WORLD.left + radius + 5, WORLD.right - radius - 5);
    if (!solids.some(rect => circleHitsRect(nextX, body.y, radius, rect))) body.x = nextX;
    const nextY = clamp(body.y + dy, WORLD.top + radius + 5, WORLD.bottom - radius - 5);
    if (!solids.some(rect => circleHitsRect(body.x, nextY, radius, rect))) body.y = nextY;
  }

  burst(x, y, color, count = 8, speed = 65) {
    for (let i = 0; i < count; i++) {
      const angle = random(0, TAU);
      const velocity = random(speed * 0.25, speed);
      const life = random(0.25, 0.65);
      this.s.particles.push({ x, y, vx: Math.cos(angle) * velocity, vy: Math.sin(angle) * velocity, life, maxLife: life, color, size: random(2, 4) });
    }
    if (this.s.particles.length > 350) this.s.particles.splice(0, this.s.particles.length - 350);
  }

  floater(x, y, text, color) {
    this.s.floaters.push({ x, y, text, color, life: 1.2 });
    if (this.s.floaters.length > 30) this.s.floaters.shift();
  }

  damageZombie(zombie, damage, angle, knockback) {
    if (zombie.hp <= 0) return;
    zombie.hp -= damage;
    zombie.hurt = 0.15;
    this.moveBody(zombie, Math.cos(angle) * knockback, Math.sin(angle) * knockback, zombie.radius, this.walls);
    this.burst(zombie.x, zombie.y, '#a6a956', 4, 60);
    if (zombie.hp <= 0) {
      this.s.corpses.push({ x: zombie.x, y: zombie.y, angle: angle || 0, kind: zombie.kind, life: 9, maxLife: 9 });
      if (this.s.corpses.length > 60) this.s.corpses.shift();
      this.s.kills++;
      this.s.today.kills++;
      this.s.scrap += 2;
      this.floater(zombie.x, zombie.y - 12, '+2', '#d8d095');
      this.burst(zombie.x, zombie.y, '#708655', 8, 75);
      this.emit('sound', { name: 'kill' });
    }
  }

  spawnZombie() {
    const edgePoint = () => {
      const angle = random(0, TAU);
      const reach = random(850, 1000);
      const point = {
        x: clamp(FARM_CENTER.x + Math.cos(angle) * reach, WORLD.left + 30, WORLD.right - 30),
        y: clamp(FARM_CENTER.y + Math.sin(angle) * reach, WORLD.top + 30, WORLD.bottom - 30),
      };
      return this.zombieEntry ? this.zombieEntry(point) : point;
    };
    let { x, y } = edgePoint();
    const day = this.s.day;
    const late = Math.max(0, day - 3);
    const roll = Math.random();
    const kind = day >= 2 && roll < 0.2 ? 'runner' : roll > this.nightPlan(day).bruteAbove ? 'brute' : 'walker';
    const maxHp = kind === 'brute' ? 110 + late * 8 : kind === 'runner' ? 34 + late * 2 : 48 + day * 3;
    const radius = kind === 'brute' ? 17 : 12;
    // Never spawn inside a building or fence, or the zombie could never move.
    for (let tries = 0; tries < 10 && this.walls.some(rect => circleHitsRect(x, y, radius, rect)); tries++) ({ x, y } = edgePoint());
    this.s.zombies.push({
      id: ++this.zombieId,
      x, y, hp: maxHp, maxHp, kind, radius,
      speed: kind === 'runner' ? 77 : kind === 'brute' ? 31 : random(34, 43) + Math.min(day, 8) * 2,
      angle: 0,
      hurt: 0,
      attackCooldown: 0.4,
      routeTimer: random(0, 0.5),
      waypoint: null,
      walk: random(0, TAU),
    });
    this.spawnCount++;
  }

  // With confirmPhases on, a finished day or night holds until the leader confirms the switch.
  holdPhase() {
    const s = this.s;
    s.phaseTime = s.phaseDuration;
    if (s.phaseReady) return;
    s.phaseReady = true;
    this.emit('sound', { name: 'warning' });
    this.notice(s.phase === 'day' ? 'The sun is down. Start the night when your people are ready.' : s.wave?.horde ? 'The horde is broken! Greet the dawn when you are ready.' : 'The night is over. Greet the dawn when you are ready.', true);
    if (s.phase === 'night') this.emit('night-cleared', { horde: !!s.wave?.horde });
  }

  // The leader's button: the day can end early, the night only once it has run its course.
  confirmPhase() {
    const s = this.s;
    if (!['playing', 'paused'].includes(s.mode) || (s.phase === 'night' && !s.phaseReady)) return false;
    if (s.mode === 'paused') s.mode = 'playing';
    this.changePhase();
    return true;
  }

  changePhase() {
    this.s.phaseReady = false;
    this.s.phaseTime = 0;
    this.warningGiven = false;
    if (this.s.phase === 'day') {
      const plan = this.nightPlan(this.s.day);
      this.s.phase = 'night';
      this.s.phaseDuration = HORDE.limit;
      this.s.wave = { total: plan.count, spawned: 0, horde: plan.horde };
      this.spawnTimer = plan.horde ? 1.5 : 3;
      this.spawnCount = 0;
      this.emit('phase', { name: 'night', horde: plan.horde, count: plan.count, text: plan.horde ? `Night ${this.s.day} · The horde: ${plan.count} zombies` : `Night ${this.s.day} · A quiet night` });
      this.emit('sound', { name: plan.horde ? 'warning' : 'night' });
      this.notice(plan.horde ? `The horde is here: ${plan.count} of them. Hold the farm.` : `A quiet night. ${plan.count} stragglers wander out of the woods.`, true);
    } else {
      this.endNight();
    }
  }

  // When the night ends the journal gets the day's page; the wheel and breakfast come next.
  endNight() {
    const s = this.s;
    this.writeJournal(false);
    Object.assign(s, { zombies: [], corpses: [], shots: [] });
    for (const person of s.people) if (person.away > 0) this.scoutReturns(person);
    if (s.day === 3 && !s.endless) {
      this.end(true);
      return;
    }
    s.mode = 'journal';
    this.emit('journal', { entry: s.journal.at(-1) });
  }

  writeJournal(fell) {
    const s = this.s;
    s.journal.push({
      day: s.day, fell, ...s.today, horde: !!s.wave?.horde, wave: s.wave?.total || 0,
      animals: this.animalCount(), survivors: s.people.length,
      totals: { kills: s.kills, harvested: s.harvested },
    });
    this.observeHouse?.();
  }

  end(won) {
    if (this.s.mode !== 'playing') return;
    if (!won) this.writeJournal(true);
    this.s.mode = won ? 'won' : 'gameover';
    this.emit('sound', { name: won ? 'win' : 'lose' });
    this.emit('end', { name: won ? 'won' : 'gameover', text: won ? 'Three nights. One home. You made it.' : this.s.farmHp <= 0 ? 'The farmhouse has fallen.' : 'Nobody is left on the farm.' });
  }

  update(dt) {
    if (this.s.mode !== 'playing' || !Number.isFinite(dt) || dt <= 0) return;
    // Substeps preserve collision and timing through occasional slow frames.
    let remaining = Math.min(dt, 0.25);
    while (remaining > 0 && this.s.mode === 'playing') {
      const step = Math.min(remaining, 1 / 45);
      this.step(step);
      remaining -= step;
    }
  }

  step(dt) {
    const s = this.s;
    s.elapsed += dt;
    s.phaseTime += dt;
    this.noticeCooldown = Math.max(0, this.noticeCooldown - dt);
    this.storageWarning = Math.max(0, this.storageWarning - dt);
    this.fenceWarning = Math.max(0, this.fenceWarning - dt);
    for (const gadget of [...s.fences, ...s.traps]) gadget.hurt = Math.max(0, gadget.hurt - dt);
    s.farmHurt = Math.max(0, s.farmHurt - dt);
    s.shake = Math.max(0, s.shake - dt * 15);

    const growTime = this.growTime();
    for (const plot of s.plots) {
      if (plot.growth >= 0 && plot.growth < 1) {
        plot.growth = Math.min(1, plot.growth + dt / (this.growTimeFor ? this.growTimeFor(plot) : growTime));
        if (plot.growth === 1) this.burst(plot.x, plot.y - 9, '#d6d790', 4, 22);
      }
    }
    this.runBuildings(dt);
    this.runPeople(dt);
    this.runAnimals(dt);

    if (s.phase === 'day' && s.phaseDuration - s.phaseTime < 8 && !this.warningGiven) {
      this.warningGiven = true;
      this.notice(this.hordeNight(s.day) ? 'Dusk is close, and the horde comes tonight. Get everyone ready.' : 'Dusk is close. Get everyone ready.', true);
      this.emit('sound', { name: 'warning' });
    }
    // The night's zombies arrive one by one until its count is reached.
    if (s.phase === 'night' && s.wave && s.wave.spawned < s.wave.total) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        s.wave.spawned++;
        this.spawnZombie();
        this.spawnTimer = this.nightPlan(s.day).every;
      }
    }
    s.zombies = s.zombies.filter(zombie => zombie.hp > 0);

    const house = FARMHOUSE;
    const farmTarget = { x: HOUSE_DOOR.x, y: house.y + house.h + 18 };
    // Prey: people outside, dogs on their feet, and cows out in the open.
    const exposed = [
      ...s.people.filter(person => !person.inside && person.away <= 0 && person.hp > 0),
      ...s.dogs.filter(dog => !dog.out),
      ...s.cows.filter(cow => !cow.inside),
    ];
    for (const zombie of s.zombies) {
      zombie.hurt = Math.max(0, zombie.hurt - dt);
      zombie.attackCooldown = Math.max(0, zombie.attackCooldown - dt);
      zombie.routeTimer -= dt;
      let prey = null;
      let preyDistance = 205;
      for (const body of exposed) {
        const d = distance(zombie, body);
        if (d < preyDistance && body.hp > 0) {
          prey = body;
          preyDistance = d;
        }
      }
      const goal = prey || farmTarget;
      const farmDistance = rectGap(zombie, house);
      this.runTraps(zombie, dt);
      if (zombie.hp <= 0) continue;
      if (prey && preyDistance < zombie.radius + 15) {
        // Only the creature being bitten gets hurt.
        zombie.angle = Math.atan2(prey.y - zombie.y, prey.x - zombie.x);
        if (zombie.attackCooldown <= 0 && prey.hurtCooldown <= 0) {
          zombie.attackCooldown = 1.1;
          const bite = zombie.kind === 'brute' ? 13 : zombie.kind === 'runner' ? 6 : 8;
          if (prey.species) this.hurtAnimal(prey, bite, zombie.angle);
          else this.hurtPerson(prey, bite, zombie.angle);
        }
      } else if (!prey && farmDistance < zombie.radius + 11) {
        zombie.angle = Math.atan2(house.y + house.h / 2 - zombie.y, house.x + house.w / 2 - zombie.x);
        if (zombie.attackCooldown <= 0) {
          const rawDamage = zombie.kind === 'brute' ? 5 : 3;
          const smash = Math.min(s.farmHp, this.houseDamage?.(rawDamage) ?? rawDamage);
          s.farmHp -= smash;
          s.today.farmDamage += smash;
          s.farmHurt = 0.3;
          zombie.attackCooldown = 1.6;
          this.burst(zombie.x + Math.cos(zombie.angle) * 14, zombie.y + Math.sin(zombie.angle) * 14, '#c6a275', 3, 30);
          if (s.farmHp <= 30 && !this.farmWarning) {
            this.farmWarning = true;
            this.notice('The farmhouse needs help! Send defenders or buy repairs.', true);
          }
        }
      } else {
        if (zombie.routeTimer <= 0 || !zombie.waypoint || distance(zombie, zombie.waypoint) < 7) {
          zombie.waypoint = nextWaypoint(zombie, goal, zombie.radius, this.obstacles);
          zombie.routeTimer = random(0.35, 0.65);
        }
        const waypoint = zombie.waypoint;
        let dx = waypoint.x - zombie.x;
        let dy = waypoint.y - zombie.y;
        const d = Math.hypot(dx, dy) || 1;
        dx /= d;
        dy /= d;
        let separationX = 0;
        let separationY = 0;
        for (const other of s.zombies) {
          if (other === zombie) continue;
          const space = Math.hypot(zombie.x - other.x, zombie.y - other.y);
          const minimum = zombie.radius + other.radius + 3;
          if (space > 0.01 && space < minimum) {
            separationX += (zombie.x - other.x) / space * (1 - space / minimum) * 32;
            separationY += (zombie.y - other.y) / space * (1 - space / minimum) * 32;
          }
        }
        zombie.angle = Math.atan2(dy, dx);
        zombie.walk += dt * (zombie.kind === 'runner' ? 12 : 6);
        const slow = (zombie.hurt > 0 ? 0.35 : 1) * (zombie.wired ? 0.45 : 1);
        this.moveBody(zombie, (dx * zombie.speed * slow + separationX) * dt, (dy * zombie.speed * slow + separationY) * dt, zombie.radius, this.walls);
        // A fence standing in the way gets smashed.
        const fence = s.fences.find(other => !other.open && rectGap(zombie, other) < zombie.radius + 2);
        if (fence && zombie.attackCooldown <= 0) {
          const toFenceX = clamp(zombie.x, fence.x, fence.x + fence.w) - zombie.x;
          const toFenceY = clamp(zombie.y, fence.y, fence.y + fence.h) - zombie.y;
          if (toFenceX * dx + toFenceY * dy > 0) {
            zombie.attackCooldown = 1;
            zombie.angle = Math.atan2(toFenceY, toFenceX);
            this.damageGadget(fence, zombie.kind === 'brute' ? 20 : zombie.kind === 'runner' ? 5 : 8);
          }
        }
      }
    }
    s.zombies = s.zombies.filter(zombie => zombie.hp > 0);

    for (const particle of s.particles) {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= 1 - dt * 3;
      particle.vy *= 1 - dt * 3;
    }
    s.particles = s.particles.filter(particle => particle.life > 0);
    for (const floater of s.floaters) { floater.life -= dt; floater.y -= dt * 24; }
    s.floaters = s.floaters.filter(floater => floater.life > 0);
    for (const shot of s.shots) shot.life -= dt;
    s.shots = s.shots.filter(shot => shot.life > 0);
    for (const corpse of s.corpses) corpse.life -= dt;
    s.corpses = s.corpses.filter(corpse => corpse.life > 0);
    for (const tracer of s.tracers) tracer.life -= dt;
    s.tracers = s.tracers.filter(tracer => tracer.life > 0);

    if (s.farmHp <= 0 || !s.people.length) this.end(false);
    else if (s.phase === 'night' ? this.nightOver() : s.phaseTime >= s.phaseDuration) {
      if (this.confirmPhases) this.holdPhase();
      else this.changePhase();
    }
  }
}
