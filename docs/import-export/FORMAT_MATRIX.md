# Import/Export Format Matrix

## Import Source → Target Document Type

| Source | Resume | CV | Academic CV | Cover Letter | Reference Sheet | Full Restore |
|--------|--------|----|-----------|--------------|-----------------|----|
| CC JSON single | Yes | Yes | Yes | Yes | Yes | N/A |
| CC full backup | N/A | N/A | N/A | N/A | N/A | Yes |
| DOCX | Yes | Yes | Yes (detected) | Partial | Partial | N/A |
| PDF (text) | Yes | Yes | Yes (detected) | Partial | Partial | N/A |
| PDF (scanned) | Not implemented | — | — | — | — | N/A |
| Plain text | Yes | Yes | Yes (detected) | Partial | Partial | N/A |
| Pasted text | Yes | Yes | Yes (detected) | Partial | Partial | N/A |
| Markdown | Not implemented | — | — | — | — | N/A |

## Export Format Support by Document Type

| Format | Resume | CV | Academic CV | Cover Letter | Reference Sheet |
|--------|--------|----|-----------|--------------|----|
| JSON | Yes | Yes | Yes | Yes | Yes |
| Plain Text | Yes | Yes | Yes | Partial | Partial |
| Markdown | Yes | Yes | Yes | Partial | Partial |
| HTML | Yes | Yes | Yes | Yes | Yes |
| PDF (print) | Yes | Yes | Yes | Yes | Yes |
| DOCX | Not implemented | — | — | — | — |

## Round-Trip Fidelity

| Format | Fidelity | Data Loss |
|--------|----------|-----------|
| JSON | Lossless | None (same schema) |
| Plain Text | Low | Design, template, images, formatting lost |
| Markdown | Low-Medium | Design, template, images lost |
| HTML | Medium | Template, design settings lost |
| PDF → reimport | Low | Layout, exact formatting, design lost |
| DOCX → reimport | Low-Medium | Template, exact layout lost |
