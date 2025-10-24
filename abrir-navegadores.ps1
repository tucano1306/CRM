Write-Host "Abriendo navegadores..." -ForegroundColor Cyan

# URL de login
$url = "http://localhost:3000/sign-in"

# Abrir Edge para VENDEDOR
Write-Host "1. Abriendo Edge (VENDEDOR)..." -ForegroundColor Blue
Start-Process "microsoft-edge:$url"

Start-Sleep -Seconds 2

# Abrir Chrome Incognito para COMPRADOR  
Write-Host "2. Abriendo Chrome Incognito (COMPRADOR)..." -ForegroundColor Magenta
$chromeExe = "C:\Program Files\Google\Chrome\Application\chrome.exe"
if (Test-Path $chromeExe) {
    & $chromeExe --incognito --new-window $url
} else {
    $chromeExe = "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
    if (Test-Path $chromeExe) {
        & $chromeExe --incognito --new-window $url
    } else {
        Write-Host "Chrome no encontrado, abre manualmente: $url" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Navegadores abiertos!" -ForegroundColor Green
Write-Host ""
Write-Host "VENDEDOR (Edge): tucano0109@gmail.com -> /products" -ForegroundColor Blue
Write-Host "COMPRADOR (Chrome): l3oyucon1978@gmail.com -> /buyer/dashboard" -ForegroundColor Magenta
