# Script completo para limpiar archivos innecesarios del proyecto
# Elimina scripts de debugging, testing, archivos temporales y documentación obsoleta

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  LIMPIEZA COMPLETA DEL PROYECTO" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = "c:\Users\tucan\Desktop\food-order CRM"
Set-Location $projectRoot

# Contador de archivos eliminados
$deletedCount = 0
$totalSize = 0

# Función para eliminar archivo con confirmación
function Remove-FileIfExists {
    param($fileName)
    
    if (Test-Path $fileName) {
        $fileInfo = Get-Item $fileName
        $size = $fileInfo.Length
        $sizeKB = [math]::Round($size/1KB, 2)
        
        Write-Host "OK: $fileName ($sizeKB KB)" -ForegroundColor DarkGray
        Remove-Item $fileName -Force
        
        $script:deletedCount++
        $script:totalSize += $size
        return $true
    }
    return $false
}

# ============================================================
# 1. SCRIPTS JAVASCRIPT DE DEBUGGING/TESTING
# ============================================================
Write-Host "1. Scripts JavaScript de debugging/testing..." -ForegroundColor Yellow

$jsDebugFiles = @(
    "apply-timeouts.js",
    "change-role-to-client.js",
    "check-columns.js",
    "check-credits.js",
    "check-products.js",
    "check-return-credit.js",
    "check-return.js",
    "create-buyer-user.js",
    "create-missing-credit.js",
    "create-seller-for-user.js",
    "create-test-products.js",
    "create-test-return.js",
    "debug-auth-realtime.js",
    "debug-seller-auth.js",
    "delete-phantom-record.js",
    "demo-credit-protection.js",
    "diagnose-my-user.js",
    "diagnose-seller.js",
    "diagnostic-complete.js",
    "diagnostic-order-animations.js",
    "find-all-auth-users.js",
    "find-client.js",
    "find-leonic-user.js",
    "fix-client.js",
    "fix-ghost-client.js",
    "fix-seller-production.js",
    "investigate-final.js",
    "link-me-to-seller.js",
    "switch-to-client.js",
    "test-credit-endpoint.js",
    "test-seller-endpoints.js",
    "verify-seller-link.js"
)

foreach ($file in $jsDebugFiles) {
    Remove-FileIfExists $file
}

# ============================================================
# 2. SCRIPTS SQL DE DEBUGGING
# ============================================================
Write-Host ""
Write-Host "2. Scripts SQL de debugging..." -ForegroundColor Yellow

$sqlDebugFiles = @(
    "check-chat-messages.sql",
    "check-clientusers-relation.sql",
    "check-enum-values.sql",
    "check-messages-simple.sql",
    "check-order-status.sql",
    "check-seller-relations.sql",
    "check-sent-quotes.sql",
    "check-status-column.sql",
    "check-status-values.sql",
    "check-user-relation.sql",
    "cleanup-migration.sql",
    "create-seller-relation.sql",
    "debug-quote-issue.sql",
    "DELETE_GHOST_CLIENT.sql",
    "fix-null-status.sql",
    "fix-quote-notification.sql",
    "link-client-auth.sql",
    "link-client-seller.sql",
    "simulate-prisma-query.sql",
    "update-chat-messages.sql",
    "update-seller-authid.sql",
    "verify-all-relations.sql",
    "verify-and-fix-authids.sql",
    "verify-audit-implementation.sql",
    "verify-audit-table.sql",
    "verify-complete-chain.sql",
    "verify-sellerid-complete.sql"
)

foreach ($file in $sqlDebugFiles) {
    Remove-FileIfExists $file
}

# ============================================================
# 3. ARCHIVOS HTML DE TESTING
# ============================================================
Write-Host ""
Write-Host "3. Archivos HTML de testing..." -ForegroundColor Yellow

$htmlTestFiles = @(
    "ELIMINAR-CLIENTE.html",
    "fix-client.html",
    "test-buyer-orders-preview.html",
    "test-order-animations.html",
    "test-signout.html"
)

foreach ($file in $htmlTestFiles) {
    Remove-FileIfExists $file
}

# ============================================================
# 4. SCRIPTS TYPESCRIPT DE TESTING
# ============================================================
Write-Host ""
Write-Host "4. Scripts TypeScript de testing..." -ForegroundColor Yellow

$tsTestFiles = @(
    "test-prisma.ts",
    "test-quotes-models.ts",
    "verify-prisma-types.ts"
)

