# Script de Testing para CORS
# Verifica que los headers CORS estén configurados correctamente

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "🧪 CORS TESTING SCRIPT" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Configuración
$BASE_URL = "http://localhost:3000"
$ALLOWED_ORIGIN = "http://localhost:3001"
$BLOCKED_ORIGIN = "http://malicious-site.com"

Write-Host "📋 Configuración:" -ForegroundColor Yellow
Write-Host "  Base URL: $BASE_URL"
Write-Host "  Origen permitido: $ALLOWED_ORIGIN"
Write-Host "  Origen bloqueado: $BLOCKED_ORIGIN`n"

# ============================================================================
# TEST 1: Preflight Request (OPTIONS) desde origen permitido
# ============================================================================
Write-Host "`n========================================" -ForegroundColor Green
Write-Host "TEST 1: Preflight Request (OPTIONS)" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Endpoint: $BASE_URL/api/clients"
Write-Host "Origin: $ALLOWED_ORIGIN`n"

$response = curl.exe -X OPTIONS "$BASE_URL/api/clients" `
  -H "Origin: $ALLOWED_ORIGIN" `
  -H "Access-Control-Request-Method: POST" `
  -H "Access-Control-Request-Headers: content-type,authorization" `
  -i -s

Write-Host $response

# Verificar headers importantes
if ($response -match "Access-Control-Allow-Origin") {
    Write-Host "`n✅ Access-Control-Allow-Origin presente" -ForegroundColor Green
} else {
    Write-Host "`n❌ Access-Control-Allow-Origin NO encontrado" -ForegroundColor Red
}

if ($response -match "Access-Control-Allow-Methods") {
    Write-Host "✅ Access-Control-Allow-Methods presente" -ForegroundColor Green
} else {
    Write-Host "❌ Access-Control-Allow-Methods NO encontrado" -ForegroundColor Red
}

if ($response -match "Access-Control-Allow-Credentials") {
    Write-Host "✅ Access-Control-Allow-Credentials presente" -ForegroundColor Green
} else {
    Write-Host "❌ Access-Control-Allow-Credentials NO encontrado" -ForegroundColor Red
}

# ============================================================================
# TEST 2: GET Request desde origen permitido
# ============================================================================
Write-Host "`n========================================" -ForegroundColor Green
Write-Host "TEST 2: GET Request desde Origen Permitido" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Endpoint: $BASE_URL/api/clients"
Write-Host "Origin: $ALLOWED_ORIGIN`n"

$response = curl.exe -X GET "$BASE_URL/api/clients?page=1&limit=5" `
  -H "Origin: $ALLOWED_ORIGIN" `
  -i -s

Write-Host $response

if ($response -match "Access-Control-Allow-Origin: $ALLOWED_ORIGIN") {
    Write-Host "`n✅ Origen permitido correcto" -ForegroundColor Green
} else {
    Write-Host "`n⚠️  Verificar Access-Control-Allow-Origin" -ForegroundColor Yellow
}

# ============================================================================
# TEST 3: Request desde origen NO permitido
# ============================================================================
Write-Host "`n========================================" -ForegroundColor Yellow
Write-Host "TEST 3: Request desde Origen NO Permitido" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "Endpoint: $BASE_URL/api/clients"
Write-Host "Origin: $BLOCKED_ORIGIN`n"

$response = curl.exe -X GET "$BASE_URL/api/clients" `
  -H "Origin: $BLOCKED_ORIGIN" `
  -i -s

Write-Host $response

if ($response -notmatch "Access-Control-Allow-Origin: $BLOCKED_ORIGIN") {
    Write-Host "`n✅ Origen bloqueado correctamente (no tiene header CORS)" -ForegroundColor Green
} else {
    Write-Host "`n❌ PELIGRO: Origen malicioso tiene acceso CORS" -ForegroundColor Red
}

# ============================================================================
# TEST 4: Verificar headers expuestos
# ============================================================================
Write-Host "`n========================================" -ForegroundColor Green
Write-Host "TEST 4: Headers Expuestos (Rate Limiting)" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

$response = curl.exe -X GET "$BASE_URL/api/clients" `
  -H "Origin: $ALLOWED_ORIGIN" `
  -i -s

if ($response -match "Access-Control-Expose-Headers") {
    Write-Host "✅ Access-Control-Expose-Headers presente" -ForegroundColor Green
    
    if ($response -match "X-RateLimit-Limit") {
        Write-Host "✅ Rate limit headers expuestos" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Rate limit headers no expuestos explícitamente" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  Access-Control-Expose-Headers no configurado" -ForegroundColor Yellow
}

# ============================================================================
# TEST 5: Métodos HTTP permitidos
# ============================================================================
Write-Host "`n========================================" -ForegroundColor Green
Write-Host "TEST 5: Métodos HTTP Permitidos" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

$response = curl.exe -X OPTIONS "$BASE_URL/api/clients" `
  -H "Origin: $ALLOWED_ORIGIN" `
  -H "Access-Control-Request-Method: DELETE" `
  -i -s

if ($response -match "DELETE") {
    Write-Host "✅ DELETE permitido" -ForegroundColor Green
} else {
    Write-Host "❌ DELETE NO permitido" -ForegroundColor Red
}

if ($response -match "PATCH") {
    Write-Host "✅ PATCH permitido" -ForegroundColor Green
} else {
    Write-Host "❌ PATCH NO permitido" -ForegroundColor Red
}

# ============================================================================
# TEST 6: Max-Age (Cache de preflight)
# ============================================================================
Write-Host "`n========================================" -ForegroundColor Green
Write-Host "TEST 6: Max-Age (Cache de Preflight)" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

$response = curl.exe -X OPTIONS "$BASE_URL/api/clients" `
  -H "Origin: $ALLOWED_ORIGIN" `
  -i -s

if ($response -match "Access-Control-Max-Age: (\d+)") {
    $maxAge = $matches[1]
    $hours = [math]::Round($maxAge / 3600, 2)
    Write-Host "✅ Max-Age configurado: $maxAge segundos ($hours horas)" -ForegroundColor Green
} else {
    Write-Host "⚠️  Max-Age no configurado (preflight en cada request)" -ForegroundColor Yellow
}

# ============================================================================
# RESUMEN
# ============================================================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "📊 RESUMEN DE TESTS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`nVerifica manualmente:" -ForegroundColor Yellow
Write-Host "  1. Access-Control-Allow-Origin está presente en responses" -ForegroundColor White
Write-Host "  2. Orígenes permitidos tienen acceso, bloqueados no" -ForegroundColor White
Write-Host "  3. Headers de rate limiting están expuestos" -ForegroundColor White
Write-Host "  4. Métodos HTTP necesarios están permitidos" -ForegroundColor White
Write-Host "  5. Max-Age está configurado (86400 = 24h)" -ForegroundColor White

Write-Host "`n⚠️  Nota: Si el servidor no está corriendo, inicia con: npm run dev`n" -ForegroundColor Yellow

# ============================================================================
# TEST OPCIONAL: Frontend Integration Test
# ============================================================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "🌐 TEST OPCIONAL: Frontend Integration" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host @"

Para testear desde un navegador:

1. Abre la consola del navegador en http://localhost:3001
2. Ejecuta este código:

fetch('http://localhost:3000/api/clients', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  },
  credentials: 'include'
})
  .then(res => res.json())
  .then(data => console.log('✅ CORS funciona:', data))
  .catch(err => console.error('❌ Error CORS:', err))

3. Verifica en Network tab que las headers CORS estén presentes.

"@ -ForegroundColor White

Write-Host "`n========================================`n" -ForegroundColor Cyan
