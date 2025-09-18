# Brewery Inventory Management System (SaaS)

A comprehensive SaaS solution designed to help craft breweries of all sizes track and manage their inventory from raw materials to finished products.

## 🚀 Features

- **Multi-tenant Architecture**: Secure data isolation for multiple brewery clients
- **Inventory Management**: Track raw materials, ingredients, and finished products
- **Recipe Management**: Create and manage brewing recipes with detailed ingredients
- **Batch Tracking**: Monitor production batches from start to finish
- **Alerts & Notifications**: Low stock alerts and expiration notifications
- **Reporting & Analytics**: Comprehensive reports and data visualization
- **Subscription Management**: Flexible pricing tiers with Stripe integration
- **Role-based Access Control**: Different permission levels for brewery staff

## 🛠️ Tech Stack

- **Framework**: Next.js 15 with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS
- **Payment Processing**: Stripe
- **Testing**: Jest + Cypress
- **Deployment**: Vercel (recommended)

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL database
- npm or yarn package manager

## 🚀 Getting Started

### 1. Install dependencies

```bash
npm install --legacy-peer-deps
```

### 2. Environment Setup

Update the environment variables in `.env.local`:

- `DATABASE_URL`: Your PostgreSQL connection string
- `NEXTAUTH_SECRET`: A secure random string for NextAuth.js
- `STRIPE_PUBLISHABLE_KEY` & `STRIPE_SECRET_KEY`: Your Stripe API keys
- Email configuration for notifications

### 3. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Push database schema
npm run db:push

# Seed the database with demo data
npm run db:seed
```

### 4. Start the development server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## 🧪 Testing

### Unit Tests (Jest)

```bash
npm test
```

### End-to-End Tests (Cypress)

```bash
# Open Cypress UI
npm run cypress:open

# Run tests headlessly
npm run cypress:run
```

## 📊 Demo Data

The seed script creates:

- **Demo Tenant**: `demo.localhost:3000`
- **Demo Users**:
  - Admin: `admin@demo.brewery` (password: `demo123`)
  - Brewmaster: `brewmaster@demo.brewery` (password: `demo123`)
  - Platform Admin: `platform@breweryos.com` (password: `demo123`)
- **Sample Data**: Ingredients, suppliers, recipes, and batches

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with demo data
- `npm test` - Run Jest tests
- `npm run cypress:open` - Open Cypress UI

## 🌐 Multi-tenancy

The application supports multi-tenancy through:

- **Subdomain routing**: Each brewery gets a unique subdomain
- **Database isolation**: Tenant-specific data separation
- **Middleware**: Automatic tenant context resolution

## 💳 Subscription Plans

- **Starter** ($29.99/month): Up to 5 users, 100 ingredients, 50 batches
- **Professional** ($79.99/month): Up to 20 users, 500 ingredients, 200 batches
- **Enterprise** ($199.99/month): Unlimited users, ingredients, and batches

---

**Built with ❤️ for the craft brewing community**
