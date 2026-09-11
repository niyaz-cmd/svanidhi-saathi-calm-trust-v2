const LANGUAGE_CODES = Object.freeze({ kn:'kn-IN', hi:'hi-IN', en:'en-IN' });
const MAX_AUDIO_BYTES = 8_000_000;
const REQUESTS_PER_MINUTE = 12;
const requestWindows = new Map();

function sendJson(response, status, body, headers = {}) {
  response.writeHead(status, {
    'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':'no-store',
    'X-Content-Type-Options':'nosniff',
    ...headers
  });
  response.end(JSON.stringify(body));
}

function sameOriginRequest(request) {
  const origin = request.headers.origin;
  if (!origin) return true;
  const host = request.headers['x-forwarded-host'] || request.headers.host;
  try { return new URL(origin).host === host; } catch { return false; }
}

function withinRateLimit(request) {
  const address = String(request.headers['x-forwarded-for'] || request.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  const now = Date.now();
  const current = requestWindows.get(address);
  if (!current || now - current.startedAt >= 60_000) {
    requestWindows.set(address, { startedAt:now, count:1 });
    return true;
  }
  current.count += 1;
  return current.count <= REQUESTS_PER_MINUTE;
}

function audioExtension(contentType) {
  if (contentType.startsWith('audio/webm')) return 'webm';
  if (contentType.startsWith('audio/mp4')) return 'm4a';
  if (contentType.startsWith('audio/ogg')) return 'ogg';
  if (contentType.startsWith('audio/wav') || contentType.startsWith('audio/x-wav')) return 'wav';
  return null;
}

export function normalizeTranscriptionRequest({ language, contentType, contentLength }) {
  const languageCode = LANGUAGE_CODES[language];
  const normalizedType = String(contentType ?? '').toLocaleLowerCase();
  const upstreamContentType = normalizedType.split(';', 1)[0].trim();
  const hasLength = contentLength !== undefined && contentLength !== null && contentLength !== '';
  const length = hasLength ? Number(contentLength) : null;
  const extension = audioExtension(normalizedType);
  if (!languageCode || !extension || (hasLength && (!Number.isFinite(length) || length <= 0 || length > MAX_AUDIO_BYTES))) return null;
  return { languageCode, contentType:normalizedType, upstreamContentType, extension };
}

async function readAudioBody(request) {
  if (Buffer.isBuffer(request.body)) return request.body;
  if (request.body instanceof Uint8Array) return Buffer.from(request.body);
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    const value = Buffer.from(chunk);
    size += value.length;
    if (size > MAX_AUDIO_BYTES) throw new Error('audio_too_large');
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return sendJson(response, 405, { error:'method_not_allowed' });
  }
  if (!sameOriginRequest(request)) return sendJson(response, 403, { error:'invalid_origin' });
  if (!withinRateLimit(request)) return sendJson(response, 429, { error:'rate_limited' }, { 'Retry-After':'60' });

  const url = new URL(request.url, `https://${request.headers.host || 'localhost'}`);
  const speech = normalizeTranscriptionRequest({
    language:url.searchParams.get('language'),
    contentType:request.headers['content-type'],
    contentLength:request.headers['content-length']
  });
  if (!speech) return sendJson(response, 422, { error:'invalid_audio_request' });
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) return sendJson(response, 503, { error:'voice_not_configured' });

  let audio;
  try { audio = await readAudioBody(request); }
  catch { return sendJson(response, 413, { error:'audio_too_large' }); }
  if (!audio.length || audio.length > MAX_AUDIO_BYTES) return sendJson(response, 422, { error:'invalid_audio_request' });

  const form = new FormData();
  form.append('file', new Blob([audio], { type:speech.upstreamContentType }), `saathi-turn.${speech.extension}`);
  form.append('model', 'saaras:v4');
  form.append('mode', 'transcribe');
  form.append('language_code', speech.languageCode);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);
  const providerStartedAt = Date.now();
  try {
    const upstream = await fetch('https://api.sarvam.ai/speech-to-text', {
      method:'POST',
      headers:{ 'api-subscription-key':apiKey },
      body:form,
      signal:controller.signal
    });
    if (!upstream.ok) {
      console.error('Sarvam STT request failed', { status:upstream.status });
      return sendJson(response, 502, { error:'transcription_provider_unavailable' });
    }
    const data = await upstream.json();
    const transcript = String(data?.transcript ?? '').trim();
    if (!transcript) return sendJson(response, 422, { error:'speech_not_understood' });
    return sendJson(response, 200, {
      transcript,
      languageCode:data?.language_code ?? speech.languageCode,
      provider:'sarvam-saaras-v4'
    }, {
      'X-Saathi-Transcription':'sarvam-saaras-v4',
      'Server-Timing':`sarvam_stt;dur=${Date.now() - providerStartedAt}`
    });
  } catch (error) {
    console.error('Sarvam STT request error', { name:error?.name || 'Error' });
    return sendJson(response, 502, { error:'transcription_provider_unavailable' });
  } finally {
    clearTimeout(timeout);
  }
}
