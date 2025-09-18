-- PostgreSQL Data Conversion Script
-- This script contains the converted data from MySQL backup

-- Insert _prisma_migrations data
INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES
('01JDQHQHQHQHQHQHQHQHQH','d41d8cd98f00b204e9800998ecf8427e','2024-11-20 10:00:00+00','20241120100000_init',NULL,NULL,'2024-11-20 10:00:00+00',1);

-- Insert tenants data
INSERT INTO tenants (id, name, subdomain, domain, status, createdAt, updatedAt) VALUES
('cm3xvqhqhqhqhqhqhqhqh1','Demo Coffee Roastery','demo','demo.coffeeapp.com','ACTIVE','2024-11-20 10:00:00+00','2024-11-20 10:00:00+00');

-- Insert users data
INSERT INTO users (id, tenantId, email, name, password, role, isActive, lastLogin, emailVerified, image, createdAt, updatedAt) VALUES
('cm3xvqhqhqhqhqhqhqhqh2','cm3xvqhqhqhqhqhqhqhqh1','admin@demo.com','Demo Admin','$2a$10$hashedpassword','ADMIN',true,'2024-11-20 10:00:00+00','2024-11-20 10:00:00+00',NULL,'2024-11-20 10:00:00+00','2024-11-20 10:00:00+00'),
('cm3xvqhqhqhqhqhqhqhqh3','cm3xvqhqhqhqhqhqhqhqh1','manager@demo.com','Demo Manager','$2a$10$hashedpassword','MANAGER',true,NULL,'2024-11-20 10:00:00+00',NULL,'2024-11-20 10:00:00+00','2024-11-20 10:00:00+00');

-- Insert suppliers data
INSERT INTO suppliers (id, tenantId, name, contactPerson, email, phone, address, notes, isActive, createdAt, updatedAt) VALUES
('cm3xvqhqhqhqhqhqhqhqh4','cm3xvqhqhqhqhqhqhqhqh1','Green Bean Co','John Smith','john@greenbean.com','+1234567890','123 Coffee St, Bean City','Premium coffee supplier',true,'2024-11-20 10:00:00+00','2024-11-20 10:00:00+00'),
('cm3xvqhqhqhqhqhqhqhqh5','cm3xvqhqhqhqhqhqhqhqh1','Milk Dairy Farm','Jane Doe','jane@milkfarm.com','+1234567891','456 Dairy Rd, Milk Town','Fresh milk supplier',true,'2024-11-20 10:00:00+00','2024-11-20 10:00:00+00');

-- Insert ingredients data
INSERT INTO ingredients (id, tenantId, name, type, stockQuantity, unitOfMeasure, minimumThreshold, costPerUnit, location, batchNumber, expirationDate, supplierId, isActive, createdAt, updatedAt) VALUES
('cm3xvqhqhqhqhqhqhqhqh6','cm3xvqhqhqhqhqhqhqhqh1','Ethiopian Yirgacheffe','COFFEE_BEANS',50.0,'kg',10.0,25.50,'Warehouse A','ETH-2024-001','2025-06-01 00:00:00+00','cm3xvqhqhqhqhqhqhqhqh4',true,'2024-11-20 10:00:00+00','2024-11-20 10:00:00+00'),
('cm3xvqhqhqhqhqhqhqhqh7','cm3xvqhqhqhqhqhqhqhqh1','Colombian Supremo','COFFEE_BEANS',75.0,'kg',15.0,22.00,'Warehouse A','COL-2024-001','2025-05-15 00:00:00+00','cm3xvqhqhqhqhqhqhqhqh4',true,'2024-11-20 10:00:00+00','2024-11-20 10:00:00+00'),
('cm3xvqhqhqhqhqhqhqhqh8','cm3xvqhqhqhqhqhqhqhqh1','Whole Milk','MILK',100.0,'liters',20.0,1.50,'Refrigerator','MILK-2024-001','2024-12-01 00:00:00+00','cm3xvqhqhqhqhqhqhqhqh5',true,'2024-11-20 10:00:00+00','2024-11-20 10:00:00+00'),
('cm3xvqhqhqhqhqhqhqhqh9','cm3xvqhqhqhqhqhqhqhqh1','Vanilla Syrup','SYRUP',25.0,'bottles',5.0,8.75,'Storage Room','VAN-2024-001','2025-03-01 00:00:00+00',NULL,true,'2024-11-20 10:00:00+00','2024-11-20 10:00:00+00');

