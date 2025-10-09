const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testUpgradeFlow() {
  try {
    console.log('🧪 TESTING UPGRADE FLOW IMPLEMENTATION');
    console.log('=====================================');

    const tenantId = 'cmghev0c50001yi3lj42ckskc';

    // Get current subscription
    const subscription = await prisma.subscription.findFirst({
      where: { tenantId },
      include: { plan: true }
    });

    if (!subscription) {
      console.log('❌ No subscription found');
      return;
    }

    console.log('\n📊 CURRENT SUBSCRIPTION:');
    console.log(`Plan: ${subscription.plan.name}`);
    console.log(`Price: ${subscription.plan.price.toLocaleString()} IDR`);
    console.log(`Period: ${subscription.currentPeriodStart.toLocaleDateString()} - ${subscription.currentPeriodEnd.toLocaleDateString()}`);
    console.log(`Status: ${subscription.status}`);

    // Get available plans
    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' }
    });

    console.log('\n📋 AVAILABLE PLANS:');
    plans.forEach(plan => {
      console.log(`- ${plan.name}: ${plan.price.toLocaleString()} IDR (${plan.id})`);
    });

    // Test calculation for immediate upgrade
    const professionalPlan = plans.find(p => p.name === 'Professional');
    if (!professionalPlan) {
      console.log('❌ Professional plan not found');
      return;
    }

    const now = new Date();
    const currentPeriodEnd = new Date(subscription.currentPeriodEnd);
    const remainingDays = Math.ceil((currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calculate current plan daily rate
    const currentPeriodStart = new Date(subscription.currentPeriodStart);
    const totalCurrentDays = Math.ceil((currentPeriodEnd.getTime() - currentPeriodStart.getTime()) / (1000 * 60 * 60 * 24));
    const currentDailyRate = Number(subscription.plan.price) / totalCurrentDays;
    
    // Calculate new plan daily rate
    const newDailyRate = Number(professionalPlan.price) / 30;
    
    // Calculate unused current plan value
    const unusedCurrentValue = currentDailyRate * remainingDays;
    
    // Calculate new plan cost for remaining period
    const newPlanProratedCost = newDailyRate * remainingDays;
    
    // Calculate additional charge for immediate upgrade
    const additionalCharge = Math.max(0, newPlanProratedCost - unusedCurrentValue);

    console.log('\n🧮 UPGRADE CALCULATION TEST:');
    console.log(`Current Plan: ${subscription.plan.name} (${subscription.plan.price.toLocaleString()} IDR)`);
    console.log(`Target Plan: ${professionalPlan.name} (${professionalPlan.price.toLocaleString()} IDR)`);
    console.log(`Remaining Days: ${remainingDays}`);
    console.log(`Current Daily Rate: ${currentDailyRate.toFixed(2)} IDR/day`);
    console.log(`New Daily Rate: ${newDailyRate.toFixed(2)} IDR/day`);
    console.log(`Unused Current Value: ${unusedCurrentValue.toFixed(2)} IDR`);
    console.log(`New Plan Prorated Cost: ${newPlanProratedCost.toFixed(2)} IDR`);
    console.log(`Additional Charge: ${additionalCharge.toFixed(2)} IDR`);

    console.log('\n✅ UPGRADE OPTIONS:');
    console.log(`🚀 Immediate Upgrade: Pay ${Math.round(additionalCharge).toLocaleString()} IDR now`);
    console.log(`⏰ End of Period: Pay 0 IDR now, upgrade on ${currentPeriodEnd.toLocaleDateString()}`);

    // Test API payload
    console.log('\n📡 EXAMPLE API PAYLOADS:');
    
    console.log('\n1. Frontend to /api/subscription/upgrade:');
    console.log(JSON.stringify({
      planId: professionalPlan.id,
      upgradeOption: 'immediate',
      calculatedAmount: Math.round(additionalCharge)
    }, null, 2));

    console.log('\n2. Checkout to /api/checkout/create-token:');
    console.log(JSON.stringify({
      planId: professionalPlan.id,
      billingCycle: 'monthly',
      upgradeOption: 'immediate',
      customAmount: Math.round(additionalCharge)
    }, null, 2));

    console.log('\n3. End of Period Option:');
    console.log(JSON.stringify({
      planId: professionalPlan.id,
      upgradeOption: 'end_of_period',
      calculatedAmount: Number(professionalPlan.price)
    }, null, 2));

    // Test recent transactions
    const recentTransactions = await prisma.transaction.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 3,
      include: { subscriptionPlan: true }
    });

    console.log('\n📜 RECENT TRANSACTIONS:');
    recentTransactions.forEach((tx, i) => {
      console.log(`${i + 1}. ${tx.subscriptionPlan?.name || 'Unknown'}: ${tx.amount} IDR (${tx.status}) - ${tx.createdAt.toLocaleDateString()}`);
      if (tx.metadata) {
        console.log(`   Metadata: ${JSON.stringify(tx.metadata)}`);
      }
    });

    return {
      currentSubscription: subscription,
      upgradeCalculation: {
        targetPlan: professionalPlan,
        remainingDays,
        unusedCurrentValue,
        newPlanProratedCost,
        additionalCharge: Math.round(additionalCharge)
      }
    };

  } catch (error) {
    console.error('❌ Error testing upgrade flow:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Test the cron job
async function testCronJob() {
  try {
    console.log('\n\n🔄 TESTING CRON JOB');
    console.log('===================');

    const response = await fetch('http://localhost:3000/api/cron/activate-scheduled-upgrades', {
      method: 'GET'
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Cron job response:', result);
    } else {
      console.log('❌ Cron job failed:', response.status, response.statusText);
    }

  } catch (error) {
    console.log('❌ Error testing cron job:', error.message);
  }
}

// Run tests
if (require.main === module) {
  testUpgradeFlow()
    .then((result) => {
      console.log('\n🎉 Upgrade flow test completed successfully!');
      return testCronJob();
    })
    .then(() => {
      console.log('\n🎉 All tests completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testUpgradeFlow };
