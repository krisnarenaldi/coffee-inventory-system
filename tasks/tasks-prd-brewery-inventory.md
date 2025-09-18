# Task List for Brewery Inventory Management System (SaaS)

## Relevant Files

### Project Setup & Configuration

- `brewery-inventory/package.json` - Project dependencies and scripts
- `brewery-inventory/.env.local` - Environment configuration file
- `brewery-inventory/next.config.js` - Next.js configuration
- `brewery-inventory/tailwind.config.js` - Tailwind CSS configuration
- `brewery-inventory/prisma/schema.prisma` - Database schema definition
- `brewery-inventory/prisma/migrations/` - Database migration files
- `brewery-inventory/prisma/seed.ts` - Database seed file
- `brewery-inventory/pages/api/` - API routes definition
- `brewery-inventory/middleware.ts` - Next.js middleware for tenant routing

### Database Models (Prisma Schema)

- `brewery-inventory/prisma/schema.prisma` - All database models defined in Prisma schema:
  - User model - User management
  - Role model - User role definitions
  - Permission model - Permission system
  - Ingredient model - Raw material tracking
  - Supplier model - Supplier information
  - Recipe model - Brewing recipes
  - Batch model - Production batch tracking
  - Product model - Finished product inventory
  - Alert model - System alerts
  - Schedule model - Scheduling system
  - Tenant model - Brewery tenant management
  - Subscription model - Subscription tracking
  - SubscriptionPlan model - Plan definitions
  - TenantSetting model - Tenant-specific settings
  - Usage model - System usage tracking

### API Routes & Handlers

- `brewery-inventory/pages/api/auth/` - NextAuth.js authentication endpoints
- `brewery-inventory/pages/api/users/` - User management API
- `brewery-inventory/pages/api/ingredients/` - Raw material management API
- `brewery-inventory/pages/api/suppliers/` - Supplier management API
- `brewery-inventory/pages/api/recipes/` - Recipe management API
- `brewery-inventory/pages/api/batches/` - Batch tracking API
- `brewery-inventory/pages/api/products/` - Finished product management API
- `brewery-inventory/pages/api/alerts/` - Alert management API
- `brewery-inventory/pages/api/schedules/` - Schedule management API
- `brewery-inventory/pages/api/reports/` - Reporting and analytics API
- `brewery-inventory/pages/api/dashboard/` - Dashboard data API
- `brewery-inventory/pages/api/admin/tenants/` - Tenant management for platform admins
- `brewery-inventory/pages/api/admin/subscriptions/` - Subscription management for platform admins
- `brewery-inventory/pages/api/admin/analytics/` - Cross-tenant analytics API
- `brewery-inventory/pages/api/tenant/subscription/` - Subscription management for brewery admins
- `brewery-inventory/pages/api/tenant/settings/` - Tenant-specific settings API

### Pages & Components

- `brewery-inventory/pages/` - Next.js pages (file-based routing)
- `brewery-inventory/components/layouts/` - Layout components
- `brewery-inventory/components/auth/` - Authentication components
- `brewery-inventory/pages/dashboard/` - Dashboard pages
- `brewery-inventory/pages/ingredients/` - Ingredient management pages
- `brewery-inventory/pages/suppliers/` - Supplier management pages
- `brewery-inventory/pages/recipes/` - Recipe management pages
- `brewery-inventory/pages/batches/` - Batch tracking pages
- `brewery-inventory/pages/products/` - Product management pages
- `brewery-inventory/pages/alerts/` - Alert pages
- `brewery-inventory/pages/schedules/` - Schedule pages
- `brewery-inventory/pages/reports/` - Report pages
- `brewery-inventory/pages/admin/tenants/` - Tenant management pages
- `brewery-inventory/pages/admin/subscriptions/` - Subscription plan management pages
- `brewery-inventory/pages/admin/analytics/` - Cross-tenant analytics pages
- `brewery-inventory/pages/admin/dashboard/` - Platform admin dashboard pages
- `brewery-inventory/pages/tenant/settings/` - Tenant settings pages
- `brewery-inventory/pages/tenant/subscription/` - Tenant subscription management pages
- `brewery-inventory/pages/onboarding/` - New tenant onboarding pages

### Services & Utilities

- `brewery-inventory/lib/services/InventoryService.ts` - Inventory management logic
- `brewery-inventory/lib/services/AlertService.ts` - Alert generation logic
- `brewery-inventory/lib/services/ReportService.ts` - Report generation logic
- `brewery-inventory/lib/services/QrCodeService.ts` - QR/Barcode scanning functionality
- `brewery-inventory/lib/services/TenantService.ts` - Tenant management logic
- `brewery-inventory/lib/services/SubscriptionService.ts` - Subscription management logic
- `brewery-inventory/lib/services/BillingService.ts` - Payment processing and billing logic
- `brewery-inventory/lib/services/UsageTrackingService.ts` - System usage tracking logic
- `brewery-inventory/lib/services/TenantAnalyticsService.ts` - Cross-tenant analytics logic
- `brewery-inventory/lib/services/OnboardingService.ts` - New tenant onboarding logic
- `brewery-inventory/lib/prisma.ts` - Prisma client configuration
- `brewery-inventory/lib/auth.ts` - NextAuth.js configuration

