# Manuscript visual redesign

## Inspection

React 19, TypeScript, TanStack Start/Router and Vite; existing Tailwind and scoped portfolio CSS. Public sections are home, About with six tabs, weekly schedule, eleven performance criteria, reports, courses, and owner management. Existing hash routes and Supabase public data bindings are preserved. Document output remains owned by the unchanged `SimpleReport`, `simple-report.css`, `simple-export.ts`, `course-export.ts` and `courses-print.css`.

## Completed stages

1. Tokens: ivory, paper, sand, taupe, AA dark taupe and slate; locally hosted Arabic fonts, spacing, focus, shadows, durations and reduced-motion values in `design-tokens.css`.
2. Layout: responsive RTL section rhythm, mobile gutters, horizontal criteria, courses, schedule and sticky desktop CV profile in `manuscript-layout.css`.
3. Sections: restrained paper grain, geometric section ornaments, hairline frames and shared panels in `manuscript-surfaces.css`. Decorative geometry makes no approval, stamp or signature claim.
4. Motion: connected Arabic title shaped with HarfBuzz from the existing Aref Ruqaa font, stored as static SVG outlines with accessible original text. GSAP/ScrollTrigger enters content, draws rules and scrubs the career timeline. Lenis enhances fine-pointer desktop scrolling; mobile retains native scrolling. No blocking splash, Arabic letter splitting or mobile pinning. Runtime enhancement is lazy and disposable; failed imports leave readable content.
5. Polish: keyboard, lightbox, navigation, reduced motion and report/course printing covered by browser contracts. Five viewport widths (320, 390, 768, 1024, 1440) checked against real data without horizontal overflow or runtime errors. Print removes ornamental motion. Original report templates, assets, records, links, forms and routes are preserved.

## Validation and limits

Build and lint passed after each implementation stage. Browser suite: 49 public portfolio checks and 17 course checks, including A4 document output. Lint retains six existing react-refresh warnings and no errors. Lighthouse >90 remains a target, not a measured score. SVG ink reveal is a shaped Ruqaa treatment, not a claim of bespoke Thuluth artwork.

## Run

`npm install`

`npm run dev -- --host 0.0.0.0 --port 5173`

Checks: `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:browser` (local server running).
