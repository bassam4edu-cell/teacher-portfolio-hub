# Owner reference — home cover

## Direction contract
The owner pinned the supplied reference screenshot and explicitly requested faithful copying of its visual composition. This is a code-led Experience/Read home-cover refinement, not a new theme for document/report pages. Preserve all actual teacher data, bio source text, report/course counts, routes and actions. No ministry endorsement or invented achievements.

Reference anchors: compact white name/navigation header and three utility outline icons; full-width navy banner with green illumination at the upper left; subtle looping arabesque at opposing edges; right centered white two-line title, sand teacher name, mint subject, white bio preview and two CTAs; left white teacher card with floating mint/white circular book emblem, restrained sand border, dotted rows and mint academic-period label. Four white, softly raised KPI cards follow the hero in one desktop row. The screenshot's monitor/desktop frame is not part of the website.

At 1024px the header is 52px and hero 400px tall, with a 213px card and 350px title composition inside a centered 64%-width region. Wider desktop sizes scale the content up; below 900px, the original reading order becomes title/actions then centered teacher card, then a two-column KPI grid. Colors derive from the pinned screenshot; the primary CTA is slightly darkened (#007d56) for AA white-label contrast. The existing three-line bio preview remains, with full text available in About.

Implementation: home markup in Portfolio.tsx wraps only home content; `home-cover.css` is scoped by data-view=home; `cover-arabesque.svg` is original neutral geometric line art. Existing title PNG and genuine ministry logo are reused. Source data and APIs are unchanged. Header utility targets remain print, owner administration and QR; home-only icon treatments match the reference without changing their actions.

Validation: screenshots at 320/390/768/1024/1440, no overflow or runtime errors. Browser contracts cover route navigation, direct criterion pages, all About tabs, report export, course ordering and printing. Independent finish review found no clipping; primary CTA contrast corrected from 4.17:1 to 5.16:1.
