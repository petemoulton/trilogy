# 🚀 Trilogy AI System - Deployment Guide

This guide covers production deployment of the Trilogy AI System.

## 📋 Prerequisites

- Docker and Docker Compose
- PostgreSQL 15+
- Node.js 18+ (for local development)
- SSL certificates (for HTTPS)
- Domain name and DNS configuration

## 🔐 Environment Setup

### 1. Environment Variables

Copy and configure environment files:

```bash
cp .env.example .env.production
```

**Required Variables:**
```bash
# AI API Keys (REQUIRED)
ANTHROPIC_API_KEY=your_anthropic_key_here
OPENAI_API_KEY=your_openai_key_here

# Database (REQUIRED)
POSTGRES_PASSWORD=secure_password_here

# Security (REQUIRED)
JWT_SECRET=your_jwt_secret_here
SESSION_SECRET=your_session_secret_here

# Domain (REQUIRED)
CORS_ORIGINS=https://yourdomain.com,https://api.yourdomain.com
```

### 2. SSL Certificates

Place SSL certificates in `nginx/ssl/`:
```bash
mkdir -p nginx/ssl
# Copy your certificates
cp your-cert.pem nginx/ssl/cert.pem
cp your-key.pem nginx/ssl/key.pem
```

### 3. Domain Configuration

Update `nginx/nginx.conf`:
- Replace `yourdomain.com` with your actual domain
- Replace `mcp.yourdomain.com` with your MCP subdomain

## 🐳 Docker Deployment

### Development Deployment

```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f

# Check status
docker-compose ps
```

### Production Deployment

```bash
# Set environment variables
export POSTGRES_PASSWORD=your_secure_password
export ANTHROPIC_API_KEY=your_api_key
export OPENAI_API_KEY=your_api_key
export JWT_SECRET=your_jwt_secret
export SESSION_SECRET=your_session_secret

# Deploy production stack
docker-compose -f docker-compose.prod.yml up -d

# Check health
curl https://yourdomain.com/health
```

## 🔍 Health Checks

### System Health Endpoints

```bash
# Main system health
curl https://yourdomain.com/health

# MCP server health
curl https://mcp.yourdomain.com/health

# Database connectivity
curl https://yourdomain.com/api/health/database
```

### Expected Response

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "memoryBackend": "postgresql",
  "postgresql": true,
  "memory": "active",
  "stats": {
    "totalKeys": 0,
    "activeLocks": 0,
    "totalTasks": 0
  }
}
```

## 📊 Monitoring

### Prometheus Metrics

Access Prometheus at: `http://yourdomain.com:9090`

Key metrics to monitor:
- System uptime
- Database connections
- Memory usage
- API response times
- Error rates

### Grafana Dashboard

Access Grafana at: `http://yourdomain.com:3001`

Default credentials:
- Username: `admin`
- Password: Set via `GRAFANA_PASSWORD` environment variable

### Log Management

View logs:
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f trilogy-app

# PostgreSQL logs
docker-compose logs -f postgres
```

## 🛡️ Security Considerations

### 1. Network Security

- Use HTTPS only in production
- Configure firewall rules
- Restrict database access
- Use VPN for administrative access

### 2. Authentication

- Change default passwords
- Use strong JWT secrets
- Implement rate limiting
- Monitor failed authentication attempts

### 3. Data Protection

- Enable PostgreSQL encryption at rest
- Use encrypted connections
- Regular security updates
- Backup encryption

## 📱 Chrome Extension Deployment

### 1. Extension Package

Create extension package:
```bash
cd materials/chromeext/extension
zip -r trilogy-chrome-extension.zip .
```

### 2. Chrome Web Store

1. Create Chrome Developer account
2. Upload extension package
3. Complete store listing
4. Submit for review

### 3. Enterprise Deployment

For enterprise deployment, use Chrome Enterprise policies:
```json
{
  "ExtensionInstallForcelist": [
    "your-extension-id;https://yourdomain.com/extension/updates.xml"
  ]
}
```

## 🔄 Updates and Maintenance

### Rolling Updates

```bash
# Pull latest images
docker-compose pull

# Update services one by one
docker-compose up -d --no-deps trilogy-app
docker-compose up -d --no-deps nginx

# Verify health
curl https://yourdomain.com/health
```

### Database Migrations

```bash
# Backup database first
docker-compose exec postgres pg_dump -U trilogy trilogy > backup.sql

# Run migrations
docker-compose exec trilogy-app npm run migrate

# Verify migration
docker-compose exec postgres psql -U trilogy -d trilogy -c "SELECT version();"
```

### Backup Strategy

```bash
#!/bin/bash
# Daily backup script

# Database backup
docker-compose exec postgres pg_dump -U trilogy trilogy | gzip > backups/trilogy-$(date +%Y%m%d).sql.gz

# Application data backup
docker run --rm -v trilogy_app_data:/data -v $(pwd)/backups:/backup alpine tar czf /backup/app-data-$(date +%Y%m%d).tar.gz -C /data .

# Logs backup
docker run --rm -v trilogy_app_logs:/logs -v $(pwd)/backups:/backup alpine tar czf /backup/logs-$(date +%Y%m%d).tar.gz -C /logs .

# Cleanup old backups (keep 30 days)
find backups/ -name "*.gz" -mtime +30 -delete
```

## 🚨 Troubleshooting

### Common Issues

**1. Database Connection Failed**
```bash
# Check PostgreSQL status
docker-compose exec postgres pg_isready -U trilogy

# View PostgreSQL logs
docker-compose logs postgres

# Reset PostgreSQL
docker-compose restart postgres
```

**2. SSL Certificate Issues**
```bash
# Verify certificate
openssl x509 -in nginx/ssl/cert.pem -text -noout

# Test SSL connection
openssl s_client -connect yourdomain.com:443
```

**3. Memory Issues**
```bash
# Check PostgreSQL memory usage
docker stats trilogy-postgres

# View memory statistics
curl https://yourdomain.com/health
```

**4. Performance Issues**
```bash
# Check system resources
docker stats

# View slow query log
docker-compose exec postgres tail -f /var/log/postgresql/postgresql.log

# Monitor API response times
curl -w "@curl-format.txt" https://yourdomain.com/health
```

### Emergency Procedures

**1. Service Recovery**
```bash
# Stop all services
docker-compose down

# Remove all containers (keeps data)
docker-compose rm -f

# Restart all services
docker-compose up -d
```

**2. Database Recovery**
```bash
# Restore from backup
docker-compose exec postgres psql -U trilogy -d trilogy < backup.sql

# Rebuild indexes
docker-compose exec postgres psql -U trilogy -d trilogy -c "REINDEX DATABASE trilogy;"
```

## 📞 Support

For deployment support:
- Check logs: `docker-compose logs -f`
- Health checks: `curl https://yourdomain.com/health`
- GitHub Issues: [Repository Issues](https://github.com/your-org/trilogy/issues)
- Documentation: [Full Documentation](./README.md)

## 🔗 Related Documentation

- [README.md](./README.md) - Main documentation
- [API.md](./API.md) - API documentation
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Development guide
- [SECURITY.md](./SECURITY.md) - Security guidelines