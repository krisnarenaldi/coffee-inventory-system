import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "../../../../../lib/prisma";
import { computeNextPeriodEnd } from "../../../../../lib/subscription-periods";
import {
  verifySignature,
  mapTransactionStatus,
} from "../../../../../lib/midtrans";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();

    // Parse the webhook payload
    const notification = JSON.parse(body);

    // Verify webhook signature
    const isValid = verifySignature(notification);
    if (!isValid) {
      console.error("Invalid webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    console.log("Midtrans webhook received:", {
      order_id: notification.order_id,
      transaction_status: notification.transaction_status,
      payment_type: notification.payment_type,
      gross_amount: notification.gross_amount,
    });

    // Extract order ID and find the transaction
    const orderId = notification.order_id;
    const transaction = await prisma.transaction.findFirst({
      where: { paymentGatewayId: orderId },
      include: {
        user: true,
        tenant: true,
        subscriptionPlan: true,
      },
    });

    if (!transaction) {
      console.error("Transaction not found for order ID:", orderId);
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    // Map Midtrans status to our transaction status
    const newStatus = mapTransactionStatus(notification.transaction_status);

    // If payment is successful, handle the upgrade logic first
    if (newStatus === "PAID") {
      // Check if this should be scheduled instead of immediate
      const upgradeOption = transaction.metadata?.upgradeOption;

      // Add detailed logging for debugging
      console.log(`🔍 Webhook processing transaction ${transaction.id}`);
      console.log(
        `🔍 Transaction metadata:`,
        JSON.stringify(transaction.metadata, null, 2)
      );
      console.log(`🔍 Upgrade option: "${upgradeOption}"`);
      console.log(`🔍 Upgrade option type: ${typeof upgradeOption}`);

      if (upgradeOption === "end_of_period") {
        // For end of period upgrades, mark as SCHEDULED instead of PAID
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            status: "SCHEDULED",
            metadata: {
              ...(transaction.metadata as any),
              midtrans_notification: notification,
              scheduledActivationHandled: false,
              updated_at: new Date().toISOString(),
            },
          },
        });

        console.log(
          `✅ Transaction ${transaction.id} marked as SCHEDULED for end-of-period upgrade`
        );
      } else {
        // For immediate upgrades, update to PAID and activate
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            status: newStatus,
            metadata: {
              ...(transaction.metadata as any),
              midtrans_notification: notification,
              updated_at: new Date().toISOString(),
            },
          },
        });

        await handleSuccessfulPayment(transaction, notification);
      }
    } else if (newStatus === "FAILED" || newStatus === "CANCELLED") {
      // Update transaction status for failed payments
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: newStatus,
          metadata: {
            ...(transaction.metadata as any),
            midtrans_notification: notification,
            updated_at: new Date().toISOString(),
          },
        },
      });

      await handleFailedPayment(transaction, notification);
    } else {
      // For other statuses (PENDING, etc.), just update the transaction
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: newStatus,
          metadata: {
            ...(transaction.metadata as any),
            midtrans_notification: notification,
            updated_at: new Date().toISOString(),
          },
        },
      });
    }

    return NextResponse.json({ status: "success" });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function handleSuccessfulPayment(transaction: any, notification: any) {
  try {
    // This function now only handles immediate upgrades
    // End-of-period upgrades are handled in the main webhook logic

    // For immediate upgrades, activate now
    const startDate = new Date();
    const interval = transaction.subscriptionPlan?.interval || "MONTHLY";
    const endDate = computeNextPeriodEnd(startDate, interval);

    // Check if user has a subscription with PENDING_CHECKOUT status
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        tenantId: transaction.tenantId,
      },
    });

    if (existingSubscription) {
      // Update existing subscription - activate the intended plan
      await prisma.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          planId: transaction.subscriptionPlanId,
          currentPeriodStart: startDate,
          currentPeriodEnd: endDate,
          status: "ACTIVE",
          intendedPlan: null,
          cancelAtPeriodEnd: false,
          stripeCustomerId: null, // Clear Stripe data since we're using Midtrans
          stripeSubscriptionId: null,
          updatedAt: new Date(),
        } as any,
      });
    } else {
      // Create new subscription (fallback case)
      await prisma.subscription.create({
        data: {
          tenantId: transaction.tenantId,
          planId: transaction.subscriptionPlanId,
          currentPeriodStart: startDate,
          currentPeriodEnd: endDate,
          status: "ACTIVE",
          intendedPlan: null,
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          cancelAtPeriodEnd: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any,
      });
    }

    // Create usage tracking entries for the tenant
    const currentDate = new Date();
    const metrics = ["users", "ingredients", "products", "batches", "recipes"];

    for (const metric of metrics) {
      await prisma.usage.upsert({
        where: {
          tenantId_metric_date: {
            tenantId: transaction.tenantId,
            metric: metric,
            date: currentDate,
          },
        },
        update: {
          value: 0,
        },
        create: {
          tenantId: transaction.tenantId,
          metric: metric,
          value: 0,
          date: currentDate,
        },
      });
    }

    console.log(
      "Subscription activated successfully for tenant:",
      transaction.tenantId
    );
  } catch (error) {
    console.error("Error handling successful payment:", error);
    throw error;
  }
}

async function handleFailedPayment(transaction: any, notification: any) {
  try {
    console.log("Payment failed for transaction:", transaction.id);

    // You might want to send notification emails here
    // or perform other cleanup actions

    // For now, just log the failure
    console.log("Failed payment details:", {
      orderId: notification.order_id,
      transactionStatus: notification.transaction_status,
      userId: transaction.userId,
      tenantId: transaction.tenantId,
      amount: transaction.amount,
    });
  } catch (error) {
    console.error("Error handling failed payment:", error);
    throw error;
  }
}

// Handle other HTTP methods
export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
