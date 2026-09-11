# ADR-004: Sarvam-authoritative money transcription

**Status:** Accepted  
**Date:** 2026-09-05  
**Scope:** Voice First money entry only

## Context

Android Chrome's built-in speech recognition repeatedly rejected a clearly spoken ₹1,500 even though the same sentence passed deterministic amount parsing. Text-parser patches could not fix an unreliable upstream transcript. The prototype already has a protected server-side `SARVAM_API_KEY`, a short two-turn conversation, and a strict confirmation-before-save rule.

## Decision

Browser speech recognition is removed from the authoritative money path. The app records each short answer, detects 2.3 seconds of silence after meaningful sound, and sends the ephemeral audio to a same-origin Vercel function. The function calls Sarvam Saaras v4 and returns only the transcript. Deterministic parsing and per-amount confirmation remain local.

```text
Sarvam Bulbul prompt finishes
          ↓
120 ms echo guard
          ↓
MediaRecorder + local audio-level VAD
          ↓  WebM/Opus, maximum 29 seconds
/api/transcribe (same origin, rate/size limited)
          ↓  server-side secret only
Sarvam Saaras v4 /speech-to-text
          ↓
Transcript → deterministic amount parser
          ↓
Sarvam repeat-back → user confirms
          ↓
Final editable summary → local persistence
```

## Boundaries

- Audio and transcripts are held only in memory for the active turn; they are not written to storage or research logs.
- The Sarvam key never reaches the browser.
- Each audio request is limited to 8 MB and 29 seconds, below the REST API's 30-second limit.
- Browser codec parameters are accepted at the same-origin boundary, but the upstream multipart file uses the base media type (`audio/webm`) because Sarvam rejects Chrome's `audio/webm;codecs=opus` label with HTTP 400.
- Browser/device TTS is an offline-only fallback; all online prompts use Sarvam Bulbul v3.
- If Sarvam transcription fails, the app asks for another attempt or manual entry. It does not guess an amount.

## Trade-offs

- Final transcription has a network round trip, but it uses the intended Indian-language model and removes device-dependent browser STT from financial interpretation.
- True live interim words require Sarvam Realtime Streaming and a WebSocket credential proxy. That is deferred; the field prototype shows a live listening state and confirms the server transcript after the turn.
- Device microphone and acoustic performance still require physical Android field QA.

## Verification gate

Production is releasable only after a real audio file containing “I made 1,500 rupees sales today” passes through the deployed `/api/transcribe` endpoint, returns a transcript that parses to ₹1,500, and the public source is verified to use `VoiceAudioCapture` instead of browser recognition.
