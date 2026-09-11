# SVANidhi Saathi Field Prototype v0.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Build an installable, no-API-key field prototype that street vendors can actually use to test voice entry, deterministic repayment guidance, fictional bill explanation, uncertainty handling, provenance, and research logging.

**Architecture:** Static modular PWA using browser APIs and pure JavaScript modules. Financial rules, speech parsing, and research event serialization are isolated in testable core modules; UI state is a thin layer over those primitives. Service worker caches the app shell, while camera/speech capabilities degrade to explicit fallbacks.

**Tech Stack:** HTML5, CSS3, JavaScript ES modules, Node.js built-in test runner, Service Worker, Web App Manifest, Web Speech APIs, File/Camera input, localStorage.

**Spec:** `docs/superpowers/specs/2026-08-24-svanidhi-saathi-field-prototype-design.md`

## Global Constraints
- No external runtime dependencies and no API keys.
- Kannada, Hindi, English only.
- Deterministic money calculation; never generated arithmetic.
- Financial values are not persisted before explicit confirmation.
- Real camera capture, controlled fictional statement extraction only.
- No real bank, government, payment, credit-score, or lending integration.
- App shell remains usable offline after first load.
- Touch targets >= 48px and status does not rely on color alone.

---

### Task 1: Deterministic finance engine
**Files:**
- Test: `tests/finance-engine.test.mjs`
- Create: `src/core/finance-engine.mjs`

**Interfaces:**
- Produces: `calculateReserve({totalDue, readyAmount, remainingDays}) -> {remaining, dailyReserve, status}`
- Produces: `explainMinimumDue({totalDue, minimumDue}) -> {remainingIfMinimumPaid, clearsBill}`

- [x] Write failing tests for demo reserve, already-ready state, due-now state, and minimum-due arithmetic.
- [x] Run `node --test tests/finance-engine.test.mjs` and verify failures are missing-module/export failures.
- [x] Implement minimal deterministic functions.
- [x] Re-run tests and verify pass.
- [x] Commit.

### Task 2: Multilingual transcript parsing
**Files:**
- Test: `tests/speech-parser.test.mjs`
- Create: `src/core/speech-parser.mjs`

**Interfaces:**
- Produces: `parseDailyAmounts(transcript) -> {sales, stock, confidence, rawNumbers}`

- [x] Write failing tests for English, Kannada-keyword, Hindi-keyword, and numeric fallback transcripts.
- [x] Run and verify correct failure.
- [x] Implement parser that extracts currency-formatted/numeric values and maps keywords; fallback to first two values with lower confidence.
- [x] Re-run tests and verify pass.
- [x] Commit.

### Task 3: Research event model
**Files:**
- Test: `tests/research-events.test.mjs`
- Create: `src/core/research-events.mjs`

**Interfaces:**
- Produces: `newSessionId() -> string`
- Produces: `createResearchEvent({sessionId, mode, language, name, payload, at}) -> ResearchEvent`
- Produces: `serializeSession({session, events}) -> string`

- [x] Write failing tests for stable shape, safe payload filtering, and JSON export.
- [x] Run and verify correct failure.
- [x] Implement allowlisted event payload fields and serialization.
- [x] Re-run tests and verify pass.
- [x] Commit.

### Task 4: PWA shell and Calm Trust UI
**Files:**
- Create: `index.html`
- Create: `styles.css`
- Create: `manifest.webmanifest`
- Create: `public/icons/icon.svg`
- Create: `src/app.mjs`
- Create: `src/ui/icons.mjs`

**Interfaces:**
- Consumes core functions from Tasks 1-3.
- Produces user-visible screen state and navigation.

- [x] Create semantic app shell with mobile viewport, accessible buttons, live region, and research drawer host.
- [x] Implement design tokens, mobile layout, large-number typography, and reduced-motion behavior.
- [x] Build screen renderer for language, trust, home, voice, confirm, guidance, bill capture, bill explanation, ask, activity, offline, uncertain read.
- [x] Connect deterministic demo values from finance engine.
- [x] Run full tests.
- [x] Commit.

### Task 5: Live device capabilities and safe fallbacks
**Files:**
- Create: `src/core/device-capabilities.mjs`
- Modify: `src/app.mjs`

**Interfaces:**
- Produces: `startSpeechRecognition({lang,onResult,onError,onEnd})`
- Produces: `speak(text, lang)`
- UI camera uses `<input type=file accept=image/* capture=environment>`.

- [x] Add speech-recognition feature detection and visible manual-entry fallback.
- [x] Add language locale mapping `kn-IN`, `hi-IN`, `en-IN`.
- [x] Add speech synthesis playback with visible text parity.
- [x] Add real image capture/preview; map fictional test statement to controlled values only after operator confirmation.
- [x] Add explicit `uncertain read` branch that blocks calculation use.
- [x] Run tests and manual smoke test in browser.
- [x] Commit.

### Task 6: Offline app shell and research operator controls
**Files:**
- Create: `service-worker.js`
- Modify: `src/app.mjs`

**Interfaces:**
- Service worker caches app shell.
- Research drawer writes only non-sensitive local data and exports JSON.

- [x] Add service worker install/activate/fetch cache behavior.
- [x] Register service worker and surface online/offline state.
- [x] Implement research drawer: task checks, help-needed, trust concern, would-use-again, exact quote, notes.
- [x] Implement session JSON download.
- [x] Run tests and browser smoke checks.
- [x] Commit.

### Task 7: Local server, documentation, and verification
**Files:**
- Create: `scripts/dev-server.mjs`
- Create: `package.json`
- Create: `README.md`

**Interfaces:**
- `npm test` -> Node test suite.
- `npm run dev` -> localhost static server.

- [x] Create dependency-free local HTTP server with correct MIME types and no-cache headers for development.
- [x] Add package scripts.
- [x] Write setup instructions for laptop and Android phone on same Wi-Fi, plus PWA installation steps.
- [x] Run `npm test`.
- [x] Start server and curl critical files/status.
- [x] Run syntax checks for all `.mjs` files.
- [x] Create distributable ZIP and SHA-256 manifest.
- [x] Commit final verified state.
