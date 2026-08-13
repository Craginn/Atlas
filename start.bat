@echo off
setlocal
set "SCRIPT_DIR=%~dp0"
if exist "%SCRIPT_DIR%node-v24\node.exe" (
    set "PATH=%SCRIPT_DIR%node-v24;%PATH%"
)
if exist "%SCRIPT_DIR%git-portable\cmd\git.exe" (
    set "PATH=%SCRIPT_DIR%git-portable\cmd;%PATH%"
)

echo Starting Aid Atlas...
echo.

where bun >nul 2>nul
if %errorlevel%==0 (
    bun run dev
    goto :end
)

where npm >nul 2>nul
if %errorlevel%==0 (
    call npm run dev
    goto :end
)

echo ERROR: Neither 'bun' nor 'npm' was found in your PATH or local folder.
echo Please install Node.js (https://nodejs.org) or Bun (https://bun.sh).

:end
pause

