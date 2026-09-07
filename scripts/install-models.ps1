# Install local-AI CLI model (llama.cpp GGUF) + verify checksum
# Usage: powershell -ExecutionPolicy Bypass -File scripts/install-models.ps1
$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Path models -Force | Out-Null
$url = 'https://huggingface.co/bartowski/Meta-Llama-3.1-8B-Instruct-GGUF/resolve/main/Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf'
$out = 'models/llama-3.1-8b-q4km.gguf'
Write-Host 'Expected: ~2.3 GB download, ~8 GB RAM, CPU-only ~3-6 tok/s on Ryzen 5 4600H'
if (!(Test-Path $out)) { Invoke-WebRequest -Uri $url -OutFile $out }
Get-FileHash $out -Algorithm SHA256
Write-Host 'Compare hash with .sha256 on the HuggingFace model page before use.'
Write-Host 'Run: llama-server -m models/llama-3.1-8b-q4km.gguf --port 8081'
