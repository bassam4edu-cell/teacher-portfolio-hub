# About reading workspace

## Direction contract
Read mode within the approved modern education identity. Rebuild About only, retain the six sections and all saved/default content: introduction, vision/mission/values, ethics, education policy, CV, objectives. Existing hash URLs, browser history, source links and private data restrictions remain intact. No new services, data writes, guessed achievements or credentials.

First viewport: open typographic identity heading and compact teacher/school identity, then a right-hand section rail and independent white reading surface. Desktop rail is sticky below the global header. Below 1000px it becomes a native horizontally scrollable tablist. Selected tab moves into view horizontally only, without programmatically moving the page vertically. Roving keyboard selection accepts RTL Left/Right, Up/Down, Home/End; ARIA orientation changes at the layout breakpoint.

Section treatments: editorial introduction with existing bio quotation; paired navy/pale-green vision/mission panels; two-column value rows; numbered policy/ethics principles with original-source panel; professional resume with grouped qualifications, experience timeline, licenses and skills; numbered file objectives and existing professional goals. Missing career groups remain hidden. Print action prints the current section without navigation or app chrome.

## Implementation
`About.tsx`: new semantic workspace, removed measured marker and fixed-height animation container. Normal document flow avoids clipping on font/content changes. Existing content bindings retained.
`about.css`: old styles replaced completely by scoped educator selectors. Global tokens unchanged. Text 16–19px, 2–2.15 leading, 70ch measure. Rail 268px desktop, 40px column gap. Motion 250ms, reduced-motion static fallback.
`CareerCV.tsx`: document-oriented profile and grouped timeline, same saved records and omission rules.

## Validation
Five widths 320/390/768/1024/1440; all six routes. Actual saved data screenshots and A4 CV PDF. Existing browser contracts cover six accessible tabs, saved content, value text, source links, history, keyboard, CV field omissions, prior career records and reduced motion. Approved evidence/course report templates are unchanged.