foreach ($file in $tsTestFiles) {
    Remove-FileIfExists $file
}

# ============================================================
# 5. SCRIPTS POWERSHELL TEMPORALES
# ============================================================
Write-Host ""
Write-Host "5. Scripts PowerShell temporales..." -ForegroundColor Yellow

$psTemporaryFiles = @(
    "abrir-navegadores.ps1",
    "apply-recurring-orders-migration.ps1",
    "check-github-secrets.ps1",
    "check-workflow-status.ps1",
    "clean-rebuild.ps1",
    "cleanup-project.ps1",
    "clear-cache.ps1",
    "configure-github-secrets.ps1",
    "docker-build.ps1",
    "docker-start.ps1",
    "download-notification-sound.ps1",
    "fix-route-params.ps1",
    "get-clerk-keys.ps1",
    "get-vercel-secrets.ps1",
    "migrate-prod-simple.ps1",
    "migrate-production.ps1",
    "open-browsers.ps1",
    "restart-server.ps1",
    "setup-production-database.ps1",
    "start-crm.ps1",
    "start-simple.ps1"
)

foreach ($file in $psTemporaryFiles) {
    Remove-FileIfExists $file
}

# ============================================================
# 6. ARCHIVOS BAT TEMPORALES
# ============================================================
Write-Host ""
Write-Host "6. Archivos BAT temporales..." -ForegroundColor Yellow

Remove-FileIfExists "abrir-navegadores.bat"

# ============================================================
# 7. ARCHIVOS PYTHON TEMPORALES
# ============================================================
Write-Host ""
Write-Host "7. Archivos Python temporales..." -ForegroundColor Yellow

Remove-FileIfExists "apply-timeouts-frontend.py"

# ============================================================
# 8. DOCUMENTACIÓN OBSOLETA/TEMPORAL
# ============================================================
Write-Host ""
Write-Host "8. Documentación obsoleta/temporal..." -ForegroundColor Yellow

$mdObsoleteFiles = @(
    "ACCION_REQUERIDA_DATABASE.md",
    "ANALISIS_VALIDACIONES.md",
    "APLICAR_MIGRACION_ORDENES_RECURRENTES.md",
    "AUDIT_FINDINGS.md",
    "AUTENTICACION_MEJORADA.md",
    "AUTO_LINK_IMPLEMENTATION.md",
    "CHAT_FILE_UPLOAD_NOTIFICATION_SOUND.md",
    "CHAT_NUEVAS_FUNCIONALIDADES.md",
    "CHECK_WORKFLOW_STATUS.md",
    "CI_CD_PIPELINE.md",
    "CLIENTS_UI_IMPROVEMENTS.md",
    "CONEXION_VENDEDOR_COMPRADOR.md",
    "CONFIGURACION_URLS_SEPARADAS.md",
    "CONFIGURAR_CLERK_PRODUCCION.md",
    "CONFIGURAR_SECRETS_GITHUB_VERCEL.md",
    "CONFIGURAR_VERCEL_GITHUB_SECRETS.md",
    "CONFIGURAR_WEBHOOK_CLERK.md",
    "DEPLOYMENT.md",
    "DEVOPS.md",
    "DIAGNOSTICO_ERRORES_PRODUCCION.md",
    "DOCKER.md",
    "DOCKER_IMPLEMENTATION.md",
    "E2E_TESTING_BYPASS.md",
    "ESTRUCTURA_PROYECTO.md",
    "FIX_ES_MODULE_ERROR_DOMPURIFY.md",
    "FIX_MODO_VALIDACION_COMPLETADO.md",
    "FIX_PROJECT_NOT_FOUND_ERROR.md",
    "FUNCIONES_NO_IMPLEMENTADAS.md",
    "GITHUB_ACTIONS_QUICKSTART.md",
    "GITHUB_ACTIONS_SETUP.md",
    "GUIA_VISUAL_MONITOREO.md",
    "IMPLEMENTACION_COMPLETADA.md",
    "INSTRUCCIONES_SONIDO.md",
    "INTEGRACION_VISUAL_COMPLETADA.md",
    "LIMPIEZA_WARNINGS_PRODUCCION.md",
    "PIPELINE_COMPLETO_RESTAURADO.md",
    "PLAN_VALIDACION_100.md",
    "POR_QUE_VERCEL_DETECTO_ERROR_Y_GITHUB_NO.md",
    "PROGRESO_SESION.md",
    "PROPUESTA_MEJORAR_CI_CD_RUNTIME_ERRORS.md",
    "RECURRING_ORDERS_NOTIFICATIONS_FIX.md",
    "REINICIAR_SERVIDOR.md",
    "SENTRY_SETUP.md",
    "SISTEMA_COTIZACIONES_COMPLETADO.md",
    "SISTEMA_ORDENES_RECURRENTES_COMPLETO.md",
    "SOLUCION_ERRORES_PRODUCCION.md",
    "test-credit-protection.md",
    "TESTING_IMPLEMENTATION_STATUS.md",
    "TESTING_PLAN.md",
    "TESTING_README.md",
    "TESTING_STATUS.md",
    "TESTS_STATUS.md",
    "TODO_CONFIGURAR_SENTRY.md",
    "URLS_DE_ACCESO.md",
    "VALIDACIONES_IMPLEMENTADAS.md",
    "VALIDACIONES_PROGRESO.md",
    "VERCEL_DEPLOYMENT_GUIDE.md",
    "VERCEL_POSTGRES_BACKUPS.md"
)

