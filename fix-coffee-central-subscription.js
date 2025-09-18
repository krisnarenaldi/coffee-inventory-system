const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixSubscription() {
  try {
    console.log('🔧 Fixing subscription for coffee-central tenant...');
    
    // Find the coffee-central tenant
    const tenant = await prisma.tenant.findUnique({
      where: { subdomain: 'coffee-central' }
    });
    
    if (!tenant) {
      console.log('❌ No coffee-central tenant found');
      return;
    }
    
    console.log('✅ Tenant found:', tenant.name);
    
    // Check if subscription already exists
    const existingSubscription = await prisma.subscription.findUnique({
      where: { tenantId: tenant.id }
    });
    
    if (existingSubscription) {
      console.log('✅ Subscription already exists:', existingSubscription.status);
      return;
    }
    
    // Find or create a premium plan
    let premiumPlan = await prisma.subscriptionPlan.findFirst({
      where: { name: 'Premium Plan' }
    });
    
    if (!premiumPlan) {
      console.log('Creating Premium Plan...');
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
    }
    
    // Create subscription with a future end date
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
    
    console.log('✅ Subscription created successfully:', {
      id: subscription.id,
      status: subscription.status,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      planName: premiumPlan.name
    });
    
  } catch (error) {
    console.error('❌ Error fixing subscription:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixSubscription();