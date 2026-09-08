# Reproducible setup (Windows PowerShell)
# Usage: powershell -ExecutionPolicy Bypass -File scripts/setup.ps1
$ErrorActionPreference = 'Stop'
node --version; npm --version
npm install
Copy-Item .env.example .env.local -ErrorAction SilentlyContinue
Write-Host 'Start: npm run serve -> http://localhost:8080'
