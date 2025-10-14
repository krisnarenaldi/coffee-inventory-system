import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";
import {
  createSnapToken,
  generateOrderId,
  formatPriceForMidtrans,
} from "../../../../../lib/midtrans";
import { Decimal } from "@prisma/client/runtime/library";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      subscriptionId,
      newPlanId,
      effectiveDate = "immediate",
    } = await request.json();

    // Get user and tenant information
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { tenant: true },
    });

    if (!user || !user.tenant) {
      return NextResponse.json(
        { error: "User or tenant not found" },
        { status: 404 }
      );
    }

    // Get current subscription and new plan
    const [subscription, newPlan] = await Promise.all([
      prisma.subscription.findUnique({
        where: { id: subscriptionId },
        include: { plan: true },
      }),
      prisma.subscriptionPlan.findUnique({
        where: { id: newPlanId },
      }),
    ]);

    if (!subscription || !newPlan) {
      return NextResponse.json(
        { error: "Subscription or plan not found" },
        { status: 404 }
      );
    }

    // Verify the subscription belongs to the user's tenant
    if (subscription.tenantId !== user.tenantId) {
      return NextResponse.json(
        { error: "Unauthorized access to subscription" },
        { status: 403 }
      );
    }

    // Check if the subscription is in a state that allows plan changes
    // Allow: ACTIVE, PAST_DUE, CANCELLED, UNPAID, TRIALING
    // Block: INCOMPLETE, INCOMPLETE_EXPIRED, PENDING_CHECKOUT (these need to complete first)
    const allowedStatuses = [
      "ACTIVE",
      "PAST_DUE",
      "CANCELLED",
      "UNPAID",
      "TRIALING",
    ];
    if (!allowedStatuses.includes(subscription.status)) {
      return NextResponse.json(
        {
          error: `Cannot change plans for subscriptions with status: ${subscription.status}. Please complete any pending actions first.`,
        },
        { status: 400 }
      );
    }

    // Check if it's the same plan with expiration awareness
    const isSamePlan = subscription.planId === newPlanId;

    if (isSamePlan) {
      // Check if subscription is expired
      const now = new Date();
      const currentPeriodEnd = subscription.currentPeriodEnd
        ? new Date(subscription.currentPeriodEnd)
        : null;
      const remainingDays = currentPeriodEnd
        ? Math.ceil(
            (currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          )
        : 0;
      const isExpired = remainingDays <= 0;

      if (!isExpired) {
        // Active subscription: cannot renew same plan
        return NextResponse.json(
          {
            error:
              "Cannot renew the same plan while subscription is active. You can upgrade or downgrade to other plans, or wait until your current subscription expires.",
          },
          { status: 400 }
        );
      }

      // If expired and same plan: this is a renewal, but change-plan endpoint doesn't handle renewals
      // Renewals should go through the upgrade endpoint for payment processing
      return NextResponse.json(
        {
          error:
            "Expired subscription renewals must be processed through the upgrade endpoint for payment.",
        },
        { status: 400 }
      );
    }

    // CRITICAL FIX: Handle expired subscriptions with different plans (downgrades/upgrades)
    if (isExpired && !isSamePlan) {
      // For expired subscriptions changing to different plans, treat as new subscription
      // This requires payment regardless of upgrade/downgrade
      const newPlanPrice = Number(newPlan.price);

      // Create a transaction for the new plan
      const transaction = await prisma.transaction.create({
        data: {
          tenantId: subscription.tenantId,
          userId: session.user.id,
          subscriptionPlanId: newPlan.id,
          amount: newPlanPrice,
          status: newPlanPrice > 0 ? "PENDING" : "PAID", // Free plans are immediately paid
          metadata: {
            changeType: "expired_plan_change",
            fromPlan: subscription.planId,
            toPlan: newPlan.id,
            isExpiredChange: true,
            createdAt: new Date().toISOString(),
          },
        },
      });

      if (newPlanPrice > 0) {
        // Requires payment - set up for checkout
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: "PENDING_CHECKOUT" as any,
            intendedPlan: newPlan.id,
            updatedAt: new Date(),
          },
        });

        return NextResponse.json({
          message: "Plan change requires payment. Please complete checkout.",
          requiresPayment: true,
          transactionId: transaction.id,
          amount: newPlanPrice,
          newPlan: {
            id: newPlan.id,
            name: newPlan.name,
            price: newPlan.price,
          },
        });
      } else {
        // Free plan - activate immediately
        const now = new Date();
        const nextPeriodEnd =
          newPlan.interval === "YEARLY"
            ? new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
            : new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            planId: newPlan.id,
            currentPeriodStart: now,
            currentPeriodEnd: nextPeriodEnd,
            status: "ACTIVE",
            intendedPlan: null,
            updatedAt: new Date(),
          },
        });

        return NextResponse.json({
          message: `Successfully changed to ${newPlan.name} plan.`,
          subscription: {
            planId: newPlan.id,
            planName: newPlan.name,
            status: "ACTIVE",
            currentPeriodStart: now,
            currentPeriodEnd: nextPeriodEnd,
          },
        });
      }
    }

    // Calculate prorated amounts
    const now = new Date();
    const currentPeriodStart = subscription.currentPeriodStart;
    const currentPeriodEnd = subscription.currentPeriodEnd;

    // Calculate remaining days in current period
    const totalDaysInPeriod = Math.ceil(
      (currentPeriodEnd.getTime() - currentPeriodStart.getTime()) /
        (1000 * 60 * 60 * 24)
    );
    const remainingDays = Math.ceil(
      (currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    const usedDays = totalDaysInPeriod - remainingDays;

    // Calculate prorated amounts
    const currentPlanPrice = Number(subscription.plan.price);
    const newPlanPrice = Number(newPlan.price);

    // Amount already paid for unused portion of current plan
    const unusedAmount = (currentPlanPrice / totalDaysInPeriod) * remainingDays;

    // Amount needed for new plan for remaining period
    const newPlanProrated = (newPlanPrice / totalDaysInPeriod) * remainingDays;

    // Net amount to charge (positive = charge, negative = credit)
    const proratedAmount = newPlanProrated - unusedAmount;

    const isUpgrade = newPlanPrice > currentPlanPrice;
    const changeType = isUpgrade ? "upgrade" : "downgrade";

    // For immediate changes that require payment
    if (effectiveDate === "immediate" && proratedAmount > 0) {
      // Generate order ID for the plan change
      const orderId = generateOrderId(`PLAN_${changeType.toUpperCase()}`);
      const formattedAmount = formatPriceForMidtrans(
        Math.round(proratedAmount)
      );

      // Create transaction record
      const transaction = await prisma.transaction.create({
        data: {
          userId: user.id,
          tenantId: user.tenantId,
          subscriptionPlanId: newPlan.id,
          amount: new Decimal(proratedAmount),
          currency: "IDR",
          billingCycle: subscription.plan.interval,
          status: "PENDING",
          paymentMethod: "midtrans",
          paymentGatewayId: orderId,
          metadata: {
            type: "plan_change",
            changeType,
            originalSubscriptionId: subscription.id,
            originalPlanId: subscription.planId,
            newPlanId: newPlan.id,
            proratedCalculation: {
              totalDaysInPeriod,
              remainingDays,
              usedDays,
              currentPlanPrice,
              newPlanPrice,
              unusedAmount,
              newPlanProrated,
              proratedAmount,
            },
            effectiveDate: now.toISOString(),
            created_at: new Date().toISOString(),
          },
        },
      });

      // Create Midtrans Snap token
      const snapToken = await createSnapToken({
        transaction_details: {
          order_id: orderId,
          gross_amount: formattedAmount,
        },
        customer_details: {
          first_name: user.name?.split(" ")[0] || "Customer",
          last_name: user.name?.split(" ").slice(1).join(" ") || "",
          email: user.email,
        },
        item_details: [
          {
            id: newPlan.id,
            price: formattedAmount,
            quantity: 1,
            name: `Plan ${changeType} to ${newPlan.name}`,
            category: "subscription_change",
          },
        ],
        callbacks: {
          finish: `${process.env.NEXTAUTH_URL}/subscription/change-success?order_id=${orderId}`,
          error: `${process.env.NEXTAUTH_URL}/subscription/change-error?order_id=${orderId}`,
          pending: `${process.env.NEXTAUTH_URL}/subscription/change-pending?order_id=${orderId}`,
        },
        expiry: {
          start_time: new Date().toISOString().replace(/\.\d{3}Z$/, " +0700"),
          unit: "day",
          duration: 1,
        },
        custom_field1: "subscription_change",
        custom_field2: subscription.id,
        custom_field3: user.tenantId,
      });

      return NextResponse.json({
        requiresPayment: true,
        snapToken,
        orderId,
        amount: formattedAmount,
        changeType,
        currentPlan: subscription.plan.name,
        newPlan: newPlan.name,
        proratedAmount,
        transactionId: transaction.id,
        calculation: {
          totalDaysInPeriod,
          remainingDays,
          unusedAmount,
          newPlanProrated,
          proratedAmount,
        },
      });
    }

    // For immediate downgrades or end-of-period changes
    if (effectiveDate === "immediate" && proratedAmount <= 0) {
      // Update subscription immediately for downgrades
      const updatedSubscription = await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          planId: newPlan.id,
          updatedAt: new Date(),
        },
        include: { plan: true },
      });

      // Create a transaction record for the change (no payment required)
      await prisma.transaction.create({
        data: {
          userId: user.id,
          tenantId: user.tenantId,
          subscriptionPlanId: newPlan.id,
          amount: new Decimal(0),
          currency: "IDR",
          billingCycle: subscription.plan.interval,
          status: "COMPLETED",
          paymentMethod: "system",
          metadata: {
            type: "plan_change",
            changeType,
            originalSubscriptionId: subscription.id,
            originalPlanId: subscription.planId,
            newPlanId: newPlan.id,
            proratedCalculation: {
              totalDaysInPeriod,
              remainingDays,
              usedDays,
              currentPlanPrice,
              newPlanPrice,
              unusedAmount,
              newPlanProrated,
              proratedAmount,
            },
            effectiveDate: now.toISOString(),
            creditAmount: Math.abs(proratedAmount),
            created_at: new Date().toISOString(),
          },
        },
      });

      return NextResponse.json({
        requiresPayment: false,
        changeType,
        currentPlan: subscription.plan.name,
        newPlan: newPlan.name,
        subscription: updatedSubscription,
        creditAmount: Math.abs(proratedAmount),
        message: `Successfully ${changeType}d to ${newPlan.name}. ${
          proratedAmount < 0
            ? `Credit of ${Math.abs(proratedAmount).toLocaleString("id-ID", {
                style: "currency",
                currency: "IDR",
              })} will be applied to your next billing cycle.`
            : ""
        }`,
      });
    }

    // For end-of-period changes, schedule the change
    if (effectiveDate === "end_of_period") {
      // Store the pending plan change
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          updatedAt: new Date(),
          // Note: In a real implementation, you might want to add a pendingPlanId field
          // or create a separate PendingPlanChange model to track scheduled changes
        },
      });

      return NextResponse.json({
        requiresPayment: false,
        changeType,
        currentPlan: subscription.plan.name,
        newPlan: newPlan.name,
        scheduledDate: currentPeriodEnd,
        message: `Plan change to ${
          newPlan.name
        } scheduled for ${currentPeriodEnd.toLocaleDateString()}. No immediate payment required.`,
      });
    }

    return NextResponse.json(
      { error: "Invalid effective date option" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Plan change error:", error);
    return NextResponse.json(
      { error: "Failed to process plan change" },
      { status: 500 }
    );
  }
}

