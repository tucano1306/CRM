@echo off
echo ========================================
echo   Abriendo navegadores para CRM
echo ========================================
echo.

set URL=http://localhost:3000/sign-in

echo [1/2] Abriendo Edge para VENDEDOR...
start msedge %URL%

timeout /t 2 /nobreak >nul

echo [2/2] Abriendo Chrome Incognito para COMPRADOR...
start chrome --incognito --new-window %URL%

echo.
echo ========================================
echo   Navegadores abiertos!
echo ========================================
echo.
echo VENDEDOR (Edge): tucano0109@gmail.com
echo   - Ira a: /products (con sistema de tags)
echo.
echo COMPRADOR (Chrome): l3oyucon1978@gmail.com
echo   - Ira a: /buyer/dashboard
echo.
pause
