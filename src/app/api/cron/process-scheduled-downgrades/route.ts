import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";

// POST /api/cron/process-scheduled-downgrades - Process subscriptions scheduled to downgrade at period end
// Protected by INTERNAL_DOWNGRADE_TOKEN; intended for cron execution
export async function POST(request: NextRequest) {
  try {
    const internalToken = request.headers.get("X-Internal-Access");
    const expectedToken = process.env.INTERNAL_DOWNGRADE_TOKEN;
    if (!expectedToken || internalToken !== expectedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    // Find subscriptions that are scheduled to downgrade and have reached their period end
    const subscriptionsToDowngrade = await prisma.subscription.findMany({
      where: {
        cancelAtPeriodEnd: true,
        currentPeriodEnd: { lte: now },
        status: { not: "CANCELLED" as any },
      },
      include: {
        plan: { select: { name: true } },
        tenant: { select: { id: true, name: true } },
      },
    });

    if (!subscriptionsToDowngrade.length) {
      return NextResponse.json({
        processed: 0,
        message: "No subscriptions scheduled for downgrade",
      });
    }

    console.log(
      `🔄 Processing ${subscriptionsToDowngrade.length} scheduled downgrades`,
    );

    // Get the free plan to downgrade to
    const freePlan = await prisma.subscriptionPlan.findFirst({
      where: { name: "Free" },
    });

    if (!freePlan) {
      console.error("❌ Free plan not found - cannot process downgrades");
      return NextResponse.json(
        {
          error: "Free plan not found",
        },
        { status: 500 },
      );
    }

    let processed = 0;
    const failures: string[] = [];
    const results: Array<{
      tenantId: string;
      tenantName: string;
      fromPlan: string;
      toPlan: string;
      status: string;
    }> = [];

    for (const subscription of subscriptionsToDowngrade) {
      try {
        const fromPlanName = subscription.plan?.name || "Unknown";

        // Downgrade subscription to Free plan
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            planId: freePlan.id,
            status: "ACTIVE" as any,
            cancelAtPeriodEnd: false,
            intendedPlan: null,
            currentPeriodStart: now,
            currentPeriodEnd: null, // Free plan has no expiration
            updatedAt: now,
          },
        });

        // Create audit transaction record
        await prisma.transaction.create({
          data: {
            tenantId: subscription.tenantId,
            userId: "system", // System-initiated downgrade
            subscriptionPlanId: freePlan.id,
            amount: 0,
            currency: "IDR",
            billingCycle: "MONTHLY",
            status: "COMPLETED" as any,
            paymentMethod: "system",
            metadata: {
              type: "scheduled_downgrade",
              fromPlan: subscription.planId,
              fromPlanName,
              toPlan: freePlan.id,
              toPlanName: freePlan.name,
              originalPeriodEnd: subscription.currentPeriodEnd?.toISOString(),
              downgradeDate: now.toISOString(),
              reason: "Scheduled downgrade at period end",
            },
          },
        });

        results.push({
          tenantId: subscription.tenantId,
          tenantName: subscription.tenant?.name || "Unknown",
          fromPlan: fromPlanName,
          toPlan: freePlan.name,
          status: "success",
        });

        processed++;
        console.log(
          `✅ Downgraded tenant ${subscription.tenantId} from ${fromPlanName} to ${freePlan.name}`,
        );
      } catch (error) {
        console.error(
          `❌ Failed to downgrade tenant ${subscription.tenantId}:`,
          error,
        );
        failures.push(subscription.tenantId);

        results.push({
          tenantId: subscription.tenantId,
          tenantName: subscription.tenant?.name || "Unknown",
          fromPlan: subscription.plan?.name || "Unknown",
          toPlan: freePlan.name,
          status: "failed",
        });
      }
    }

    // Log summary
    console.log(`🎯 Scheduled downgrade processing complete:`);
    console.log(`   ✅ Processed: ${processed}`);
    console.log(`   ❌ Failed: ${failures.length}`);
    if (failures.length > 0) {
      console.log(`   Failed tenants: ${failures.join(", ")}`);
    }

    // In a real implementation, you might want to:
    // 1. Send notification emails to affected users
    // 2. Create activity logs for tenant admins
    // 3. Update any external billing systems (Stripe, etc.)
    // 4. Clear cached subscription data

    return NextResponse.json({
      message: `Processed ${processed} scheduled downgrades`,
      processed,
      failures: failures.length,
      failedTenants: failures,
      results,
      summary: {
        totalFound: subscriptionsToDowngrade.length,
        successful: processed,
        failed: failures.length,
        processedAt: now.toISOString(),
      },
    });
  } catch (error) {
    console.error("❌ Scheduled downgrade cron error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

// GET endpoint for debugging/monitoring (protected by same token)
export async function GET(request: NextRequest) {
  try {
    const internalToken = request.headers.get("X-Internal-Access");
    const expectedToken = process.env.INTERNAL_DOWNGRADE_TOKEN;
    if (!expectedToken || internalToken !== expectedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    // Find subscriptions that are scheduled to downgrade
    const pendingDowngrades = await prisma.subscription.findMany({
      where: {
        cancelAtPeriodEnd: true,
        status: { not: "CANCELLED" as any },
      },
      include: {
        plan: { select: { name: true } },
        tenant: { select: { name: true } },
      },
      orderBy: {
        currentPeriodEnd: "asc",
      },
    });

    const readyForDowngrade = pendingDowngrades.filter(
      (sub) => sub.currentPeriodEnd && sub.currentPeriodEnd <= now,
    );

    const futureDowngrades = pendingDowngrades.filter(
      (sub) => sub.currentPeriodEnd && sub.currentPeriodEnd > now,
    );

    return NextResponse.json({
      currentTime: now.toISOString(),
      readyForDowngrade: {
        count: readyForDowngrade.length,
        subscriptions: readyForDowngrade.map((sub) => ({
          tenantId: sub.tenantId,
          tenantName: sub.tenant?.name,
          planName: sub.plan?.name,
          periodEnd: sub.currentPeriodEnd?.toISOString(),
        })),
      },
      futureDowngrades: {
        count: futureDowngrades.length,
        subscriptions: futureDowngrades.map((sub) => ({
          tenantId: sub.tenantId,
          tenantName: sub.tenant?.name,
          planName: sub.plan?.name,
          periodEnd: sub.currentPeriodEnd?.toISOString(),
          daysUntilDowngrade: sub.currentPeriodEnd
            ? Math.ceil(
                (sub.currentPeriodEnd.getTime() - now.getTime()) /
                  (1000 * 60 * 60 * 24),
              )
            : null,
        })),
      },
    });
  } catch (error) {
    console.error("❌ Error checking scheduled downgrades:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}
