# Script para obtener IDs de Vercel para GitHub Secrets
# Ejecutar desde la raíz del proyecto

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🔑 Obtener Secrets de Vercel" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que existe el archivo .vercel/project.json
if (-not (Test-Path ".vercel\project.json")) {
    Write-Host "❌ No se encontró .vercel\project.json" -ForegroundColor Red
    Write-Host ""
    Write-Host "Necesitas vincular el proyecto con Vercel primero:" -ForegroundColor Yellow
    Write-Host "  1. Ejecuta: vercel link" -ForegroundColor White
    Write-Host "  2. Selecciona tu proyecto existente: food-order-crm" -ForegroundColor White
    Write-Host "  3. Vuelve a ejecutar este script" -ForegroundColor White
    Write-Host ""
    exit 1
}

# Leer el archivo de configuración
try {
    $config = Get-Content ".vercel\project.json" -Raw | ConvertFrom-Json
    
    Write-Host "✅ Configuración de Vercel encontrada" -ForegroundColor Green
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "📋 Secrets para GitHub Actions" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Mostrar ORG_ID
    Write-Host "1️⃣ VERCEL_ORG_ID:" -ForegroundColor Yellow
    Write-Host "   $($config.orgId)" -ForegroundColor Green
    Write-Host ""
    
    # Mostrar PROJECT_ID
    Write-Host "2️⃣ VERCEL_PROJECT_ID:" -ForegroundColor Yellow
    Write-Host "   $($config.projectId)" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📝 Pasos siguientes:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Crea un token en Vercel:" -ForegroundColor White
    Write-Host "   https://vercel.com/account/tokens" -ForegroundColor Blue
    Write-Host ""
    Write-Host "2. Ve a GitHub Secrets:" -ForegroundColor White
    Write-Host "   https://github.com/tucano1306/CRM/settings/secrets/actions" -ForegroundColor Blue
    Write-Host ""
    Write-Host "3. Agrega estos 3 secrets:" -ForegroundColor White
    Write-Host "   • VERCEL_TOKEN          (el que creaste en paso 1)" -ForegroundColor Gray
    Write-Host "   • VERCEL_ORG_ID         $($config.orgId)" -ForegroundColor Gray
    Write-Host "   • VERCEL_PROJECT_ID     $($config.projectId)" -ForegroundColor Gray
    Write-Host ""
    
    # Copiar al portapapeles si está disponible
    $secretsText = @"
VERCEL_ORG_ID=$($config.orgId)
VERCEL_PROJECT_ID=$($config.projectId)
"@
    
    try {
        $secretsText | Set-Clipboard
        Write-Host "✅ IDs copiados al portapapeles" -ForegroundColor Green
        Write-Host ""
    } catch {
        # Portapapeles no disponible, no pasa nada
    }
    
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Verificar si Vercel CLI está instalado
    Write-Host "🔍 Verificando Vercel CLI..." -ForegroundColor Cyan
    try {
        $vercelVersion = vercel --version 2>$null
        Write-Host "   ✅ Vercel CLI instalado: $vercelVersion" -ForegroundColor Green
        Write-Host ""
        
        # Verificar sesión activa
        Write-Host "👤 Verificando sesión de Vercel..." -ForegroundColor Cyan
        $whoami = vercel whoami 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✅ Sesión activa" -ForegroundColor Green
            Write-Host ""
            Write-Host "   Información de la cuenta:" -ForegroundColor Gray
            $whoami | ForEach-Object { Write-Host "   $_" -ForegroundColor White }
        } else {
            Write-Host "   ⚠️  No hay sesión activa" -ForegroundColor Yellow
            Write-Host "   Ejecuta: vercel login" -ForegroundColor White
        }
        Write-Host ""
        
    } catch {
        Write-Host "   ⚠️  Vercel CLI no está instalado" -ForegroundColor Yellow
        Write-Host "   Instala con: npm i -g vercel" -ForegroundColor White
        Write-Host ""
    }
    
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "📚 Documentación completa en:" -ForegroundColor Cyan
    Write-Host "   CONFIGURAR_VERCEL_GITHUB_SECRETS.md" -ForegroundColor White
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
} catch {
    Write-Host "❌ Error al leer .vercel\project.json" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    exit 1
}
