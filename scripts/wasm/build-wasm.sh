#!/bin/bash
# 🚀 WASM Build Script
# Script para compilar módulos C/C++ a WebAssembly

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Building WebAssembly modules...${NC}"

# Directories
SRC_DIR="./wasm-src"
OUT_DIR="./public/wasm"
SCRIPTS_DIR="./scripts/wasm"

# Create directories if they don't exist
mkdir -p "$SRC_DIR"
mkdir -p "$OUT_DIR"

# Check if Emscripten is available
if ! command -v emcc &> /dev/null; then
    echo -e "${YELLOW}⚠️  Emscripten not found. Installing...${NC}"
    echo -e "${BLUE}Please install Emscripten SDK manually:${NC}"
    echo -e "${BLUE}1. git clone https://github.com/emscripten-core/emsdk.git${NC}"
    echo -e "${BLUE}2. cd emsdk && ./emsdk install latest && ./emsdk activate latest${NC}"
    echo -e "${BLUE}3. source ./emsdk_env.sh${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Emscripten found: $(emcc --version | head -n1)${NC}"

# Function to compile a module
compile_module() {
    local name=$1
    local source_file=$2
    local exported_functions=$3
    local optimization=$4
    
    echo -e "${BLUE}🔨 Compiling $name...${NC}"
    
    emcc "$SRC_DIR/$source_file" \
        -o "$OUT_DIR/$name.wasm" \
        -s WASM=1 \
        -s NO_EXIT_RUNTIME=1 \
        -s EXPORTED_FUNCTIONS="$exported_functions" \
        -s EXPORTED_RUNTIME_METHODS='["cwrap","ccall","allocate","deallocate","ALLOC_NORMAL"]' \
        -s ALLOW_MEMORY_GROWTH=1 \
        -s INITIAL_MEMORY=1048576 \
        -s MAXIMUM_MEMORY=16777216 \
        -s MODULARIZE=1 \
        -s EXPORT_NAME="create$name" \
        $optimization \
        --no-entry
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $name compiled successfully${NC}"
    else
        echo -e "${RED}❌ Failed to compile $name${NC}"
        exit 1
    fi
}

# Compile math algorithms module
if [ -f "$SRC_DIR/math-algorithms.c" ]; then
    compile_module "MathAlgorithms" "math-algorithms.c" \
        "['_calculate_primes','_calculate_stats','_compound_interest','_moving_average','_malloc','_free']" \
        "-O3 -ffast-math"
else
    echo -e "${YELLOW}⚠️  math-algorithms.c not found, skipping...${NC}"
fi

# Compile image processing module  
if [ -f "$SRC_DIR/image-processing.c" ]; then
    compile_module "ImageProcessing" "image-processing.c" \
        "['_apply_grayscale','_apply_blur','_resize_image','_adjust_brightness','_calculate_average_color','_malloc','_free']" \
        "-O3 -ffast-math"
else
    echo -e "${YELLOW}⚠️  image-processing.c not found, skipping...${NC}"
fi

# Compile data analysis module
if [ -f "$SRC_DIR/data-analysis.c" ]; then
    compile_module "DataAnalysis" "data-analysis.c" \
        "['_analyze_dataset','_calculate_correlation','_linear_regression','_kmeans_clustering','_malloc','_free']" \
        "-O3 -ffast-math"
else
    echo -e "${YELLOW}⚠️  data-analysis.c not found, skipping...${NC}"
fi

echo -e "${GREEN}🎉 All WASM modules compiled successfully!${NC}"
echo -e "${BLUE}📁 Output directory: $OUT_DIR${NC}"
echo -e "${BLUE}📊 Module sizes:${NC}"

# Show file sizes
for file in "$OUT_DIR"/*.wasm; do
    if [ -f "$file" ]; then
        size=$(du -h "$file" | cut -f1)
        echo -e "${BLUE}   $(basename "$file"): $size${NC}"
    fi
done

echo -e "${GREEN}✅ Build complete!${NC}"