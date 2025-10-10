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
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run dev"
    Write-Host "Esperando 10 segundos..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
} else {
    Write-Host "Servidor ya corriendo" -ForegroundColor Green
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Abriendo navegadores                         " -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# VENDEDOR en Microsoft Edge
Write-Host "[1/2] Abriendo Microsoft Edge para VENDEDOR..." -ForegroundColor Blue
try {
    Start-Process msedge "http://localhost:3000/sign-in"
    Write-Host "      Edge abierto" -ForegroundColor Green
} catch {
    Write-Host "      Edge no encontrado, usando Chrome..." -ForegroundColor Yellow
    Start-Process chrome "http://localhost:3000/sign-in"
}

Start-Sleep -Seconds 3

# COMPRADOR en Chrome Incognito
Write-Host "[2/2] Abriendo Chrome Incognito para COMPRADOR..." -ForegroundColor Magenta
Start-Process chrome "--incognito http://localhost:3000/sign-in"
Write-Host "      Chrome incognito abierto" -ForegroundColor Green

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  Navegadores listos                           " -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
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