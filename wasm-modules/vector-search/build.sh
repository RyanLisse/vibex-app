#!/bin/bash

# Build script for Vector Search WASM module

echo "Building Vector Search WASM module..."

# Install wasm-pack if not already installed
if ! command -v wasm-pack &> /dev/null; then
    echo "Installing wasm-pack..."
    curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
fi

# Build the WASM module
echo "Compiling Rust to WASM..."
wasm-pack build --target web --out-dir ../../lib/wasm/generated/vector-search

# Optimize the WASM file size
if command -v wasm-opt &> /dev/null; then
    echo "Optimizing WASM file..."
    wasm-opt -O3 -o ../../lib/wasm/generated/vector-search/vector_search_wasm_bg_optimized.wasm \
        ../../lib/wasm/generated/vector-search/vector_search_wasm_bg.wasm
    mv ../../lib/wasm/generated/vector-search/vector_search_wasm_bg_optimized.wasm \
        ../../lib/wasm/generated/vector-search/vector_search_wasm_bg.wasm
fi

echo "Build complete! Output in lib/wasm/generated/vector-search/"