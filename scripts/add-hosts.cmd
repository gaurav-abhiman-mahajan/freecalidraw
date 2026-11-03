@echo off
findstr /I "excalidraw.local" "C:\Windows\System32\drivers\etc\hosts" >nul
if %errorlevel% neq 0 (
    echo.>> "C:\Windows\System32\drivers\etc\hosts"
    echo 127.0.0.1 excalidraw.local>> "C:\Windows\System32\drivers\etc\hosts"
    echo 127.0.0.1 whiteboard.local>> "C:\Windows\System32\drivers\etc\hosts"
    ipconfig /flushdns >nul
)
