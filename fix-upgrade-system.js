// Complete fix for the upgrade system to prevent future issues

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 1. Enhanced webhook handler that respects upgrade timing
async function enhancedWebhookHandler(transaction, notification) {
  try {
    const upgradeOption = transaction.metadata?.upgradeOption || 'immediate';
    
    const existingSubscription = await prisma.subscription.findFirst({
      where: { tenantId: transaction.tenantId },
      include: { plan: true }
    });

    if (!existingSubscription) {
      // New subscription - standard activation
      return await activateNewSubscription(transaction);
    }

    // Handle upgrade based on user's choice
    if (upgradeOption === 'end_of_period') {
      return await scheduleUpgradeForEndOfPeriod(transaction, existingSubscription);
    } else {
      return await processImmediateUpgradeWithProration(transaction, existingSubscription);
    }

  } catch (error) {
    console.error('Enhanced webhook handler error:', error);
    throw error;
  }
}

// 2. Schedule upgrade for end of current period
async function scheduleUpgradeForEndOfPeriod(transaction, existingSubscription) {
  // Don't change subscription yet - just mark the intent
  await prisma.subscription.update({
    where: { id: existingSubscription.id },
    data: {
      intendedPlan: transaction.subscriptionPlanId,
      updatedAt: new Date()
    }
  });

  // Mark transaction as scheduled (not immediately active)
  await prisma.transaction.update({
    where: { id: transaction.id },
    data: {
      status: 'SCHEDULED',
      metadata: {
        ...transaction.metadata,
        scheduledActivationDate: existingSubscription.currentPeriodEnd.toISOString(),
        upgradeType: 'end_of_period'
      }
    }
  });

  console.log(`✅ Upgrade scheduled for ${existingSubscription.currentPeriodEnd.toLocaleDateString()}`);
  console.log('   Current plan continues until end of period');
  console.log('   No immediate billing change');
  
  return { 
    type: 'scheduled',
    activationDate: existingSubscription.currentPeriodEnd,
    message: 'Upgrade scheduled for end of current billing period'
  };
}

