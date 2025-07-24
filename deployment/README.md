# Deployment Configuration

This directory contains production-ready deployment configurations for the Vibex application, including database setup, ElectricSQL service configuration, and comprehensive observability.

## Overview

The deployment system provides:

- **Neon PostgreSQL Configuration**: Production database setup with security, monitoring, and backup
- **ElectricSQL Configuration**: Real-time sync service with scaling and monitoring
- **Observability Configuration**: OpenTelemetry integration with multiple exporters and alerting
- **Automated Deployment Scripts**: Database migration and validation automation
- **Health Monitoring**: Comprehensive health checks and metrics collection

## Configuration Files

### 1. Neon PostgreSQL (`neon-config.ts`)

Production-ready PostgreSQL configuration with:

- **Connection Pooling**: Optimized pool sizes for different environments
- **Security Settings**: SSL/TLS encryption, IP allowlists, access control
- **Monitoring**: Connection count, query performance, error rate tracking
- **Backup Configuration**: Automated backups with retention policies
- **Environment-Specific Overrides**: Development, staging, and production settings

```typescript
const config = getNeonConfig();
// Returns environment-specific configuration
```

### 2. ElectricSQL Service (`electric-config.ts`)

Real-time synchronization service configuration with:

- **Authentication**: JWT-based auth with configurable expiry
- **Sync Configuration**: Batch sizes, intervals, conflict resolution
- **Auto-Scaling**: CPU and memory-based scaling rules
- **Security**: TLS, CORS, rate limiting
- **Monitoring**: Sync latency, error rates, connection tracking

```typescript
const config = getElectricConfig();
// Returns environment-specific ElectricSQL configuration
```

### 3. Observability (`observability-config.ts`)

Comprehensive observability configuration with:

- **Tracing**: OpenTelemetry with OTLP, Jaeger, and console exporters
- **Metrics**: Prometheus and OTLP metrics with custom collection intervals
- **Logging**: Structured logging with multiple outputs (console, file, Elasticsearch)
- **Alerting**: Multi-channel alerting (Slack, email, webhook) with configurable rules

```typescript
const config = getObservabilityConfig();
// Returns environment-specific observability configuration
```

## Deployment Scripts

### 1. Database Deployment (`scripts/deploy-database.ts`)

Automated database deployment with:

- **Migration Management**: Drizzle ORM migration execution
- **Pre-deployment Checks**: Configuration validation, extension checks
- **Performance Optimization**: Index creation, monitoring view setup
- **Environment Safety**: Production safeguards, dry-run mode

```bash
# Development deployment
bun run deploy:db

# Staging deployment
bun run deploy:db:staging

# Production deployment (requires --force)
bun run deploy:db:production

# Dry run (validation only)
bun run deploy:db:dry-run
```

### 2. Configuration Validation (`scripts/validate-deployment.ts`)

Comprehensive validation of all deployment configurations:

- **Configuration Validation**: All config files and environment variables
- **Network Connectivity**: Database and external service connectivity tests
- **Security Checks**: Production security requirement validation
- **Environment Consistency**: Cross-component configuration validation

```bash
# Validate all deployment configurations
bun run deploy:validate
```

## Environment Variables

### Required Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Authentication
NEXTAUTH_SECRET=your-nextauth-secret
JWT_SECRET=your-jwt-secret

# Production only
NEXTAUTH_URL=https://your-domain.com
```

### Optional Variables

```bash
# ElectricSQL
ELECTRIC_SERVICE_URL=https://electric.your-domain.com

# Observability
OTLP_ENDPOINT=https://api.honeycomb.io
HONEYCOMB_API_KEY=your-honeycomb-key
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Security
ALLOWED_IPS=192.168.1.0/24,10.0.0.0/8
CORS_ORIGINS=https://app.your-domain.com,https://admin.your-domain.com

# Alerting
ALERT_RECIPIENTS=admin@your-domain.com,ops@your-domain.com
SMTP_HOST=smtp.your-provider.com
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
```

## Health Monitoring

### Health Check Endpoint

The application provides a comprehensive health check endpoint:

```bash
GET /api/health
```

Response includes:
- Overall health status (`healthy`, `degraded`, `unhealthy`)
- Individual component health checks
- Performance metrics
- System information

```bash
# Check application health
curl http://localhost:3000/api/health

# Use in monitoring systems
bun run health:check
```

### Monitoring Components

1. **Database Health**: Connection status, query performance, error rates
2. **ElectricSQL Health**: Sync status, latency, connection count
3. **Application Health**: Memory usage, uptime, request rates

## Deployment Environments

### Development

- Minimal resource allocation
- Disabled monitoring and alerting
- Relaxed security settings
- Local database connections

### Staging

- Production-like configuration
- Enabled monitoring with relaxed thresholds
- Staging-specific alert channels
- Automated testing integration

### Production

- Maximum security settings
- Comprehensive monitoring and alerting
- Strict performance thresholds
- Backup and disaster recovery enabled

## Security Considerations

### Database Security

- SSL/TLS encryption for all connections
- IP allowlists for database access
- Connection pooling with limits
- Regular security updates

### Application Security

- JWT token security with short expiry
- CORS configuration for allowed origins
- Rate limiting on API endpoints
- Secure headers and CSP policies

### Monitoring Security

- Encrypted telemetry data transmission
- Secure alert channel configurations
- Access control for monitoring dashboards
- Audit logging for configuration changes

## Scaling Configuration

### Database Scaling

- Connection pool sizing based on load
- Read replica configuration for high availability
- Automated backup and point-in-time recovery
- Performance monitoring and optimization

### ElectricSQL Scaling

- Auto-scaling based on CPU and memory usage
- Load balancing across multiple instances
- Circuit breaker patterns for resilience
- Graceful degradation during high load

### Application Scaling

- Horizontal scaling with load balancers
- CDN integration for static assets
- Caching strategies for performance
- Resource monitoring and alerting

## Troubleshooting

### Common Issues

1. **Database Connection Failures**
   - Check DATABASE_URL format
   - Verify network connectivity
   - Check SSL/TLS configuration

2. **ElectricSQL Sync Issues**
   - Verify service URL accessibility
   - Check authentication configuration
   - Monitor sync latency metrics

3. **Monitoring Setup Issues**
   - Validate OTLP endpoint configuration
   - Check API key permissions
   - Verify network connectivity to exporters

### Debug Commands

```bash
# Validate configuration
bun run deploy:validate

# Test database connectivity
bun run deploy:db:dry-run

# Check application health
bun run health:check

# View deployment logs
docker logs vibex-app

# Check monitoring metrics
curl http://localhost:9090/metrics
```

## Best Practices

### Configuration Management

- Use environment-specific configuration files
- Validate all configurations before deployment
- Store secrets in secure secret management systems
- Regular configuration audits and updates

### Monitoring and Alerting

- Set up comprehensive health checks
- Configure appropriate alert thresholds
- Use multiple alert channels for redundancy
- Regular review and tuning of alert rules

### Security

- Regular security audits and updates
- Principle of least privilege for access control
- Encrypted data transmission and storage
- Regular backup testing and disaster recovery drills

### Performance

- Regular performance monitoring and optimization
- Capacity planning based on usage patterns
- Proactive scaling based on metrics
- Regular load testing and performance validation