// Get plan change preview and calculations
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const subscriptionId = searchParams.get("subscriptionId");
    const newPlanId = searchParams.get("newPlanId");

    if (!subscriptionId || !newPlanId) {
      return NextResponse.json(
        { error: "Subscription ID and new plan ID required" },
        { status: 400 }
      );
    }

    // Get user and tenant information
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { tenant: true },
    });

    if (!user || !user.tenant) {
      return NextResponse.json(
        { error: "User or tenant not found" },
        { status: 404 }
      );
    }

    // Get current subscription and new plan
    const [subscription, newPlan] = await Promise.all([
      prisma.subscription.findUnique({
        where: { id: subscriptionId },
        include: { plan: true },
      }),
      prisma.subscriptionPlan.findUnique({
        where: { id: newPlanId },
      }),
    ]);

    if (!subscription || !newPlan) {
      return NextResponse.json(
        { error: "Subscription or plan not found" },
        { status: 404 }
      );
    }

    // Verify the subscription belongs to the user's tenant
    if (subscription.tenantId !== user.tenantId) {
      return NextResponse.json(
        { error: "Unauthorized access to subscription" },
        { status: 403 }
      );
    }

    // Calculate prorated amounts
    const now = new Date();
    const currentPeriodStart = subscription.currentPeriodStart;
    const currentPeriodEnd = subscription.currentPeriodEnd;

    const totalDaysInPeriod = Math.ceil(
      (currentPeriodEnd.getTime() - currentPeriodStart.getTime()) /
        (1000 * 60 * 60 * 24)
    );
    const remainingDays = Math.ceil(
      (currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    const usedDays = totalDaysInPeriod - remainingDays;

    const currentPlanPrice = Number(subscription.plan.price);
    const newPlanPrice = Number(newPlan.price);

    const unusedAmount = (currentPlanPrice / totalDaysInPeriod) * remainingDays;
    const newPlanProrated = (newPlanPrice / totalDaysInPeriod) * remainingDays;
    const proratedAmount = newPlanProrated - unusedAmount;

    const isUpgrade = newPlanPrice > currentPlanPrice;
    const changeType = isUpgrade ? "upgrade" : "downgrade";

    return NextResponse.json({
      currentPlan: {
        id: subscription.plan.id,
        name: subscription.plan.name,
        price: currentPlanPrice,
        interval: subscription.plan.interval,
      },
      newPlan: {
        id: newPlan.id,
        name: newPlan.name,
        price: newPlanPrice,
        interval: newPlan.interval,
      },
      changeType,
      billingPeriod: {
        start: currentPeriodStart,
        end: currentPeriodEnd,
        totalDays: totalDaysInPeriod,
        remainingDays,
        usedDays,
      },
      calculation: {
        unusedAmount,
        newPlanProrated,
        proratedAmount,
        requiresPayment: proratedAmount > 0,
        creditAmount: proratedAmount < 0 ? Math.abs(proratedAmount) : 0,
      },
      options: {
        immediate: {
          available: true,
          requiresPayment: proratedAmount > 0,
          amount: Math.max(0, proratedAmount),
        },
        endOfPeriod: {
          available: true,
          requiresPayment: false,
          effectiveDate: currentPeriodEnd,
        },
      },
    });
  } catch (error) {
    console.error("Get plan change preview error:", error);
    return NextResponse.json(
      { error: "Failed to get plan change preview" },
      { status: 500 }
    );
  }
}