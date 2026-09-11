# v0.5 — Daily Money Memory

Release source recovered from the existing September 9 workspace. The audio capture, voice workflow, amount parser, and both Sarvam API routes match the included v0.4 SHA256SUMS baseline.

Adds spoken onboarding, cumulative daily transaction totals, immutable correction events, confirmation idempotency, migration from legacy activity, and storage-failure handling. Final confirmation is required before ledger persistence.

Validation: 65 tests, syntax checks, and static build passed before commit. Live deployment and real provider behavior require separate verification.

Storage remains local to this browser/device. The historic v0.4 public URL returned 404 during this release; checksum preservation does not substitute for physical-device voice QA.
