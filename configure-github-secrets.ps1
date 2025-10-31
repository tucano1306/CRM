# ==============================================================================
# Script para configurar CLERK_SECRET_KEY en GitHub
# ==============================================================================

Write-Host "`n════════════════════════════════════════════════════════════════" -ForegroundColor Red
Write-Host "  ❌ ERROR EN GITHUB ACTIONS - CLERK_SECRET_KEY FALTANTE" -ForegroundColor White -BackgroundColor DarkRed
Write-Host "════════════════════════════════════════════════════════════════`n" -ForegroundColor Red

Write-Host "❌ PROBLEMA:" -ForegroundColor Red
Write-Host "   GitHub Actions falló con:" -ForegroundColor White
Write-Host "   @clerk/nextjs: Missing secretKey`n" -ForegroundColor Yellow

Write-Host "✅ SOLUCIÓN:" -ForegroundColor Green
Write-Host "   Agregar CLERK_SECRET_KEY en GitHub Secrets`n" -ForegroundColor White

Write-Host "🔑 TU CLERK_SECRET_KEY:" -ForegroundColor Magenta
Write-Host "   sk_test_QDkA3kIHHPasInWTAQ9feDDZToR06kAAJVSLiSHwgQ`n" -ForegroundColor Yellow -BackgroundColor DarkGray

Write-Host "📋 PASOS PARA AGREGAR EL SECRET:" -ForegroundColor Cyan
Write-Host "`n   PASO 1: Abre GitHub Secrets" -ForegroundColor Yellow
Write-Host "   ────────────────────────────" -ForegroundColor Gray
Write-Host "   URL: " -NoNewline -ForegroundColor White
Write-Host "https://github.com/tucano1306/CRM/settings/secrets/actions`n" -ForegroundColor Cyan

Write-Host "   PASO 2: Crear nuevo secret" -ForegroundColor Yellow
Write-Host "   ──────────────────────────" -ForegroundColor Gray
Write-Host "   • Click en " -NoNewline -ForegroundColor White
Write-Host "New repository secret" -ForegroundColor Green -BackgroundColor DarkGray
Write-Host ""

Write-Host "   PASO 3: Configurar el secret" -ForegroundColor Yellow
Write-Host "   ────────────────────────────" -ForegroundColor Gray
Write-Host "   Name:  " -NoNewline -ForegroundColor White
Write-Host "CLERK_SECRET_KEY" -ForegroundColor Yellow -BackgroundColor DarkGray
Write-Host "   Value: " -NoNewline -ForegroundColor White
Write-Host "sk_test_QDkA3kIHHPasInWTAQ9feDDZToR06kAAJVSLiSHwgQ" -ForegroundColor Yellow -BackgroundColor DarkGray
Write-Host ""

Write-Host "   PASO 4: Guardar" -ForegroundColor Yellow
Write-Host "   ───────────────" -ForegroundColor Gray
Write-Host "   • Click en " -NoNewline -ForegroundColor White
Write-Host "Add secret" -ForegroundColor Green -BackgroundColor DarkGray
Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Gray

Write-Host "🔄 DESPUÉS DE AGREGAR EL SECRET:" -ForegroundColor Cyan
Write-Host "`n   1. Ve a GitHub Actions:" -ForegroundColor White
Write-Host "      https://github.com/tucano1306/CRM/actions`n" -ForegroundColor Yellow

Write-Host "   2. Click en el workflow fallido (último)" -ForegroundColor White
Write-Host "      Se llama: 'feat: Add E2E tests with auth bypass...`n" -ForegroundColor Gray

Write-Host "   3. Click en " -NoNewline -ForegroundColor White
Write-Host "Re-run all jobs" -ForegroundColor Green -BackgroundColor DarkGray
Write-Host "`n   4. Espera ~10-15 minutos" -ForegroundColor White
Write-Host "      El test-e2e job debería pasar ✅`n" -ForegroundColor Gray

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Gray

Write-Host "📊 SECRETS NECESARIOS EN GITHUB:" -ForegroundColor Cyan
Write-Host "   ✅ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (ya configurado)" -ForegroundColor Green
Write-Host "   ❌ CLERK_SECRET_KEY (FALTA - agregar ahora)" -ForegroundColor Red
Write-Host ""

Write-Host "ALTERNATIVA: Configurar usando GitHub CLI" -ForegroundColor Magenta
Write-Host "   Si tienes gh instalado:" -ForegroundColor Gray
Write-Host "   gh secret set CLERK_SECRET_KEY" -ForegroundColor Cyan
Write-Host ""

Write-Host "════════════════════════════════════════════════════════════════`n" -ForegroundColor Red

# Intentar copiar al clipboard
try {
    "sk_test_QDkA3kIHHPasInWTAQ9feDDZToR06kAAJVSLiSHwgQ" | Set-Clipboard
    Write-Host "✅ CLERK_SECRET_KEY copiado al clipboard!" -ForegroundColor Green
    Write-Host "   Puedes pegarlo directamente en GitHub`n" -ForegroundColor Gray
} catch {
    Write-Host "⚠️  No se pudo copiar al clipboard automáticamente" -ForegroundColor Yellow
}

Write-Host "Presiona cualquier tecla para abrir GitHub Secrets en el navegador..." -ForegroundColor White
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Abrir navegador
Start-Process "https://github.com/tucano1306/CRM/settings/secrets/actions"

Write-Host ""
Write-Host "Navegador abierto. Sigue los pasos de arriba." -ForegroundColor Green
Write-Host ""
