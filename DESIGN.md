---
name: Teacher portfolio library reference identity
description: Arabic professional portfolio with warm paper, bronze calligraphy, and horizontal academic cards
colors:
  reference-paper: "#FAF9F6"
  reference-bronze: "#9A8B7A"
  reference-teal: "#2F4846"
  reference-line: "#D8D2C7"
  reading-body: "#625F58"
  reading-muted: "#7A756C"
  white: "#FFFFFF"
  navigation-active: "#F0ECE4"
  pill-surface: "#F7F5F0"
  pill-ink: "#796858"
  pill-line: "#C5B9A8"
  card-line: "#D5CFC4"
  action-hover: "#263B3A"
typography:
  display:
    fontFamily: "ReferenceRuqaa, ReferenceAmiri, serif"
    fontSize: "clamp(38px, 5.5vw, 74px)"
    fontWeight: 400
    lineHeight: 1.8
  headline:
    fontFamily: "ReferenceKufi, Tajawal, sans-serif"
    fontSize: "clamp(30px, 4vw, 46px)"
    fontWeight: 700
    lineHeight: 1.7
  title:
    fontFamily: "ReferenceSans, Tajawal, sans-serif"
    fontSize: "19px"
    fontWeight: 700
    lineHeight: 1.7
  body:
    fontFamily: "ReferenceSans, Tajawal, sans-serif"
    fontSize: "15px"
    lineHeight: 1.9
  label:
    fontFamily: "ReferenceSans, Tajawal, sans-serif"
    fontSize: "12px"
    lineHeight: 1.7
rounded:
  card: "14px"
  number: "10px"
  evidence: "12px"
  pill: "999px"
spacing:
  step-8: "8px"
  step-12: "12px"
  step-18: "18px"
  step-20: "20px"
  step-22: "22px"
  step-24: "24px"
  step-28: "28px"
  step-32: "32px"
components:
  criterion-card:
    backgroundColor: "{colors.white}"
    textColor: "{colors.reference-teal}"
    rounded: "{rounded.card}"
    padding: "20px 28px"
  filter:
    textColor: "{colors.reading-body}"
    rounded: "{rounded.pill}"
    padding: "9px 18px"
  filter-selected:
    backgroundColor: "{colors.reference-teal}"
    textColor: "{colors.white}"
  evidence:
    backgroundColor: "{colors.white}"
    rounded: "{rounded.evidence}"
---

# Design System: Teacher portfolio library reference identity

## Overview

**Creative North Star: "The pinned library reference"**

The pinned library reference identity gives the Arabic professional portfolio a warm paper ground, bronze calligraphy, and deep teal reading ink. A centered introduction leads into horizontal academic cards; the actual published work supplies the evidence.

This system describes the public portfolio, implemented by ReferenceIdentity.tsx and reference-identity.css. The approved report document, SimpleReport, and standalone print templates retain their separate designs.

**Key Characteristics:**
- Warm paper, bronze, deep teal, and fine stone dividers.
- Arabic RTL with locally served Arabic typefaces.
- Horizontal academic cards with stable official numbering.
- Published evidence, accessible controls, and restrained motion.

## Colors

Warm mineral neutrals frame deep teal reading ink. Frontmatter is the normative palette.

### Primary

- **Reference teal** anchors headings, academic icons, selected filters, primary actions, and the footer.
- **Reference bronze** supplies calligraphy, the ribbon, projecting number tabs, and restrained accents.

### Neutral

- **Reference paper** is the public page ground; **White** forms the card and evidence surfaces.
- **Reference line** separates content. **Card line** outlines criterion cards.
- **Reading body** and **Reading muted** support prose and metadata.
- **Navigation active** provides the active destination surface.
- **Pill surface**, **Pill ink**, and **Pill line** keep criterion metadata distinct without competing with headings.
- **Action hover** darkens the primary action on interaction.

## Typography

**Display Font:** ReferenceRuqaa (Aref Ruqaa), with ReferenceAmiri (Amiri) and serif fallbacks.
**Headline Font:** ReferenceKufi (Reem Kufi), with Tajawal and sans-serif fallbacks.
**Body Font:** ReferenceSans (IBM Plex Sans Arabic), with Tajawal and sans-serif fallbacks.

All four reference fonts are served locally from `public/fonts/reference` with `font-display: swap`. Ruqaa provides the bronze calligraphic statement, Kufi identifies the teacher and page sections, and Plex supplies practical Arabic reading and controls. The report view retains its approved document typography.

- **Display:** calligraphic introduction; mobile size is 40px.
- **Headline:** teacher name; section and page headings also use Kufi with their existing size hierarchy.
- **Title:** criterion labels; mobile labels reduce to 16px. Drawer headings use 28px and a 1.65 line-height.
- **Body:** centered home summary, limited to 74ch; drawer prose uses 16px and a 1.9 line-height.
- **Label:** metadata and pills; filter labels use 13px, reducing to 12px on mobile. Preserve natural Arabic casing and spacing.

