# Script para reiniciar el servidor completamente
Write-Host "🛑 Deteniendo procesos de Node.js..." -ForegroundColor Yellow

# Detener todos los procesos de Node.js relacionados con Next.js
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
    $_.Path -like "*food-order CRM*"
} | Stop-Process -Force

Start-Sleep -Seconds 2

Write-Host "🧹 Limpiando caché de Next.js..." -ForegroundColor Cyan
if (Test-Path ".next") {
    Remove-Item -Path ".next" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "✅ Caché eliminado" -ForegroundColor Green
}

Write-Host "🔄 Regenerando cliente de Prisma..." -ForegroundColor Cyan
npx prisma generate

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Cliente de Prisma regenerado" -ForegroundColor Green
    
    Write-Host "`n🚀 Iniciando servidor..." -ForegroundColor Green
    npm run dev
} else {
    Write-Host "❌ Error regenerando cliente de Prisma" -ForegroundColor Red
    Write-Host "Intenta cerrar manualmente todos los procesos de Node.js y ejecuta nuevamente" -ForegroundColor Yellow
}
