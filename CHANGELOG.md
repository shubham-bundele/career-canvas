# Changelog

## v1.1.0-rc1 (2026-09-07, branch agent/discovery-20260907-184158)
- fix: `api/ai-analyze.js` — provider routing (Groq vs Gemini), model `gemini-3.7-flash` (default, `CC_GEMINI_MODEL` override), 30s timeout, 30/min rate-limit, added `analyze/resume-score/keyword-optimization/ats-fix` modes.
- fix: `AiFormatter.getSystemPrompts` + `sanitizeOutput/containsToxicity` (unbreaks WebLLM path).
- feat: `LocalAI` LRU-50 session cache + IndexedDB `cc-local-ai` embedding cache + pure `preprocess/postprocess`.
- fix: `AdvancedLocalAI` WebGPU guard + requirements helper.
- fix: `isValidPhone` accepted formats (regression-tested).
- test: 24 vitest unit tests (`tests/unit/`); ci: `.github/workflows/ci.yml`; scripts `lint/smoke/setup/test/install-models`.
- docs: `audit/findings-report.md`, `audit/summary.json`, `runbook/local-ai-runbook.md`.

Rollback: `git revert` these commits or redeploy prior Vercel build; clear `cc_local_ai_enabled` /
`cc_advanced_ai_enabled` + IndexedDB `cc-local-ai`.
