import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';
import { computeNextPeriodEnd } from '../../../../../lib/subscription-periods';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's current subscription
    const subscription = await prisma.subscription.findFirst({
      where: {
        tenantId: session.user.tenantId,
      },
      include: {
        plan: true,
      },
    });

    if (!subscription) {
      return NextResponse.json({ hasPendingCheckout: false });
    }

    // If subscription is marked as PENDING_CHECKOUT, attempt quick reconciliation
    // in case payment has already completed (e.g., webhook succeeded but UI state is stale).
    if ((subscription as any).status === 'PENDING_CHECKOUT') {
      // Find the most recent PAID transaction for this tenant
      const paidTransaction = await prisma.transaction.findFirst({
        where: {
          tenantId: session.user.tenantId,
          status: 'PAID' as any,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (paidTransaction) {
        // Activate subscription based on the paid transaction
        const startDate = new Date();
        // Fetch plan interval to compute calendar-aware end date
        const plan = await prisma.subscriptionPlan.findUnique({
          where: { id: paidTransaction.subscriptionPlanId as any },
        });
        const interval = plan?.interval || 'MONTHLY';
        const endDate = computeNextPeriodEnd(startDate, interval as any);

        await prisma.subscription.update({
          where: { id: (subscription as any).id },
          data: {
            planId: paidTransaction.subscriptionPlanId,
            currentPeriodStart: startDate,
          currentPeriodEnd: endDate,
          status: 'ACTIVE' as any,
          intendedPlan: null,
          cancelAtPeriodEnd: false,
            stripeCustomerId: null,
            stripeSubscriptionId: null,
            updatedAt: new Date(),
          },
        });

        return NextResponse.json({
          hasPendingCheckout: false,
          intendedPlan: null,
        });
      }
    }

    // Check if user still has pending checkout (PENDING_CHECKOUT status with intended plan)
    const hasPendingCheckout =
      (subscription as any).status === 'PENDING_CHECKOUT' &&
      (subscription as any).intendedPlan &&
      (subscription as any).intendedPlan !== 'free';

    return NextResponse.json({
      hasPendingCheckout,
      intendedPlan: (subscription as any).intendedPlan,
    });

  } catch (error) {
    console.error('Error checking pending checkout:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}