foreach ($file in $mdObsoleteFiles) {
    Remove-FileIfExists $file
}

# ============================================================
# 9. ARCHIVOS DE CONFIGURACIÓN TEMPORALES
# ============================================================
Write-Host ""
Write-Host "9. Archivos de configuración temporales..." -ForegroundColor Yellow

$configTemporaryFiles = @(
    "COPIAR_A_VERCEL.txt",
    "GITHUB_SECRET_VALUE.txt",
    "VERCEL_ENV_VARS.txt",
    "build-output.log",
    "npm-dev.log"
)

foreach ($file in $configTemporaryFiles) {
    Remove-FileIfExists $file
}

# ============================================================
# 10. ARCHIVOS DOCKER OBSOLETOS (SI NO USAS DOCKER)
# ============================================================
Write-Host ""
Write-Host "10. Archivos Docker (¿los necesitas?)..." -ForegroundColor Yellow
Write-Host "    Omitiendo por seguridad. Si no usas Docker, elimínalos manualmente:" -ForegroundColor Gray
Write-Host "    - docker-compose.yml, docker-compose.dev.yml" -ForegroundColor DarkGray
Write-Host "    - Dockerfile, .dockerignore" -ForegroundColor DarkGray
Write-Host "    - docker-entrypoint.sh, health-check.sh" -ForegroundColor DarkGray

# ============================================================
# RESUMEN FINAL
# ============================================================
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  RESUMEN DE LIMPIEZA" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
$spaceMB = [math]::Round($totalSize/1MB, 2)
Write-Host "OK: Archivos eliminados: $deletedCount" -ForegroundColor Green
Write-Host "OK: Espacio liberado: $spaceMB MB" -ForegroundColor Green
Write-Host ""
Write-Host "ARCHIVOS IMPORTANTES QUE SE MANTIENEN:" -ForegroundColor Green
Write-Host "  OK: README.md (documentacion principal)" -ForegroundColor DarkGray
Write-Host "  OK: package.json, tsconfig.json" -ForegroundColor DarkGray
Write-Host "  OK: next.config.js, tailwind.config.js" -ForegroundColor DarkGray
Write-Host "  OK: middleware.ts" -ForegroundColor DarkGray
Write-Host "  OK: .env* (variables de entorno)" -ForegroundColor DarkGray
Write-Host "  OK: /app, /components, /lib, /prisma" -ForegroundColor DarkGray
Write-Host "  OK: /__tests__ (tests unitarios)" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Proyecto limpiado exitosamente!" -ForegroundColor Green
Write-Host ""

# Opcional: Hacer commit de los cambios
Write-Host "Deseas hacer commit de los cambios? (S/N): " -ForegroundColor Cyan -NoNewline
$commit = Read-Host

if ($commit -eq "S" -or $commit -eq "s") {
    Write-Host ""
    Write-Host "Haciendo commit..." -ForegroundColor Yellow
    git add .
    git commit -m "chore: Clean up debug scripts, temporary files and obsolete documentation"
    Write-Host "OK: Commit realizado" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "Deseas hacer push? (S/N): " -ForegroundColor Cyan -NoNewline
    $push = Read-Host
    
    if ($push -eq "S" -or $push -eq "s") {
        git push
        Write-Host "OK: Push realizado" -ForegroundColor Green
    }
}

Write-Host ""
Read-Host "Presiona Enter para continuar"
