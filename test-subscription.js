const { PrismaClient } = require('@prisma/client');
const { validateSubscription } = require('./lib/subscription-validation');

const prisma = new PrismaClient();

async function testSubscription() {
  try {
    console.log('🔍 Testing subscription validation for demo tenant');
    
    // Get demo tenant ID
    const tenant = await prisma.tenant.findUnique({
      where: { subdomain: 'demo' },
      select: { id: true, subdomain: true }
    });
    
    if (!tenant) {
      console.log('❌ Demo tenant not found');
      return;
    }
    
    console.log(`✅ Demo tenant found: ${tenant.id}`);
    
    // Test subscription validation
    const subscriptionStatus = await validateSubscription(tenant.id);
    
    console.log('📋 Subscription Status:');
    console.log(`  - isActive: ${subscriptionStatus.isActive}`);
    console.log(`  - isExpired: ${subscriptionStatus.isExpired}`);
    console.log(`  - status: ${subscriptionStatus.status}`);
    console.log(`  - currentPeriodEnd: ${subscriptionStatus.currentPeriodEnd}`);
    console.log(`  - planId: ${subscriptionStatus.planId}`);
    
    if (subscriptionStatus.isActive) {
      console.log('✅ Subscription validation PASSED');
    } else {
      console.log('❌ Subscription validation FAILED');
      if (subscriptionStatus.isExpired) {
        console.log('   Reason: Subscription expired');
      } else {
        console.log('   Reason: Subscription not active');
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing subscription:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSubscription();