function asMoney(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw new TypeError('Money values must be finite and non-negative.');
  return Math.round(number);
}

export function calculateReserve({ totalDue, readyAmount, remainingDays }) {
  const due = asMoney(totalDue);
  const ready = asMoney(readyAmount);
  const days = Number(remainingDays);
  if (!Number.isFinite(days) || days < 0) throw new TypeError('remainingDays must be finite and non-negative.');

  const remaining = Math.max(0, due - ready);
  if (remaining === 0) return { remaining: 0, dailyReserve: 0, status: 'ready' };
  if (days === 0) return { remaining, dailyReserve: remaining, status: 'due_now' };

  const dailyReserve = Math.ceil((remaining / days) / 10) * 10;
  return { remaining, dailyReserve, status: 'plan_available' };
}

export function explainMinimumDue({ totalDue, minimumDue }) {
  const due = asMoney(totalDue);
  const minimum = asMoney(minimumDue);
  const remainingIfMinimumPaid = Math.max(0, due - minimum);
  return { remainingIfMinimumPaid, clearsBill: remainingIfMinimumPaid === 0 };
}
