# SVANidhi Saathi prototype readiness

## Positioning

SVANidhi Saathi v0.6.0 is an independent Formetry Labs research prototype. It is not a Government of India service, a bank account, a loan application, an accounting system, or a statement that any authority has approved the product.

Use fictional or sample information during demonstrations. Do not collect Aadhaar, OTP, PIN, CVV, bank passwords, account numbers, or unrelated personal details. The current prototype is for adults aged 18 or older.

## Current data architecture

| Data or action | Where it goes | Current persistence | User control |
| --- | --- | --- | --- |
| Confirmed money entries and corrections | Browser storage on the device | Until local deletion or browser storage is cleared | Correct in Activity, export, or delete |
| Language and privacy choices | Browser storage on the device | Until local deletion or notice version changes | Change in Settings or withdraw and delete |
| Optional research events and notes | Browser storage on the device | Until research is disabled or local data is deleted | Separate opt-in, manual export, withdraw |
| Voice recording | Vercel server route, then Sarvam speech-to-text | Not persisted by application code | Separate opt-in; typing remains available |
| Text sent for speech | Vercel server route, then Sarvam text-to-speech | Not persisted by application code | Separate opt-in; visual text remains available |
| Bill photo | Browser memory for the active page | Not persisted by application code | Leave the page or reload |

The website host and voice provider can retain operational or request data under their own configuration and terms. Confirm the production Vercel and Sarvam retention settings, data locations, contracts, subprocessors, access controls, and deletion process before any real-person pilot.

## Demonstration acceptance checks

- Fresh browser starts with no optional voice or research permission selected.
- Declining consent creates no new Saathi browser record.
- The essential manual-entry path works when voice permission is off.
- Voice and research choices are separate and can be changed later.
- Research withdrawal removes all local research sessions and events.
- Export covers all Saathi-prefixed browser records and excludes other applications' keys.
- Local deletion removes money entries, corrections, language, research data, and consent; it does not claim to delete prior exports or provider records.
- Storage failures are visible and do not produce a false success message.
- Multi-tab consent withdrawal stops capture and playback in another tab when the storage event arrives.
- The existing two-stage amount confirmation and final-only persistence remain intact.
- Kannada money conversion and recognition regression tests remain intact.

## Before a real-person pilot

1. Approve the purposes, data list, retention periods, privacy notice, consent language, and grievance process with qualified Indian privacy counsel and the responsible public authority.
2. Configure and record Sarvam retention for the exact workspace. Obtain the applicable DPA and evidence for data location, deletion, access, incident response, and model-training controls.
3. Record Vercel retention, log access, data location, subprocessors, security controls, and deletion responsibilities.
4. Replace Google-hosted icon fonts with self-hosted assets if the public authority requires fewer third-party connections.
5. Define the controller/data-fiduciary roles among Formetry Labs, the public authority, researchers, Vercel, and Sarvam.
6. Define grievance response ownership for `niyaz@in60z.com`, response times, identity verification, correction, access, withdrawal, erasure, and escalation.
7. Add an authenticated account and server-side synchronization only after defining recovery, authorization, session expiry, device loss, audit logging, encryption keys, retention, and support operations.
8. Run accessibility testing with Kannada, Hindi, and English speakers; Android TalkBack; large text; low-end phones; slow and intermittent networks; and denied microphone permission.
9. Run moderated field research using approved scripts, consent evidence, safe test data, incident procedures, and a documented stop rule.
10. Complete a threat model, privacy impact assessment, dependency review, penetration test, disaster recovery exercise, and production monitoring review.

## DPDP status

The interface applies useful privacy principles: clear standalone notice, specific optional purposes, comparable withdrawal, access/export, correction, deletion, and a named contact. This is design evidence only. It is not legal advice, certification, or proof of organisational compliance.

The 13 November 2025 commencement notification phases the main processing, consent, rights, and obligation provisions to eighteen months after publication. The accompanying Rules also phase their substantive notice, security, breach, retention, rights, and consent provisions. Track the official Gazette and MeitY publications through the pilot; obtain counsel review before using real personal data.
