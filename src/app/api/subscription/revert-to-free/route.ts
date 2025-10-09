import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Find the current subscription and the free plan
    const [subscription, freePlan] = await Promise.all([
      prisma.subscription.findUnique({
        where: { tenantId: session.user.tenantId },
      }),
      prisma.subscriptionPlan.findFirst({
        where: { name: 'Free' },
      }),
    ]);

    if (!freePlan) {
      return NextResponse.json(
        { error: 'Free plan not found' },
        { status: 404 }
      );
    }

    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    // If user is still in pending checkout
    if ((subscription as any).status === 'PENDING_CHECKOUT') {
      const isCurrentlyOnFreePlan = (subscription as any).planId === (freePlan as any).id;

      if (isCurrentlyOnFreePlan) {
        // For users who were on Free during checkout, ensure non-expiring access
        await prisma.subscription.update({
          where: { tenantId: session.user.tenantId },
          data: {
            planId: freePlan.id,
            currentPeriodEnd: null as any,
          },
        });
      } else {
        // For paid users (e.g., Starter), do NOT downgrade.
        // Keep their existing plan and period; just refresh status metadata.
        await prisma.subscription.update({
          where: { tenantId: session.user.tenantId },
          data: {
            status: 'PENDING_CHECKOUT' as any,
            updatedAt: new Date(),
          },
        });
      }
    } else {
      // Otherwise fully revert to free plan
      await prisma.subscription.update({
        where: { tenantId: session.user.tenantId },
        data: {
          planId: freePlan.id,
          status: 'ACTIVE',
          currentPeriodEnd: null as any, // Forever access for free plan
          intendedPlan: 'free',
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reverting to free plan:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}