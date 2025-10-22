Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Food Orders CRM - Iniciando                  " -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Verificar servidor
$port = 3000
$portInUse = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue

if (-not $portInUse) {
    Write-Host "Iniciando servidor..." -ForegroundColor Yellow
    
    # Iniciar servidor en nueva ventana
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run dev"
    
    Write-Host "Esperando a que el servidor inicie..." -ForegroundColor Yellow
    Write-Host "(Esto puede tomar 10-15 segundos)" -ForegroundColor Gray
    
    # Esperar con progreso visual
    $waited = 0
    $maxWait = 30
    while ($waited -lt $maxWait) {
        Start-Sleep -Seconds 2
        $waited += 2
        $portCheck = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($portCheck) {
            Write-Host "Servidor listo!" -ForegroundColor Green
            Start-Sleep -Seconds 2
            break
        }
        Write-Host "  Esperando... ($waited/$maxWait segundos)" -ForegroundColor Gray
    }
    
    if ($waited -ge $maxWait) {
        Write-Host ""
        Write-Host "ERROR: El servidor no inicio en $maxWait segundos" -ForegroundColor Red
        Write-Host "Por favor, verifica la ventana de PowerShell que se abrio" -ForegroundColor Yellow
        Write-Host "Presiona Enter para continuar de todos modos..." -ForegroundColor Yellow
        Read-Host
    }
} else {
    Write-Host "Servidor ya corriendo en puerto $port" -ForegroundColor Green
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Abriendo navegadores                         " -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# URL del CRM
$url = "http://localhost:3000/sign-in"

# VENDEDOR en Microsoft Edge
Write-Host "[1/2] Abriendo Microsoft Edge para VENDEDOR..." -ForegroundColor Blue
try {
    $edgePath = "msedge"
    Start-Process $edgePath $url -ErrorAction Stop
    Write-Host "      Edge abierto exitosamente" -ForegroundColor Green
} catch {
    Write-Host "      Edge no encontrado, intentando Chrome..." -ForegroundColor Yellow
    try {
        Start-Process chrome $url -ErrorAction Stop
        Write-Host "      Chrome abierto como alternativa" -ForegroundColor Green
    } catch {
        Write-Host "      ERROR: No se pudo abrir ningun navegador" -ForegroundColor Red
        Write-Host "      Abre manualmente: $url" -ForegroundColor Yellow
    }
}

Start-Sleep -Seconds 3

# COMPRADOR en Chrome Incognito
Write-Host "[2/2] Abriendo Chrome Incognito para COMPRADOR..." -ForegroundColor Magenta
try {
    Start-Process chrome "--incognito $url" -ErrorAction Stop
    Write-Host "      Chrome incognito abierto exitosamente" -ForegroundColor Green
} catch {
    Write-Host "      ERROR: No se pudo abrir Chrome" -ForegroundColor Red
    Write-Host "      Abre manualmente en modo incognito: $url" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  Sistema Iniciado                             " -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""

# Verificar estado final
$finalCheck = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($finalCheck) {
    Write-Host "Estado del servidor: CORRIENDO" -ForegroundColor Green
    Write-Host "URL: http://localhost:3000" -ForegroundColor Cyan
} else {
    Write-Host "Estado del servidor: NO DETECTADO" -ForegroundColor Red
    Write-Host "Si ves errores arriba, ejecuta manualmente: npm run dev" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  INSTRUCCIONES DE USO                         " -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "IMPORTANTE: Debes iniciar sesion con usuarios DIFERENTES" -ForegroundColor Yellow
Write-Host ""
Write-Host "Microsoft Edge (VENDEDOR):" -ForegroundColor Blue
Write-Host "  Email: tucano0109@gmail.com" -ForegroundColor White
Write-Host "  Deberia ir a: /dashboard (interfaz azul)" -ForegroundColor Gray
Write-Host ""
Write-Host "Chrome Incognito (COMPRADOR):" -ForegroundColor Magenta
Write-Host "  Email: l3oyucon1978@gmail.com" -ForegroundColor White
Write-Host "  Deberia ir a: /buyer/dashboard (interfaz morada)" -ForegroundColor Gray
Write-Host ""
Write-Host "Si ambos muestran la misma interfaz:" -ForegroundColor Red
Write-Host "  - Verifica que estes usando correos DIFERENTES" -ForegroundColor Yellow
Write-Host "  - Cierra TODO y vuelve a ejecutar el script" -ForegroundColor Yellow
Write-Host ""
Write-Host "Si los navegadores NO se abrieron:" -ForegroundColor Red
Write-Host "  - Abre manualmente: http://localhost:3000/sign-in" -ForegroundColor Yellow
Write-Host "  - Usa Edge para vendedor, Chrome incognito para comprador" -ForegroundColor Yellow
Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "Presiona Ctrl+C en la ventana del servidor para detener" -ForegroundColor Gray
Write-Host "================================================" -ForegroundColor Green
Write-Host ""