# Deploy Clasmo Diagnostics to Railway from local files (no GitHub push required).
# Run in PowerShell from anywhere:  .\scripts\deploy-railway.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

function Ensure-RailwayCli {
    if (Get-Command railway -ErrorAction SilentlyContinue) { return }
    Write-Host "Installing Railway CLI..."
    npm install -g @railway/cli
}

Ensure-RailwayCli

Write-Host "Checking Railway login..."
try {
    railway whoami
} catch {
    Write-Host "Not logged in. Opening browser login..."
    railway login
}

if (-not (Test-Path ".railway")) {
    Write-Host ""
    Write-Host "Link this folder to your Railway project (pick the WEB service, not Postgres):"
    railway link
}

$message = "CLI deploy $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
Write-Host ""
Write-Host "Uploading and deploying from $Root ..."
Write-Host "Message: $message"
Write-Host ""

railway up --detach --message $message

Write-Host ""
Write-Host "Deploy started. Watch logs with:  railway logs"
Write-Host "When finished, test:  https://www.clasmodiagnostics.com/api/health/"
