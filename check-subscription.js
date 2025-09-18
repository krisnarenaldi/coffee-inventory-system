const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSubscription() {
  try {
    console.log('🔍 Checking coffee-central tenant subscription...');
    
    // Find the coffee-central tenant
    const tenant = await prisma.tenant.findUnique({
      where: { subdomain: 'coffee-central' },
      select: { id: true, name: true, subdomain: true, status: true }
    });
    
    if (!tenant) {
      console.log('❌ No coffee-central tenant found');
      return;
    }
    
    console.log('✅ Tenant found:', tenant);
    
    // Check for subscription
    const subscription = await prisma.subscription.findUnique({
      where: { tenantId: tenant.id },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            price: true,
            interval: true,
            isActive: true
          }
        }
      }
    });
    
    if (!subscription) {
      console.log('❌ No subscription found for coffee-central tenant');
      
      // Check if there are any subscription plans available
      const plans = await prisma.subscriptionPlan.findMany({
        where: { isActive: true },
        select: { id: true, name: true, price: true }
      });
      
      console.log('Available plans:', plans);
    } else {
      console.log('✅ Subscription found:', {
        id: subscription.id,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        plan: subscription.plan
      });
      
      // Check if subscription is expired
      const now = new Date();
      const isExpired = subscription.currentPeriodEnd ? now > subscription.currentPeriodEnd : false;
      console.log('Is expired?', isExpired);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSubscription();