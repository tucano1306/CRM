# Script Simple para Iniciar CRM
# Si start-crm.ps1 no funciona, usa este

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  CRM - Inicio Simple                       " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Paso 1: Verificar si el servidor ya está corriendo
Write-Host "Verificando servidor..." -ForegroundColor Yellow
$serverRunning = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue

if ($serverRunning) {
    Write-Host "Servidor ya esta corriendo!" -ForegroundColor Green
} else {
    Write-Host "Servidor NO esta corriendo" -ForegroundColor Red
    Write-Host ""
    Write-Host "INSTRUCCIONES:" -ForegroundColor Yellow
    Write-Host "1. Abre una nueva terminal de PowerShell" -ForegroundColor White
    Write-Host "2. Navega a: $PWD" -ForegroundColor White
    Write-Host "3. Ejecuta: npm run dev" -ForegroundColor White
    Write-Host "4. Espera a ver: 'Ready in X seconds'" -ForegroundColor White
    Write-Host "5. Vuelve aqui y presiona Enter" -ForegroundColor White
    Write-Host ""
    Read-Host "Presiona Enter cuando el servidor este listo"
}

# Paso 2: Abrir navegadores
Write-Host ""
Write-Host "Abriendo navegadores..." -ForegroundColor Yellow

# Vendedor - Edge
Write-Host "1. Edge para VENDEDOR..." -ForegroundColor Blue
Start-Process msedge "http://localhost:3000/sign-in"
Start-Sleep -Seconds 2

# Comprador - Chrome Incognito
Write-Host "2. Chrome para COMPRADOR..." -ForegroundColor Magenta
Start-Process chrome "--incognito http://localhost:3000/sign-in"

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  Navegadores Abiertos                      " -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "VENDEDOR (Edge):" -ForegroundColor Blue
Write-Host "  tucano0109@gmail.com" -ForegroundColor White
Write-Host ""
Write-Host "COMPRADOR (Chrome Incognito):" -ForegroundColor Magenta
Write-Host "  l3oyucon1978@gmail.com" -ForegroundColor White
Write-Host ""
Write-Host "Si no se abrieron, ve a:" -ForegroundColor Yellow
Write-Host "  http://localhost:3000/sign-in" -ForegroundColor Cyan
Write-Host ""
