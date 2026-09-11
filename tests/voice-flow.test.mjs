import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDailyAmounts } from '../src/core/speech-parser.mjs';
import {
  VoiceListeningSession,
  createConversationalVoiceWorkflow,
  createVoiceEntryWorkflow,
  runPromptThenListen
} from '../src/core/voice-flow.mjs';

function createTimerHarness() {
  const timers = [];
  return {
    schedule(callback, delay) {
      const timer = { callback, delay, cancelled:false };
      timers.push(timer);
      return timer;
    },
    cancel(timer) {
      if (timer) timer.cancelled = true;
    },
    run(delay) {
      const timer = timers.findLast((candidate) => candidate.delay === delay && !candidate.cancelled);
      assert.ok(timer, `Expected an active ${delay}ms timer`);
      timer.cancelled = true;
      timer.callback();
    }
  };
}

test('a first final recognition chunk does not finish or navigate the listening session', () => {
  const timers = createTimerHarness();
  const finishes = [];
  const session = new VoiceListeningSession({
    silenceMs:1800,
    hardTimeoutMs:30000,
    schedule:timers.schedule,
    cancel:timers.cancel,
    onFinish:(result) => finishes.push(result)
  });

  session.start();
  session.receive({ transcript:'Today I collected 1850', isFinal:true });

  assert.equal(session.listening, true);
  assert.equal(finishes.length, 0);

  timers.run(1800);
  assert.equal(session.listening, false);
  assert.deepEqual(finishes, [{ reason:'silence', transcript:'Today I collected 1850' }]);
});

test('meaningful speech resets silence finishing and manual finish remains explicit', () => {
  const timers = createTimerHarness();
  const finishes = [];
  const session = new VoiceListeningSession({
    silenceMs:1800,
    hardTimeoutMs:30000,
    schedule:timers.schedule,
    cancel:timers.cancel,
    onFinish:(result) => finishes.push(result)
  });

  session.start();
  session.receive({ transcript:'   ', isFinal:false });
  session.receive({ transcript:'Today I collected 1850 and spent 900', isFinal:false });
  session.finish('manual');

  assert.deepEqual(finishes, [{ reason:'manual', transcript:'Today I collected 1850 and spent 900' }]);
  assert.equal(session.listening, false);
});

test('silence timer starts only after meaningful speech', () => {
  const timers = createTimerHarness();
  const finishes = [];
  const session = new VoiceListeningSession({
    silenceMs:2300,
    hardTimeoutMs:35000,
    schedule:timers.schedule,
    cancel:timers.cancel,
    onFinish:(result) => finishes.push(result)
  });
  session.start();
  session.receive({ transcript:'   ', isFinal:true });
  assert.throws(() => timers.run(2300), /Expected an active 2300ms timer/);
  assert.equal(finishes.length, 0);
  session.receive({ transcript:'sixteen hundred', isFinal:true });
  timers.run(2300);
  assert.deepEqual(finishes, [{ reason:'silence', transcript:'sixteen hundred' }]);
});

test('TTS completion and guard delay both precede STT start', async () => {
  const events = [];
  let finishSpeech;
  let releaseGuard;
  const speech = new Promise((resolve) => { finishSpeech = resolve; });
  const guard = new Promise((resolve) => { releaseGuard = resolve; });
  const pending = runPromptThenListen({
    prompt:'How much were your sales today?',
    speakPrompt:async () => { events.push('tts_started'); await speech; events.push('tts_finished'); },
    waitForGuard:async () => { events.push('guard_started'); await guard; events.push('guard_finished'); },
    startListening:() => events.push('stt_started')
  });
  await Promise.resolve();
  assert.deepEqual(events, ['tts_started']);
  finishSpeech();
  await Promise.resolve();
  await Promise.resolve();
  assert.deepEqual(events, ['tts_started', 'tts_finished', 'guard_started']);
  releaseGuard();
  await pending;
  assert.deepEqual(events, ['tts_started', 'tts_finished', 'guard_started', 'guard_finished', 'stt_started']);
});

