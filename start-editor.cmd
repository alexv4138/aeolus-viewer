@echo off
cd /d "%~dp0"
start "Aeolus Editor Server" /min python editor_server.py
timeout /t 1 /nobreak >nul
start "" http://127.0.0.1:8765/frame-editor.html
