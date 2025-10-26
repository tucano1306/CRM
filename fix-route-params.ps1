# Script para corregir tipos de parámetros en rutas de Next.js 15
# En Next.js 15, los params deben ser Promise<{...}>

$files = @(
    "app\api\orders\[id]\placed\route.tsx",
    "app\api\orders\[id]\confirm\route.tsx",
    "app\api\orders\[id]\cancel\route.tsx",
    "app\api\orders\[id]\complete\route.tsx",
    "app\api\orders\[id]\items\route.tsx",
    "app\api\clients\[id]\orders\route.ts",
    "app\api\buyer\favorites\[productId]\route.ts",
    "app\api\products\[id]\related\route.ts",
    "app\api\notifications\[id]\route.ts"
)

foreach ($file in $files) {
    $fullPath = Join-Path $PSScriptRoot $file
    
    if (Test-Path $fullPath) {
        Write-Host "Procesando: $file" -ForegroundColor Yellow
        
        $content = Get-Content $fullPath -Raw
        
        # Patrón 1: { params }: { params: { id: string } }
        $content = $content -replace '\{ params \}: \{ params: \{ id: string \} \}', '{ params }: { params: Promise<{ id: string }> }'
        
        # Patrón 2: { params }: { params: { productId: string } }
        $content = $content -replace '\{ params \}: \{ params: \{ productId: string \} \}', '{ params }: { params: Promise<{ productId: string }> }'
        
        # Patrón 3: params.id (necesita await)
        $content = $content -replace '(const \w+ = )params\.id', '$1(await params).id'
        $content = $content -replace '(const \w+ = )params\.productId', '$1(await params).productId'
        
        # Guardar cambios
        Set-Content -Path $fullPath -Value $content -NoNewline
        Write-Host "✓ Actualizado: $file" -ForegroundColor Green
    } else {
        Write-Host "✗ No encontrado: $file" -ForegroundColor Red
    }
}

Write-Host "`n¡Completado!" -ForegroundColor Cyan
