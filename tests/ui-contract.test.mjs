import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../src/app.mjs', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const icons = fs.readFileSync(new URL('../src/ui/icons.mjs', import.meta.url), 'utf8');

test('uses canonical demo payment data that reconciles to ₹120 per day', () => {
  assert.match(app, /totalDue:8400, readyAmount:7080, remainingDays:11/);
});

test('loads Google Material Symbols Rounded and maps UI icons to material symbols', () => {
  assert.match(html, /Material\+Symbols\+Rounded/);
  assert.match(icons, /material-symbols-rounded/);
  assert.match(icons, /receipt_long/);
  assert.match(icons, /document_scanner/);
});

test('gives Kannada and Hindi headings script-safe typography', () => {
  assert.match(css, /data-language="kn"[^}]*h1/);
  assert.match(css, /letter-spacing:\s*0/);
  assert.match(css, /line-height:\s*1\.3/);
});

test('research controls are not exposed as a visible floating vendor control', () => {
  assert.doesNotMatch(app, /class=\\"research-fab\\"/);
  assert.match(app, /operator-tap/);
});

test('uses Sarvam human voice for introductions and Ask Saathi answers', () => {
  const device = fs.readFileSync(new URL('../src/core/device-capabilities.mjs', import.meta.url), 'utf8');
  const speechApi = fs.readFileSync(new URL('../api/speech.mjs', import.meta.url), 'utf8');
  const voiceCopy = fs.readFileSync(new URL('../src/core/voice-copy.mjs', import.meta.url), 'utf8');
  assert.match(voiceCopy, /Welcome back/);
  assert.match(voiceCopy, /How much new sales money should I add/);
  assert.match(app, /await playSaathiSpeech\(state\.answer, 'answer_played'\)/);
  assert.match(device, /fetch\('\/api\/speech'/);
  assert.match(device, /provider:'sarvam-bulbul-v3'/);
  assert.match(speechApi, /model:'bulbul:v3'/);
});

test('uses Sarvam for every online conversational prompt instead of device TTS', () => {
  assert.doesNotMatch(app, /fixedPrompt:true/);
  assert.doesNotMatch(app, /preferDevice:fixedPrompt/);
  assert.match(app, /preloadConversationSpeech\(\)/);
});

test('shows the complete payment calculation and does not claim on-track status', () => {
  assert.match(app, /payment-breakdown/);
  assert.match(app, /readyNow:'Ready now'/);
  assert.match(app, /stillNeeded:'Still needed'/);
  assert.match(app, /divided across/);
  assert.doesNotMatch(app, /onTrack:'On track'/);
});

test('implements the v0.5 ledger with preserved conversational amount confirmation sequence', () => {
  const serviceWorker = fs.readFileSync(new URL('../service-worker.js', import.meta.url), 'utf8');
  assert.match(app, /prototype_v0\.5/);
  assert.match(app, /new VoiceAudioCapture/);
  assert.match(app, /transcribeRecordedAudio/);
  assert.doesNotMatch(app, /startSpeechRecognition\(\{/);
  assert.match(serviceWorker, /audio-capture\.mjs/);
  assert.match(app, /data-action="finish-voice"/);
  assert.match(app, /data-action="confirm-amount"/);
  assert.match(app, /data-action="reject-amount"/);
  assert.match(app, /scheduleStructuredReveal\(\)/);
  assert.match(app, /voiceWorkflow\.confirmRecord/);
  assert.match(app, /waitForGuard:\(\) => wait\(120\)/);
  assert.doesNotMatch(app, /if \(isFinal\).*go\('confirm'\)/);
});

test('logs every required privacy-safe v0.4 Voice First research event', () => {
  for (const eventName of [
    'prompt_started', 'prompt_finished', 'listening_started', 'speech_started',
    'turn_finished', 'transcription_started', 'transcription_finished', 'amount_parsed', 'amount_confirmed',
    'amount_rejected', 'final_record_confirmed', 'persistence_success', 'persistence_failure'
  ]) assert.match(app, new RegExp(`log\\('${eventName}'`));
  assert.doesNotMatch(app, /transcription_finished[^\n]*transcript/);
});
