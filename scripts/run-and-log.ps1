<#
run-and-log.ps1
Wrapper que ejecuta start-crm.ps1 y vuelca stdout+stderr a terminal.log
Usage:
  - Foreground: .\scripts\run-and-log.ps1 -Foreground
  - Background (recommended): Start-Job -ScriptBlock { & '...\scripts\run-and-log.ps1' }
#>
param(
    [switch]$Foreground
)

# Determina rutas
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$repoRoot = Resolve-Path (Join-Path $scriptDir "..")
$repoRootPath = $repoRoot.Path
$logPath = Join-Path $repoRootPath 'terminal.log'
$startScript = Join-Path $repoRootPath 'start-crm.ps1'

# Asegura que el script de arranque existe
if (-not (Test-Path $startScript)) {
    Write-Error "No se encontró $startScript. Asegúrate de ejecutar esto desde el repo correcto."
    exit 1
}

# Borra log viejo
Remove-Item $logPath -ErrorAction SilentlyContinue
Write-Host "Iniciando servicio. Log: $logPath"

# Ejecuta y redirige salida
if ($Foreground) {
    & $startScript 2>&1 | Tee-Object -FilePath $logPath
} else {
    # En background (Start-Job) este proceso se quedará escribiendo en el log
    & $startScript 2>&1 | Tee-Object -FilePath $logPath
}
