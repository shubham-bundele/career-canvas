# CareerCanvas — Audit Findings Report
Branch: `agent/discovery-20260907-184158` | Date: 2026-09-07 | Mode: Autonomous Continuous

## 1. Repository summary
- **Type:** static vanilla-JS SPA (ES modules, no bundler/framework). Entry `index.html` → `src/js/app.js`.
- **Languages:** JavaScript (~74 files), CSS (33 files), 3 Vercel serverless functions (`api/`).
- **Storage:** IndexedDB (`core/db.js`) + localStorage prefs; optional Supabase auth; no app DB/migrations.
- **AI:** cloud via `/api/ai-analyze` (Gemini/Groq) + direct-key fallback; local via Transformers.js
  (`local-ai.js`) + WebLLM/WebGPU Llama-3.1-8B (`advanced-local-ai.js`).
- **Tests:** 28 browser `.html` integration tests + NEW 24 vitest unit tests (`tests/unit/`).
- **CI:** NONE before this audit → added `.github/workflows/ci.yml` (node20, `npm test` + `lint`).
- **Remote:** `origin https://github.com/shubham-bundele/career-canvas.git`, branch `main` was clean.

## 2. Run commands
```powershell
npm install
npm run serve            # http://localhost:8080 (no auto-open; use npm start to auto-open)
npm test; npm run lint; npm run check
# browser suite: http://localhost:8080/tests/template-studio.test.html
```
Env: copy `.env.example` → `.env.local`; server needs `GEMINI_API_KEY` or `GROQ_API_KEY`;
browser-only AI needs `cc_ai_api_key` in localStorage; Supabase vars only for auth.

## 3. Failing tests and stack traces
- BEFORE: no runnable unit suite (`vitest` installed but zero `*.test.js`; `test.js` at root is a
  broken Node script — backslash-continuation string, imports browser-dependent module).
- DURING: new `tests/unit/core-utils.test.js > validates phone loosely` failed —
  `isValidPhone('+1 (555) 123-4567')` returned false (regex only allowed 2 digit groups).
  **Fixed** in `src/js/utils/sanitize.js` (digit-count 7–15 + permissive charset).
- AFTER: `npm test` 24/24 pass; `npm run lint` OK (77 files); `npm run check` OK.
- `npm audit`: 0 vulns (only devDeps typescript+vitest).

## 4. Vulnerabilities and remediation
| # | Issue | Severity | Action |
|---|-------|----------|--------|
| V1 | `api/ai-analyze.js`: Groq `gsk_` key was routable to Google endpoint (key leak to wrong vendor) | High | FIXED: route by prefix; Groq→Groq, else Gemini |
| V2 | Model id pinned to env (`CC_GEMINI_MODEL`, default `gemini-3.7-flash` per owner — Gemini keys only) | Info | KEPT `gemini-3.7-flash` as default; override via env |
| V3 | `TIMEOUT_MS` defined but never enforced; hanging serverless calls | Med | FIXED: AbortController 30 s → 504 |
| V4 | No rate limiting on keyless proxy (abuse) | Med | FIXED: 30 req/min in-memory guard |
| V5 | `sanitize.js isValidPhone` rejected valid numbers (UX/data-loss risk) | Low | FIXED + regression test |
| V6 | Missing `AiFormatter.getSystemPrompts` crashed `AdvancedLocalAI.process()` | High | FIXED: shared prompt table added |
| V7 | No secret lint / CI | Med | FIXED: `scripts/lint.mjs` + CI workflow |
| V8 | `stripHTML/decodeHTML` assume `document` (Node crash) | Low | Documented: DOM-only; unit tests avoid that path |
| - | `npm audit` | — | 0 high/critical; no action |

No secrets found in repo (lint secret-scan clean). No exfiltration performed.

## 5. Architecture & feature audit (condensed)
Core (db/router/events/state/schema/template-engine/theme-engine/migration): **OK**.
Editor, dashboard, import/export (PDF/JSON/MD/HTML/TXT), templates (68), 22 studios/tools: **OK**
(rule-based paths work offline; verified by code + browser test design).
AI 18 features: cloud modes **Needs Fix → Fixed** (added `analyze/resume-score/keyword-optimization/ats-fix`
to proxy; fixed provider routing); local summarize/condense/tone/embeddings **OK** (+LRU+IDB cache added);
WebLLM advanced **Risk** (4.5 GB, WebGPU-only, slow on GTX 1650 — keep opt-in).
Auth (Supabase): **OK / Risk** — optional; service-role key server-only (correct).
Missing: automated E2E (only manual `.html`), perf/memory profiling harness, toxicity gate
→ **added** `sanitizeOutput/containsToxicity` + tests; E2E still manual (backlog).

## 6. Prioritized backlog
| ID | Title | Severity | Est. h | Acceptance criteria |
|----|-------|----------|--------|---------------------|
| B1 | E2E harness (Playwright: dashboard→editor→export) | High | 8 | `npm run e2e` green on 3 flows |
| B2 | Remove/fix root `test.js`, `fix.js`, `patch.cjs` scratch files | Med | 2 | deleted or moved to `scripts/archive/` |
| B3 | Perf profile editor (3.7k lines) + virtualize template gallery | Med | 6 | p95 render <1 s, no leak over 50 nav cycles |
| B4 | Proxy per-IP rate limit via Vercel KV (current is in-memory) | Med | 4 | abuse test 100 req → 429s, legit unaffected |
| B5 | Node-safe `stripHTML` (fallback without `document`) | Low | 2 | unit test passes in Node |
| B6 | Service-worker version bump + offline test | Low | 3 | offline load passes |
| B7 | Quantized ONNX MiniLM CLI eval for JD matcher | Low | 5 | latency/accuracy table in runbook |

**Estimated total: ~30 h over ~2 weeks** (B1–B4 week 1, B5–B7 week 2). This audit+fixes: ~6 h.

## 7. AI integration recommendation (hybrid: YES — good choice)
Hybrid (local default + opt-in cloud) is the right call for a privacy-first resume app:
PII stays on-device; cloud only on consent for modes local can't do. Details + exact
download/quant/CLI/browser/caching/sanity commands: `docs/runbook/local-ai-runbook.md`
and `scripts/install-models.{ps1,sh}`. Large-download notice: WebLLM 4.5 GB (~10–30 min,
8 GB RAM/4 GB VRAM); GGUF CLI 2.3 GB (~5–15 min, 8 GB RAM). No download was performed
in this audit (browser-cache only); nothing >200 MB fetched.

## 8. Release candidate
RC `v1.1.0-rc1` = this branch HEAD. Rollback: `git revert` the `agent:` commits or redeploy
prior Vercel deployment; `localStorage` + IndexedDB `cc-local-ai` clear per docs/runbook. See CHANGELOG.
