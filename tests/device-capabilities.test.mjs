import test from 'node:test';
import assert from 'node:assert/strict';
import { preloadSpeech, speak, startSpeechRecognition } from '../src/core/device-capabilities.mjs';

function recognitionResult(transcript, isFinal) {
  const result = [{ transcript }];
  result.isFinal = isFinal;
  return result;
}

test('continuous recognition accumulates final and interim chunks into one transcript', () => {
  const original = globalThis.SpeechRecognition;
  let recognition;
  class FakeRecognition {
    constructor() { recognition = this; this.starts = 0; }
    start() { this.starts += 1; }
    abort() { this.aborted = true; }
  }
  globalThis.SpeechRecognition = FakeRecognition;

  try {
    const updates = [];
    const stop = startSpeechRecognition({ lang:'en', onResult:(update) => updates.push(update) });
    assert.equal(recognition.continuous, true);
    assert.equal(recognition.interimResults, true);

    const first = [recognitionResult('Today I collected 1850', true)];
    recognition.onresult({ resultIndex:0, results:first });

    const second = [first[0], recognitionResult(' and spent 900', false)];
    recognition.onresult({ resultIndex:1, results:second });

    assert.equal(updates[0].transcript, 'Today I collected 1850');
    assert.equal(updates[0].isFinal, true);
    assert.equal(updates[1].transcript, 'Today I collected 1850 and spent 900');
    assert.equal(updates[1].interimTranscript, 'and spent 900');

    stop();
    assert.equal(recognition.aborted, true);
  } finally {
    if (original) globalThis.SpeechRecognition = original;
    else delete globalThis.SpeechRecognition;
  }
});

test('recognition preserves leading amount digits across result chunks', () => {
  const original = globalThis.SpeechRecognition;
  let recognition;
  class FakeRecognition {
    constructor() { recognition = this; }
    start() {}
    abort() {}
  }
  globalThis.SpeechRecognition = FakeRecognition;

  try {
    const updates = [];
    startSpeechRecognition({ lang:'en', onResult:(update) => updates.push(update) });
    const first = [recognitionResult('collection 1', true)];
    recognition.onresult({ resultIndex:0, results:first });
    const second = [first[0], recognitionResult('600', true)];
    recognition.onresult({ resultIndex:1, results:second });
    assert.equal(updates.at(-1).transcript, 'collection 1 600');

    const third = [recognitionResult('collection 1', true), recognitionResult('200', true)];
    recognition.onresult({ resultIndex:0, results:third });
    assert.equal(updates.at(-1).transcript, 'collection 1 200');
  } finally {
    if (original) globalThis.SpeechRecognition = original;
    else delete globalThis.SpeechRecognition;
  }
});

test('a shorter final revision cannot truncate 1600 to 600 or 1200 to 200', () => {
  const original = globalThis.SpeechRecognition;
  let recognition;
  class FakeRecognition {
    constructor() { recognition = this; }
    start() {}
    abort() {}
  }
  globalThis.SpeechRecognition = FakeRecognition;

  try {
    const updates = [];
    startSpeechRecognition({ lang:'en', onResult:(update) => updates.push(update) });
    recognition.onresult({ resultIndex:0, results:[recognitionResult('1600', true)] });
    recognition.onresult({ resultIndex:0, results:[recognitionResult('600', true)] });
    assert.equal(updates.at(-1).transcript, '1600');

    recognition.onend();
    recognition.onresult({ resultIndex:0, results:[recognitionResult('1200', true)] });
    recognition.onresult({ resultIndex:0, results:[recognitionResult('200', true)] });
    assert.equal(updates.at(-1).transcript, '1600 1200');
  } finally {
    if (original) globalThis.SpeechRecognition = original;
    else delete globalThis.SpeechRecognition;
  }
});

test('unexpected recognition end reports and restarts within the active turn', () => {
  const original = globalThis.SpeechRecognition;
  let recognition;
  let restart;
  class FakeRecognition {
    constructor() { recognition = this; this.starts = 0; }
    start() { this.starts += 1; }
    abort() {}
  }
  globalThis.SpeechRecognition = FakeRecognition;

  try {
    const ends = [];
    startSpeechRecognition({
      lang:'en',
      onEnd:(event) => ends.push(event),
      schedule:(callback) => { restart = callback; return 1; },
      cancel:() => {}
    });
    recognition.onend();
    assert.deepEqual(ends, [{ willRestart:true }]);
    assert.equal(typeof restart, 'function');
    restart();
    assert.equal(recognition.starts, 2);
  } finally {
    if (original) globalThis.SpeechRecognition = original;
    else delete globalThis.SpeechRecognition;
  }
});

