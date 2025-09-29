import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user and tenant information
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { tenant: true }
    });

    if (!user || !user.tenant) {
      return NextResponse.json({ error: 'User or tenant not found' }, { status: 404 });
    }

    // Get the current subscription for the tenant
    const subscription = await prisma.subscription.findFirst({
      where: { 
        tenantId: user.tenantId,
        status: 'ACTIVE'
      },
      include: { 
        plan: true 
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!subscription) {
      return NextResponse.json({ 
        subscription: null,
        message: 'No active subscription found'
      });
    }

    // Get usage data for the tenant
    const usageData = await prisma.usage.findMany({
      where: { 
        tenantId: user.tenantId,
        date: {
          gte: subscription.currentPeriodStart,
          lte: subscription.currentPeriodEnd
        }
      },
      orderBy: {
        date: 'desc'
      }
    });

    // Calculate current usage metrics
    const currentUsage = {
      users: await prisma.user.count({
        where: { tenantId: user.tenantId }
      }),
      products: await prisma.product.count({
        where: { tenantId: user.tenantId }
      }),
      locations: await prisma.storageLocation.count({
        where: { tenantId: user.tenantId }
      }),
      ingredients: await prisma.ingredient.count({
        where: { tenantId: user.tenantId }
      }),
      batches: await prisma.batch.count({
        where: { tenantId: user.tenantId }
      }),
      recipes: await prisma.recipe.count({
        where: { tenantId: user.tenantId }
      })
    };

    // Calculate days until expiry
    const now = new Date();
    const daysUntilExpiry = Math.ceil((subscription.currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return NextResponse.json({
      subscription: {
        id: subscription.id,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        daysUntilExpiry,
        plan: {
          id: subscription.plan.id,
          name: subscription.plan.name,
          description: subscription.plan.description,
          price: Number(subscription.plan.price),
          interval: subscription.plan.interval,
          maxUsers: subscription.plan.maxUsers,
          maxProducts: subscription.plan.maxProducts,
          maxStorageLocations: subscription.plan.maxStorageLocations,
          maxIngredients: subscription.plan.maxIngredients,
          maxBatches: subscription.plan.maxBatches,
          maxRecipes: subscription.plan.maxRecipes,
          features: subscription.plan.features,
          isActive: subscription.plan.isActive
        }
      },
      usage: currentUsage,
      usageHistory: usageData
    });

  } catch (error) {
    console.error('Get current subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to get subscription information' },
      { status: 500 }
    );
  }
}