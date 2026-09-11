import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateReserve, explainMinimumDue } from '../src/core/finance-engine.mjs';

test('calculates the demo reserve deterministically', () => {
  assert.deepEqual(
    calculateReserve({ totalDue: 8400, readyAmount: 7080, remainingDays: 11 }),
    { remaining: 1320, dailyReserve: 120, status: 'plan_available' }
  );
});

test('returns zero reserve when the obligation is already ready', () => {
  assert.deepEqual(
    calculateReserve({ totalDue: 8400, readyAmount: 8400, remainingDays: 4 }),
    { remaining: 0, dailyReserve: 0, status: 'ready' }
  );
});

test('marks payment due now when days are exhausted and money remains', () => {
  assert.deepEqual(
    calculateReserve({ totalDue: 8400, readyAmount: 7000, remainingDays: 0 }),
    { remaining: 1400, dailyReserve: 1400, status: 'due_now' }
  );
});

test('explains the financial consequence of paying only the minimum due', () => {
  assert.deepEqual(
    explainMinimumDue({ totalDue: 8400, minimumDue: 420 }),
    { remainingIfMinimumPaid: 7980, clearsBill: false }
  );
});