-- Insert packaging_types data
INSERT INTO packaging_types (id, tenantId, name, description, isActive, createdAt, updatedAt) VALUES
('cm3xvqhqhqhqhqhqhqhq10','cm3xvqhqhqhqhqhqhqhqh1','250g Bag','Small retail bag for coffee beans',true,'2024-11-20 10:00:00+00','2024-11-20 10:00:00+00'),
('cm3xvqhqhqhqhqhqhqhq11','cm3xvqhqhqhqhqhqhqhqh1','500g Bag','Medium retail bag for coffee beans',true,'2024-11-20 10:00:00+00','2024-11-20 10:00:00+00'),
('cm3xvqhqhqhqhqhqhqhq12','cm3xvqhqhqhqhqhqhqhqh1','1kg Bag','Large retail bag for coffee beans',true,'2024-11-20 10:00:00+00','2024-11-20 10:00:00+00');

-- Insert recipes data
INSERT INTO recipes (id, tenantId, name, style, description, expectedYield, processInstructions, version, isActive, createdAt, updatedAt) VALUES
('cm3xvqhqhqhqhqhqhqhq13','cm3xvqhqhqhqhqhqhqhqh1','House Blend','Medium Roast','Our signature house blend combining Ethiopian and Colombian beans',10.0,'1. Preheat roaster to 200°C\n2. Add green beans\n3. Roast for 12-14 minutes\n4. Cool immediately',1,true,'2024-11-20 10:00:00+00','2024-11-20 10:00:00+00'),
('cm3xvqhqhqhqhqhqhqhq14','cm3xvqhqhqhqhqhqhqhqh1','Espresso Blend','Dark Roast','Bold espresso blend for coffee shops',8.0,'1. Preheat roaster to 220°C\n2. Add green beans\n3. Roast for 15-17 minutes\n4. Cool immediately',1,true,'2024-11-20 10:00:00+00','2024-11-20 10:00:00+00');

-- Insert recipe_ingredients data
INSERT INTO recipe_ingredients (id, recipeId, ingredientId, quantity, unit, notes) VALUES
('cm3xvqhqhqhqhqhqhqhq15','cm3xvqhqhqhqhqhqhqhq13','cm3xvqhqhqhqhqhqhqhqh6',6.0,'kg','60% Ethiopian beans'),
('cm3xvqhqhqhqhqhqhqhq16','cm3xvqhqhqhqhqhqhqhq13','cm3xvqhqhqhqhqhqhqhqh7',4.0,'kg','40% Colombian beans'),
('cm3xvqhqhqhqhqhqhqhq17','cm3xvqhqhqhqhqhqhqhq14','cm3xvqhqhqhqhqhqhqhqh7',8.0,'kg','100% Colombian for espresso');

-- Insert batches data
INSERT INTO batches (id, tenantId, recipeId, batchNumber, status, startDate, endDate, actualYield, qualityNotes, notes, createdById, createdAt, updatedAt) VALUES
('cm3xvqhqhqhqhqhqhqhq18','cm3xvqhqhqhqhqhqhqhqh1','cm3xvqhqhqhqhqhqhqhq13','HB-2024-001','COMPLETED','2024-11-15 09:00:00+00','2024-11-15 11:30:00+00',9.8,'{"aroma": "excellent", "color": "perfect", "taste": "balanced"}','Great batch, perfect roast level','cm3xvqhqhqhqhqhqhqhqh2','2024-11-15 09:00:00+00','2024-11-15 11:30:00+00'),
('cm3xvqhqhqhqhqhqhqhq19','cm3xvqhqhqhqhqhqhqhqh1','cm3xvqhqhqhqhqhqhqhq14','EB-2024-001','IN_PROGRESS','2024-11-20 08:00:00+00',NULL,NULL,NULL,'Currently roasting espresso blend','cm3xvqhqhqhqhqhqhqhqh3','2024-11-20 08:00:00+00','2024-11-20 08:00:00+00');

