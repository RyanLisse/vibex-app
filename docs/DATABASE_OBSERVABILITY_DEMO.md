# Database Observability Demo

A comprehensive demonstration of the integrated database observability system featuring ElectricSQL, Enhanced TanStack Query, and WASM optimizations.

## Overview

This demo showcases a complete database observability solution that combines multiple cutting-edge technologies to provide:

- **Real-time Collaboration**: Multi-user task management with live synchronization
- **Offline-First Architecture**: Seamless operation with automatic sync when reconnected
- **Performance Optimization**: WASM-powered enhancements for vector search and data processing
- **Intelligent Caching**: Smart query optimization with stale-while-revalidate patterns
- **Comprehensive Monitoring**: Real-time performance metrics and system health tracking

## Features Demonstrated

### 1. ElectricSQL Real-Time Sync
- **Offline-first architecture** with local PGlite database
- **Bidirectional synchronization** with Neon PostgreSQL
- **Conflict resolution** using last-write-wins strategy
- **Real-time subscriptions** for live data updates
- **Multi-user collaboration** with presence indicators

### 2. Enhanced TanStack Query
- **WASM optimization detection** and progressive enhancement
- **Optimistic updates** with automatic rollback on errors
- **Intelligent caching** with performance monitoring
- **Infinite queries** with virtualization support
- **Real-time integration** with ElectricSQL sync

### 3. WASM Services Layer
- **Vector search optimization** for semantic search capabilities
- **SQLite utilities** for high-performance local operations
- **Compute engine** for complex data processing
- **Performance monitoring** and health checks
- **Automatic fallback** to JavaScript implementations

### 4. Multi-User Simulation
- **User switching** to simulate different perspectives
- **Network status simulation** (online/offline toggling)
- **Collaboration scenarios** with conflict resolution
- **Real-time activity tracking** and presence indicators

## Demo Sections

### Overview Tab
- **Multi-user simulation controls** for switching between users
- **Network status simulation** with latency indicators
- **Task creation form** with optimistic updates
- **Real-time task list** with collaborative editing

### Collaboration Tab
- **User presence indicators** showing online/offline status
- **Real-time collaboration features** explanation
- **Conflict resolution demonstration**
- **Activity tracking** and user interactions

### Smart Search Tab
- **Traditional keyword search** with fuzzy matching
- **Semantic search** powered by WASM vector operations
- **Performance comparison** between search methods
- **Real-time search results** with intelligent caching

### Performance Tab
- **WASM services status** and health monitoring
- **Execution analytics** with performance metrics
- **Network and sync performance** indicators
- **Real-time performance tracking**

### Monitoring Tab
- **System health overview** for all components
- **Real-time activity feed** with event tracking
- **Performance metrics dashboard**
- **Error monitoring** and alerting

## Technical Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Database Observability Demo                  │
├─────────────────────────────────────────────────────────────────┤
│  Multi-User Simulation  │  Network Simulation  │  Performance   │
│  - User switching       │  - Online/offline     │  - WASM metrics │
│  - Presence indicators  │  - Latency control    │  - Query stats  │
│  - Activity tracking    │  - Connection status  │  - Health checks│
├─────────────────────────────────────────────────────────────────┤
│                     Enhanced TanStack Query                     │
│  - WASM optimization detection  │  - Intelligent caching       │
│  - Optimistic updates          │  - Performance monitoring     │
│  - Real-time integration       │  - Stale-while-revalidate     │
├─────────────────────────────────────────────────────────────────┤
│                        ElectricSQL Sync                        │
│  - Offline-first PGlite        │  - Real-time subscriptions   │
│  - Bidirectional sync          │  - Conflict resolution       │
│  - Multi-user collaboration    │  - Presence tracking          │
├─────────────────────────────────────────────────────────────────┤
│                        WASM Services                           │
│  - Vector Search Engine        │  - SQLite Utilities          │
│  - Compute Optimizations       │  - Performance Monitoring     │
│  - Health Checks               │  - Automatic Fallbacks       │
├─────────────────────────────────────────────────────────────────┤
│                    Database Infrastructure                      │
│  - Neon PostgreSQL (Remote)    │  - PGlite (Local)            │
│  - Vector Search Support       │  - Real-time Sync            │
│  - Schema Migrations           │  - Conflict Resolution       │
└─────────────────────────────────────────────────────────────────┘
```

## Getting Started

### Prerequisites
- Node.js 18+ with npm/yarn/bun
- Modern browser with WebAssembly support
- Neon PostgreSQL database (for full functionality)

### Running the Demo

1. **Start the development server:**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   bun dev
   ```

