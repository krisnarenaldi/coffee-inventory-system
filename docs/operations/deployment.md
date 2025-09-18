# Deployment Guide

This guide covers the complete deployment process for the Brewery Inventory SaaS platform.

## 🏗️ Architecture Overview

### System Components
- **Frontend**: Next.js application with React
- **Backend**: Next.js API routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **File Storage**: Cloud storage (AWS S3/GCP Cloud Storage)
- **Monitoring**: APM and logging solutions
- **CDN**: Content delivery network for static assets

### Environment Structure
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Development │    │   Staging   │    │ Production  │
│             │    │             │    │             │
│ Local Dev   │───▶│ Pre-prod    │───▶│ Live System │
│ Feature     │    │ Testing     │    │ Multi-tenant│
│ Branches    │    │ Integration │    │ High Avail. │
└─────────────┘    └─────────────┘    └─────────────┘
```

## 🚀 Deployment Environments

### Development Environment
- **Purpose**: Local development and feature testing
- **Database**: Local PostgreSQL or SQLite
- **URL**: http://localhost:3000
- **Deployment**: Manual (`npm run dev`)

### Staging Environment
- **Purpose**: Pre-production testing and QA
- **Database**: Staging PostgreSQL instance
- **URL**: https://staging.brewery-inventory.com
- **Deployment**: Automatic on `develop` branch push

### Production Environment
- **Purpose**: Live customer-facing application
- **Database**: Production PostgreSQL cluster
- **URL**: https://app.brewery-inventory.com
- **Deployment**: Automatic on `main` branch push (with approvals)

## 📋 Pre-Deployment Checklist

### Code Quality
- [ ] All tests passing (unit, integration, e2e)
- [ ] Code review completed and approved
- [ ] Security scan passed
- [ ] Performance benchmarks met
- [ ] Documentation updated

### Infrastructure
- [ ] Database migrations tested
- [ ] Environment variables configured
- [ ] SSL certificates valid
- [ ] Monitoring and alerting configured
- [ ] Backup procedures verified

### Security
- [ ] Security headers configured
- [ ] API rate limiting enabled
- [ ] Authentication systems tested
- [ ] Secrets properly managed
- [ ] CORS policies configured

## 🔧 Deployment Process

### 1. Staging Deployment

```bash
# Triggered automatically on develop branch push
# Manual deployment:
git checkout develop
git pull origin develop
npm ci
npm run build
npm run test
npm run deploy:staging
```

**Staging Deployment Steps:**
1. Code checkout from `develop` branch
2. Install dependencies
3. Run security scans
4. Execute test suite
5. Build application
6. Deploy to staging environment
7. Run smoke tests
8. Notify team of deployment status

### 2. Production Deployment

```bash
# Triggered automatically on main branch push
# Manual deployment (emergency only):
git checkout main
git pull origin main
npm ci
npm run build:production
npm run deploy:production
```

**Production Deployment Steps:**
1. Code checkout from `main` branch
2. Install dependencies
3. Run full test suite
4. Security and compliance checks
5. Build production artifacts
6. Database migration (if needed)
7. Blue-green deployment
8. Health checks and smoke tests
9. Traffic routing to new version
10. Monitoring and alerting verification

## 🗄️ Database Deployment

### Migration Strategy
```bash
# Check migration status
npx prisma migrate status

# Deploy migrations
npx prisma migrate deploy

# Seed database (staging only)
npx prisma db seed
```

### Migration Best Practices
- Always test migrations on staging first
- Use backward-compatible migrations when possible
- Create rollback scripts for complex changes
- Monitor database performance during migrations
- Schedule migrations during low-traffic periods

### Database Backup Before Migration
```bash
# Create backup before migration
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
psql $DATABASE_URL -c "SELECT COUNT(*) FROM tenants;"
```

## 🌐 Infrastructure as Code

### Vercel Configuration
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "env": {
    "DATABASE_URL": "@database-url",
    "NEXTAUTH_SECRET": "@nextauth-secret",
    "NEXTAUTH_URL": "@nextauth-url"
  },
  "regions": ["iad1", "sfo1"],
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 30
    }
  }
}
```

