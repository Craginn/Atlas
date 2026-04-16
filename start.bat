@echo off
echo Starting Aid Atlas on http://localhost:8080 ...
echo.

where bun >nul 2>nul
if %errorlevel%==0 (
    bun run dev
    goto :end
)

where npm >nul 2>nul
if %errorlevel%==0 (
    npm run dev
    goto :end
)

echo ERROR: Neither 'bun' nor 'npm' was found in your PATH.
echo Please install Node.js (https://nodejs.org) or Bun (https://bun.sh) first.

:end
pause
