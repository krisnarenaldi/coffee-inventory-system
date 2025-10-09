const { PrismaClient } = require('@prisma/client');
const { computeNextPeriodEnd } = require('./lib/subscription-periods');

const prisma = new PrismaClient();

// Enhanced upgrade logic that respects "end of period" option
async function handleUpgradeWithProperLogic(transaction, upgradeOption = 'immediate') {
  try {
    const existingSubscription = await prisma.subscription.findFirst({
      where: { tenantId: transaction.tenantId },
      include: { plan: true }
    });

    if (!existingSubscription) {
      throw new Error('No existing subscription found');
    }

    const now = new Date();
    const currentPeriodEnd = existingSubscription.currentPeriodEnd;
    const interval = transaction.subscriptionPlan?.interval || 'MONTHLY';

    let startDate, endDate, shouldChargeNow = true;

    if (upgradeOption === 'end_of_period') {
      // Schedule upgrade for end of current period
      startDate = currentPeriodEnd;
      endDate = computeNextPeriodEnd(startDate, interval);
      shouldChargeNow = false;

      // Store the pending upgrade
      await prisma.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          intendedPlan: transaction.subscriptionPlanId,
          // Keep current plan active until period end
          updatedAt: new Date()
        }
      });

      // Mark transaction as scheduled, not immediately active
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'SCHEDULED',
          metadata: {
            scheduledActivationDate: startDate.toISOString(),
            upgradeType: 'end_of_period'
          }
        }
      });

      console.log(`Upgrade scheduled for ${startDate.toISOString()}`);
      return { scheduled: true, activationDate: startDate };

    } else if (upgradeOption === 'immediate') {
      // Immediate upgrade with proration
      startDate = now;
      endDate = computeNextPeriodEnd(startDate, interval);

      // Calculate proration
      const totalDaysInCurrentPeriod = Math.ceil(
        (currentPeriodEnd.getTime() - existingSubscription.currentPeriodStart.getTime()) / (1000 * 60 * 60 * 24)
      );
      const remainingDays = Math.ceil(
        (currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      const currentPlanPrice = Number(existingSubscription.plan.price);
      const newPlanPrice = Number(transaction.subscriptionPlan.price);

      // Amount already paid for unused portion
      const unusedAmount = (currentPlanPrice / totalDaysInCurrentPeriod) * remainingDays;
      
      // Amount needed for new plan for remaining period
      const newPlanProrated = (newPlanPrice / totalDaysInCurrentPeriod) * remainingDays;
      
      // Net amount (should match what was actually charged)
      const proratedAmount = newPlanProrated - unusedAmount;

      console.log('Proration calculation:', {
        totalDaysInCurrentPeriod,
        remainingDays,
        currentPlanPrice,
        newPlanPrice,
        unusedAmount,
        newPlanProrated,
        proratedAmount,
        actualChargedAmount: Number(transaction.amount)
      });

      // Update subscription immediately
      await prisma.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          planId: transaction.subscriptionPlanId,
          currentPeriodStart: startDate,
          currentPeriodEnd: endDate,
          status: 'ACTIVE',
          intendedPlan: null,
          cancelAtPeriodEnd: false,
          updatedAt: new Date()
        }
      });

      return { 
        immediate: true, 
        proration: {
          unusedAmount,
          proratedAmount,
          actualCharged: Number(transaction.amount)
        }
      };
    }

  } catch (error) {
    console.error('Error in upgrade logic:', error);
    throw error;
  }
}

// Function to check and process scheduled upgrades (should run daily)
async function processScheduledUpgrades() {
  try {
    const now = new Date();
    
    // Find subscriptions with scheduled upgrades
    const subscriptionsWithScheduledUpgrades = await prisma.subscription.findMany({
      where: {
        intendedPlan: { not: null },
        currentPeriodEnd: { lte: now }
      },
      include: { plan: true }
    });

    for (const subscription of subscriptionsWithScheduledUpgrades) {
      const newPlan = await prisma.subscriptionPlan.findUnique({
        where: { id: subscription.intendedPlan }
      });

      if (!newPlan) {
        console.error(`Intended plan ${subscription.intendedPlan} not found`);
        continue;
      }

      const startDate = subscription.currentPeriodEnd;
      const endDate = computeNextPeriodEnd(startDate, newPlan.interval);

      // Activate the scheduled upgrade
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

      // Update any scheduled transactions
      await prisma.transaction.updateMany({
        where: {
          tenantId: subscription.tenantId,
          subscriptionPlanId: subscription.intendedPlan,
          status: 'SCHEDULED'
        },
        data: {
          status: 'PAID',
          updatedAt: new Date()
        }
      });

      console.log(`Activated scheduled upgrade for tenant ${subscription.tenantId} to plan ${newPlan.name}`);
    }

    console.log(`Processed ${subscriptionsWithScheduledUpgrades.length} scheduled upgrades`);
  } catch (error) {
    console.error('Error processing scheduled upgrades:', error);
  }
}

module.exports = {
  handleUpgradeWithProperLogic,
  processScheduledUpgrades
};

// If run directly, process scheduled upgrades
if (require.main === module) {
  processScheduledUpgrades()
    .then(() => {
      console.log('Scheduled upgrade processing completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to process scheduled upgrades:', error);
      process.exit(1);
    });
}
