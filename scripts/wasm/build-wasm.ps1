# 🚀 WASM Build Script para Windows
# Script PowerShell para compilar módulos C/C++ a WebAssembly

param(
    [string]$Module = "all",
    [string]$Optimization = "-O3"
)

Write-Host "🚀 Building WebAssembly modules..." -ForegroundColor Blue

# Directorios
$SrcDir = "./wasm-src"
$OutDir = "./public/wasm"

# Crear directorios si no existen
if (!(Test-Path $SrcDir)) { New-Item -ItemType Directory -Path $SrcDir }
if (!(Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir }

# Verificar si Emscripten está disponible
try {
    $emccVersion = & emcc --version 2>$null
    Write-Host "✅ Emscripten found: $($emccVersion[0])" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Emscripten not found. Please install Emscripten SDK:" -ForegroundColor Yellow
    Write-Host "1. Download from: https://emscripten.org/docs/getting_started/downloads.html" -ForegroundColor Blue
    Write-Host "2. Run: emsdk install latest && emsdk activate latest" -ForegroundColor Blue
    Write-Host "3. Add to PATH or run emsdk_env.bat" -ForegroundColor Blue
    exit 1
}

# Función para compilar un módulo
function New-WASMModule {
    param(
        [string]$Name,
        [string]$SourceFile,
        [string]$ExportedFunctions,
        [string]$OptLevel = "-O3"
    )
    
    Write-Host "🔨 Compiling $Name..." -ForegroundColor Blue
    
    $sourceFullPath = Join-Path $SrcDir $SourceFile
    $outputPath = Join-Path $OutDir "$Name.wasm"
    
    if (!(Test-Path $sourceFullPath)) {
        Write-Host "⚠️  Source file $SourceFile not found, skipping..." -ForegroundColor Yellow
        return
    }
    
    $emccArgs = @(
        $sourceFullPath,
        "-o", $outputPath,
        "-s", "WASM=1",
        "-s", "NO_EXIT_RUNTIME=1",
        "-s", "EXPORTED_FUNCTIONS=$ExportedFunctions",
        "-s", "EXPORTED_RUNTIME_METHODS=[`"cwrap`",`"ccall`",`"allocate`",`"deallocate`",`"ALLOC_NORMAL`"]",
        "-s", "ALLOW_MEMORY_GROWTH=1",
        "-s", "INITIAL_MEMORY=1048576",
        "-s", "MAXIMUM_MEMORY=16777216",
        "-s", "MODULARIZE=1",
        "-s", "EXPORT_NAME=`"create$Name`"",
        $OptLevel,
        "--no-entry"
    )
    
    try {
        & emcc @emccArgs
        Write-Host "✅ $Name compiled successfully" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to compile $Name" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
    }
}

# Compilar módulos según el parámetro
switch ($Module.ToLower()) {
    "all" {
        Write-Host "📦 Compiling all modules..." -ForegroundColor Cyan
        
        # Módulo de algoritmos matemáticos
        New-WASMModule -Name "MathAlgorithms" -SourceFile "math-algorithms.c" `
            -ExportedFunctions "['_calculate_primes','_calculate_stats','_compound_interest','_moving_average','_malloc','_free']" `
            -OptLevel "$Optimization -ffast-math"
        
        # Módulo de procesamiento de imágenes
        New-WASMModule -Name "ImageProcessing" -SourceFile "image-processing.c" `
            -ExportedFunctions "['_apply_grayscale','_apply_blur','_resize_image','_adjust_brightness','_calculate_average_color','_malloc','_free']" `
            -OptLevel "$Optimization -ffast-math"
        
        # Módulo de análisis de datos
        New-WASMModule -Name "DataAnalysis" -SourceFile "data-analysis.c" `
            -ExportedFunctions "['_analyze_dataset','_calculate_correlation','_linear_regression','_kmeans_clustering','_malloc','_free']" `
            -OptLevel "$Optimization -ffast-math"
    }
    
    "math" {
        New-WASMModule -Name "MathAlgorithms" -SourceFile "math-algorithms.c" `
            -ExportedFunctions "['_calculate_primes','_calculate_stats','_compound_interest','_moving_average','_malloc','_free']" `
            -OptLevel "$Optimization -ffast-math"
    }
    
    "image" {
        New-WASMModule -Name "ImageProcessing" -SourceFile "image-processing.c" `
            -ExportedFunctions "['_apply_grayscale','_apply_blur','_resize_image','_adjust_brightness','_calculate_average_color','_malloc','_free']" `
            -OptLevel "$Optimization -ffast-math"
    }
    
    "data" {
        New-WASMModule -Name "DataAnalysis" -SourceFile "data-analysis.c" `
            -ExportedFunctions "['_analyze_dataset','_calculate_correlation','_linear_regression','_kmeans_clustering','_malloc','_free']" `
            -OptLevel "$Optimization -ffast-math"
    }
    
    default {
        Write-Host "❌ Unknown module: $Module" -ForegroundColor Red
        Write-Host "Available modules: all, math, image, data" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "🎉 WASM compilation completed!" -ForegroundColor Green
Write-Host "📁 Output directory: $OutDir" -ForegroundColor Blue

# Mostrar tamaños de archivos
Write-Host "📊 Module sizes:" -ForegroundColor Blue
Get-ChildItem -Path $OutDir -Filter "*.wasm" | ForEach-Object {
    $size = [math]::Round($_.Length / 1KB, 1)
    Write-Host "   $($_.Name): $size KB" -ForegroundColor Blue
}

Write-Host "✅ Build complete!" -ForegroundColor Green