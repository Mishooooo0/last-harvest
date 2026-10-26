# Expedition overhaul

## The loop

Choose a team on the Operations board, select a discovered destination, then pack the truck. Select an approach and a contract before departure. The farm continues its day in the background using its assigned jobs. You control the expedition squad on the site's existing tactical map.

Search containers, clear rooms, protect searchers, and decide how much risk to take before returning to the truck. Every outing still uses one farm day. Leaving early gets you home at dusk rather than granting extra farming time.

## Approach

| Approach | Search rate | Movement | Noise | Base cargo |
| --- | --- | --- | --- | --- |
| Balanced | 100% | 100% | 100% | 32 |
| Quiet entry | 85% | 90% | 50% | 32 |
| Salvage crew | 120% | 90% | 135% | 48 |

Every additional original team member adds 12 cargo weight. Rescued survivors do not expand the packed cargo capacity. Noise changes both shot hearing distance and alert gains. Quiet entry does not prevent visual detection or stop the squad shooting; existing hold-fire controls still apply.

## Contracts

| Contract | Objective | Reward on surviving return |
| --- | --- | --- |
| Supply run | Search six containers | 18 scrap |
| Site survey | Enter three buildings | 15 scrap |
| Threat reduction | Kill eight infected | 24 scrap |

Search and survey targets are capped by the number of containers or buildings on the site. Empty searches count. Rewards are added separately from cargo, once, at return. Incomplete contracts and lost squads receive no reward. A completed contract can pay after an emergency retreat, but the cargo penalty still applies.

## Cargo

Scrap and seeds weigh one each, gasoline three, and radio components four. Medical supplies, ammunition, and weapons use separate storage. Search results fill remaining cargo space; excess resources remain at that container. The container counts as searched only once.

Open **Cargo & field log** to pause, review events, discard one resource at a time, and recover nearby overflow. Recovery requires a living unit within 85 world units of the container. It cannot recover goods elsewhere on the map. Discarded cargo is permanently abandoned. Overflow left on a site is not saved for a later visit.

## Threat and extraction

Alert ranges from 0 to 100. Searching adds 3 alert and firing adds 7, multiplied by approach noise. Alert decays by 0.65 per second. Higher alert shortens the interval between incoming infected; ordinary day progression also increases pressure. The existing maximum number of active infected remains in place.

- Below 35: Unaware.
- 35–69: Searching.
- 70–100: Swarming.

Select **Extract at the truck** to cancel queued searches and rally the entire living squad. They keep firing in range but no longer stop to chase enemies. Everyone must remain inside the extraction zone for five seconds. If someone leaves the zone, the countdown resets. Newly rescued survivors encountered during withdrawal are also sent to the truck.

Warnings appear at 60 and 30 seconds remaining. At five minutes, sunset forces a retreat. If everyone is already inside the truck zone, cargo is preserved. Otherwise, 25% of each bulk resource is abandoned, rounded up. Medical supplies and weapons are retained. If nobody is alive, the expedition is lost, even at the deadline.

## Return and saves

The return report shows objective progress, contract payment, losses during retreat, casualties, recovered supplies, and unused ammunition/meds. Mission results retain contract and reward information in normal farm saves. Existing saves remain supported; no save-version migration is required. Saving during a live expedition remains unavailable, as in the original game.

## Development and validation

- `dist/expedition-rules.js`: approach definitions, contracts, cargo weights, validation, and objective calculation.
- `dist/expedition.js`: tactical simulation, cargo, alert, extraction, and results.
- `dist/colony.js`: departure validation, resource payments, rewards, and persistent results.
- `dist/expedition-ui.js` / `dist/expedition.css`: preparation, tactical status, cargo/log dialog, and debrief.
- `expedition-overhaul-test.mjs`: nine regression groups for the new mechanics.

Run `npm test`. The original expedition tests now explicitly allow the five-second extraction and position the squad at the truck when asserting penalty-free sunset return. Existing engine, colony, controls, save, and other rule tests pass.

Browser visual verification was not completed in the development environment: no Chromium executable was installed, and the browser download failed. Before publishing, play a trip on desktop and a narrow viewport; check both plan selectors, manifest keyboard navigation and Escape, paused-state restoration, cargo overflow, extraction countdown, and the return report. Balance tuning remains iterative; the constants above are an initial playable ruleset, not a claim of final balance.