-- Insert products data
INSERT INTO products (id, tenantId, batchId, name, packagingTypeId, packagingDate, lotNumber, quantity, shelfLife, storageLocation, status, createdAt, updatedAt) VALUES
('cm3xvqhqhqhqhqhqhqhq20','cm3xvqhqhqhqhqhqhqhqh1','cm3xvqhqhqhqhqhqhqhq18','House Blend 250g','cm3xvqhqhqhqhqhqhqhq10','2024-11-15 12:00:00+00','HB-250-001',39.0,365,'Finished Goods','IN_STOCK','2024-11-15 12:00:00+00','2024-11-15 12:00:00+00'),
('cm3xvqhqhqhqhqhqhqhq21','cm3xvqhqhqhqhqhqhqhqh1','cm3xvqhqhqhqhqhqhqhq18','House Blend 500g','cm3xvqhqhqhqhqhqhqhq11','2024-11-15 12:00:00+00','HB-500-001',19.0,365,'Finished Goods','IN_STOCK','2024-11-15 12:00:00+00','2024-11-15 12:00:00+00');

-- Insert storage_locations data
INSERT INTO storage_locations (id, tenantId, name, description, capacity, isActive, createdAt, updatedAt) VALUES
('cm3xvqhqhqhqhqhqhqhq22','cm3xvqhqhqhqhqhqhqhqh1','Warehouse A','Main storage for green beans',1000,true,'2024-11-20 10:00:00+00','2024-11-20 10:00:00+00'),
('cm3xvqhqhqhqhqhqhqhq23','cm3xvqhqhqhqhqhqhqhqh1','Refrigerator','Cold storage for dairy products',200,true,'2024-11-20 10:00:00+00','2024-11-20 10:00:00+00'),
('cm3xvqhqhqhqhqhqhqhq24','cm3xvqhqhqhqhqhqhqhqh1','Finished Goods','Storage for packaged products',500,true,'2024-11-20 10:00:00+00','2024-11-20 10:00:00+00');

-- Insert subscription_plans data
INSERT INTO subscription_plans (id, name, description, price, interval, maxUsers, maxIngredients, maxBatches, features, isActive, createdAt, updatedAt, maxStorageLocations, maxProducts, maxRecipes) VALUES
('cm3xvqhqhqhqhqhqhqhq25','Starter','Perfect for small coffee roasters',29.99,'MONTHLY',5,50,20,'{"inventory_management": true, "batch_tracking": true, "basic_reports": true}',true,'2024-11-20 10:00:00+00','2024-11-20 10:00:00+00',5,100,10),
('cm3xvqhqhqhqhqhqhqhq26','Professional','For growing coffee businesses',79.99,'MONTHLY',15,200,100,'{"inventory_management": true, "batch_tracking": true, "advanced_reports": true, "multi_location": true}',true,'2024-11-20 10:00:00+00','2024-11-20 10:00:00+00',15,500,50),
('cm3xvqhqhqhqhqhqhqhq27','Enterprise','For large coffee operations',199.99,'MONTHLY',50,1000,500,'{"inventory_management": true, "batch_tracking": true, "advanced_reports": true, "multi_location": true, "api_access": true, "custom_integrations": true}',true,'2024-11-20 10:00:00+00','2024-11-20 10:00:00+00',50,2000,200);

-- Insert subscriptions data
INSERT INTO subscriptions (id, tenantId, planId, stripeCustomerId, stripeSubscriptionId, status, currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd, createdAt, updatedAt) VALUES
('cm3xvqhqhqhqhqhqhqhq28','cm3xvqhqhqhqhqhqhqhqh1','cm3xvqhqhqhqhqhqhqhq26','cus_demo123','sub_demo123','ACTIVE','2024-11-01 00:00:00+00','2024-12-01 00:00:00+00',false,'2024-11-01 00:00:00+00','2024-11-01 00:00:00+00');

-- Insert permissions data
INSERT INTO permissions (id, name, description, resource, action, createdAt) VALUES
('cm3xvqhqhqhqhqhqhqhq29','manage_users','Manage user accounts','users','manage','2024-11-20 10:00:00+00'),
('cm3xvqhqhqhqhqhqhqhq30','view_inventory','View inventory items','inventory','view','2024-11-20 10:00:00+00'),
('cm3xvqhqhqhqhqhqhqhq31','manage_inventory','Manage inventory items','inventory','manage','2024-11-20 10:00:00+00'),
('cm3xvqhqhqhqhqhqhqhq32','view_batches','View batch information','batches','view','2024-11-20 10:00:00+00'),
('cm3xvqhqhqhqhqhqhqhq33','manage_batches','Manage batch operations','batches','manage','2024-11-20 10:00:00+00');

-- Insert roles data
INSERT INTO roles (id, name, description, isSystem, tenantId, createdAt, updatedAt) VALUES
('cm3xvqhqhqhqhqhqhqhq34','Admin','Full system access',false,'cm3xvqhqhqhqhqhqhqhqh1','2024-11-20 10:00:00+00','2024-11-20 10:00:00+00'),
('cm3xvqhqhqhqhqhqhqhq35','Manager','Management level access',false,'cm3xvqhqhqhqhqhqhqhqh1','2024-11-20 10:00:00+00','2024-11-20 10:00:00+00'),
('cm3xvqhqhqhqhqhqhqhq36','Staff','Basic staff access',false,'cm3xvqhqhqhqhqhqhqhqh1','2024-11-20 10:00:00+00','2024-11-20 10:00:00+00');

-- Insert role_permissions data
INSERT INTO role_permissions (id, roleId, permissionId) VALUES
('cm3xvqhqhqhqhqhqhqhq37','cm3xvqhqhqhqhqhqhqhq34','cm3xvqhqhqhqhqhqhqhq29'),
('cm3xvqhqhqhqhqhqhqhq38','cm3xvqhqhqhqhqhqhqhq34','cm3xvqhqhqhqhqhqhqhq31'),
('cm3xvqhqhqhqhqhqhqhq39','cm3xvqhqhqhqhqhqhqhq34','cm3xvqhqhqhqhqhqhqhq33'),
('cm3xvqhqhqhqhqhqhqhq40','cm3xvqhqhqhqhqhqhqhq35','cm3xvqhqhqhqhqhqhqhq31'),
('cm3xvqhqhqhqhqhqhqhq41','cm3xvqhqhqhqhqhqhqhq35','cm3xvqhqhqhqhqhqhqhq33'),
('cm3xvqhqhqhqhqhqhqhq42','cm3xvqhqhqhqhqhqhqhq36','cm3xvqhqhqhqhqhqhqhq30'),
('cm3xvqhqhqhqhqhqhqhq43','cm3xvqhqhqhqhqhqhqhq36','cm3xvqhqhqhqhqhqhqhq32');

-- Insert user_role_assignments data
INSERT INTO user_role_assignments (id, userId, roleId, assignedAt, assignedBy) VALUES
('cm3xvqhqhqhqhqhqhqhq44','cm3xvqhqhqhqhqhqhqhqh2','cm3xvqhqhqhqhqhqhqhq34','2024-11-20 10:00:00+00',NULL),
('cm3xvqhqhqhqhqhqhqhq45','cm3xvqhqhqhqhqhqhqhqh3','cm3xvqhqhqhqhqhqhqhq35','2024-11-20 10:00:00+00','cm3xvqhqhqhqhqhqhqhqh2');

-- Insert activity_logs data
INSERT INTO activity_logs (id, tenantId, userId, action, resource, resourceId, details, ipAddress, userAgent, createdAt) VALUES
('cm3xvqhqhqhqhqhqhqhq46','cm3xvqhqhqhqhqhqhqhqh1','cm3xvqhqhqhqhqhqhqhqh2','CREATE','batch','cm3xvqhqhqhqhqhqhqhq18','{"batchNumber": "HB-2024-001", "recipe": "House Blend"}','192.168.1.100','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)','2024-11-15 09:00:00+00'),
('cm3xvqhqhqhqhqhqhqhq47','cm3xvqhqhqhqhqhqhqhqh1','cm3xvqhqhqhqhqhqhqhqh2','UPDATE','batch','cm3xvqhqhqhqhqhqhqhq18','{"status": "COMPLETED", "actualYield": 9.8}','192.168.1.100','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)','2024-11-15 11:30:00+00'),
('cm3xvqhqhqhqhqhqhqhq48','cm3xvqhqhqhqhqhqhqhqh1','cm3xvqhqhqhqhqhqhqhqh3','CREATE','batch','cm3xvqhqhqhqhqhqhqhq19','{"batchNumber": "EB-2024-001", "recipe": "Espresso Blend"}','192.168.1.101','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)','2024-11-20 08:00:00+00');

