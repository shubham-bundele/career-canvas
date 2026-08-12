# Job Description Matcher — Analysis Methodology

## Version: 1.0.0

## Overview
Local, deterministic, rule-based text analysis. No remote API, no AI/ML model.

## Pipeline Stages

### 1. Normalization
- Unicode NFC normalization
- Lowercase conversion (preserve original for display)
- Whitespace collapse (multiple spaces/newlines -> single space)
- Smart punctuation normalization (curly quotes -> straight)
- Preserve skill-specific symbols: C++, C#, .NET, Node.js, CI/CD, TCP/IP

### 2. Tokenization
- Split on whitespace and punctuation boundaries
- Preserve recognized compound terms (multi-word phrases)
- Preserve abbreviations and acronyms
- Remove standalone punctuation tokens

### 3. Stop Word Removal
- Common English stop words (~150 words)
- Common recruitment filler words ("role", "position", "looking", "candidate", etc.)
- Do NOT remove stop words that are part of recognized phrases
- Document the complete stop-word list

### 4. Phrase Extraction
- Scan for known multi-word phrases from dictionary
- Longest-match-first strategy (prefer "project management" over "project" + "management")
- Categories: skills, methodologies, job functions, certifications

### 5. Term Categorization
| Category | Examples |
|----------|----------|
| Hard Skills | Python, data analysis, machine learning |
| Tools & Technologies | AWS, Docker, React, Jira |
| Certifications | PMP, AWS Solutions Architect, CPA |
| Qualifications | Bachelor's degree, MBA, 5+ years |
| Education | Computer Science, Engineering |
| Responsibility Verbs | manage, develop, implement, lead |
| Soft Skills | communication, teamwork, leadership |
| Domain Terms | fintech, healthcare, SaaS |

### 6. Importance Classification
- **Required**: Preceded by "must have", "required", "mandatory", "essential"
- **Preferred**: Preceded by "preferred", "nice to have", "bonus", "desired", "plus"
- **Repeated**: Appears 3+ times in the description
- **Mentioned**: All other extracted terms

Classification is derived from actual wording context, not assumed.

### 7. Match Types
| Type | Description | Weight |
|------|-------------|--------|
| Exact Match | Same normalized term found in both | 1.0 |
| Phrase Match | Multi-word phrase matched | 1.0 |
| Abbreviation | Known abbreviation matched (e.g., JS = JavaScript) | 0.9 |
| Related Term | Semantically related from dictionary (e.g., "agile" ~ "scrum") | 0.7 |
| Missing | In JD but not found in resume | 0.0 |

### 8. Evidence Extraction
- For each matched term, locate in resume sections
- Record: section type, field path, entry ID, text excerpt (max 200 chars)
- Highlight match position within excerpt

### 9. Overall Estimate Calculation
```
overallEstimate = sum(categoryWeight * categoryPercentage) / sum(categoryWeights)
```

Category weights:
| Category | Weight |
|----------|--------|
| Required Terms | 3.0 |
| Hard Skills | 2.5 |
| Tools & Technologies | 2.0 |
| Certifications | 2.0 |
| Qualifications | 2.0 |
| Experience Language | 1.5 |
| Preferred Terms | 1.0 |
| Soft Skills | 0.5 |

Result is a whole number 0-100.

## Limitations
- Cannot understand context or meaning
- Cannot verify truthfulness of claims
- Cannot evaluate quality of experience
- Related-term matching is dictionary-limited
- Does not predict ATS scoring, interview chances, or hiring decisions
- May miss industry-specific jargon not in dictionaries
