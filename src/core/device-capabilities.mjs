export const LANGUAGE_LOCALES = Object.freeze({ kn: 'kn-IN', hi: 'hi-IN', en: 'en-IN' });
export const SPEECH_HINTS = Object.freeze({
  kn:Object.freeze(['ಮಾರಾಟ', 'ಒಟ್ಟು ಮೊತ್ತ', 'ರೂಪಾಯಿ', 'ವ್ಯಾಪಾರದ ಖರ್ಚು', 'ಸರಕು']),
  hi:Object.freeze(['बिक्री', 'कुल रकम', 'रुपये', 'कारोबार का खर्च', 'सामान']),
  en:Object.freeze(['sales', 'total amount', 'rupees', 'business spending', 'stock'])
});

let activeAudioSource = null;
let audioContext = null;
let speechSequence = 0;
let activeDeviceFinish = null;
const speechAudioCache = new Map();
const MAX_CACHED_PROMPTS = 12;

export function speechRecognitionSupported() {
  return Boolean(globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition);
}

function stableFinalChunk(previous, next) {
  if (!previous) return next;
  const oldValue = String(previous).trim();
  const newValue = String(next).trim();
  if (oldValue.length > newValue.length && oldValue.toLocaleLowerCase().endsWith(newValue.toLocaleLowerCase())) {
    return oldValue;
  }
  return newValue;
}

export function startSpeechRecognition({
  lang = 'en',
  onResult,
  onError,
  onEnd,
  schedule = globalThis.setTimeout.bind(globalThis),
  cancel = globalThis.clearTimeout.bind(globalThis),
  restartDelayMs = 180
}) {
  const Recognition = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
  if (!Recognition) throw new Error('speech_recognition_unavailable');
  const recognition = new Recognition();
  recognition.lang = LANGUAGE_LOCALES[lang] ?? LANGUAGE_LOCALES.en;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  recognition.continuous = true;
  if ('phrases' in recognition && globalThis.SpeechRecognitionPhrase) {
    recognition.phrases = (SPEECH_HINTS[lang] ?? SPEECH_HINTS.en)
      .map((hint) => new globalThis.SpeechRecognitionPhrase(hint, 3));
  }
  const committedChunks = [];
  const cycleFinalChunks = new Map();
  let latestInterimChunks = [];
  let active = true;
  let restartTimer = null;
  recognition.onresult = (event) => {
    const interimChunks = [];
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const value = String(result?.[0]?.transcript ?? '').trim();
      if (!value) continue;
      if (result.isFinal) cycleFinalChunks.set(i, stableFinalChunk(cycleFinalChunks.get(i), value));
      else interimChunks.push(value);
    }
    latestInterimChunks = interimChunks;
    const finalTranscript = [...committedChunks, ...[...cycleFinalChunks.entries()].sort(([a], [b]) => a - b).map(([, value]) => value)].join(' ').trim();
    const interimTranscript = interimChunks.join(' ').trim();
    const transcript = [finalTranscript, interimTranscript].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    onResult?.({
      transcript,
      finalTranscript,
      interimTranscript,
      isFinal:event.results[event.results.length - 1]?.isFinal ?? false
    });
  };
  recognition.onerror = (event) => {
    const reason = event.error || 'speech_error';
    const fatal = ['not-allowed', 'service-not-allowed', 'audio-capture'].includes(reason);
    if (fatal) active = false;
    if (!(reason === 'aborted' && !active)) onError?.(reason, { fatal });
  };
  recognition.onend = () => {
    const willRestart = active;
    onEnd?.({ willRestart });
    if (!willRestart) return;
    committedChunks.push(...[...cycleFinalChunks.entries()].sort(([a], [b]) => a - b).map(([, value]) => value));
    committedChunks.push(...latestInterimChunks);
    cycleFinalChunks.clear();
    latestInterimChunks = [];
    restartTimer = schedule(() => {
      if (!active) return;
      try { recognition.start(); }
      catch (error) {
        active = false;
        onError?.(error?.name || 'speech_restart_failed', { fatal:true });
      }
    }, restartDelayMs);
  };
  recognition.start();
  return () => {
    active = false;
    cancel(restartTimer);
    recognition.abort();
  };
}

function stopCurrentSpeech() {
  speechSequence += 1;
  globalThis.speechSynthesis?.cancel();
  activeDeviceFinish?.(false);
  activeDeviceFinish = null;
  try { activeAudioSource?.stop(); } catch {}
  activeAudioSource = null;
}

export function stopSpeech() {
  stopCurrentSpeech();
}

