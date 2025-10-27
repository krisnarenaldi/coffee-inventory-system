-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELLED', 'INCOMPLETE', 'INCOMPLETE_EXPIRED', 'TRIALING', 'UNPAID', 'PENDING_CHECKOUT');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'EXPIRED', 'REFUNDED', 'SCHEDULED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PLATFORM_ADMIN', 'SUPPORT', 'BILLING_ADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE_STAFF', 'SALES', 'STAFF');

-- CreateEnum
CREATE TYPE "IngredientType" AS ENUM ('COFFEE_BEANS', 'MILK', 'SUGAR', 'SYRUP', 'PASTRY', 'PACKAGING', 'OTHER');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('LOW_STOCK', 'EXPIRATION', 'REORDER', 'BATCH_READY', 'MAINTENANCE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ScheduleType" AS ENUM ('BREW_SESSION', 'MAINTENANCE', 'CLEANING', 'DELIVERY', 'MEETING', 'OTHER');

-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'POSTPONED');

-- CreateEnum
CREATE TYPE "InventoryAdjustmentType" AS ENUM ('INCREASE', 'DECREASE', 'CORRECTION', 'WASTE', 'TRANSFER');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('PENDING', 'RECEIVED', 'PARTIAL', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ContactInquiryType" AS ENUM ('GENERAL', 'SUPPORT', 'SALES', 'BILLING', 'TECHNICAL', 'PARTNERSHIP');

-- CreateEnum
CREATE TYPE "ContactStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subdomain" TEXT NOT NULL,
    "domain" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedat" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_settings" (
    "id" TEXT NOT NULL,
    "tenantid" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedat" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(65,30) NOT NULL,
    "interval" "BillingInterval" NOT NULL,
    "maxusers" INTEGER,
    "maxingredients" INTEGER,
    "maxbatches" INTEGER,
    "features" JSONB NOT NULL,
    "isactive" BOOLEAN NOT NULL DEFAULT true,
    "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedat" TIMESTAMP(3) NOT NULL,
    "maxstoragelocations" INTEGER,
    "maxproducts" INTEGER,
    "maxrecipes" INTEGER,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "tenantid" TEXT NOT NULL,
    "planid" TEXT NOT NULL,
    "stripecustomerid" TEXT,
    "stripesubscriptionid" TEXT,
    "status" "SubscriptionStatus" NOT NULL,
    "currentperiodstart" TIMESTAMP(3) NOT NULL,
    "currentperiodend" TIMESTAMP(3),
    "cancelatperiodend" BOOLEAN NOT NULL DEFAULT false,
    "intendedplan" TEXT,
    "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedat" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "userid" TEXT NOT NULL,
    "tenantid" TEXT NOT NULL,
    "subscriptionplanid" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "billingcycle" TEXT NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "paymentmethod" TEXT NOT NULL,
    "paymentgatewayid" TEXT,
    "metadata" JSONB,
    "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedat" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage" (
    "id" TEXT NOT NULL,
    "tenantid" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "tenantid" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'STAFF',
    "isactive" BOOLEAN NOT NULL DEFAULT true,
    "lastlogin" TIMESTAMP(3),
    "emailverified" TIMESTAMP(3),
    "image" TEXT,
    "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedat" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "issystem" BOOLEAN NOT NULL DEFAULT false,
    "tenantid" TEXT,
    "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedat" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL,
    "roleid" TEXT NOT NULL,
    "permissionid" TEXT NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_role_assignments" (
    "id" TEXT NOT NULL,
    "userid" TEXT NOT NULL,
    "roleid" TEXT NOT NULL,
    "assignedat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedby" TEXT,

    CONSTRAINT "user_role_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userid" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provideraccountid" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessiontoken" TEXT NOT NULL,
    "userid" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingredients" (
    "id" TEXT NOT NULL,
    "tenantid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "IngredientType" NOT NULL,
    "stockquantity" DECIMAL(65,30) NOT NULL DEFAULT 0.000000000000000000000000000000,
    "unitofmeasure" TEXT NOT NULL,
    "minimumthreshold" DECIMAL(65,30) NOT NULL,
    "costperunit" DECIMAL(65,30) NOT NULL,
    "location" TEXT,
    "batchnumber" TEXT,
    "expirationdate" TIMESTAMP(3),
    "supplierid" TEXT,
    "isactive" BOOLEAN NOT NULL DEFAULT true,
    "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedat" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "tenantid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactperson" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "isactive" BOOLEAN NOT NULL DEFAULT true,
    "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedat" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_adjustments" (
    "id" TEXT NOT NULL,
    "tenantid" TEXT NOT NULL,
    "ingredientid" TEXT NOT NULL,
    "adjustmenttype" "InventoryAdjustmentType" NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "reason" TEXT,
    "notes" TEXT,
    "createdbyid" TEXT NOT NULL,
    "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedat" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments" (
    "id" TEXT NOT NULL,
    "tenantid" TEXT NOT NULL,
    "supplierid" TEXT,
    "shipmentnumber" TEXT,
    "receiveddate" TIMESTAMP(3) NOT NULL,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "receivedbyid" TEXT NOT NULL,
    "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedat" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_items" (
    "id" TEXT NOT NULL,
    "shipmentid" TEXT NOT NULL,
    "ingredientid" TEXT NOT NULL,
    "quantityordered" DECIMAL(65,30) NOT NULL,
    "quantityreceived" DECIMAL(65,30) NOT NULL,
    "unitcost" DECIMAL(65,30),
    "batchnumber" TEXT,
    "expirationdate" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "shipment_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipes" (
    "id" TEXT NOT NULL,
    "tenantid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "style" TEXT,
    "description" TEXT,
    "expectedyield" DECIMAL(65,30) NOT NULL,
    "processinstructions" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isactive" BOOLEAN NOT NULL DEFAULT true,
    "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedat" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_ingredients" (
    "id" TEXT NOT NULL,
    "recipeid" TEXT NOT NULL,
    "ingredientid" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "unit" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batches" (
    "id" TEXT NOT NULL,
    "tenantid" TEXT NOT NULL,
    "recipeid" TEXT NOT NULL,
    "batchnumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "startdate" TIMESTAMP(3),
    "enddate" TIMESTAMP(3),
    "actualyield" DECIMAL(65,30),
    "qualitynotes" JSONB,
    "notes" TEXT,
    "createdbyid" TEXT NOT NULL,
    "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedat" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "tenantid" TEXT NOT NULL,
    "batchid" TEXT,
    "name" TEXT NOT NULL,
    "packagingtypeid" TEXT,
    "packagingdate" TIMESTAMP(3),
    "lotnumber" TEXT,
    "quantity" DECIMAL(65,30) NOT NULL DEFAULT 0.000000000000000000000000000000,
    "shelflife" INTEGER,
    "storagelocation" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IN_STOCK',
    "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedat" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "storage_locations" (
    "id" TEXT NOT NULL,
    "tenantid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "capacity" INTEGER,
    "isactive" BOOLEAN NOT NULL DEFAULT true,
    "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedat" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "storage_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packaging_types" (
    "id" TEXT NOT NULL,
    "tenantid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isactive" BOOLEAN NOT NULL DEFAULT true,
    "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedat" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "packaging_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "scheduleId" TEXT,
    "type" "AlertType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'MEDIUM',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedules" (
    "id" TEXT NOT NULL,
    "tenantid" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "ScheduleType" NOT NULL,
    "startdate" TIMESTAMP(3) NOT NULL,
    "enddate" TIMESTAMP(3),
    "isrecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrencerule" TEXT,
    "status" "ScheduleStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedat" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "isenabled" BOOLEAN NOT NULL DEFAULT false,
    "rolloutpercentage" INTEGER NOT NULL DEFAULT 0,
    "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedat" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flag_conditions" (
    "id" TEXT NOT NULL,
    "flagid" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "isenabled" BOOLEAN NOT NULL DEFAULT true,
    "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedat" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flag_conditions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "tenantid" TEXT NOT NULL,
    "userid" TEXT,
    "activity_type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "resource_id" TEXT,
    "resource_type" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT,
    "phone" TEXT,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "inquirytype" "ContactInquiryType" NOT NULL DEFAULT 'GENERAL',
    "status" "ContactStatus" NOT NULL DEFAULT 'NEW',
    "ipaddress" TEXT,
    "useragent" TEXT,
    "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedat" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_subdomain_key" ON "tenants"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_settings_tenantid_key_key" ON "tenant_settings"("tenantid", "key");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_tenantid_key" ON "subscriptions"("tenantid");

-- CreateIndex
CREATE INDEX "subscriptions_planId_idx" ON "subscriptions"("planid");

-- CreateIndex
CREATE INDEX "transactions_userId_idx" ON "transactions"("userid");

-- CreateIndex
CREATE INDEX "transactions_tenantId_idx" ON "transactions"("tenantid");

-- CreateIndex
CREATE INDEX "transactions_subscriptionPlanId_idx" ON "transactions"("subscriptionplanid");

-- CreateIndex
CREATE UNIQUE INDEX "usage_tenantid_metric_date_key" ON "usage"("tenantid", "metric", "date");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenantid_email_key" ON "users"("tenantid", "email");

-- CreateIndex
CREATE INDEX "roles_tenantId_idx" ON "roles"("tenantid");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_tenantid_key" ON "roles"("name", "tenantid");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_name_key" ON "permissions"("name");

-- CreateIndex
CREATE INDEX "role_permissions_permissionId_idx" ON "role_permissions"("permissionid");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_roleid_permissionid_key" ON "role_permissions"("roleid", "permissionid");

-- CreateIndex
CREATE INDEX "user_role_assignments_roleId_idx" ON "user_role_assignments"("roleid");

-- CreateIndex
CREATE UNIQUE INDEX "user_role_assignments_userid_roleid_key" ON "user_role_assignments"("userid", "roleid");

-- CreateIndex
CREATE INDEX "accounts_userId_idx" ON "accounts"("userid");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provideraccountid_key" ON "accounts"("provider", "provideraccountid");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessiontoken_key" ON "sessions"("sessiontoken");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userid");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE INDEX "ingredients_supplierId_idx" ON "ingredients"("supplierid");

-- CreateIndex
CREATE INDEX "ingredients_tenantId_idx" ON "ingredients"("tenantid");

-- CreateIndex
CREATE INDEX "suppliers_tenantId_idx" ON "suppliers"("tenantid");

-- CreateIndex
CREATE INDEX "inventory_adjustments_createdById_idx" ON "inventory_adjustments"("createdbyid");

-- CreateIndex
CREATE INDEX "inventory_adjustments_ingredientId_idx" ON "inventory_adjustments"("ingredientid");

-- CreateIndex
CREATE INDEX "inventory_adjustments_tenantId_idx" ON "inventory_adjustments"("tenantid");

-- CreateIndex
CREATE INDEX "shipments_receivedById_idx" ON "shipments"("receivedbyid");

-- CreateIndex
CREATE INDEX "shipments_supplierId_idx" ON "shipments"("supplierid");

-- CreateIndex
CREATE INDEX "shipments_tenantId_idx" ON "shipments"("tenantid");

-- CreateIndex
CREATE INDEX "shipment_items_ingredientId_idx" ON "shipment_items"("ingredientid");

-- CreateIndex
CREATE INDEX "shipment_items_shipmentId_idx" ON "shipment_items"("shipmentid");

-- CreateIndex
CREATE INDEX "recipes_tenantId_idx" ON "recipes"("tenantid");

-- CreateIndex
CREATE INDEX "recipe_ingredients_ingredientId_idx" ON "recipe_ingredients"("ingredientid");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_ingredients_recipeid_ingredientid_key" ON "recipe_ingredients"("recipeid", "ingredientid");

-- CreateIndex
CREATE INDEX "batches_createdById_idx" ON "batches"("createdbyid");

-- CreateIndex
CREATE INDEX "batches_recipeId_idx" ON "batches"("recipeid");

-- CreateIndex
CREATE UNIQUE INDEX "batches_tenantid_batchnumber_key" ON "batches"("tenantid", "batchnumber");

-- CreateIndex
CREATE INDEX "products_batchId_idx" ON "products"("batchid");

-- CreateIndex
CREATE INDEX "products_packagingTypeId_idx" ON "products"("packagingtypeid");

-- CreateIndex
CREATE INDEX "products_tenantId_idx" ON "products"("tenantid");

-- CreateIndex
CREATE UNIQUE INDEX "storage_locations_tenantid_name_key" ON "storage_locations"("tenantid", "name");

-- CreateIndex
CREATE UNIQUE INDEX "packaging_types_tenantid_name_key" ON "packaging_types"("tenantid", "name");

-- CreateIndex
CREATE INDEX "alerts_resolvedById_idx" ON "alerts"("resolvedById");

-- CreateIndex
CREATE INDEX "alerts_scheduleId_idx" ON "alerts"("scheduleId");

-- CreateIndex
CREATE INDEX "alerts_tenantId_idx" ON "alerts"("tenantId");

-- CreateIndex
CREATE INDEX "schedules_tenantId_idx" ON "schedules"("tenantid");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_key_key" ON "feature_flags"("key");

-- CreateIndex
CREATE INDEX "feature_flag_conditions_flagId_idx" ON "feature_flag_conditions"("flagid");

-- CreateIndex
CREATE INDEX "activity_logs_tenantid_timestamp_idx" ON "activity_logs"("tenantid", "timestamp");

-- CreateIndex
CREATE INDEX "activity_logs_userid_timestamp_idx" ON "activity_logs"("userid", "timestamp");

-- CreateIndex
CREATE INDEX "activity_logs_activity_type_timestamp_idx" ON "activity_logs"("activity_type", "timestamp");

-- CreateIndex
CREATE INDEX "contacts_status_createdat_idx" ON "contacts"("status", "createdat");

-- CreateIndex
CREATE INDEX "contacts_inquirytype_createdat_idx" ON "contacts"("inquirytype", "createdat");

-- AddForeignKey
ALTER TABLE "tenant_settings" ADD CONSTRAINT "tenant_settings_tenantid_fkey" FOREIGN KEY ("tenantid") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_planid_fkey" FOREIGN KEY ("planid") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tenantid_fkey" FOREIGN KEY ("tenantid") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userid_fkey" FOREIGN KEY ("userid") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_tenantid_fkey" FOREIGN KEY ("tenantid") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_subscriptionplanid_fkey" FOREIGN KEY ("subscriptionplanid") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage" ADD CONSTRAINT "usage_tenantid_fkey" FOREIGN KEY ("tenantid") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenantid_fkey" FOREIGN KEY ("tenantid") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_tenantid_fkey" FOREIGN KEY ("tenantid") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionid_fkey" FOREIGN KEY ("permissionid") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleid_fkey" FOREIGN KEY ("roleid") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_roleid_fkey" FOREIGN KEY ("roleid") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_userid_fkey" FOREIGN KEY ("userid") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userid_fkey" FOREIGN KEY ("userid") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userid_fkey" FOREIGN KEY ("userid") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_supplierid_fkey" FOREIGN KEY ("supplierid") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_tenantid_fkey" FOREIGN KEY ("tenantid") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_tenantid_fkey" FOREIGN KEY ("tenantid") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_adjustments" ADD CONSTRAINT "inventory_adjustments_createdbyid_fkey" FOREIGN KEY ("createdbyid") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_adjustments" ADD CONSTRAINT "inventory_adjustments_ingredientid_fkey" FOREIGN KEY ("ingredientid") REFERENCES "ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_adjustments" ADD CONSTRAINT "inventory_adjustments_tenantid_fkey" FOREIGN KEY ("tenantid") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_receivedbyid_fkey" FOREIGN KEY ("receivedbyid") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_supplierid_fkey" FOREIGN KEY ("supplierid") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_tenantid_fkey" FOREIGN KEY ("tenantid") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_items" ADD CONSTRAINT "shipment_items_ingredientid_fkey" FOREIGN KEY ("ingredientid") REFERENCES "ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_items" ADD CONSTRAINT "shipment_items_shipmentid_fkey" FOREIGN KEY ("shipmentid") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_tenantid_fkey" FOREIGN KEY ("tenantid") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_ingredientid_fkey" FOREIGN KEY ("ingredientid") REFERENCES "ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipeid_fkey" FOREIGN KEY ("recipeid") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_createdbyid_fkey" FOREIGN KEY ("createdbyid") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_recipeid_fkey" FOREIGN KEY ("recipeid") REFERENCES "recipes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_tenantid_fkey" FOREIGN KEY ("tenantid") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_batchid_fkey" FOREIGN KEY ("batchid") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_packagingtypeid_fkey" FOREIGN KEY ("packagingtypeid") REFERENCES "packaging_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_tenantid_fkey" FOREIGN KEY ("tenantid") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storage_locations" ADD CONSTRAINT "storage_locations_tenantid_fkey" FOREIGN KEY ("tenantid") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packaging_types" ADD CONSTRAINT "packaging_types_tenantid_fkey" FOREIGN KEY ("tenantid") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_tenantid_fkey" FOREIGN KEY ("tenantid") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_flag_conditions" ADD CONSTRAINT "feature_flag_conditions_flagid_fkey" FOREIGN KEY ("flagid") REFERENCES "feature_flags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_tenantid_fkey" FOREIGN KEY ("tenantid") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_userid_fkey" FOREIGN KEY ("userid") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
