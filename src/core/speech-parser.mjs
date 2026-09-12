import { kannadaNumber } from './money-speech.mjs';

const COLLECTION_WORDS = [
  'collections', 'collection', 'collected', 'sales', 'sale', 'earned',
  'ವಸೂಲಿ', 'ಕಲೆಕ್ಷನ್', 'ಮಾರಾಟ', 'ಆದಾಯ',
  'वसूली', 'कलेक्शन', 'बिक्री', 'कमाई'
];
const SPENDING_WORDS = [
  'business spending', 'spending', 'spent', 'expense', 'expenses', 'stock', 'inventory',
  'ವ್ಯಾಪಾರದ ಖರ್ಚು', 'ಖರ್ಚು', 'ವೆಚ್ಚ', 'ಸ್ಟಾಕ್',
  'कारोबार का खर्च', 'खर्च', 'खर्चा', 'स्टॉक'
];

function normalizeNumber(raw) {
  const cleaned = raw.replace(/[₹,\s]/g, '');
  const value = Number(cleaned);
  return Number.isFinite(value) ? Math.round(value) : null;
}

function extractNumbers(text) {
  const matches = text.match(/₹?\s*\d[\d,]*/g) ?? [];
  return matches.map(normalizeNumber).filter((v) => v !== null);
}

const NATIVE_DIGITS = Object.freeze({
  '०':'0','१':'1','२':'2','३':'3','४':'4','५':'5','६':'6','७':'7','८':'8','९':'9',
  '೦':'0','೧':'1','೨':'2','೩':'3','೪':'4','೫':'5','೬':'6','೭':'7','೮':'8','೯':'9'
});

// Accept common contracted and joined hundred forms emitted by Kannada STT.
const KANNADA_HUNDREDS = [
  [100,['ನೂರ','ಒಂದುನೂರ']], [200,['ಇನ್ನೂರ','ಎರಡುನೂರ']], [300,['ಮುನ್ನೂರ','ಮೂರುನೂರ']],
  [400,['ನಾನೂರ','ನಾಲ್ಕುನೂರ']], [500,['ಐನೂರ','ಐದುನೂರ']], [600,['ಆರುನೂರ']],
  [700,['ಏಳುನೂರ']], [800,['ಎಂಟುನೂರ']], [900,['ಒಂಬೈನೂರ','ಒಂಬತ್ತುನೂರ']]
];
const VOWEL_SIGNS = {'ಅ':'','ಆ':'ಾ','ಇ':'ಿ','ಈ':'ೀ','ಉ':'ು','ಊ':'ೂ','ಎ':'ೆ','ಏ':'ೇ','ಐ':'ೈ','ಒ':'ೊ','ಓ':'ೋ','ಔ':'ೌ'};
const KANNADA_HUNDRED_WORDS = Object.fromEntries(KANNADA_HUNDREDS.flatMap(([hundred,forms])=>forms.flatMap(stem=>[
  [stem,hundred],[stem+'ು',hundred],
  ...Array.from({length:99},(_,i)=>{ const n=i+1, word=kannadaNumber(n);return [[stem+word,hundred+n],[stem+(VOWEL_SIGNS[word[0]]??word[0])+word.slice(1),hundred+n]]; }).flat()
])));

