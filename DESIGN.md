# Modern education digital portfolio

## Tokens

| Role | Value |
|---|---|
| Brand green | #07a869 |
| Brand blue | #3d7eb9 |
| Turquoise | #0da9a6 |
| Navy | #15445a |
| Sand / gray | #c1b489 / #c2c1c1 |
| Canvas / card | #f8fafb / #ffffff |
| Readable link / green text | #27638f / #006c43 |

Typeface: IBMPlexSansArabic, Tajawal, sans-serif. No manuscript display fonts. Base 16px, 1.9 body leading, 72ch reading measure; headings 24–49px. Spacing: 4/8/12/16/24/32/48px. Card radius 12px; 1px border and 3px green bottom rule. Icons in turquoise-tinted circles. Dividers dotted.

## Composition and interaction

The pinned education identity uses a branded green-to-blue banner, genuine logo assets and white structured content. Desktop identity/metadata split stacks on mobile. Sticky five-item navigation and owner/QR/print controls retain keyboard focus. Cards lift 2px on hover; entrances 280ms, easing cubic-bezier(.16,1,.3,1), reduced motion supported. No artificial scrolling or blocking intro.

Data, API, record versions, permissions and report templates remain unchanged. KPI numbers derive from public records. No invented documentation completion or approval status. Course search filters display records; printing retains the complete currently ordered course set. See docs/GOV-REDESIGN.md for implementation and limits.

## About section — reading workspace

The six About routes now use an independent `educator-about` workspace, not the previous cover/card dashboard. A 268px right rail is sticky on desktop; below 1000px the same six tabs scroll horizontally. Active tab uses navy with white text and a cyan line icon. Reading surface: white, 1px semantic border, 16px radius, 36px desktop / 18px mobile padding; 70ch text measure. Vision/mission uses navy and pale green, values use dotted rows, policy/ethics numbered paragraphs, resume a grouped career timeline. Existing content and source links are preserved. Printing hides navigation and prints only the selected section. See docs/ABOUT-REDESIGN.md.


## Home title artwork

Owner-requested two-line Arabic wordmark replaces the small home document-title phrase. `public/brand/portfolio-title-art.png` is an alpha image displayed white through a CSS filter, centered above the existing teacher name, at up to 510px desktop width and contained on mobile. Its accessible alternative retains the original title wording. A 350ms subtle entrance respects reduced motion; print renders it dark. This is confined to the home cover and does not restore the old manuscript theme or fonts. Asset provenance is stored alongside the PNG.

## Pinned home cover composition

The owner supplied a new screenshot and requested its exact cover composition. `home-cover.css` now scopes the full-bleed navy/green-glow banner, paired title/teacher-card layout, white floating book emblem, sand name/border, dotted card rows, corner arabesque and four white desktop KPI cards to the home view. Other routes retain the education interface. Reference colors: navy #0b3044, green glow #009269, sand title #d4c79d, card border #b6b694, mint #dfeee6, accessible green CTA #007d56 with white labels. Mobile stacks the same content and uses two KPI columns. Reuses existing fonts, title artwork and logo. See docs/REFERENCE-HOME-COVER.md.

## Pinned criterion card grid

The owner now explicitly pins the navy two-column criterion reference, including category controls. `CriteriaGrid.tsx` and `criteria-grid.css` replace the earlier horizontal list on home and the criterion index. All eleven official criteria retain ascending ID order. White compact cards use a fixed navy/green/sand right strip and matching circular activity icon, small number, right-aligned title and pale badge, a left report-count pill/action, and a thin bottom documentation track. This is a specific exception to the base card border treatment. Colors are fixed by ID and do not change when reports are added. Above 900px the grid has two columns; below it has one, with action metadata on a separate row below 540px.

Four working category controls include an explicit all-criteria reset; no report search is restored. Criterion 7 is the technology category; the English filter matches actual published English-teaching text. Tooltips expose saved descriptions on hover and keyboard focus and dismiss with Escape. Clicking opens the existing criterion page directly, never a drawer. Navy navigation/background are scoped to the index; other views and all approved report artifacts remain unchanged.

Counts derive from actual public publications. No target completion is inferred from report counts. Production currently has zero configured targets, and its public API does not expose completion. Neutral tracks therefore say “المستهدف غير متاح للعرض” and have no progressbar ARIA value. A future trusted numeric aggregate may supply done/total; the optional component contract computes percentage from those integers. See docs/CRITERIA-GRID.md for the unactivated database proposal and checks.

Home criterion grid override: owner removed the dark panel behind the cards on the home page. Its surface is transparent on the existing light canvas, corner decoration hidden, with navy filter labels, pale green active/hover state and readable muted notes. The standalone criterion index remains navy. Card styling, data and navigation are unchanged.

## Complete portfolio print document

The approved A4 book uses navy/green/sand covers and white editorial interiors. About subsections are separately designed: lead/objective groups; a professional two-column CV sidebar and timeline; paired vision/mission and value grid; numbered policy/ethics. Every current subsection fits one page; oversized future content continues without deletion.

All eleven criteria have individual covers followed by their actual approved SimpleReport pages. The outer page header holds logo + criterion number/name and no QR. One QR lives inside each inner report header. Scoped proportional CSS sizing preserves field boxes, original narrative/objectives/photos/signatures/bottom strip without print-fragment clipping; one-page reports remain one page. Courses keep the existing oldest-first row design, replacing thumbnails with locally generated certificate QR and a direct public document route. Originals, saved text and permissions are unchanged.

Preparation reads fresh public metadata, uses a bounded SHA-keyed cache and two photo tasks, and generates QR locally instead of fetching certificate PDFs. Real workflow progress drives 0–100, with accessible reduced-motion/retry states and clipped off-flow A4 staging. Contents/totals and PDF links remain dynamic. See docs/PORTFOLIO-PRINT.md for route, privacy, cache, output and measured validation details.
