# Script para ejecutar migraciones de Prisma en producción de Vercel
# Ejecutar desde la raíz del proyecto

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🗄️  Migrar Base de Datos de Producción" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que Prisma está instalado
if (-not (Get-Command prisma -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Prisma CLI no está instalado" -ForegroundColor Red
    Write-Host "   Instala con: npm install -g prisma" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host "✅ Prisma CLI encontrado" -ForegroundColor Green
Write-Host ""

# Paso 1: Descargar variables de entorno de producción
Write-Host "📋 Paso 1: Descargando variables de entorno de producción..." -ForegroundColor Cyan
Write-Host ""

try {
    vercel env pull .env.production.local --environment=production --yes
    Write-Host "   ✅ Variables descargadas a .env.production.local" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Error descargando variables de entorno" -ForegroundColor Red
    Write-Host "   Asegúrate de haber ejecutado 'vercel login'" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Paso 2: Cargar DATABASE_URL
Write-Host "📋 Paso 2: Cargando DATABASE_URL..." -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path ".env.production.local")) {
    Write-Host "   ❌ Archivo .env.production.local no encontrado" -ForegroundColor Red
    exit 1
}

# Leer el archivo y extraer DATABASE_URL
$envContent = Get-Content ".env.production.local" -Raw
$dbUrlPattern = 'DATABASE_URL=(.+)'
if ($envContent -match $dbUrlPattern) {
    $dbUrl = $matches[1].Trim().Trim('"')
    Write-Host "   ✅ DATABASE_URL encontrado" -ForegroundColor Green
    
    # Mostrar info de la BD sin password
    if ($dbUrl -match 'postgres') {
        Write-Host ""
        Write-Host "   📊 Información de la Base de Datos:" -ForegroundColor Gray
        $hostPattern = '@([^/]+)/'
        $userPattern = 'postgres://([^:]+):'
        $dbPattern = '/([^\?]+)'
        
        if ($dbUrl -match $userPattern) {
            $dbUser = $matches[1]
            Write-Host "      Usuario: $dbUser" -ForegroundColor White
        }
        if ($dbUrl -match $hostPattern) {
            $dbHost = $matches[1]
            Write-Host "      Host: $dbHost" -ForegroundColor White
        }
        if ($dbUrl -match $dbPattern) {
            $dbName = $matches[1]
            Write-Host "      Database: $dbName" -ForegroundColor White
        }
    }
} else {
    Write-Host "   ❌ DATABASE_URL no encontrado en .env.production.local" -ForegroundColor Red
    Write-Host ""
    Write-Host "   🔧 SOLUCIÓN:" -ForegroundColor Yellow
    Write-Host "   1. Ve a Vercel Dashboard → Storage" -ForegroundColor White
    Write-Host "   2. Crea una base de datos Postgres" -ForegroundColor White
    Write-Host "   3. Conéctala al proyecto food-order-crm" -ForegroundColor White
    Write-Host "   4. Vuelve a ejecutar este script" -ForegroundColor White
    Write-Host ""
    exit 1
}
Write-Host ""

# Paso 3: Confirmar con el usuario
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "⚠️  ADVERTENCIA" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "Estás a punto de ejecutar migraciones en la base de datos de PRODUCCION." -ForegroundColor Yellow
Write-Host "Esto creará/modificará tablas en la base de datos real." -ForegroundColor Yellow
Write-Host ""
$confirm = Read-Host "¿Deseas continuar? (S/N)"

if ($confirm -ne "S" -and $confirm -ne "s") {
    Write-Host ""
    Write-Host "   ⏸️  Operación cancelada por el usuario" -ForegroundColor Gray
    Write-Host ""
    
    # Limpiar archivo temporal
    if (Test-Path ".env.production.local") {
        Remove-Item ".env.production.local" -Force
    }
    exit 0
}

Write-Host ""

# Paso 4: Generar Prisma Client
Write-Host "📋 Paso 3: Generando Prisma Client..." -ForegroundColor Cyan
Write-Host ""

$env:DATABASE_URL = $dbUrl

try {
    npx prisma generate
    Write-Host "   ✅ Prisma Client generado" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Error generando Prisma Client" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    
    # Limpiar
    Remove-Item Env:\DATABASE_URL -ErrorAction SilentlyContinue
    if (Test-Path ".env.production.local") {
        Remove-Item ".env.production.local" -Force
    }
    exit 1
}
Write-Host ""

# Paso 5: Ejecutar migraciones
Write-Host "📋 Paso 4: Ejecutando migraciones..." -ForegroundColor Cyan
Write-Host ""
Write-Host "   Comando: npx prisma migrate deploy" -ForegroundColor Gray
Write-Host ""

try {
    npx prisma migrate deploy
    Write-Host ""
    Write-Host "   ✅ Migraciones ejecutadas exitosamente" -ForegroundColor Green
} catch {
    Write-Host ""
    Write-Host "   ❌ Error ejecutando migraciones" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "   🔍 Posibles causas:" -ForegroundColor Yellow
    Write-Host "   - La base de datos no está accesible" -ForegroundColor White
    Write-Host "   - Permisos insuficientes" -ForegroundColor White
    Write-Host "   - Credenciales incorrectas" -ForegroundColor White
    Write-Host ""
    
    # Limpiar
    Remove-Item Env:\DATABASE_URL -ErrorAction SilentlyContinue
    if (Test-Path ".env.production.local") {
        Remove-Item ".env.production.local" -Force
    }
    exit 1
}
Write-Host ""

# Paso 6: (Opcional) Ver estado de la base de datos
Write-Host "📋 Paso 5: Verificando estado de la base de datos..." -ForegroundColor Cyan
Write-Host ""

try {
    $null = npx prisma db pull --print 2>&1
    
    # Contar modelos en el schema
    $schemaContent = Get-Content "prisma/schema.prisma" -Raw
    $modelCount = ([regex]::Matches($schemaContent, "model ")).Count
    
    Write-Host "   ✅ Base de datos verificada" -ForegroundColor Green
    Write-Host "   📊 $modelCount modelos/tablas encontrados" -ForegroundColor Cyan
} catch {
    Write-Host "   ⚠️  No se pudo verificar la base de datos automáticamente" -ForegroundColor Yellow
}
Write-Host ""

# Paso 7: (Opcional) Seed
Write-Host "📋 Paso 6: ¿Deseas poblar la base de datos con datos de prueba?" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Esto insertará:" -ForegroundColor Gray
Write-Host "   - Usuarios de prueba" -ForegroundColor White
Write-Host "   - Productos de ejemplo" -ForegroundColor White
Write-Host "   - Clientes de demostración" -ForegroundColor White
Write-Host ""

$seedConfirm = Read-Host "¿Ejecutar seed? (S/N)"

if ($seedConfirm -eq "S" -or $seedConfirm -eq "s") {
    Write-Host ""
    Write-Host "   Ejecutando: npx prisma db seed..." -ForegroundColor Gray
    Write-Host ""
    
    try {
        npx prisma db seed
        Write-Host ""
        Write-Host "   ✅ Datos de prueba insertados" -ForegroundColor Green
    } catch {
        Write-Host ""
        Write-Host "   ⚠️  Error ejecutando seed (opcional)" -ForegroundColor Yellow
        Write-Host "   La aplicación funcionará sin datos de prueba" -ForegroundColor Gray
    }
} else {
    Write-Host ""
    Write-Host "   ⏭️  Saltando seed de datos" -ForegroundColor Gray
}
Write-Host ""

# Limpiar variables de entorno y archivos temporales
Write-Host "🧹 Limpiando..." -ForegroundColor Cyan
Remove-Item Env:\DATABASE_URL -ErrorAction SilentlyContinue
if (Test-Path ".env.production.local") {
    Remove-Item ".env.production.local" -Force
    Write-Host "   ✅ Archivos temporales eliminados" -ForegroundColor Green
}
Write-Host ""

# Resumen final
Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ MIGRACIONES COMPLETADAS" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "🎯 Próximos pasos:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Ve a tu aplicación:" -ForegroundColor White
Write-Host "   https://food-order-od8gotayl-tucano0109-5495s-projects.vercel.app" -ForegroundColor Blue
Write-Host ""
Write-Host "2. Verifica que:" -ForegroundColor White
Write-Host "   ✅ No hay errores 500" -ForegroundColor Gray
Write-Host "   ✅ Puedes hacer login" -ForegroundColor Gray
Write-Host "   ✅ El dashboard carga correctamente" -ForegroundColor Gray
Write-Host "   ✅ Las APIs responden" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Si hay errores, revisa:" -ForegroundColor White
Write-Host "   - Runtime Logs en Vercel Dashboard" -ForegroundColor Gray
Write-Host "   - Consola del navegador (F12)" -ForegroundColor Gray
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "🎉 Base de datos lista para producción" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
