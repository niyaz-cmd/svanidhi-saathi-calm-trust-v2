# SVANidhi Saathi Field Prototype v0.2

Product-polish release focused on live Android testing feedback.

## Changed
- Script-safe Kannada and Hindi typography; removed negative tracking from Indian-script headings.
- Selected-language-first primary UI; reduced mixed English/Kannada stacking.
- Replaced the language-specific letter mark with a language-neutral Saathi companion mark.
- Replaced custom icon drawings with Google Material Symbols Rounded.
- Rebuilt Home voice action as a dedicated contained voice card.
- Upgraded bottom navigation to Material 3-style Home / Saathi / Activity with active indicator.
- Rebuilt bill capture as an empty scanner with corner guides; values are not shown before capture.
- Added separate camera and gallery actions.
- Simplified Guidance to a single ₹120 action with a deterministic 'Why this amount?' bottom sheet.
- Hid research controls from normal vendor view; five taps on the Saathi mark unlock operator controls.
- Canonical demo finance state remains ₹8,400 due / ₹7,080 ready / ₹1,320 remaining / 11 days / ₹120 per day.
- Localized additional vendor-facing copy in Kannada/Hindi/English.
- Service-worker cache bumped to v0.2.0.

## Verification
- `npm test`: 16/16 passing.
- `npm run check`: all JavaScript syntax checks passing.
- Local HTTP route returns updated Material Symbols and v0.2 source.

## Remaining physical-device gate
Material Symbols font loading, Kannada/Hindi typography, camera, microphone, safe-area behavior, and PWA offline font cache must be visually verified on a real Android handset before vendor sessions.
