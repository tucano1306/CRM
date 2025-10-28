# Script para descargar sonido de notificacion de ejemplo
# Descarga un sonido simple de notificacion desde una fuente publica

$soundUrl = "https://notificationsounds.com/soundfiles/d1fe173d08e959397adf34b1d77e88d7/file-sounds-1150-pristine.mp3"
$destinationPath = Join-Path $PSScriptRoot "public\notification.mp3"

Write-Host "Descargando sonido de notificacion..." -ForegroundColor Cyan

try {
    # Descargar archivo
    Invoke-WebRequest -Uri $soundUrl -OutFile $destinationPath -ErrorAction Stop
    
    Write-Host "Sonido descargado exitosamente!" -ForegroundColor Green
    Write-Host "Ubicacion: $destinationPath" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "El chat ahora reproducira sonido cuando lleguen mensajes nuevos." -ForegroundColor White
    
} catch {
    Write-Host "Error al descargar el sonido automaticamente." -ForegroundColor Red
    Write-Host ""
    Write-Host "Por favor, descarga manualmente:" -ForegroundColor Yellow
    Write-Host "1. Visita: https://notificationsounds.com/" -ForegroundColor Cyan
    Write-Host "2. Descarga un sonido corto (1-2 segundos)" -ForegroundColor Cyan
    Write-Host "3. Renombralo a notification.mp3" -ForegroundColor Cyan
    Write-Host "4. Colocalo en: $destinationPath" -ForegroundColor Cyan
}

Write-Host ""
Read-Host "Presiona Enter para continuar"
