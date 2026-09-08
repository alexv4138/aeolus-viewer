@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "STATIC_DIR=%~dp0..\wind-turbine-monitor-static"
set "STAGE_DIR=%STATIC_DIR%\dist\static-export-stage"

where git >nul 2>nul || (echo Git lipseste.& pause & exit /b 1)
where node >nul 2>nul || (echo Node.js lipseste. Instaleaza Node.js 22 sau mai nou.& pause & exit /b 1)

if not exist "%STATIC_DIR%\.git" (
  echo Se creeaza copia ramurii demo-static...
  git fetch github demo-static || (echo Nu s-a putut citi ramura demo-static.& pause & exit /b 1)
  git worktree add "%STATIC_DIR%" demo-static || (echo Nu s-a putut crea copia statica.& pause & exit /b 1)
)

echo Se sincronizeaza continutul aplicatiei catre exportul static...
robocopy "app" "%STATIC_DIR%\app" /E /MIR /NFL /NDL /NJH /NJS
if errorlevel 8 (echo Copierea aplicatiei a esuat.& pause & exit /b 1)
robocopy "components" "%STATIC_DIR%\components" /E /MIR /NFL /NDL /NJH /NJS
if errorlevel 8 (echo Copierea componentelor a esuat.& pause & exit /b 1)
robocopy "public" "%STATIC_DIR%\public" /E /MIR /NFL /NDL /NJH /NJS
if errorlevel 8 (echo Copierea fisierelor publice a esuat.& pause & exit /b 1)
copy /Y "package.json" "%STATIC_DIR%\package.json" >nul
copy /Y "package-lock.json" "%STATIC_DIR%\package-lock.json" >nul
copy /Y "tsconfig.json" "%STATIC_DIR%\tsconfig.json" >nul

echo Se publica sursa principala pe GitHub...
git add app components public package.json package-lock.json tsconfig.json README.md sincronizeaza-static.bat
git diff --cached --quiet || git commit -m "Update turbine content"
git push github HEAD:main || (echo Push-ul pentru main a esuat.& pause & exit /b 1)

pushd "%STATIC_DIR%"
if not exist node_modules call npm install

echo Se reconstruieste pagina statica pentru FTP...
call npm run build || (popd & pause & exit /b 1)
if not exist "dist\client\index.html" (
  echo Exportul static nu a produs index.html.
  popd
  pause
  exit /b 1
)

rem Copiaza pagina la radacina /turbina si resursele cu prefixul /turbina/_next.
robocopy "dist\client" "%STAGE_DIR%" /E /MIR /XD turbina .vite /NFL /NDL /NJH /NJS
if errorlevel 8 (echo Pregatirea exportului a esuat.& popd & pause & exit /b 1)
robocopy "dist\client\turbina\_next" "%STAGE_DIR%\_next" /E /MIR /NFL /NDL /NJH /NJS
if errorlevel 8 (echo Pregatirea resurselor a esuat.& popd & pause & exit /b 1)
robocopy "%STAGE_DIR%" "turbina" /E /MIR /NFL /NDL /NJH /NJS
if errorlevel 8 (echo Copierea exportului a esuat.& popd & pause & exit /b 1)

git add app components public package.json package-lock.json tsconfig.json turbina README.md sincronizeaza-static.bat
git diff --cached --quiet || git commit -m "Sync static FTP export"
git push github demo-static || (popd & pause & exit /b 1)
popd

echo.
echo Gata. main si demo-static au fost publicate.
echo Urca tot continutul folderului "%STATIC_DIR%\turbina" pe FTP, in /turbina/.
pause
