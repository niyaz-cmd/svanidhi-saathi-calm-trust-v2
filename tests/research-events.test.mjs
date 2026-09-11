import test from 'node:test';
import assert from 'node:assert/strict';
import { newSessionId, createResearchEvent, serializeSession } from '../src/core/research-events.mjs';

test('creates readable non-empty session ids', () => {
  const id = newSessionId();
  assert.match(id, /^SS-[A-Z0-9]{8}$/);
});

test('creates a stable event shape and filters sensitive payload keys', () => {
  const event = createResearchEvent({
    sessionId: 'SS-ABCDEFGH',
    mode: 'field',
    language: 'kn',
    name: 'voice_confirmed',
    payload: { sales: 1850, stock: 900, otp: '123456', note: 'corrected once' },
    at: '2026-08-24T10:00:00.000Z'
  });
  assert.deepEqual(event, {
    sessionId: 'SS-ABCDEFGH',
    mode: 'field',
    language: 'kn',
    name: 'voice_confirmed',
    payload: { sales: 1850, stock: 900, note: 'corrected once' },
    at: '2026-08-24T10:00:00.000Z'
  });
});

test('serializes a session export as valid JSON', () => {
  const text = serializeSession({
    session: { id: 'SS-ABCDEFGH', mode: 'demo', language: 'en' },
    events: [{ name: 'started' }]
  });
  const parsed = JSON.parse(text);
  assert.equal(parsed.session.id, 'SS-ABCDEFGH');
  assert.equal(parsed.events[0].name, 'started');
  assert.equal(parsed.schemaVersion, 1);
});
