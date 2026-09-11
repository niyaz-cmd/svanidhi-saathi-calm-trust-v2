import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCurrencyAmount, parseDailyAmounts } from '../src/core/speech-parser.mjs';

test('parses English sales and stock amounts', () => {
  assert.deepEqual(parseDailyAmounts('Today sales ₹1,850 and stock ₹900'), {
    sales: 1850, stock: 900, confidence: 'high', rawNumbers: [1850, 900]
  });
});

test('parses collections and business spending in all supported languages', () => {
  assert.deepEqual(parseDailyAmounts('Today I collected 1850 and spent 900 on the business'), {
    sales: 1850, stock: 900, confidence: 'high', rawNumbers: [1850, 900]
  });
  assert.deepEqual(parseDailyAmounts('ಇಂದು 1850 ವಸೂಲಿ ಮತ್ತು ವ್ಯಾಪಾರಕ್ಕೆ 900 ಖರ್ಚು'), {
    sales: 1850, stock: 900, confidence: 'high', rawNumbers: [1850, 900]
  });
  assert.deepEqual(parseDailyAmounts('आज 1850 की वसूली हुई और कारोबार पर 900 खर्च हुए'), {
    sales: 1850, stock: 900, confidence: 'high', rawNumbers: [1850, 900]
  });
});

test('parses Kannada keyword transcript with digits', () => {
  assert.deepEqual(parseDailyAmounts('ಇಂದು 1850 ಮಾರಾಟ ಮತ್ತು 900 ಸ್ಟಾಕ್'), {
    sales: 1850, stock: 900, confidence: 'high', rawNumbers: [1850, 900]
  });
});

test('parses Hindi keyword transcript with digits', () => {
  assert.deepEqual(parseDailyAmounts('आज बिक्री 1850 और स्टॉक 900'), {
    sales: 1850, stock: 900, confidence: 'high', rawNumbers: [1850, 900]
  });
});

test('falls back to first two numbers with lower confidence', () => {
  assert.deepEqual(parseDailyAmounts('1850, 900'), {
    sales: 1850, stock: 900, confidence: 'medium', rawNumbers: [1850, 900]
  });
});

test('returns nulls when fewer than two amounts are present', () => {
  assert.deepEqual(parseDailyAmounts('sales 1850 only'), {
    sales: 1850, stock: null, confidence: 'low', rawNumbers: [1850]
  });
});

test('preserves 1600 and 1200 when leading digits arrive as separate chunks', () => {
  assert.deepEqual(parseCurrencyAmount('today collection 1 600', { language:'en' }), {
    amount:1600, candidates:[1600], confidence:'high'
  });
  assert.deepEqual(parseCurrencyAmount('today collection 1 200', { language:'en' }), {
    amount:1200, candidates:[1200], confidence:'high'
  });
});

test('normalizes common English spoken amount forms deterministically', () => {
  for (const phrase of ['sixteen hundred', 'one thousand six hundred']) {
    assert.equal(parseCurrencyAmount(phrase, { language:'en' }).amount, 1600);
  }
  for (const phrase of ['twelve hundred', 'one thousand two hundred']) {
    assert.equal(parseCurrencyAmount(phrase, { language:'en' }).amount, 1200);
  }
});

test('normalizes Chrome STT variants of fifteen hundred without rejecting the amount', () => {
  for (const phrase of ['1500', '1,500.00', '15 00', '1 5 0 0', '15 hundred', 'fifteen 100', 'one five zero zero']) {
    assert.deepEqual(parseCurrencyAmount(phrase, { language:'en' }), {
      amount:1500, candidates:[1500], confidence:'high'
    });
  }
});

test('accepts code-mixed amount words regardless of the selected prompt language', () => {
  assert.equal(parseCurrencyAmount('fifteen hundred', { language:'kn' }).amount, 1500);
  assert.equal(parseCurrencyAmount('पंद्रह सौ', { language:'en' }).amount, 1500);
  assert.equal(parseCurrencyAmount('ಹದಿನೈದು ನೂರು', { language:'en' }).amount, 1500);
});

test('normalizes Hindi and Kannada spoken amount forms', () => {
  assert.equal(parseCurrencyAmount('सोलह सौ रुपये', { language:'hi' }).amount, 1600);
  assert.equal(parseCurrencyAmount('एक हजार दो सौ', { language:'hi' }).amount, 1200);
  assert.equal(parseCurrencyAmount('ಹದಿನಾರು ನೂರು ರೂಪಾಯಿ', { language:'kn' }).amount, 1600);
  assert.equal(parseCurrencyAmount('ಒಂದು ಸಾವಿರ ಎರಡು ನೂರು', { language:'kn' }).amount, 1200);
});

test('multiple plausible amounts are rejected instead of guessed', () => {
  assert.deepEqual(parseCurrencyAmount('maybe 1600 or 1500', { language:'en' }), {
    amount:null, candidates:[1600, 1500], confidence:'low'
  });
});
