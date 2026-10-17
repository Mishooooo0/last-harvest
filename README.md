# Last Harvest

A zombie survival colony manager. Farm by day, defend the farmhouse by night, and keep four survivors (and whoever joins them) alive. A horde comes every third night.

This is the browser prototype, used to test ideas quickly. The rules live in plain, tested JavaScript modules so they can be carried over to the full game later.

## Play

- **Windows:** double-click `launch.vbs` (the Desktop shortcut runs it). It starts the local server and opens the game in its own Chrome window.
- **Anywhere with Node.js:** run `npm start`, then open <http://localhost:4173>.

Saves live in the browser, per address, so always open the same one.

## Change the balance

- **Prices:** edit `dist/prices.json`, save, and reload the game. A mistake in the file falls back to the built-in prices and is shown on the title screen.
- **Check the balance:** run `node balance-sim.mjs`. A bot plays 12 farms for 6 nights with the current prices.

## Tests

- `npm test` runs the rule tests (engine, upgrades, farm systems, graphics, homestead, perimeter, prices, interior, house, expeditions).
- `opening-browser-test.mjs` and `world-art-browser-test.mjs` drive a real Chrome with Playwright.

## Layout

- `dist/` is the game itself; there is no build step. `index.html` loads `main.js`, which wires the modules together:
  - **Rules:** `engine.js`, `colony.js`, `farm-systems.js`, `homestead.js`, `house-systems.js`, `perimeter.js`, `expedition.js`, `prices.js`.
  - **Drawing:** `renderer.js`, `colony-renderer.js`, `graphics.js`, `world-art.js`, `interior-art.js`, `house-art.js`, `site-art.js` (expedition sites).
  - **Screens:** `menu.js`, `opening.js`, `operations.js`, `expedition-ui.js`, `management-ui.js`, `house-ui.js`, `colony-ui.js`, `settings.js`.
- `UPDATES.md` is the full history of changes, one update after another. Nothing in it is ever deleted.
