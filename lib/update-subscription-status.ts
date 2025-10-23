import { prisma } from './prisma';

/**
 * Update subscription status based on current date
 * This should be called whenever we need to check subscription status
 */
export async function updateSubscriptionStatusIfNeeded(tenantId: string) {
  try {
    const now = new Date();
    const graceDeadline = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

    const subscription = await prisma.subscription.findFirst({
      where: { tenantId },
      select: {
        id: true,
        status: true,
        currentPeriodEnd: true,
        updatedAt: true
      }
    });

    if (!subscription || !subscription.currentPeriodEnd) {
      return subscription;
    }

    const currentPeriodEnd = new Date(subscription.currentPeriodEnd);
    let newStatus = subscription.status;

    // Determine what the status should be based on dates
    if (currentPeriodEnd < graceDeadline) {
      // Grace period has passed - should be EXPIRED
      if (subscription.status !== 'EXPIRED') {
        newStatus = 'EXPIRED';
      }
    } else if (currentPeriodEnd < now) {
      // Period has ended but still in grace period - should be PAST_DUE
      if (subscription.status === 'ACTIVE') {
        newStatus = 'PAST_DUE';
      }
    }

    // Update status if it needs to change
    if (newStatus !== subscription.status) {
      console.log(`🔄 Updating subscription status for tenant ${tenantId}: ${subscription.status} → ${newStatus}`);
      
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: newStatus as any,
          updatedAt: now
        }
      });

      return {
        ...subscription,
        status: newStatus,
        updatedAt: now
      };
    }

    return subscription;
  } catch (error) {
    console.error('Error updating subscription status:', error);
    return null;
  }
}

/**
 * Get subscription with up-to-date status
 */
export async function getSubscriptionWithCurrentStatus(tenantId: string) {
  // First update the status if needed
  await updateSubscriptionStatusIfNeeded(tenantId);
  
  // Then fetch the full subscription data
  return prisma.subscription.findFirst({
    where: { tenantId },
    include: { plan: true }
  });
}