### Environment Variables

**Required Variables:**
```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Authentication
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-domain.com

# External Services
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
SENDGRID_API_KEY=SG...

# Monitoring
SENTRY_DSN=https://...
DATADOG_API_KEY=...
```

## 🔄 Blue-Green Deployment

### Process Overview
1. **Blue Environment**: Current production
2. **Green Environment**: New version deployment
3. **Switch**: Route traffic from blue to green
4. **Verification**: Monitor green environment
5. **Cleanup**: Decommission blue environment

### Implementation
```bash
# Deploy to green environment
vercel --prod --env production-green

# Run health checks
curl -f https://green.brewery-inventory.com/api/health

# Switch traffic (gradual)
vercel alias green.brewery-inventory.com app.brewery-inventory.com

# Monitor for 30 minutes
# If successful, decommission blue
# If issues, rollback to blue
```

## 📊 Monitoring Deployment

### Health Checks
```typescript
// /api/health endpoint
export async function GET() {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    external_apis: await checkExternalAPIs(),
    timestamp: new Date().toISOString()
  };
  
  const healthy = Object.values(checks).every(check => 
    typeof check === 'boolean' ? check : check.status === 'ok'
  );
  
  return Response.json(checks, { 
    status: healthy ? 200 : 503 
  });
}
```

### Deployment Metrics
- Deployment frequency
- Lead time for changes
- Mean time to recovery (MTTR)
- Change failure rate

## 🚨 Rollback Procedures

### Automatic Rollback Triggers
- Health check failures
- Error rate > 5%
- Response time > 10 seconds
- Database connection failures

### Manual Rollback
```bash
# Quick rollback to previous version
vercel rollback

# Or rollback to specific deployment
vercel rollback [deployment-url]

# Database rollback (if needed)
psql $DATABASE_URL < backup_previous.sql
```

### Rollback Checklist
- [ ] Identify rollback trigger
- [ ] Execute rollback procedure
- [ ] Verify system stability
- [ ] Notify stakeholders
- [ ] Document incident
- [ ] Plan fix for next deployment

## 🔐 Security Considerations

### Deployment Security
- Use secure CI/CD pipelines
- Implement least privilege access
- Encrypt secrets and environment variables
- Audit deployment logs
- Use signed container images

### Runtime Security
- Enable security headers
- Implement rate limiting
- Use HTTPS everywhere
- Regular security updates
- Monitor for vulnerabilities

## 📝 Post-Deployment Tasks

### Immediate (0-30 minutes)
- [ ] Verify deployment success
- [ ] Check application health
- [ ] Monitor error rates
- [ ] Validate critical user flows
- [ ] Update deployment status

### Short-term (30 minutes - 2 hours)
- [ ] Monitor performance metrics
- [ ] Check database performance
- [ ] Verify integrations
- [ ] Review logs for issues
- [ ] Update documentation

### Long-term (2+ hours)
- [ ] Analyze deployment metrics
- [ ] Update monitoring baselines
- [ ] Document lessons learned
- [ ] Plan next deployment
- [ ] Review and improve process

## 🆘 Troubleshooting

### Common Issues

**Build Failures**
```bash
# Check build logs
npm run build 2>&1 | tee build.log

# Clear cache and retry
npm ci
rm -rf .next
npm run build
```

**Database Connection Issues**
```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1;"

# Check migration status
npx prisma migrate status
```

**Environment Variable Issues**
```bash
# Verify environment variables
vercel env ls

# Test locally
cp .env.example .env.local
# Edit .env.local with correct values
npm run dev
```

### Emergency Contacts
- **DevOps Lead**: [contact info]
- **Database Admin**: [contact info]
- **Security Team**: [contact info]
- **On-call Engineer**: [contact info]

---

**Last Updated**: $(date)
**Version**: 1.0
**Next Review**: $(date -d '+3 months')