# Script para verificar las rutas de API disponibles
Write-Host "Verificando endpoints disponibles en la API..." -ForegroundColor Cyan

try {
    $body = @{ path = 'listPaths' } | ConvertTo-Json
    $response = Invoke-WebRequest -Method POST -Uri 'http://localhost:3000/api' -Body $body -ContentType 'application/json'
    $responseObj = $response.Content | ConvertFrom-Json
    
    Write-Host "Endpoints disponibles:" -ForegroundColor Green
    $responseObj.paths | Sort-Object | ForEach-Object {
        Write-Host "- $_" -ForegroundColor White
    }
    
    # Verificar si los endpoints específicos están disponibles
    $criticalEndpoints = @('getAllContratos', 'listContratos', 'getContratistasVersion')
    Write-Host "`nVerificando endpoints críticos:" -ForegroundColor Yellow
    foreach ($endpoint in $criticalEndpoints) {
        if ($responseObj.paths -contains $endpoint) {
            Write-Host "[OK] $endpoint" -ForegroundColor Green
        } else {
            Write-Host "[FALTA] $endpoint" -ForegroundColor Red
        }
    }
    
} catch {
    Write-Host "Error al verificar endpoints: $_" -ForegroundColor Red
    Write-Host "Asegúrate de que el servidor esté en ejecución." -ForegroundColor Yellow
}
