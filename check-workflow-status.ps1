# ==============================================================================
# Script para verificar el estado del GitHub Actions workflow
# ==============================================================================

Write-Host "`n=== GitHub Actions Workflow Status Checker ===" -ForegroundColor Cyan
Write-Host "Este script verifica el estado del último workflow`n" -ForegroundColor Gray

# Verificar si gh CLI está instalado
$ghInstalled = Get-Command gh -ErrorAction SilentlyContinue

if (-not $ghInstalled) {
    Write-Host "GitHub CLI (gh) no esta instalado" -ForegroundColor Yellow
    Write-Host "`nPuedes verificar manualmente en:" -ForegroundColor White
    Write-Host "https://github.com/tucano1306/CRM/actions`n" -ForegroundColor Cyan
    
    Write-Host "O instalar GitHub CLI:" -ForegroundColor White
    Write-Host "winget install --id GitHub.cli`n" -ForegroundColor Gray
    exit
}

Write-Host "GitHub CLI detectado`n" -ForegroundColor Green

# Obtener información del último workflow
Write-Host "Obteniendo estado del ultimo workflow..." -ForegroundColor Cyan

try {
    $workflows = gh run list --limit 1 --json status,conclusion,name,createdAt,url,workflowName | ConvertFrom-Json
    
    if ($workflows.Count -gt 0) {
        $latest = $workflows[0]
        
        Write-Host "`n======================================================" -ForegroundColor Cyan
        Write-Host "              ULTIMO WORKFLOW EJECUTADO                   " -ForegroundColor Cyan
        Write-Host "======================================================`n" -ForegroundColor Cyan
        
        Write-Host "Nombre:    $($latest.workflowName)" -ForegroundColor White
        Write-Host "Estado:    " -NoNewline -ForegroundColor White
        
        switch ($latest.status) {
            "completed" { 
                Write-Host "Completado" -ForegroundColor Green 
                Write-Host "Resultado: " -NoNewline -ForegroundColor White
                switch ($latest.conclusion) {
                    "success" { Write-Host "EXITOSO" -ForegroundColor Green }
                    "failure" { Write-Host "FALLIDO" -ForegroundColor Red }
                    "cancelled" { Write-Host "CANCELADO" -ForegroundColor Yellow }
                    default { Write-Host $latest.conclusion -ForegroundColor Gray }
                }
            }
            "in_progress" { Write-Host "EN PROGRESO" -ForegroundColor Yellow }
            "queued" { Write-Host "EN COLA" -ForegroundColor Yellow }
            default { Write-Host $latest.status -ForegroundColor Gray }
        }
        
        Write-Host "Iniciado:  $($latest.createdAt)" -ForegroundColor White
        Write-Host "URL:       $($latest.url)" -ForegroundColor Cyan
        
        Write-Host "`n"
        
        # Si está en progreso, mostrar jobs
        if ($latest.status -eq "in_progress") {
            Write-Host "Jobs en ejecucion:" -ForegroundColor Cyan
            gh run view --log-failed
        }
        
        # Si falló, mostrar logs
        if ($latest.conclusion -eq "failure") {
            Write-Host "`nEl workflow fallo. Logs de errores:" -ForegroundColor Red
            Write-Host "----------------------------------------" -ForegroundColor Gray
            gh run view --log-failed
            
            Write-Host "`nPosibles soluciones:" -ForegroundColor Yellow
            Write-Host "   1. Verifica que configuraste el secret NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" -ForegroundColor White
            Write-Host "   2. Verifica los permisos de workflow (Read and write)" -ForegroundColor White
            Write-Host "   3. Re-ejecuta el workflow`n" -ForegroundColor White
        }
        
        if ($latest.conclusion -eq "success") {
            Write-Host "`nWorkflow completado exitosamente!" -ForegroundColor Green
            Write-Host "`nTu imagen Docker esta disponible en:" -ForegroundColor Cyan
            Write-Host "   ghcr.io/tucano1306/crm:latest`n" -ForegroundColor White
        }
        
    } else {
        Write-Host "No se encontraron workflows" -ForegroundColor Yellow
        Write-Host "Verifica manualmente en: https://github.com/tucano1306/CRM/actions`n" -ForegroundColor White
    }
    
} catch {
    Write-Host "Error al obtener informacion del workflow" -ForegroundColor Red
    Write-Host "   Mensaje: $($_.Exception.Message)" -ForegroundColor Gray
    Write-Host "`nVerifica manualmente en: https://github.com/tucano1306/CRM/actions`n" -ForegroundColor White
}
