# BackOffice Agent — Quick Start (Windows)
# Run from the backoffice-agent folder: .\scripts\setup.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "Installing dependencies..." -ForegroundColor Cyan
npm install --no-fund --no-audit
if ($LASTEXITCODE -ne 0) { throw "npm install failed" }

Write-Host "Setting up database..." -ForegroundColor Cyan
npm run db:push
npm run db:seed

# Extract business ID from seed output and write to .env
$seedOutput = npm run db:seed 2>&1 | Out-String
if ($seedOutput -match 'DEFAULT_BUSINESS_ID=(\S+)') {
    $bizId = $Matches[1]
    $envContent = Get-Content .env -Raw
    if ($envContent -notmatch 'DEFAULT_BUSINESS_ID=') {
        Add-Content .env "`nDEFAULT_BUSINESS_ID=$bizId"
    } else {
        (Get-Content .env) -replace 'DEFAULT_BUSINESS_ID=.*', "DEFAULT_BUSINESS_ID=$bizId" | Set-Content .env
    }
    Write-Host "Set DEFAULT_BUSINESS_ID=$bizId" -ForegroundColor Green
}

Write-Host "`nReady! Start the dev server:" -ForegroundColor Green
Write-Host "  npm run dev" -ForegroundColor Yellow
Write-Host "  Open http://localhost:3000/dashboard" -ForegroundColor Yellow
