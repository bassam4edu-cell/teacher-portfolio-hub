# Complete portfolio report

The header print action now builds a fresh read-only snapshot of `portfolio_public_view` and `portfolio_courses_view` in a dedicated same-origin A4 document. It does not print the current screen. Existing individual report and course exports are unchanged.

## Structure

Main cover; dynamically paginated contents; About cover; introduction/objectives; CV; vision/mission/values; ethics and education policy; optional saved reflection/improvement; schedule cover and all saved schedules; criteria cover and every official criterion in ascending order, including all published report descriptions/objectives and image previews; courses cover and all public course rows in chronological order with first-page certificate previews.

Page totals are content-dependent, not fixed to the example's 15 pages. Every section starts a new page. Measured A4 bodies move cards intact and split oversized prose on word boundaries; overflow raises an explicit error instead of truncating content. Contents links/page numbers and all footer totals are filled after pagination.

## Output

The preview provides direct PDF download (pdf-lib + html2canvas already installed) and native browser print/save PDF. Direct PDF pages are rendered sequentially at 2x resolution, with A4 dimensions and restored URI/internal contents link annotations. The native browser export preserves selectable Arabic text. No additional paid service or backend change is used.

Only public display attachments are read. SHA-256 verification stays in the existing asset/document API. Original files are never altered or uploaded; previews are proportional in-memory derivatives. Certificates use page-one thumbnails, with a link to the existing course section for full documents. Failed preview reads remain explicit placeholders and a visible failure count, not silently omitted records. Private contact data is not printed.

## Files and run

- `src/lib/portfolio/portfolio-document.ts`: escaped content assembly and section model.
- `src/lib/portfolio/portfolio-export.ts`: snapshot/media loading, A4 pagination, counters/contents, PDF/print actions.
- `src/components/portfolio/portfolio-print.css`: isolated print identity and page geometry.
- `src/components/portfolio/Portfolio.tsx`: pre-opened window action, busy and error states; module loaded lazily.
- `scripts/test-portfolio-print.mjs`: long-text/contents/page overflow, all eleven criteria, public images/certificates, sensitive-contact omission, HTML escaping, native and direct mobile PDF tests using local fixtures.

Use `npm run dev -- --port 5173`, then the printer icon in the public header. Verify with `node scripts/test-portfolio-print.mjs`, `npm run typecheck`, `npm run lint`, and `npm run build`.

## Validation

A 34-page stress fixture passed: eleven criteria, 26 courses, public PDF certificate thumbnails, complete long introduction, zero overflowing page bodies, exact contents/footer numbers, escaped hostile text, no private contact, native PDF and direct PDF at a 390px viewport, and clickable PDF annotations. All 56 existing public-browser checks also passed. Typecheck/build passed; lint had zero errors and six existing Fast Refresh warnings. Independent Impeccable finish review disposition: `ship`, scoped to the new printed document and actual exported PDF raster captures.

Read-only verification against actual public site data also passed: 38 pages, eleven criteria, 44 courses with all 44 certificate previews, eight evidence image previews, correct contents and zero overflowing bodies/runtime errors. The resulting native A4 PDF was generated successfully. Counts reflect the snapshot tested and are not hardcoded in the implementation.

## Preparation progress

The print window immediately shows a responsive ministry-identity preparation panel, animated document icon, progress ring/numeric counter and five stage labels. Weighted task milestones are: resources 0–8, two public reads 8–16, processed evidence previews 16–40, processed documented-course previews 40–80, font readiness 80–84, paginated sections 84–94 and verified image decodes 94–99. Only the fully assembled document/handlers reach 100. Weights describe workflow completion, not elapsed time or transferred bytes. No timer advances the counter. Empty media stages are skipped honestly; nonfatal missing previews retain the existing explicit warning/placeholder policy.

The success check lasts 500ms after work completes, then reveals the existing document automatically and focuses its download action. Reduced motion removes animation and the success delay. Background content stays inert/unavailable to assistive technology during preparation. Fatal errors retain a readable error with same-window retry; retry updates the original page's busy state and suppresses duplicate header clicks.

`npm run test:print-progress` checks paused progress under delayed reads, monotonic completion, 100 only at readiness, empty media lists, automatic reveal, fatal failure/retry, busy-state ownership, reduced motion and 1440/390/320px layouts. The success screenshot holds only the genuine post-completion display interval in the test harness so capture cannot race removal; percentages and readiness remain unchanged.
