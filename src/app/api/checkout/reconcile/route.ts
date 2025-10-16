import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { computeNextPeriodEnd } from '../../../../../lib/subscription-periods';
import { getTransactionStatus, mapTransactionStatus } from '../../../../../lib/midtrans';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const orderId = body.orderId as string | undefined;

    if (!orderId) {
      return NextResponse.json(
        { error: 'orderId is required' },
        { status: 400 }
      );
    }

    // Find transaction by paymentGatewayId (Midtrans order_id)
    const transaction = await prisma.transaction.findFirst({
      where: { paymentGatewayId: orderId },
      include: {
        tenant: true,
        subscriptionPlan: true,
      },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found for given orderId' },
        { status: 404 }
      );
    }

    // Query Midtrans for current status
    const midtransStatus = await getTransactionStatus(orderId);
    const newStatus = mapTransactionStatus(midtransStatus.transaction_status);

    // Update transaction record with reconciled status
    const updatedTx = await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: newStatus,
        metadata: {
          ...(transaction.metadata as any),
          midtrans_status: midtransStatus,
          reconciled_at: new Date().toISOString(),
        },
      },
    });

    // If paid, activate or update subscription to the intended plan
    if (newStatus === 'PAID') {
      const startDate = new Date();
      const interval =
        transaction.billingCycle &&
        String(transaction.billingCycle).toLowerCase() === 'yearly'
          ? 'YEARLY'
          : transaction.subscriptionPlan?.interval || 'MONTHLY';
      const endDate = computeNextPeriodEnd(startDate, interval);

      const existingSubscription = await prisma.subscription.findFirst({
        where: { tenantId: transaction.tenantId },
      });

      if (existingSubscription) {
        await prisma.subscription.update({
          where: { id: existingSubscription.id },
          data: {
            planId: transaction.subscriptionPlanId,
            currentPeriodStart: startDate,
            currentPeriodEnd: endDate,
            status: 'ACTIVE',
            intendedPlan: null,
            cancelAtPeriodEnd: false,
            stripeCustomerId: null,
            stripeSubscriptionId: null,
            updatedAt: new Date(),
          } as any,
        });
      } else {
        await prisma.subscription.create({
          data: {
            tenantId: transaction.tenantId,
            planId: transaction.subscriptionPlanId,
            currentPeriodStart: startDate,
            currentPeriodEnd: endDate,
            status: 'ACTIVE',
            intendedPlan: null,
            stripeCustomerId: null,
            stripeSubscriptionId: null,
            cancelAtPeriodEnd: false,
          },
        });
      }
    }

    return NextResponse.json({
      ok: true,
      orderId,
      transactionId: transaction.id,
      status: updatedTx.status,
      midtrans: {
        transaction_status: midtransStatus.transaction_status,
        status_code: midtransStatus.status_code,
        payment_type: midtransStatus.payment_type,
      },
    });
  } catch (error) {
    console.error('Checkout reconcile error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}