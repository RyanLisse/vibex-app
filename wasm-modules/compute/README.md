# Compute WASM Module

This directory contains the compiled WebAssembly module for high-performance computational operations.

## Files

- `compute.wasm` - Compiled WASM module for mathematical operations
- `compute.js` - JavaScript bindings

## Features

- Statistical computations (mean, std dev, correlation, regression)
- Matrix operations (multiplication, decomposition)
- Signal processing (FFT, filtering)
- Machine learning primitives
- Cryptographic operations
- SIMD optimizations

## Building

```bash
# From C++ source
emcc -O3 -s WASM=1 -s EXPORTED_FUNCTIONS='["_calculate_mean", "_matrix_multiply", "_fft"]' \
     -s EXTRA_EXPORTED_RUNTIME_METHODS='["ccall", "cwrap"]' \
     compute.cpp -o compute.js

# Or from Rust
wasm-pack build --target web --out-dir ../../wasm-modules/compute
```

## Performance

The WASM module provides significant performance improvements for:
- Large dataset processing (>10x faster)
- Mathematical computations (5-20x faster)
- Signal processing operations (10-50x faster)

Performance gains depend on browser support for WASM features like SIMD and threads.