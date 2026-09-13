import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultPrivacy, readPrivacy, savePrivacy, PRIVACY_KEY, NOTICE_VERSION, exportLocalData, deleteLocalData, deleteResearchData } from '../src/core/privacy-store.mjs';
function storage(entries = {}) {
  const data=new Map(Object.entries(entries));
  return { get length(){return data.size;},key:i=>[...data.keys()][i],getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k) };
}
test('no implicit consent for fresh, corrupt, old or unavailable storage',()=>{
  for(const raw of [null,'{','{}',JSON.stringify({...defaultPrivacy(),noticeVersion:'old',acceptedAt:new Date().toISOString(),voice:true})]) {
    const s=storage(raw ? {[PRIVACY_KEY]:raw} : {}); assert.deepEqual(readPrivacy(s),defaultPrivacy());
  }
  assert.equal(readPrivacy({getItem(){throw Error('blocked');}}).voice,false);
});
test('explicit choices persist with notice version, language and original acceptance time',()=>{
  const s=storage(); const a=savePrivacy(s,{language:'kn',voice:false,research:false},'2026-09-13T12:00:00Z');
  const b=savePrivacy(s,{language:'hi',voice:true,research:false},'2026-09-14T12:00:00Z');
  assert.equal(a.noticeVersion,NOTICE_VERSION); assert.equal(b.acceptedAt,a.acceptedAt); assert.notEqual(b.updatedAt,a.updatedAt);assert.deepEqual(readPrivacy(s),b);
});
test('invalid or truthy strings cannot enable optional data processing',()=>{
  const s=storage({[PRIVACY_KEY]:JSON.stringify({...defaultPrivacy(),acceptedAt:'2026-09-13',voice:'true',research:1})});
  assert.equal(readPrivacy(s).voice,false);assert.equal(readPrivacy(s).research,false);
  assert.throws(()=>savePrivacy(s,{language:'kn',voice:'true',research:false}));
});
test('storage write failures are surfaced, never reported as saved',()=>{
  assert.throws(()=>savePrivacy({getItem:()=>null,setItem(){throw Error('quota');}},{language:'en',voice:false,research:false}),/quota/);
});
test('export includes every Saathi record including corrupt data but no unrelated keys',()=>{
  const s=storage({'saathi:ledger:v1':'{"events":[]}','saathi:research:a':'{broken','other-app':'private'});
  const value=exportLocalData(s);assert.deepEqual(Object.keys(value.data),['saathi:ledger:v1','saathi:research:a']);assert.equal(value.data['saathi:research:a'],'{broken');
});
test('research withdrawal clears all local sessions but preserves money and preferences',()=>{
  const s=storage({'saathi:events:a':'[]','saathi:research:b':'{}','saathi:ledger:v1':'{}',[PRIVACY_KEY]:'{}','other':'ok'});
  deleteResearchData(s); assert.equal(s.length,3); assert.equal(s.getItem('saathi:ledger:v1'),'{}');
});
test('delete removes all Saathi data and consent without affecting other applications',()=>{
  const s=storage({'saathi:ledger:v1':'{}','saathi:activity':'[]','saathi:events:a':'[]',[PRIVACY_KEY]:'{}','other':'ok'});
  deleteLocalData(s);assert.equal(s.length,1);assert.equal(s.getItem('other'),'ok');assert.equal(readPrivacy(s).acceptedAt,null);
});
test('partial deletion removes consent first and surfaces failure',()=>{
  const s=storage({[PRIVACY_KEY]:'{}','saathi:ledger:v1':'{}'}); const remove=s.removeItem;
  s.removeItem=k=>{if(k==='saathi:ledger:v1')throw Error('blocked');remove(k);};
  assert.throws(()=>deleteLocalData(s),/blocked/);assert.equal(readPrivacy(s).acceptedAt,null);
});
