@echo off
setlocal
cd /d "%~dp0"

set "STATIC_DIR=%~dp0..\wind-turbine-monitor-static"

where git >nul 2>nul || (echo Git lipseste.& pause & exit /b 1)
where node >nul 2>nul || (echo Node.js lipseste. Instaleaza Node.js 22 sau mai nou.& pause & exit /b 1)

if not exist "%STATIC_DIR%\.git" (
  echo Se creeaza copia ramurii demo-static...
  git fetch github demo-static || (echo Nu s-a putut citi ramura demo-static.& pause & exit /b 1)
  git worktree add "%STATIC_DIR%" demo-static || (echo Nu s-a putut crea copia statica.& pause & exit /b 1)
)

echo Se sincronizeaza stilurile, datele demonstrative si fisierele video...
copy /Y "app\globals.css" "%STATIC_DIR%\app\globals.css" >nul
copy /Y "app\fleet-data.ts" "%STATIC_DIR%\app\fleet-data.ts" >nul
robocopy "public" "%STATIC_DIR%\public" /E /XO /NFL /NDL /NJH /NJS
if errorlevel 8 (echo Copierea fisierelor publice a esuat.& pause & exit /b 1)

pushd "%STATIC_DIR%"
if not exist node_modules call npm install

echo Se reconstruieste folderul pentru FTP...
call npm run build

if exist "dist\client\turbina\index.html" (
  robocopy "dist\client\turbina" "turbina" /E /XO /NFL /NDL /NJH /NJS
) else if exist "dist\client\index.html" (
  robocopy "dist\client" "turbina" /E /XO /NFL /NDL /NJH /NJS
) else (
  echo Exportul static nu a produs index.html.
  popd
  pause
  exit /b 1
)
if errorlevel 8 (echo Copierea exportului a esuat.& popd & pause & exit /b 1)

git add app\globals.css app\fleet-data.ts public turbina
git diff --cached --quiet || git commit -m "Sync static FTP export"
git push github demo-static
popd

echo.
echo Gata. Urca tot continutul folderului "%STATIC_DIR%\turbina" pe FTP, in /turbina/.
pause
