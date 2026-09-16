import test from 'node:test';
import assert from 'node:assert/strict';
import { PAYMENT_PLAN_KEY, readPaymentPlan, savePaymentPlan, clearPaymentPlan } from '../src/core/payment-plan-store.mjs';

function storage(entries = {}) { const data = new Map(Object.entries(entries)); return { getItem:key => data.get(key) ?? null, setItem:(key, value) => data.set(key, value), removeItem:key => data.delete(key) }; }

test('saves and reads a confirmed local repayment plan', () => {
  const s = storage();
  const saved = savePaymentPlan(s, { totalDue:8400, readyAmount:1200, dueDate:'2026-09-30' });
  assert.deepEqual(readPaymentPlan(s), saved);
  clearPaymentPlan(s);
  assert.equal(s.getItem(PAYMENT_PLAN_KEY), null);
});

test('rejects impossible repayment values and safely ignores corrupt plans', () => {
  const s = storage();
  assert.throws(() => savePaymentPlan(s, { totalDue:100, readyAmount:101, dueDate:'2026-09-30' }));
  assert.throws(() => savePaymentPlan(s, { totalDue:0, readyAmount:0, dueDate:'2026-09-30' }));
  assert.equal(readPaymentPlan(storage({ [PAYMENT_PLAN_KEY]:'{bad json' })), null);
});
