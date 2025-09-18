-- PostgreSQL conversion script for MySQL backup
-- This script converts MySQL syntax to PostgreSQL-compatible format

-- Enable UUID extension for PostgreSQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop tables if they exist (in reverse dependency order)
DROP TABLE IF EXISTS verification_tokens CASCADE;
DROP TABLE IF EXISTS user_role_assignments CASCADE;
DROP TABLE IF EXISTS usage CASCADE;
DROP TABLE IF EXISTS tenant_settings CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS subscription_plans CASCADE;
DROP TABLE IF EXISTS storage_locations CASCADE;
DROP TABLE IF EXISTS shipment_items CASCADE;
DROP TABLE IF EXISTS shipments CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS schedules CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS recipe_ingredients CASCADE;
DROP TABLE IF EXISTS recipes CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS packaging_types CASCADE;
DROP TABLE IF EXISTS inventory_adjustments CASCADE;
DROP TABLE IF EXISTS ingredients CASCADE;
DROP TABLE IF EXISTS feature_flag_conditions CASCADE;
DROP TABLE IF EXISTS feature_flags CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;
DROP TABLE IF EXISTS batches CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS _prisma_migrations CASCADE;

-- Create _prisma_migrations table
CREATE TABLE _prisma_migrations (
  id VARCHAR(36) PRIMARY KEY,
  checksum VARCHAR(64) NOT NULL,
  finished_at TIMESTAMPTZ,
  migration_name VARCHAR(255) NOT NULL,
  logs TEXT,
  rolled_back_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  applied_steps_count INTEGER NOT NULL DEFAULT 0
);

-- Create accounts table
CREATE TABLE accounts (
  id VARCHAR(191) PRIMARY KEY,
  userId VARCHAR(191) NOT NULL,
  type VARCHAR(191) NOT NULL,
  provider VARCHAR(191) NOT NULL,
  providerAccountId VARCHAR(191) NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  token_type VARCHAR(191),
  scope VARCHAR(191),
  id_token TEXT,
  session_state VARCHAR(191),
  UNIQUE(provider, providerAccountId)
);

-- Create activity_logs table
CREATE TABLE activity_logs (
  id VARCHAR(191) PRIMARY KEY,
  tenantId VARCHAR(191) NOT NULL,
  userId VARCHAR(191),
  action VARCHAR(191) NOT NULL,
  resource VARCHAR(191) NOT NULL,
  resourceId VARCHAR(191),
  details JSONB,
  ipAddress VARCHAR(191),
  userAgent VARCHAR(191),
  createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create tenants table
CREATE TABLE tenants (
  id VARCHAR(191) PRIMARY KEY,
  name VARCHAR(191) NOT NULL,
  subdomain VARCHAR(191) NOT NULL UNIQUE,
  domain VARCHAR(191),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'CANCELLED')),
  createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create users table
CREATE TABLE users (
  id VARCHAR(191) PRIMARY KEY,
  tenantId VARCHAR(191) NOT NULL,
  email VARCHAR(191) NOT NULL,
  name VARCHAR(191),
  password VARCHAR(191),
  role VARCHAR(20) NOT NULL DEFAULT 'STAFF' CHECK (role IN ('PLATFORM_ADMIN','SUPPORT','BILLING_ADMIN','ADMIN','MANAGER','BREWMASTER','WAREHOUSE_STAFF','SALES','STAFF')),
  isActive BOOLEAN NOT NULL DEFAULT true,
  lastLogin TIMESTAMPTZ,
  emailVerified TIMESTAMPTZ,
  image VARCHAR(191),
  createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenantId, email),
  FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Create suppliers table
CREATE TABLE suppliers (
  id VARCHAR(191) PRIMARY KEY,
  tenantId VARCHAR(191) NOT NULL,
  name VARCHAR(191) NOT NULL,
  contactPerson VARCHAR(191),
  email VARCHAR(191),
  phone VARCHAR(191),
  address VARCHAR(191),
  notes VARCHAR(191),
  isActive BOOLEAN NOT NULL DEFAULT true,
  createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Create ingredients table
CREATE TABLE ingredients (
  id VARCHAR(191) PRIMARY KEY,
  tenantId VARCHAR(191) NOT NULL,
  name VARCHAR(191) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('COFFEE_BEANS','MILK','SUGAR','SYRUP','PASTRY','PACKAGING','OTHER')),
  stockQuantity DECIMAL(65,30) NOT NULL DEFAULT 0,
  unitOfMeasure VARCHAR(191) NOT NULL,
  minimumThreshold DECIMAL(65,30) NOT NULL,
  costPerUnit DECIMAL(65,30) NOT NULL,
  location VARCHAR(191),
  batchNumber VARCHAR(191),
  expirationDate TIMESTAMPTZ,
  supplierId VARCHAR(191),
  isActive BOOLEAN NOT NULL DEFAULT true,
  createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (supplierId) REFERENCES suppliers(id) ON DELETE SET NULL
);

