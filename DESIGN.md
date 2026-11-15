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
