import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";

// POST /api/admin/update-subscription-statuses
// Manually update subscription statuses based on currentPeriodEnd dates
export async function POST(request: NextRequest) {
  try {
    const now = new Date();
    const graceDeadline = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

    console.log('🔄 Updating subscription statuses based on dates...');
    console.log('Current time:', now.toISOString());
    console.log('Grace deadline:', graceDeadline.toISOString());

    // Update subscriptions to PAST_DUE if currentPeriodEnd has passed but still within grace period
    const pastDueUpdate = await prisma.subscription.updateMany({
      where: {
        currentPeriodEnd: {
          lt: now, // Period has ended
          gte: graceDeadline // But still within grace period
        },
        status: "ACTIVE" // Only update ACTIVE subscriptions
      },
      data: {
        status: "PAST_DUE",
        updatedAt: now
      }
    });

    // Update subscriptions to EXPIRED if grace period has passed
    const expiredUpdate = await prisma.subscription.updateMany({
      where: {
        currentPeriodEnd: {
          lt: graceDeadline // Grace period has passed
        },
        status: { in: ["ACTIVE", "PAST_DUE"] } // Update both ACTIVE and PAST_DUE
      },
      data: {
        status: "EXPIRED",
        updatedAt: now
      }
    });

    console.log(`✅ Updated ${pastDueUpdate.count} subscriptions to PAST_DUE`);
    console.log(`✅ Updated ${expiredUpdate.count} subscriptions to EXPIRED`);

    return NextResponse.json({
      success: true,
      pastDueUpdated: pastDueUpdate.count,
      expiredUpdated: expiredUpdate.count,
      message: `Updated ${pastDueUpdate.count} to PAST_DUE and ${expiredUpdate.count} to EXPIRED`
    });

  } catch (error) {
    console.error("❌ Error updating subscription statuses:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}