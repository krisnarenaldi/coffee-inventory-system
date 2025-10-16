import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";

// POST /api/subscription/cancel - Schedule downgrade to Free plan at period end
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can cancel subscription
    if (!["ADMIN", "PLATFORM_ADMIN"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }

    // Get current subscription
    const currentSubscription = await prisma.subscription.findUnique({
      where: {
        tenantId: session.user.tenantId,
      },
      include: {
        plan: true,
      },
    });

    if (!currentSubscription) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 404 },
      );
    }

    if (currentSubscription.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Subscription is already cancelled" },
        { status: 400 },
      );
    }

    if (currentSubscription.cancelAtPeriodEnd) {
      return NextResponse.json(
        { error: "Subscription is already set to downgrade at period end" },
        { status: 400 },
      );
    }

    // Get free plan to downgrade to
    const freePlan = await prisma.subscriptionPlan.findFirst({
      where: { name: "Free" },
    });

    if (!freePlan) {
      return NextResponse.json(
        { error: "Free plan not found" },
        { status: 500 },
      );
    }

    // Mark subscription to downgrade to Free at period end
    const updatedSubscription = await prisma.subscription.update({
      where: {
        tenantId: session.user.tenantId,
      },
      data: {
        cancelAtPeriodEnd: true,
        intendedPlan: freePlan.id,
        updatedAt: new Date(),
      },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            interval: true,
            maxUsers: true,
            maxIngredients: true,
            maxBatches: true,
            features: true,
          },
        },
      },
    });

    // Log the downgrade scheduling for audit purposes
    console.log(
      `Subscription downgrade to Free scheduled for tenant ${session.user.tenantId} at period end: ${currentSubscription.currentPeriodEnd}`,
    );

    // In a real implementation, you would also:
    // 1. Update the subscription in Stripe to not renew
    // 2. Send confirmation email to the user
    // 3. Schedule a job to downgrade to free plan at period end

    return NextResponse.json({
      message: `Your ${currentSubscription.plan.name} plan will downgrade to Free at the end of your current billing period`,
      subscription: updatedSubscription,
      downgradeDate: currentSubscription.currentPeriodEnd,
      downgradeTo: "Free",
    });
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE /api/subscription/cancel - Cancel scheduled downgrade (keep current plan)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can reactivate subscription
    if (!["ADMIN", "PLATFORM_ADMIN"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }

    // Get current subscription
    const currentSubscription = await prisma.subscription.findUnique({
      where: {
        tenantId: session.user.tenantId,
      },
    });

    if (!currentSubscription) {
      return NextResponse.json(
        { error: "No subscription found" },
        { status: 404 },
      );
    }

    if (!currentSubscription.cancelAtPeriodEnd) {
      return NextResponse.json(
        { error: "Subscription is not set to downgrade" },
        { status: 400 },
      );
    }

    // Remove downgrade flag
    const updatedSubscription = await prisma.subscription.update({
      where: {
        tenantId: session.user.tenantId,
      },
      data: {
        cancelAtPeriodEnd: false,
        intendedPlan: null,
        status: "ACTIVE",
        updatedAt: new Date(),
      },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            interval: true,
            maxUsers: true,
            maxIngredients: true,
            maxBatches: true,
            features: true,
          },
        },
      },
    });

    // Log the downgrade cancellation for audit purposes
    console.log(
      `Subscription downgrade cancelled for tenant ${session.user.tenantId} - keeping current plan`,
    );

    return NextResponse.json({
      message: `Downgrade cancelled. You will keep your ${updatedSubscription.plan?.name || "current"} plan.`,
      subscription: updatedSubscription,
    });
  } catch (error) {
    console.error("Error reactivating subscription:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
