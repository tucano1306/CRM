# Script para forzar redeploy en Vercel sin caché
Write-Host "🚀 Forzando redeploy limpio en Vercel..." -ForegroundColor Cyan

# Modificar package.json para cambiar version y forzar rebuild
$packagePath = "package.json"
$package = Get-Content $packagePath -Raw | ConvertFrom-Json
$oldVersion = $package.version
$newVersion = "0.1.$(Get-Date -Format 'HHmmss')"
$package.version = $newVersion
$package | ConvertTo-Json -Depth 100 | Set-Content $packagePath

Write-Host "📦 Version cambiada: $oldVersion → $newVersion" -ForegroundColor Green

# Commit y push
git add package.json
git commit -m "chore: Bump version to $newVersion to force Vercel rebuild"
git push origin main

Write-Host "✅ Push completado. Vercel debería detectar el cambio ahora." -ForegroundColor Green
Write-Host "⏳ Espera 2-3 minutos y verifica: https://vercel.com/tucano1306s-projects/food-order-crm/deployments" -ForegroundColor Yellow
