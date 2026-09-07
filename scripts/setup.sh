#!/usr/bin/env bash
set -euo pipefail
node --version; npm --version
npm install
cp -n .env.example .env.local || true
echo 'Start: npm run serve -> http://localhost:8080'
