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

test('all 0–99,999 spoken confirmations are understood as the same amount', async()=>{
  const {parseCurrencyAmount}=await import('../src/core/speech-parser.mjs');
  for(let n=0;n<100000;n++) {
    const transcript=moneySpeechText(`₹${n}`,'kn');
    assert.equal(parseCurrencyAmount(transcript,{language:'kn'}).amount,n,transcript);
  }
});

test('larger Kannada words preserve value and ambiguous or negative money is rejected',async()=>{
  const {parseCurrencyAmount}=await import('../src/core/speech-parser.mjs');
  for(const n of [1024,1320,7080,8400,100024,10000024,999999999])
    assert.equal(parseCurrencyAmount(moneySpeechText(`₹${n}`,'kn'),{language:'kn'}).amount,n);
  assert.equal(parseCurrencyAmount('ನಾನೂರ ಇಪ್ಪತ್ತನಾಲ್ಕು ರೂಪಾಯಿ',{language:'kn'}).amount,424);
  for(const text of ['ಇಪ್ಪತ್ತನಾಲ್ಕು ಅಥವಾ ಇಪ್ಪತ್ತೈದು','ಮೈನಸ್ ಇಪ್ಪತ್ತನಾಲ್ಕು ರೂಪಾಯಿ','-₹24','₹-24'])
    assert.equal(parseCurrencyAmount(text,{language:'kn'}).amount,null,text);
});

test('mixed digits and Kannada scales count each numeric token once',async()=>{
  const {parseCurrencyAmount}=await import('../src/core/speech-parser.mjs');
  for(const [text,n] of [['1 ಕೋಟಿಯ 24 ರೂಪಾಯಿ',10000024],['99 ಕೋಟಿಯ 99 ಲಕ್ಷದ 99 ಸಾವಿರದ 999 ರೂಪಾಯಿ',999999999],['1 ಸಾವಿರದ 24 ರೂಪಾಯಿ',1024]])
    assert.equal(parseCurrencyAmount(text,{language:'kn'}).amount,n,text);
  assert.equal(parseCurrencyAmount('24 ಅಥವಾ 1 ಸಾವಿರದ 24 ರೂಪಾಯಿ',{language:'kn'}).amount,null);
});

test('live-audit checker understands contracted hundreds and mixed digit/word scales',async()=>{
 const {extractAuditAmounts}=await import('./fixtures/kannada-cardinals.mjs');
 assert.deepEqual(extractAuditAmounts('ಮೊತ್ತ ಏಳುನೂರು ರೂಪಾಯಿ.'),[700]);
 assert.deepEqual(extractAuditAmounts('ಮೊತ್ತ 99 ಕೋಟಿಯ 99 ಲಕ್ಷದ 99 ಸಾವಿರದ 999 ರೂಪಾಯಿ.'),[999999999]);
 assert.deepEqual(extractAuditAmounts('ಮೊತ್ತ ಮೈನಸ್ ನೂರ ಇಪ್ಪತ್ತನಾಲ್ಕು ರೂಪಾಯಿ.'),[-124]);
});

test('actual Sarvam hundred contractions preserve the entire amount',async()=>{
 const {parseCurrencyAmount}=await import('../src/core/speech-parser.mjs');
 for(const [text,n] of [['ನಾಲ್ಕುನೂರು',400],['ನಾಲ್ಕುನೂರ ಒಂದು',401],['ಆರುನೂರ ಇಪ್ಪತ್ತನಾಲ್ಕು',624],['ಏಳುನೂರ ತೊಂಬತ್ತೊಂಬತ್ತು',799],['ಒಂಬತ್ತುನೂರೊಂದು',901],['ಒಂಬತ್ತುನೂರಇಪ್ಪತ್ತನಾಲ್ಕು',924],['ಒಂಬತ್ತುನೂರತೊಂಬತ್ತೊಂಬತ್ತು',999],['ತೊಂಬತ್ತೊಂಬತ್ತು ಸಾವಿರದ ಒಂಬೈನೂರ ತೊಂಬತ್ತೊಂಬತ್ತು',99999]])
   assert.equal(parseCurrencyAmount(text+' ರೂಪಾಯಿ',{language:'kn'}).amount,n,text);
});

test('separate numeric phrases are never merged across punctuation',async()=>{
 const {parseCurrencyAmount}=await import('../src/core/speech-parser.mjs');
 for(const text of ['24, ಒಂದು ರೂಪಾಯಿ','ಒಂದು ನೂರು; ಇಪ್ಪತ್ತನಾಲ್ಕು','1 ಸಾವಿರ. 24 ರೂಪಾಯಿ'])
   assert.equal(parseCurrencyAmount(text,{language:'kn'}).amount,null,text);
});
