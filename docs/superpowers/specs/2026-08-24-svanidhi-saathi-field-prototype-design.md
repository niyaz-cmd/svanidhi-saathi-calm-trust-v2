# SVANidhi Saathi Field Prototype v0.1 — Design Specification

## Product purpose
Build a field-grade, installable Android-friendly prototype that street vendors can actually use during moderated research. It must validate the core product thesis before production engineering: a vendor should be able to understand what is due, when it is due, and what to keep aside without navigating financial jargon.

## Prototype strategy
The field build is an installable Progressive Web App (PWA) optimized for Android Chrome. This is intentional for v0.1: it gives us real camera capture, device speech recognition where supported, speech playback, offline app-shell behavior, and local event logging without API keys or a build pipeline. The validated interaction model can later be moved to Expo/React Native after field evidence.

## Modes
### Demo Mode
A deterministic, bulletproof journey using fictional Lakshmi data. It must never depend on a live bank, PM SVANidhi account, external API, or real financial data.

### Field Test Mode
A vendor uses the same interface directly. The app records only usability/research events locally: task starts/completions, corrections, timestamps, selected language, and operator notes. It must not request Aadhaar, OTP, PIN, CVV, card number, or banking password.

## Core journey
1. Language: Kannada, Hindi, English.
2. Trust-before-data safety screen.
3. Home: one upcoming payment and one primary action.
4. Daily voice check-in: vendor reports sales and stock.
5. Money confirmation: parsed amounts are never saved without explicit confirmation.
6. Deterministic reserve guidance.
7. Explain My Bill: real camera/photo capture using a fictional test statement.
8. Bill explanation: amount → date → action, plus minimum-due explanation and provenance.
9. Ask Saathi: bounded questions about the fictional bill/payment.
10. Activity: simple history, not accounting.
11. Offline state: app shell and saved information remain usable; unsupported network-dependent features disclose limits.
12. Uncertain bill read: Saathi refuses to guess a financial amount and requires retake/manual confirmation.

## Financial logic
- All authoritative arithmetic is deterministic JavaScript, never generated text.
- Demo obligation: total due ₹8,400, ready amount ₹7,080, due in 11 days, remaining ₹1,320.
- Suggested reserve = ceil(remaining / remainingDays) rounded up to nearest ₹10; demo result ₹120.
- If remaining <= 0, reserve is ₹0 and status is `ready`.
- If days <= 0 and money remains, status is `due_now`.
- AI/voice parsing may propose extracted amounts, but user confirmation is mandatory before saving.

## Voice
- Use Android Chrome SpeechRecognition/webkitSpeechRecognition when available; no API key.
- Support `kn-IN`, `hi-IN`, and `en-IN` recognition locale selection.
- Provide manual text/amount entry fallback on every voice flow.
- Browser speech recognition may require network/device services; do not claim offline voice support.
- Speech playback uses `speechSynthesis` when available and must also show the exact text onscreen.

## Bill capture
- Camera/photo input is real.
- v0.1 does not claim production OCR. In Demo/Field Sample mode, the captured fictional statement maps to controlled sample values.
- If the operator selects `uncertain read`, the app must visibly mark the amount as unconfirmed and must not use it for financial calculations.
- Production OCR is explicitly out of scope for v0.1.

## Trust and safety
- Trust screen before any money interaction.
- Never ask for Aadhaar, OTP, PIN, CVV, full card number, or banking password.
- Never imply bank/government endorsement.
- Never initiate payments, credit applications, or lending decisions.
- Never shame missed payments.
- Never silently infer uncertain financial values.
- Every bill-derived value can reveal its source/provenance.

## Design system
- `Calm Trust`: deep forest green, warm cream canvas, restrained saffron, high contrast, large money typography, soft geometry, low cognitive load.
- Kannada-first copy, with English support text where useful during research.
- One screen answers one question.
- Touch targets >= 48px.
- Status never relies on color alone.
- Reduced-motion preference is respected.

## Research instrumentation
Store locally under a generated session ID:
- timestamp
- mode
- language
- event name
- small non-sensitive event payload

Provide a research drawer for:
- session ID
- task checklist
- help-needed toggle
- trust concern
- would-use-again
- exact quote
- notes
- export session as JSON

No cloud sync in v0.1.

## Success criteria
- Runnable locally with Node >= 20 and no package install.
- Installable PWA on Android Chrome.
- Works without API keys.
- Core demo works even when speech recognition is unavailable.
- Deterministic finance tests pass.
- Speech amount parsing tests pass for representative Kannada/Hindi/English transcript forms.
- App shell works offline after first load.
- No critical financial value is persisted before confirmation.
- Prototype contains explicit uncertainty and provenance states.

## Out of scope
- Real bank integrations.
- Real PM SVANidhi accounts.
- Payment initiation/autopay.
- Credit scoring or eligibility.
- Production OCR.
- Production authentication.
- Cloud backend.
- Production analytics.
- More than Kannada/Hindi/English.
