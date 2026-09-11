export const ACTIVITY_STORAGE_KEY = 'saathi:activity';

export function loadConfirmedActivity(storage, limit = 20) {
  try {
    const activity = JSON.parse(storage.getItem(ACTIVITY_STORAGE_KEY) || '[]');
    return Array.isArray(activity) ? activity.slice(0, limit) : [];
  } catch {
    return [];
  }
}

export function persistConfirmedActivity(storage, currentActivity, confirmedRecord, limit = 20) {
  const next = [confirmedRecord, ...currentActivity].slice(0, limit);
  storage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(next));
  return next;
}