test('device TTS resolves only after playback has ended', async () => {
  const originals = {
    navigator:globalThis.navigator,
    speechSynthesis:globalThis.speechSynthesis,
    SpeechSynthesisUtterance:globalThis.SpeechSynthesisUtterance,
    AudioContext:globalThis.AudioContext
  };
  let utterance;
  class FakeUtterance {
    constructor(text) { this.text = text; }
  }
  Object.defineProperty(globalThis, 'navigator', { configurable:true, value:{ onLine:false } });
  globalThis.SpeechSynthesisUtterance = FakeUtterance;
  globalThis.speechSynthesis = {
    cancel() {},
    speak(value) { utterance = value; }
  };
  delete globalThis.AudioContext;

  try {
    let resolved = false;
    const pending = speak('₹420', 'kn').then((result) => {
      resolved = true;
      return result;
    });
    await Promise.resolve();
    assert.equal(resolved, false);
    assert.equal(utterance.text, 'ನಾಲ್ಕು ನೂರ ಇಪ್ಪತ್ತು ರೂಪಾಯಿ');
    utterance.onend();
    const result = await pending;
    assert.equal(result.ok, true);
    assert.equal(result.provider, 'device-offline-fallback');
  } finally {
    for (const [key, value] of Object.entries(originals)) {
      if (value === undefined) delete globalThis[key];
      else Object.defineProperty(globalThis, key, { configurable:true, writable:true, value });
    }
  }
});

test('online Sarvam failure never silently falls back to the robotic device voice', async () => {
  const originals = {
    navigator:globalThis.navigator,
    fetch:globalThis.fetch,
    speechSynthesis:globalThis.speechSynthesis,
    SpeechSynthesisUtterance:globalThis.SpeechSynthesisUtterance,
    AudioContext:globalThis.AudioContext
  };
  let deviceUtterance;
  class FakeUtterance {
    constructor(text) { this.text = text; }
  }
  class FakeAudioContext {
    constructor() { this.state = 'running'; this.destination = {}; }
    async decodeAudioData(buffer) { return { buffer }; }
    createBufferSource() {
      let ended;
      return {
        connect() {},
        addEventListener(name, callback) { if (name === 'ended') ended = callback; },
        start() { ended?.(); }
      };
    }
  }
  Object.defineProperty(globalThis, 'navigator', { configurable:true, value:{ onLine:true } });
  globalThis.fetch = async () => ({ ok:false });
  globalThis.AudioContext = FakeAudioContext;
  globalThis.SpeechSynthesisUtterance = FakeUtterance;
  globalThis.speechSynthesis = {
    cancel() {},
    speak(value) { deviceUtterance = value; }
  };

  try {
    const pending = speak('₹420', 'kn');
    await new Promise((resolve) => setImmediate(resolve));
    deviceUtterance?.onend();
    const result = await pending;
    assert.equal(deviceUtterance, undefined);
    assert.equal(result.ok, false);
    assert.equal(result.provider, 'sarvam-unavailable');
  } finally {
    for (const [key, value] of Object.entries(originals)) {
      if (value === undefined) delete globalThis[key];
      else Object.defineProperty(globalThis, key, { configurable:true, writable:true, value });
    }
  }
});

test('preloaded Sarvam audio is reused when the conversational prompt plays', async () => {
  const originals = {
    navigator:globalThis.navigator,
    fetch:globalThis.fetch,
    speechSynthesis:globalThis.speechSynthesis,
    AudioContext:globalThis.AudioContext
  };
  let fetchCount = 0;
  class FakeAudioContext {
    constructor() { this.state = 'running'; this.destination = {}; }
    async decodeAudioData(buffer) { return { buffer }; }
    createBufferSource() {
      let ended;
      return {
        connect() {},
        addEventListener(name, callback) { if (name === 'ended') ended = callback; },
        start() { ended?.(); }
      };
    }
  }
  Object.defineProperty(globalThis, 'navigator', { configurable:true, value:{ onLine:true } });
  globalThis.fetch = async () => {
    fetchCount += 1;
    return { ok:true, arrayBuffer:async () => new ArrayBuffer(8) };
  };
  globalThis.AudioContext = FakeAudioContext;
  delete globalThis.speechSynthesis;

  try {
    await preloadSpeech(['Preloaded human voice test'], 'en');
    const result = await speak('Preloaded human voice test', 'en');
    assert.equal(fetchCount, 1);
    assert.equal(result.ok, true);
    assert.equal(result.provider, 'sarvam-bulbul-v3');
  } finally {
    for (const [key, value] of Object.entries(originals)) {
      if (value === undefined) delete globalThis[key];
      else Object.defineProperty(globalThis, key, { configurable:true, writable:true, value });
    }
  }
});
