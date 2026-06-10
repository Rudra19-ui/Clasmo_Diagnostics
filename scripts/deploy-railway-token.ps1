# Deploy to Railway using a project token (no GitHub, no browser login).
# Example:
#   .\scripts\deploy-railway-token.ps1 `
#     -Token "your-project-token" `
#     -ProjectId "your-project-id" `
#     -Environment "production" `
#     -Service "Clasmo_Diagnostics"

param(
    [Parameter(Mandatory = $true)]
    [string]$Token,

    [Parameter(Mandatory = $true)]
    [string]$ProjectId,

    [Parameter(Mandatory = $true)]
    [string]$Environment,

    [Parameter(Mandatory = $true)]
    [string]$Service
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

if (-not (Get-Command railway -ErrorAction SilentlyContinue)) {
    Write-Host "Installing Railway CLI..."
    npm install -g @railway/cli
}

# Token MUST stay in quotes when assigned.
$env:RAILWAY_TOKEN = $Token

Write-Host "Deploying from $Root"
Write-Host "Project: $ProjectId"
Write-Host "Environment: $Environment"
Write-Host "Service: $Service"

$message = "CLI token deploy $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
railway up `
    --project $ProjectId `
    --environment $Environment `
    --service $Service `
    --detach `
    --message $message

Write-Host ""
Write-Host "Deploy started."
Write-Host "Watch logs:  railway logs --project $ProjectId --environment $Environment --service $Service"
Write-Host "Verify:      https://www.clasmodiagnostics.com/api/health/"
