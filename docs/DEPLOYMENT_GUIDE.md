# Brewery Inventory Management System - Deployment Guide

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Environment Setup](#environment-setup)
4. [Local Development](#local-development)
5. [Database Setup](#database-setup)
6. [Production Deployment](#production-deployment)
7. [Environment Variables](#environment-variables)
8. [CI/CD Pipeline](#cicd-pipeline)
9. [Monitoring & Logging](#monitoring--logging)
10. [Security Configuration](#security-configuration)
11. [Troubleshooting](#troubleshooting)
12. [Maintenance](#maintenance)

## Overview

The Brewery Inventory Management System is a Next.js application with the following architecture:

- **Frontend**: Next.js 15 with React 19
- **Backend**: Next.js API routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Deployment**: Vercel (recommended) or Docker
- **Monitoring**: Built-in health checks and performance monitoring

### System Requirements

- Node.js 18.17 or later
- PostgreSQL 13 or later
- npm 9 or later
- Git

## Prerequisites

### Development Tools

```bash
# Install Node.js (using nvm recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Verify installation
node --version  # Should be 18.17+
npm --version   # Should be 9+
```

### Database Setup

#### Option 1: Local PostgreSQL

```bash
# macOS (using Homebrew)
brew install postgresql@15
brew services start postgresql@15

# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql
CREATE DATABASE brewery_inventory;
CREATE USER brewery_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE brewery_inventory TO brewery_user;
\q
```

#### Option 2: Docker PostgreSQL

```bash
# Create docker-compose.yml for local development
cat > docker-compose.yml << EOF
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: brewery_inventory
      POSTGRES_USER: brewery_user
      POSTGRES_PASSWORD: your_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
EOF

# Start PostgreSQL
docker-compose up -d postgres
```

#### Option 3: Cloud Database (Production)

**Recommended providers:**
- **Vercel Postgres**: Integrated with Vercel deployments
- **Supabase**: PostgreSQL with additional features
- **AWS RDS**: Enterprise-grade PostgreSQL
- **Google Cloud SQL**: Managed PostgreSQL service

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/brewery-inventory-next.git
cd brewery-inventory-next
```

### 2. Install Dependencies

```bash
npm ci
```

### 3. Environment Configuration

```bash
# Copy environment template
cp .env.example .env.local

# Edit environment variables
nano .env.local
```

### 4. Database Migration

```bash
# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Seed database with initial data
npm run db:seed
```

## Local Development

### Starting Development Server

```bash
# Start development server
npm run dev

# Server will be available at:
# http://localhost:3000
```

### Development Workflow

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run linting
npm run lint

# Run Cypress tests
npm run cypress:open  # Interactive mode
npm run cypress:run   # Headless mode
```

### Database Operations

```bash
# View database in Prisma Studio
npx prisma studio

# Reset database (development only)
npx prisma migrate reset

# Create new migration
npx prisma migrate dev --name your_migration_name

# Deploy migrations to production
npx prisma migrate deploy
```

## Production Deployment

### Option 1: Vercel Deployment (Recommended)

#### 1. Install Vercel CLI

```bash
npm i -g vercel
```

#### 2. Configure Project

```bash
# Login to Vercel
vercel login

# Initialize project
vercel

# Follow prompts to configure:
# - Project name
# - Framework preset: Next.js
# - Root directory: ./
# - Build command: npm run build
# - Output directory: .next
```

#### 3. Set Environment Variables

```bash
# Set production environment variables
vercel env add DATABASE_URL production
vercel env add NEXTAUTH_SECRET production
vercel env add NEXTAUTH_URL production
# ... add all required variables
```

#### 4. Deploy

```bash
# Deploy to production
vercel --prod

# Or set up automatic deployments via Git integration
```

### Option 2: Docker Deployment

#### 1. Create Dockerfile

```dockerfile
# Create Dockerfile in project root
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

#### 2. Create Docker Compose for Production

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
    depends_on:
      - postgres
    restart: unless-stopped

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: brewery_inventory
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
```

#### 3. Deploy with Docker

```bash
# Build and start services
docker-compose -f docker-compose.prod.yml up -d

# Run database migrations
docker-compose -f docker-compose.prod.yml exec app npx prisma migrate deploy

# Check logs
docker-compose -f docker-compose.prod.yml logs -f app
```

### Option 3: Manual Server Deployment

#### 1. Server Setup (Ubuntu/Debian)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx
sudo apt install nginx

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib
```

#### 2. Application Deployment

```bash
# Clone repository
git clone https://github.com/your-org/brewery-inventory-next.git
cd brewery-inventory-next

# Install dependencies
npm ci --only=production

# Generate Prisma client
npx prisma generate

# Build application
npm run build

# Run database migrations
npx prisma migrate deploy

# Start with PM2
pm2 start npm --name "brewery-inventory" -- start
pm2 save
pm2 startup
```

#### 3. Nginx Configuration

```nginx
# /etc/nginx/sites-available/brewery-inventory
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/private.key;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/brewery-inventory /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Environment Variables

### Required Variables

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/brewery_inventory"

# Authentication
NEXTAUTH_SECRET="your-secret-key-here"  # Generate with: openssl rand -base64 32
NEXTAUTH_URL="https://your-domain.com"  # Your application URL

# Email (Optional - for notifications)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# File Upload (Optional)
UPLOAD_MAX_SIZE="10485760"  # 10MB in bytes

# Rate Limiting
RATE_LIMIT_MAX="100"  # Requests per window
RATE_LIMIT_WINDOW="900000"  # 15 minutes in milliseconds

# Feature Flags
ENABLE_ANALYTICS="true"
ENABLE_NOTIFICATIONS="true"
```

### Development Variables

```bash
# Development specific
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Debug settings
DEBUG="brewery:*"
LOG_LEVEL="debug"

# Test database (optional)
TEST_DATABASE_URL="postgresql://username:password@localhost:5432/brewery_inventory_test"
```

### Production Variables

```bash
# Production specific
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://your-domain.com"

# Monitoring
SENTRY_DSN="https://your-sentry-dsn"
DATADOG_API_KEY="your-datadog-key"

# Performance
NEXT_TELEMETRY_DISABLED="1"

# Security
CSP_REPORT_URI="https://your-domain.com/api/csp-report"
```

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: brewery_inventory_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Generate Prisma client
        run: npx prisma generate
        
      - name: Run database migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/brewery_inventory_test
      
      - name: Run tests
        run: npm test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/brewery_inventory_test
      
      - name: Run linting
        run: npm run lint
      
      - name: Build application
        run: npm run build
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/brewery_inventory_test
          NEXTAUTH_SECRET: test-secret
          NEXTAUTH_URL: http://localhost:3000

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

### Deployment Scripts

```bash
# scripts/deploy.sh
#!/bin/bash
set -e

echo "🚀 Starting deployment..."

# Run tests
echo "🧪 Running tests..."
npm test

# Build application
echo "🏗️ Building application..."
npm run build

# Run database migrations
echo "🗄️ Running database migrations..."
npx prisma migrate deploy

# Deploy to production
echo "📦 Deploying to production..."
vercel --prod

echo "✅ Deployment completed successfully!"
```

```bash
# Make script executable
chmod +x scripts/deploy.sh

# Run deployment
./scripts/deploy.sh
```

## Monitoring & Logging

### Health Check Endpoint

The application includes a health check endpoint at `/api/health`:

```bash
# Check application health
curl https://your-domain.com/api/health

# Expected response:
{
  "status": "healthy",
  "database": "connected",
  "uptime": 3600,
  "memory": {
    "used": "45.2 MB",
    "total": "128 MB"
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

### Performance Monitoring

```bash
# Run performance tests
npm run load-test

# Monitor database performance
npm run db:performance

# Run all performance checks
npm run performance:all
```

### Log Management

```bash
# View application logs (PM2)
pm2 logs brewery-inventory

# View application logs (Docker)
docker-compose logs -f app

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## Security Configuration

### SSL/TLS Setup

#### Using Let's Encrypt (Certbot)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Security Headers

The application includes security headers in `next.config.js`:

```javascript
// next.config.js
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          }
        ]
      }
    ]
  }
}
```

### Firewall Configuration

```bash
# Configure UFW firewall
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw status
```

## Troubleshooting

### Common Issues

#### Build Failures

```bash
# Clear Next.js cache
rm -rf .next
npm run build

# Clear npm cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

#### Database Connection Issues

```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1;"

# Check Prisma connection
npx prisma db pull

# Reset database (development only)
npx prisma migrate reset
```

#### Memory Issues

```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build

# Monitor memory usage
node --inspect npm run build
```

#### SSL Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# Renew certificate
sudo certbot renew

# Test Nginx configuration
sudo nginx -t
```

### Debug Mode

```bash
# Enable debug logging
export DEBUG="brewery:*"
npm run dev

# Check application logs
tail -f logs/application.log
```

### Performance Issues

```bash
# Analyze bundle size
npx @next/bundle-analyzer

# Profile application
node --prof npm start

# Database query analysis
SET log_statement = 'all';
-- Check PostgreSQL logs
```

## Maintenance

### Regular Tasks

#### Daily
- Monitor application health
- Check error logs
- Verify backup completion

#### Weekly
- Update dependencies
- Review performance metrics
- Clean up old logs

#### Monthly
- Security updates
- Database maintenance
- Capacity planning review

### Backup Procedures

```bash
# Database backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Application backup
tar -czf app_backup_$(date +%Y%m%d).tar.gz \
  --exclude=node_modules \
  --exclude=.next \
  --exclude=.git .

# Automated backup script
#!/bin/bash
BACKUP_DIR="/backups/brewery-inventory"
mkdir -p $BACKUP_DIR

# Database backup
pg_dump $DATABASE_URL | gzip > "$BACKUP_DIR/db_$(date +%Y%m%d_%H%M%S).sql.gz"

# Keep only last 7 days of backups
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +7 -delete
```

### Updates and Upgrades

```bash
# Update dependencies
npm update
npm audit fix

# Update Next.js
npm install next@latest

# Update Prisma
npm install prisma@latest @prisma/client@latest
npx prisma generate

# Test after updates
npm test
npm run build
```

---

## Support and Resources

- **Documentation**: [Internal Wiki/Confluence]
- **Issue Tracking**: [Jira/GitHub Issues]
- **Monitoring**: [Datadog/New Relic Dashboard]
- **On-call**: [PagerDuty/Slack Channel]

---

*Last updated: [Current Date]*
*Version: 1.0*
*Next review: [Date + 3 months]*