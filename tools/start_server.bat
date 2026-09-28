@echo off
cd /d "%~dp0.."
npx http-server . -p 8080 --cors -c-1