@echo off
cd /d "d:\Projects\experiment\Career Canvas"
start "" cmd /c "npx http-server . -p 8080 --cors -c-1"
timeout /t 3 /nobreak >NUL
echo Opening browser...
start "" "http://localhost:8080"