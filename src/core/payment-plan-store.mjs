export const PAYMENT_PLAN_KEY = 'saathi:payment-plan:v1';

function money(value, name) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${name} must be a non-negative whole rupee amount`);
  return value;
}

function dueDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(new Date(`${value}T12:00:00+05:30`).getTime())) throw new Error('Due date must be a valid date');
  return value;
}

export function readPaymentPlan(storage) {
  try {
    const value = JSON.parse(storage.getItem(PAYMENT_PLAN_KEY));
    if (!value || value.version !== 1) return null;
    const plan = { version:1, totalDue:money(value.totalDue, 'Total due'), readyAmount:money(value.readyAmount, 'Ready amount'), dueDate:dueDate(value.dueDate) };
    return plan.readyAmount <= plan.totalDue ? plan : null;
  } catch { return null; }
}

export function savePaymentPlan(storage, { totalDue, readyAmount, dueDate: date }) {
  const plan = { version:1, totalDue:money(totalDue, 'Total due'), readyAmount:money(readyAmount, 'Ready amount'), dueDate:dueDate(date) };
  if (plan.totalDue < 1) throw new Error('Total due must be at least one rupee');
  if (plan.readyAmount > plan.totalDue) throw new Error('Ready amount cannot exceed total due');
  storage.setItem(PAYMENT_PLAN_KEY, JSON.stringify(plan));
  return plan;
}

export function clearPaymentPlan(storage) { storage.removeItem(PAYMENT_PLAN_KEY); }
