// Explicit, opt-in live provider audit. Not run by npm test.
// Usage: node scripts/audit-kannada-speech.mjs URL OUTPUT_DIR [small|large|all]
import fs from 'node:fs';
import path from 'node:path';
import { readKannadaAmountWords } from '../tests/fixtures/kannada-cardinals.mjs';
const [url, output, mode='all'] = process.argv.slice(2);
if(!url || !output || !['small','large','all'].includes(mode)) throw Error('Supply URL, output directory and small|large|all');
const base=new URL(url); if(base.protocol!=='https:')throw Error('HTTPS required');
fs.mkdirSync(output,{recursive:true});
const small=Array.from({length:100},(_,i)=>i);
const large=[...Array.from({length:9},(_,i)=>[100*(i+1),100*(i+1)+1,100*(i+1)+24,100*(i+1)+99]).flat(),
  1000,1001,1024,1099,1320,7080,8400,9999,10000,10024,99999,100000,100024,999999,1000000,1000024,9999999,10000000,10000024,999999999,
  '0.01','0.24','24.01','24.24','420.50','999.99',-24,-124];
const samples=mode==='small'?small:mode==='large'?large:[...small,...large];
let last=0;
const results=[];
function extract(transcript) {
 const text=transcript.replace(/[೦-೯]/g,d=>String(d.charCodeAt(0)-0xce6)).replace(/(?<=\d),(?=\d)/g,'').replace(/ಮೈನಸ್\s*/g,'-');
 function number(fragment) {
   const value=fragment.replace(/[₹,।]/g,'').trim().replace(/\.$/,'');
   if (/^\d+(?:\.\d+)?$/.test(value)) return Number(value);
   return readKannadaAmountWords(value+' ರೂಪಾಯಿ')/100;
 }
 function amount(fragment) {
   let value=fragment.replace(/^[,.\s]+|[,.\s]+$/g,'');
   const negative=value.startsWith('-');if(negative)value=value.slice(1).trim();
   let result;
   if(value.includes('ರೂಪಾಯಿ')) {
     const [rupees,paise]=value.split('ರೂಪಾಯಿ');
     result=number(rupees)+(paise?.includes('ಪೈಸೆ')?number(paise.replace('ಪೈಸೆ',''))/100:0);
   } else if(value.includes('ಪೈಸೆ')) result=number(value.replace('ಪೈಸೆ',''))/100;
   else result=number(value);
   return (negative?-1:1)*Math.round(result*100)/100;
 }
 try {
   if(text.includes('ಮೊತ್ತ')) return text.split('ಮೊತ್ತ').filter(s=>s.trim()).map(amount);
   if(text.includes(',') && !/\d,\d/.test(text)) return text.split(',').filter(s=>s.trim()).map(amount);
   const numeric=text.match(/-?\d+(?:\.\d+)?/g);
   if(numeric && !text.includes('ಪೈಸೆ')) return numeric.map(Number);
   return [amount(text)];
 } catch { return []; }
}
async function check(values, name) {
 await new Promise(r=>setTimeout(r,Math.max(0,7500-(Date.now()-last))));last=Date.now();
 const input=values.map(v=>`ಮೊತ್ತ ₹${v}.`).join(' ');
 const sr=await fetch(new URL('/api/speech',base),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:input,language:'kn'}),signal:AbortSignal.timeout(60000)});
 if(!sr.ok)throw Error(`Speech ${sr.status}: ${await sr.text()}`);
 const audio=Buffer.from(await sr.arrayBuffer());fs.writeFileSync(path.join(output,name+'.wav'),audio);
 const tr=await fetch(new URL('/api/transcribe?language=kn',base),{method:'POST',headers:{'Content-Type':'audio/wav'},body:audio,signal:AbortSignal.timeout(60000)});
 const data=await tr.json();const observed=extract(data.transcript||'');
 const passed=tr.ok && observed.length===values.length && observed.every((n,i)=>n===Number(values[i]));
 const result={name,expected:values.map(Number),input,ttsStatus:sr.status,sttStatus:tr.status,transcript:data.transcript,observed,passed};
 results.push(result);fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(result));return passed;
}
for(let i=0;i<samples.length;i+=4) {
 const values=samples.slice(i,i+4);const name=`batch-${String(i/4).padStart(2,'0')}`;
 try {
  const passed=await check(values,name);
  if(!passed)for(let j=0;j<values.length;j++)await check([values[j]],name+'-individual-'+j);
 }catch(error){console.error(error.message);fs.writeFileSync(path.join(output,'error.txt'),error.stack);process.exitCode=1;break;}
}

const unresolved=results.filter(r=>r.name.includes('individual')&&!r.passed);
const summary={batches:results.filter(r=>!r.name.includes('individual')).length,individualRetries:results.filter(r=>r.name.includes('individual')).length,unresolved:unresolved.map(r=>({expected:r.expected,transcript:r.transcript})),completed:results.filter(r=>!r.name.includes('individual')).length===Math.ceil(samples.length/4)};
fs.writeFileSync(path.join(output,'summary.json'),JSON.stringify(summary,null,2));
if(unresolved.length || !summary.completed)process.exitCode=1;
