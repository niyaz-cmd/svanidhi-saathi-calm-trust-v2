import test from 'node:test';
import assert from 'node:assert/strict';
import { loadLedger, appendConfirmedRecord, correctEntry, dailyTotals, LEDGER_KEY } from '../src/core/ledger-store.mjs';
import { createConversationalVoiceWorkflow } from '../src/core/voice-flow.mjs';
const storage = () => { const data = new Map(); return { getItem:k=>data.get(k)??null, setItem:(k,v)=>data.set(k,v) }; };
const at = '2026-09-09T10:00:00.000Z';
const record = (sales,stock)=>({sales,stock,at});
test('confirmed conversations accumulate rather than overwrite the day',()=>{
  const s=storage(); appendConfirmedRecord(s,record(1600,1000),'a');
  const l=appendConfirmedRecord(s,record(700,300),'b');
  assert.deepEqual(dailyTotals(l,new Date(at)),{moneyIn:2300,businessExpense:1300,net:1000});
  assert.equal(loadLedger(s).events.length,4);
});
test('retry of the same confirmation does not double count',()=>{
  const s=storage(); appendConfirmedRecord(s,record(1600,1000),'a');
  assert.equal(appendConfirmedRecord(s,record(1600,1000),'a').events.length,2);
});
test('correction appends history and repeated corrections use the effective amount',()=>{
  const s=storage(); const l=appendConfirmedRecord(s,record(700,300),'a');
  const id=l.events[1].id;
  correctEntry(s,id,250,'fix1',at); const corrected=correctEntry(s,id,200,'fix2',at);
  assert.equal(corrected.events[1].amount,300);
  assert.equal(corrected.events[2].amount,-50);
  assert.equal(corrected.events[3].amount,-50);
  assert.equal(dailyTotals(corrected,new Date(at)).businessExpense,200);
});
test('history is not capped at twenty conversations',()=>{
  const s=storage(); for(let i=0;i<30;i++) appendConfirmedRecord(s,record(10,1),String(i));
  assert.equal(loadLedger(s).events.length,60);
  assert.equal(dailyTotals(loadLedger(s),new Date(at)).net,270);
});
test('daily totals keep dates separate',()=>{
  const s=storage(); appendConfirmedRecord(s,record(1600,1000),'a');
  assert.equal(dailyTotals(loadLedger(s),new Date('2026-09-11T10:00:00Z')).net,0);
});
test('legacy confirmed activity migrates once without discarding the source',()=>{
  const s=storage(); s.setItem('saathi:activity',JSON.stringify([record(1600,1000)]));
  assert.equal(dailyTotals(loadLedger(s),new Date(at)).net,600);
  appendConfirmedRecord(s,record(700,300),'b');
  assert.equal(loadLedger(s).events.length,4);
  assert.ok(s.getItem('saathi:activity'));
});
test('corrupt ledger blocks writes instead of silently losing records',()=>{
  const s=storage();s.setItem(LEDGER_KEY,'broken');
  assert.throws(()=>appendConfirmedRecord(s,record(1600,1000),'a'));
  assert.equal(s.getItem(LEDGER_KEY),'broken');
});
test('negative, fractional, invalid or unsafe amounts cannot enter the ledger',()=>{
  for(const bad of [-1,0.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1])
    assert.throws(()=>appendConfirmedRecord(storage(),record(bad,10),'a'));
});
test('storage failure propagates without claiming a successful save',()=>{
  const s=storage();s.setItem=()=>{throw new Error('quota');};
  assert.throws(()=>appendConfirmedRecord(s,record(10,1),'a'),/quota/);
});
test('voice amount confirmations and rejection do not persist until final confirmation',async()=>{
  const s=storage();const w=createConversationalVoiceWorkflow({now:()=>at,persist:r=>appendConfirmedRecord(s,r,'voice')});
  w.start(); w.captureAmount({turn:'collection',transcript:'1600',parsed:{amount:1600,confidence:'high'}});
  w.rejectAmount('collection');assert.equal(s.getItem(LEDGER_KEY),null);
  for(const [turn,amount] of [['collection',1600],['investment',1000]]) {
    w.captureAmount({turn,transcript:String(amount),parsed:{amount,confidence:'high'}});w.confirmAmount(turn);
  }
  assert.equal(s.getItem(LEDGER_KEY),null);
  await w.confirmRecord({collection:1600,investment:1000});
  assert.equal(dailyTotals(loadLedger(s),new Date(at)).net,600);
  assert.equal(loadLedger(s).onboarding_completed,true);
  await assert.rejects(()=>w.confirmRecord({collection:1600,investment:1000}));
});
