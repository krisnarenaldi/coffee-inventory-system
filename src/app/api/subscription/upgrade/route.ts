import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';

// POST /api/subscription/upgrade - Upgrade subscription plan
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admins can upgrade subscription
    if (!['ADMIN', 'PLATFORM_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { planId } = body;

    if (!planId) {
      return NextResponse.json(
        { error: 'Plan ID is required' },
        { status: 400 }
      );
    }

    // Verify the new plan exists and is active
    const newPlan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId }
    });

    if (!newPlan || !newPlan.isActive) {
      return NextResponse.json(
        { error: 'Invalid or inactive subscription plan' },
        { status: 400 }
      );
    }

    // Get current subscription
    const currentSubscription = await prisma.subscription.findUnique({
      where: {
        tenantId: session.user.tenantId
      },
      include: {
        plan: true
      }
    });

    if (!currentSubscription) {
      return NextResponse.json(
        { error: 'No current subscription found' },
        { status: 404 }
      );
    }

    // Check if it's actually an upgrade (higher price)
    const isUpgrade = newPlan.price > currentSubscription.plan.price;
    const isDowngrade = newPlan.price < currentSubscription.plan.price;
    const isSamePlan = planId === currentSubscription.planId;

    if (isSamePlan) {
      return NextResponse.json(
        { error: 'Already subscribed to this plan' },
        { status: 400 }
      );
    }

    // For demo purposes, we'll simulate immediate plan change
    // In production, this would integrate with Stripe or another payment processor
    const updatedSubscription = await prisma.subscription.update({
      where: {
        tenantId: session.user.tenantId
      },
      data: {
        planId: newPlan.id,
        status: 'ACTIVE',
        cancelAtPeriodEnd: false,
        // For upgrades, extend the current period
        // For downgrades, apply at next billing cycle
        currentPeriodEnd: isUpgrade 
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Extend 30 days for upgrade
          : currentSubscription.currentPeriodEnd, // Keep current end date for downgrade
        updatedAt: new Date()
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
            features: true
          }
        }
      }
    });

    // Log the subscription change for audit purposes
    console.log(`Subscription ${isUpgrade ? 'upgraded' : 'changed'} for tenant ${session.user.tenantId} from ${currentSubscription.plan.name} to ${newPlan.name}`);

    return NextResponse.json({
      message: `Subscription ${isUpgrade ? 'upgraded' : isDowngrade ? 'downgraded' : 'changed'} successfully`,
      subscription: updatedSubscription,
      changeType: isUpgrade ? 'upgrade' : isDowngrade ? 'downgrade' : 'change'
    });
  } catch (error) {
    console.error('Error upgrading subscription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}