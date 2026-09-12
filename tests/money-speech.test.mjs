import test from 'node:test';
import assert from 'node:assert/strict';
import { moneySpeechText } from '../src/core/money-speech.mjs';
import { normalizeSpeechRequest } from '../api/speech.mjs';

test('Kannada speech keeps the twenty after hundreds and thousands', () => {
  for (const [input, expected] of [
    ['₹20', 'ಇಪ್ಪತ್ತು ರೂಪಾಯಿ'],
    ['₹120', 'ನೂರ ಇಪ್ಪತ್ತು ರೂಪಾಯಿ'],
    ['₹400', 'ನಾಲ್ಕು ನೂರು ರೂಪಾಯಿ'],
    ['₹420', 'ನಾಲ್ಕು ನೂರ ಇಪ್ಪತ್ತು ರೂಪಾಯಿ'],
    ['₹1,320', 'ಒಂದು ಸಾವಿರದ ಮೂರು ನೂರ ಇಪ್ಪತ್ತು ರೂಪಾಯಿ'],
    ['₹7,080', 'ಏಳು ಸಾವಿರದ ಎಂಬತ್ತು ರೂಪಾಯಿ'],
    ['₹8,400', 'ಎಂಟು ಸಾವಿರದ ನಾಲ್ಕು ನೂರು ರೂಪಾಯಿ']
  ]) assert.equal(moneySpeechText(input, 'kn'), expected);
});

test('payment explanation expands every amount without changing the days or punctuation', () => {
  const text = 'ಒಟ್ಟು ಪಾವತಿ ₹8,400. ಈಗ ₹7,080 ಸಿದ್ಧವಾಗಿದೆ. ಇನ್ನೂ ₹1,320 ಬೇಕಾಗಿದೆ. ₹1,320 ಅನ್ನು 11 ದಿನಗಳಿಗೆ ಹಂಚಿದರೆ ದಿನಕ್ಕೆ ₹120.';
  const spoken = moneySpeechText(text, 'kn');
  assert.equal((spoken.match(/ಇಪ್ಪತ್ತು/g) || []).length, 3);
  assert.ok(spoken.includes('11 ದಿನಗಳಿಗೆ'));
  assert.ok(spoken.endsWith('ದಿನಕ್ಕೆ ನೂರ ಇಪ್ಪತ್ತು ರೂಪಾಯಿ.'));
  assert.equal(normalizeSpeechRequest({text, language:'kn'}).text, spoken);
});

test('amount confirmation, native digits, paise, and repeated normalization preserve value', () => {
  assert.equal(moneySpeechText('420 ರೂಪಾಯಿ ಸೇರಿಸುತ್ತೇನೆ.', 'kn'), 'ನಾಲ್ಕು ನೂರ ಇಪ್ಪತ್ತು ರೂಪಾಯಿ ಸೇರಿಸುತ್ತೇನೆ.');
  assert.equal(moneySpeechText('₹೪೨೦', 'kn'), 'ನಾಲ್ಕು ನೂರ ಇಪ್ಪತ್ತು ರೂಪಾಯಿ');
  assert.equal(moneySpeechText('₹420.50', 'kn'), 'ನಾಲ್ಕು ನೂರ ಇಪ್ಪತ್ತು ರೂಪಾಯಿ ಐವತ್ತು ಪೈಸೆ');
  assert.equal(moneySpeechText('₹0', 'kn'), 'ಸೊನ್ನೆ ರೂಪಾಯಿ');
  const spoken = moneySpeechText('₹421', 'kn');
  assert.equal(spoken, 'ನಾಲ್ಕು ನೂರ ಇಪ್ಪತ್ತೊಂದು ರೂಪಾಯಿ');
  assert.equal(moneySpeechText(spoken, 'kn'), spoken);
});

test('other languages and unsupported amounts are never partially rewritten', () => {
  for (const lang of ['en', 'hi']) assert.equal(moneySpeechText('₹420', lang), '₹420');
  for (const text of ['₹4,20', '₹420.123', '₹1.2.3', '₹1e6', '₹1000000000', '11 ದಿನ'])
    assert.equal(moneySpeechText(text, 'kn'), text);
});
