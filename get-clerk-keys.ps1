# Script para verificar que tienes las claves de Clerk configuradas localmente
# NO muestra las claves completas por seguridad

Write-Host "`n=== Verificando Claves de Clerk ===" -ForegroundColor Cyan

$envFile = ".env.local"

if (-not (Test-Path $envFile)) {
    Write-Host "❌ Archivo .env.local no encontrado" -ForegroundColor Red
    Write-Host "   Crea el archivo copiando .env.local.example" -ForegroundColor Yellow
    exit 1
}

$content = Get-Content $envFile

# Buscar CLERK_SECRET_KEY
$secretKey = $content | Where-Object { $_ -match "^CLERK_SECRET_KEY=" }
if ($secretKey) {
    $value = $secretKey -replace "CLERK_SECRET_KEY=", "" -replace '"', ''
    if ($value -match "sk_(test|live)_") {
        $masked = $value.Substring(0, 15) + "..." + $value.Substring($value.Length - 4)
        Write-Host "✅ CLERK_SECRET_KEY encontrado: $masked" -ForegroundColor Green
        Write-Host "   → Agregar este valor completo a GitHub Secrets" -ForegroundColor Yellow
    } else {
        Write-Host "❌ CLERK_SECRET_KEY no tiene formato válido (debe empezar con sk_test_ o sk_live_)" -ForegroundColor Red
    }
} else {
    Write-Host "❌ CLERK_SECRET_KEY no encontrado en .env.local" -ForegroundColor Red
}

# Buscar NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
$publishableKey = $content | Where-Object { $_ -match "^NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=" }
if ($publishableKey) {
    $value = $publishableKey -replace "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=", "" -replace '"', ''
    if ($value -match "pk_(test|live)_") {
        $masked = $value.Substring(0, 15) + "..." + $value.Substring($value.Length - 4)
        Write-Host "✅ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY encontrado: $masked" -ForegroundColor Green
        Write-Host "   → Agregar este valor completo a GitHub Secrets" -ForegroundColor Yellow
    } else {
        Write-Host "❌ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY no tiene formato válido (debe empezar con pk_test_ o pk_live_)" -ForegroundColor Red
    }
} else {
    Write-Host "❌ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY no encontrado en .env.local" -ForegroundColor Red
}

Write-Host "`n=== Próximos Pasos ===" -ForegroundColor Cyan
Write-Host "1. Ve a: https://github.com/tucano1306/CRM/settings/secrets/actions"
Write-Host "2. Agrega los 2 secrets de Clerk (valores completos de .env.local)"
Write-Host "3. Agrega los 3 secrets de Vercel (ver CONFIGURAR_SECRETS_GITHUB_VERCEL.md)"
Write-Host "`nTotal: 5 secrets a agregar`n"
