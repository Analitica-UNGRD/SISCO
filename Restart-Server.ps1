/* Restart-Server.ps1
   Utilidad para detener procesos Node.js en ejecución y arrancar el proxy
   localmente usando `server.js`. Este script está pensado para desarrollo y
   asumirá que `node` está disponible en PATH.

   Comportamiento:
   - Intenta detener procesos node existentes (fuerza el cierre).
   - Arranca `node server.js` en el directorio actual en una nueva ventana.

   Notas de seguridad y buenas prácticas:
   - No usar en producción sin revisar qué procesos se detendrán.
   - En Windows, detener procesos por nombre puede afectar a otras apps.
*/

Write-Host "Deteniendo servidores existentes..." -ForegroundColor Yellow
try {
    Get-Process -Name node -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue }
    Start-Sleep -Seconds 1
} catch {
    Write-Host "No se encontraron procesos de Node.js para detener" -ForegroundColor Gray
}

# Iniciar el servidor proxy en una nueva ventana de PowerShell
Write-Host "Iniciando servidor proxy en http://localhost:3000..." -ForegroundColor Cyan
Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory (Get-Location) -NoNewWindow
Write-Host "¡Servidor proxy iniciado!" -ForegroundColor Green
