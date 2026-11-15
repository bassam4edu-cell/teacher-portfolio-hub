# Criterion reference grid

The owner supplied and pinned a navy two-column reference. Implemented within the existing React/TanStack/Vite stack; no dependency, API, stored report, document template, or permission changes.

- `CriteriaGrid.tsx`: ordered eleven-criterion grid, activity icons, fixed tone per ID, real report counts, four category filters, direct existing page navigation, description tooltips with Escape dismissal.
- `criteria-grid.css`: navy index surface, two-column desktop/one-column mobile, white compact cards, right strips, readable static tones, separate mobile metadata row, reduced motion and clean print.
- `ReferenceIdentity.tsx`: reexports new grid, retaining verification and legacy exported icon helpers.
- `Portfolio.tsx`: reuses the existing four real KPI cards beneath the criterion index.
- `scripts/test-browser.mjs`: updates the public filter contract and retains the no-search requirement.

## Data limits

Production settings were inspected read-only: zero configured targets. The public API does not expose private evidence/target completion. Do not infer a percentage or denominator from publication counts, use decorative nonzero fills, or expose private evidence to solve this.

The component's optional trusted `completion` contract accepts numeric criterion/done/total aggregates, but no caller supplies it yet. Unknown completion is shown explicitly, with an empty neutral track and no numeric progressbar accessibility state. This remains an integration limit, not a working completion service.

`public-criterion-completion.proposed.sql` is review material only, **not applied**. Automatic approval review rejected the attempted production DDL because it would permanently grant anonymous/authenticated access to a SECURITY DEFINER function without explicit authorization, after no configured targets were found. The UI uses the safe neutral fallback instead. No alternative path was used to apply that rejected change.

## Verification / run

`npm run dev` starts Vite on port 5173. Run `npm run typecheck`, `npm run lint`, `npm run build`, and `node scripts/test-browser.mjs`. Inspect `#criteria`, `#home`, and direct `#criteria/4` at widths 320, 390, 768, 1024, and 1440. Check ascending IDs, actual counts, working category filters/reset, no report search, focus-visible tooltips/Escape, no horizontal overflow, and direct page navigation. Report layouts/sharing and course search must remain intact.

## Completed checks

56 public portfolio browser checks passed, including actual-count placement, all eleven ordered criteria, category reset, fixed tones, unknown completion, keyboard tooltip dismissal, and direct criterion pages. Responsive inspection passed at 320/390/768/1024/1440px; typecheck/build passed; lint had zero errors and six existing Fast Refresh warnings. Independent Impeccable finish review disposition: `ship`, scoped to the requested criterion grid and supplied verbal/reference anatomy; no generated-comp pixel-fidelity claim.
