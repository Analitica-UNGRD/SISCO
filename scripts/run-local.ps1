[CmdletBinding()]
param(
    [switch]$SkipInstall,
    [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'

function Write-Section {
    param([string]$Message)
    Write-Host "`n=== $Message ===" -ForegroundColor Cyan
}

$root = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $root

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw 'npm no está disponible en el PATH. Instálalo desde https://nodejs.org/ y vuelve a intentarlo.'
}

$npmCmd = (Get-Command npm -CommandType Application | Select-Object -First 1).Source
if (-not $npmCmd) {
    throw 'No se pudo resolver la ruta de npm (se esperaba npm.exe en el PATH).'
}

if (-not $SkipInstall) {
    Write-Section 'Instalando dependencias (npm install)'
    npm install
} else {
    Write-Host 'Saltando instalación de dependencias.' -ForegroundColor Yellow
}

Write-Section 'Iniciando servidores locales (npm run start)'
Write-Host 'Se ejecutará el proxy API y un servidor estático en http://localhost:5500 .' -ForegroundColor Green
Write-Host 'Presiona Ctrl+C para detener ambos procesos.' -ForegroundColor Green
if (-not $NoBrowser) {
    Write-Host 'El navegador se abrirá automáticamente en unos segundos (usa -NoBrowser para evitarlo).' -ForegroundColor Green
}

$nodeJsBin = Split-Path -Parent $npmCmd
$env:Path = "$nodeJsBin;$env:Path"

if (-not $NoBrowser) {
    Start-Job -ScriptBlock {
        Start-Sleep -Seconds 5
        Start-Process 'http://localhost:5500'
    } | Out-Null
}

if (-not (Test-Path $npmCmd)) {
    throw "No se encontró el ejecutable de npm en '$npmCmd'"
}

& $npmCmd run start
if ($LASTEXITCODE -ne 0) {
    throw "npm run start terminó con código $LASTEXITCODE"
}
