# Government digital UI redesign

## Direction contract
User pinned a modern Saudi education palette and requested removal of manuscript themes. Public browsing is Read/Experience; management is Operate. Code-led, existing React/TanStack framework and Supabase APIs remain intact. No new records, credentials, approval claims or services.

First viewport: genuine ministry logo asset, teacher identity, educational bio, separate metadata panel over green-to-blue banner. White KPI cards below show actual published reports, unique public attachments, course count and known training hours. Course loading failure displays a dash, never fabricated zero. Fixed numerical criteria order, six About tabs and existing report routes remain.

Signature behavior: direct criterion page routing, keyboard navigation, native scrolling and 280ms Web Animations API card entrances. Reduced motion disables entrances. No cursor replacement, splash, manuscript ink, GSAP timelines or Lenis scrolling. Existing report export and course print remain separate document styles.

## Stylesheet ownership
- `src/styles.css`: Tailwind/shadcn application entry and shared token import.
- `design-tokens.css`: exact palette, modern Arabic font, spacing, timing and semantic aliases.
- `gov-base.css`: consolidated lower-priority structural layer, optimized using existing Lightning CSS. Historical source files removed, not loaded in parallel.
- `gov-ui.css`: sole unlayered interface skin shared with owner forms. Domain CSS stays with About/courses/reports; document templates remain unchanged.

Removed: old folio/experience/reading/interactive/reference/education stylesheets, manuscript styles/component/title asset, paper grain and rosette assets. No public use of Ruqaa, Amiri or Reem Kufi. IBM Plex Sans Arabic and Tajawal only.

## Truth and accessibility
Bright brand green cannot support ordinary white labels at AA. Primary controls use very dark ink, and the hero has a translucent navy contrast scrim over the exact requested brand gradient. Small links use darker blue. Interface decorations never indicate ministry endorsement. Target-based documentation progress cannot be computed from the current public feed (which omits private target/evidence data); no invented bars or percentages are shown. Counts are labeled counts, not official performance scores.

## Run / validate
`npm run dev -- --host 0.0.0.0 --port 5173`
`npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:browser`.


## Direct criterion pages
Criteria cards now call the existing onOpen callback directly from both the home and full criteria lists. The side drawer, its preview component and its obsolete styles were removed. Existing `#criteria/{id}` and `#criteria/{id}/report/{id}` paths and APIs are unchanged. Criterion page header, weight, description, report count, thumbnails, empty state and back action use the current green/blue/navy token palette. Report templates and export/share remain unchanged. Browser contracts verify direct opening and browser back instead of the removed drawer.
