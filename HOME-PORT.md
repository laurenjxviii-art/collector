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
## Control-center customization

Edit Widgets enables free grid placement with intentional empty spaces, animated collision previews while dragging, widget sizing, keyboard arrow movement, on-screen position controls, Undo, Save, and Cancel. Positions are stored per responsive column count so editing on a narrow device preserves the wider layout. Pointer capture supports mouse, pen, and touch; dragging near viewport edges scrolls the canvas. The library includes actual widget previews, categories, search, accessible selection buttons, and focus restoration. Motion respects the system reduced-motion setting. Sidebar navigation targets and text are slightly larger.

Additional validation: free placement and collision unit tests (seven tests total); browser verification of drag previews, saved gaps, keyboard moves, Undo/Cancel, resize persistence, library search focus, narrow-screen fit, and reduced motion. These checks pass against the production build.

## Phone Home (Figma "01 Home · Mobile")

Screens up to 700px wide render `app/home-figma/MobileHome.tsx`; wider screens keep the desktop control center unchanged. The phone layout is stored under its own key (`figma-01-home-mobile`), so editing Home on a phone never moves the desktop layout.

- Sizes follow the Figma frame: small is one cell, medium is one column by two rows, large is two columns by two rows. Desktop medium widgets fill the large slot at their designed proportions; Today, Upcoming Events and Portfolio Value also have the 1×2 medium layout, and Overall Value and Calendar have reflowed large layouts, all taken from the Figma phone frames.
- Mechanics: long-press a widget (or use its ⋯ menu → Edit Home) to enter edit mode; drag to reorder, tap − to remove, tap the size chip to switch sizes, Done to save. "+ Add widget" opens a bottom sheet with search, categories and Small/Medium/Large previews.
- Top bar (quick add, notifications, profile) and the dock with all ten sections call the existing VEXUM controls.
- `app/home-figma/mobile-layouts.raw.json` holds the Figma phone geometry (in desktop widget units). After changing it, run `node scripts/build-mobile-home.mjs` to regenerate `mobile-generated.css` and `mobile-layouts.json`.
- `tests/mobile-home.test.mjs` covers the starter arrangement, packing without overlaps, saved-layout normalization and size rules.
