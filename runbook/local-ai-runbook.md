# Local AI Runbook — CareerCanvas

> Default cloud model: **Gemini 3.7 Flash** (`gemini-3.7-flash`, override with
> `CC_GEMINI_MODEL`). Owner uses Gemini keys only.


Hardware detected on reference machine: AMD Ryzen 5 4600H (6C/12T), 16 GB RAM,
NVIDIA GTX 1650 4 GB + AMD iGPU. All commands below reproduced on Node 24 / Win11.
For Linux/macOS use the `.sh` variants in `scripts/`.

## 1. Recommended strategy: Hybrid (local + opt-in cloud) — YES, good choice

- Default: 100% local, offline (Transformers.js embeddings + summarizer, IndexedDB cache).
- Escalate: WebLLM (WebGPU) only when user enables Advanced AI; cloud proxy (`/api/ai-analyze`)
  only with explicit key / deployed GROQ/GEMINI key.
- Why hybrid wins here: resume data is PII. Local-first preserves privacy story;
  cloud fallback covers the 14/18 AI modes local models can't do well (cover letters, parsing,
  grammar JSON). No fallback without consent — `AiFormatter._callAI` throws a key-setup error.

## 2. Option A — Lightweight local (default, CPU, ~150–300 MB)

Models (HuggingFace via Transformers.js CDN, cached in browser):
- `Xenova/distilbart-cnn-12-6` (summarize/condense, ~300 MB)
- `Xenova/distilbert-base-uncased-finetuned-sst-2-english` (tone/sentiment, ~260 MB)
- `Xenova/all-MiniLM-L6-v2` (embeddings for JD matcher, ~90 MB)

```powershell
# no download needed — browser fetches on first use
npm run serve
# open http://localhost:8080/#/settings -> enable "Local AI"
# open DevTools > Application > IndexedDB > cc-local-ai to verify embedding cache
```

CLI sanity (embeddings path uses same code path as browser):
```powershell
npm test -- tests/unit/local-ai.test.js
```

Latency thresholds (CPU Ryzen 5 4600H):
- cosineSimilarity: <1 ms | preprocess/postprocess: <5 ms
- first embedding inference: <8 s (after download); cached: <50 ms

## 3. Option B — Advanced local LLM via WebLLM/WebGPU (~4.5 GB)

- Model: `Llama-3.1-8B-Instruct-q4f32_1-MLC` (q4f32_1 quant, fits ~4 GB VRAM)
- Requirements: Chrome/Edge 113+, WebGPU enabled, 8 GB RAM, 4 GB VRAM, 5 GB free disk.
- GTX 1650 4 GB: workable but slow (~5–12 tok/s); CPU fallback not recommended for 8B.

```powershell
# verify WebGPU
# open edge://gpu or chrome://gpu -> "WebGPU: Hardware accelerated"
npm run serve
# open http://localhost:8080 -> Settings -> enable "Advanced AI (WebGPU)"
# first load downloads ~4.5 GB to browser cache; watch #ai-download-widget
```

CLI alternative (llama.cpp, CPU) — same model family, GGUF quant:
```powershell
# ~2.3 GB download, ~8 GB RAM, no GPU required (slow: ~3-6 tok/s on 4600H)
mkdir models; cd models
curl -L -o llama-3.1-8b-q4km.gguf https://huggingface.co/bartowski/Meta-Llama-3.1-8B-Instruct-GGUF/resolve/main/Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf
certutil -hashfile llama-3.1-8b-q4km.gguf SHA256  # compare with .sha256 on HF page
# run with llama.cpp server (install from https://github.com/ggerganov/llama.cpp/releases)
llama-server -m llama-3.1-8b-q4km.gguf --port 8081
curl http://localhost:8081/completion -H "Content-Type: application/json" -d "{\"prompt\":\"Summarize: Led team of 5 engineers\",\"n_predict\":60}"
```

PowerShell script version: `scripts/install-models.ps1` (downloads + checksum + prints CLI command).
Bash version: `scripts/install-models.sh`.

## 4. Caching strategy (implemented)

- LRU in-memory session cache (50 entries): summaries, condenses, embeddings.
- IndexedDB `cc-local-ai/embeddings`: `hash(text) -> Float32Array`, survives reloads.
- WebLLM model cache: browser Cache Storage (automatic via MLC).

## 5. Sanity tests

```powershell
npm test        # 56 vitest unit tests (pre/post, cosine, toxicity, schema, import, local parser)
npm run lint    # secret scan + node --check over api/ + src/js/
npm run check   # entry-point smoke check
node scripts/audit-imports.mjs    # import/export resolution, 0 errors
node scripts/audit-contracts.mjs  # route/view/class contracts, 0 errors
```

Manual: `http://localhost:8080/tests/template-studio.test.html` (browser, 68-template render).

## 6. Offline smart import parser (no download, always available)

`src/js/utils/text-parse.js` + `src/js/modules/local-resume-parser.js`:

- Fallback chain per file type — TXT/MD/PDF: AI → local-smart → legacy;
  DOCX: AI → local-smart → HTML-structure parse; images: AI vision → on-device
  Tesseract OCR → AI-text → local-smart → legacy.
- Fuzzy headers (Levenshtein, typo-tolerant: "Experiance", "EDUCATOIN"),
  word-level spell correction (resume vocabulary, acronyms/URLs preserved),
  contact extraction (title, LinkedIn, GitHub, website, location), skills
  splitting, date-range flags. Corrections land in the reviewed sections and
  the review UI shows a green "Header typo fixed" confidence dot.
- Test: `npx vitest run tests/unit/local-parser.test.js` (18 tests).

## 7. Rollback

- Local AI: `localStorage.removeItem('cc_local_ai_enabled')`, clear IndexedDB `cc-local-ai`.
- Advanced AI: `localStorage.removeItem('cc_advanced_ai_enabled')`, clear site cache.
- Server proxy: redeploy previous Vercel deployment; remove `GROQ_API_KEY`/`GEMINI_API_KEY`.
- This branch: `git revert` the `agent:` commits listed in CHANGELOG.
