import { prisma } from "./prisma";
import { getCachedOrFetch, CacheKeys, CacheTTL } from "./cache";

export interface SubscriptionStatus {
  isActive: boolean;
  isExpired: boolean;
  currentPeriodEnd: Date | null;
  status: string | null;
  planId: string | null;
}

/**
 * Check if a tenant's subscription is valid and not expired
 * @param tenantId - The tenant ID to check
 * @returns SubscriptionStatus object with validation details
 */
export async function validateSubscription(
  tenantId: string
): Promise<SubscriptionStatus> {
  try {
    if (process.env.NODE_ENV === "development") {
      console.log(
        "🔍 VALIDATE SUBSCRIPTION: Starting validation for tenant:",
        tenantId
      );
    }

    // Use cached subscription data with 30 second TTL for performance
    const subscription = await getCachedOrFetch(
      CacheKeys.subscription(tenantId),
      async () => {
        return await prisma.subscription.findUnique({
          where: { tenantId },
          select: {
            status: true,
            currentPeriodEnd: true,
            planId: true,
          },
        });
      },
      30 * 1000 // 30 seconds cache for subscription data
    );

    if (process.env.NODE_ENV === "development") {
      console.log("🔍 VALIDATE SUBSCRIPTION: Database result:", {
        found: !!subscription,
        status: subscription?.status,
        currentPeriodEnd: subscription?.currentPeriodEnd,
        planId: subscription?.planId,
      });
    }

    if (!subscription) {
      if (process.env.NODE_ENV === "development") {
        console.log("❌ VALIDATE SUBSCRIPTION: No subscription found");
      }
      return {
        isActive: false,
        isExpired: true,
        currentPeriodEnd: null,
        status: null,
        planId: null,
      };
    }

    const now = new Date();
    const isExpired = subscription.currentPeriodEnd
      ? now > subscription.currentPeriodEnd
      : false;

    // Check if subscription is active and not expired
    // Treat PENDING_CHECKOUT as active to preserve access during checkout flows
    const isActive =
      subscription.status === "ACTIVE" || 
      subscription.status === "TRIALING" ||
      subscription.status === "PENDING_CHECKOUT";

    return {
      isActive: isActive && !isExpired,
      isExpired,
      currentPeriodEnd: subscription.currentPeriodEnd,
      status: subscription.status,
      planId: subscription.planId,
    };
  } catch (error) {
    console.error("Error validating subscription:", error);
    // On error, assume subscription is invalid for security
    return {
      isActive: false,
      isExpired: true,
      currentPeriodEnd: null,
      status: null,
      planId: null,
    };
  }
}

/**
 * Check if a tenant has access to the system
 * @param tenantId - The tenant ID to check
 * @returns boolean indicating if tenant has access
 */
export async function hasSystemAccess(tenantId: string): Promise<boolean> {
  const subscriptionStatus = await validateSubscription(tenantId);
  return subscriptionStatus.isActive;
}

/**
 * Check if subscription expires within specified number of days
 * @param tenantId - The tenant ID to check
 * @param days - Number of days to check (default: 2)
 * @returns Object with warning status and days remaining
 */
export async function checkSubscriptionWarning(
  tenantId: string,
  days: number = 2
): Promise<{
  shouldWarn: boolean;
  daysRemaining: number;
  currentPeriodEnd: Date | null;
}> {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { tenantId },
      select: {
        status: true,
        currentPeriodEnd: true,
      },
    });

    if (!subscription || !subscription.currentPeriodEnd) {
      return {
        shouldWarn: false,
        daysRemaining: 0,
        currentPeriodEnd: null,
      };
    }

    // Only warn for active subscriptions
    const isActive =
      subscription.status === "ACTIVE" || subscription.status === "TRIALING";
    if (!isActive) {
      return {
        shouldWarn: false,
        daysRemaining: 0,
        currentPeriodEnd: subscription.currentPeriodEnd,
      };
    }

    const now = new Date();
    const timeDiff = subscription.currentPeriodEnd.getTime() - now.getTime();
    const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

    // Warn if subscription expires within the specified days and hasn't expired yet
    const shouldWarn = daysRemaining > 0 && daysRemaining <= days;

    return {
      shouldWarn,
      daysRemaining,
      currentPeriodEnd: subscription.currentPeriodEnd,
    };
  } catch (error) {
    console.error("Error checking subscription warning:", error);
    return {
      shouldWarn: false,
      daysRemaining: 0,
      currentPeriodEnd: null,
    };
  }
}

/**
 * Get subscription expiration message for UI display
 * @param tenantId - The tenant ID to check
 * @returns string message about subscription status
 */
export async function getSubscriptionMessage(
  tenantId: string
): Promise<string | null> {
  const subscriptionStatus = await validateSubscription(tenantId);

  // Do not show an error for free plan users.
  // Free plan and any ACTIVE plan may have no currentPeriodEnd by design.
  if (subscriptionStatus.status === "ACTIVE") {
    return null;
  }

  // If there's no current period end and it's not a free active plan,
  // treat as missing or inactive subscription.
  if (!subscriptionStatus.currentPeriodEnd) {
    return "No active subscription found. Please subscribe to continue using the service.";
  }

  if (subscriptionStatus.isExpired) {
    return `Your subscription expired on ${subscriptionStatus.currentPeriodEnd.toLocaleDateString()}. Please renew to continue using the service.`;
  }

  if (subscriptionStatus.status === "PAST_DUE") {
    return "Your subscription payment is past due. Please update your payment method.";
  }

  if (subscriptionStatus.status === "CANCELLED") {
    return "Your subscription has been cancelled. Please resubscribe to continue using the service.";
  }

  return null;
}
