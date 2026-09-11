export const LEDGER_KEY = 'saathi:ledger:v1';
export function dayKey(date = new Date()) {
  const d = new Date(date);
  if (!Number.isFinite(d.getTime())) throw new Error('Invalid date');
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function amount(value) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('Enter a non-negative whole rupee amount');
  return value;
}
function entries(record, batchId) {
  const day = dayKey(record.at);
  return [['money_in',record.sales],['business_expense',record.stock]].map(([type,value],i)=>({
    id:`${batchId}:${i}`, batchId, type, amount:amount(value), at:record.at, day
  }));
}
export function loadLedger(storage) {
  const raw = storage.getItem(LEDGER_KEY);
  if (raw !== null) {
    const ledger = JSON.parse(raw);
    if (ledger.version !== 1 || !Array.isArray(ledger.events)) throw new Error('Ledger needs recovery');
    const ids = new Set();
    for (const e of ledger.events) {
      if (!e || typeof e.id !== 'string' || ids.has(e.id) || !Number.isSafeInteger(e.amount) ||
          !['money_in','business_expense','adjustment'].includes(e.type) || !/^\d{4}-\d{2}-\d{2}$/.test(e.day) ||
          !Number.isFinite(new Date(e.at).getTime()) || (e.type !== 'adjustment' && e.amount < 0)) throw new Error('Ledger needs recovery');
      if(e.type === 'adjustment' && !ledger.events.some(t=>t.id===e.targetId && t.type===e.category && t.day===e.day)) throw new Error('Invalid adjustment');
      ids.add(e.id);
    }
    return ledger;
  }
  const legacy = JSON.parse(storage.getItem('saathi:activity') || '[]');
  if (!Array.isArray(legacy)) throw new Error('Legacy history needs recovery');
  return {version:1,onboarding_completed:false,events:legacy.flatMap((r,i)=>entries(r,`legacy-${i}`))};
}
function save(storage, ledger) {
  storage.setItem(LEDGER_KEY,JSON.stringify(ledger));
  return ledger;
}
export function appendConfirmedRecord(storage, record, batchId) {
  if (!batchId) throw new Error('Confirmation ID required');
  const ledger = loadLedger(storage);
  if(ledger.events.some(e=>e.batchId===batchId)) return ledger;
  const next = {...ledger,onboarding_completed:true,events:[...ledger.events,...entries(record,batchId)]};
  dailyTotals(next,new Date(record.at));
  return save(storage,next);
}
export function effectiveAmount(ledger, id) {
  const entry=ledger.events.find(e=>e.id===id && e.type!=='adjustment');
  if(!entry) throw new Error('Entry not found');
  return ledger.events.filter(e=>e.type==='adjustment' && e.targetId===id).reduce((sum,e)=>sum+e.amount,entry.amount);
}
export function correctEntry(storage, id, newAmount, correctionId, at=new Date().toISOString()) {
  amount(newAmount);
  const ledger=loadLedger(storage);
  if(ledger.events.some(e=>e.id===correctionId)) return ledger;
  const target=ledger.events.find(e=>e.id===id && e.type!=='adjustment');
  if(!target || !correctionId) throw new Error('Entry not found');
  const change={id:correctionId,type:'adjustment',targetId:id,category:target.type,day:target.day,at,amount:newAmount-effectiveAmount(ledger,id)};
  const next={...ledger,events:[...ledger.events,change]};
  dailyTotals(next,new Date(`${target.day}T12:00:00`));
  return save(storage,next);
}
export function dailyTotals(ledger, date=new Date()) {
  const day=dayKey(date);
  let moneyIn=0,businessExpense=0;
  for(const event of ledger.events.filter(e=>e.day===day)) {
    const type=event.type==='adjustment'?event.category:event.type;
    if(type==='money_in') moneyIn+=event.amount;
    if(type==='business_expense') businessExpense+=event.amount;
  }
  if(!Number.isSafeInteger(moneyIn)||!Number.isSafeInteger(businessExpense)) throw new Error('Totals exceed supported range');
  return {moneyIn,businessExpense,net:moneyIn-businessExpense};
}
