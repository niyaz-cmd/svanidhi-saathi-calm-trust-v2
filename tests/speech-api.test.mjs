import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSpeechRequest } from '../api/speech.mjs';

test('maps app languages to Sarvam BCP-47 codes', () => {
  assert.deepEqual(normalizeSpeechRequest({ text:'ನಮಸ್ಕಾರ', language:'kn' }), {
    text:'ನಮಸ್ಕಾರ',
    languageCode:'kn-IN'
  });
  assert.deepEqual(normalizeSpeechRequest({ text:'नमस्ते', language:'hi' }), {
    text:'नमस्ते',
    languageCode:'hi-IN'
  });
  assert.deepEqual(normalizeSpeechRequest({ text:'Welcome', language:'en' }), {
    text:'Welcome',
    languageCode:'en-IN'
  });
});

test('rejects missing, unsupported and oversized speech requests', () => {
  assert.equal(normalizeSpeechRequest({ text:'', language:'kn' }), null);
  assert.equal(normalizeSpeechRequest({ text:'hello', language:'fr' }), null);
  assert.equal(normalizeSpeechRequest({ text:'a'.repeat(601), language:'en' }), null);
});
