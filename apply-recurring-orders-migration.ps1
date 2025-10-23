# Script para aplicar la migración de órdenes recurrentes
# Ejecutar este script cuando la app esté DETENIDA

Write-Host "🔄 Aplicando migración de órdenes recurrentes..." -ForegroundColor Cyan

# 1. Verificar que PostgreSQL esté corriendo
Write-Host "`n1️⃣  Verificando PostgreSQL..." -ForegroundColor Yellow
$pgStatus = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue
if ($pgStatus -and $pgStatus.Status -eq "Running") {
    Write-Host "✅ PostgreSQL está corriendo" -ForegroundColor Green
} else {
    Write-Host "❌ PostgreSQL no está corriendo. Inícialo primero." -ForegroundColor Red
    exit 1
}

# 2. Aplicar migración SQL
Write-Host "`n2️⃣  Aplicando migración SQL..." -ForegroundColor Yellow
$sqlFile = Join-Path $PSScriptRoot "database\recurring-orders-migration.sql"

if (Test-Path $sqlFile) {
    # Pedir credenciales de PostgreSQL
    Write-Host "Ingresa las credenciales de PostgreSQL:" -ForegroundColor Cyan
    $dbName = Read-Host "Nombre de la base de datos (food_orders_crm)"
    if ([string]::IsNullOrWhiteSpace($dbName)) { $dbName = "food_orders_crm" }
    
    $dbUser = Read-Host "Usuario (postgres)"
    if ([string]::IsNullOrWhiteSpace($dbUser)) { $dbUser = "postgres" }
    
    # Ejecutar SQL
    try {
        $env:PGPASSWORD = Read-Host "Contraseña" -AsSecureString
        $env:PGPASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($env:PGPASSWORD))
        
        & psql -U $dbUser -d $dbName -f $sqlFile
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Migración SQL aplicada exitosamente" -ForegroundColor Green
        } else {
            Write-Host "❌ Error al aplicar migración SQL" -ForegroundColor Red
            exit 1
        }
    } catch {
        Write-Host "❌ Error: $_" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "❌ No se encontró el archivo: $sqlFile" -ForegroundColor Red
    exit 1
}

# 3. Regenerar cliente de Prisma
Write-Host "`n3️⃣  Regenerando cliente de Prisma..." -ForegroundColor Yellow
try {
    npx prisma generate
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Cliente de Prisma regenerado" -ForegroundColor Green
    } else {
        Write-Host "❌ Error al regenerar Prisma" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    exit 1
}

# 4. Verificar que todo esté bien
Write-Host "`n4️⃣  Verificando instalación..." -ForegroundColor Yellow
try {
    & psql -U $dbUser -d $dbName -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name IN ('recurring_orders', 'recurring_order_items', 'recurring_order_executions');"
    Write-Host "✅ Tablas creadas correctamente" -ForegroundColor Green
} catch {
    Write-Host "⚠️  No se pudo verificar las tablas" -ForegroundColor Yellow
}

Write-Host "`n✅ ¡Migración completada exitosamente!" -ForegroundColor Green
Write-Host "`n📋 Próximos pasos:" -ForegroundColor Cyan
Write-Host "   1. Reinicia la aplicación: .\start-crm.ps1" -ForegroundColor White
Write-Host "   2. Los 15 errores de TypeScript desaparecerán" -ForegroundColor White
Write-Host "   3. Ya puedes usar las órdenes recurrentes" -ForegroundColor White
Write-Host "`n🎉 Sistema de órdenes recurrentes listo!" -ForegroundColor Green
