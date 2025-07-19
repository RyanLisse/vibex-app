# WASM Modules

This directory contains WebAssembly modules that provide high-performance implementations for performance-critical operations in the application.

## Modules

### Vector Search (`vector-search/`)

High-performance vector similarity calculations for semantic search.

**Features:**

- Cosine similarity with SIMD optimization
- Euclidean distance calculations
- Batch processing for large datasets
- Memory-efficient operations
- Performance benchmarking tools

**Build:**

```bash
cd vector-search
./build.sh
```

**Dependencies:**

- Rust (latest stable)
- wasm-pack
- wasm-opt (optional, for optimization)

## Installation

### Prerequisites

1. Install Rust:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
```

2. Install wasm-pack:

```bash
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
```

3. Install wasm-opt (optional, for smaller binaries):

```bash
# macOS
brew install binaryen

# Ubuntu/Debian
sudo apt install binaryen

# Or download from: https://github.com/WebAssembly/binaryen/releases
```

## Building All Modules

```bash
# From project root
bun run wasm:build
```

## Testing

```bash
# Test vector search integration
bun run wasm:test
```

## Integration

The WASM modules are automatically integrated into the application through the WASM Services Layer:

```typescript
import { wasmServices } from "@/lib/wasm/services";

// Initialize all WASM services
await wasmServices.initialize();

// Use vector search
const vectorSearch = wasmServices.getVectorSearch();
const results = await vectorSearch.search(queryEmbedding);
```

## Performance

The WASM modules provide significant performance improvements over JavaScript implementations:

- **Vector Search**: 2-10x faster similarity calculations
- **SIMD Operations**: Up to 4x speedup on supported platforms
- **Memory Efficiency**: Direct memory access reduces allocations

## Browser Compatibility

- **WebAssembly**: All modern browsers (95%+ support)
- **SIMD**: Chrome 91+, Firefox 89+, Safari 16.4+
- **Threads**: Limited support, gracefully degrades

## Development

### Adding New Modules

1. Create module directory: `wasm-modules/new-module/`
2. Add Rust source in `src/lib.rs`
3. Create `Cargo.toml` configuration
4. Add build script `build.sh`
5. Create TypeScript loader in `lib/wasm/modules/`
6. Integrate with main services

### Best Practices

1. **Progressive Enhancement**: Always provide JavaScript fallbacks
2. **Memory Management**: Clean up WASM instances when done
3. **Error Handling**: Graceful degradation on WASM failures
4. **Performance**: Profile both WASM and JS implementations
5. **Testing**: Comprehensive test coverage for all code paths

## Troubleshooting

### Build Issues

1. **Rust not found**: Install Rust toolchain
2. **wasm-pack fails**: Check Rust version compatibility
3. **Permission denied**: Make build scripts executable (`chmod +x build.sh`)

### Runtime Issues

1. **WASM not loading**: Check browser compatibility
2. **Performance degradation**: Verify SIMD support
3. **Memory errors**: Increase WASM memory limits

### Debug Mode

Enable debug logging for WASM modules:

```typescript
// Enable debug mode
process.env.WASM_DEBUG = "true";
```

## Architecture

```
wasm-modules/
├── vector-search/          # Vector similarity calculations
│   ├── src/lib.rs         # Rust source code
│   ├── Cargo.toml         # Rust configuration
│   └── build.sh           # Build script
├── compute/               # Mathematical operations (planned)
├── crypto/                # Cryptographic functions (planned)
└── README.md              # This file

lib/wasm/
├── modules/               # TypeScript loaders
├── services.ts            # Unified services interface
├── detection.ts           # Capability detection
└── generated/             # Built WASM outputs
```

The WASM modules are designed to integrate seamlessly with the existing codebase while providing substantial performance improvements for computationally intensive operations.
