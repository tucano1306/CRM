# Script para probar el Cron Job de auto-confirmación localmente
# Uso: .\test-cron-local.ps1

Write-Host "🧪 Probando Auto-Confirmación de Órdenes..." -ForegroundColor Cyan
Write-Host ""

# Configuración
$BaseUrl = "http://localhost:3000"
$CronSecret = "your-secret-key-here"  # Cambiar por tu CRON_SECRET

# 1. Verificar que el servidor esté corriendo
Write-Host "1️⃣  Verificando servidor..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$BaseUrl/api/health" -Method GET -ErrorAction SilentlyContinue
    Write-Host "   ✅ Servidor está corriendo" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Servidor NO está corriendo en $BaseUrl" -ForegroundColor Red
    Write-Host "   💡 Ejecuta: npm run dev" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# 2. Llamar al endpoint del cron
Write-Host "2️⃣  Ejecutando Cron Job..." -ForegroundColor Yellow
try {
    $headers = @{
        "Authorization" = "Bearer $CronSecret"
        "Content-Type" = "application/json"
    }
    
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/cron/confirm-orders" -Method GET -Headers $headers
    
    Write-Host "   ✅ Cron ejecutado exitosamente" -ForegroundColor Green
    Write-Host ""
    Write-Host "   📊 Resultados:" -ForegroundColor Cyan
    Write-Host "   - Mensaje: $($response.message)" -ForegroundColor White
    Write-Host "   - Órdenes confirmadas: $($response.confirmedCount)" -ForegroundColor White
    Write-Host "   - Timestamp: $($response.timestamp)" -ForegroundColor White
    
    if ($response.orders -and $response.orders.Count -gt 0) {
        Write-Host ""
        Write-Host "   📦 Órdenes confirmadas:" -ForegroundColor Cyan
        foreach ($order in $response.orders) {
            Write-Host "      • $($order.orderNumber) - $$($order.totalAmount)" -ForegroundColor Green
        }
    }
    
} catch {
    Write-Host "   ❌ Error ejecutando cron" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.ErrorDetails) {
        $errorJson = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "   Detalles: $($errorJson.error)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "✅ Test completado" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Próximos pasos:" -ForegroundColor Yellow
Write-Host "   1. Verificar en la base de datos que las órdenes cambiaron a PLACED" -ForegroundColor White
Write-Host "   2. Revisar los logs del servidor para eventos emitidos" -ForegroundColor White
Write-Host "   3. Ejecutar: npm run prisma:studio para ver los datos" -ForegroundColor White
