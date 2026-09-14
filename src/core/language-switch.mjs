const LANGUAGE_NAMES = Object.freeze({
  kn:'Kannada',
  hi:'Hindi',
  en:'English'
});

const COMMANDS = Object.freeze([
  ['hi', /^(?:please\s+)?(?:can you\s+)?(?:speak|talk|switch|change)(?:\s+(?:to|in))?\s+hindi\b/i],
  ['kn', /^(?:please\s+)?(?:can you\s+)?(?:speak|talk|switch|change)(?:\s+(?:to|in))?\s+kannada\b/i],
  ['en', /^(?:please\s+)?(?:can you\s+)?(?:speak|talk|switch|change)(?:\s+(?:to|in))?\s+english\b/i],
  ['hi', /(?:हिंदी|हिन्दी)\s*(?:में)?\s*(?:बोलो|बोलिए|बात करो|बात करें|बदल(?:ो|ें))/u],
  ['kn', /कन्नड़\s*(?:में)?\s*(?:बोलो|बोलिए|बात करो|बात करें|बदल(?:ो|ें))/u],
  ['en', /(?:अंग्रेज़ी|अंग्रेजी|इंग्लिश)\s*(?:में)?\s*(?:बोलो|बोलिए|बात करो|बात करें|बदल(?:ो|ें))/u],
  ['hi', /ಹಿಂದಿ\s*(?:ಯಲ್ಲಿ|ನಲ್ಲಿ)?\s*(?:ಮಾತನಾಡಿ|ಮಾತಾಡಿ|ಬದಲಾಯಿಸಿ)/u],
  ['kn', /ಕನ್ನಡ\s*(?:ದಲ್ಲಿ)?\s*(?:ಮಾತನಾಡಿ|ಮಾತಾಡಿ|ಬದಲಾಯಿಸಿ)/u],
  ['en', /(?:ಇಂಗ್ಲಿಷ್|ಇಂಗ್ಲೀಷ್)\s*(?:ನಲ್ಲಿ)?\s*(?:ಮಾತನಾಡಿ|ಮಾತಾಡಿ|ಬದಲಾಯಿಸಿ)/u]
]);

export function requestedLanguageSwitch(transcript, currentLanguage) {
  const value = String(transcript ?? '').trim();
  if (!value) return null;
  const match = COMMANDS.find(([, expression]) => expression.test(value));
  return match && match[0] !== currentLanguage ? match[0] : null;
}

export function languageName(language) {
  return LANGUAGE_NAMES[language] ?? LANGUAGE_NAMES.en;
}
