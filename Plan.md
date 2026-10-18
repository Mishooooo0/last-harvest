# Last Harvest — Survivor Traits & Special Abilities Implementation Plan

**Status:** Approved design specification; implementation pending.  
**Scope:** Six traits, one per survivor, with a passive advantage, mechanical weakness, and signature ability.  
**Out of scope:** Fatigue, new difficulty presets, deep relationship/dialogue systems, new character portraits, art rendering, or a Unity port.

## 1. Objectives and principles

Replace the four hard-coded positive/negative trait pairs with six named traits that create distinct gameplay roles. Keep the existing five XP skills (farming, building, scouting, combat, medicine), levels 0–5, morale, work assignments, and survivor cap of eight.

- One permanent trait per survivor; no trait leveling or additional trait trees.
- Each trait provides one advantage, one drawback, and one signature ability.
- A trait is separate from a **skill** (which gains XP), a **specialty** (existing work modifier), a **job** (current assignment), and **appearance**.
- Never introduce fatigue. Do not silently consume food, scrap, medicine, or ammunition.
- Active abilities must have clear UI feedback and player control; automatic abilities should be explicit in the tooltip.
- Balance all traits against the existing economy and horde pressure, not by making the opening more punishing.

## 2. Approved trait roster

| Trait ID | Display name | Passive advantage | Mechanical weakness | Signature ability |
|---|---|---|---|---|
| green_thumb | Green Thumb | +18% farming efficiency (retain original) | Fragile: maximum HP 54 (retain original) | Second Harvest |
| handyman | Handyman | +30% construction and repair efficiency | −10% firearm damage | Emergency Patch |
| sharpshooter | Sharpshooter | +25% firearm damage | −10% construction efficiency | Deadeye |
| explorer | Explorer | +30% scouting efficiency | −10% farming efficiency | Keen Eye |
| compassionate | Compassionate | +30% medical treatment efficiency | −10% damage dealt to zombies | Last Hope |
| iron_nerves | Iron Nerves | 30% reduced panic chance | −10% medical treatment efficiency | Hold the Line |

**Implementation note:** The prior Iron Nerves trait used a boolean bravery behavior, not a numerical panic probability. Investigate existing panic triggers and implement the new 30% resistance at the correct decision point; do not multiply a boolean or promise resistance where panic is scripted.

**Percentage semantics:** +30% means ×1.30, −10% means ×0.90, and Green Thumb ×1.18. Apply each modifier exactly once. Verify how the existing specialty, morale, skill, upgrades, and trait modifiers compose. In particular, firearm and zombie-damage penalties must not accidentally apply twice.

## 3. Signature abilities: rules and edge cases

### 3.1 Green Thumb — Second Harvest
- **Type:** Automatic passive.
- **Trigger:** Every fifth successful harvest **performed by that survivor**.
- **Effect:** Add +1 food to the colony inventory, with no seed cost.
- **Tracking:** Per-survivor qualifying-harvest counter (0–4), persisted across saves; no progress for harvests performed by others, canceled actions, or failed harvests.
- **Feedback:** Small +1 food floater, short notice, and an ability progress tooltip.
- **Balance:** Bonus food must not multiply through crop-yield upgrades or trigger itself recursively.

### 3.2 Handyman — Emergency Patch
- **Type:** Player-activated.
- **Target:** One existing damaged fence or gate within a documented, reachable interaction range.
- **Effect:** Restore up to 20 HP, capped at the structure's max HP, at zero scrap cost.
- **Limit:** Once per night per survivor; night-specific charge reset must survive save/reload and must not reset on pause or scene changes.
- **Validation:** Reject full-health, destroyed/removed, inaccessible, or invalid targets. The action should not create a new fence.
- **Feedback:** Target highlight, repair effect, consumed-charge indicator.

### 3.3 Sharpshooter — Deadeye
- **Type:** Player-activated, arms the next valid firearm shot.
- **Effect:** The next fired shot deals 2× its **final normal damage**, including existing firearm trait, combat skill, specialty, and weapon upgrades.
- **Cost:** One normal shell, never an additional shell.
- **Cooldown:** 45 seconds of active simulation time after the empowered shot; define a short armed-state expiration (proposal: 15 seconds) to avoid carrying an indefinite guaranteed double shot.
- **Validation:** Requires a firearm and a valid shot. Do not consume charge on a dry-fire, invalid target, paused game, or canceled shot. Cannot stack multiple Deadeye activations.
- **Feedback:** Armed icon, shot effect, cooldown indicator.

