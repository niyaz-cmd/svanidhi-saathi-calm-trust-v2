const SAFE_KEYS = new Set([
  'sales','stock','note','task','success','helpNeeded','trustConcern','wouldUseAgain',
  'quote','screen','source','confidence','durationMs','audioStartMs','reason','status','online','provider','turn'
]);

export function newSessionId() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  const bytes = new Uint8Array(8);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  for (const byte of bytes) suffix += alphabet[byte % alphabet.length];
  return `SS-${suffix}`;
}

export function createResearchEvent({ sessionId, mode, language, name, payload = {}, at = new Date().toISOString() }) {
  const safePayload = {};
  for (const [key, value] of Object.entries(payload)) {
    if (SAFE_KEYS.has(key)) safePayload[key] = value;
  }
  return { sessionId, mode, language, name, payload: safePayload, at };
}

export function serializeSession({ session, events }) {
  return JSON.stringify({ schemaVersion: 1, session, events }, null, 2);
}
