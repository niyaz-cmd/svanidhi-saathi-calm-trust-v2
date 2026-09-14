import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeTranscriptionRequest } from '../api/transcribe.mjs';

test('validates short browser audio and maps supported locales for Sarvam STT', () => {
  assert.deepEqual(normalizeTranscriptionRequest({ language:'en', contentType:'audio/webm;codecs=opus', contentLength:12000 }), {
    languageCode:'en-IN', contentType:'audio/webm;codecs=opus', upstreamContentType:'audio/webm', extension:'webm'
  });
  assert.deepEqual(normalizeTranscriptionRequest({ language:'en', contentType:'audio/webm', contentLength:undefined }), {
    languageCode:'en-IN', contentType:'audio/webm', upstreamContentType:'audio/webm', extension:'webm'
  });
  assert.deepEqual(normalizeTranscriptionRequest({ language:'auto', contentType:'audio/webm', contentLength:12000 }), {
    languageCode:'unknown', contentType:'audio/webm', upstreamContentType:'audio/webm', extension:'webm'
  });
  assert.equal(normalizeTranscriptionRequest({ language:'xx', contentType:'audio/webm', contentLength:12000 }), null);
  assert.equal(normalizeTranscriptionRequest({ language:'en', contentType:'text/plain', contentLength:12000 }), null);
  assert.equal(normalizeTranscriptionRequest({ language:'en', contentType:'audio/webm', contentLength:9_000_000 }), null);
});

test('strips Chrome codec parameters before constructing the Sarvam multipart file', () => {
  const speech = normalizeTranscriptionRequest({
    language:'en',
    contentType:'audio/webm;codecs=opus',
    contentLength:18000
  });

  assert.equal(speech.contentType, 'audio/webm;codecs=opus');
  assert.equal(speech.upstreamContentType, 'audio/webm');
});

test('server transcription uses Saaras v4 without exposing or logging audio/transcripts', () => {
  const source = fs.readFileSync(new URL('../api/transcribe.mjs', import.meta.url), 'utf8');
  assert.match(source, /https:\/\/api\.sarvam\.ai\/speech-to-text/);
  assert.match(source, /form\.append\('model', 'saaras:v4'\)/);
  assert.match(source, /form\.append\('mode', 'transcribe'\)/);
  assert.match(source, /new Blob\(\[audio\], \{ type:speech\.upstreamContentType \}\)/);
  assert.match(source, /process\.env\.SARVAM_API_KEY/);
  assert.doesNotMatch(source, /console\.(?:log|info)\([^\n]*(?:transcript|audio)/i);
});