function speakWithDevice(text, lang = 'en') {
  if (!globalThis.speechSynthesis || !globalThis.SpeechSynthesisUtterance) return Promise.resolve(false);
  globalThis.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(String(text));
  utterance.lang = LANGUAGE_LOCALES[lang] ?? LANGUAGE_LOCALES.en;
  utterance.rate = 0.92;
  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      if (activeDeviceFinish === finish) activeDeviceFinish = null;
      resolve(ok);
    };
    activeDeviceFinish = finish;
    utterance.onend = () => finish(true);
    utterance.onerror = () => finish(false);
    globalThis.speechSynthesis.speak(utterance);
  });
}

async function prepareAudioContext() {
  const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AudioContext) return null;
  audioContext ??= new AudioContext();
  if (audioContext.state === 'suspended') await audioContext.resume();
  return audioContext;
}

async function playAudioBuffer(context, buffer, onStarted = () => {}) {
  const decoded = await context.decodeAudioData(buffer);
  await new Promise((resolve) => {
    const source = context.createBufferSource();
    source.buffer = decoded;
    source.connect(context.destination);
    source.addEventListener('ended', () => {
      if (activeAudioSource === source) activeAudioSource = null;
      resolve();
    }, { once:true });
    activeAudioSource = source;
    source.start();
    onStarted();
  });
}

function speechCacheKey(text, lang) {
  return `${LANGUAGE_LOCALES[lang] ?? LANGUAGE_LOCALES.en}\u0000${text}`;
}

function requestSarvamAudio(text, lang) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  return (async () => {
    try {
      const response = await fetch('/api/speech', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'Accept':'audio/wav' },
        body:JSON.stringify({ text, language:lang }),
        signal:controller.signal
      });
      if (!response.ok) return null;
      return await response.arrayBuffer();
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  })();
}

function sarvamAudio(text, lang) {
  const key = speechCacheKey(text, lang);
  let pending = speechAudioCache.get(key);
  if (pending) return pending;
  if (speechAudioCache.size >= MAX_CACHED_PROMPTS) {
    speechAudioCache.delete(speechAudioCache.keys().next().value);
  }
  pending = requestSarvamAudio(text, lang);
  speechAudioCache.set(key, pending);
  pending.then((audio) => {
    if (!audio && speechAudioCache.get(key) === pending) speechAudioCache.delete(key);
  });
  return pending;
}

export async function preloadSpeech(texts, lang = 'en') {
  if (globalThis.navigator?.onLine === false || !globalThis.fetch) return 0;
  const values = [...new Set((Array.isArray(texts) ? texts : [texts]).map((text) => String(text ?? '').trim()).filter(Boolean))];
  const results = await Promise.all(values.map((text) => sarvamAudio(text, lang)));
  return results.filter(Boolean).length;
}

export async function speak(text, lang = 'en') {
  const value = String(text ?? '').trim();
  if (!value) return { ok:false, provider:'none' };

  stopCurrentSpeech();
  const callId = speechSequence;
  const startedAt = Date.now();
  const online = globalThis.navigator?.onLine !== false;

  let context = null;
  try { context = await prepareAudioContext(); } catch {}

  if (online && globalThis.fetch && context) {
    try {
      const audio = await sarvamAudio(value, lang);
      if (audio) {
        let audioStartMs = 0;
        await playAudioBuffer(context, audio.slice(0), () => { audioStartMs = Date.now() - startedAt; });
        if (callId !== speechSequence) return { ok:false, provider:'cancelled', audioStartMs, durationMs:Date.now() - startedAt };
        return { ok:true, provider:'sarvam-bulbul-v3', audioStartMs, durationMs:Date.now() - startedAt };
      }
    } catch {
      if (callId !== speechSequence) return { ok:false, provider:'cancelled', audioStartMs:0, durationMs:Date.now() - startedAt };
    }
    if (callId !== speechSequence) return { ok:false, provider:'cancelled', audioStartMs:0, durationMs:Date.now() - startedAt };
    return { ok:false, provider:'sarvam-unavailable', audioStartMs:0, durationMs:Date.now() - startedAt };
  }

  if (callId !== speechSequence) return { ok:false, provider:'cancelled', audioStartMs:0, durationMs:Date.now() - startedAt };
  if (online) return { ok:false, provider:'sarvam-unavailable', audioStartMs:0, durationMs:Date.now() - startedAt };
  const ok = await speakWithDevice(value, lang);
  return { ok, provider:ok ? 'device-offline-fallback' : 'none', audioStartMs:0, durationMs:Date.now() - startedAt };
}
