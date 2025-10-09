// Proper implementation of "Change Now" vs "At End of Current Period"

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Example of how the upgrade options should work
async function demonstrateUpgradeOptions() {
  console.log('🔄 PROPER UPGRADE OPTIONS IMPLEMENTATION');
  console.log('========================================');

  // Scenario: User on Starter (160k IDR), wants Professional (235k IDR)
  const currentPlan = { name: 'Starter', price: 160000, dailyRate: 160000/30 };
  const newPlan = { name: 'Professional', price: 235000, dailyRate: 235000/30 };
  const currentPeriodStart = new Date('2025-10-08');
  const currentPeriodEnd = new Date('2025-11-08');
  const upgradeDate = new Date('2025-10-15'); // 7 days into current period

  console.log('\n📊 SCENARIO:');
  console.log(`Current Plan: ${currentPlan.name} (${currentPlan.price.toLocaleString()} IDR/month)`);
  console.log(`New Plan: ${newPlan.name} (${newPlan.price.toLocaleString()} IDR/month)`);
  console.log(`Current Period: ${currentPeriodStart.toLocaleDateString()} - ${currentPeriodEnd.toLocaleDateString()}`);
  console.log(`Upgrade Request Date: ${upgradeDate.toLocaleDateString()}`);

  // Calculate remaining time
  const totalDays = Math.ceil((currentPeriodEnd - currentPeriodStart) / (1000 * 60 * 60 * 24));
  const usedDays = Math.ceil((upgradeDate - currentPeriodStart) / (1000 * 60 * 60 * 24));
  const remainingDays = totalDays - usedDays;

  console.log(`\nTotal Period: ${totalDays} days`);
  console.log(`Used: ${usedDays} days`);
  console.log(`Remaining: ${remainingDays} days`);

  // OPTION 1: "Change Now" (Immediate with Proration)
  console.log('\n🚀 OPTION 1: "CHANGE NOW" (Immediate)');
  console.log('=====================================');
  
  const unusedCurrentValue = currentPlan.dailyRate * remainingDays;
  const newPlanProratedCost = newPlan.dailyRate * remainingDays;
  const additionalCharge = newPlanProratedCost - unusedCurrentValue;

  console.log(`Unused current plan value: ${unusedCurrentValue.toFixed(2)} IDR`);
  console.log(`New plan cost for remaining period: ${newPlanProratedCost.toFixed(2)} IDR`);
  console.log(`Additional charge needed: ${additionalCharge.toFixed(2)} IDR`);
  console.log(`✅ User gets: Immediate access to new features`);
  console.log(`✅ Fair billing: Only pays difference for remaining period`);

  // OPTION 2: "At End of Current Period"
  console.log('\n⏰ OPTION 2: "AT END OF CURRENT PERIOD"');
  console.log('======================================');
  
  const nextPeriodStart = currentPeriodEnd;
  const nextPeriodEnd = new Date(nextPeriodStart);
  nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);

  console.log(`Current plan continues until: ${currentPeriodEnd.toLocaleDateString()}`);
  console.log(`New plan starts: ${nextPeriodStart.toLocaleDateString()}`);
  console.log(`New plan first billing: ${newPlan.price.toLocaleString()} IDR on ${nextPeriodStart.toLocaleDateString()}`);
  console.log(`✅ User gets: No double billing, full value from current plan`);
  console.log(`✅ Predictable: Upgrade happens at natural billing boundary`);

  return {
    immediateOption: {
      additionalCharge: additionalCharge,
      effectiveDate: upgradeDate,
      nextBillingDate: currentPeriodEnd,
      nextBillingAmount: newPlan.price
    },
    endOfPeriodOption: {
      additionalCharge: 0,
      effectiveDate: nextPeriodStart,
      nextBillingDate: nextPeriodStart,
      nextBillingAmount: newPlan.price
    }
  };
}