### Tests

- `brewery-inventory/__tests__/` - Jest test files
- `brewery-inventory/__tests__/api/` - API endpoint tests
- `brewery-inventory/__tests__/components/` - Component tests
- `brewery-inventory/__tests__/services/` - Service layer tests
- `brewery-inventory/cypress/` - End-to-end tests

### Notes

- Next.js follows a file-based routing system with API routes
- Use `npm test` or `yarn test` to run Jest tests
- Use `npm run cypress` for end-to-end tests
- Database schema and migrations managed through Prisma
- Use `npx prisma migrate dev` to create and apply migrations
- Use `npx prisma generate` to generate Prisma client
- For multi-tenancy implementation, use Next.js middleware for subdomain routing
- For subscription management, integrate with Stripe using their official SDK
- Implement database schema with tenant isolation using tenant_id foreign keys
- Use Next.js middleware to ensure proper tenant context for all requests
- Consider implementing caching strategy using Redis or Next.js built-in caching
- Use TypeScript for type safety across the application
- Use Tailwind CSS for styling and responsive design

## Tasks

- [x] 1.0 Set up project infrastructure and database

  - [x] 1.1 Initialize new Next.js project with TypeScript
  - [x] 1.2 Configure environment variables in .env.local file
  - [x] 1.3 Set up Prisma ORM and database connection
  - [x] 1.4 Create Prisma schema and database migrations for all required tables
  - [x] 1.5 Set up NextAuth.js authentication
  - [x] 1.6 Configure API routes and middleware
  - [x] 1.7 Set up Tailwind CSS and frontend styling
  - [x] 1.8 Create base layout components and templates
  - [x] 1.9 Set up testing environment (Jest and Cypress)
  - [x] 1.10 Configure Next.js middleware for multi-tenancy
  - [x] 1.11 Set up Stripe integration for subscription management
  - [x] 1.12 Configure deployment infrastructure (Vercel/AWS)
  - [x] 1.13 Set up subdomain routing for tenant isolation

- [x] 2.0 Implement user management and authentication system

  - [x] 2.1 Define User, Role, and Permission models in Prisma schema
  - [x] 2.2 Implement NextAuth.js registration and login functionality
  - [x] 2.3 Create brewery-level user roles (Admin, Manager, Brewmaster, Warehouse Staff, Sales)
  - [x] 2.4 Create platform-level user roles (Platform Admin, Support, Billing Admin)
  - [x] 2.5 Implement role-based access control with tenant context using middleware
  - [x] 2.6 Create user profile management pages and API endpoints
  - [x] 2.7 Implement password reset functionality with NextAuth.js
  - [x] 2.8 Create user activity logging with tenant context
  - [ ] 2.9 Implement role-based dashboard customization
  - [x] 2.10 Build tenant user management interface for platform administrators
  - [x] 2.11 Implement OAuth providers for enterprise SSO
  - [x] 2.12 Write Jest and Cypress tests for authentication and authorization

- [x] 3.0 Develop raw material inventory management module

  - [x] 3.1 Define Ingredient and Supplier models in Prisma schema
  - [x] 3.2 Create API endpoints and pages for ingredient CRUD operations
  - [x] 3.3 Create API endpoints and pages for supplier CRUD operations
  - [x] 3.4 Build React components for setting minimum stock thresholds
  - [x] 3.5 Implement inventory adjustment functionality with API and UI
  - [x] 3.6 Create shipment receiving interface with real-time updates
  - [x] 3.7 Implement batch number and expiration date tracking
  - [x] 3.8 Integrate web-based QR/barcode scanning for inventory updates
  - [x] 3.9 Create inventory search and filtering functionality with React components
  - [x] 3.10 Write Jest and Cypress tests for inventory management

- [x] 4.0 Create coffee roasting recipe management system

  - [x] 4.1 Create Coffee Recipe model
  - [x] 4.2 Implement CRUD operations for coffee recipes
  - [x] 4.3 Create interface for adding green beans to roast recipes
  - [x] 4.4 Implement recipe versioning
  - [x] 4.5 Create roasting process instructions management
  - [x] 4.6 Implement expected roast yield calculation
  - [x] 4.7 Create recipe search and filtering functionality
  - [x] 4.8 Implement recipe duplication functionality
  - [x] 4.9 Write tests for coffee recipe management

- [x] 5.0 Build coffee production batch tracking functionality

  - [x] 5.1 Create Batch model for coffee production
  - [x] 5.2 Implement batch creation from coffee recipes
  - [x] 5.3 Create roasting session scheduling interface
  - [x] 5.4 Implement automatic inventory deduction on roast start
  - [x] 5.5 Create batch status tracking (green beans, roasting, cooling, packaging, ready)
  - [x] 5.6 Implement measurement recording (roast temperature, time, weight loss, cupping scores)
  - [x] 5.7 Create yield calculation and roast loss tracking
  - [x] 5.8 Implement roast notes and cupping logs
  - [x] 5.9 Create batch search and filtering functionality
  - [x] 5.10 Write tests for coffee batch tracking

