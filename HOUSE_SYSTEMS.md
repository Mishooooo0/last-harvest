# Inside the farmhouse — Update 29

At breakfast, choose **House & rooms**, or click furniture on the desktop house picture. Farm life also has a **House** tab. The room controls work on phones through the House button.

## Improvements and daily life

1. **Stove:** basic, improved and efficient levels cost 4, 3 and 2 food respectively for a batch of four meals. Fractional costs for smaller batches round up.
2. **Pantry:** prepared-meal capacity rises from 16 to 24 to 32; preserved-ration capacity rises from 24 to 36 to 48.
3. **Bedrooms:** assign and swap eight beds. Travelers keep their beds. Improved beds give fed residents 3 or 6 extra health at breakfast, once per morning.
4. **Common room:** improved comfort gives fed residents 2 or 4 morning morale. The highest level also strengthens breakfast bonds.
5. **Medical cabinet:** treat a chosen resident using one existing medicine, for up to 50, 65 or 80 health. A person away from the house cannot be treated here.
6. **Door and shutters:** each has its own upgrade path. Together they can raise maximum house health from 100 to 180 and reduce incoming house damage by 20%. Purchasing repairs, builder repairs and workshop repairs all respect the new maximum. Installation adds the increase in maximum health to current health, preserving existing damage.
7. **Sink:** cooking consumes one water for every 2, 3 or 4 portions, rounded up. Drinking water is still needed at breakfast.
8. **Household breakfast:** one button prepares only the missing portions for residents currently at home. The cost is shown before cooking. The kitchen also has a four-meal batch button and access to the existing preserved-ration controls. Big appetites still consume their existing extra ordinary food.
9. **Bookshelf:** a farming notebook is available from the start. Completed expeditions bring manuals: farm/farming, gas station/building, clinic/medicine, town/combat, plus scouting. Each fed resident can study one available skill once per morning, for 2, 4 or 6 XP. Reloading does not reset the limit.
10. **Emergency battery:** purchase three levels of 45, 90 or 135 seconds capacity. A working generator charges half a second of capacity per active game second. During a nighttime outage, capacity drains one second per second and keeps ordinary residents safely sheltered with indoor light. Outdoor lamps, the clinic's night operation and fuel use continue to depend on the generator. Pausing or waiting for a phase confirmation freezes charging and draining.
11. **Personal requests:** one survivor can request a prepared meal, a blanket made with 4 scrap, or an expedition keepsake. Fulfilling it gives that survivor 6 morale and a bedside possession. Completed expeditions bring one keepsake. A completed request cannot be paid again by reloading.
12. **Indoor routines:** residents eat, talk, read, walk on the stairs and rest in their assigned beds. Actual cooking and study actions also have a visual response. These animations do not spend resources or grant extra XP/healing. Reduced motion and ambient-effects settings disable moving routines.
13. **Memory wall:** records residents, losses, the first harvest, survived hordes, expeditions, completed requests and installed improvements. The pinboard in the hallway opens the wall. Older farm journals and expedition histories seed memories and manuals on migration.

## Construction and prices

Plan improvements at breakfast. One house project can be underway at a time. Assign a builder and start the day; the builder walks to the farmhouse and installs it. Existing priority construction takes precedence. The project is visible in House and the daytime Construction screen. Cancelling refunds only its unused scrap.

All indoor upgrade prices are in the `house` section of `dist/prices.json`. Existing furnishings start at level 1; the battery starts unbuilt. No new resource currencies or crop settings were introduced.

## Integration notes for later map work

- `dist/house-systems.js`: definitions, prices table, migration/validation and engine methods. Saves keep the colony's existing version 2 and add an optional `s.house` object. Missing house data migrates; malformed present data rejects the load before replacing the active farm.
- `dist/house-ui.js`, `dist/house.css`: room controls, upgrade cards and accessible furniture hotspots; mounted through `management-ui.js`.
- `dist/house-art.js`: furnished upgrade overlays and pure routine paths, drawn by `interior-art.js`. It never changes farm state. Static room backgrounds remain cached.
- `colony.js`: calls house setup, validation, builder work, morning rewards, battery updates and memory observation. `homestead.js` uses the room's actual kitchen costs and storage capacities; its expedition completion guard also guards new manual/keepsake rewards.
- `engine.js`: house repairs use `maxFarmHealth()`, incoming house attacks use `houseDamage()`, and indoor shelter decisions use `houseLit()` separately from outdoor `powered()`. Breakfast skips traveling survivors. Arrival/journal events notify the memory system.
- `main.js`: current/max house health and proportional health bar, correct repair-button limits, and breakfast notes that distinguish portions from raw food.
- `farm-systems.js`: accepted arrivals update beds and memories. `prices.js` reads the new indoor-price group. The menu version is Update 29.
- The map geometry, fence layout, places, campaign rules and outdoor renderer were not redesigned for this update.

## Verification

`npm test` runs all 128 groups, including 17 new house-system groups. `house-browser-test.mjs` uses isolated Chrome saves and checks the natural morning, room controls, costs, treatment, study limits, requests, autosaves, Operations, phone layout, moving routines, advanced furnishings and 720p/1080p/4K/Balanced rendering. Test fixtures never change a player's browser save.

#Written by Codex