-- Create recipes table
CREATE TABLE recipes (
  id VARCHAR(191) PRIMARY KEY,
  tenantId VARCHAR(191) NOT NULL,
  name VARCHAR(191) NOT NULL,
  style VARCHAR(191),
  description TEXT,
  expectedYield DECIMAL(65,30) NOT NULL,
  processInstructions TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  isActive BOOLEAN NOT NULL DEFAULT true,
  createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Create batches table
CREATE TABLE batches (
  id VARCHAR(191) PRIMARY KEY,
  tenantId VARCHAR(191) NOT NULL,
  recipeId VARCHAR(191),
  batchNumber VARCHAR(191) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PLANNED' CHECK (status IN ('PLANNED','IN_PROGRESS','COMPLETED','CANCELLED','GREEN_BEANS')),
  startDate TIMESTAMPTZ NOT NULL,
  endDate TIMESTAMPTZ,
  actualYield DECIMAL(65,30),
  qualityNotes JSONB,
  notes TEXT,
  createdById VARCHAR(191) NOT NULL,
  createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (recipeId) REFERENCES recipes(id) ON DELETE RESTRICT,
  FOREIGN KEY (createdById) REFERENCES users(id) ON DELETE RESTRICT
);

-- Create packaging_types table
CREATE TABLE packaging_types (
  id VARCHAR(191) PRIMARY KEY,
  tenantId VARCHAR(191) NOT NULL,
  name VARCHAR(191) NOT NULL,
  description VARCHAR(191),
  isActive BOOLEAN NOT NULL DEFAULT true,
  createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenantId, name),
  FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Create products table
CREATE TABLE products (
  id VARCHAR(191) PRIMARY KEY,
  tenantId VARCHAR(191) NOT NULL,
  batchId VARCHAR(191),
  name VARCHAR(191) NOT NULL,
  packagingTypeId VARCHAR(191),
  packagingDate TIMESTAMPTZ,
  lotNumber VARCHAR(191),
  quantity DECIMAL(65,30) NOT NULL DEFAULT 0,
  shelfLife INTEGER,
  storageLocation VARCHAR(191),
  status VARCHAR(20) NOT NULL DEFAULT 'IN_STOCK' CHECK (status IN ('IN_STOCK','LOW_STOCK','OUT_OF_STOCK','EXPIRED','RECALLED')),
  createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (batchId) REFERENCES batches(id) ON DELETE SET NULL,
  FOREIGN KEY (packagingTypeId) REFERENCES packaging_types(id) ON DELETE SET NULL
);

-- Create recipe_ingredients table
CREATE TABLE recipe_ingredients (
  id VARCHAR(191) PRIMARY KEY,
  recipeId VARCHAR(191) NOT NULL,
  ingredientId VARCHAR(191) NOT NULL,
  quantity DECIMAL(65,30) NOT NULL,
  unit VARCHAR(191) NOT NULL,
  notes VARCHAR(191),
  UNIQUE(recipeId, ingredientId),
  FOREIGN KEY (recipeId) REFERENCES recipes(id) ON DELETE CASCADE,
  FOREIGN KEY (ingredientId) REFERENCES ingredients(id) ON DELETE CASCADE
);

-- Create permissions table
CREATE TABLE permissions (
  id VARCHAR(191) PRIMARY KEY,
  name VARCHAR(191) NOT NULL UNIQUE,
  description VARCHAR(191),
  resource VARCHAR(191) NOT NULL,
  action VARCHAR(191) NOT NULL,
  createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create roles table
CREATE TABLE roles (
  id VARCHAR(191) PRIMARY KEY,
  name VARCHAR(191) NOT NULL,
  description VARCHAR(191),
  isSystem BOOLEAN NOT NULL DEFAULT false,
  tenantId VARCHAR(191),
  createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(name, tenantId),
  FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Create role_permissions table
CREATE TABLE role_permissions (
  id VARCHAR(191) PRIMARY KEY,
  roleId VARCHAR(191) NOT NULL,
  permissionId VARCHAR(191) NOT NULL,
  UNIQUE(roleId, permissionId),
  FOREIGN KEY (roleId) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permissionId) REFERENCES permissions(id) ON DELETE CASCADE
);

-- Create user_role_assignments table
CREATE TABLE user_role_assignments (
  id VARCHAR(191) PRIMARY KEY,
  userId VARCHAR(191) NOT NULL,
  roleId VARCHAR(191) NOT NULL,
  assignedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assignedBy VARCHAR(191),
  UNIQUE(userId, roleId),
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (roleId) REFERENCES roles(id) ON DELETE CASCADE
);

-- Create schedules table
CREATE TABLE schedules (
  id VARCHAR(191) PRIMARY KEY,
  tenantId VARCHAR(191) NOT NULL,
  title VARCHAR(191) NOT NULL,
  description VARCHAR(191),
  type VARCHAR(20) NOT NULL CHECK (type IN ('BREW_SESSION','MAINTENANCE','CLEANING','DELIVERY','MEETING','OTHER')),
  startDate TIMESTAMPTZ NOT NULL,
  endDate TIMESTAMPTZ,
  isRecurring BOOLEAN NOT NULL DEFAULT false,
  recurrenceRule VARCHAR(191),
  status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED','IN_PROGRESS','COMPLETED','CANCELLED','POSTPONED')),
  createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Create sessions table
CREATE TABLE sessions (
  id VARCHAR(191) PRIMARY KEY,
  sessionToken VARCHAR(191) NOT NULL UNIQUE,
  userId VARCHAR(191) NOT NULL,
  expires TIMESTAMPTZ NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Create storage_locations table
CREATE TABLE storage_locations (
  id VARCHAR(191) PRIMARY KEY,
  tenantId VARCHAR(191) NOT NULL,
  name VARCHAR(191) NOT NULL,
  description VARCHAR(191),
  capacity INTEGER,
  isActive BOOLEAN NOT NULL DEFAULT true,
  createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenantId, name),
  FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Create subscription_plans table
CREATE TABLE subscription_plans (
  id VARCHAR(191) PRIMARY KEY,
  name VARCHAR(191) NOT NULL,
  description VARCHAR(191),
  price DECIMAL(65,30) NOT NULL,
  interval VARCHAR(10) NOT NULL CHECK (interval IN ('MONTHLY', 'YEARLY')),
  maxUsers INTEGER,
  maxIngredients INTEGER,
  maxBatches INTEGER,
  features JSONB NOT NULL,
  isActive BOOLEAN NOT NULL DEFAULT true,
  createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  maxStorageLocations INTEGER,
  maxProducts INTEGER,
  maxRecipes INTEGER
);

-- Create subscriptions table
CREATE TABLE subscriptions (
  id VARCHAR(191) PRIMARY KEY,
  tenantId VARCHAR(191) NOT NULL UNIQUE,
  planId VARCHAR(191) NOT NULL,
  stripeCustomerId VARCHAR(191),
  stripeSubscriptionId VARCHAR(191),
  status VARCHAR(20) NOT NULL CHECK (status IN ('ACTIVE','PAST_DUE','CANCELLED','INCOMPLETE','INCOMPLETE_EXPIRED','TRIALING','UNPAID')),
  currentPeriodStart TIMESTAMPTZ NOT NULL,
  currentPeriodEnd TIMESTAMPTZ NOT NULL,
  cancelAtPeriodEnd BOOLEAN NOT NULL DEFAULT false,
  createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (planId) REFERENCES subscription_plans(id) ON DELETE RESTRICT
);

-- Create tenant_settings table
CREATE TABLE tenant_settings (
  id VARCHAR(191) PRIMARY KEY,
  tenantId VARCHAR(191) NOT NULL,
  key VARCHAR(191) NOT NULL,
  value VARCHAR(191) NOT NULL,
  createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenantId, key),
  FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Create usage table
CREATE TABLE usage (
  id VARCHAR(191) PRIMARY KEY,
  tenantId VARCHAR(191) NOT NULL,
  metric VARCHAR(191) NOT NULL,
  value INTEGER NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenantId, metric, date),
  FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Create verification_tokens table
CREATE TABLE verification_tokens (
  id VARCHAR(191) PRIMARY KEY,
  identifier VARCHAR(191) NOT NULL,
  token VARCHAR(191) NOT NULL UNIQUE,
  expires TIMESTAMPTZ NOT NULL,
  UNIQUE(identifier, token)
);

-- Create contacts table
CREATE TABLE contacts (
  id VARCHAR(191) PRIMARY KEY,
  name VARCHAR(191) NOT NULL,
  email VARCHAR(191) NOT NULL,
  company VARCHAR(191),
  phone VARCHAR(191),
  subject VARCHAR(191) NOT NULL,
  message TEXT NOT NULL,
  inquiryType VARCHAR(20) NOT NULL DEFAULT 'GENERAL' CHECK (inquiryType IN ('GENERAL','SUPPORT','SALES','BILLING','TECHNICAL','PARTNERSHIP')),
  status VARCHAR(20) NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW','IN_PROGRESS','RESOLVED','CLOSED')),
  ipAddress VARCHAR(191),
  userAgent VARCHAR(191),
  createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create feature_flags table
CREATE TABLE feature_flags (
  id VARCHAR(191) PRIMARY KEY,
  name VARCHAR(191) NOT NULL,
  key VARCHAR(191) NOT NULL UNIQUE,
  description VARCHAR(191),
  isEnabled BOOLEAN NOT NULL DEFAULT false,
  rolloutPercentage INTEGER NOT NULL DEFAULT 0,
  createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create feature_flag_conditions table
CREATE TABLE feature_flag_conditions (
  id VARCHAR(191) PRIMARY KEY,
  flagId VARCHAR(191) NOT NULL,
  type VARCHAR(191) NOT NULL,
  operator VARCHAR(191) NOT NULL,
  value VARCHAR(191) NOT NULL,
  isEnabled BOOLEAN NOT NULL DEFAULT true,
  createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (flagId) REFERENCES feature_flags(id) ON DELETE CASCADE
);

-- Create inventory_adjustments table (referenced but not fully defined in backup)
CREATE TABLE inventory_adjustments (
  id VARCHAR(191) PRIMARY KEY,
  tenantId VARCHAR(191) NOT NULL,
  ingredientId VARCHAR(191) NOT NULL,
  adjustmentType VARCHAR(20) NOT NULL CHECK (adjustmentType IN ('INCREASE','DECREASE','CORRECTION')),
  quantity DECIMAL(65,30) NOT NULL,
  reason VARCHAR(191),
  notes TEXT,
  createdById VARCHAR(191) NOT NULL,
  createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (ingredientId) REFERENCES ingredients(id) ON DELETE CASCADE,
  FOREIGN KEY (createdById) REFERENCES users(id) ON DELETE RESTRICT
);

-- Create shipments table
CREATE TABLE shipments (
  id VARCHAR(191) PRIMARY KEY,
  tenantId VARCHAR(191) NOT NULL,
  supplierId VARCHAR(191),
  shipmentNumber VARCHAR(191),
  receivedDate TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','RECEIVED','PARTIAL','CANCELLED')),
  notes VARCHAR(191),
  receivedById VARCHAR(191) NOT NULL,
  createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (supplierId) REFERENCES suppliers(id) ON DELETE SET NULL,
  FOREIGN KEY (receivedById) REFERENCES users(id) ON DELETE RESTRICT
);

-- Create shipment_items table
CREATE TABLE shipment_items (
  id VARCHAR(191) PRIMARY KEY,
  shipmentId VARCHAR(191) NOT NULL,
  ingredientId VARCHAR(191) NOT NULL,
  quantityOrdered DECIMAL(65,30) NOT NULL,
  quantityReceived DECIMAL(65,30) NOT NULL,
  unitCost DECIMAL(65,30),
  batchNumber VARCHAR(191),
  expirationDate TIMESTAMPTZ,
  notes VARCHAR(191),
  FOREIGN KEY (shipmentId) REFERENCES shipments(id) ON DELETE CASCADE,
  FOREIGN KEY (ingredientId) REFERENCES ingredients(id) ON DELETE CASCADE
);

-- Add foreign key constraint for accounts table
ALTER TABLE accounts ADD FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE;

-- Add indexes for better performance
CREATE INDEX idx_activity_logs_tenant_created ON activity_logs(tenantId, createdAt);
CREATE INDEX idx_activity_logs_user_created ON activity_logs(userId, createdAt);
CREATE INDEX idx_batches_tenant_status ON batches(tenantId, status);
CREATE INDEX idx_ingredients_tenant_type ON ingredients(tenantId, type);
CREATE INDEX idx_products_tenant_status ON products(tenantId, status);
CREATE INDEX idx_contacts_status_created ON contacts(status, createdAt);
CREATE INDEX idx_contacts_inquiry_created ON contacts(inquiryType, createdAt);

-- Create function to update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updatedAt = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updatedAt columns
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ingredients_updated_at BEFORE UPDATE ON ingredients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON recipes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_batches_updated_at BEFORE UPDATE ON batches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_packaging_types_updated_at BEFORE UPDATE ON packaging_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_storage_locations_updated_at BEFORE UPDATE ON storage_locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tenant_settings_updated_at BEFORE UPDATE ON tenant_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_feature_flags_updated_at BEFORE UPDATE ON feature_flags FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_feature_flag_conditions_updated_at BEFORE UPDATE ON feature_flag_conditions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_adjustments_updated_at BEFORE UPDATE ON inventory_adjustments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shipments_updated_at BEFORE UPDATE ON shipments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;