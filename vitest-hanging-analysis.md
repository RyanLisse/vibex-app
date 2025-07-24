# Vitest Hanging Issue Analysis Report

## Root Cause Analysis of ESBuild Service Communication Failure

### Executive Summary

The Vitest test runner experiences systematic hanging after 2+ minutes due to ESBuild service communication failures. The issue manifests as "write EPIPE" errors when attempting to transform TypeScript files during test execution.

## Key Findings

### 1. ESBuild Service Failure Pattern
- **Error**: `The service was stopped: write EPIPE`
- **Affected Process**: ESBuild service used for TypeScript transformation
- **Impact**: Complete test execution failure across all Vitest configurations

### 2. Configuration Analysis

#### Primary vitest.config.ts
- Uses `pool: "forks"` with `singleFork: true`
- Has ESBuild enabled with minimal configuration:
  ```typescript
  esbuild: {
    target: 'es2022',
    jsx: 'automatic'
  }
  ```
- Complex dependency optimization settings
- Heavy server.deps configuration

#### Unit Test Config (vitest.unit.config.ts)
- Uses `pool: "forks"` with `singleFork: false`
- No explicit ESBuild configuration
- Simpler setup focused on React components

#### Integration Test Config (vitest.integration.config.ts)
- Uses `pool: "forks"` with `singleFork: true`
- Includes explicit ESBuild configuration:
  ```typescript
  esbuild: {
    target: 'esnext',
    minify: false,
    keepNames: true,
    sourcemap: true
  }
  ```
- Higher memory allocation (4096MB)

#### Fast Config (vitest.fast.config.ts)
- Uses `pool: "threads"` (different from others)
- Attempts to disable ESBuild:
  ```typescript
  esbuild: {
    include: [],
    exclude: ['**/*'],
    drop: ['console', 'debugger'],
    minify: false,
    target: 'esnext'
  }
  ```
- Still experiences hanging issues

### 3. Dependency Analysis

ESBuild is deeply integrated through multiple paths:
```
vibex@0.1.0
├── @storybook/nextjs-vite@9.0.18
│   └── vite@7.0.5
│       └── esbuild@0.25.8
├── drizzle-kit@0.31.4
│   ├── @esbuild-kit/esm-loader@2.6.5
│   │   └── @esbuild-kit/core-utils@3.3.2
│   │       └── esbuild@0.18.20
│   ├── esbuild-register@3.6.0
│   │   └── esbuild@0.25.8
│   └── esbuild@0.25.8
└── esbuild@0.25.8
```

Multiple versions detected:
- esbuild@0.25.8 (primary)
- esbuild@0.18.20 (through drizzle-kit)

### 4. Environmental Factors

- **Runtime**: Bun 1.2.19 + Node v22.17.1
- **Conflicting Process Models**: Mix of forks and threads across configs
- **Memory Issues**: Evidence of zombie ESBuild processes in previous reports
- **Complex Setup Files**: Multiple test setup files with extensive browser API mocking

## Root Causes Identified

### 1. **ESBuild Service Lifecycle Management**
The ESBuild service is not properly managed across test runs, leading to:
- Service termination during active transformations
- EPIPE errors when writing to closed pipes
- Accumulation of zombie processes

### 2. **Process Pool Conflicts**
- Different configs use different pool strategies (forks vs threads)
- `singleFork` inconsistency causes resource conflicts
- No proper cleanup between test runs

### 3. **Bun + Vitest + ESBuild Incompatibility**
- Bun's native TypeScript support conflicts with ESBuild
- Multiple transformation layers compete for resources
- Process communication breaks down under load

### 4. **Configuration Complexity**
- Over-engineered optimizeDeps settings
- Complex server.deps inline/external configurations
- Multiple conflicting ESBuild configurations

## Solution Strategies

### 1. **Complete ESBuild Removal** (Recommended)
The vitest.config.fixed.ts shows the right approach:
```typescript
esbuild: false,
optimizeDeps: {
  exclude: ['esbuild'],
  esbuildOptions: undefined,
}
```

### 2. **Unified Process Pool Strategy**
Standardize on single pool type:
```typescript
pool: "forks",
poolOptions: {
  forks: {
    singleFork: true,
    isolate: true,
    minWorkers: 1,
    maxWorkers: 1
  }
}
```

### 3. **Simplified Configuration**
- Remove complex optimizeDeps
- Eliminate server.deps configurations
- Use minimal transformation settings

### 4. **Alternative Transformation**
- Leverage Bun's native TypeScript support
- Use SWC through React plugin
- Avoid double transformation

## Recommended Fix Implementation

1. **Update all Vitest configs to disable ESBuild**
2. **Standardize process pool configuration**
3. **Simplify dependency optimization**
4. **Add process cleanup hooks**
5. **Monitor for zombie processes**

## Testing the Fix

```bash
# Clean environment
rm -rf node_modules/.vitest
pkill -f esbuild

# Test with fixed config
vitest run --config vitest.config.fixed.ts

# Monitor process health
ps aux | grep esbuild
```

## Conclusion

The hanging issue stems from ESBuild service lifecycle mismanagement compounded by complex configurations and process pool conflicts. The solution requires completely disabling ESBuild in favor of native transformation capabilities provided by Bun and simplified Vitest configurations.