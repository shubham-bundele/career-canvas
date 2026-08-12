# Data Flow

> CareerCanvas Application Guide | Generated: 2026-08-12

---

## Document Creation Flow

```mermaid
flowchart LR
    Wizard[Onboarding Wizard] -->|selections| Create[createEmptyDocument]
    Create -->|document object| IDB[(IndexedDB documents)]
    IDB -->|document id| Router[Navigate to /editor/:id]
```

## Document Editing Flow

```mermaid
flowchart LR
    User[User edits field] -->|value| Handler[handleFieldChange]
    Handler --> History[Push to undo history<br>500ms debounce]
    Handler --> Preview[Update preview<br>300ms debounce]
    Handler --> Save[Autosave<br>1000ms debounce]
    Save -->|db.put| IDB[(IndexedDB)]
```

## Import Flow

```mermaid
flowchart TD
    File[Selected File] --> Validate[Validate size/type]
    Validate --> Parse{Format?}
    Parse -->|JSON| ParseJSON[Parse + validate schema]
    Parse -->|DOCX| ParseDOCX[Mammoth.js → HTML → parseHTMLContent]
    Parse -->|PDF| ParsePDF[PDF.js → text extraction]
    Parse -->|TXT| ParseTXT[parsePlainText]
    ParsePDF -->|< 50 chars| OCR[Tesseract.js OCR]
    OCR --> ParseTXT
    ParseJSON --> Review[Field Mapping UI]
    ParseDOCX --> Detect[detectDocumentType]
    ParseTXT --> Detect
    Detect --> Review
    Review -->|Confirm| Build[createDocumentFromParsed]
    Build --> IDB[(IndexedDB)]
    IDB --> Editor[/editor/:id]
```

## Export Flow

```mermaid
flowchart LR
    Doc[Document] --> Format{Format?}
    Format -->|PDF| Print[window.print → Print dialog]
    Format -->|JSON| JSON[Wrap in envelope → Blob]
    Format -->|TXT| TXT[convertToPlainText → Blob]
    Format -->|MD| MD[convertToMarkdown → Blob]
    Format -->|HTML| HTML[wrapHTMLDocument → Blob]
    JSON --> Download[Download via anchor click]
    TXT --> Download
    MD --> Download
    HTML --> Download
```

## Template Application Flow

```mermaid
flowchart LR
    Gallery[Template Gallery] -->|Select template| Create[createEmptyDocument]
    Create -->|Set templateId| Apply[Apply color/font presets]
    Apply -->|Save| IDB[(IndexedDB)]
    IDB --> Editor[/editor/:id]

    EditorChange[Editor: Change Template] -->|New templateId| Update[Update doc.design]
    Update -->|Autosave| IDB2[(IndexedDB)]
    IDB2 --> Render[Re-render preview]
```

## Job Matcher Flow

```mermaid
flowchart TD
    Resume[Select Resume] --> Extract[extractResumeText]
    JD[Paste Job Description] --> Normalize[normalizeText]
    Extract --> ExtractTerms[extractTerms<br>phrases → singles]
    Normalize --> ExtractJD[extractTerms from JD]
    ExtractTerms --> Compare[compareTerms<br>exact/abbrev/related matching]
    ExtractJD --> Compare
    Compare --> Calculate[calculateEstimate<br>weighted category scoring]
    Calculate --> Results[Match % + breakdown]
    Results -->|Save| IDB[(matchAnalyses)]
```

## Skills Matrix Flow

```mermaid
flowchart TD
    Resume[Select Resume] --> ExtractContent[extractContentFromDocument]
    ExtractContent --> ExtractSkills[extractSkillsFromDocument<br>140+ alias dictionary]
    ExtractSkills --> FindEvidence[findEvidenceForSkills<br>scan all sections]
    FindEvidence --> Assess[assessStrength<br>score → Strong/Moderate/Limited]
    Assess --> Matrix[Skills Matrix Table]
    Matrix -->|Save| IDB[(skillsMatrices)]
```

## Authentication Flow

```mermaid
flowchart TD
    Start[App Init] --> FetchConfig[Fetch /api/public-config]
    FetchConfig -->|Success| CreateClient[Create Supabase client]
    FetchConfig -->|Fail| Guest[Guest mode]
    CreateClient --> RestoreSession[Restore session]
    RestoreSession -->|Valid| Auth[AUTHENTICATED]
    RestoreSession -->|Invalid| Unauth[UNAUTHENTICATED]
    Unauth -->|Sign in| Auth
    Unauth -->|Continue as guest| Guest
    Auth -->|Sign out| Guest
```

## Backup and Restore Flow

```mermaid
flowchart LR
    subgraph Export
        All[exportAllData] -->|Read all 11 stores| JSON[JSON file]
        Selective[exportSelectedStores] -->|Read selected stores| PartialJSON[Partial JSON]
    end

    subgraph Import
        Backup[Backup file] --> Validate[Validate structure]
        Validate --> Preview[Show contents preview]
        Preview -->|Confirm| Merge[Upsert records per store]
        Merge --> IDB[(IndexedDB)]
    end
```