const NUMBER_WORDS = Object.freeze({
  en:Object.freeze({
    zero:0, one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9,
    ten:10, eleven:11, twelve:12, thirteen:13, fourteen:14, fifteen:15, sixteen:16,
    seventeen:17, eighteen:18, nineteen:19, twenty:20, thirty:30, forty:40, fifty:50,
    sixty:60, seventy:70, eighty:80, ninety:90, hundred:100, thousand:1000, lakh:100000
  }),
  hi:Object.freeze({
    'शून्य':0, 'एक':1, 'दो':2, 'तीन':3, 'चार':4, 'पांच':5, 'पाँच':5, 'छह':6, 'छः':6,
    'सात':7, 'आठ':8, 'नौ':9, 'दस':10, 'ग्यारह':11, 'बारह':12, 'तेरह':13,
    'चौदह':14, 'पंद्रह':15, 'पन्द्रह':15, 'सोलह':16, 'सत्रह':17, 'अठारह':18,
    'उन्नीस':19, 'बीस':20, 'तीस':30, 'चालीस':40, 'पचास':50, 'साठ':60,
    'सत्तर':70, 'अस्सी':80, 'नब्बे':90, 'सौ':100, 'हजार':1000, 'हज़ार':1000, 'लाख':100000
  }),
  kn:Object.freeze({
    ...Object.fromEntries(Array.from({length:100},(_,n)=>[kannadaNumber(n),n])),
    ...KANNADA_HUNDRED_WORDS,
    'ನೂರ':100, 'ನೂರಾ':100, 'ಸಾವಿರದ':1000, 'ಲಕ್ಷದ':100000, 'ಕೋಟಿ':10000000, 'ಕೋಟಿಯ':10000000,
    'ಇನ್ನೂರು':200, 'ಇನ್ನೂರ':200, 'ಮುನ್ನೂರು':300, 'ಮುನ್ನೂರ':300, 'ನಾನೂರು':400, 'ನಾನೂರ':400,
    'ಐನೂರು':500, 'ಐನೂರ':500, 'ಆರುನೂರು':600, 'ಆರುನೂರ':600, 'ಏಳುನೂರು':700, 'ಏಳುನೂರ':700,
    'ಎಂಟುನೂರು':800, 'ಎಂಟುನೂರ':800, 'ಒಂಬೈನೂರು':900, 'ಒಂಬೈನೂರ':900,
    'ಸೊನ್ನೆ':0, 'ಒಂದು':1, 'ಎರಡು':2, 'ಮೂರು':3, 'ನಾಲ್ಕು':4, 'ಐದು':5, 'ಆರು':6,
    'ಏಳು':7, 'ಎಂಟು':8, 'ಒಂಬತ್ತು':9, 'ಹತ್ತು':10, 'ಹನ್ನೊಂದು':11, 'ಹನ್ನೆರಡು':12,
    'ಹದಿಮೂರು':13, 'ಹದಿನಾಲ್ಕು':14, 'ಹದಿನೈದು':15, 'ಹದಿನಾರು':16, 'ಹದಿನೇಳು':17,
    'ಹದಿನೆಂಟು':18, 'ಹತ್ತೊಂಬತ್ತು':19, 'ಇಪ್ಪತ್ತು':20, 'ಮೂವತ್ತು':30, 'ನಲವತ್ತು':40,
    'ಐವತ್ತು':50, 'ಅರವತ್ತು':60, 'ಎಪ್ಪತ್ತು':70, 'ಎಂಬತ್ತು':80, 'ತೊಂಬತ್ತು':90,
    'ನೂರು':100, 'ಸಾವಿರ':1000, 'ಲಕ್ಷ':100000
  })
});

const CONNECTORS = Object.freeze({
  en:new Set(['and']),
  hi:new Set(['और']),
  kn:new Set(['ಮತ್ತು'])
});

function normalizeNativeDigits(value) {
  return String(value ?? '').replace(/[०-९೦-೯]/g, (digit) => NATIVE_DIGITS[digit] ?? digit);
}

function normalizeSttDigitSpacing(value) {
  return normalizeNativeDigits(value).replace(/(?<![\d,.])(?:\d{1,2}\s+){1,3}\d{1,3}(?![\d,.])/g, (match) => {
    const parts = match.trim().split(/\s+/);
    const joinable = parts.every((part) => part.length === 1)
      || (parts.length === 2 && parts[0].length <= 2 && parts[1].length >= 2);
    const joined = parts.join('');
    return joinable && joined.length >= 3 && joined.length <= 7 ? joined : match;
  });
}

function extractDigitCandidates(text) {
  return [...text.matchAll(/(?:\d{1,3}(?:,\d{2,3})+|\d+)(?:\.\d{1,2})?/g)]
    .map(match => ({value:Number(match[0].replaceAll(',', '')), start:match.index, end:match.index+match[0].length}))
    .filter(candidate => Number.isFinite(candidate.value));
}

function evaluateNumberWords(tokens) {
  const values = tokens.filter((token) => token.kind !== 'connector').map((token) => token.value);
  if (values.length >= 3 && values.every((value) => value >= 0 && value <= 9)) {
    return Number(values.join(''));
  }
  let current = 0;
  let total = 0;
  for (const { value, kind } of tokens) {
    if (kind === 'connector') continue;
    if (value === 100) current = Math.max(current, 1) * value;
    else if (value >= 1000) {
      total += Math.max(current, 1) * value;
      current = 0;
    } else current += value;
  }
  return total + current;
}

