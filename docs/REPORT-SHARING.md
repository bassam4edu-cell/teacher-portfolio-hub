# Report file sharing

The report page no longer mounts the original-photo gallery or copies its URL as the share action. `ReportShare` offers PNG and PDF, prepares the full approved `SimpleReport` template including its text and images, and exposes a separate explicit “send to apps” action. The second tap preserves the transient user activation required by Web Share on mobile browsers. No recipient or messaging app is chosen automatically.

`report-share.ts` clones the report into an isolated same-origin 900px iframe. The exported report stays 794px wide on mobile, embeds the existing Tajawal font and original photos, and renders at 2x resolution with html2canvas’s Canvas renderer (no SVG foreignObject). Each report page becomes a PNG. PDF-lib packages all rendered pages into one A4 PDF without cropping or stretching. The share PDF is an image-based rendition; existing print/save-PDF export remains available unchanged for the browser's text-based print output. Files are prepared locally without upload or a paid service.

Native `canShare({files})` determines whether to offer device sharing. Download links remain available for every file in all cases; unsupported native sharing and rejected share attempts explain the download alternative. User cancellation is silent. All temporary iframe and object URLs are cleaned up. Native dialog handles focus/Escape; dismissal is disabled while rendering. Multi-page PNG sends separate files when the platform accepts them, otherwise each is downloadable.

Validated with a real two-photo report: PNG 1588×2246; PDF parsed as one page; a three-page report parsed as three PDF pages. Mocked Web Share received File objects and no URL. Also checked mobile dialog, unsupported download fallback, and the existing public/courses browser contracts. Actual WhatsApp/Telegram app delivery requires a compatible user device and was not performed by the tests.


## Safari / RTL rendering repair

The isolated document viewport now uses LTR at scroll origin zero; each report retains RTL. This avoids a foreignObject/page-origin shift cropping the right side on Safari. html2canvas renders directly to Canvas, all original and cloned images must decode with nonzero dimensions, and oversized horizontal layouts reject export. Gradient box borders are flattened into local bitmap backgrounds because layered background-clip is not consistently supported by Canvas renderers. Small SVG logos get high-resolution intrinsic dimensions. These changes apply to the temporary export document only, leaving the live and print templates unchanged.

`npm run test:report-share` checks both edge markers, embedded image pixels, two PNG files, two PDF pages and rejection of a broken image. `TEST_BROWSER=webkit` runs the same checks with WebKit; an optional `WEBKIT_EXECUTABLE_PATH` can select a prepared local engine. Actual affected training report also exported in Chromium and mobile WebKit. Native WhatsApp/Telegram delivery on a physical iPhone remains device-dependent.
