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
    const { planId, calculatedAmount } = body;

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

    if (isSamePlan) {
      return NextResponse.json(
        { error: "Already subscribed to this plan" },
        { status: 400 }
      );
    }

    // Enforce checkout for upgrades: do NOT change plan immediately
    if (isUpgrade) {
      // ALL upgrades require payment - the difference is WHEN activation happens
      await prisma.subscription.update({
        where: { tenantId: session.user.tenantId },
        data: {
          status: "PENDING_CHECKOUT" as any,
          intendedPlan: newPlan.id,
          updatedAt: new Date(),
        },
      });

      const cycle = (newPlan.interval || "MONTHLY").toString().toLowerCase();

      // Build checkout URL with upgrade options
      const checkoutParams = new URLSearchParams({
        plan: newPlan.id,
        cycle: cycle,
      });

      // Add upgrade-specific parameters (always immediate now)
      checkoutParams.set("upgradeOption", "immediate");

      if (calculatedAmount) {
        checkoutParams.set("amount", calculatedAmount.toString());
      }

      const checkoutUrl = `/checkout?${checkoutParams.toString()}`;

      return NextResponse.json({
        message: "Upgrade requires payment. Redirecting to checkout.",
        checkoutUrl,
        requiresPayment: true,
        upgradeOption: "immediate",
        calculatedAmount: calculatedAmount || Number(newPlan.price),
      });
    }

    // For non-upgrade changes, do not allow immediate changes here
    // Clients should use the change-plan endpoint for downgrades or lateral changes
    return NextResponse.json(
      {
        error:
          "Only upgrades are supported via this endpoint. Use change-plan for other modifications.",
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
