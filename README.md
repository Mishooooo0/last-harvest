# Last Harvest

A zombie survival colony manager. Farm by day, defend the farmhouse by night, and keep four survivors (and whoever joins them) alive. A horde comes every third night.

This is the browser prototype, used to test ideas quickly. The rules live in plain, tested JavaScript modules so they can be carried over to the full game later.

## Play

- **Windows:** double-click `launch.vbs` (the Desktop shortcut runs it). It starts the local server and opens the game in its own Chrome window.
- **Anywhere with Node.js:** run `npm start`, then open <http://localhost:4173>.

Farm saves are files in the `saves/` folder next to this README, written by the game server. Git ignores that folder, so farms never go to GitHub. Copy it to keep a backup.

## Cheats

Settings → Cheats → switch on the **Cheat menu**. It has always-on cheats (nobody gets hurt, an unbreakable farmhouse, endless shells, instant building), one-off cheats (scrap, shells, seeds, food and water, meds, gasoline, healing, repairs, clearing the dead, finishing construction, a new survivor, revealing every expedition place) and a box for typing their codes. A farm that uses them is marked CHEATS and does not set an endless record.

## Change the balance

- **Prices:** edit `dist/prices.json`, save, and reload the game. A mistake in the file falls back to the built-in prices and is shown on the title screen.
- **Starting kit:** edit `dist/starting-kit.json` (scrap, shells, seeds, food, water, meds, gasoline, ripe crops, extra shotguns and scythes), save, reload, and start a new farm. Mistakes show on the title screen the same way.
- **Check the balance:** run `node balance-sim.mjs`. A bot plays 12 farms for 6 nights with the current prices and starting kit, sending expeditions on calm days. The report ends with an expedition section: survival with and without expeditions, and the average loot and danger of a trip to each place (the place numbers are `PLACES` in `dist/colony.js`).

## Tests

- `npm test` runs the rule tests (engine, upgrades, farm systems, graphics, homestead, perimeter, prices, interior, house, expeditions, starting kit, save files, cheats).
- `opening-browser-test.mjs` and `world-art-browser-test.mjs` drive a real Chrome with Playwright.

## Layout

- `dist/` is the game itself; there is no build step. `index.html` loads `main.js`, which wires the modules together:
  - **Rules:** `engine.js`, `colony.js`, `farm-systems.js`, `homestead.js`, `house-systems.js`, `perimeter.js`, `expedition.js`, `prices.js`.
  - **Drawing:** `renderer.js`, `colony-renderer.js`, `graphics.js`, `world-art.js`, `interior-art.js`, `house-art.js`, `site-art.js` (expedition sites).
  - **Screens:** `menu.js`, `opening.js`, `operations.js`, `expedition-ui.js`, `management-ui.js`, `house-ui.js`, `colony-ui.js`, `settings.js`.
- `UPDATES.md` is the full history of changes, one update after another. Nothing in it is ever deleted.

## Survival briefing

Open **Briefing** from the command panel during play or while paused. Review breakfast reserves, farmhouse health, ammunition, wounded survivors, construction staffing and armed defenders at home. Expand the first-farm checklist for starting objectives. The farm pauses during review and returns to its previous running state on close or Escape. These checks are advisory, not a guarantee of surviving a wave.

## Expedition overhaul

Expeditions now have selectable approaches and contracts, weighted cargo with recoverable overflow, rising alert from noise, and a five-second extraction at the truck. Open **Cargo & field log** on site to manage supplies. Missing the sunset deadline away from the truck costs bulk cargo. See [EXPEDITION_SYSTEM.md](EXPEDITION_SYSTEM.md) for the complete rules and validation notes.

## Farm command

Open **Farm command** to configure opt-in ranked survivor jobs, emergency assignments, construction order and repair priorities, fixed guard posts, and farmhouse fallback. The panel also shows committed construction materials and a nighttime readiness checklist. See [FARM_COMMAND.md](FARM_COMMAND.md). No fatigue system or farming overhaul is included.
