# ==============================================================================
# Script para verificar que todos los secrets necesarios están configurados
# ==============================================================================

Write-Host "`n=== GitHub Actions Secrets Checker ===" -ForegroundColor Cyan
Write-Host "Este script verifica que tienes los valores necesarios para GitHub Actions`n" -ForegroundColor Gray

# Verificar .env.local
if (-Not (Test-Path ".env.local")) {
    Write-Host "❌ No se encontró .env.local" -ForegroundColor Red
    Write-Host "   Crea este archivo primero con tus credenciales de Clerk" -ForegroundColor Yellow
    exit 1
}

# Leer .env.local
$envContent = Get-Content ".env.local" -Raw

# Función para extraer valor de .env
function Get-EnvValue {
    param($key)
    if ($envContent -match "$key=(.+)") {
        return $matches[1].Trim()
    }
    return $null
}

# Verificar NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
$clerkPublicKey = Get-EnvValue "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
if ($clerkPublicKey) {
    Write-Host "✅ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY encontrado" -ForegroundColor Green
    Write-Host "   Valor: $clerkPublicKey" -ForegroundColor Gray
} else {
    Write-Host "❌ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY NO encontrado" -ForegroundColor Red
}

# Verificar CLERK_SECRET_KEY
$clerkSecretKey = Get-EnvValue "CLERK_SECRET_KEY"
if ($clerkSecretKey) {
    Write-Host "✅ CLERK_SECRET_KEY encontrado" -ForegroundColor Green
    Write-Host "   Valor: $($clerkSecretKey.Substring(0, 15))..." -ForegroundColor Gray
} else {
    Write-Host "⚠️  CLERK_SECRET_KEY NO encontrado (opcional)" -ForegroundColor Yellow
}

Write-Host "`n=== Instrucciones para GitHub ===" -ForegroundColor Cyan
Write-Host "1. Ve a: https://github.com/tucano1306/CRM/settings/secrets/actions" -ForegroundColor White
Write-Host "2. Click en 'New repository secret'" -ForegroundColor White
Write-Host "3. Agrega estos secrets:`n" -ForegroundColor White

if ($clerkPublicKey) {
    Write-Host "   Secret Name: NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" -ForegroundColor Yellow
    Write-Host "   Value: $clerkPublicKey`n" -ForegroundColor Gray
}

if ($clerkSecretKey) {
    Write-Host "   Secret Name: CLERK_SECRET_KEY" -ForegroundColor Yellow
    Write-Host "   Value: $clerkSecretKey`n" -ForegroundColor Gray
}

Write-Host "=== Verificar Permisos ===" -ForegroundColor Cyan
Write-Host "1. Ve a: https://github.com/tucano1306/CRM/settings/actions" -ForegroundColor White
Write-Host "2. En 'Workflow permissions', selecciona:" -ForegroundColor White
Write-Host "   • Read and write permissions" -ForegroundColor Yellow
Write-Host "   • Allow GitHub Actions to create and approve pull requests`n" -ForegroundColor Yellow

Write-Host "=== Listo para probar ===" -ForegroundColor Green
Write-Host "Ejecuta estos comandos para probar GitHub Actions:`n" -ForegroundColor White
Write-Host "   git add ." -ForegroundColor Cyan
Write-Host "   git commit -m 'ci: Configure GitHub Actions'" -ForegroundColor Cyan
Write-Host "   git push origin main`n" -ForegroundColor Cyan
Write-Host "Luego ve a: https://github.com/tucano1306/CRM/actions`n" -ForegroundColor White