test('the hard timeout is a safety fallback', () => {
  const timers = createTimerHarness();
  const finishes = [];
  const session = new VoiceListeningSession({
    silenceMs:1800,
    hardTimeoutMs:30000,
    schedule:timers.schedule,
    cancel:timers.cancel,
    onFinish:(result) => finishes.push(result)
  });

  session.start();
  timers.run(30000);

  assert.deepEqual(finishes, [{ reason:'timeout', transcript:'' }]);
});

test('nothing persists until final money confirmation, then one confirmed record persists', async () => {
  const writes = [];
  const workflow = createVoiceEntryWorkflow({
    parse:parseDailyAmounts,
    persist:async (record) => writes.push(record),
    now:() => '2026-08-26T10:00:00.000Z'
  });

  workflow.setTranscript('Today I collected 1850 and spent 900 on the business');
  assert.equal(writes.length, 0);

  const structured = workflow.confirmTranscript();
  assert.equal(structured.confidence, 'high');
  assert.equal(writes.length, 0);

  const record = await workflow.confirmMoney({ sales:1850, stock:900 });
  assert.equal(writes.length, 1);
  assert.deepEqual(record, {
    label:'Today', sales:1850, stock:900, at:'2026-08-26T10:00:00.000Z'
  });
  assert.deepEqual(writes[0], record);
});

test('rejecting a transcript returns to listening without parsing or persisting', () => {
  let parses = 0;
  const writes = [];
  const workflow = createVoiceEntryWorkflow({
    parse:(text) => { parses += 1; return parseDailyAmounts(text); },
    persist:(record) => writes.push(record)
  });

  workflow.setTranscript('Today I collected 1850');
  workflow.rejectTranscript();

  assert.equal(workflow.phase, 'listening');
  assert.equal(parses, 0);
  assert.equal(writes.length, 0);
});

test('parser uncertainty is surfaced without inventing a required amount', () => {
  const workflow = createVoiceEntryWorkflow({
    parse:parseDailyAmounts,
    persist:() => { throw new Error('must not persist'); }
  });

  workflow.setTranscript('Today sales were 1850');
  const structured = workflow.confirmTranscript();

  assert.deepEqual(structured, {
    sales:1850,
    stock:null,
    confidence:'low',
    rawNumbers:[1850],
    requiresReview:true
  });
});

test('rejected amount is not persisted and the same turn is requested again', () => {
  const writes = [];
  const workflow = createConversationalVoiceWorkflow({ persist:(record) => writes.push(record) });
  workflow.start();
  workflow.captureAmount({ turn:'collection', transcript:'1600', parsed:{ amount:1600, confidence:'high', candidates:[1600] } });
  workflow.rejectAmount('collection');
  assert.equal(workflow.phase, 'listening_collection');
  assert.equal(workflow.amounts.collection, null);
  assert.equal(writes.length, 0);
});

test('nothing persists before final record confirmation', async () => {
  const writes = [];
  const workflow = createConversationalVoiceWorkflow({ persist:async (record) => writes.push(record), now:() => '2026-09-04T10:00:00.000Z' });
  workflow.start();
  workflow.captureAmount({ turn:'collection', transcript:'sixteen hundred', parsed:{ amount:1600, confidence:'high', candidates:[1600] } });
  workflow.confirmAmount('collection');
  workflow.captureAmount({ turn:'investment', transcript:'nine hundred', parsed:{ amount:900, confidence:'high', candidates:[900] } });
  workflow.confirmAmount('investment');
  assert.equal(workflow.phase, 'summary_confirmation');
  assert.equal(writes.length, 0);
  await workflow.confirmRecord({ collection:1600, investment:900, label:'Today' });
  assert.equal(writes.length, 1);
  assert.deepEqual(writes[0], { label:'Today', sales:1600, stock:900, at:'2026-09-04T10:00:00.000Z' });
});
