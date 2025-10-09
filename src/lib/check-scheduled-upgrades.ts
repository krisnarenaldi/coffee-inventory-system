import { prisma } from './prisma';
import { computeNextPeriodEnd } from './subscription-periods';

export async function checkAndActivateScheduledUpgrades(tenantId: string) {
  try {
    const now = new Date();
    
    // Check if this tenant has a scheduled upgrade ready
    const subscription = await prisma.subscription.findFirst({
      where: {
        tenantId: tenantId,
        intendedPlan: { not: null },
        currentPeriodEnd: { lte: now }
      },
      include: { plan: true }
    });

    if (!subscription) {
      return null; // No scheduled upgrade
    }

    // Get the new plan
    const newPlan = await prisma.subscriptionPlan.findUnique({
      where: { id: subscription.intendedPlan! }
    });

    if (!newPlan) {
      console.error(`New plan ${subscription.intendedPlan} not found`);
      return null;
    }

    // Calculate new period dates
    const startDate = subscription.currentPeriodEnd;
    const endDate = computeNextPeriodEnd(startDate, newPlan.interval);

    // Activate the upgrade
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        planId: subscription.intendedPlan!,
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
        tenantId: tenantId,
        subscriptionPlanId: subscription.intendedPlan!,
        status: 'SCHEDULED'
      },
      data: { 
        status: 'PAID',
        metadata: {
          scheduledActivationHandled: true,
          activatedAt: new Date().toISOString()
        }
      }
    });

    console.log(`✅ Activated scheduled upgrade for tenant ${tenantId} to ${newPlan.name}`);
    
    return {
      activated: true,
      newPlan: newPlan,
      activatedAt: new Date()
    };

  } catch (error) {
    console.error('Error checking scheduled upgrades:', error);
    return null;
  }
}

// Call this when user loads dashboard or subscription page
export async function checkScheduledUpgradesOnLoad(tenantId: string) {
  const result = await checkAndActivateScheduledUpgrades(tenantId);
  
  if (result?.activated) {
    return {
      message: `🎉 Your upgrade to ${result.newPlan.name} has been activated!`,
      type: 'success' as const
    };
  }
  
  return null;
}