2. **Navigate to the demo:**
   Open [http://localhost:3000/demo](http://localhost:3000/demo) in your browser

3. **Explore the features:**
   - Switch between different users to see real-time collaboration
   - Toggle network status to test offline functionality
   - Try semantic search with WASM optimizations
   - Monitor performance metrics in real-time

### Demo Scenarios

#### Scenario 1: Multi-User Collaboration
1. Open the demo in multiple browser tabs
2. Switch to different users in each tab
3. Create and edit tasks to see real-time sync
4. Observe conflict resolution in action

#### Scenario 2: Offline-First Testing
1. Create some tasks while online
2. Toggle to offline mode
3. Continue creating and editing tasks
4. Go back online and watch sync resume

#### Scenario 3: Performance Comparison
1. Enable semantic search in the Search tab
2. Compare search results with traditional keyword search
3. Monitor WASM performance metrics
4. Observe query optimization in action

## Configuration

### Environment Variables
```env
# ElectricSQL Configuration
ELECTRIC_URL=ws://localhost:5133
ELECTRIC_AUTH_TOKEN=your_electric_auth_token_here
ELECTRIC_DEBUG=true

# TanStack Query Configuration
NEXT_PUBLIC_ENABLE_QUERY_DEVTOOLS=true

# WASM Optimization Settings
NEXT_PUBLIC_ENABLE_WASM_VECTOR_SEARCH=true
NEXT_PUBLIC_ENABLE_WASM_SQLITE=true
NEXT_PUBLIC_ENABLE_WASM_COMPUTE=true

# Database Configuration
DATABASE_URL=your_neon_database_url
DIRECT_URL=your_neon_direct_url
```

## Performance Metrics

The demo tracks and displays various performance metrics:

- **WASM Initialization Time**: Time to load and initialize WASM modules
- **Query Execution Time**: Database query performance with/without optimizations
- **Sync Latency**: Time for real-time synchronization between clients
- **Network Performance**: Connection status and latency simulation
- **Cache Hit Rates**: TanStack Query cache effectiveness
- **Search Performance**: Comparison between traditional and semantic search

## Troubleshooting

### Common Issues

1. **WASM Services Not Loading**
   - Ensure your browser supports WebAssembly
   - Check browser console for WASM-related errors
   - Verify WASM files are properly served

2. **ElectricSQL Connection Issues**
   - Verify ElectricSQL server is running
   - Check network connectivity
   - Ensure proper authentication tokens

3. **Performance Issues**
   - Monitor browser DevTools for performance bottlenecks
   - Check if WASM optimizations are enabled
   - Verify database connection performance

### Debug Mode

Enable debug mode by setting environment variables:
```env
ELECTRIC_DEBUG=true
NEXT_PUBLIC_DEBUG=true
```

This will provide detailed logging for troubleshooting.

## Next Steps

This demo serves as a foundation for:

1. **Production Deployment**: Scale the system for production use
2. **Custom Integrations**: Adapt the patterns for specific use cases
3. **Performance Optimization**: Fine-tune based on real-world usage
4. **Feature Extensions**: Add domain-specific functionality
5. **Monitoring Integration**: Connect to production monitoring systems

## Related Documentation

- [ElectricSQL Setup Guide](./ELECTRIC_SQL_SETUP.md)
- [Enhanced TanStack Query Guide](./ENHANCED_TANSTACK_QUERY.md)
- [WASM Services Layer Guide](./WASM_SERVICES_LAYER.md)
- [Testing Guide](./TESTING_GUIDE.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
