# CareerCanvas — License and Copyright Audit

## Audit Date: 2026-08-11

---

## 1. PROJECT LICENSE
| Item | Status |
|------|--------|
| Project License | **MIT** (declared in package.json) |
| LICENSE file | **Not present** — should be added |

**Recommendation**: Add a `LICENSE` file with the full MIT text.

---

## 2. NPM DEPENDENCIES (Runtime)
| Package | License | Status |
|---------|---------|--------|
| *(none)* | — | **No runtime dependencies** |

The project has zero runtime npm dependencies. All code is vanilla JS.

---

## 3. DEV DEPENDENCIES
| Package | License | Status |
|---------|---------|--------|
| playwright | Apache 2.0 | **FREE** — dev/testing only, not shipped |
| playwright-core | Apache 2.0 | **FREE** — dev/testing only, not shipped |

---

## 4. CDN-LOADED LIBRARIES
| Library | Source | License | Used By | Status |
|---------|--------|---------|---------|--------|
| PDF.js 4.4.168 | cdnjs.cloudflare.com | **Apache 2.0** (Mozilla Foundation) | PDF Studio | **FREE** — open source, modification/redistribution allowed |

- Loaded on-demand only when PDF Studio is opened (lazy import)
- CDN (cdnjs) is a free public service by Cloudflare
- No API key required

---

## 5. EXTERNAL APIs (Optional, User-Toggled)
| API | Provider | License/Terms | Used By | Status |
|-----|----------|---------------|---------|--------|
| Clearbit Company Autocomplete | Clearbit (HubSpot) | **Free public endpoint** — no API key, no auth | Autocomplete (optional) | **FREE** — public autocomplete API |
| HiPoLabs Universities | HiPoLabs | **MIT License** (open source) | Autocomplete (optional) | **FREE** — open data |

- Both APIs are **optional** — toggled by user in editor settings
- Local autocomplete works without them (410 job titles, 150 companies, 300+ skills offline)
- No data is uploaded — only search queries sent for suggestions

---

## 6. FONTS
| Font | Type | License | Status |
|------|------|---------|--------|
| System font stack (-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif) | System | **Pre-installed** | **FREE** — no licensing needed |
| Arial, Helvetica | System | **Pre-installed** | **FREE** |
| Calibri | System (Windows) | **Pre-installed** | **FREE** |
| Georgia | System | **Pre-installed** | **FREE** |
| Times New Roman | System | **Pre-installed** | **FREE** |
| Garamond | System | **Pre-installed** | **FREE** |
| Palatino / Palatino Linotype | System | **Pre-installed** | **FREE** |
| Cambria | System | **Pre-installed** | **FREE** |
| Book Antiqua | System | **Pre-installed** | **FREE** |

- **No web fonts loaded** from Google Fonts, Typekit, or any CDN
- All fonts are system-installed fonts that come with operating systems
- No font files bundled in the project

---

## 7. ICONS
| Icon Source | Type | License | Status |
|------------|------|---------|--------|
| Inline SVG icons | Original | CareerCanvas original | **FREE** — hand-drawn SVG paths |
| Native emoji | System | Platform native | **FREE** — OS-provided |

- **No icon library** (FontAwesome, Heroicons, Material Icons, etc.)
- All SVG icons are inline `<svg>` elements with hand-written paths
- No external icon CDN or sprite sheet

---

## 8. IMAGES AND MEDIA
| Asset | Status |
|-------|--------|
| Stock photos | **None** — no images in project |
| Logo | **SVG inline** — original CareerCanvas design |
| Favicon | **SVG data URI** — original design |
| Illustrations | **None** |

---

## 9. CSS FRAMEWORKS
| Framework | Status |
|-----------|--------|
| Bootstrap | **Not used** |
| Tailwind | **Not used** |
| Material UI | **Not used** |
| Any CSS framework | **Not used** |

All CSS is original, hand-written CareerCanvas code.

---

## 10. TEMPLATES
| Source | Status |
|--------|--------|
| All 68 resume templates | **Original CareerCanvas code** |
| External/commercial templates | **None copied** |
| Template designs | Original render functions with inline CSS |

---

## 11. SAMPLE DATA
| Item | Status |
|------|--------|
| "Alex Morgan Chen" resume | **Fictional** — not based on a real person |
| Company names (TechFlow, DataVerse) | **Fictional** |
| URLs (alexchen.dev, etc.) | **example/fictional** domains |
| Universities (University of Washington) | Real name used for realism — **no copyright issue** (factual reference) |

---

## 12. THIRD-PARTY CODE PATTERNS
| Item | Status |
|------|--------|
| Copy-pasted Stack Overflow code | **None detected** |
| Open source code copied | **None detected** |
| Commercial code copied | **None detected** |

---

## SUMMARY

| Category | Count | All Free? |
|----------|-------|-----------|
| Runtime npm dependencies | 0 | N/A |
| CDN libraries | 1 (PDF.js) | **Yes** — Apache 2.0 |
| External APIs | 2 (optional) | **Yes** — free/open |
| External fonts | 0 | N/A (system fonts only) |
| External icons | 0 | N/A (inline SVG) |
| External images | 0 | N/A |
| CSS frameworks | 0 | N/A |
| Copied templates | 0 | N/A |

### Verdict: ALL CLEAR

Every component used in CareerCanvas is either:
- **Original code** written for the project
- **System-provided** (fonts, emoji)
- **Open source with permissive license** (Apache 2.0, MIT)
- **Free public API** (optional, user-toggled)

No copyrighted, proprietary, or paid dependencies found.

### Recommendation
Add a `LICENSE` file to the project root with the MIT license text (matching `package.json`'s declared license).