### 3.4 Explorer — Keen Eye
- **Type:** Player-activated during a playable expedition.
- **Limit:** Once per expedition per survivor.
- **Effect:** Reveal **one** nearby hidden loot cache **or** warn about a nearby dangerous area; prioritize a valid existing target rather than inventing loot.
- **Integration:** Use the expedition site's actual map, fog/reveal, loot, and danger systems. If neither kind of target exists, explain why and do **not** spend the use.
- **Persistence:** Track use by expedition ID, not by global day, and preserve it on save/load.
- **Feedback:** Brief map marker and readable event log.

### 3.5 Compassionate — Last Hope
- **Type:** Automatic emergency reaction.
- **Trigger:** Once per in-game day, when an allied survivor within **100 world units** would otherwise receive lethal damage.
- **Effect:** Prevent that lethal hit and leave the target at exactly 1 HP. This does not grant invulnerability; subsequent damage can kill the survivor.
- **Conditions:** Rescuer must be alive, present on the same playable map, and not the target. Prevent multiple Compassionate rescuers from consuming charges on the same lethal event.
- **Limit:** Once per day **per rescuer**; persist the used day across saves.
- **Validation:** Apply before the engine removes/deletes the dying survivor and before death-triggered morale changes. Check direct zombie bites, ranged acid, expedition attacks, and any other lethal paths.
- **Feedback:** Clear rescue notice, visual flash, consumed-charge indicator.
- **Balance caution:** Test whether 100 units is too generous for cramped combat spaces; avoid preventing scripted deaths unless explicitly intended.

### 3.6 Iron Nerves — Hold the Line
- **Type:** Player-activated.
- **Effect:** For 15 seconds of active simulation time, the survivor cannot panic and receives 20% less damage from zombies.
- **Limit:** Once per night per survivor. Active state expires at the end of its duration or when the survivor dies; charges do not refresh on save/reload.
- **Scope:** Zombie damage only; don't silently reduce starvation, environmental, or non-zombie damage.
- **Feedback:** Active-duration countdown, status icon, spent-charge indicator.

## 4. Trait assignment and recruitment

Initial assignment:
- Hank → Green Thumb
- Mara → Handyman
- Teo → Explorer
- June → Compassionate

Sharpshooter and Iron Nerves are available to later recruits. Future recruits receive exactly one of the six traits, chosen from the pool; duplicate traits across different survivors are permitted. Define a stable assignment strategy that works for new games and saved farms. Keep existing names, IDs, looks, jobs, equipment, and XP untouched.

**Save migration:** Existing saves store a legacy `traits` object with `good`, `weak`, and modifiers. Convert to a stable trait ID once, without repeatedly resetting HP or granting duplicate ability charges. For existing named survivors, prefer the new named assignment; for recruited survivors, map legacy traits consistently and document the mapping. Do not assume an ID always identifies the same named survivor in a loaded save.

**Fragile HP migration:** Preserve current HP safely: `maxHp = 54` and `hp = min(currentHp, 54)` for a newly assigned Green Thumb survivor; do not automatically heal survivors when switching from an old trait. Verify health handling in reset, recruitment, load, and revive/heal paths.

## 5. Data model and cooldown architecture

Use a declarative trait registry rather than branching on human-readable strings. Suggested persisted fields:

```js
person.traitId = 'green_thumb';
person.traitState = {
  harvestCount: 0,
  patchUsedNight: null,
  deadeyeReadyAt: 0,
  deadeyeArmedUntil: 0,
  keenEyeUsedExpeditionId: null,
  lastHopeUsedDay: null,
  holdLineUsedNight: null,
  holdLineActiveUntil: 0
};
```

This is a **conceptual schema**, not a mandated patch. Only persist fields relevant to each trait. Use game/simulation time for Deadeye and Hold the Line, not wall-clock time, so pause and load behave predictably. Use stable night/day identifiers rather than ambiguous time-of-day comparisons. Keep validation backward compatible.

## 6. Character UI and appearance integration

The existing game renders people through canvas code, notably `dist/renderer.js`, `dist/graphics.js`, and `dist/colony-renderer.js`. Its existing appearance palette (`LOOKS`) and job-specific clothing/accessories are independent of traits.

- Preserve existing character identities and visual style: Hank straw hat/red shirt; Mara blue; Teo ochre; June green, as documented in `opening-artwork.md`.
- In the survivor selection/management panel, show trait name, advantage, weakness, ability description, charge/cooldown, and an ability activation button when applicable.
- In-world trait/ability effects should be subtle pixel-art highlights or compact icons, not newly generated portraits.
- Keep trait visuals independent from the current job and appearance palette.
- Support keyboard/mouse interaction, clear disabled-state reasons, and concise feedback when an ability cannot activate.
- **Artwork rendering and new character drawings are explicitly deferred** pending visual review; do not generate or replace art assets in this task.

