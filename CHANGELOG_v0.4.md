# SVANidhi Saathi v0.4

- Replaced the single long sales-plus-spending dictation with two short conversational turns and a confirmation after each amount.
- Added a native-language greeting, one-question-at-a-time prompts, true TTS completion waiting, and a 350 ms echo guard before speech recognition starts.
- Increased patient silence completion to 2.3 seconds after meaningful speech and the safety timeout to 35 seconds; unexpected recognition end now restarts within the active turn.
- Preserved stable final transcript prefixes so later browser result revisions cannot reduce 1600 to 600 or 1200 to 200.
- Added deterministic Indian-currency parsing for digits, split digit chunks, and common English, Hindi, and Kannada hundred/thousand phrases. Ambiguous multiple amounts trigger a repeat instead of a guess.
- Replaced Kannada/Hindi collection slang in prompts and labels with native-script daily sales terminology; STT uses `kn-IN`, `hi-IN`, or `en-IN` plus contextual hints where the browser supports them.
- v0.4.1 voice patch: restored protected Sarvam Bulbul v3 for every online conversational prompt and repeat-back. The greeting and two fixed amount questions are preloaded and reused to reduce waiting. Device TTS remains a disclosed offline-only fallback; online provider failure never silently changes to a robotic voice.
- v0.4.2 capture patch: normalized Chrome STT formatting variants such as `15 00`, `1 5 0 0`, `15 hundred`, `fifteen 100`, and `1,500.00`; accepted code-mixed English/Hindi/Kannada amount words; and reduced the post-audio mic guard from 350 ms to 120 ms after measuring 137 ms of trailing quiet audio in the live English sales prompt.
- v0.4.3 architecture fix: removed browser speech recognition from the authoritative money path. Each short answer is recorded with local 2.3-second silence detection, sent as ephemeral audio to the protected same-origin `/api/transcribe` endpoint, transcribed by Sarvam Saaras v4, then parsed and repeated back for confirmation. The browser never receives the Sarvam key and neither audio nor transcript is persisted before the final confirmed record.
- Added privacy-filtered prompt, listening, restart, parse, confirmation, persistence, and latency events without logging raw transcripts or credentials.
- Retained editable final amounts and localStorage-only persistence. No configured database or authenticated write API was found.
- Preserved all unrelated v0.2/v0.3 screens and safety constraints.
