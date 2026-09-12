// Speech-only currency expansion; displayed amounts and ledger values stay numeric.
const SMALL = ['ಸೊನ್ನೆ','ಒಂದು','ಎರಡು','ಮೂರು','ನಾಲ್ಕು','ಐದು','ಆರು','ಏಳು','ಎಂಟು','ಒಂಬತ್ತು',
  'ಹತ್ತು','ಹನ್ನೊಂದು','ಹನ್ನೆರಡು','ಹದಿಮೂರು','ಹದಿನಾಲ್ಕು','ಹದಿನೈದು','ಹದಿನಾರು','ಹದಿನೇಳು','ಹದಿನೆಂಟು','ಹತ್ತೊಂಬತ್ತು'];
const TENS = ['','','ಇಪ್ಪತ್ತು','ಮೂವತ್ತು','ನಲವತ್ತು','ಐವತ್ತು','ಅರವತ್ತು','ಎಪ್ಪತ್ತು','ಎಂಬತ್ತು','ತೊಂಬತ್ತು'];
const ENDINGS = ['','ೊಂದು','ೆರಡು','ಮೂರು','ನಾಲ್ಕು','ೈದು','ಾರು','ೇಳು','ೆಂಟು','ೊಂಬತ್ತು'];

export function kannadaNumber(n) {
  if (n < 20) return SMALL[n];
  if (n < 100) {
    const tens = TENS[Math.floor(n / 10)];
    return n % 10 ? tens.slice(0, -1) + ENDINGS[n % 10] : tens;
  }
  for (const [scale, word] of [[10000000,'ಕೋಟಿ'], [100000,'ಲಕ್ಷ'], [1000,'ಸಾವಿರ']]) {
    if (n >= scale) {
      const rest = n % scale;
      return `${kannadaNumber(Math.floor(n / scale))} ${word}${rest ? `${word === 'ಕೋಟಿ' ? 'ಯ' : 'ದ'} ${kannadaNumber(rest)}` : ''}`;
    }
  }
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  return `${hundreds === 1 ? '' : SMALL[hundreds] + ' '}${rest ? 'ನೂರ ' + kannadaNumber(rest) : 'ನೂರು'}`;
}

function currencyWords(raw) {
  const normalized = raw.replace(/−/g, '-').replace(/\s/g, '').replace(/[೦-೯]/g, d => String(d.charCodeAt(0) - 0x0ce6));
  // Validate the complete token; never pronounce only part of an invalid amount.
  if (!/^-?(?:\d+|\d{1,3}(?:,\d{3})+|\d{1,2}(?:,\d{2})*,\d{3})(?:\.\d{1,2})?$/.test(normalized)) return null;
  const negative = normalized.startsWith('-');
  const [rupees, fraction = ''] = normalized.replace(/^-/, '').replaceAll(',', '').split('.');
  const value = Number(rupees);
  if (!Number.isSafeInteger(value) || value > 999999999) return null;
  const paise = Number(fraction.padEnd(2, '0'));
  return `${negative ? 'ಮೈನಸ್ ' : ''}${kannadaNumber(value)} ರೂಪಾಯಿ${paise ? ` ${kannadaNumber(paise)} ಪೈಸೆ` : ''}`;
}

export function moneySpeechText(text, language) {
  const value = String(text ?? '');
  if (language !== 'kn') return value;
  return value.replace(/([-−]\s*)?₹\s*([-−]?\s*[0-9೦-೯][0-9೦-೯,]*(?:\.[0-9೦-೯]+)*(?:[eE][+-]?[0-9೦-೯]+)?)(?:\s+ರೂಪಾಯಿ)?|(?<![\p{L}\p{N},.₹-])([-−]?[0-9೦-೯][0-9೦-೯,]*(?:\.[0-9೦-೯]+)*(?:[eE][+-]?[0-9೦-೯]+)?)\s+ರೂಪಾಯಿ/gu,
    (match, sign, symbolAmount, wordAmount) => currencyWords(symbolAmount === undefined ? wordAmount : (sign ?? '') + symbolAmount) ?? match);
}