function extractWordCandidates(text, language) {
  const lexicon = NUMBER_WORDS[language] ?? NUMBER_WORDS.en;
  const connectors = CONNECTORS[language] ?? CONNECTORS.en;
  const words = [...text.toLocaleLowerCase().matchAll(/[\p{L}\p{M}]+|(?:\d{1,3}(?:,\d{2,3})+|\d+)(?:\.\d{1,2})?/gu)];
  const candidates = [];
  let sequence = [];
  const flush = () => {
    if (!sequence.length) return;
    if (sequence.some((token) => token.kind === 'word')) {
      const value = evaluateNumberWords(sequence);
      if (Number.isFinite(value)) candidates.push({value,start:sequence[0].start,end:sequence.at(-1).end});
    }
    sequence = [];
  };
  for (const match of words) {
    const word=match[0], position={start:match.index,end:match.index+word.length};
    if (sequence.length && /[^\s-]/u.test(text.slice(sequence.at(-1).end,match.index))) flush();
    if (Object.hasOwn(lexicon, word)) sequence.push({ value:lexicon[word], kind:'word', ...position });
    else if (/^\d/.test(word)) sequence.push({ value:Number(word.replaceAll(',','')), kind:'digit', ...position });
    else if (sequence.length && connectors.has(word)) sequence.push({ value:0, kind:'connector', ...position });
    else flush();
  }
  flush();
  return candidates;
}

export function parseCurrencyAmount(transcript, { language = 'en' } = {}) {
  // Sales/spending capture accepts non-negative amounts. Never discard a spoken sign.
  const signedText = normalizeNativeDigits(transcript);
  if (/(?:[-−]\s*₹?\s*\d|₹\s*[-−]\s*\d|ಮೈನಸ್|ಋಣ|माइनस|ऋण|\bminus\b|\bnegative\b)/iu.test(signedText))
    return { amount:null, candidates:[], confidence:'low' };
  const normalized = normalizeSttDigitSpacing(transcript);
  const digitCandidates = extractDigitCandidates(normalized);
  const languages = [language, ...Object.keys(NUMBER_WORDS).filter((candidate) => candidate !== language)];
  const wordCandidates = languages.flatMap((candidate) => extractWordCandidates(normalized, candidate));
  // A digit inside a complete word/scale phrase belongs to that phrase. Match its
  // position, not divisibility, so a separate repeated amount is still ambiguous.
  const independentDigits = digitCandidates.filter(digit => !wordCandidates.some(word => digit.start >= word.start && digit.end <= word.end));
  const candidates = [];
  const values = [...independentDigits.map(item=>item.value), ...wordCandidates.map(item=>item.value)];
  for (const value of values) {
    if (!candidates.includes(value)) candidates.push(value);
  }
  if (candidates.length !== 1) return { amount:null, candidates, confidence:'low' };
  return { amount:candidates[0], candidates, confidence:'high' };
}

function findKeywordAmount(text, keywords) {
  const lower = text.toLocaleLowerCase();
  const numberMatches = [...text.matchAll(/₹?\s*\d[\d,]*/g)];
  for (const word of keywords) {
    const idx = lower.indexOf(word.toLocaleLowerCase());
    if (idx === -1) continue;
    const keywordCenter = idx + word.length / 2;
    const candidates = numberMatches
      .map((match) => ({
        value: normalizeNumber(match[0]),
        distance: Math.abs((match.index + match[0].length / 2) - keywordCenter),
      }))
      .filter((candidate) => candidate.value !== null)
      .sort((a, b) => a.distance - b.distance);
    if (candidates.length && candidates[0].distance <= 28) return candidates[0].value;
  }
  return null;
}

export function parseDailyAmounts(transcript) {
  const text = String(transcript ?? '').trim();
  const rawNumbers = extractNumbers(text);
  let sales = findKeywordAmount(text, COLLECTION_WORDS);
  let stock = findKeywordAmount(text, SPENDING_WORDS);

  if (sales !== null && stock !== null) {
    return { sales, stock, confidence: 'high', rawNumbers };
  }

  if (rawNumbers.length >= 2) {
    sales ??= rawNumbers[0];
    stock ??= rawNumbers.find((n) => n !== sales) ?? rawNumbers[1];
    return { sales, stock, confidence: 'medium', rawNumbers };
  }

  if (rawNumbers.length === 1) {
    sales ??= rawNumbers[0];
    return { sales, stock: null, confidence: 'low', rawNumbers };
  }

  return { sales: null, stock: null, confidence: 'low', rawNumbers };
}
