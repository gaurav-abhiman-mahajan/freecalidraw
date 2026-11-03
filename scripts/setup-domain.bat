@echo off
:: Self-elevating batch script to add excalidraw.local to hosts file

>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"
if '%errorlevel%' NEQ '0' (
    echo Requesting administrative privileges...
    powershell -Command "Start-Process cmd -ArgumentList '/c `\"%~f0`\"' -Verb RunAs"
    exit /B
)

set HOSTS_FILE=%WINDIR%\System32\drivers\etc\hosts

findstr /I "excalidraw.local" "%HOSTS_FILE%" >nul
if %errorlevel% neq 0 (
    echo. >> "%HOSTS_FILE%"
    echo 127.0.0.1 excalidraw.local >> "%HOSTS_FILE%"
    echo 127.0.0.1 whiteboard.local >> "%HOSTS_FILE%"
    echo [SUCCESS] Added excalidraw.local and whiteboard.local to %HOSTS_FILE%
) else (
    echo [INFO] excalidraw.local already exists in %HOSTS_FILE%
)

ipconfig /flushdns >nul
echo [SUCCESS] Flushed DNS resolver cache.
echo.
echo =======================================================
echo You can now access Excalidraw directly in your browser:
echo   http://excalidraw.local
echo   http://whiteboard.local
echo =======================================================
echo.
pause
