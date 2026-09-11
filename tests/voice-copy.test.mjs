import test from 'node:test';
import assert from 'node:assert/strict';
import { VOICE_CONVERSATION_COPY } from '../src/core/voice-copy.mjs';
import { LANGUAGE_LOCALES } from '../src/core/device-capabilities.mjs';

test('Kannada and Hindi prompts use correct locales and native scripts', () => {
  assert.equal(LANGUAGE_LOCALES.kn, 'kn-IN');
  assert.equal(LANGUAGE_LOCALES.hi, 'hi-IN');
  assert.match(VOICE_CONVERSATION_COPY.kn.collectionQuestion, /[\u0C80-\u0CFF]/u);
  assert.match(VOICE_CONVERSATION_COPY.hi.collectionQuestion, /[\u0900-\u097F]/u);
  assert.doesNotMatch(VOICE_CONVERSATION_COPY.kn.collectionQuestion, /vasuli|basuli/i);
  assert.doesNotMatch(VOICE_CONVERSATION_COPY.hi.collectionQuestion, /vasuli|basuli/i);
});

test('voice prompts ask one amount at a time with consistent terminology', () => {
  assert.match(VOICE_CONVERSATION_COPY.kn.collectionQuestion, /ಮಾರಾಟ/);
  assert.match(VOICE_CONVERSATION_COPY.hi.collectionQuestion, /बिक्री/);
  assert.match(VOICE_CONVERSATION_COPY.en.collectionQuestion, /sales/i);
  for (const language of ['kn', 'hi', 'en']) {
    assert.notEqual(VOICE_CONVERSATION_COPY[language].collectionQuestion, VOICE_CONVERSATION_COPY[language].investmentQuestion);
  }
});
