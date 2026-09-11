import test from 'node:test';
import assert from 'node:assert/strict';
import { VoiceAudioCapture, transcribeRecordedAudio } from '../src/core/audio-capture.mjs';

function createCaptureHarness() {
  let level = 0;
  let now = 0;
  let sample;
  let hardTimeout;
  const stoppedTracks = [];
  const constraints = [];
  const stream = {
    getTracks:() => [{ stop:() => stoppedTracks.push(true) }]
  };
  const analyser = {
    fftSize:32,
    getFloatTimeDomainData(buffer) { buffer.fill(level); }
  };
  const context = {
    createMediaStreamSource:() => ({ connect() {} }),
    createAnalyser:() => analyser,
    close:async () => {}
  };
  class FakeRecorder {
    constructor() { this.mimeType = 'audio/webm;codecs=opus'; this.state = 'inactive'; }
    start() { this.state = 'recording'; }
    stop() {
      this.state = 'inactive';
      this.ondataavailable?.({ data:new Blob(['voice-audio'], { type:this.mimeType }) });
      this.onstop?.();
    }
  }
  return {
    options: {
      getUserMedia:async (value) => { constraints.push(value); return stream; },
      createRecorder:() => new FakeRecorder(),
      createAudioContext:async () => context,
      now:() => now,
      scheduleInterval:(callback) => { sample = callback; return callback; },
      cancelInterval:() => {},
      schedule:(callback) => { hardTimeout = callback; return callback; },
      cancel:() => {}
    },
    setLevel(value) { level = value; },
    setNow(value) { now = value; },
    sample() { sample(); },
    hardTimeout() { hardTimeout(); },
    constraints,
    stoppedTracks
  };
}

test('audio capture waits for meaningful sound and then 2.3 seconds of silence', async () => {
  const harness = createCaptureHarness();
  const finishes = [];
  const capture = new VoiceAudioCapture({
    ...harness.options,
    silenceMs:2300,
    hardTimeoutMs:29000,
    onFinish:(result) => finishes.push(result)
  });

  assert.equal(await capture.start(), true);
  harness.sample();
  harness.setNow(100);
  harness.setLevel(0.05);
  harness.sample();
  harness.setLevel(0);
  harness.setNow(2300);
  harness.sample();
  assert.equal(finishes.length, 0);
  harness.setNow(2501);
  harness.sample();

  assert.equal(finishes.length, 1);
  assert.equal(finishes[0].reason, 'silence');
  assert.equal(finishes[0].heardSpeech, true);
  assert.ok(finishes[0].audio.size > 0);
  assert.equal(harness.constraints[0].audio.echoCancellation, true);
  assert.equal(harness.constraints[0].audio.noiseSuppression, true);
  assert.equal(harness.stoppedTracks.length, 1);
});

test('manual finish returns recorded audio even when local VAD missed the speech', async () => {
  const harness = createCaptureHarness();
  const finishes = [];
  const capture = new VoiceAudioCapture({ ...harness.options, onFinish:(result) => finishes.push(result) });
  await capture.start();
  capture.finish('manual');
  assert.equal(finishes[0].reason, 'manual');
  assert.equal(finishes[0].heardSpeech, false);
  assert.ok(finishes[0].audio.size > 0);
});

test('recorded audio is sent to the protected Sarvam transcription endpoint', async () => {
  let request;
  const audio = new Blob(['voice-audio'], { type:'audio/webm;codecs=opus' });
  const result = await transcribeRecordedAudio(audio, 'en', {
    fetchImpl:async (url, options) => {
      request = { url, options };
      return {
        ok:true,
        json:async () => ({ transcript:'I made 1,500 rupees sales today.', languageCode:'en-IN', provider:'sarvam-saaras-v4' })
      };
    }
  });

  assert.equal(request.url, '/api/transcribe?language=en');
  assert.equal(request.options.method, 'POST');
  assert.equal(request.options.body, audio);
  assert.equal(request.options.headers['Content-Type'], 'audio/webm;codecs=opus');
  assert.deepEqual(result, {
    ok:true,
    transcript:'I made 1,500 rupees sales today.',
    languageCode:'en-IN',
    provider:'sarvam-saaras-v4'
  });
});
