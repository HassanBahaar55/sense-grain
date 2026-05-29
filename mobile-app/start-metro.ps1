# Sense Grain — Metro Starter
# Kills port 8081 if in use, then starts Metro fresh.
# Run this every time you want to start Metro.

$port = 8081
$pid8081 = (Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue).OwningProcess | Select-Object -First 1
if ($pid8081) {
    Stop-Process -Id $pid8081 -Force
    Write-Host "Killed old Metro process (PID $pid8081) on port $port" -ForegroundColor Yellow
    Start-Sleep -Seconds 1
} else {
    Write-Host "Port $port is free" -ForegroundColor Green
}

Write-Host "Starting Metro..." -ForegroundColor Cyan
Set-Location $PSScriptRoot
npx react-native start --reset-cache
