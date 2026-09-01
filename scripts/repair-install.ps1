# Repair corrupted node_modules on Windows
# Usage: .\scripts\repair-install.ps1
# Stop `npm run dev` and other Node processes first.

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "Stopping Node processes..." -ForegroundColor Cyan
taskkill /F /IM node.exe 2>$null | Out-Null
Start-Sleep -Seconds 2

Write-Host "Removing .next and node_modules..." -ForegroundColor Cyan
if (Test-Path .next) { Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue }
if (Test-Path node_modules) {
  # Fallback for locked files on Windows
  cmd /c "rmdir /s /q node_modules" 2>$null | Out-Null
  if (Test-Path node_modules) {
    Write-Host "Could not delete node_modules — close all terminals/dev servers and retry." -ForegroundColor Red
    exit 1
  }
}

Write-Host "Installing dependencies..." -ForegroundColor Cyan
npm install --no-fund --no-audit
if ($LASTEXITCODE -ne 0) { throw "npm install failed" }

Write-Host "Verifying OpenTelemetry package..." -ForegroundColor Cyan
$otel = "node_modules\@opentelemetry\api\build\esm\index.js"
if (-not (Test-Path $otel)) {
  npm install @opentelemetry/api --no-fund --no-audit
  if (-not (Test-Path $otel)) { throw "OpenTelemetry package still missing after reinstall" }
}

Write-Host "Running build..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { throw "Build failed" }

Write-Host "`nRepair complete. Run: npm run dev" -ForegroundColor Green