- [x] 6.0 Implement finished coffee products inventory management

  - [x] 6.1 Create Coffee Product model
  - [x] 6.2 Implement CRUD operations for finished coffee products
  - [x] 6.3 Create packaging interface (bags, bulk bins, retail packages)
  - [x] 6.4 Implement lot numbering and roast date tracking
  - [x] 6.5 Create product movement and sales tracking
  - [x] 6.6 Implement inventory views by coffee type, roast level, and packaging
  - [x] 6.7 Create coffee product search and filtering functionality
  - [ ] 6.8 Write tests for coffee product management

- [ ] 7.0 Develop alerts and scheduling system

      -   [x] 7.1 Create Alert and Schedule models
      -   [x] 7.2 Implement low stock threshold alerts
      -   [x] 7.3 Create expiration alerts for green beans and roasted coffee
      -   [x] 7.4 Implement automatic reorder notifications
      -   [x] 7.5 Create calendar interface for roasting sessions
      -   [ ] 7.6 Implement equipment maintenance and cleaning cycle scheduling
      -   [ ] 7.7 Create alert notification system (email, in-app)
      -   [x] 7.8 Implement alert acknowledgment and resolution tracking
      -   [ ] 7.9 Write tests for alerts and scheduling

- [x] 8.0 Create coffee shop reporting and analytics dashboard

  - [x] 8.1 Design and implement main coffee shop dashboard
  - [x] 8.2 Create inventory valuation reports
  - [x] 8.3 Implement roast consistency comparison reports
  - [x] 8.4 Create roast yield and loss efficiency metrics
  - [x] 8.5 Implement waste/loss tracking reports (placeholder added)
  - [x] 8.6 Create freshness reports for coffee nearing optimal consumption dates
  - [x] 8.7 Implement custom report generation
  - [x] 8.8 Create data visualization components (charts, graphs)
  - [ ] 8.9 Implement report export functionality (PDF, CSV)
  - [ ] 8.10 Write tests for reporting and analytics

- [x] 9.0 Implement multi-tenancy architecture

  - [x] 9.1 Design and implement database schema for multi-tenancy
  - [x] 9.2 Create tenant model and migration
  - [x] 9.3 Implement tenant middleware for request isolation
  - [x] 9.4 Create tenant identification and resolution system
  - [x] 9.5 Implement tenant-specific configuration management
  - [x] 9.6 Create tenant provisioning and setup process
  - [x] 9.7 Implement tenant data isolation and security measures
  - [x] 9.8 Create tenant administration interface for platform admins
  - [x] 9.9 Implement tenant onboarding and offboarding workflows
  - [x] 9.10 Write tests for multi-tenancy functionality

- [x] 10.0 Develop subscription and billing system

  - [x] 10.1 Create subscription plans and pricing tiers
  - [x] 10.2 Implement subscription model and migrations
  - [ ] 10.3 Integrate with payment processing service
  - [x] 10.4 Create subscription management interface for tenants
  - [x] 10.5 Implement automated billing and invoicing
  - [x] 10.6 Create subscription plan management for platform admins
  - [x] 10.7 Implement feature access control based on subscription tier
  - [x] 10.8 Create usage tracking and quota management
  - [x] 10.9 Implement subscription notifications and reminders
  - [x] 10.10 Write tests for subscription and billing functionality

- [x] 11.0 Build platform administration and analytics

  - [x] 11.1 Create platform admin dashboard
  - [x] 11.2 Implement cross-tenant analytics and reporting
  - [x] 11.3 Create system health monitoring and alerts
  - [x] 11.4 Implement tenant usage and performance metrics
  - [x] 11.5 Create feature usage analytics
  - [x] 11.6 Implement revenue and subscription analytics
  - [x] 11.7 Create tenant growth and churn reporting
  - [x] 11.8 Implement platform-wide notification system
  - [x] 11.9 Create system configuration management interface
  - [x] 11.10 Write tests for platform administration functionality

- [ ] 12.0 Implement SaaS deployment and operations
  - [x] 12.1 Set up continuous integration and deployment pipeline
  - [ ] 12.2 Configure auto-scaling for application servers
  - [ ] 12.3 Implement database scaling strategy
  - [ ] 12.4 Set up centralized logging and monitoring
  - [ ] 12.5 Implement automated backup and recovery procedures
  - [ ] 12.6 Create disaster recovery plan and procedures
  - [x] 12.7 Implement security scanning and compliance checks
  - [ ] 12.8 Set up staging environment for testing updates
  - [x] 12.9 Create documentation for operations procedures
  - [x] 12.10 Implement feature flagging for gradual rollouts
