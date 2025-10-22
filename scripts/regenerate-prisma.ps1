# Script para regenerar el cliente de Prisma
# Ejecutar cuando el servidor Next.js NO esté corriendo

Write-Host "🔄 Regenerando cliente de Prisma..." -ForegroundColor Cyan
Write-Host ""

# Verificar que no haya procesos de node corriendo
$nodeProcesses = Get-Process node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "⚠️  Hay procesos de Node.js corriendo." -ForegroundColor Yellow
    Write-Host "   Se recomienda detenerlos antes de continuar." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Procesos encontrados:" -ForegroundColor Yellow
    $nodeProcesses | Format-Table Id, ProcessName, CPU -AutoSize
    Write-Host ""
    
    $response = Read-Host "¿Deseas continuar de todas formas? (s/N)"
    if ($response -ne "s" -and $response -ne "S") {
        Write-Host "❌ Operación cancelada" -ForegroundColor Red
        exit 1
    }
}

Write-Host "📦 Generando cliente de Prisma..." -ForegroundColor Green

try {
    npx prisma generate
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Cliente de Prisma generado exitosamente" -ForegroundColor Green
        Write-Host ""
        Write-Host "El modelo OrderStatusHistory ahora está disponible." -ForegroundColor Cyan
        Write-Host "Puedes usar:" -ForegroundColor Cyan
        Write-Host "  - prisma.orderStatusHistory.create()" -ForegroundColor White
        Write-Host "  - prisma.orderStatusHistory.findMany()" -ForegroundColor White
        Write-Host "  - prisma.orderStatusHistory.findUnique()" -ForegroundColor White
        Write-Host "  - etc." -ForegroundColor White
        Write-Host ""
        Write-Host "Ver documentación en: docs/ORDER_STATUS_AUDIT.md" -ForegroundColor Cyan
    } else {
        Write-Host ""
        Write-Host "❌ Error al generar el cliente de Prisma" -ForegroundColor Red
        exit $LASTEXITCODE
    }
} catch {
    Write-Host ""
    Write-Host "❌ Error: $_" -ForegroundColor Red
    exit 1
}
