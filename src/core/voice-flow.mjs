const MEANINGFUL_SPEECH = /[\p{L}\p{N}]/u;

export class VoiceListeningSession {
  constructor({
    silenceMs = 2300,
    hardTimeoutMs = 35000,
    schedule = globalThis.setTimeout.bind(globalThis),
    cancel = globalThis.clearTimeout.bind(globalThis),
    onUpdate = () => {},
    onInterim = () => {},
    onFinish = () => {}
  } = {}) {
    this.silenceMs = silenceMs;
    this.hardTimeoutMs = hardTimeoutMs;
    this.schedule = schedule;
    this.cancelTimer = cancel;
    this.onUpdate = onUpdate;
    this.onInterim = onInterim;
    this.onFinish = onFinish;
    this.listening = false;
    this.transcript = '';
    this.silenceTimer = null;
    this.hardTimer = null;
  }

  start() {
    this.cancel();
    this.listening = true;
    this.transcript = '';
    this.hardTimer = this.schedule(() => this.finish('timeout'), this.hardTimeoutMs);
  }

  receive({ transcript = '', isFinal = false } = {}) {
    if (!this.listening) return;
    const value = String(transcript).trim();
    if (!MEANINGFUL_SPEECH.test(value)) return;
    this.transcript = value;
    this.onUpdate({ transcript:value, isFinal:Boolean(isFinal) });
    if (!isFinal) this.onInterim({ transcript:value });
    this.cancelTimer(this.silenceTimer);
    this.silenceTimer = this.schedule(() => this.finish('silence'), this.silenceMs);
  }

  finish(reason = 'manual') {
    if (!this.listening) return;
    this.listening = false;
    this.clearTimers();
    this.onFinish({ reason, transcript:this.transcript });
  }

  cancel() {
    this.listening = false;
    this.clearTimers();
  }

  clearTimers() {
    this.cancelTimer(this.silenceTimer);
    this.cancelTimer(this.hardTimer);
    this.silenceTimer = null;
    this.hardTimer = null;
  }
}

export async function runPromptThenListen({ prompt, speakPrompt, waitForGuard, startListening }) {
  if (typeof speakPrompt !== 'function' || typeof startListening !== 'function') {
    throw new TypeError('Prompt speech and listening callbacks are required.');
  }
  await speakPrompt(prompt);
  if (typeof waitForGuard === 'function') await waitForGuard();
  return startListening();
}

export function createConversationalVoiceWorkflow({ persist, now = () => new Date().toISOString() }) {
  if (typeof persist !== 'function') throw new TypeError('A confirmed-record persistence function is required.');
  let phase = 'idle';
  let pending = null;
  const amounts = { collection:null, investment:null };
  const transcripts = { collection:'', investment:'' };

  function expectTurn(turn) {
    if (!['collection', 'investment'].includes(turn)) throw new TypeError('Unknown money turn.');
  }

  return {
    get phase() { return phase; },
    get pending() { return pending ? { ...pending } : null; },
    get amounts() { return { ...amounts }; },
    get transcripts() { return { ...transcripts }; },
    start() {
      amounts.collection = null;
      amounts.investment = null;
      transcripts.collection = '';
      transcripts.investment = '';
      pending = null;
      phase = 'listening_collection';
    },
    prepareTurn(turn) {
      expectTurn(turn);
      pending = null;
      phase = `listening_${turn}`;
    },
    captureAmount({ turn, transcript, parsed }) {
      expectTurn(turn);
      if (phase !== `listening_${turn}`) throw new Error(`The ${turn} turn is not listening.`);
      const value = Number(parsed?.amount);
      if (parsed?.confidence === 'low' || !Number.isFinite(value) || value < 0) {
        pending = null;
        return { accepted:false, confidence:parsed?.confidence ?? 'low' };
      }
      transcripts[turn] = String(transcript ?? '').trim();
      pending = { turn, amount:Math.round(value), confidence:parsed.confidence };
      phase = `confirm_${turn}`;
      return { accepted:true, ...pending };
    },
    confirmAmount(turn) {
      expectTurn(turn);
      if (phase !== `confirm_${turn}` || pending?.turn !== turn) throw new Error(`The ${turn} amount is not ready to confirm.`);
      amounts[turn] = pending.amount;
      pending = null;
      phase = turn === 'collection' ? 'listening_investment' : 'summary_confirmation';
      return amounts[turn];
    },
    rejectAmount(turn) {
      expectTurn(turn);
      if (phase !== `confirm_${turn}`) throw new Error(`The ${turn} amount is not ready to reject.`);
      transcripts[turn] = '';
      pending = null;
      phase = `listening_${turn}`;
    },
    async confirmRecord({ collection, investment, label = 'Today' }) {
      if (phase !== 'summary_confirmation') throw new Error('Final record confirmation is required.');
      const sales = Number(collection);
      const stock = Number(investment);
      if (!Number.isFinite(sales) || sales < 0 || !Number.isFinite(stock) || stock < 0) {
        throw new TypeError('Both confirmed amounts must be non-negative numbers.');
      }
      const record = { label:String(label), sales:Math.round(sales), stock:Math.round(stock), at:now() };
      await persist(record);
      phase = 'complete';
      return record;
    }
  };
}

export function createVoiceEntryWorkflow({ parse, persist, now = () => new Date().toISOString() }) {
  if (typeof parse !== 'function') throw new TypeError('A transcript parser is required.');
  if (typeof persist !== 'function') throw new TypeError('A confirmed-record persistence function is required.');

  let phase = 'listening';
  let transcript = '';
  let structured = null;

  return {
    get phase() { return phase; },
    get transcript() { return transcript; },
    get structured() { return structured; },
    startListening({ clear = true } = {}) {
      phase = 'listening';
      structured = null;
      if (clear) transcript = '';
    },
    setTranscript(value) {
      const next = String(value ?? '').trim();
      if (!next) throw new TypeError('A meaningful transcript is required.');
      transcript = next;
      structured = null;
      phase = 'transcript_confirmation';
      return transcript;
    },
    confirmTranscript() {
      if (phase !== 'transcript_confirmation' || !transcript) throw new Error('Transcript confirmation is required first.');
      const parsed = parse(transcript);
      structured = {
        ...parsed,
        requiresReview:parsed.confidence === 'low' || parsed.sales === null || parsed.stock === null
      };
      phase = 'money_confirmation';
      return structured;
    },
    rejectTranscript() {
      phase = 'listening';
      structured = null;
    },
    async confirmMoney({ sales, stock, label = 'Today' }) {
      if (phase !== 'money_confirmation') throw new Error('Money confirmation is not available yet.');
      const confirmedSales = Number(sales);
      const confirmedStock = Number(stock);
      if (!Number.isFinite(confirmedSales) || confirmedSales < 0 || !Number.isFinite(confirmedStock) || confirmedStock < 0) {
        throw new TypeError('Both confirmed amounts must be non-negative numbers.');
      }
      const record = {
        label:String(label),
        sales:Math.round(confirmedSales),
        stock:Math.round(confirmedStock),
        at:now()
      };
      await persist(record);
      phase = 'complete';
      return record;
    }
  };
}
