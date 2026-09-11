# SVANidhi Saathi v0.3

- Replaced one-shot voice capture with continuous recognition, accumulated interim/final chunks, a patient 1.8-second silence window, explicit localized completion, and a 30-second safety timeout.
- Added live transcription and a dedicated transcript-confirmation screen with selected-language speech playback.
- Delayed parsing until transcript confirmation, then revealed editable sales and business-spending fields sequentially.
- Added explicit uncertainty guidance and a second money confirmation before persistence.
- Kept confirmed activity in local storage because no database or authenticated write API is configured. Raw transcripts and unconfirmed amounts are not persisted.
- Added privacy-filtered research events for each Voice First stage and disclosed device speech fallback when remote TTS fails.
- Preserved the v0.2 script-safe typography, hidden operator controls, empty scanner, deterministic finance math, and protected Sarvam endpoint.
