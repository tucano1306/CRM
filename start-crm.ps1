# ===============================================
# Food Orders CRM - Script de Inicio
# ===============================================

Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  Food Orders CRM - Iniciando Sistema         " -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# Verificar servidor
$port = 3000
$portInUse = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue

if (-not $portInUse) {
    Write-Host "Iniciando servidor Next.js..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run dev"
    Write-Host "Esperando 10 segundos..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
} else {
    Write-Host "Servidor ya corriendo en puerto $port" -ForegroundColor Green
}

Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  Abriendo Navegadores                        " -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# Abrir navegadores
Write-Host "Abriendo Dashboard de Vendedor (Chrome)..." -ForegroundColor Blue
Start-Process chrome "http://localhost:3000/dashboard"
Start-Sleep -Seconds 2

Write-Host "Abriendo Dashboard de Comprador (Incognito)..." -ForegroundColor Magenta
Start-Process chrome "--incognito http://localhost:3000/buyer/dashboard"

Write-Host ""
Write-Host "===============================================" -ForegroundColor Green
Write-Host "  Sistema iniciado correctamente!             " -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green
Write-Host ""

Write-Host "INSTRUCCIONES:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. En Chrome (ventana NORMAL):" -ForegroundColor Blue
Write-Host "   - Iniciar sesion con: vendedor@test.com" -ForegroundColor White
Write-Host "   - Password: Test123456!" -ForegroundColor Gray
Write-Host "   - Veras: Dashboard de VENDEDOR (azul)" -ForegroundColor Gray
Write-Host ""
Write-Host "2. En Chrome (ventana INCOGNITO):" -ForegroundColor Magenta
Write-Host "   - Iniciar sesion con: comprador@test.com" -ForegroundColor White
Write-Host "   - Password: Test123456!" -ForegroundColor Gray
Write-Host "   - Veras: Dashboard de COMPRADOR (morado)" -ForegroundColor Gray
Write-Host ""
Write-Host "IMPORTANTE:" -ForegroundColor Red
Write-Host "- Debes usar USUARIOS DIFERENTES en cada navegador" -ForegroundColor Yellow
Write-Host "- Si ves la misma interfaz, cierra sesion y vuelve a entrar" -ForegroundColor Yellow
Write-Host ""
Write-Host "Presiona cualquier tecla para continuar..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")