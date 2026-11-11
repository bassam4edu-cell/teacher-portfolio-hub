---
name: Teacher portfolio public reading system
description: Arabic professional portfolio with petrol identity and a quiet reading layout
colors:
  reading-ink: "#284850"
  reading-body: "#485e62"
  reading-muted: "#596767"
  reading-paper: "#f7f7f3"
  reading-line: "#dce1dc"
  white: "#ffffff"
  cover-copy: "#e0eae6"
  navigation-active: "#eaf0ed"
  row-populated: "#f0f4f1"
  row-hover: "#e9efeb"
  number-surface: "#eaede7"
  tab-surface: "#f3f5f1"
  tab-hover: "#eaf0e9"
  focus: "#577b70"
  stone-border: "#d4d0c4"
  report-action: "#35535b"
typography:
  display:
    fontFamily: "Markazi Text, Tajawal, serif"
    fontSize: "clamp(36px, 4.5vw, 58px)"
    fontWeight: 500
    lineHeight: 1.35
    letterSpacing: "0"
  headline:
    fontFamily: "Markazi Text, Tajawal, serif"
    fontSize: "clamp(25px, 3vw, 32px)"
    fontWeight: 500
    lineHeight: 1.55
  title:
    fontFamily: "Tajawal, Arial, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.6
  body:
    fontFamily: "Tajawal, Arial, sans-serif"
    fontSize: "17px"
    lineHeight: 2
  label:
    fontFamily: "Tajawal, Arial, sans-serif"
    fontSize: "14px"
    lineHeight: 1.6
rounded:
  control: "6px"
  hero-action: "7px"
  course: "10px"
  cover: "12px"
  report: "13px"
  hero: "16px"
spacing:
  step-8: "8px"
  step-16: "16px"
  step-20: "20px"
  step-24: "24px"
  step-28: "28px"
  step-32: "32px"
  step-44: "44px"
  step-48: "48px"
components:
  button-cover:
    backgroundColor: "{colors.white}"
    textColor: "{colors.reading-ink}"
    rounded: "{rounded.hero-action}"
    height: "48px"
  tab:
    backgroundColor: "{colors.tab-surface}"
    textColor: "{colors.reading-body}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
    height: "54px"
  tab-selected:
    backgroundColor: "{colors.reading-ink}"
    textColor: "{colors.white}"
  criterion:
    padding: "20px 8px"
  course-card:
    rounded: "{rounded.course}"
    padding: "28px"
---

# Design System: Teacher portfolio public reading system

## Overview

**Creative North Star: "The public reading portfolio"**

The established petrol and stone identity supports an Arabic, right-to-left professional portfolio. A dark cover introduces the teacher; quiet divided rows and readable text let the actual work carry the page.

This document describes the public reading surfaces and their current CSS cascade. The approved report document, SimpleReport, and standalone print templates retain their separate designs. Markazi Text supplies editorial headings; Tajawal supplies reading and interface text.

**Key Characteristics:**
- Petrol identity with restrained stone and paper surfaces.
- RTL reading order and logical spacing.
- Flat criteria rows, with imagery reserved for actual reports.
- Visible navigation and clear keyboard states.

## Colors

Muted petrol anchors identity and reading; stone neutrals separate content without competing with it. Frontmatter records the normative values extracted from the current implementation.

### Primary

- **Reading petrol** (`reading-ink`): the home cover, headings, selected tabs, populated criterion numbers, and footer.
- **Report petrol** (`report-action`): inherited report-card actions retain their existing slightly lighter petrol.
- **Sage focus** (`focus`): keyboard outlines on public links and buttons; cover buttons use white outlines.

### Neutral

- **Reading body** and **Reading muted**: prose and supporting metadata respectively.
- **Reading paper**, **White**, and **Reading line**: quiet surfaces, cover contrast, and dividers.
- **Cover copy**: secondary text on petrol.
- **Navigation active**, **Row populated**, **Row hover**, **Number surface**, **Tab surface**, and **Tab hover**: restrained green-grey state fills.
- **Stone border**: inherited report-card edge.

## Typography

**Display Font:** locally served Markazi Text, with Tajawal and serif fallbacks.
**Body Font:** Tajawal, with Arial and sans-serif fallbacks.

