@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js nu este instalat. Instaleaza Node.js 22+ si incearca din nou.
  pause
  exit /b 1
)
where npm >nul 2>&1
if errorlevel 1 (
  echo npm nu este disponibil. Reinstaleaza Node.js 22+ si incearca din nou.
  pause
  exit /b 1
)
if not exist "node_modules" (
  echo Instalez dependentele proiectului...
  call npm install
  if errorlevel 1 (
    echo Instalarea dependentelor a esuat.
    pause
    exit /b 1
  )
)
echo Pornesc Sistem Monitorizare Urban Lentz 2 local...
echo Deschide in browser: http://localhost:5173
call npm run dev
pause
