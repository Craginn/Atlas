@echo off
setlocal enabledelayedexpansion

:: Ensure we are in the script's directory
cd /d "%~dp0"

echo Starting Aid Atlas...
echo.

:: Path definitions
set "NODE_EXE=%~dp0node\node.exe"
set "NPM_CLI=%~dp0node\node_modules\npm\bin\npm-cli.js"

:: Detect runtime
set "RUNNER="

:: 1. Check for Bun
where bun >nul 2>nul
if %errorlevel%==0 (
    set "RUNNER=bun"
    goto :start_app
)

:: 2. Check for portable Node.js
if exist "%NODE_EXE%" (
    echo Found portable Node.js...
    set "RUNNER=portable"
    goto :start_app
)

:: 3. Check for system npm
where npm >nul 2>nul
if %errorlevel%==0 (
    set "RUNNER=system"
    goto :start_app
)

echo.
echo ERROR: Neither 'bun' nor 'npm' was found.
echo Please install Node.js or Bun, or provide a portable 'node' folder.
echo.
goto :end

:start_app
if "%RUNNER%"=="bun" (
    echo Using Bun...
    if not exist "node_modules" (
        echo Installing dependencies...
        bun install
    )
    echo Starting server on http://localhost:5173 ...
    bun run dev
) else if "%RUNNER%"=="portable" (
    echo Using portable npm...
    
    :: Add portable node to PATH so post-install scripts work
    set "PATH=%~dp0node;%PATH%"
    
    if not exist "node_modules" (
        echo Installing dependencies...
        "%NODE_EXE%" "%NPM_CLI%" install --legacy-peer-deps
    )
    
    :: Add local node_modules\.bin to PATH so 'vite' and other binaries are found
    set "PATH=%~dp0node;%~dp0node_modules\.bin;%PATH%"
    
    echo Starting server on http://localhost:5173 ...
    "%NODE_EXE%" "%NPM_CLI%" run dev
) else if "%RUNNER%"=="system" (
    echo Using system npm...
    if not exist "node_modules" (
        echo Installing dependencies...
        npm install --legacy-peer-deps
    )
    echo Starting server on http://localhost:5173 ...
    npm run dev
)

:end
pause
