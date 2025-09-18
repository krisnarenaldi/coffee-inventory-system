-- Fix demo user email for login
-- This script adds the correct admin@demo.com user to the demo tenant

-- First, get the demo tenant ID
-- Replace 'DEMO_TENANT_ID' with the actual tenant ID from your database

-- Insert the correct demo admin user
INSERT INTO users (id, tenantid, email, name, password, role, isactive, emailverified, createdat, updatedat)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM tenants WHERE subdomain = 'demo'),
  'admin@demo.com',
  'Demo Admin',
  '$2a$12$XkJV0szE.N.tsHN6iAmiee/IfajtSwGgTVeKIJAtaubl5xSwkNC5G', -- This is bcrypt hash for 'demo123'
  'ADMIN',
  true,
  NOW(),
  NOW(),
  NOW()
)
ON CONFLICT (tenantid, email) DO UPDATE SET
  name = EXCLUDED.name,
  password = EXCLUDED.password,
  role = EXCLUDED.role,
  isactive = EXCLUDED.isactive,
  updatedat = NOW();

-- Verify the user was created
SELECT u.email, u.name, u.role, t.subdomain 
FROM users u 
JOIN tenants t ON u.tenantid = t.id 
WHERE u.email = 'admin@demo.com';