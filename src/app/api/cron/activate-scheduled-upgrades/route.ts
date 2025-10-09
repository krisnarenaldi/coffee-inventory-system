import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { computeNextPeriodEnd } from "../../../../../lib/subscription-periods";

export async function GET(request: NextRequest) {
  try {
    console.log("🔄 Starting scheduled upgrade activation job...");

    const now = new Date();

    // Find subscriptions ready for upgrade (intendedPlan set and current period ended)
    const readySubscriptions = await prisma.subscription.findMany({
      where: {
        intendedPlan: { not: null },
        currentPeriodEnd: { lte: now },
      },
      include: {
        plan: true,
      },
    });

    console.log(
      `Found ${readySubscriptions.length} subscriptions ready for upgrade`
    );

    let processedCount = 0;

    for (const subscription of readySubscriptions) {
      try {
        // Get the new plan details
        const newPlan = await prisma.subscriptionPlan.findUnique({
          where: { id: subscription.intendedPlan! },
        });

        if (!newPlan) {
          console.error(
            `❌ New plan ${subscription.intendedPlan} not found for subscription ${subscription.id}`
          );
          continue;
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

        // Update any scheduled transactions to PAID
        await prisma.transaction.updateMany({
          where: {
            tenantId: subscription.tenantId,
            subscriptionPlanId: subscription.intendedPlan!,
            status: "SCHEDULED",
            "metadata.scheduledActivationHandled": false,
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
          `✅ Activated upgrade for tenant ${subscription.tenantId} to ${newPlan.name}`
        );
        processedCount++;
      } catch (error) {
        console.error(
          `❌ Error processing subscription ${subscription.id}:`,
          error
        );
      }
    }

    // Also handle any orphaned SCHEDULED transactions (fallback)
    const scheduledTransactions = await prisma.transaction.findMany({
      where: {
        status: "SCHEDULED",
      },
      include: {
        subscriptionPlan: true,
      },
    });

    console.log(
      `Found ${scheduledTransactions.length} scheduled transactions to process`
    );

    for (const transaction of scheduledTransactions) {
      try {
        // Skip if not an end-of-period upgrade or already handled
        const metadata = transaction.metadata as any;
        if (
          metadata?.upgradeOption !== "end_of_period" ||
          metadata?.scheduledActivationHandled === true
        ) {
          continue;
        }

        // Find the subscription for this tenant
        const subscription = await prisma.subscription.findFirst({
          where: { tenantId: transaction.tenantId },
        });

        if (!subscription) {
          console.error(
            `❌ No subscription found for tenant ${transaction.tenantId}`
          );
          continue;
        }

        // Check if current period has ended
        if (subscription.currentPeriodEnd > now) {
          console.log(
            `⏳ Subscription for tenant ${transaction.tenantId} not ready yet (ends ${subscription.currentPeriodEnd})`
          );
          continue;
        }

        // Calculate new period dates
        const startDate = subscription.currentPeriodEnd;
        const endDate = computeNextPeriodEnd(
          startDate,
          transaction.subscriptionPlan.interval
        );

        // Activate the upgrade
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            planId: transaction.subscriptionPlanId,
            currentPeriodStart: startDate,
            currentPeriodEnd: endDate,
            status: "ACTIVE",
            intendedPlan: null,
            updatedAt: new Date(),
          },
        });

        // Mark transaction as completed
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            status: "PAID",
            metadata: {
              ...transaction.metadata,
              scheduledActivationHandled: true,
              activatedAt: new Date().toISOString(),
            },
          },
        });

        console.log(
          `✅ Activated scheduled transaction ${transaction.id} for tenant ${transaction.tenantId}`
        );
        processedCount++;
      } catch (error) {
        console.error(
          `❌ Error processing scheduled transaction ${transaction.id}:`,
          error
        );
      }
    }

    console.log(
      `🎉 Scheduled upgrade activation completed. Processed: ${processedCount} upgrades`
    );

    return NextResponse.json({
      success: true,
      processedUpgrades: processedCount,
      message: `Successfully processed ${processedCount} scheduled upgrades`,
    });
  } catch (error) {
    console.error("❌ Error in scheduled upgrade activation:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

// Also allow POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}
