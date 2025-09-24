<#
Start-Dev.ps1

Usage: In PowerShell (from repo root) run:
  powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-dev.ps1

What it does:
- Starts the proxy ("npm run proxy") as a background job named ProxyJob if it's not already healthy.
- Polls http://localhost:3000/health until it responds (configurable attempts/timeouts).
- Once healthy, starts the frontend http-server in the foreground (so you can see logs).

This file intentionally does not create or modify other files.
#>

param(
  [int]$HealthMaxAttempts = 30,
  [int]$HealthWaitSeconds = 1,
  [string]$HealthUrl = 'http://localhost:3000/health',
  [int]$FrontendPort = 5500
)

try {
  # Resolve project root (assume scripts folder is inside repo)
  $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
  $projectRoot = Resolve-Path (Join-Path $scriptDir '..')
  Set-Location $projectRoot
} catch {
  Write-Error "Failed to determine project root: $_"
  exit 1
}

function Test-ProxyHealth {
  param([string]$url)
  try {
    $r = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 2
    return $r.StatusCode -eq 200
  } catch {
    return $false
  }
}

Write-Host "Project root: $projectRoot"

# If proxy already healthy, skip starting job
if (Test-ProxyHealth -url $HealthUrl) {
  Write-Host "Proxy already healthy at $HealthUrl"
} else {
  # Remove any old job with same name
  $old = Get-Job -Name ProxyJob -ErrorAction SilentlyContinue
  if ($old) {
    Write-Host "Removing existing ProxyJob..."
    Remove-Job -Name ProxyJob -Force -ErrorAction SilentlyContinue
  }

  Write-Host "Starting proxy as background job (npm run proxy)..."
  Start-Job -Name ProxyJob -ScriptBlock {
    param($cwd)
    Set-Location $cwd
    # Run proxy; keep stdout/stderr available via Receive-Job
    npm run proxy 2>&1 | ForEach-Object { $_ }
  } -ArgumentList $projectRoot.Path | Out-Null

  # Wait for health
  $attempt = 0
  while ($attempt -lt $HealthMaxAttempts) {
    if (Test-ProxyHealth -url $HealthUrl) {
      Write-Host "\nProxy healthy after $attempt attempt(s)."
      break
    }
    Start-Sleep -Seconds $HealthWaitSeconds
    Write-Host -NoNewline '.'
    $attempt++
  }

  if ($attempt -ge $HealthMaxAttempts) {
    Write-Error "\nProxy did not become healthy after $HealthMaxAttempts attempts."
    Write-Host "Check proxy logs with: Get-Job -Name ProxyJob | Receive-Job -Keep"
    exit 1
  }
}

# Start frontend server in foreground so user can see logs (use npx http-server)
Write-Host "Starting frontend http-server on port $FrontendPort (foreground). Press Ctrl+C to stop."

# Use npx to avoid requiring global http-server; if you prefer npm start, change below to 'npm start'
$npxCmd = 'npx'
& $npxCmd http-server . -p $FrontendPort -c-1

# When http-server exits (Ctrl+C), optionally stop the proxy job
Write-Host "Frontend stopped. Proxy job (ProxyJob) continues running in background."
Write-Host "To view proxy logs: Get-Job -Name ProxyJob | Receive-Job -Keep"
Write-Host "To stop proxy job: Stop-Job -Name ProxyJob; Remove-Job -Name ProxyJob"
