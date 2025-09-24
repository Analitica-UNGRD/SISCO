# Script para iniciar todos los servidores necesarios

# --- Comprobación rápida: node y npm disponibles en PATH ---
# Detecta si 'node' y 'npm' están disponibles y da instrucciones claras al usuario.
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
$npmCmd  = Get-Command npm -ErrorAction SilentlyContinue
if (-not $nodeCmd -or -not $npmCmd) {
    Write-Host "ERROR: Node.js o npm no están disponibles en esta sesión de PowerShell." -ForegroundColor Red
    Write-Host "Instala Node.js LTS desde https://nodejs.org/ o usa nvm-windows: https://github.com/coreybutler/nvm-windows" -ForegroundColor Yellow
    Write-Host "Después de instalar, cierra y vuelve a abrir PowerShell. Comprueba con: node -v ; npm -v" -ForegroundColor Yellow
    exit 1
}

# Mensaje inicial: indica al desarrollador lo que va a ocurrir.
Write-Host "Iniciando servidores para Seguimiento Contratistas" -ForegroundColor Cyan

# Iniciar servidor proxy (en una nueva ventana de PowerShell)
Write-Host "Iniciando servidor proxy en puerto 3000..." -ForegroundColor Green
Start-Process -FilePath powershell -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-Command','npm run proxy' -WorkingDirectory $PWD

# Esperar a que el proxy esté listo
Write-Host "Esperando a que el servidor proxy esté listo..." -ForegroundColor Yellow
$proxyReady = $false
$attempts = 0
$maxAttempts = 30

while (-not $proxyReady -and $attempts -lt $maxAttempts) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -TimeoutSec 1
        if ($response.StatusCode -eq 200) {
            $proxyReady = $true
            Write-Host "¡Servidor proxy listo!" -ForegroundColor Green
        }
    } catch {
        Write-Host "." -NoNewline
        Start-Sleep -Seconds 1
        $attempts++
    }
}

if (-not $proxyReady) {
    Write-Host "No se pudo iniciar el servidor proxy después de $maxAttempts intentos" -ForegroundColor Red
    exit 1
}

# Iniciar servidor web (en una nueva ventana de PowerShell)
Write-Host "Iniciando servidor web en puerto 5500..." -ForegroundColor Green
Start-Process -FilePath powershell -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-Command','npx http-server . -p 5500 -c-1' -WorkingDirectory $PWD

# Esperar un momento
Write-Host "Esperando a que el servidor web en 5500 esté listo..." -ForegroundColor Yellow
$webReady = $false
$attempts = 0
$maxAttempts = 30
# Esperar a que el servidor web en 5500 esté listo (comprobación TCP, más fiable que HTTP en entornos con IPv6)
Write-Host "Esperando a que el servidor web en 5500 esté listo (comprobación TCP)..." -ForegroundColor Yellow
$webReady = $false
$attempts = 0
$maxAttempts = 30
while (-not $webReady -and $attempts -lt $maxAttempts) {
    try {
        $check = Test-NetConnection -ComputerName 'localhost' -Port 5500 -WarningAction SilentlyContinue
        if ($check -and $check.TcpTestSucceeded) {
            $webReady = $true
            Write-Host "Servidor web listo en 5500" -ForegroundColor Green
            break
        }
    } catch {
        # ignored - seguir intentando
    }
    Write-Host "." -NoNewline
    Start-Sleep -Seconds 1
    $attempts++
}

if (-not $webReady) {
    Write-Host "No se pudo iniciar el servidor web en 5500 después de $maxAttempts intentos" -ForegroundColor Red
    Write-Host "Comprueba que tienes 'npx http-server' disponible y que el puerto 5500 no esté en uso." -ForegroundColor Red
    exit 1
}

# Abrir el navegador
Write-Host "Abriendo navegador en http://localhost:5500/src/pages/dashboard.html" -ForegroundColor Cyan
Start-Process "http://localhost:5500/src/pages/dashboard.html"

Write-Host "`nTodos los servidores iniciados correctamente." -ForegroundColor Green
Write-Host "- Servidor proxy: http://localhost:3000" -ForegroundColor Yellow
Write-Host "- Servidor web: http://localhost:5500" -ForegroundColor Yellow
Write-Host "`nPara detener los servidores, cierra las ventanas de PowerShell o presiona CTRL+C en cada una." -ForegroundColor Magenta
