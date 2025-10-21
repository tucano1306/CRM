# Test Script para Schedule APIs
# Ejecutar con: .\scripts\test-schedules.ps1

$ErrorActionPreference = "Continue"
$baseUrl = "http://localhost:3000"

# Colores para output
function Write-TestHeader {
    param($message)
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "  $message" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
}

function Write-TestName {
    param($message)
    Write-Host "`n$message" -ForegroundColor Yellow
}

function Write-Success {
    param($message)
    Write-Host "✓ $message" -ForegroundColor Green
}

function Write-Error {
    param($message)
    Write-Host "✗ $message" -ForegroundColor Red
}

function Write-Info {
    param($message)
    Write-Host "  $message" -ForegroundColor Gray
}

# Variables de test
$testSellerId = "550e8400-e29b-41d4-a716-446655440000"
$testResults = @{
    Passed = 0
    Failed = 0
    Total = 0
}

# ============================================================================
# TEST ORDER SCHEDULES
# ============================================================================

Write-TestHeader "Testing Order Schedules API"

# Test 1: GET sin sellerId
Write-TestName "Test 1: GET /api/order-schedules sin sellerId (debe fallar)"
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/order-schedules" -Method GET
    Write-Error "Debería haber fallado"
    $testResults.Failed++
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 400) {
        Write-Success "Error 400 esperado"
        $testResults.Passed++
    } else {
        Write-Error "Status code incorrecto: $($_.Exception.Response.StatusCode.value__)"
        $testResults.Failed++
    }
}
$testResults.Total++

# Test 2: POST crear schedule válido para MONDAY
Write-TestName "Test 2: POST crear schedule válido para MONDAY"
try {
    $body = @{
        sellerId = $testSellerId
        dayOfWeek = "MONDAY"
        startTime = "08:00"
        endTime = "17:00"
        isActive = $true
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/api/order-schedules" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body

    Write-Success "Schedule creado: $($response.message)"
    Write-Info "ID: $($response.schedule.id)"
    Write-Info "Día: $($response.schedule.dayOfWeek)"
    Write-Info "Horario: $($response.schedule.startTime) - $($response.schedule.endTime)"
    $testResults.Passed++
} catch {
    $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Error "Error al crear schedule: $($errorResponse.error)"
    $testResults.Failed++
}
$testResults.Total++

# Test 3: POST crear schedule para TUESDAY
Write-TestName "Test 3: POST crear schedule válido para TUESDAY"
try {
    $body = @{
        sellerId = $testSellerId
        dayOfWeek = "TUESDAY"
        startTime = "09:00"
        endTime = "18:00"
        isActive = $true
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/api/order-schedules" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body

    Write-Success "Schedule creado para TUESDAY"
    $testResults.Passed++
} catch {
    $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Error "Error: $($errorResponse.error)"
    $testResults.Failed++
}
$testResults.Total++

# Test 4: POST actualizar schedule existente (MONDAY)
Write-TestName "Test 4: POST actualizar schedule existente (upsert)"
try {
    $body = @{
        sellerId = $testSellerId
        dayOfWeek = "MONDAY"
        startTime = "07:00"  # Cambiado de 08:00
        endTime = "16:00"     # Cambiado de 17:00
        isActive = $true
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/api/order-schedules" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body

    if ($response.message -like "*actualizado*") {
        Write-Success "Schedule actualizado correctamente"
        Write-Info "Nuevo horario: $($response.schedule.startTime) - $($response.schedule.endTime)"
        $testResults.Passed++
    } else {
        Write-Error "Se esperaba mensaje de actualización"
        $testResults.Failed++
    }
} catch {
    $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Error "Error: $($errorResponse.error)"
    $testResults.Failed++
}
$testResults.Total++

# Test 5: POST con startTime > endTime (debe fallar)
Write-TestName "Test 5: POST con startTime > endTime (debe fallar)"
try {
    $body = @{
        sellerId = $testSellerId
        dayOfWeek = "WEDNESDAY"
        startTime = "18:00"
        endTime = "08:00"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/api/order-schedules" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body
    
    Write-Error "Debería haber fallado (startTime > endTime)"
    $testResults.Failed++
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 400) {
        $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Success "Error 400 esperado: $($errorResponse.error)"
        $testResults.Passed++
    } else {
        Write-Error "Status code incorrecto"
        $testResults.Failed++
    }
}
$testResults.Total++

# Test 6: POST con formato de tiempo inválido (debe fallar)
Write-TestName "Test 6: POST con formato de tiempo inválido (debe fallar)"
try {
    $body = @{
        sellerId = $testSellerId
        dayOfWeek = "WEDNESDAY"
        startTime = "8:00"  # Formato inválido (debe ser 08:00)
        endTime = "17:00"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/api/order-schedules" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body
    
    Write-Error "Debería haber fallado (formato inválido)"
    $testResults.Failed++
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 400) {
        Write-Success "Error 400 esperado (formato inválido)"
        $testResults.Passed++
    } else {
        Write-Error "Status code incorrecto"
        $testResults.Failed++
    }
}
$testResults.Total++

# Test 7: POST con dayOfWeek inválido (debe fallar)
Write-TestName "Test 7: POST con dayOfWeek inválido (debe fallar)"
try {
    $body = @{
        sellerId = $testSellerId
        dayOfWeek = "FUNDAY"  # No existe
        startTime = "08:00"
        endTime = "17:00"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/api/order-schedules" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body
    
    Write-Error "Debería haber fallado (dayOfWeek inválido)"
    $testResults.Failed++
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 400) {
        Write-Success "Error 400 esperado (dayOfWeek inválido)"
        $testResults.Passed++
    } else {
        Write-Error "Status code incorrecto"
        $testResults.Failed++
    }
}
$testResults.Total++

# Test 8: GET schedules del seller
Write-TestName "Test 8: GET schedules del seller"
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/order-schedules?sellerId=$testSellerId" -Method GET

    if ($response.success -and $response.schedules) {
        Write-Success "Schedules obtenidos: $($response.schedules.Count) schedule(s)"
        
        foreach ($schedule in $response.schedules) {
            Write-Info "$($schedule.dayOfWeek): $($schedule.startTime) - $($schedule.endTime) (Active: $($schedule.isActive))"
        }
        $testResults.Passed++
    } else {
        Write-Error "Respuesta inválida"
        $testResults.Failed++
    }
} catch {
    $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Error "Error: $($errorResponse.error)"
    $testResults.Failed++
}
$testResults.Total++

# Test 9: DELETE schedule (soft delete)
Write-TestName "Test 9: DELETE schedule para TUESDAY (soft delete)"
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/order-schedules?sellerId=$testSellerId&dayOfWeek=TUESDAY" `
        -Method DELETE

    Write-Success "Schedule eliminado: $($response.message)"
    $testResults.Passed++
} catch {
    $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Error "Error: $($errorResponse.error)"
    $testResults.Failed++
}
$testResults.Total++

# Test 10: Verificar que el schedule está inactivo
Write-TestName "Test 10: Verificar que TUESDAY está inactivo"
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/order-schedules?sellerId=$testSellerId" -Method GET

    $tuesdaySchedule = $response.schedules | Where-Object { $_.dayOfWeek -eq "TUESDAY" }
    
    if ($tuesdaySchedule -and !$tuesdaySchedule.isActive) {
        Write-Success "Schedule está marcado como inactivo"
        $testResults.Passed++
    } elseif (!$tuesdaySchedule) {
        Write-Success "Schedule no aparece en resultados (filtrado por isActive=true)"
        $testResults.Passed++
    } else {
        Write-Error "Schedule todavía aparece como activo"
        $testResults.Failed++
    }
} catch {
    Write-Error "Error al verificar: $($_.Exception.Message)"
    $testResults.Failed++
}
$testResults.Total++

