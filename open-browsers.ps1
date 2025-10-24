Write-Host "Abriendo navegadores para CRM..." -ForegroundColor Cyan
Write-Host ""

# URL de login
$url = "http://localhost:3000/sign-in"

# Abrir Edge para VENDEDOR
Write-Host "1. Abriendo Edge (VENDEDOR)..." -ForegroundColor Blue
& "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --new-window $url
Start-Sleep -Seconds 2

# Abrir Chrome Incognito para COMPRADOR  
Write-Host "2. Abriendo Chrome Incognito (COMPRADOR)..." -ForegroundColor Magenta
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --incognito --new-window $url

Write-Host ""
Write-Host "Navegadores abiertos!" -ForegroundColor Green
Write-Host ""
Write-Host "IMPORTANTE:" -ForegroundColor Yellow
Write-Host "- Edge: Inicia sesion como tucano0109@gmail.com (VENDEDOR)" -ForegroundColor Blue
Write-Host "- Chrome: Inicia sesion como l3oyucon1978@gmail.com (COMPRADOR)" -ForegroundColor Magenta
Write-Host ""
Write-Host "Despues del login:" -ForegroundColor Cyan
Write-Host "- Vendedor ira a: /products-modern" -ForegroundColor Blue
Write-Host "- Comprador ira a: /buyer/dashboard" -ForegroundColor Magenta
