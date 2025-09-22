const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createPlatformAdminAndFixSubscription() {
  try {
    console.log('Starting platform admin creation and subscription fix...');

    // Check if tenant exists
    const tenantId = 'cmfp2yyth0000ro9yinlxkqx4';
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscription: true,
        users: true
      }
    });

    if (!tenant) {
      console.error(`Tenant with ID ${tenantId} not found`);
      return;
    }

    console.log(`Found tenant: ${tenant.name} (${tenant.subdomain})`);
    console.log(`Current subscription status:`, tenant.subscription ? 'EXISTS' : 'MISSING');

    // Create PLATFORM_ADMIN user
    const adminEmail = 'admin@coffeelogica.com';
    const adminPassword = 'Admin123!'; // You should change this password after creation
    
    // Check if admin user already exists
    let adminUser = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (!adminUser) {
      const hashedPassword = await bcrypt.hash(adminPassword, 12);
      
      adminUser = await prisma.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          name: 'Platform Administrator',
          role: 'PLATFORM_ADMIN',
          tenantId: null, // Platform admin doesn't belong to a specific tenant
          isActive: true,
          emailVerified: new Date()
        }
      });
      
      console.log(`✅ Created PLATFORM_ADMIN user: ${adminEmail}`);
      console.log(`⚠️  Default password: ${adminPassword} (CHANGE THIS IMMEDIATELY)`);
    } else {
      console.log(`✅ PLATFORM_ADMIN user already exists: ${adminEmail}`);
      
      // Update role if needed
      if (adminUser.role !== 'PLATFORM_ADMIN') {
        await prisma.user.update({
          where: { id: adminUser.id },
          data: { role: 'PLATFORM_ADMIN' }
        });
        console.log(`✅ Updated user role to PLATFORM_ADMIN`);
      }
    }

    // Fix missing subscription for the tenant
    if (!tenant.subscription) {
      console.log(`Creating subscription for tenant ${tenant.name}...`);
      
      // Find or create a subscription plan
      let premiumPlan = await prisma.subscriptionPlan.findFirst({
        where: { name: 'Premium Plan' }
      });

      if (!premiumPlan) {
        premiumPlan = await prisma.subscriptionPlan.create({
          data: {
            name: 'Premium Plan',
            description: 'Full access to all features',
            price: 29.99,
            interval: 'MONTHLY',
            maxUsers: 50,
            maxIngredients: 1000,
            maxBatches: 500,
            maxStorageLocations: 20,
            maxRecipes: 200,
            maxProducts: 200,
            features: {
              reports: true,
              analytics: true,
              api_access: true,
              priority_support: true
            },
            isActive: true
          }
        });
        console.log(`✅ Created Premium Plan`);
      }

      // Create subscription
      const now = new Date();
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1); // 1 year from now

      const subscription = await prisma.subscription.create({
        data: {
          tenantId: tenant.id,
          planId: premiumPlan.id,
          status: 'ACTIVE',
          currentPeriodStart: now,
          currentPeriodEnd: futureDate,
          cancelAtPeriodEnd: false
        }
      });

      console.log(`✅ Created subscription for tenant ${tenant.name}`);
      console.log(`   Plan: ${premiumPlan.name}`);
      console.log(`   Status: ${subscription.status}`);
      console.log(`   Valid until: ${subscription.currentPeriodEnd.toISOString()}`);
    } else {
      console.log(`✅ Tenant ${tenant.name} already has a subscription`);
    }

    console.log('\n🎉 All tasks completed successfully!');
    console.log('\nSummary:');
    console.log(`- Platform Admin: ${adminEmail}`);
    console.log(`- Tenant: ${tenant.name} (${tenant.subdomain})`);
    console.log(`- Subscription: ${tenant.subscription ? 'Already existed' : 'Created'}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createPlatformAdminAndFixSubscription();