## Layout

The main container has a maximum width of 1180px. The home introduction is centered on paper with 40px 60px 32px padding, paired geometric corner motifs, a bronze ribbon, centered actions, and a wrapping metadata record beneath a fine divider.

Criteria form a single vertical list with an 18px gap. Each horizontal card has four columns: a projecting number tab, academic icon, flexible title and metadata pill, and a separated evidence-count/action region. Desktop columns are 54px 62px minmax(0, 1fr) 176px, with 22px gaps, 20px 28px padding, and a 122px minimum height. Reserve inline space for the projecting tabs.

At 760px and below, cards use three columns (32px 38px minmax(0, 1fr)), 10px gaps, 18px 16px padding, and a 150px minimum height. Evidence metadata moves beneath the title into a wrapping row with a top divider. The introduction and corner motifs shrink; the verification zone becomes one column. The evidence drawer is at most 610px wide and fills the viewport height.

All six About destinations remain visible, with their existing responsive layout and RTL keyboard behavior. Report images retain their full aspect ratio.

## Elevation & Depth

White cards sit lightly above warm paper; bronze edges and fine dividers provide most hierarchy. Criterion cards use `0 2px 5px #2f484607` at rest and `0 8px 20px #2f484610` on hover. Hover adds a subtle surface sweep, a 4px leftward shift, a slight number-tab scale, and a small icon rise.

Calligraphy reveals once, corner motifs fade in, and cards enter when observed with a capped stagger. Reduced motion disables these animations, card transitions, and hover transforms. The drawer uses a dark teal backdrop and a brief left-edge entrance.

## Shapes

Horizontal cards have softly rounded shells, projecting bronze number tabs, outlined pill metadata, and line-based academic book icons. The bronze ribbon has pointed ends and diamond details. Keep the established book symbol and mirrored geometric corner asset. Evidence previews use contained images in rounded white shells.

## Components

### Buttons

Primary home actions use white text on teal with a darker hover. Secondary actions use teal text, a transparent surface, and a stone border. Preserve inherited minimum touch sizes, visible focus outlines, and accessible names for icon-only controls.

### Navigation

The compact sticky header uses a translucent paper surface and a quiet active fill. Five labeled destinations retain `aria-current`; the skip link reaches focusable main content. Breadcrumbs, back-to-top, report search, original-image downloads, and the native modal image gallery remain functional. Browser View Transitions retain a direct fallback. The compact header begins at 1050px.

### Filters

Four wrapping pill buttons offer all criteria, teaching evidence, technology initiatives, and English teaching artifacts. Selected filters use teal with white text and expose `aria-pressed`. Filtering uses actual public reports and keeps official criterion IDs stable. Empty classifications show an honest empty state.

### Criterion cards

Cards are full-width buttons with stable official criterion numbers (1–11), an academic icon, criterion title, weight or practice label, actual report count, and a directional action. Populated and empty cards share the same white surface and bronze tab. Opening a card shows its evidence drawer; filtering never renumbers or reorders the official sequence.

### Evidence drawer

Use a native modal `dialog`, with an accessible label, explicit close control, browser Escape handling, and modal focus behavior. Show the saved criterion description, weight, actual published-report count, and real report previews. Evidence links close the drawer and open the report; a separate action opens the criterion page. Show an honest empty state when no reports exist. Preview images use `object-fit: contain`.

### About tabs and course cards

Preserve all six About tabs, selection and panel relationships, roving focus, and RTL arrow-key behavior. Course totals derive from saved records, and print controls remain accessible. These supporting surfaces inherit the reference palette without changing report templates.

### Verification and sharing

The lower information zone shows the saved current period and factual evidence context, explicitly identifying the portfolio as personal rather than an official ministry platform. QR image, destination link, visible address, and copy action use the actual portfolio URL. Clipboard feedback uses a status region. Drawer, filters, and verification zone are hidden in print.

## Do's and Don'ts

### Do:

- Do preserve Arabic RTL and logical inline spacing.
- Do keep official criteria 1–11 in ascending numeric order and derive evidence counts from actual public reports.
- Do preserve report images with object-fit: contain and retain original downloads.
- Do retain all six About destinations, tab relationships, and RTL keyboard navigation.
- Do respect reduced motion, native dialog keyboard behavior, and visible keyboard focus.
- Do keep the QR code, its link, and clipboard action pointed at the actual portfolio URL.

### Don't:

- Don't apply this identity as a redesign of SimpleReport or standalone print documents.
- Don't fabricate achievements, reports, endorsements, official platform status, or contact information.
- Don't replace the established book symbol and geometric corner asset with unrelated ornament.
- Don't renumber criteria when filtering or sort them by publication counts.
