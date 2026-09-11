# v0.5.1 — Kannada amount pronunciation

Expand Kannada currency amounts into spoken words before online TTS and offline device speech. This preserves tens and units in amounts such as 120, 420 and 1,320; display and ledger amounts are unchanged. The same formatter applies to API requests and amount confirmations.

The reported defect reproduced against production: generated speech for the raw 420 currency token transcribed as 400, while explicit Kannada wording transcribed as 420. This is a synthetic provider round-trip check, not physical-device microphone or listening QA.

Validation: 69 tests, syntax checks, and build passed. Added regressions for the reported payment explanation, native digits, paise, amount confirmations, invalid tokens and offline speech. Cache version advanced so the offline shell includes the new module.
