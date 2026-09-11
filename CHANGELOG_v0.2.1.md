# SVANidhi Saathi Field Prototype v0.2.1

Voice and payment-clarity release.

## Changed
- Restored protected Sarvam Bulbul v3 speech through `/api/speech`.
- Added a spoken Saathi introduction followed by a daily collections and business-spending question.
- Ask Saathi answers now play automatically using the same human voice, with a replay control.
- The synthetic device voice is no longer used silently when Sarvam fails online; it remains an explicitly disclosed offline fallback.
- Replaced the unsupported “On track” claim with the visible payment breakdown: ₹8,400 total, ₹7,080 ready, ₹1,320 remaining, 11 days, ₹120 per day.
- Added collection/spending speech keywords in Kannada, Hindi, and English.
- Limited the hosted artifact to the app runtime; research documents and participant spreadsheets remain local.

## Product decision
The daily prompt asks for collections and business spending, not profit. Daily profit needs cost-of-goods, opening and closing stock, credit, returns, and other inputs that this prototype does not collect.
