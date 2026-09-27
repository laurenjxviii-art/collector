# VEXUM Home: Figma 01 Home port

Source repository: https://github.com/laurenjxviii-art/collector
Design-port source revision: 5a02a0e054fc066768ce8b5c35dd37ed7e451c51
GitHub integration base: 371990f6dc6c259002cffc7f7c2196432caf2d4e
Figma source: https://www.figma.com/design/4av5raWIQJqOcw09kRwRFA?node-id=2-2

The Home frame was exported in 82 targeted sections: 79 widgets, the header, greeting, and sidebar. `app/home-figma/nodes.json`, `generated.css`, and `public/home-figma` retain the generated structure, geometry, typography, and artwork. Source node IDs are retained in the DOM. No reference screenshot is used as the UI.

## Requested behavior

- A new Home starts with Overall Value, Collection Value, Hobby Spend, Calendar, and Today's Tasks.
- Add Widgets exposes all 79 Figma widget options, with search and saved visibility choices. Widget menus support removal and opening the related module.
- The outer grid uses eight columns when its available width is at least 1500px, then six, four, two, or one as space narrows. Individual widget interiors retain the generated proportions. The sidebar profile is anchored to the bottom of the viewport.
- Header controls and sidebar destinations call the existing VEXUM controls. Calendar month controls, chart ranges, task completion, and mark-all-read are functional.
- Displayed values come from the shared VEXUM workspace and existing Sell/Social loaders. Missing data remains empty or unavailable; sample chart paths and sample product images are not used as live results.
- Inter is bundled locally so the intended font works without a build-time Google Fonts request.

## Files

- `app/VexumHome.tsx`: application entry point for the port.
- `app/home-figma/Home.tsx`: generated-node renderer, controls, and live service loading.
- `app/home-figma/data.ts`: workspace-to-Figma-node bindings.
- `app/home-figma/widget-layout.ts`: starter selection and responsive widget placement.
- `app/home-figma/home.css`: responsive shell and widget-picker styles.
- `app/home-figma/generated.css`, `nodes.json`, `widgets.json`: exported reference geometry and node data.
- `tests/home.test.mjs`: layout, persistence normalization, data, task, and notification tests.

## Verification and limits

`npm test` passes six tests. `npm run build` passes compilation, type checking, and static generation. Browser checks verify starter visibility, add/remove persistence, task persistence, calendar controls, chart ranges, profile access, and no horizontal page overflow at 430, 900, 1366, 1920, and 2557 pixels. Screenshots use the repository's existing local sample workspace, not a signed-in user's cloud data. Authenticated Sell and Social loading is wired to the existing services but was not exercised with a live session.

This is a port of the desktop Home frame. On narrow phones, large widgets retain their full desktop composition and scale down; they are not a replacement for the separately designed mobile Home frames.

Reputation and payout widgets display unavailable states because the existing workspace has no corresponding live source. Historical charts render only recorded observations. This change has not been deployed to the live site.
