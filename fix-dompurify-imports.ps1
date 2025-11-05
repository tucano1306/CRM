# Fix isomorphic-dompurify imports across all API routes
# Replace with centralized sanitization utility

$filesToFix = @(
    "app\api\orders\[id]\complete\route.tsx",
    "app\api\orders\[id]\route.tsx",
    "app\api\upload\route.ts",
    "app\api\orders\[id]\confirm\route.tsx",
    "app\api\products\[id]\route.ts",
    "app\api\orders\[id]\cancel\route.tsx",
    "app\api\products\[id]\tags\route.ts",
    "app\api\products\[id]\history\route.ts",
    "app\api\products\route.tsx",
    "app\api\sellers\route.tsx",
    "app\api\recurring-orders\route.ts",
    "app\api\returns\route.ts",
    "app\api\recurring-orders\[id]\route.ts",
    "app\api\returns\[id]\reject\route.ts",
    "app\api\returns\[id]\approve\route.ts",
    "app\api\quotes\route.ts",
    "app\api\quotes\[id]\route.ts",
    "app\api\clients\[id]\route.ts",
    "app\api\clients\route.tsx",
    "app\api\buyer\orders\route.tsx",
    "app\api\buyer\coupons\validate\route.ts"
)

$oldImport = "import DOMPurify from 'isomorphic-dompurify'"
$newImport = "import { sanitizeText } from '@/lib/sanitize'"

$oldUsage1 = "DOMPurify.sanitize("
$newUsage1 = "sanitizeText("

$oldUsage2 = ".trim())"
$newUsage2 = ")"

$filesUpdated = 0
$errors = @()

foreach ($file in $filesToFix) {
    try {
        $fullPath = Join-Path $PSScriptRoot $file
        
        if (Test-Path $fullPath) {
            $content = Get-Content $fullPath -Raw
            
            # Replace import
            $updated = $content -replace [regex]::Escape($oldImport), $newImport
            
            # Replace usage patterns
            $updated = $updated -replace 'DOMPurify\.sanitize\(([^)]+)\.trim\(\)\)', 'sanitizeText($1)'
            $updated = $updated -replace 'DOMPurify\.sanitize\(([^)]+)\)', 'sanitizeText($1)'
            
            if ($updated -ne $content) {
                Set-Content -Path $fullPath -Value $updated -NoNewline
                Write-Host "✅ Updated: $file" -ForegroundColor Green
                $filesUpdated++
            } else {
                Write-Host "⚠️  No changes needed: $file" -ForegroundColor Yellow
            }
        } else {
            Write-Host "❌ File not found: $file" -ForegroundColor Red
            $errors += $file
        }
    } catch {
        Write-Host "❌ Error processing $file : $_" -ForegroundColor Red
        $errors += $file
    }
}

Write-Host "`n📊 Summary:" -ForegroundColor Cyan
Write-Host "  Files updated: $filesUpdated" -ForegroundColor Green
Write-Host "  Files with errors: $($errors.Count)" -ForegroundColor $(if ($errors.Count -eq 0) { 'Green' } else { 'Red' })

if ($errors.Count -gt 0) {
    Write-Host "`n⚠️  Errors in:" -ForegroundColor Yellow
    $errors | ForEach-Object { Write-Host "  - $_" }
}

Write-Host "`nNext step: Run npm run build to verify changes" -ForegroundColor Cyan
