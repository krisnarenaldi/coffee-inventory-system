import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';

// GET /api/subscription - Get current tenant's subscription
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    let subscription = await prisma.subscription.findUnique({
      where: {
        tenantId: session.user.tenantId
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

    if (!subscription) {
      // Initialize a free subscription if none exists for the tenant
      const freePlan = await prisma.subscriptionPlan.findFirst({
        where: { name: 'Free', isActive: true },
      });

      if (!freePlan) {
        return NextResponse.json(
          { error: 'Free plan not found' },
          { status: 404 }
        );
      }

      await prisma.subscription.create({
        data: {
          tenantId: session.user.tenantId,
          planId: freePlan.id,
          status: 'ACTIVE' as any,
          currentPeriodStart: new Date(),
          currentPeriodEnd: null as any,
          cancelAtPeriodEnd: false,
          intendedPlan: 'free',
        },
      });

      // Re-fetch with plan details included
      subscription = await prisma.subscription.findUnique({
        where: { tenantId: session.user.tenantId },
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
              features: true,
            },
          },
        },
      });
    }

    return NextResponse.json(subscription);
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/subscription - Update subscription settings
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admins can modify subscription
    if (!['ADMIN', 'PLATFORM_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { cancelAtPeriodEnd } = body;

    const subscription = await prisma.subscription.findUnique({
      where: {
        tenantId: session.user.tenantId
      }
    });

    if (!subscription) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      );
    }

    const updatedSubscription = await prisma.subscription.update({
      where: {
        tenantId: session.user.tenantId
      },
      data: {
        cancelAtPeriodEnd: cancelAtPeriodEnd !== undefined ? cancelAtPeriodEnd : subscription.cancelAtPeriodEnd
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

    return NextResponse.json({
      message: 'Subscription updated successfully',
      subscription: updatedSubscription
    });
  } catch (error) {
    console.error('Error updating subscription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}