@echo off
echo ========================================================
echo   Excalidraw Local Domain Setup (http://excalidraw.local)
echo ========================================================
echo.

:: Check for Administrator permissions
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [NOTICE] Administrator privileges are required to update the hosts file.
    echo Requesting elevation...
    powershell -Command "Start-Process cmd -ArgumentList '/c `\"%~f0`\"' -Verb RunAs"
    exit /B
)

set HOSTS=C:\Windows\System32\drivers\etc\hosts

findstr /I "excalidraw.local" "%HOSTS%" >nul
if %errorlevel% neq 0 (
    echo.>> "%HOSTS%"
    echo 127.0.0.1 excalidraw.local>> "%HOSTS%"
    echo 127.0.0.1 whiteboard.local>> "%HOSTS%"
    echo [OK] Successfully mapped:
    echo        127.0.0.1  excalidraw.local
    echo        127.0.0.1  whiteboard.local
) else (
    echo [OK] excalidraw.local is already present in %HOSTS%.
)

ipconfig /flushdns >nul
echo [OK] DNS cache flushed.
echo.
echo ========================================================
echo Complete! You can now open:
echo   http://excalidraw.local
echo ========================================================
echo.
pause