# ============================================================================
# TEST CHAT SCHEDULES
# ============================================================================

Write-TestHeader "Testing Chat Schedules API"

# Test 11: POST crear chat schedule válido
Write-TestName "Test 11: POST crear chat schedule para MONDAY"
try {
    $body = @{
        sellerId = $testSellerId
        dayOfWeek = "MONDAY"
        startTime = "09:00"
        endTime = "18:00"
        isActive = $true
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/api/chat-schedules" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body

    Write-Success "Chat schedule creado: $($response.message)"
    Write-Info "Horario: $($response.schedule.startTime) - $($response.schedule.endTime)"
    $testResults.Passed++
} catch {
    $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Error "Error: $($errorResponse.error)"
    $testResults.Failed++
}
$testResults.Total++

# Test 12: GET chat schedules
Write-TestName "Test 12: GET chat schedules del seller"
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/chat-schedules?sellerId=$testSellerId" -Method GET

    if ($response.success -and $response.schedules) {
        Write-Success "Chat schedules obtenidos: $($response.schedules.Count) schedule(s)"
        
        foreach ($schedule in $response.schedules) {
            Write-Info "$($schedule.dayOfWeek): $($schedule.startTime) - $($schedule.endTime)"
        }
        $testResults.Passed++
    } else {
        Write-Error "Respuesta inválida"
        $testResults.Failed++
    }
} catch {
    $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Error "Error: $($errorResponse.error)"
    $testResults.Failed++
}
$testResults.Total++

# Test 13: DELETE chat schedule
Write-TestName "Test 13: DELETE chat schedule para MONDAY"
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/chat-schedules?sellerId=$testSellerId&dayOfWeek=MONDAY" `
        -Method DELETE

    Write-Success "Chat schedule eliminado: $($response.message)"
    $testResults.Passed++
} catch {
    $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Error "Error: $($errorResponse.error)"
    $testResults.Failed++
}
$testResults.Total++

# ============================================================================
# LIMPIAR SCHEDULES DE PRUEBA
# ============================================================================

Write-TestHeader "Limpieza"

Write-TestName "Eliminando schedules de prueba..."
try {
    # Eliminar ORDER schedule de MONDAY
    $null = Invoke-RestMethod -Uri "$baseUrl/api/order-schedules?sellerId=$testSellerId&dayOfWeek=MONDAY" `
        -Method DELETE -ErrorAction SilentlyContinue
    
    Write-Info "Schedules de prueba eliminados"
} catch {
    Write-Info "Algunos schedules ya estaban eliminados"
}

# ============================================================================
# RESUMEN
# ============================================================================

Write-TestHeader "Resumen de Tests"

Write-Host "`nTotal de tests: $($testResults.Total)" -ForegroundColor White
Write-Host "Pasados: $($testResults.Passed)" -ForegroundColor Green
Write-Host "Fallados: $($testResults.Failed)" -ForegroundColor Red

$successRate = [math]::Round(($testResults.Passed / $testResults.Total) * 100, 2)
Write-Host "`nTasa de éxito: $successRate%" -ForegroundColor $(if($successRate -eq 100) { "Green" } elseif($successRate -ge 80) { "Yellow" } else { "Red" })

if ($testResults.Failed -eq 0) {
    Write-Host "`n✓ Todos los tests pasaron exitosamente!" -ForegroundColor Green
} else {
    Write-Host "`n✗ Algunos tests fallaron. Revisar los detalles arriba." -ForegroundColor Red
}

Write-Host ""
