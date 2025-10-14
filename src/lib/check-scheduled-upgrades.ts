import { prisma } from "./prisma";
import { computeNextPeriodEnd } from "./subscription-periods";
import { mapTransactionStatus } from "./midtrans";

export async function checkAndActivateScheduledUpgrades(tenantId: string) {
  try {
    const now = new Date();

    // Check if this tenant has a scheduled upgrade ready
    const subscription = await prisma.subscription.findFirst({
      where: {
        tenantId: tenantId,
        intendedPlan: { not: null },
        currentPeriodEnd: { lte: now },
      },
      include: { plan: true },
    });

    if (!subscription) {
      return null; // No scheduled upgrade
    }

    // CRITICAL FIX: Check if there's a verified successful payment for this upgrade
    const successfulTransaction = await prisma.transaction.findFirst({
      where: {
        tenantId: tenantId,
        subscriptionPlanId: subscription.intendedPlan!,
        status: "PAID",
      },
      orderBy: { createdAt: "desc" },
    });

    // Additional guard: ensure webhook notification indicates a PAID status
    const hasValidWebhookStatus = successfulTransaction?.metadata?.midtrans_notification
      ? mapTransactionStatus(
          (successfulTransaction.metadata as any).midtrans_notification?.transaction_status
        ) === "PAID"
      : false;

    if (!successfulTransaction || !hasValidWebhookStatus) {
      console.log(
        `⚠️ Skipping scheduled upgrade for tenant ${tenantId} - no successful payment found`
      );

      // Check if there are any failed transactions for this upgrade
      const failedTransaction = await prisma.transaction.findFirst({
        where: {
          tenantId: tenantId,
          subscriptionPlanId: subscription.intendedPlan!,
          status: { in: ["FAILED", "CANCELLED", "EXPIRED"] },
        },
        orderBy: { createdAt: "desc" },
      });

      if (failedTransaction) {
        console.log(
          `🧹 Clearing intendedPlan for tenant ${tenantId} due to failed payment`
        );
        // Clear the intendedPlan since payment failed
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            intendedPlan: null,
            status:
              subscription.currentPeriodEnd <= now ? "PAST_DUE" : "ACTIVE",
            updatedAt: new Date(),
          },
        });
      }

      return null;
    }

    // Get the new plan
    const newPlan = await prisma.subscriptionPlan.findUnique({
      where: { id: subscription.intendedPlan! },
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
        status: "ACTIVE",
        intendedPlan: null,
        updatedAt: new Date(),
      },
    });

    // Update scheduled transactions
    await prisma.transaction.updateMany({
      where: {
        tenantId: tenantId,
        subscriptionPlanId: subscription.intendedPlan!,
        status: "SCHEDULED",
      },
      data: {
        status: "PAID",
        metadata: {
          scheduledActivationHandled: true,
          activatedAt: new Date().toISOString(),
        },
      },
    });

    console.log(
      `✅ Activated scheduled upgrade for tenant ${tenantId} to ${newPlan.name}`
    );

    return {
      activated: true,
      newPlan: newPlan,
      activatedAt: new Date(),
    };
  } catch (error) {
    console.error("Error checking scheduled upgrades:", error);
    return null;
  }
}

// Call this when user loads dashboard or subscription page
export async function checkScheduledUpgradesOnLoad(tenantId: string) {
  const result = await checkAndActivateScheduledUpgrades(tenantId);

  if (result?.activated) {
    return {
      message: `🎉 Your upgrade to ${result.newPlan.name} has been activated!`,
      type: "success" as const,
    };
  }

  return null;
}
