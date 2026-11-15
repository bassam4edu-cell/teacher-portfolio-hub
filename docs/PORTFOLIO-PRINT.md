# Complete portfolio report — approved layout and fast preparation

The public header printer builds a fresh, read-only snapshot through the existing public portfolio/course RPCs. No schema, permission, stored record, or original attachment is changed. Existing standalone report/course exports retain their approved templates.

## Book structure

Main cover; dynamic contents; About cover; separate designed introduction/objectives, career/CV, vision/mission/values, ethics, and education-policy pages; optional saved reflection/improvement; school-schedule cover/content; performance section cover; eleven individual criterion covers in ascending official order, each immediately followed by its reports; course section cover and complete chronological ledger.

About uses a restrained navy/green/sand editorial layout: introduction lead and numbered objective groups; two-column CV with professional sidebar and qualification/experience timeline; paired vision/mission panels and value grid; numbered ethics/policy principles. Current actual About content fits one A4 page per subsection, including CV. A compact preset adjusts spacing within readable sizes. Future unusually long content uses lossless continuation instead of clipping or deleting text.

Each criterion cover has its real number/name, saved description, and actual report/attachment count. Empty criteria have only their cover and an explicit no-published-reports message.

## Approved reports and header distinction

The existing `SimpleReport` React component is reused, not reconstructed as generic text cards. The complete report contains its original title, field boxes, description/objectives, photos, teacher/director names and bottom strip. Every report starts a new page. Its desktop geometry is retained and proportionally typeset using scoped CSS length variables, not visual transforms that can clip print fragments. Normal reports stay one page; genuinely oversized reports continue through the same field-box vocabulary, retaining text and photos.

- Outer A4 page header: ministry logo and criterion number/name. **No QR** here.
- Inner approved report header: **one QR**, caption “فتح التقرير”, pointing to that report's existing public criterion/report hash URL. No second report QR elsewhere on that page.
- Continuations retain criterion identity and one inner-header QR, with a continuation label.
- Footer: teacher and actual page/total. Contents are filled after pagination and link to criterion covers and report starts.

The print-specific assembly changes no saved report prose or original assets. Existing report duration/audience conventions remain in SimpleReport. Native print/save PDF retains selectable Arabic text; direct 2x PDF preserves clickable URI and contents annotations.

## Certificates and public routes

The course row design/order is unchanged (oldest first, real provider/date/duration). Its former thumbnail is replaced by a locally generated QR and “معاينة الشهادة”. Missing documents explicitly say “لا توجد شهادة مرفقة”. Preparing the book never calls `portfolio_course_document` or renders certificate PDFs.

`/#courses/certificate/DOCUMENT_ID` is a stable client route. It first confirms the ID belongs to a currently public course, then reads exactly that published display document through the existing SHA-verified public document RPC. It shows a PDF/image preview, direct open/download fallback, loading/error/retry, and return link. Unlisted/unpublished documents never proceed to the file read through this viewer; server permissions remain unchanged. Private originals and identity-only blur policies are preserved.

QR generation uses the free local `qrcode` library (M correction, four-module quiet zone); no remote QR service receives links or images. `jsqr` is test-only and verifies destinations.

## Preparation speed and cache

Only report-photo previews are prepared. Two bounded concurrent tasks read/checksum/resize public images. Public derived JPEG previews are cached in memory and IndexedDB, with a 64-record bound and key containing processing version, asset ID and SHA-256; changed content invalidates only its preview. Invalid cache entries are rebuilt. Unavailable/quota-blocked IndexedDB gracefully falls back. Metadata is always read fresh; no stale saved courses/reports are substituted. QR promises are reused within the current module session.

Local instrumented read-only checks on actual data measured the previous certificate-thumbnail pipeline at 54,931ms, and new uncached preparation at roughly 4.8–6.5s. These are observations, not a fixed latency promise; final production verification is separate. Technical timing/cache-hit attributes remain outside user-facing content.

## Progress

The existing responsive preparation screen remains. Weighted task milestones: static resources 0–8; public reads 8–16; completed photo/cache tasks 16–40; generated report/course QR tasks 40–80; font 80–84; paginated sections 84–94; decoded images 94–99; complete assembled document 100. No timer advances progress. A clipped staging wrapper prevents RTL A4 overflow from shifting the mobile loading screen. The brief ready check then reveals the document; reduced motion and same-window error/retry remain.

## Implementation and verification

- `portfolio-document.ts`, `about-print.ts`: escaped complete section/content model and graphic layouts.
- `approved-report-print.tsx`: real SimpleReport reuse, scoped print sizing and oversized-content pieces.
- `portfolio-export.ts`: fresh snapshot, media tasks, measured pagination and export.
- `print-cache.ts`, `print-qr.ts`: bounded public-image cache, task queue, local QR and stable link helpers.
- `portfolio-print.css`, `portfolio-print-design.css`: isolated A4 geometry and final visual system.
- `CourseCertificate.tsx`, `certificate.css`, `Portfolio.tsx`: secure public certificate route and existing header action.

Run `npm run dev -- --port 5173`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:portfolio-print`, and `npm run test:print-progress`. Existing public/course browser suites also remain applicable.

Current validation: 35-page stress fixture passes full native/direct mobile PDFs, eleven criterion covers, one-page approved short report, long report/prose preservation, no overflowing bodies, correct contents/footers, correct single inner report QR, decoded QR destinations, zero certificate-file reads during preparation, cache reuse across reload and SHA invalidation, HTML escaping/private-contact omission, public certificate deep-link/reload and unlisted-document blocking. Existing suites: 56 public checks, 17 course checks, preparation lifecycle checks. Actual public snapshot: 38 pages, eleven criterion covers, five approved one-page reports, 44 course QR rows, eight photo previews, one page each for current About subsections, no overflow/runtime errors. Native report footer names/bottom strip and rasterized QR readability were checked in actual PDF output.

A same-context cold/reload benchmark subsequently measured 4,482ms for the first preparation (zero cached photos), then 1,562ms after reload (eight cache hits), with zero certificate document reads in both runs. The 38-page result and 5 inner report / 44 course QR counts were unchanged. Final design review requested one material correction: keep the two-digit markers in objective/policy cards on one line. Fixed non-shrinking numeral width and verified actual About subsections remain single-page with zero overflow.

Independent Impeccable final verdict: initial review matched the book/template/privacy scope and requested the numeral-width fix; the verdict pass scored all requested fixes resolved and `ship`. No material findings remain within that reviewed scope.