// How to implement this in your webhook
async function properWebhookImplementation(transaction, upgradeOption) {
  console.log('\n🔧 PROPER WEBHOOK IMPLEMENTATION');
  console.log('=================================');

  const existingSubscription = await prisma.subscription.findFirst({
    where: { tenantId: transaction.tenantId },
    include: { plan: true }
  });

  if (upgradeOption === 'immediate') {
    console.log('🚀 Processing IMMEDIATE upgrade...');
    
    // Activate new plan immediately
    const now = new Date();
    const newEndDate = new Date(now);
    newEndDate.setMonth(newEndDate.getMonth() + 1);

    await prisma.subscription.update({
      where: { id: existingSubscription.id },
      data: {
        planId: transaction.subscriptionPlanId,
        currentPeriodStart: now,
        currentPeriodEnd: newEndDate,
        status: 'ACTIVE',
        intendedPlan: null,
        updatedAt: new Date()
      }
    });

    console.log('✅ Plan activated immediately');
    console.log(`✅ New billing period: ${now.toLocaleDateString()} - ${newEndDate.toLocaleDateString()}`);

  } else if (upgradeOption === 'end_of_period') {
    console.log('⏰ Processing END OF PERIOD upgrade...');
    
    // Don't change current subscription yet - just mark intent
    await prisma.subscription.update({
      where: { id: existingSubscription.id },
      data: {
        intendedPlan: transaction.subscriptionPlanId,
        updatedAt: new Date()
      }
    });

    // Mark transaction as scheduled
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: 'SCHEDULED', // You might need to add this to your enum
        metadata: {
          ...transaction.metadata,
          scheduledActivationDate: existingSubscription.currentPeriodEnd.toISOString(),
          upgradeType: 'end_of_period'
        }
      }
    });

    console.log('✅ Upgrade scheduled for end of current period');
    console.log(`✅ Activation date: ${existingSubscription.currentPeriodEnd.toLocaleDateString()}`);
    console.log('✅ Current plan continues unchanged');
  }
}

// Daily cron job to activate scheduled upgrades
async function activateScheduledUpgrades() {
  console.log('\n⏰ ACTIVATING SCHEDULED UPGRADES');
  console.log('=================================');

  const now = new Date();
  
  // Find subscriptions ready for upgrade
  const readyForUpgrade = await prisma.subscription.findMany({
    where: {
      intendedPlan: { not: null },
      currentPeriodEnd: { lte: now }
    },
    include: { plan: true }
  });

  console.log(`Found ${readyForUpgrade.length} subscriptions ready for upgrade`);

  for (const subscription of readyForUpgrade) {
    const newPlan = await prisma.subscriptionPlan.findUnique({
      where: { id: subscription.intendedPlan }
    });

    if (!newPlan) continue;

    const startDate = subscription.currentPeriodEnd;
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    // Activate the upgrade
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        planId: subscription.intendedPlan,
        currentPeriodStart: startDate,
        currentPeriodEnd: endDate,
        status: 'ACTIVE',
        intendedPlan: null,
        updatedAt: new Date()
      }
    });

    // Update scheduled transactions to PAID
    await prisma.transaction.updateMany({
      where: {
        tenantId: subscription.tenantId,
        subscriptionPlanId: subscription.intendedPlan,
        status: 'SCHEDULED'
      },
      data: { status: 'PAID' }
    });

    console.log(`✅ Activated upgrade for tenant ${subscription.tenantId} to ${newPlan.name}`);
  }

  return readyForUpgrade.length;
}

// User-friendly explanation for the UI
function getUpgradeOptionExplanations(currentPlan, newPlan, currentPeriodEnd) {
  const now = new Date();
  const remainingDays = Math.ceil((currentPeriodEnd - now) / (1000 * 60 * 60 * 24));
  const dailyCurrentRate = currentPlan.price / 30;
  const dailyNewRate = newPlan.price / 30;
  const unusedValue = dailyCurrentRate * remainingDays;
  const proratedNewCost = dailyNewRate * remainingDays;
  const additionalCharge = proratedNewCost - unusedValue;

  return {
    immediate: {
      title: "Upgrade Now",
      description: `Get ${newPlan.name} features immediately`,
      additionalCost: Math.max(0, additionalCharge),
      effectiveDate: "Today",
      billing: `Next billing: ${newPlan.price.toLocaleString()} IDR on ${currentPeriodEnd.toLocaleDateString()}`,
      pros: ["Immediate access to new features", "Fair prorated billing"],
      cons: additionalCharge > 0 ? ["Additional charge required"] : ["No additional charge"]
    },
    endOfPeriod: {
      title: "Upgrade at End of Billing Period",
      description: `Start ${newPlan.name} on ${currentPeriodEnd.toLocaleDateString()}`,
      additionalCost: 0,
      effectiveDate: currentPeriodEnd.toLocaleDateString(),
      billing: `First billing: ${newPlan.price.toLocaleString()} IDR on ${currentPeriodEnd.toLocaleDateString()}`,
      pros: ["No additional charge", "Full value from current plan", "Clean billing cycle"],
      cons: [`Wait ${remainingDays} days for new features`]
    }
  };
}

module.exports = {
  demonstrateUpgradeOptions,
  properWebhookImplementation,
  activateScheduledUpgrades,
  getUpgradeOptionExplanations
};

// Run demonstration
if (require.main === module) {
  demonstrateUpgradeOptions()
    .then(() => {
      console.log('\n🎉 Upgrade options demonstration completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}
