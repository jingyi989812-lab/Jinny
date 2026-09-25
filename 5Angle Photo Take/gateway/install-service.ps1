# UR Klinik Photo Flow — install the gateway as a Windows service.
#
# Run from an elevated PowerShell, in the gateway folder.
# Needs: Node.js 20 LTS, and nssm.exe (https://nssm.cc) on PATH or beside this script.
#
#   .\install-service.ps1 -NasShare "\\SYNOLOGY-NAS\UR-Klinik-Photos" `
#                         -ServiceAccount "URKLINIK\svc_photoflow"

param(
  [Parameter(Mandatory = $true)][string]$NasShare,
  [string]$ServiceName    = "URKlinikPhotoFlow",
  [string]$ServiceAccount = "",
  [int]   $Port           = 8080
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Node.js is not installed or not on PATH." }
$nssm = (Get-Command nssm -ErrorAction SilentlyContinue).Source
if (-not $nssm) { $nssm = Join-Path $root "nssm.exe" }
if (-not (Test-Path $nssm)) { throw "nssm.exe not found. Download from https://nssm.cc and place it beside this script." }

Write-Host "Installing dependencies..." -ForegroundColor Cyan
Push-Location $root; & npm install --omit=dev; Pop-Location

if (Get-Service $ServiceName -ErrorAction SilentlyContinue) {
  Write-Host "Removing existing service..." -ForegroundColor Yellow
  & $nssm stop   $ServiceName confirm | Out-Null
  & $nssm remove $ServiceName confirm | Out-Null
}

$nodeExe = (Get-Command node).Source
& $nssm install $ServiceName $nodeExe "server.js"
& $nssm set $ServiceName AppDirectory  $root
& $nssm set $ServiceName DisplayName   "UR Klinik Photo Flow gateway"
& $nssm set $ServiceName Description   "Writes treatment photos into the correct Synology customer folder."
& $nssm set $ServiceName Start         SERVICE_AUTO_START
& $nssm set $ServiceName AppStdout     (Join-Path $root "logs\out.log")
& $nssm set $ServiceName AppStderr     (Join-Path $root "logs\err.log")
& $nssm set $ServiceName AppRotateFiles 1

$appKey = (Get-Content (Join-Path $root ".env") | Where-Object { $_ -match "^APP_KEY=" }) -replace "^APP_KEY=", ""
if (-not $appKey -or $appKey -eq "replace-me") { throw "Set a real APP_KEY in .env first." }

& $nssm set $ServiceName AppEnvironmentExtra `
    "DATA_DIR=$NasShare" "APP_KEY=$appKey" "PORT=$Port" "NODE_ENV=production"

# The service must run as an account the Synology share trusts.
# LocalSystem authenticates to SMB as the COMPUTER account, which usually has no
# rights on the NAS — so a real account is almost always required here.
if ($ServiceAccount) {
  $cred = Get-Credential -UserName $ServiceAccount -Message "Password for $ServiceAccount"
  & $nssm set $ServiceName ObjectName $ServiceAccount $cred.GetNetworkCredential().Password
} else {
  Write-Warning "No -ServiceAccount given: running as LocalSystem. This will fail to write to the NAS unless the computer account has share rights."
}

New-Item -ItemType Directory -Force -Path (Join-Path $root "logs") | Out-Null
& $nssm start $ServiceName

Write-Host ""
Write-Host "Service '$ServiceName' installed and started." -ForegroundColor Green
Write-Host "Check: http://localhost:$Port/api/health" -ForegroundColor Green
