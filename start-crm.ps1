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

# URLs del CRM
$url = "http://localhost:3000/sign-in"

Write-Host "[1/2] Abriendo Microsoft Edge para VENDEDOR..." -ForegroundColor Blue
Write-Host "      Despues de login ira a: /products (Sistema con Tags)" -ForegroundColor Cyan

# Intentar abrir Edge
$edgeOpened = $false
try {
    $edgeExe = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
    if (Test-Path $edgeExe) {
        Start-Process -FilePath $edgeExe -ArgumentList "--new-window", $url
        Write-Host "      Edge abierto exitosamente" -ForegroundColor Green
        $edgeOpened = $true
    }
} catch {
    Write-Host "      Error abriendo Edge: $_" -ForegroundColor Red
}

# Si Edge no funcionó, intentar con Start-Process directo
if (-not $edgeOpened) {
    try {
        Start-Process "microsoft-edge:$url"
        Write-Host "      Edge abierto (protocolo)" -ForegroundColor Green
    } catch {
        Write-Host "      No se pudo abrir Edge, abre manualmente: $url" -ForegroundColor Yellow
    }
}

Start-Sleep -Seconds 3

Write-Host "[2/2] Abriendo Chrome Incognito para COMPRADOR..." -ForegroundColor Magenta
Write-Host "      Despues de login ira a: /buyer/dashboard" -ForegroundColor Cyan

# Intentar abrir Chrome Incognito
$chromeOpened = $false
try {
    $chromeExe = "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe"
    if (Test-Path $chromeExe) {
        Start-Process -FilePath $chromeExe -ArgumentList "--incognito", "--new-window", $url
        Write-Host "      Chrome incognito abierto exitosamente" -ForegroundColor Green
        $chromeOpened = $true
    }
} catch {
    Write-Host "      Error abriendo Chrome: $_" -ForegroundColor Red
}

# Si Chrome no funcionó, intentar ubicación alternativa
if (-not $chromeOpened) {
    try {
        $chromeExeAlt = "${env:LOCALAPPDATA}\Google\Chrome\Application\chrome.exe"
        if (Test-Path $chromeExeAlt) {
            Start-Process -FilePath $chromeExeAlt -ArgumentList "--incognito", "--new-window", $url
            Write-Host "      Chrome incognito abierto exitosamente (alt)" -ForegroundColor Green
        } else {
            Write-Host "      No se pudo abrir Chrome, abre manualmente: $url" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "      No se pudo abrir Chrome, abre manualmente: $url" -ForegroundColor Yellow
    }
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
    Write-Host ""
    Write-Host "URLs Abiertas:" -ForegroundColor Cyan
    Write-Host "  VENDEDOR:  http://localhost:3000/products-modern" -ForegroundColor Blue
    Write-Host "  COMPRADOR: http://localhost:3000/buyer" -ForegroundColor Magenta
    Write-Host ""
    Write-Host "Servidor principal: http://localhost:3000" -ForegroundColor Gray
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
Write-Host "  Ira automaticamente a: /products (CON SISTEMA DE TAGS)" -ForegroundColor Green
Write-Host ""
Write-Host "Chrome Incognito (COMPRADOR):" -ForegroundColor Magenta
Write-Host "  Email: l3oyucon1978@gmail.com" -ForegroundColor White
Write-Host "  Ira a: /buyer/dashboard (interfaz morada)" -ForegroundColor Gray
Write-Host ""
Write-Host "NUEVO: Sistema de Tags en /products" -ForegroundColor Cyan
Write-Host "  - Haz clic en 'Detalles & Tags' en cualquier producto" -ForegroundColor Gray
Write-Host "  - Tab 'Promociones' para gestionar etiquetas" -ForegroundColor Gray
Write-Host "  - 17 etiquetas predefinidas + etiquetas personalizadas" -ForegroundColor Gray
Write-Host "  - Sugerencias automaticas basadas en stock/precio/fecha" -ForegroundColor Gray
Write-Host ""
Write-Host "Si los navegadores NO se abrieron:" -ForegroundColor Red
Write-Host "  Abre manualmente: http://localhost:3000/sign-in" -ForegroundColor Yellow
Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "Servidor corriendo. Ctrl+C en ventana del servidor para detener" -ForegroundColor Gray
Write-Host "================================================" -ForegroundColor Green
Write-Host ""