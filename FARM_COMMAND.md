# Farm command overhaul

Open **Farm command** in the main command panel. It pauses a running farm and resumes it when closed; a farm that was already paused stays paused. The Command tab is also available in farm management at breakfast.

## Survivor priorities

Each survivor can have up to three ranked jobs in the UI. Enable **Automatic** for that survivor to use them. Once per simulation second the first job with useful work is selected; if none is needed, the survivor rests. Existing job mechanics are used. This update does not add fatigue or change farming rules.

- Builders respond to construction, house projects and repair needs.
- Defenders are needed at night or when living infected are present.
- Medics need a clinic and an injured person at home.
- Scouts need at least 35 seconds of daylight remaining.
- The existing farmer role is available in priority lists; crop and harvest mechanics are unchanged.
- Rest is always available, so put it last if you want lower priorities considered.

Direct player orders override automation. Expedition members and away scouts keep their assignments while absent. Disabling automatic work restores the job held before automation, immediately if free or once the survivor is home and no longer under a direct order. Rank choices are deduplicated. The panel explains whether someone is manually assigned, following a direct order, away, or waiting for useful priority work.

**Emergency assignments** override normal rank order only for enabled survivors who already include the relevant job: defender at night, or builder by day when the farmhouse is below 35% health. They never override direct orders.

## Construction

The queue shows completion, the scrap committed to a project, its remaining refundable value, and whether it needs daylight, a builder at home, or a safer work area.

Projects are already paid for when ordered. Moving them never charges again. **Move up/down** enables ordered construction. Priority-tagged sites still come first; within each priority tier, builders use queue order. With ordered construction disabled, the original distance-based selection remains in effect. Existing priority and cancellation controls remain on the Construction tab.

**Repairs before construction** makes automatic builders repair the farmhouse first and then safe damaged fences before continuing construction. Direct build orders still take precedence. House improvements retain their existing separate project queue; their committed resources are managed on the existing house screen.

## Defense

Assign each survivor a guard post: Automatic, North watch, South gate, East watch, West watch, or Farmhouse. A post applies when the survivor is working as a defender and has finished fetching equipment. Fixed posts hold their position rather than pursuing targets. Normal in-range combat continues.

**Fall back** rallies defenders at the farmhouse. It remains active until released, including through save/load. Direct movement or attack orders retain precedence; clear those orders if you want the affected survivor to follow fallback. Releasing fallback restores assigned posts.

The readiness checklist shows armed defenders at home, shells, farmhouse integrity, boundary gaps, generator power, and the night's forecast. New boundary gaps trigger a transition notice during nighttime simulation rather than repeated notices every frame. This is a warning system, not automatic wall reconstruction beyond the game's existing perimeter repair behavior.

## Compatibility and verification

Existing farms gain disabled automation policies, manual survivor plans, and automatic guard positions. Preferences persist in the existing save format. Invalid command settings and invalid job/post selections in saves are rejected before replacing the active farm.

Run `npm test`. The suite includes nine new command-system groups covering priority selection, direct-order precedence, expedition absence, emergencies, queue cost/order, real repair progress, guard/fallback routing, breach notifications, save round-trips, and command-panel content.

Browser visual testing remains outstanding because the environment has no usable Chromium installation. Before publishing, check desktop and narrow layouts; keyboard focus through priority selectors; automatic work on/off; paused-state restoration on Escape; queue controls; and an actual nighttime fallback with guards at different posts.
