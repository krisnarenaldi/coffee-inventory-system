import { prisma } from "./prisma";
import { getCachedOrFetch, CacheKeys, CacheTTL } from "./cache";

export interface SubscriptionStatus {
  isActive: boolean;
  isExpired: boolean;
  isInGracePeriod?: boolean;
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
  tenantId: string,
): Promise<SubscriptionStatus> {
  try {
    if (process.env.NODE_ENV === "development") {
      console.log(
        "🔍 VALIDATE SUBSCRIPTION: Starting validation for tenant:",
        tenantId,
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
      30 * 1000, // 30 seconds cache for subscription data
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
    let isExpired = false;
    let isInGracePeriod = false;

    if (subscription.currentPeriodEnd) {
      const graceEnd = new Date(
        subscription.currentPeriodEnd.getTime() + 7 * 24 * 60 * 60 * 1000,
      );
      isInGracePeriod = now > subscription.currentPeriodEnd && now <= graceEnd;
      // Consider expired only AFTER grace period ends
      isExpired = now > graceEnd;
    }

    // Check if subscription is active and not expired
    // Treat PENDING_CHECKOUT as active to preserve access during checkout flows
    // Also treat PAST_DUE as active during grace period
    const isBaseActive =
      subscription.status === "ACTIVE" ||
      subscription.status === "TRIALING" ||
      subscription.status === "PENDING_CHECKOUT";

    // PAST_DUE is considered active during grace period
    const isPastDueButInGrace =
      subscription.status === "PAST_DUE" && isInGracePeriod;

    const isActive = (isBaseActive || isPastDueButInGrace) && !isExpired;

    return {
      isActive,
      isExpired,
      isInGracePeriod,
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
  days: number = 2,
): Promise<{
  shouldWarn: boolean;
  daysRemaining: number;
  currentPeriodEnd: Date | null;
  message?: string;
  ctaText?: string;
  ctaLink?: string;
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

    // Check if subscription is in a state where warnings make sense
    const canWarn =
      subscription.status === "ACTIVE" ||
      subscription.status === "TRIALING" ||
      subscription.status === "PAST_DUE";

    if (!canWarn) {
      return {
        shouldWarn: false,
        daysRemaining: 0,
        currentPeriodEnd: subscription.currentPeriodEnd,
      };
    }

    const now = new Date();
    const timeDiff = subscription.currentPeriodEnd.getTime() - now.getTime();
    const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

    // Determine grace period state
    const graceEnd = new Date(
      subscription.currentPeriodEnd.getTime() + 7 * 24 * 60 * 60 * 1000,
    );
    const inGrace = now > subscription.currentPeriodEnd && now <= graceEnd;
    const pastGrace = now > graceEnd;

    // Determine warning conditions
    let shouldWarn = false;
    let message: string | undefined;
    let ctaText: string | undefined;
    let ctaLink: string | undefined;

    if (inGrace) {
      // During grace period, always show reminder
      shouldWarn = true;
      message = "Don't lose your data. Renew now.";
      ctaText = "Renew Subscription";
      ctaLink = "/subscription";
    } else if (pastGrace) {
      // Past grace: no warning toast here; auto-downgrade job handles enforcement
      shouldWarn = false;
    } else if (
      subscription.status === "ACTIVE" ||
      subscription.status === "TRIALING"
    ) {
      // Active subscriptions: warn if expiring within specified days
      shouldWarn = daysRemaining > 0 && daysRemaining <= days;
    }

    return {
      shouldWarn,
      daysRemaining,
      currentPeriodEnd: subscription.currentPeriodEnd,
      message,
      ctaText,
      ctaLink,
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
  tenantId: string,
): Promise<string | null> {
  const subscriptionStatus = await validateSubscription(tenantId);

  // Do not show an error for free plan users.
  // Free plan and any ACTIVE plan may have no currentPeriodEnd by design.
  // Treat any active status (including PENDING_CHECKOUT/TRIALING) with no expiry as valid.
  if (subscriptionStatus.isActive && !subscriptionStatus.isExpired) {
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
