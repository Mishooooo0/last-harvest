import {houseMealCap,housePantryCap,cookingCost} from './house-systems.js';

// Farm life is optional: resources are spent only by an explicit kitchen or breeding order.
export const HOMESTEAD = Object.freeze({
  mealCap: 16, pantryCap: 24, mealMorale: 3, bondMoraleCap: 2,
  breedDays: 2, healthyRatio: .7,
  recipes: {
    cook: { food: 2, water: 1, yield: 2 },
    preserve: { food: 3, scrap: 1, yield: 3 },
    open: { pantry: 3, yield: 3 },
    breed: { food: 2, hay: 4, yield: 1 },
  },
});

const active = s => ['playing', 'paused', 'house'].includes(s.mode);
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const integer = (x, min = 0, max = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(x) && x >= min && x <= max;
const pairKey = (a, b) => `${Math.min(a, b)}:${Math.max(a, b)}`;
const relationshipLabel = score => score >= 9 ? 'Trusted' : score >= 6 ? 'Friends' : score >= 3 ? 'Familiar' : 'Getting acquainted';

export function ensureHomestead(s) {
  s.homestead ??= {
    version: 1, meals: 0, pantry: 0, breeding: null, bonds: [],
    lastBreakfastDay: 0, lastDawnDay: s.day, lastMealDay: 0, lastMealIds: [], totalMeals: 0, births: 0,
  };
}

// Missing homestead data is an old save. Present data must be complete and safe before restore.
export function validHomestead(s) {
  if (!s || !Array.isArray(s.people) || !Array.isArray(s.missions)) return false;
  if (s.missions.some(m => m.homesteadBonded !== undefined && typeof m.homesteadBonded !== 'boolean')) return false;
  const h = s.homestead;
  if (h === undefined) return true;
  if (!object(h) || h.version !== 1 || !integer(h.meals, 0, houseMealCap(s)) || !integer(h.pantry, 0, housePantryCap(s))) return false;
  if (!['lastBreakfastDay', 'lastDawnDay', 'lastMealDay'].every(k => integer(h[k], 0, s.day))) return false;
  if (!integer(h.totalMeals) || !integer(h.births) || !Array.isArray(h.lastMealIds) || h.lastMealIds.length > 8 || h.lastMealIds.some(id => !integer(id, 1)) || new Set(h.lastMealIds).size !== h.lastMealIds.length) return false;
  if (!Array.isArray(h.bonds) || h.bonds.length > 28) return false;
  const keys = new Set();
  for (const b of h.bonds) {
    if (!object(b) || !integer(b.a, 1) || !integer(b.b, 1) || b.a >= b.b || !integer(b.score, 1, 10) || !integer(b.day, 1, s.day)) return false;
    const key = pairKey(b.a, b.b);
    if (keys.has(key)) return false;
    keys.add(key);
  }
  if (h.breeding !== null) {
    const b = h.breeding;
    if (!object(b) || !integer(b.startedDay, 1, s.day) || b.dueDay !== b.startedDay + HOMESTEAD.breedDays || !Array.isArray(b.parents) || b.parents.length !== 2 || b.parents.some(id => !integer(id, 1)) || b.parents[0] === b.parents[1]) return false;
  }
  return true;
}

export const homesteadMethods = {
  homesteadStatus() {
    const s = this.s, h = s.homestead;
    const normalCowCapacity = this.stat('pasture', 'cows');
    const nurseryCapacity = this.level('pasture') && this.level('barn') ? 1 : 0;
    const cowCapacity = normalCowCapacity + nurseryCapacity;
    const healthyCows = s.cows.filter(c => c.hp > 0 && c.hp >= c.maxHp * HOMESTEAD.healthyRatio).length;
    const action = (key, label, blocked = '') => {
      const { yield: amount, ...baseCost } = HOMESTEAD.recipes[key];
      const cost = key === 'cook' ? cookingCost(s, amount) : baseCost;
      const missing = Object.entries(cost).find(([resource, n]) => (resource === 'pantry' ? h.pantry : s[resource]) < n);
      const reason = !active(s) ? 'Continue the farm before placing an order.' : blocked || (missing ? `Needs ${missing[1]} ${missing[0]}.` : 'Ready');
      return { label, cost, yield: amount, available: reason === 'Ready', reason };
    };
    return {
      meals: h.meals, mealCap: houseMealCap(s), pantry: h.pantry, pantryCap: housePantryCap(s),
      food: s.food, water: s.water, hay: s.hay, scrap: s.scrap,
      cows: s.cows.length, normalCowCapacity, nurseryCapacity, cowCapacity, healthyCows,
      breeding: h.breeding ? { ...h.breeding, daysLeft: Math.max(0, h.breeding.dueDay - s.day), ready: s.day >= h.breeding.dueDay } : null,
      relationships: h.bonds.filter(b => s.people.some(p => p.id === b.a) && s.people.some(p => p.id === b.b)).map(b => ({ ...b, names: [b.a, b.b].map(id => s.people.find(p => p.id === id).name), label: relationshipLabel(b.score) })).sort((a, b) => b.score - a.score),
      actions: {
        cook: action('cook', 'Cook 2 meals', h.meals + 2 > houseMealCap(s) ? 'The prepared-meal shelf is full.' : ''),
        preserve: action('preserve', 'Preserve 3 rations', h.pantry + 3 > housePantryCap(s) ? 'The preserved pantry is full.' : ''),
        open: action('open', 'Open 3 rations', s.food + 3 > s.foodCap ? 'Make room for 3 food in ordinary storage.' : ''),
        breed: action('breed', 'Raise a new cow', !this.level('pasture') ? 'Build a pasture first.' : !this.level('barn') ? 'Upgrade the barn for hay and a nursery place.' : h.breeding ? 'The herd already has a breeding order.' : healthyCows < 2 ? 'Needs two cows with at least 70% health.' : s.cows.length >= cowCapacity ? 'The cattle stalls and nursery are full.' : ''),
      },
    };
  },

  homesteadOrder(key) {
    const action = this.homesteadStatus().actions[key];
    if (!action?.available) {
      const message = action?.reason || 'Unknown farm order.';
      this.notice(message, true);
      return { ok: false, message };
    }
    const s = this.s, h = s.homestead;
    for (const [resource, n] of Object.entries(action.cost)) {
      if (resource === 'pantry') h.pantry -= n;
      else s[resource] -= n;
    }
    let message;
    if (key === 'cook') {
      h.meals += action.yield;
      this.noteHouseActivity('cooking');
      message = 'Two meals prepared for breakfast. Each replaces one food and gives +3 morale.';
    } else if (key === 'preserve') {
      h.pantry += action.yield;
      message = 'Three rations sealed in the separate pantry.';
    } else if (key === 'open') {
      s.food += action.yield;
      message = 'Three pantry rations moved into usable food stores.';
    } else {
      const parents = s.cows.filter(c => c.hp > 0 && c.hp >= c.maxHp * HOMESTEAD.healthyRatio).slice(0, 2).map(c => c.id);
      h.breeding = { parents, startedDay: s.day, dueDay: s.day + HOMESTEAD.breedDays };
      message = `The herd is being tended. A new cow is expected on day ${h.breeding.dueDay}.`;
    }
    this.notice(message, true);
    this.emit('autosave');
    return { ok: true, message };
  },
  cookMeal() { return this.homesteadOrder('cook'); },
  preserveFood() { return this.homesteadOrder('preserve'); },
  openPantry() { return this.homesteadOrder('open'); },
  breedCows() { return this.homesteadOrder('breed'); },

  beginHomesteadBreakfast() {
    const h = this.s.homestead;
    this._homesteadBreakfast = h.lastBreakfastDay === this.s.day ? null : { day: this.s.day, served: [], atHome: this.s.people.filter(p => !p.expeditionId && !p.away).map(p => p.id) };
  },
  breakfastMealAvailable() { return !!this._homesteadBreakfast && this.s.homestead.meals > 0; },
  consumeBreakfastMeal(person) {
    if (!this.breakfastMealAvailable()) return false;
    this.s.homestead.meals--;
    this._homesteadBreakfast.served.push(person.id);
    return true;
  },
  finishHomesteadBreakfast() {
    const batch = this._homesteadBreakfast, s = this.s, h = s.homestead;
    this._homesteadBreakfast = null;
    if (!batch || h.lastBreakfastDay === batch.day) return;
    h.lastBreakfastDay = batch.day;
    h.lastMealDay = batch.day;
    h.lastMealIds = [...batch.served];
    h.totalMeals += batch.served.length;
    const fed = s.people.filter(p => batch.atHome.includes(p.id) && s.breakfast.fed.includes(p.name));
    this.growHomesteadBonds(fed.map(p => p.id), 1);
    for (const p of s.people) {
      const cooked = batch.served.includes(p.id) ? HOMESTEAD.mealMorale : 0;
      const company = fed.includes(p) ? this.homesteadBondMorale(p.id, fed.map(q => q.id)) : 0;
      p.morale = Math.min(100, p.morale + cooked + company);
    }
    s.breakfast.prepared = batch.served.length;
    s.breakfast.company = fed.length;
  },
  growHomesteadBonds(ids, amount) {
    const s = this.s, h = s.homestead, present = new Set(s.people.map(p => p.id));
    h.bonds = h.bonds.filter(b => present.has(b.a) && present.has(b.b));
    const group = [...new Set(ids)].filter(id => present.has(id)).sort((a, b) => a - b);
    for (let i = 0; i < group.length; i++) for (let j = i + 1; j < group.length; j++) {
      const a = group[i], b = group[j];
      let bond = h.bonds.find(x => x.a === a && x.b === b);
      if (!bond) { bond = { a, b, score: 0, day: s.day }; h.bonds.push(bond); }
      bond.score = Math.min(10, bond.score + amount);
      bond.day = s.day;
    }
  },
  homesteadBondMorale(id, company) {
    const strongest = Math.max(0, ...this.s.homestead.bonds.filter(b => (b.a === id && company.includes(b.b)) || (b.b === id && company.includes(b.a))).map(b => b.score));
    return Math.min(HOMESTEAD.bondMoraleCap, Math.floor(strongest / 4));
  },
  homesteadExpedition(m) {
    if (!m || m.stage !== 'done' || m.homesteadBonded || !this.s.missions.includes(m)) return;
    m.homesteadBonded = true;
    const team = this.s.people.filter(p => m.members.includes(p.id) && p.hp > 0);
    this.growHomesteadBonds(team.map(p => p.id), 2);
    for (const p of team) p.morale = Math.min(100, p.morale + this.homesteadBondMorale(p.id, team.map(q => q.id)));
    this.houseExpedition(m);
  },
  homesteadDawn() {
    const s = this.s, h = s.homestead;
    if (h.lastDawnDay >= s.day) return;
    h.lastDawnDay = s.day;
    const b = h.breeding;
    if (!b) return;
    if (!b.parents.every(id => s.cows.some(c => c.id === id && c.hp > 0))) {
      h.breeding = null;
      this.notice('The herd lost a parent. The breeding order has ended.', true);
      return;
    }
    if (s.day < b.dueDay) return;
    if (s.cows.length >= this.homesteadStatus().cowCapacity) {
      this.notice('The new cow needs a free cattle stall or nursery place. The herd will wait.', true);
      return;
    }
    // Clear the order before creating the animal, so repeating dawn or restoring cannot pay it twice.
    h.breeding = null;
    const cow = this.addCow();
    cow.hp = cow.maxHp = 50 + this.level('barn') * 10;
    h.births++;
    this.notice('A young cow has joined the herd. The breeding order is complete.', true);
  },
};
