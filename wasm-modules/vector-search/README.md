# Vector Search WASM Module

This directory contains the compiled WebAssembly module for high-performance vector search operations.

## Files

- `vector_search.wasm` - Compiled WASM module (would be generated from Rust/C++)
- `vector_search.js` - JavaScript bindings (if using tools like wasm-pack)

## Building

To build the WASM module from Rust source:

```bash
# Install wasm-pack
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

# Build the module
wasm-pack build --target web --out-dir ../../wasm-modules/vector-search

# Or for Node.js target
wasm-pack build --target nodejs --out-dir ../../wasm-modules/vector-search
```

## Features

- High-performance vector similarity search
- SIMD optimizations for supported browsers
- Approximate nearest neighbor search (HNSW, IVF)
- Batch processing capabilities
- Memory-efficient operations

## Usage

The module is automatically loaded by the VectorSearchWASM service when WASM optimizations are enabled.