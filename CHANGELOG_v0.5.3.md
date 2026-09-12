# v0.5.3 — Complete Kannada amount recognition

The broad speech audit exposed input-parser gaps for Kannada compound numbers, contracted hundreds, and inflected scale words. Add those forms and match digit positions inside number phrases instead of using divisibility to decide whether digits belong to a larger amount. Reject negative sale inputs rather than dropping the sign, and keep separate phrases across punctuation ambiguous.

Regression coverage includes app parsing for every 0–99,999 whole amount, actual Sarvam transcript variants, mixed digit/word amounts, negative/ambiguous inputs, and the existing voice confirmation gates. The live audit retains original flagged comparisons and supports equivalent Kannada spellings.
