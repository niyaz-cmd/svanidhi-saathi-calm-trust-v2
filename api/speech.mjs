import { moneySpeechText } from '../src/core/money-speech.mjs';

const LANGUAGE_CODES = Object.freeze({ kn:'kn-IN', hi:'hi-IN', en:'en-IN' });
const MAX_TEXT_LENGTH = 600;
const REQUESTS_PER_MINUTE = 20;
const requestWindows = new Map();

function sendJson(response, status, body, headers = {}) {
  response.writeHead(status, {
    'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':'no-store',
    ...headers
  });
  response.end(JSON.stringify(body));
}

async function readJsonBody(request) {
  if (request.body && typeof request.body === 'object' && !Buffer.isBuffer(request.body)) return request.body;
  if (typeof request.body === 'string' || Buffer.isBuffer(request.body)) return JSON.parse(String(request.body));

  let raw = '';
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > 20_000) throw new Error('request_too_large');
  }
  return JSON.parse(raw || '{}');
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

export function normalizeSpeechRequest(body) {
  const text = String(body?.text ?? '').trim();
  const languageCode = LANGUAGE_CODES[body?.language];
  if (!text || text.length > MAX_TEXT_LENGTH || !languageCode) return null;
  const spokenText = moneySpeechText(text, body.language);
  if (spokenText.length > MAX_TEXT_LENGTH) return null;
  return { text:spokenText, languageCode };
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return sendJson(response, 405, { error:'method_not_allowed' });
  }
  if (!sameOriginRequest(request)) return sendJson(response, 403, { error:'invalid_origin' });
  if (!withinRateLimit(request)) return sendJson(response, 429, { error:'rate_limited' }, { 'Retry-After':'60' });

  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) return sendJson(response, 503, { error:'voice_not_configured' });

  let speech;
  try { speech = normalizeSpeechRequest(await readJsonBody(request)); }
  catch { return sendJson(response, 400, { error:'invalid_request' }); }
  if (!speech) return sendJson(response, 422, { error:'invalid_speech_request' });

  try {
    const providerStartedAt = Date.now();
    const upstream = await fetch('https://api.sarvam.ai/text-to-speech', {
      method:'POST',
      signal:AbortSignal.timeout(20000),
      headers:{
        'Content-Type':'application/json',
        'Accept':'application/json',
        'api-subscription-key':apiKey
      },
      body:JSON.stringify({
        text:speech.text,
        language_code:speech.languageCode,
        speaker:process.env.SARVAM_TTS_SPEAKER || 'priya',
        pace:0.94,
        temperature:0.6,
        speech_sample_rate:24000,
        output_audio_codec:'wav',
        model:'bulbul:v3'
      })
    });

    if (!upstream.ok) {
      console.error('Sarvam TTS request failed', { status:upstream.status });
      return sendJson(response, 502, { error:'voice_provider_unavailable' });
    }

    const data = await upstream.json();
    const audio = data?.audios?.[0];
    if (!audio) return sendJson(response, 502, { error:'voice_audio_missing' });

    const wav = Buffer.from(audio, 'base64');
    response.writeHead(200, {
      'Content-Type':'audio/wav',
      'Content-Length':String(wav.length),
      'Cache-Control':'private, max-age=300',
      'X-Content-Type-Options':'nosniff',
      'X-Saathi-Voice':'sarvam-bulbul-v3',
      'Server-Timing':`sarvam;dur=${Date.now() - providerStartedAt}`
    });
    response.end(wav);
  } catch (error) {
    console.error('Sarvam TTS request error', { name:error?.name || 'Error' });
    return sendJson(response, 502, { error:'voice_provider_unavailable' });
  }
}