## 7. Existing systems to inspect and integrate

| Concern | Primary files to inspect |
|---|---|
| Existing trait registry, XP, bonuses, panic, injury, recruitment | `dist/colony.js`, `dist/engine.js` |
| Crop harvest attribution and food inventory | `dist/engine.js`, `dist/colony.js`, `dist/farm-systems.js` |
| Repairable defenses and gates | `dist/perimeter.js`, `dist/engine.js`, `dist/colony.js` |
| Firearms, combat damage and cooldowns | `dist/engine.js`, `dist/colony.js`, `dist/expedition.js` |
| Expedition map, reveals, hazards and loot | `dist/expedition.js`, `dist/site-art.js`, `dist/expedition-ui.js` |
| Medicine and death interception | `dist/colony.js`, `dist/engine.js`, `dist/house-systems.js` |
| Survivor panels and drawing | `dist/management-ui.js`, `dist/colony-ui.js`, `dist/renderer.js`, `dist/graphics.js` |
| Save migration, validation and state | `dist/colony.js`, save-related modules and tests |

Confirm each actual call path before implementing. Don't infer that a code path is universal because it handles one example.

## 8. Difficulty and balance

Difficulty presets and their starting batches are a **separate pending feature**. This traits plan must not alter starting scrap, shells, seeds, food, water, medicine, gasoline, zombie damage, horde counts, or food consumption.

- Green Thumb's 54 max HP is intentionally retained as the strongest drawback.
- Ensure every trait's advantage is useful but does not erase the role of the five trainable skills.
- Watch interactions between Sharpshooter + Deadeye + weapon upgrades, Handyman + Emergency Patch + defensive repair loops, and Compassionate + Last Hope in multi-hit encounters.
- Do not introduce fatigue or hidden negative events that spend resources automatically.
- Run existing automated tests and `balance-sim.mjs` before and after implementation; compare survival outcomes and explain any regressions. Do not claim results until executed.

## 9. Test plan and acceptance criteria

Add focused tests for:
1. Exactly six valid trait definitions; exactly one trait per survivor; stable starting assignments and recruit assignment.
2. Every advantage and weakness applied once with correct math, including morale, specialties, skill levels and weapon upgrades.
3. Green Thumb harvest attribution, fifth-harvest threshold, extra food, and save/load counter.
4. Emergency Patch target/range/HP cap/once-per-night enforcement and no scrap consumption.
5. Deadeye next valid shot, one shell, final-damage doubling, armed expiration, 45-second cooldown and pause behavior.
6. Keen Eye valid reveal, no invented loot, once-per-expedition, no-consume-on-failure and save/load.
7. Last Hope lethal interception at 100-unit range, one rescuer charge, 1 HP result, no invulnerability, other death paths and save/load.
8. Hold the Line panic immunity, 20% zombie damage reduction, 15-second duration, once-per-night and pause behavior.
9. Trait migration from legacy saves, no lost XP/jobs/looks, no accidental healing or reset of cooldowns.
10. UI disabled states, ability feedback, keyboard accessibility, and rendering without state mutation.
11. Existing engine, expedition, house, perimeter, and graphics regression suites.

**Definition of done:** All six traits and abilities function in normal play, existing saves migrate safely, no extra resource drain or fatigue is introduced, and documented tests pass. Any balance changes outside the approved values require separate approval.

## 10. Implementation order

1. Inspect existing trait consumers, combat/death paths, save migration, UI and expedition data; identify hidden coupling.
2. Introduce six-trait registry and migrate legacy traits; preserve named survivor identities.
3. Implement passive stat modifiers and validate against existing XP/specialty formulas.
4. Implement Second Harvest and Emergency Patch with deterministic counters.
5. Implement Deadeye and Hold the Line with simulation-time activation/cooldown handling.
6. Implement Keen Eye and Last Hope with explicit expedition and lethal-hit hooks.
7. Add trait/ability details and controls to existing character UI; no artwork replacement.
8. Add migration, unit, integration and browser tests.
9. Run baseline/regression/balance checks, document measured outcomes, and resolve failures.

## 11. Decisions and exclusions

- Six traits **total**, not six simultaneous traits per character.
- One trait grants one passive advantage, one mechanical drawback, and one special ability.
- Keep Green Thumb's original **+18% farming and Fragile 54 max HP**.
- Keep the agreed stronger bonuses on the other five traits.
- No fatigue system.
- No new artwork or character rendering work at this stage; revisit after an actual visual render.
- This document authorizes a **plan only**. It is not approval to implement game code or alter balance configuration.
