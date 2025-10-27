# Script para limpiar completamente el caché y reiniciar

Write-Host "`n🧹 LIMPIEZA COMPLETA DE CACHÉ`n" -ForegroundColor Yellow

# 1. Detener procesos de Node
Write-Host "1️⃣  Deteniendo procesos de Node..." -ForegroundColor Cyan
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# 2. Limpiar caché de Next.js
Write-Host "2️⃣  Eliminando carpeta .next..." -ForegroundColor Cyan
if (Test-Path ".next") {
    Remove-Item -Path ".next" -Recurse -Force
    Write-Host "   ✅ Carpeta .next eliminada" -ForegroundColor Green
}

# 3. Limpiar caché de Tailwind
Write-Host "3️⃣  Limpiando caché de Tailwind..." -ForegroundColor Cyan
if (Test-Path "node_modules/.cache") {
    Remove-Item -Path "node_modules/.cache" -Recurse -Force
    Write-Host "   ✅ Caché de Tailwind eliminado" -ForegroundColor Green
}

Write-Host "`n✨ Caché limpiado exitosamente`n" -ForegroundColor Green

Write-Host "🚀 PRÓXIMOS PASOS:" -ForegroundColor Yellow
Write-Host "1. Ejecuta: npm run dev" -ForegroundColor Cyan
Write-Host "2. Espera a que compile completamente" -ForegroundColor Cyan
Write-Host "3. Abre el navegador en modo incógnito o haz Ctrl+Shift+R" -ForegroundColor Cyan
Write-Host "`n¡Las animaciones deberían funcionar ahora!`n" -ForegroundColor Green
