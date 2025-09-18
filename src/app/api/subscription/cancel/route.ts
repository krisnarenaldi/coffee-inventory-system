import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';

// POST /api/subscription/cancel - Cancel subscription at period end
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admins can cancel subscription
    if (!['ADMIN', 'PLATFORM_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
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
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    if (currentSubscription.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Subscription is already cancelled' },
        { status: 400 }
      );
    }

    if (currentSubscription.cancelAtPeriodEnd) {
      return NextResponse.json(
        { error: 'Subscription is already set to cancel at period end' },
        { status: 400 }
      );
    }

    // Mark subscription to cancel at period end
    const updatedSubscription = await prisma.subscription.update({
      where: {
        tenantId: session.user.tenantId
      },
      data: {
        cancelAtPeriodEnd: true,
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

    // Log the cancellation for audit purposes
    console.log(`Subscription cancellation scheduled for tenant ${session.user.tenantId} at period end: ${currentSubscription.currentPeriodEnd}`);

    // In a real implementation, you would also:
    // 1. Cancel the subscription in Stripe
    // 2. Send confirmation email to the user
    // 3. Schedule a job to downgrade features at period end

    return NextResponse.json({
      message: 'Subscription will be cancelled at the end of your current billing period',
      subscription: updatedSubscription,
      cancellationDate: currentSubscription.currentPeriodEnd
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/subscription/cancel - Reactivate cancelled subscription
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admins can reactivate subscription
    if (!['ADMIN', 'PLATFORM_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Get current subscription
    const currentSubscription = await prisma.subscription.findUnique({
      where: {
        tenantId: session.user.tenantId
      }
    });

    if (!currentSubscription) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      );
    }

    if (!currentSubscription.cancelAtPeriodEnd) {
      return NextResponse.json(
        { error: 'Subscription is not set to cancel' },
        { status: 400 }
      );
    }

    // Remove cancellation flag
    const updatedSubscription = await prisma.subscription.update({
      where: {
        tenantId: session.user.tenantId
      },
      data: {
        cancelAtPeriodEnd: false,
        status: 'ACTIVE',
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

    // Log the reactivation for audit purposes
    console.log(`Subscription reactivated for tenant ${session.user.tenantId}`);

    return NextResponse.json({
      message: 'Subscription has been reactivated',
      subscription: updatedSubscription
    });
  } catch (error) {
    console.error('Error reactivating subscription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}