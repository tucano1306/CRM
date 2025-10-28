# Script para actualizar archivos con formato de moneda correcto

$filesToUpdate = @(
    "components\products\ProductCard.tsx",
    "components\products\ProductModal.tsx",
    "components\orders\OrdersTimelineView.tsx",
    "components\recurring-orders\RecurringOrderDetailModal.tsx",
    "components\recurring-orders\RecurringOrdersManager.tsx",
    "components\recurring-orders\CreateRecurringOrderModal.tsx",
    "components\shared\NotificationBell.tsx",
    "app\dashboard\page.tsx",
    "app\buyer\cart\page.tsx",
    "app\stats\page.tsx"
)

foreach ($file in $filesToUpdate) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw -Encoding UTF8
        $originalContent = $content
        
        # Verificar si ya tiene el import
        if ($content -notmatch "formatPrice") {
            # Buscar el último import y agregarlo
            if ($content -match "(?s)(import\s+.*?from\s+['""][^'""]+['""]\s*)(?=\r?\n\r?\n|\r?\nexport|\r?\ntype|\r?\ninterface|\r?\nconst|\r?\nfunction)") {
                $lastImport = $matches[0]
                $content = $content -replace [regex]::Escape($lastImport), "$lastImport`nimport { formatPrice } from '@/lib/utils'"
            }
        }
        
        # Reemplazar patrones de formato
        $content = $content -replace '\$\{([^}]+?)\.toFixed\(2\)\}', '{formatPrice($1)}'
        $content = $content -replace '\$\{Number\(([^)]+)\)\.toFixed\(2\)\}', '{formatPrice($1)}'
        $content = $content -replace '"">\$\{([^}]+?)\.toFixed\(2\)\}</', '">{formatPrice($1)}</'
        
        if ($content -ne $originalContent) {
            Set-Content -Path $file -Value $content -Encoding UTF8 -NoNewline
            Write-Host "✅ Actualizado: $file" -ForegroundColor Green
        } else {
            Write-Host "ℹ️  Sin cambios: $file" -ForegroundColor Yellow
        }
    } else {
        Write-Host "⚠️  No encontrado: $file" -ForegroundColor Red
    }
}

Write-Host "`n✅ Proceso completado" -ForegroundColor Cyan
