# Run in an elevated PowerShell terminal (Run as Administrator)
$hostsPath = "$env:windir\System32\drivers\etc\hosts"
$domain1 = "127.0.0.1 excalidraw.local"
$domain2 = "127.0.0.1 whiteboard.local"

$content = Get-Content $hostsPath -Raw
if ($content -notmatch "excalidraw\.local") {
    Add-Content -Path $hostsPath -Value "`n$domain1`n$domain2"
    Write-Host "[SUCCESS] Added excalidraw.local and whiteboard.local to $hostsPath" -ForegroundColor Green
} else {
    Write-Host "[INFO] excalidraw.local is already mapped in $hostsPath" -ForegroundColor Yellow
}

ipconfig /flushdns | Out-Null
Write-Host "[SUCCESS] DNS cache flushed." -ForegroundColor Green
Write-Host "Access Excalidraw at: http://excalidraw.local" -ForegroundColor Cyan
