@echo off
cd /d "%~dp0"
start "Aeolus Editor Server" /min python -m http.server 8765
timeout /t 1 /nobreak >nul
start "" http://127.0.0.1:8765/frame-editor.html
