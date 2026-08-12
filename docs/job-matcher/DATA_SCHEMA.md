# Job Description Matcher — Data Schema

## Schema Versions
- Job Description Schema: 1
- Match Analysis Schema: 1
- Analysis Method Version: "1.0.0"

## Job Description Entity
Uses EXISTING `jobDescriptions` IndexedDB store.

```js
{
  id: UUID,                    // Primary key
  schemaVersion: 1,
  title: string,               // "Senior Frontend Developer at Acme Corp"
  company: string,             // "Acme Corp"
  targetRole: string,          // "Senior Frontend Developer"
  sourceUrl: string|null,      // Optional URL where JD was found
  descriptionText: string,     // Raw pasted text
  normalizedText: string,      // Lowercased, whitespace-normalized
  tags: string[],              // User-defined tags
  archived: boolean,
  createdAt: ISO datetime,
  lastModified: ISO datetime,
  analysisIds: string[]        // IDs of linked analyses
}
```

## Match Analysis Entity
Stored in NEW `matchAnalyses` IndexedDB store.

```js
{
  id: UUID,
  schemaVersion: 1,
  name: string,                          // "Analysis: Resume vs Acme JD"
  resumeId: UUID,
  resumeNameSnapshot: string,            // Name at analysis time
  resumeModifiedAtSnapshot: ISO datetime,
  resumeFingerprint: string,             // Hash of resume content
  jobDescriptionId: UUID,
  jobDescriptionTitleSnapshot: string,
  jobDescriptionFingerprint: string,     // Hash of JD content
  analysisMethodVersion: "1.0.0",
  createdAt: ISO datetime,
  lastModified: ISO datetime,
  overallEstimate: number,               // 0-100 whole number
  categoryResults: CategoryResult[],
  matchedTerms: TermResult[],
  missingTerms: TermResult[],
  resumeOnlyTerms: TermResult[],
  evidenceLocations: Evidence[],
  dismissedSuggestionIds: string[],
  resultFilters: object,                 // Last-used filter state
  staleStatus: 'current' | 'stale-resume' | 'stale-jd' | 'stale-both'
}
```

## Category Result
```js
{
  category: string,      // 'hardSkills', 'tools', 'qualifications', etc.
  label: string,         // "Hard Skills"
  matched: number,
  total: number,
  percentage: number,
  weight: number         // Category weight in overall estimate
}
```

## Term Result
```js
{
  id: UUID,
  displayTerm: string,         // Original casing
  normalizedTerm: string,      // Lowercase normalized
  category: string,            // Term category
  matchType: string,           // 'exact' | 'phrase' | 'abbreviation' | 'related' | 'missing'
  importance: string,          // 'required' | 'preferred' | 'repeated' | 'mentioned'
  requirementLevel: string,    // 'required' | 'preferred' | 'responsibility' | 'qualification' | 'general'
  jobFrequency: number,        // Count in JD
  resumeFrequency: number,     // Count in resume
  resumeSections: string[],    // Section types where found
  evidence: Evidence[],        // Specific locations
  status: string,              // 'matched' | 'missing' | 'resume-only'
  explanation: string,         // Human-readable explanation
  dismissed: boolean           // User dismissed this suggestion
}
```

## Evidence
```js
{
  resumeSection: string,       // Section type
  fieldPath: string,           // e.g., "sections[2].items[0].responsibilities"
  entryId: string|null,        // Item UUID if in a list
  excerpt: string,             // Text snippet (max 200 chars)
  matchStart: number,          // Start position in excerpt
  matchEnd: number,            // End position in excerpt
  matchType: string            // How this evidence was matched
}
```

## Fingerprinting
Content fingerprint for staleness detection:
```js
function fingerprint(text) {
  // Simple hash of normalized content
  let hash = 0;
  const str = text.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}
```