Markazi Text provides the established Arabic editorial character; Tajawal keeps longer passages and controls practical and legible. The frontmatter hierarchy records current home and About roles, not a universal replacement for every inherited heading.

- **Display:** teacher name; on phones the home name is 38px.
- **Headline:** home section headings; page titles separately scale from 28px to 40px.
- **Title:** criterion labels; report-card titles use 20px with two-line space reserved.
- **Body:** About prose is limited to 74ch; mobile prose uses 16px and a 1.95 line-height. The cover summary uses 16px, a 1.95 line-height, and 62ch maximum measure.
- **Label:** tab labels and actions; metadata generally uses 12–14px. Preserve existing Arabic casing and avoid artificial tracking.

## Layout

The main container is 1184px including 28px inline gutters. The header has its own 1240px maximum width. Home cover columns use a 1.7:1 ratio and a 48px gap; the metadata column is separated by an inline rule. The cover has 44px internal padding and 48px space after it.

Criteria form two columns with a 32px column gap and horizontal row dividers. Rows use a 44px number, flexible copy, and a 24px direction column. At 760px and below, criteria and cover become single-column, main gutters reduce to 20px, and the record divider becomes horizontal. At 380px and below, main gutters reduce to 16px and the cover action can fill the width.

All six About destinations remain visible: three columns on desktop, two at 760px and below. Main sections use a recurring 24/32/48px rhythm, with more space before a section than between its heading and text. Report cards reserve consistent title and action regions while containing images without cropping them.

## Elevation & Depth

Criteria, About panels, and course cards are flat at rest. Tonal fills, white space, and fine dividers establish hierarchy. Report cards retain subtle inherited shadows: `0 3px 10px #394d5508` at rest and `0 12px 25px #394d5512` on hover. Avoid carrying report-card elevation into the divided criterion list.

## Shapes

Controls use gently curved corners, while criteria rows have square edges and a bottom rule. The home cover has the largest radius; report cards clip their image region within their rounded shell. Course cards and the About identity cover use quieter intermediate radii. Keep the book symbol and the existing geometric corner asset as established identity details.

## Components

### Buttons

Cover primary actions are white on petrol, with a 48px minimum height and bold 15px text; their hover surface is `#e8efeb`. Secondary cover actions are transparent with white text. Standard controls retain compact padding and at least 44px touch height. Public links and buttons use a 2px focus outline offset by 4px; cover buttons use white for contrast.

### Navigation

Five labeled destinations remain predictable. Active links use the navigation-active surface, petrol text, and bold weight; `aria-current` exposes the active destination. A skip link becomes visible on focus and reaches focusable main content. The compact header treatment begins at 1050px.

### Criteria rows

Use divided rows rather than floating cards. Populated rows receive a quiet fill and a petrol number tile; other number tiles use number-surface. Hover changes the fill without lifting or adding a shadow. Official criterion numbers remain inside rows, and populated criteria appear first.

### About tabs

All six tabs are visible. Each tab has a 54px minimum height, a quiet surface, and a selected state with white on petrol and bold text. Unselected hover adds a restrained border and lighter green-grey surface. Expose tab selection and panel relationships, use roving keyboard focus, and preserve RTL arrow-key behavior.

### Report cards and category tags

Image-led cards use white shells, a stone edge, reserved title space, and a two-action footer. Images use `object-fit: contain` to retain their original aspect ratio. Category tags combine a quiet label surface with a small petrol number tile. The report document opened by a card remains outside this system.

### Course cards

Use reading-line borders, course radii, and 28px padding with no resting shadow. Course totals stay compact and print controls remain accessible. Course content and counts come from actual saved records.

## Do's and Don'ts

### Do:

- Do preserve Arabic RTL and logical inline spacing.
- Do keep official criterion numbers stable and derive counts from saved publications.
- Do preserve the original aspect ratio of report images.
- Do keep all six About tabs visible and support RTL keyboard navigation.
- Do respect reduced motion and retain visible keyboard focus.

### Don't:

- Don't apply this public reading system to SimpleReport or standalone print documents.
- Don't fabricate achievements, reports, or promotional claims.
- Don't replace the established book symbol and geometric corner asset with unrelated ornament.