-- Insert schedules data
INSERT INTO schedules (id, tenantId, title, description, type, startDate, endDate, isRecurring, recurrenceRule, status, createdAt, updatedAt) VALUES
('cm3xvqhqhqhqhqhqhqhq49','cm3xvqhqhqhqhqhqhqhqh1','Weekly Roasting Session','Regular weekly roasting for house blend','BREW_SESSION','2024-11-25 09:00:00+00','2024-11-25 12:00:00+00',true,'FREQ=WEEKLY;BYDAY=MO','SCHEDULED','2024-11-20 10:00:00+00','2024-11-20 10:00:00+00'),
('cm3xvqhqhqhqhqhqhqhq50','cm3xvqhqhqhqhqhqhqhqh1','Equipment Maintenance','Monthly equipment cleaning and maintenance','MAINTENANCE','2024-12-01 14:00:00+00','2024-12-01 17:00:00+00',true,'FREQ=MONTHLY;BYMONTHDAY=1','SCHEDULED','2024-11-20 10:00:00+00','2024-11-20 10:00:00+00');

-- Insert tenant_settings data
INSERT INTO tenant_settings (id, tenantId, key, value, createdAt, updatedAt) VALUES
('cm3xvqhqhqhqhqhqhqhq51','cm3xvqhqhqhqhqhqhqhqh1','default_currency','USD','2024-11-20 10:00:00+00','2024-11-20 10:00:00+00'),
('cm3xvqhqhqhqhqhqhqhq52','cm3xvqhqhqhqhqhqhqhqh1','timezone','America/New_York','2024-11-20 10:00:00+00','2024-11-20 10:00:00+00'),
('cm3xvqhqhqhqhqhqhqhq53','cm3xvqhqhqhqhqhqhqhqh1','low_stock_threshold','10','2024-11-20 10:00:00+00','2024-11-20 10:00:00+00');

-- Insert usage data
INSERT INTO usage (id, tenantId, metric, value, date) VALUES
('cm3xvqhqhqhqhqhqhqhq54','cm3xvqhqhqhqhqhqhqhqh1','active_users',2,'2024-11-20 00:00:00+00'),
('cm3xvqhqhqhqhqhqhqhq55','cm3xvqhqhqhqhqhqhqhqh1','batches_created',2,'2024-11-20 00:00:00+00'),
('cm3xvqhqhqhqhqhqhqhq56','cm3xvqhqhqhqhqhqhqhqh1','ingredients_managed',4,'2024-11-20 00:00:00+00');

-- Insert contacts data
INSERT INTO contacts (id, name, email, company, phone, subject, message, inquiryType, status, ipAddress, userAgent, createdAt, updatedAt) VALUES
('cm3xvqhqhqhqhqhqhqhq57','John Coffee','john@coffeelover.com','Coffee Lover Inc','+1234567892','Product Inquiry','Interested in your coffee inventory management system','SALES','NEW','203.0.113.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64)','2024-11-19 14:30:00+00','2024-11-19 14:30:00+00');

-- Insert feature_flags data
INSERT INTO feature_flags (id, name, key, description, isEnabled, rolloutPercentage, createdAt, updatedAt) VALUES
('cm3xvqhqhqhqhqhqhqhq58','Advanced Analytics','advanced_analytics','Enable advanced analytics dashboard',true,100,'2024-11-20 10:00:00+00','2024-11-20 10:00:00+00'),
('cm3xvqhqhqhqhqhqhqhq59','Mobile App','mobile_app','Enable mobile application features',false,0,'2024-11-20 10:00:00+00','2024-11-20 10:00:00+00');

-- Insert feature_flag_conditions data
INSERT INTO feature_flag_conditions (id, flagId, type, operator, value, isEnabled, createdAt, updatedAt) VALUES
('cm3xvqhqhqhqhqhqhqhq60','cm3xvqhqhqhqhqhqhqhq58','tenant_plan','equals','Professional',true,'2024-11-20 10:00:00+00','2024-11-20 10:00:00+00'),
('cm3xvqhqhqhqhqhqhqhq61','cm3xvqhqhqhqhqhqhqhq59','user_role','equals','ADMIN',true,'2024-11-20 10:00:00+00','2024-11-20 10:00:00+00');

COMMIT;