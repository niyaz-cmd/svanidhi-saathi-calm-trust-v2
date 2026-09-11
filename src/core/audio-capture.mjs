const DEFAULT_AUDIO_CONSTRAINTS = Object.freeze({
  echoCancellation:true,
  noiseSuppression:true,
  autoGainControl:true,
  channelCount:1
});

function defaultRecorder(stream) {
  const Recorder = globalThis.MediaRecorder;
  if (!Recorder) throw new Error('media_recorder_unavailable');
  const preferred = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  const mimeType = preferred.find((type) => typeof Recorder.isTypeSupported !== 'function' || Recorder.isTypeSupported(type));
  return mimeType ? new Recorder(stream, { mimeType }) : new Recorder(stream);
}

async function defaultAudioContext() {
  const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AudioContext) throw new Error('audio_context_unavailable');
  const context = new AudioContext();
  if (context.state === 'suspended') await context.resume();
  return context;
}

export function audioCaptureSupported() {
  return Boolean(globalThis.navigator?.mediaDevices?.getUserMedia && globalThis.MediaRecorder);
}

export class VoiceAudioCapture {
  constructor({
    silenceMs = 2300,
    hardTimeoutMs = 29000,
    levelThreshold = 0.018,
    sampleEveryMs = 80,
    getUserMedia = globalThis.navigator?.mediaDevices?.getUserMedia?.bind(globalThis.navigator.mediaDevices),
    createRecorder = defaultRecorder,
    createAudioContext = defaultAudioContext,
    now = Date.now,
    scheduleInterval = globalThis.setInterval.bind(globalThis),
    cancelInterval = globalThis.clearInterval.bind(globalThis),
    schedule = globalThis.setTimeout.bind(globalThis),
    cancel = globalThis.clearTimeout.bind(globalThis),
    onLevel = () => {},
    onSpeech = () => {},
    onFinish = () => {},
    onError = () => {}
  } = {}) {
    this.silenceMs = silenceMs;
    this.hardTimeoutMs = hardTimeoutMs;
    this.levelThreshold = levelThreshold;
    this.sampleEveryMs = sampleEveryMs;
    this.getUserMedia = getUserMedia;
    this.createRecorder = createRecorder;
    this.createAudioContext = createAudioContext;
    this.now = now;
    this.scheduleInterval = scheduleInterval;
    this.cancelInterval = cancelInterval;
    this.schedule = schedule;
    this.cancelTimer = cancel;
    this.onLevel = onLevel;
    this.onSpeech = onSpeech;
    this.onFinish = onFinish;
    this.onError = onError;
    this.active = false;
    this.cancelled = false;
    this.heardSpeech = false;
    this.lastSpeechAt = 0;
    this.startedAt = 0;
    this.chunks = [];
  }

  async start() {
    if (typeof this.getUserMedia !== 'function') {
      this.onError('audio_capture_unavailable');
      return false;
    }
    try {
      this.stream = await this.getUserMedia({ audio:{ ...DEFAULT_AUDIO_CONSTRAINTS } });
      this.context = await this.createAudioContext();
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 1024;
      this.source = this.context.createMediaStreamSource(this.stream);
      this.source.connect(this.analyser);
      this.levelBuffer = new Float32Array(this.analyser.fftSize);
      this.recorder = this.createRecorder(this.stream);
      this.chunks = [];
      this.cancelled = false;
      this.heardSpeech = false;
      this.startedAt = this.now();
      this.recorder.ondataavailable = (event) => {
        if (event.data?.size) this.chunks.push(event.data);
      };
      this.recorder.onerror = () => {
        this.onError('audio_recording_failed');
        this.cancel();
      };
      this.recorder.onstop = () => {
        const audio = new Blob(this.chunks, { type:this.recorder.mimeType || 'audio/webm' });
        const result = {
          reason:this.finishReason || 'manual',
          audio,
          heardSpeech:this.heardSpeech,
          durationMs:Math.max(0, this.now() - this.startedAt)
        };
        const shouldFinish = !this.cancelled;
        this.cleanup();
        if (shouldFinish) this.onFinish(result);
      };
      this.active = true;
      this.recorder.start(250);
      this.sampleTimer = this.scheduleInterval(() => this.sampleLevel(), this.sampleEveryMs);
      this.hardTimer = this.schedule(() => this.finish('timeout'), this.hardTimeoutMs);
      return true;
    } catch (error) {
      this.cleanup();
      this.onError(error?.name || error?.message || 'audio_capture_failed');
      return false;
    }
  }

  sampleLevel() {
    if (!this.active || !this.analyser) return;
    this.analyser.getFloatTimeDomainData(this.levelBuffer);
    let energy = 0;
    for (const sample of this.levelBuffer) energy += sample * sample;
    const level = Math.sqrt(energy / this.levelBuffer.length);
    this.onLevel(level);
    const current = this.now();
    if (level >= this.levelThreshold) {
      const firstSpeech = !this.heardSpeech;
      this.heardSpeech = true;
      this.lastSpeechAt = current;
      if (firstSpeech) this.onSpeech();
      return;
    }
    if (this.heardSpeech && current - this.lastSpeechAt >= this.silenceMs) this.finish('silence');
  }

  finish(reason = 'manual') {
    if (!this.active) return;
    this.active = false;
    this.finishReason = reason;
    this.cancelInterval(this.sampleTimer);
    this.cancelTimer(this.hardTimer);
    if (this.recorder?.state === 'recording') this.recorder.stop();
    else this.cleanup();
  }

  cancel() {
    if (!this.active && !this.stream) return;
    this.cancelled = true;
    this.finish('cancelled');
  }

  cleanup() {
    this.active = false;
    this.cancelInterval(this.sampleTimer);
    this.cancelTimer(this.hardTimer);
    this.stream?.getTracks?.().forEach((track) => track.stop());
    try { this.source?.disconnect?.(); } catch {}
    try { this.context?.close?.(); } catch {}
    this.stream = null;
    this.source = null;
    this.analyser = null;
    this.recorder = null;
  }
}

export async function transcribeRecordedAudio(audio, language = 'en', { fetchImpl = globalThis.fetch } = {}) {
  if (!audio?.size || typeof fetchImpl !== 'function') return { ok:false, transcript:'', provider:'none' };
  try {
    const response = await fetchImpl(`/api/transcribe?language=${encodeURIComponent(language)}`, {
      method:'POST',
      headers:{ 'Content-Type':audio.type || 'audio/webm' },
      body:audio
    });
    if (!response.ok) return { ok:false, transcript:'', provider:'sarvam-unavailable' };
    const data = await response.json();
    const transcript = String(data?.transcript ?? '').trim();
    return {
      ok:Boolean(transcript),
      transcript,
      languageCode:data?.languageCode ?? null,
      provider:data?.provider ?? 'sarvam-saaras-v4'
    };
  } catch {
    return { ok:false, transcript:'', provider:'sarvam-unavailable' };
  }
}
