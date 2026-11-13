# Manuscript visual redesign

## Inspection

React 19, TypeScript, TanStack Start/Router and Vite; existing Tailwind and scoped portfolio CSS. Public sections are home, About with six tabs, weekly schedule, eleven performance criteria, reports, courses, and owner management. Navigation uses the existing hash routes. Supabase RPC feeds public settings, publications, assets and courses; administrative imports are separate. `SimpleReport`, `simple-report.css`, `simple-export.ts`, `course-export.ts` and `courses-print.css` own document output. No data or content changes are part of this redesign.

## Phase 1 — tokens (implemented)

`src/components/portfolio/design-tokens.css` defines ivory, paper, sand, taupe, AA dark taupe, slate, type families, spacing, radii, focus, shadows, durations and easing. Existing reference CSS consumes those tokens with the original colors as fallbacks on report views. The only TSX change is a stylesheet import. Original fonts remain locally hosted; no dependency added. Reduced motion and print receive explicit static token values. No automatic deployment of later phases is implied by this status.

Validation: typecheck, lint and production build; public browser contracts including report and course print checks.

## Remaining phases

2. Layout: retain every section, route, link, form and data binding. Align existing surfaces with a consistent RTL grid and mobile gutters.
3. Sections: manuscript-inspired frames and restrained paper texture, actual existing content only. Decorative ornaments must not imply official approval, stamps or signatures.
4. Motion: assess GSAP/ScrollTrigger and Lenis only when justified. Arabic SVG outlines must preserve shaping and accessible original text. Never split Arabic letters. No blocking splash or delayed LCP; no forced scrolling or pinning on mobile/reduced motion. Implementing the visual layer must preserve routing, focus and lightbox functionality.
5. Polish: responsive screenshots, keyboard, measured contrast, reduced motion, document export and performance. Lighthouse above 90 is a target, not a measured claim until tested.

Run `npm run dev -- --host 0.0.0.0 --port 5173`. Validation: `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:browser` with local server running.
