import test from 'node:test';
import assert from 'node:assert/strict';
import { moneySpeechText } from '../src/core/money-speech.mjs';
import { normalizeSpeechRequest } from '../api/speech.mjs';
import { CARDINALS, readKannadaAmountWords } from './fixtures/kannada-cardinals.mjs';

for(let n=0;n<100;n++) test(`Kannada cardinal ${n} has the complete expected spelling`,()=>{
  assert.equal(moneySpeechText(`₹${n}`,'kn'), `${CARDINALS[n]} ರೂಪಾಯಿ`);
});

test('all 100,000 whole amounts from zero through 99,999 round-trip without lost places',()=>{
  for(let n=0;n<100000;n++) {
    const spoken=moneySpeechText(`₹${n}`,'kn');
    assert.equal(readKannadaAmountWords(spoken),n*100,`₹${n}: ${spoken}`);
  }
});

test('every hundred combines with every one of the 100 paise values',()=>{
  for(let h=0;h<10;h++) for(let p=0;p<100;p++) {
    const n=h*100+24, input=`₹${n}.${String(p).padStart(2,'0')}`;
    assert.equal(readKannadaAmountWords(moneySpeechText(input,'kn')),n*100+p,input);
  }
});

test('Indian and international grouping, native digits, and suffix confirmations agree',()=>{
  for(const n of [0,24,99,100,101,124,999,1000,1024,99999,100000,100024,999999,1000000,9999999,10000000,10000024,999999999]) {
    const plain=String(n), expected=n*100;
    for(const input of [`₹${plain}`, `₹${n.toLocaleString('en-IN')}`, `₹${n.toLocaleString('en-US')}`, `${plain} ರೂಪಾಯಿ`, `₹${plain.replace(/\d/g,d=>String.fromCharCode(0xce6+Number(d)))}`])
      assert.equal(readKannadaAmountWords(moneySpeechText(input,'kn')),expected,input);
  }
});

test('10,000 reproducible larger values retain crore, lakh, thousand, hundred and unit places',()=>{
  let seed=9122026;
  for(let i=0;i<10000;i++) {
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const n=seed%1000000000;
    assert.equal(readKannadaAmountWords(moneySpeechText(`₹${n}`,'kn')),n*100,`₹${n}`);
  }
});

test('negative business balances retain their sign in Kannada speech',()=>{
  for(const input of ['-₹24','₹-24','−₹24','-24 ರೂಪಾಯಿ'])
    assert.equal(moneySpeechText(input,'kn'),'ಮೈನಸ್ ಇಪ್ಪತ್ತನಾಲ್ಕು ರೂಪಾಯಿ',input);
});

test('all two-digit amounts reach the speech API intact',()=>{
  for(let n=0;n<100;n++) assert.equal(normalizeSpeechRequest({text:`ಮೊತ್ತ ₹${n}.`,language:'kn'}).text,`ಮೊತ್ತ ${CARDINALS[n]} ರೂಪಾಯಿ.`);
});

// Group boundaries must not swallow a lower place when composing a larger amount.
test('every 0–999 suffix survives each supported larger place',()=>{
  for(const base of [1000,10000,100000,1000000,10000000,100000000,999999000])
    for(let suffix=0;suffix<1000;suffix++) {
      const n=base+suffix;
      assert.equal(readKannadaAmountWords(moneySpeechText(`₹${n}`,'kn')),n*100,`₹${n}`);
    }
});
