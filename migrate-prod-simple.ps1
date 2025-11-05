# Script simplificado para ejecutar migraciones de Prisma en producción
# Ejecutar desde la raíz del proyecto

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Migrar Base de Datos de Produccion" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Paso 1: Descargar variables de entorno
Write-Host "Paso 1: Descargando variables de entorno..." -ForegroundColor Yellow
vercel env pull .env.production.local --environment=production --yes

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error descargando variables. Asegurate de estar logeado: vercel login" -ForegroundColor Red
    exit 1
}

Write-Host "Variables descargadas exitosamente" -ForegroundColor Green
Write-Host ""

# Paso 2: Confirmar
Write-Host "ADVERTENCIA: Vas a ejecutar migraciones en PRODUCCION" -ForegroundColor Yellow
$confirm = Read-Host "Deseas continuar? (S/N)"

if ($confirm -ne "S" -and $confirm -ne "s") {
    Write-Host "Operacion cancelada" -ForegroundColor Gray
    Remove-Item ".env.production.local" -Force -ErrorAction SilentlyContinue
    exit 0
}

Write-Host ""

# Paso 3: Generar Prisma Client
Write-Host "Paso 2: Generando Prisma Client..." -ForegroundColor Yellow
npx prisma generate --schema=./prisma/schema.prisma

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error generando Prisma Client" -ForegroundColor Red
    Remove-Item ".env.production.local" -Force -ErrorAction SilentlyContinue
    exit 1
}

Write-Host "Prisma Client generado" -ForegroundColor Green
Write-Host ""

# Paso 4: Ejecutar migraciones
Write-Host "Paso 3: Ejecutando migraciones..." -ForegroundColor Yellow
Write-Host ""

# Leer DATABASE_URL del archivo
$envLines = Get-Content ".env.production.local"
$databaseUrl = ""

foreach ($line in $envLines) {
    if ($line -like "DATABASE_URL=*") {
        $databaseUrl = $line -replace "DATABASE_URL=", "" -replace '"', ''
        break
    }
}

if ([string]::IsNullOrWhiteSpace($databaseUrl)) {
    Write-Host "ERROR: No se encontro DATABASE_URL en las variables de entorno" -ForegroundColor Red
    Write-Host ""
    Write-Host "SOLUCION:" -ForegroundColor Yellow
    Write-Host "1. Ve a Vercel Dashboard -> Storage" -ForegroundColor White
    Write-Host "2. Crea una base de datos Postgres" -ForegroundColor White
    Write-Host "3. Conectala al proyecto" -ForegroundColor White
    Write-Host ""
    Remove-Item ".env.production.local" -Force -ErrorAction SilentlyContinue
    exit 1
}

# Establecer variable de entorno temporalmente
$env:DATABASE_URL = $databaseUrl

# Ejecutar migraciones
npx prisma migrate deploy

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Error ejecutando migraciones" -ForegroundColor Red
    Remove-Item Env:\DATABASE_URL -ErrorAction SilentlyContinue
    Remove-Item ".env.production.local" -Force -ErrorAction SilentlyContinue
    exit 1
}

Write-Host ""
Write-Host "Migraciones ejecutadas exitosamente!" -ForegroundColor Green
Write-Host ""

# Paso 5: Opcional - Seed
Write-Host "Deseas poblar la base de datos con datos de prueba? (S/N)" -ForegroundColor Yellow
$seedConfirm = Read-Host

if ($seedConfirm -eq "S" -or $seedConfirm -eq "s") {
    Write-Host ""
    Write-Host "Ejecutando seed..." -ForegroundColor Yellow
    npx prisma db seed
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Datos de prueba insertados" -ForegroundColor Green
    } else {
        Write-Host "Error ejecutando seed (opcional)" -ForegroundColor Yellow
    }
}

# Limpiar
Remove-Item Env:\DATABASE_URL -ErrorAction SilentlyContinue
Remove-Item ".env.production.local" -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  MIGRACIONES COMPLETADAS" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Proximos pasos:" -ForegroundColor Cyan
Write-Host "1. Ve a tu aplicacion en Vercel" -ForegroundColor White
Write-Host "2. Verifica que no hay errores 500" -ForegroundColor White
Write-Host "3. Prueba login y funcionalidad basica" -ForegroundColor White
Write-Host ""
Write-Host "URL: https://food-order-od8gotayl-tucano0109-5495s-projects.vercel.app" -ForegroundColor Blue
Write-Host ""
