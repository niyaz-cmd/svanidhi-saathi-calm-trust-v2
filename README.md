# SVANidhi Saathi — Daily Money Memory v0.6

A field-grade prototype for testing the SVANidhi Saathi interaction with street vendors. It is a mobile-first Progressive Web App designed for Android Chrome.

## Added in v0.6
- Multilingual first-use privacy notice with separate optional choices for online voice and research notes.
- Settings for language, privacy choices, local-data export, research withdrawal, and deletion.
- Formetry Labs privacy contact and explicit independent-prototype positioning.
- Pending voice requests stop when the user withdraws voice permission or leaves the voice flow.

## Preserved from v0.5
- First-use spoken onboarding and returning-user greeting in Kannada, Hindi, and English.
- Confirmed transaction ledger with cumulative Money in, Business spending, and Net today.
- Append-only corrections, duplicate-confirmation protection, and legacy activity migration.
- Ledger totals use all entries; the activity view shows the latest 40 events.
- Records remain on this device in localStorage; no backend synchronization.

## Preserved voice architecture from v0.4
- Kannada / Hindi / English UI switching.
- A two-turn voice conversation: greeting → sales question → sales confirmation → business-spending question → spending confirmation → editable summary → final save.
- Patient microphone recording with local audio-level detection, a 2.3-second silence window after meaningful speech, an explicit localized “I’m done” button, and a 29-second safety timeout. Browser speech recognition is not trusted for money amounts.
- Manual transcript fallback.
- Deterministic English/Hindi/Kannada amount normalization, including common spoken hundred/thousand forms and Chrome STT variants such as `15 00`, `1 5 0 0`, `15 hundred`, and `1,500.00`. Code-mixed amount words are accepted; genuinely different amounts are rejected instead of guessed.
- Per-amount repeat-back and confirmation, followed by sequential structured-value reveal and editable amounts before the final save.
- Deterministic reserve calculation.
- Real camera/photo capture from the phone.
- Protected Sarvam Bulbul v3 human speech for every online prompt and repeat-back. Recorded money answers are sent to a protected same-origin endpoint and transcribed by Sarvam Saaras v4 before deterministic parsing. Audio is processed in memory and is not persisted. The microphone opens 120 ms after the complete prompt audio ends.
- Chrome's `audio/webm;codecs=opus` recording label is normalized to `audio/webm` for the Sarvam multipart file. Sarvam otherwise rejects the same valid WebM audio with HTTP 400.
- Offline app shell after first load in a secure context.
- Local research event logging + session JSON export.
- Explicit uncertain-financial-value path.

## What is intentionally simulated
- Bill OCR: v0.2 uses a fictional test statement and controlled extraction after a real camera capture. It never claims production OCR.
- Bank / PM SVANidhi data: all payment values are fictional test data.

## Safety boundaries
Never enter or collect Aadhaar numbers, OTPs, PINs, CVVs, full card numbers or banking passwords. This prototype cannot move money, apply for credit, score a vendor, or connect to a bank/government account.

## Run locally
Requires Node.js 20+; no `npm install` is required.

```bash
npm test
npm run dev
```

Open `http://localhost:4173`.

## Use on an Android phone
Camera and speech APIs work best in a secure context. For actual field testing, use one of these:

1. **Recommended: HTTPS Vercel deployment.** Set `SARVAM_API_KEY` as a server-side environment variable. The browser calls `/api/speech` for Bulbul speech and `/api/transcribe` for Saaras transcription; the key is never sent to the client.
2. **USB field setup:** enable Android developer mode + USB debugging, connect the phone to the laptop, run the app locally, then use `adb reverse tcp:4173 tcp:4173`. Open `http://localhost:4173` on the phone. Android sees this as localhost, which is suitable for browser secure-context exceptions.
3. Laptop-only UX review can use regular localhost.

After an HTTPS/localhost first load, use Chrome's **Install app / Add to Home screen** option for an app-like field experience.

## Figma design reference
The interaction system originated in the approved Calm Trust design: https://www.figma.com/design/vVmgy5CwFzDNPtrcUDa5TJ

## Field flow
1. Choose language.
2. Review the safety screen.
3. Review the privacy notice; independently choose online voice and research notes. Manual entry works without voice.
4. Home → Tell Saathi about today.
5. Hear the greeting and sales question; speech recognition starts only after playback and a short echo guard.
6. Speak or type one sales amount, then confirm Saathi's repeat-back.
7. Speak or type one business-spending amount, then confirm Saathi's repeat-back.
8. Review/edit both sequentially revealed fields and explicitly confirm the final record.
9. View deterministic reserve guidance.
10. Photograph the printed fictional test statement.
11. Choose `Read test bill` or `Test uncertain read`.
12. Review amount/date/action and source provenance.
13. Ask bounded questions.
14. If research was enabled, open **Research** to mark tasks and export the session.
15. Open **Settings & your data** to change choices, export all Saathi browser data, or delete it.

## Demo mode
Open **Research** → switch to **Demo**. The Voice screen then includes `Use demo voice`, which guarantees a working judge/government demo even if device speech recognition is unavailable.

## Kannada review requirement
The current Kannada is a design-language draft and must be reviewed by a native Kannada speaker before formal vendor testing. The product should not treat generated/localized copy as field-ready without that review.

## Persistence and research data
Confirmed activity stays in browser storage after the user accepts the first-use notice. Research events and notes are stored only when the separate research choice is enabled. Raw transcripts, voice recordings, bill photos, and unconfirmed money values are never written to persistent application storage. There is no configured database, authenticated write API, schema, cloud backup, account recovery, or cloud-sync credential. A true account implementation requires those backend and operational decisions. Users can export all Saathi-prefixed browser records or delete them in **Settings & your data**. See [prototype readiness](docs/PROTOTYPE_READINESS.md) for the data map and pre-pilot gates.

## Test
```bash
npm test
npm run check
```

## v0.2 Product Polish

This build applies the live-device polish pass after Android screenshot review:

- Script-safe Kannada/Hindi typography with zero negative tracking and looser line heights.
- Selected-language-first vendor UI (no English subtitle stacked under major Kannada/Hindi headings).
- Language-neutral Saathi companion mark; the previous single-letter Kannada mark is removed.
- Google Material Symbols Rounded icon system for navigation and primary actions.
- Material 3-inspired bottom navigation: Home / Saathi / Activity.
- Rebuilt Home voice card so labels and helper text remain inside the card on narrow phones.
- Bill capture starts as an empty scanner and no longer leaks test answers before a photo is supplied.
- Canonical demo finance state: ₹8,400 due, ₹7,080 ready, ₹1,320 remaining, 11 days, ₹120/day.
- Guidance screen now explains the ₹120 calculation in a bottom sheet.
- Research / Demo controls are hidden from vendors. Tap the Saathi mark five times to open the operator drawer.
- Vendor-facing prototype/developer language is removed from the main journey.

### Operator gesture

Tap the circular Saathi mark in the top bar five times to unlock the research controls.

### Verification

Run:

```bash
npm test
npm run check
```

The v0.4 build includes automated finance, multilingual spoken-number parsing, microphone recording/VAD, protected Sarvam transcription, prompt-to-mic ordering, per-amount confirmation gates, final-only persistence, Sarvam speech, and UI-contract checks.
