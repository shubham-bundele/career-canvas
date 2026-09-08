# Reproducible tests
# Usage: powershell -ExecutionPolicy Bypass -File scripts/test.ps1
$ErrorActionPreference = 'Stop'
npm test; npm run lint; npm run check
