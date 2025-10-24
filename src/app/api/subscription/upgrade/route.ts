import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";

// POST /api/subscription/upgrade - Upgrade subscription plan
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can upgrade subscription
    if (!["ADMIN", "PLATFORM_ADMIN"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { planId, calculatedAmount, billingCycle } = body as {
      planId: string;
      calculatedAmount?: number;
      billingCycle?: "monthly" | "yearly";
    };

    if (!planId) {
      return NextResponse.json(
        { error: "Plan ID is required" },
        { status: 400 }
      );
    }

    // Verify the new plan exists and is active
    const newPlan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!newPlan || !newPlan.isActive) {
      return NextResponse.json(
        { error: "Invalid or inactive subscription plan" },
        { status: 400 }
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
        { error: "No current subscription found" },
        { status: 404 }
      );
    }

    // Check if it's actually an upgrade (higher price)
    const isUpgrade =
      Number(newPlan.price) > Number(currentSubscription.plan.price);
    const isSamePlan = planId === currentSubscription.planId;

    console.log('🔍 UPGRADE API DEBUG:', {
      currentPlan: currentSubscription.plan.name,
      currentPrice: Number(currentSubscription.plan.price),
      newPlan: newPlan.name,
      newPrice: Number(newPlan.price),
      isUpgrade,
      isSamePlan,
      tenantId: session.user.tenantId
    });

    // Check if subscription is expired
    const now = new Date();
    const currentPeriodEnd = currentSubscription.currentPeriodEnd
      ? new Date(currentSubscription.currentPeriodEnd)
      : null;
    const remainingDays = currentPeriodEnd
      ? Math.ceil(
          (currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )
      : 0;
    const isExpired = remainingDays <= 0;

    // Apply business logic for same plan selection
    if (isSamePlan && !isExpired) {
      // Active subscription: cannot renew same plan
      return NextResponse.json(
        {
          error:
            "Cannot renew the same plan while subscription is active. You can upgrade or downgrade to other plans, or wait until your current subscription expires.",
        },
        { status: 400 }
      );
    }

    // If same plan and expired: this is a renewal (allowed)
    // If different plan: this is an upgrade/downgrade (allowed)

    // Determine if this requires payment
    const isRenewal = isSamePlan && isExpired;
    // For expired subscriptions, ALL plan changes require payment (even downgrades)
    const requiresPayment = isUpgrade || isRenewal || (isExpired && !isSamePlan);

    console.log('🔍 UPGRADE API DEBUG - Payment logic:', {
      isExpired,
      remainingDays,
      isRenewal,
      requiresPayment,
      reason: isUpgrade ? 'upgrade' : isRenewal ? 'renewal' : (isExpired && !isSamePlan) ? 'expired_plan_change' : 'none'
    });

    // Enforce checkout for upgrades and renewals: do NOT change plan immediately
    if (requiresPayment) {
      // ALL upgrades and renewals require payment - the difference is WHEN activation happens
      await prisma.subscription.update({
        where: { tenantId: session.user.tenantId },
        data: {
          status: "PENDING_CHECKOUT" as any,
          intendedPlan: newPlan.id,
          updatedAt: new Date(),
        },
      });

      // Prefer client-selected billing cycle, fall back to plan's default interval
      const cycle = billingCycle === "yearly" || billingCycle === "monthly"
        ? billingCycle
        : (newPlan.interval || "MONTHLY").toString().toLowerCase();

      // Build checkout URL with upgrade options
      const checkoutParams = new URLSearchParams({
        plan: newPlan.id,
        cycle: cycle,
      });

      // Add upgrade-specific parameters (always immediate now)
      checkoutParams.set("upgradeOption", "immediate");

      // Do not append amount to URL; server will compute secure amount

      const checkoutUrl = `/checkout?${checkoutParams.toString()}`;

      return NextResponse.json({
        message: "Upgrade requires payment. Redirecting to checkout.",
        checkoutUrl,
        requiresPayment: true,
        upgradeOption: "immediate",
        calculatedAmount: calculatedAmount || Number(newPlan.price),
      });
    }

    // For active subscription downgrades, redirect to change-plan endpoint
    // This should only happen for active subscriptions doing downgrades
    return NextResponse.json(
      {
        error:
          "Active subscription downgrades should use the change-plan endpoint. Expired subscriptions require payment regardless of plan change.",
      },
      { status: 400 }
    );

    // (No immediate subscription change performed here to prevent unpaid upgrades)
  } catch (error) {
    console.error("Error upgrading subscription:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}