import { prisma } from './prisma';
import { getTenantUsageStats } from './subscription-limits';

export interface NotificationData {
  type: 'billing_reminder' | 'payment_failed' | 'usage_warning' | 'subscription_cancelled' | 'trial_ending';
  tenantId: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

/**
 * Send subscription-related notifications
 */
export async function sendSubscriptionNotification(notification: NotificationData) {
  try {
    // In a real implementation, this would integrate with email service, SMS, or push notifications
    console.log(`[NOTIFICATION] ${notification.type.toUpperCase()} for tenant ${notification.tenantId}:`);
    console.log(`Title: ${notification.title}`);
    console.log(`Message: ${notification.message}`);
    console.log(`Priority: ${notification.priority}`);
    
    if (notification.data) {
      console.log('Additional data:', notification.data);
    }

    // Store notification in database for tracking
    // Note: This would require a notifications table in the schema
    // For now, we'll just log it
    
    return { success: true, notificationId: `notif_${Date.now()}` };
  } catch (error) {
    console.error('Error sending notification:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Check for upcoming billing dates and send reminders
 */
export async function checkBillingReminders() {
  try {
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    
    const oneDayFromNow = new Date();
    oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);

    // Find subscriptions with upcoming billing dates
    const upcomingBilling = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        cancelAtPeriodEnd: false,
        currentPeriodEnd: {
          lte: threeDaysFromNow,
          gte: new Date()
        }
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            subdomain: true
          }
        },
        plan: {
          select: {
            name: true,
            price: true,
            interval: true
          }
        }
      }
    });

    const notifications = [];

    for (const subscription of upcomingBilling) {
      const daysUntilBilling = Math.ceil(
        (subscription.currentPeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';
      let title = '';
      let message = '';

      if (daysUntilBilling <= 1) {
        priority = 'high';
        title = 'Billing Tomorrow';
        message = `Your ${subscription.plan.name} subscription will be billed tomorrow for $${subscription.plan.price}.`;
      } else if (daysUntilBilling <= 3) {
        priority = 'medium';
        title = 'Upcoming Billing';
        message = `Your ${subscription.plan.name} subscription will be billed in ${daysUntilBilling} days for $${subscription.plan.price}.`;
      }

      const notification: NotificationData = {
        type: 'billing_reminder',
        tenantId: subscription.tenantId,
        title,
        message,
        priority,
        data: {
          subscriptionId: subscription.id,
          amount: subscription.plan.price,
          billingDate: subscription.currentPeriodEnd,
          planName: subscription.plan.name
        }
      };

      notifications.push(notification);
      await sendSubscriptionNotification(notification);
    }

    return { success: true, notificationsSent: notifications.length };
  } catch (error) {
    console.error('Error checking billing reminders:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Check for usage warnings (approaching limits)
 */
export async function checkUsageWarnings() {
  try {
    const activeSubscriptions = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE'
      },
      select: {
        tenantId: true,
        tenant: {
          select: {
            name: true
          }
        }
      }
    });

    const notifications = [];

    for (const subscription of activeSubscriptions) {
      const usageStats = await getTenantUsageStats(subscription.tenantId);
      
      if (!usageStats || !usageStats.limits) {
        continue;
      }

      const { usage, limits } = usageStats;

      // Check each usage type for warnings (80% threshold)
      const warningThreshold = 0.8;
      const criticalThreshold = 0.95;

      const checks = [
        { type: 'users', usage: usage.users },
        { type: 'ingredients', usage: usage.ingredients },
        { type: 'batches', usage: usage.batches }
      ];

      for (const check of checks) {
        const usagePercentage = check.usage.currentUsage / check.usage.limit;
        
        if (usagePercentage >= criticalThreshold) {
          const notification: NotificationData = {
            type: 'usage_warning',
            tenantId: subscription.tenantId,
            title: `Critical: ${check.type} limit almost reached`,
            message: `You're using ${check.usage.currentUsage} of ${check.usage.limit} ${check.type} (${Math.round(usagePercentage * 100)}%). Consider upgrading your plan.`,
            priority: 'urgent',
            data: {
              usageType: check.type,
              current: check.usage.currentUsage,
              limit: check.usage.limit,
              percentage: Math.round(usagePercentage * 100)
            }
          };
          
          notifications.push(notification);
          await sendSubscriptionNotification(notification);
        } else if (usagePercentage >= warningThreshold) {
          const notification: NotificationData = {
            type: 'usage_warning',
            tenantId: subscription.tenantId,
            title: `Warning: Approaching ${check.type} limit`,
            message: `You're using ${check.usage.currentUsage} of ${check.usage.limit} ${check.type} (${Math.round(usagePercentage * 100)}%). You may want to consider upgrading.`,
            priority: 'medium',
            data: {
              usageType: check.type,
              current: check.usage.currentUsage,
              limit: check.usage.limit,
              percentage: Math.round(usagePercentage * 100)
            }
          };
          
          notifications.push(notification);
          await sendSubscriptionNotification(notification);
        }
      }
    }

    return { success: true, notificationsSent: notifications.length };
  } catch (error) {
    console.error('Error checking usage warnings:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send payment failed notification
 */
export async function sendPaymentFailedNotification(tenantId: string, amount: number, reason?: string) {
  const notification: NotificationData = {
    type: 'payment_failed',
    tenantId,
    title: 'Payment Failed',
    message: `Your payment of $${amount} failed${reason ? `: ${reason}` : ''}. Please update your payment method to avoid service interruption.`,
    priority: 'urgent',
    data: {
      amount,
      reason,
      timestamp: new Date().toISOString()
    }
  };

  return await sendSubscriptionNotification(notification);
}

/**
 * Send subscription cancelled notification
 */
export async function sendSubscriptionCancelledNotification(tenantId: string, planName: string, endDate: Date) {
  const notification: NotificationData = {
    type: 'subscription_cancelled',
    tenantId,
    title: 'Subscription Cancelled',
    message: `Your ${planName} subscription has been cancelled and will end on ${endDate.toLocaleDateString()}. You can reactivate it anytime before then.`,
    priority: 'high',
    data: {
      planName,
      endDate: endDate.toISOString(),
      timestamp: new Date().toISOString()
    }
  };

  return await sendSubscriptionNotification(notification);
}

/**
 * Run all subscription notification checks
 */
export async function runSubscriptionNotificationChecks() {
  console.log('Running subscription notification checks...');
  
  const results = await Promise.allSettled([
    checkBillingReminders(),
    checkUsageWarnings()
  ]);

  const summary = {
    billingReminders: results[0].status === 'fulfilled' ? results[0].value : { success: false, error: results[0].reason },
    usageWarnings: results[1].status === 'fulfilled' ? results[1].value : { success: false, error: results[1].reason }
  };

  console.log('Notification check summary:', summary);
  return summary;
}