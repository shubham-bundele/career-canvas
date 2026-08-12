# Online ATS — Provider Review

## Research Date: August 2026

## Key Finding

**No commercial resume API provides ATS compatibility scoring for free.** All providers are resume PARSERS — they extract structured data from documents but do not score them for ATS compatibility or provide improvement feedback.

ATS scoring requires custom rule logic, which CareerCanvas already implements in `ats-checker.js`.

## Providers Evaluated

### 1. Affinda (affinda.com)
- **Type**: Resume parser
- **Free tier**: 3-month trial, 2000 document credits
- **Paid**: From ~$800/year for 6000 parses
- **Auth**: Bearer token
- **Provides**: Structured field extraction (100+ fields), 56+ languages
- **Does NOT provide**: ATS scoring, compatibility feedback, improvement suggestions
- **Data retention**: Indefinite by default, deletion via API
- **Security**: ISO 27001:2022, SOC 2 Type II, GDPR
- **Verdict**: Best parser API, but parsing ≠ scoring

### 2. Eden AI (edenai.run)
- **Type**: Parsing aggregator (wraps Affinda, SenseLoaf, Klippa, Extracta, OpenAI)
- **Free tier**: $10 credits on signup, no credit card
- **Cheapest**: GPT-4o at $0.04/page (~250 free parses)
- **Auth**: Bearer token
- **Provides**: Unified API across 5 providers, standardized JSON
- **Does NOT provide**: ATS scoring, compatibility feedback
- **Verdict**: Best value for parsing, easiest API

### 3. RChilli (rchilli.com)
- **Type**: Enterprise resume parser
- **Free tier**: None public
- **Access**: Requires sales contact
- **Verdict**: Not viable for hobby/free projects

### 4. Sovren/Textkernel
- **Type**: Enterprise parser (acquired by Bullhorn)
- **Free tier**: None
- **Access**: Enterprise sales only
- **Verdict**: Not viable

### 5. SuperParser (superparser.com)
- **Type**: Resume parser
- **Free tier**: 50 credits/month permanent
- **Provides**: Parsing only, English only
- **GDPR compliant, does not retain data**
- **Verdict**: Best permanent free tier for parsing

## Selected Approach

Since no external provider offers ATS scoring:

1. **Local ATS scoring** via existing `ats-checker.js` — NOW FUNCTIONAL
2. **Optional external parsing** via Eden AI or SuperParser — for enhanced field extraction on imported documents (future enhancement, requires API key configuration)

## Why Not "Online ATS Score"

Creating an "Online ATS Score" label for results from a parsing API would be misleading. Parsing APIs extract data — they don't evaluate ATS compatibility. The local rule-based checker IS the ATS scoring engine and is honest about what it does.
