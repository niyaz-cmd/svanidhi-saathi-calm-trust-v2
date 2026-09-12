// Independent expected cardinal spellings, including every tens/unit combination.
// References: A Manual of Modern Kannada, numeral section;
// https://hasp.ub.uni-heidelberg.de/catalog/view/736/1242/90904
// https://vtu.ac.in/pdf/cbcs/201718/kan2.pdf (number-system tables).
export const CARDINALS = [
'ಸೊನ್ನೆ','ಒಂದು','ಎರಡು','ಮೂರು','ನಾಲ್ಕು','ಐದು','ಆರು','ಏಳು','ಎಂಟು','ಒಂಬತ್ತು',
'ಹತ್ತು','ಹನ್ನೊಂದು','ಹನ್ನೆರಡು','ಹದಿಮೂರು','ಹದಿನಾಲ್ಕು','ಹದಿನೈದು','ಹದಿನಾರು','ಹದಿನೇಳು','ಹದಿನೆಂಟು','ಹತ್ತೊಂಬತ್ತು',
'ಇಪ್ಪತ್ತು','ಇಪ್ಪತ್ತೊಂದು','ಇಪ್ಪತ್ತೆರಡು','ಇಪ್ಪತ್ತಮೂರು','ಇಪ್ಪತ್ತನಾಲ್ಕು','ಇಪ್ಪತ್ತೈದು','ಇಪ್ಪತ್ತಾರು','ಇಪ್ಪತ್ತೇಳು','ಇಪ್ಪತ್ತೆಂಟು','ಇಪ್ಪತ್ತೊಂಬತ್ತು',
'ಮೂವತ್ತು','ಮೂವತ್ತೊಂದು','ಮೂವತ್ತೆರಡು','ಮೂವತ್ತಮೂರು','ಮೂವತ್ತನಾಲ್ಕು','ಮೂವತ್ತೈದು','ಮೂವತ್ತಾರು','ಮೂವತ್ತೇಳು','ಮೂವತ್ತೆಂಟು','ಮೂವತ್ತೊಂಬತ್ತು',
'ನಲವತ್ತು','ನಲವತ್ತೊಂದು','ನಲವತ್ತೆರಡು','ನಲವತ್ತಮೂರು','ನಲವತ್ತನಾಲ್ಕು','ನಲವತ್ತೈದು','ನಲವತ್ತಾರು','ನಲವತ್ತೇಳು','ನಲವತ್ತೆಂಟು','ನಲವತ್ತೊಂಬತ್ತು',
'ಐವತ್ತು','ಐವತ್ತೊಂದು','ಐವತ್ತೆರಡು','ಐವತ್ತಮೂರು','ಐವತ್ತನಾಲ್ಕು','ಐವತ್ತೈದು','ಐವತ್ತಾರು','ಐವತ್ತೇಳು','ಐವತ್ತೆಂಟು','ಐವತ್ತೊಂಬತ್ತು',
'ಅರವತ್ತು','ಅರವತ್ತೊಂದು','ಅರವತ್ತೆರಡು','ಅರವತ್ತಮೂರು','ಅರವತ್ತನಾಲ್ಕು','ಅರವತ್ತೈದು','ಅರವತ್ತಾರು','ಅರವತ್ತೇಳು','ಅರವತ್ತೆಂಟು','ಅರವತ್ತೊಂಬತ್ತು',
'ಎಪ್ಪತ್ತು','ಎಪ್ಪತ್ತೊಂದು','ಎಪ್ಪತ್ತೆರಡು','ಎಪ್ಪತ್ತಮೂರು','ಎಪ್ಪತ್ತನಾಲ್ಕು','ಎಪ್ಪತ್ತೈದು','ಎಪ್ಪತ್ತಾರು','ಎಪ್ಪತ್ತೇಳು','ಎಪ್ಪತ್ತೆಂಟು','ಎಪ್ಪತ್ತೊಂಬತ್ತು',
'ಎಂಬತ್ತು','ಎಂಬತ್ತೊಂದು','ಎಂಬತ್ತೆರಡು','ಎಂಬತ್ತಮೂರು','ಎಂಬತ್ತನಾಲ್ಕು','ಎಂಬತ್ತೈದು','ಎಂಬತ್ತಾರು','ಎಂಬತ್ತೇಳು','ಎಂಬತ್ತೆಂಟು','ಎಂಬತ್ತೊಂಬತ್ತು',
'ತೊಂಬತ್ತು','ತೊಂಬತ್ತೊಂದು','ತೊಂಬತ್ತೆರಡು','ತೊಂಬತ್ತಮೂರು','ತೊಂಬತ್ತನಾಲ್ಕು','ತೊಂಬತ್ತೈದು','ತೊಂಬತ್ತಾರು','ತೊಂಬತ್ತೇಳು','ತೊಂಬತ್ತೆಂಟು','ತೊಂಬತ್ತೊಂಬತ್ತು'
];
const words = new Map(CARDINALS.map((word, value) => [word, value]));

// Decode the complete utterance with a separate additive place-value algorithm.
// Unknown words are an error, not ignored tokens that could hide a lost digit.
export function readKannadaAmountWords(text) {
  let total = 0, group = 0, rupees = null, sign = 1;
  for (const token of text.trim().split(/\s+/)) {
    if (token === 'ಮೈನಸ್') { sign = -1; continue; }
    if (words.has(token)) { group += words.get(token); continue; }
    if (token === 'ನೂರ' || token === 'ನೂರು') { group = (group || 1) * 100; continue; }
    if (['ಸಾವಿರ', 'ಸಾವಿರದ', 'ಲಕ್ಷ', 'ಲಕ್ಷದ', 'ಕೋಟಿ', 'ಕೋಟಿಯ'].includes(token)) {
      const scale = token.startsWith('ಸಾವಿರ') ? 1000 : token.startsWith('ಲಕ್ಷ') ? 100000 : 10000000;
      total += group * scale; group = 0; continue;
    }
    if (token === 'ರೂಪಾಯಿ') { rupees = total + group; total = 0; group = 0; continue; }
    if (token === 'ಪೈಸೆ') return sign * (rupees * 100 + total + group);
    throw new Error(`Unknown Kannada number word: ${token}`);
  }
  if (rupees === null || total || group) throw new Error('Incomplete currency phrase');
  return sign * rupees * 100;
}