// 3. Process immediate upgrade with proper proration
async function processImmediateUpgradeWithProration(transaction, existingSubscription) {
  const now = new Date();
  const currentPeriodEnd = existingSubscription.currentPeriodEnd;
  
  // Calculate proration
  const totalDaysInCurrentPeriod = Math.ceil(
    (currentPeriodEnd.getTime() - existingSubscription.currentPeriodStart.getTime()) / (1000 * 60 * 60 * 24)
  );
  const remainingDays = Math.ceil(
    (currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  const currentPlanPrice = Number(existingSubscription.plan.price);
  const newPlanPrice = Number(transaction.subscriptionPlan.price);
  
  // Calculate what should have been charged
  const unusedAmount = (currentPlanPrice / totalDaysInCurrentPeriod) * remainingDays;
  const newPlanProrated = (newPlanPrice / totalDaysInCurrentPeriod) * remainingDays;
  const correctChargeAmount = newPlanProrated - unusedAmount;
  const actualChargedAmount = Number(transaction.amount);
  
  // Determine if user was overcharged
  const overchargeAmount = actualChargedAmount - correctChargeAmount;
  
  console.log('📊 PRORATION ANALYSIS:');
  console.log(`   Remaining days: ${remainingDays}`);
  console.log(`   Unused current plan value: ${unusedAmount.toFixed(2)} IDR`);
  console.log(`   Prorated new plan cost: ${newPlanProrated.toFixed(2)} IDR`);
  console.log(`   Should have charged: ${correctChargeAmount.toFixed(2)} IDR`);
  console.log(`   Actually charged: ${actualChargedAmount} IDR`);
  console.log(`   Overcharge: ${overchargeAmount.toFixed(2)} IDR`);

  // Activate the new plan
  const newEndDate = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days from now
  
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

  // Handle overcharge
  if (overchargeAmount > 1000) { // Only if significant (> 1000 IDR)
    await handleOvercharge(transaction.tenantId, overchargeAmount, {
      transactionId: transaction.id,
      reason: 'Immediate upgrade overcharge',
      calculation: {
        totalDaysInCurrentPeriod,
        remainingDays,
        unusedAmount,
        newPlanProrated,
        correctChargeAmount,
        actualChargedAmount,
        overchargeAmount
      }
    });
  }

  return {
    type: 'immediate',
    overchargeAmount: overchargeAmount,
    compensationApplied: overchargeAmount > 1000
  };
}

// 4. Handle overcharge with automatic compensation
async function handleOvercharge(tenantId, overchargeAmount, details) {
  // Option A: Account Credit (Recommended)
  await prisma.accountCredit.create({
    data: {
      tenantId: tenantId,
      amount: overchargeAmount,
      currency: 'IDR',
      reason: `Upgrade overcharge compensation - ${details.reason}`,
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      metadata: details
    }
  });

  console.log(`✅ Applied ${overchargeAmount.toFixed(2)} IDR account credit`);
  
  // Option B: Extend subscription period instead
  // const extensionDays = Math.ceil(overchargeAmount / (newPlanPrice / 30));
  // await extendSubscriptionPeriod(tenantId, extensionDays);
}

// 5. Daily cron job to activate scheduled upgrades
async function activateScheduledUpgrades() {
  const now = new Date();
  
  const subscriptionsToActivate = await prisma.subscription.findMany({
    where: {
      intendedPlan: { not: null },
      currentPeriodEnd: { lte: now }
    },
    include: { plan: true }
  });

  for (const subscription of subscriptionsToActivate) {
    const newPlan = await prisma.subscriptionPlan.findUnique({
      where: { id: subscription.intendedPlan }
    });

    if (!newPlan) continue;

    const startDate = subscription.currentPeriodEnd;
    const endDate = new Date(startDate.getTime() + (30 * 24 * 60 * 60 * 1000));

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

    // Update scheduled transactions
    await prisma.transaction.updateMany({
      where: {
        tenantId: subscription.tenantId,
        subscriptionPlanId: subscription.intendedPlan,
        status: 'SCHEDULED'
      },
      data: { status: 'PAID' }
    });

    console.log(`✅ Activated scheduled upgrade for tenant ${subscription.tenantId}`);
  }

  return subscriptionsToActivate.length;
}

// 6. Apply the fix to your current situation
async function fixCurrentSituation() {
  const tenantId = 'cmghev0c50001yi3lj42ckskc';
  
  console.log('🔧 APPLYING AUTOMATIC FIX');
  console.log('========================');
  
  // Option: Extend subscription by unused days (simplest, no refund needed)
  const subscription = await prisma.subscription.findFirst({
    where: { tenantId }
  });

  const extensionDays = 32; // Unused Starter days
  const currentEndDate = new Date(subscription.currentPeriodEnd);
  const newEndDate = new Date(currentEndDate.getTime() + (extensionDays * 24 * 60 * 60 * 1000));

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      currentPeriodEnd: newEndDate,
      updatedAt: new Date()
    }
  });

  console.log(`✅ Extended your Professional plan by ${extensionDays} days`);
  console.log(`   New end date: ${newEndDate.toLocaleDateString()}`);
  console.log(`   Value: ~155,152 IDR worth of extra service`);
  console.log('   No refund needed - you get the value as extended service');
}

module.exports = {
  enhancedWebhookHandler,
  activateScheduledUpgrades,
  fixCurrentSituation
};

// Apply fix to current situation
if (require.main === module) {
  fixCurrentSituation()
    .then(() => {
      console.log('\n🎉 Fix applied successfully!');
      console.log('Your subscription has been extended to compensate for the billing overlap.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error applying fix:', error);
      process.exit(1);
    });
}
