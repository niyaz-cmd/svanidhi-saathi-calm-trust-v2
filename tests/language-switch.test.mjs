import test from 'node:test';
import assert from 'node:assert/strict';
import { languageName, requestedLanguageSwitch } from '../src/core/language-switch.mjs';

test('recognizes explicit spoken requests to change language across supported scripts', () => {
  const examples = [
    ['speak Hindi', 'kn', 'hi'],
    ['switch to Kannada', 'hi', 'kn'],
    ['talk in English', 'kn', 'en'],
    ['हिंदी में बात करो', 'kn', 'hi'],
    ['कन्नड़ में बोलो', 'hi', 'kn'],
    ['इंग्लिश में बात करें', 'hi', 'en'],
    ['ಹಿಂದಿಯಲ್ಲಿ ಮಾತನಾಡಿ', 'kn', 'hi'],
    ['ಕನ್ನಡದಲ್ಲಿ ಮಾತಾಡಿ', 'hi', 'kn'],
    ['ಇಂಗ್ಲಿಷ್ ನಲ್ಲಿ ಮಾತನಾಡಿ', 'kn', 'en']
  ];
  for (const [transcript, current, target] of examples) {
    assert.equal(requestedLanguageSwitch(transcript, current), target, transcript);
  }
});

test('does not treat money or a request for the current language as a switch', () => {
  assert.equal(requestedLanguageSwitch('ನನ್ನ ಮಾರಾಟ 420 ರೂಪಾಯಿ', 'kn'), null);
  assert.equal(requestedLanguageSwitch('हिंदी में बात करो', 'hi'), null);
  assert.equal(requestedLanguageSwitch('I speak Hindi and Kannada', 'kn'), null);
});

test('uses plain names for the confirmation prompt', () => {
  assert.equal(languageName('kn'), 'Kannada');
  assert.equal(languageName('hi'), 'Hindi');
  assert.equal(languageName('en'), 'English');
});
