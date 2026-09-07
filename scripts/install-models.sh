#!/usr/bin/env bash
# Install local-AI CLI model (llama.cpp GGUF) + verify checksum
set -euo pipefail
mkdir -p models
URL='https://huggingface.co/bartowski/Meta-Llama-3.1-8B-Instruct-GGUF/resolve/main/Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf'
OUT='models/llama-3.1-8b-q4km.gguf'
echo 'Expected: ~2.3 GB download, ~8 GB RAM, CPU-only ~3-6 tok/s'
if [ ! -f "$OUT" ]; then curl -L -o "$OUT" "$URL"; fi
sha256sum "$OUT"
echo 'Compare hash with .sha256 on the HuggingFace model page before use.'
echo 'Run: llama-server -m models/llama-3.1-8b-q4km.gguf --port 8081'
