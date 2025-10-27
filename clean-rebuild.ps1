# Script para limpiar cache y reconstruir completamente
Write-Host "Limpiando cache y reconstruyendo..." -ForegroundColor Cyan

# 1. Detener procesos de Next.js
Write-Host "`n1. Deteniendo procesos de Next.js..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*node_modules*" } | Stop-Process -Force
Start-Sleep -Seconds 2

# 2. Eliminar directorio .next
Write-Host "`n2. Eliminando directorio .next..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next"
    Write-Host "   Eliminado .next" -ForegroundColor Green
} else {
    Write-Host "   No existe .next" -ForegroundColor Gray
}

# 3. Eliminar cache de node_modules
Write-Host "`n3. Eliminando cache de node_modules..." -ForegroundColor Yellow
if (Test-Path "node_modules\.cache") {
    Remove-Item -Recurse -Force "node_modules\.cache"
    Write-Host "   Cache eliminado" -ForegroundColor Green
} else {
    Write-Host "   No existe cache" -ForegroundColor Gray
}

# 4. Limpiar cache de npm
Write-Host "`n4. Limpiando cache de npm..." -ForegroundColor Yellow
npm cache clean --force 2>$null
Write-Host "   Cache de npm limpio" -ForegroundColor Green

Write-Host "`nLimpieza completa!" -ForegroundColor Green
Write-Host "Ahora ejecuta: npm run dev o start-crm.ps1" -ForegroundColor Cyan
