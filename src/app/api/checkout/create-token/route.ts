import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";
import {
  createSnapToken,
  generateOrderId,
  formatPriceForMidtrans,
  MidtransParameter,
} from "../../../../../lib/midtrans";

// Midtrans expects 'yyyy-MM-dd HH:mm:ss Z' (eg '2020-06-09 15:07:00 +0700')
function formatMidtransStartTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = date.getUTCFullYear();
  const MM = pad(date.getUTCMonth() + 1);
  const dd = pad(date.getUTCDate());
  const HH = pad(date.getUTCHours());
  const mm = pad(date.getUTCMinutes());
  const ss = pad(date.getUTCSeconds());
  // Use UTC offset explicitly
  const offset = "+0000";
  return `${yyyy}-${MM}-${dd} ${HH}:${mm}:${ss} ${offset}`;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { planId, billingCycle, upgradeOption, customAmount } =
      await request.json();

    if (!planId || !billingCycle) {
      return NextResponse.json(
        { error: "Plan ID and billing cycle are required" },
        { status: 400 },
      );
    }

    // Security: Validate user has permission to purchase this plan
    const userSubscription = await prisma.subscription.findFirst({
      where: { tenantId: session.user.tenantId },
      include: { plan: true },
    });

    // Check if user has a pending checkout and validate intended plan
    if (userSubscription && userSubscription.status === "PENDING_CHECKOUT") {
      const intendedPlan = (userSubscription as any).intendedPlan;

      // Convert intended plan name to plan ID for comparison
      const expectedPlanId =
        intendedPlan === "professional"
          ? "professional-plan"
          : intendedPlan === "starter"
            ? "starter-plan"
            : intendedPlan === "free"
              ? "free-plan"
              : null;

      if (!expectedPlanId) {
        return NextResponse.json(
          {
            error: `Invalid intended plan: ${intendedPlan}`,
          },
          { status: 400 },
        );
      }

      // Reject if user tries to checkout a different plan than their intended plan
      if (planId !== expectedPlanId) {
        return NextResponse.json(
          {
            error: "Unauthorized: You can only checkout your intended plan",
            intendedPlan: intendedPlan,
            requestedPlan: planId,
          },
          { status: 403 },
        );
      }
    } else {
      // For users without PENDING_CHECKOUT, they shouldn't be accessing checkout directly
      // They should go through the upgrade flow first
      return NextResponse.json(
        {
          error:
            "Unauthorized: Please initiate upgrade from your dashboard first",
          currentStatus: userSubscription?.status || "unknown",
        },
        { status: 403 },
      );
    }

    // Get the subscription plan
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      return NextResponse.json(
        { error: "Subscription plan not found" },
        { status: 404 },
      );
    }

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        tenantId: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Calculate price based on billing cycle and upgrade options
    const isYearly = billingCycle === "yearly";
    let price: number;

    // Use custom amount for immediate upgrades, otherwise use plan price
    if (customAmount && upgradeOption === "immediate") {
      price = customAmount;
    } else {
      const planPrice = plan.price ? Number(plan.price) : 0;

      // Apply yearly discount (20% off) if yearly billing is selected
      // This matches the pricing page logic: yearly = monthly * 0.8
      const calculatedPrice = isYearly
        ? Math.round(planPrice * 0.8)
        : planPrice;

      if (!calculatedPrice || calculatedPrice <= 0) {
        return NextResponse.json(
          { error: "Price not available for selected billing cycle" },
          { status: 400 },
        );
      }

      price = calculatedPrice;
    }

    // Generate unique order ID
    const orderId = generateOrderId("SUB");

    // Create transaction record in database
    const transaction = await prisma.transaction.create({
      data: {
        // Store Midtrans order id in paymentGatewayId, keep internal id auto-generated
        paymentGatewayId: orderId,
        userId: user.id,
        tenantId: user.tenantId,
        subscriptionPlanId: planId,
        amount: price,
        currency: "IDR",
        billingCycle,
        status: "PENDING",
        paymentMethod: "MIDTRANS",
        metadata: upgradeOption
          ? {
              upgradeOption: upgradeOption,
              originalPlanPrice: plan.price,
              customAmount: customAmount || null,
              isProrated:
                upgradeOption === "immediate" &&
                customAmount &&
                customAmount !== plan.price,
            }
          : undefined,
        createdAt: new Date(),
      },
    });

    // Determine origin (current subdomain) for callbacks, fallback to NEXTAUTH_URL
    const origin = request.nextUrl.origin || process.env.NEXTAUTH_URL || "";

    // Prepare Midtrans parameters
    const midtransParams: MidtransParameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: formatPriceForMidtrans(Number(price)),
      },
      customer_details: {
        first_name: user.name?.split(" ")[0] || "Customer",
        last_name: user.name?.split(" ").slice(1).join(" ") || "",
        email: user.email || "",
      },
      item_details: [
        {
          id: planId,
          price: formatPriceForMidtrans(Number(price)),
          quantity: 1,
          name: `${plan.name} - ${
            isYearly ? "Yearly" : "Monthly"
          } Subscription`,
          category: "subscription",
        },
      ],
      credit_card: {
        secure: true,
      },
      callbacks: {
        finish: `${origin}/checkout/success?order_id=${orderId}`,
        error: `${origin}/checkout/error?order_id=${orderId}`,
        pending: `${origin}/checkout/pending?order_id=${orderId}`,
      },
      expiry: {
        start_time: formatMidtransStartTime(new Date()),
        unit: "minute",
        duration: 30,
      },
      custom_field1: user.tenantId,
      custom_field2: planId,
      custom_field3: billingCycle,
    };

    // Create Snap token
    const snapToken = await createSnapToken(midtransParams);

    return NextResponse.json({
      snapToken,
      orderId,
      amount: Number(price),
      planName: plan.name,
      billingCycle,
    });
  } catch (error) {
    console.error("Error creating checkout token:", error);
    return NextResponse.json(
      { error: "Failed to create checkout token" },
      { status: 500 },
    );
  }
}
