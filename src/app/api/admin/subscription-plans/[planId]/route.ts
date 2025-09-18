import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../../lib/auth';
import { prisma } from '../../../../../../lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';

// GET /api/admin/subscription-plans/[planId] - Get specific subscription plan
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'PLATFORM_ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Platform admin access required' },
        { status: 403 }
      );
    }

    const { planId } = await params;
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
      include: {
        _count: {
          select: {
            subscriptions: true
          }
        }
      }
    });

    if (!plan) {
      return NextResponse.json(
        { error: 'Subscription plan not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(plan);
  } catch (error) {
    console.error('Error fetching subscription plan:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/subscription-plans/[planId] - Update subscription plan
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'PLATFORM_ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Platform admin access required' },
        { status: 403 }
      );
    }

    const { planId } = await params;
    const body = await request.json();
    const { name, description, price, interval, features, maxUsers, maxIngredients, maxBatches, maxStorageLocations, maxRecipes, maxProducts, isActive } = body;

    // Check if plan exists
    const existingPlan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId }
    });

    if (!existingPlan) {
      return NextResponse.json(
        { error: 'Subscription plan not found' },
        { status: 404 }
      );
    }

    // Validate interval if provided
    if (interval && !['MONTHLY', 'YEARLY'].includes(interval)) {
      return NextResponse.json(
        { error: 'Invalid interval. Must be MONTHLY or YEARLY' },
        { status: 400 }
      );
    }

    // Validate price if provided
    if (price !== undefined && (typeof price !== 'number' || isNaN(price) || price < 0)) {
      return NextResponse.json(
        { error: 'Price must be a valid non-negative number' },
        { status: 400 }
      );
    }

    // Check if plan name already exists (if name is being changed)
    if (name && name !== existingPlan.name) {
      const nameExists = await prisma.subscriptionPlan.findFirst({
        where: { 
          name,
          id: { not: planId }
        }
      });

      if (nameExists) {
        return NextResponse.json(
          { error: 'Plan name already exists' },
          { status: 409 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = new Decimal(price);
    if (interval !== undefined) updateData.interval = interval;
    if (features !== undefined) updateData.features = features;
    if (maxUsers !== undefined) updateData.maxUsers = maxUsers;
    if (maxIngredients !== undefined) updateData.maxIngredients = maxIngredients;
    if (maxBatches !== undefined) updateData.maxBatches = maxBatches;
    if (maxStorageLocations !== undefined) updateData.maxStorageLocations = maxStorageLocations;
    if (maxRecipes !== undefined) updateData.maxRecipes = maxRecipes;
    if (maxProducts !== undefined) updateData.maxProducts = maxProducts;
    if (isActive !== undefined) updateData.isActive = isActive;
    updateData.updatedAt = new Date();

    const updatedPlan = await prisma.subscriptionPlan.update({
      where: { id: planId },
      data: updateData,
      include: {
        _count: {
          select: {
            subscriptions: true
          }
        }
      }
    });

    return NextResponse.json({
      message: 'Subscription plan updated successfully',
      plan: updatedPlan
    });

  } catch (error) {
    console.error('Error updating subscription plan:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/subscription-plans/[planId] - Delete subscription plan
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'PLATFORM_ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Platform admin access required' },
        { status: 403 }
      );
    }

    const { planId } = await params;
    // Check if plan exists
    const existingPlan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
      include: {
        _count: {
          select: {
            subscriptions: true
          }
        }
      }
    });

    if (!existingPlan) {
      return NextResponse.json(
        { error: 'Subscription plan not found' },
        { status: 404 }
      );
    }

    // Check if plan has active subscriptions
    if (existingPlan._count.subscriptions > 0) {
      return NextResponse.json(
        { 
          error: `Cannot delete plan with ${existingPlan._count.subscriptions} active subscription(s). Please migrate or cancel all subscriptions first.`,
          activeSubscriptions: existingPlan._count.subscriptions
        },
        { status: 400 }
      );
    }

    await prisma.subscriptionPlan.delete({
      where: { id: planId }
    });

    return NextResponse.json({
      message: 'Subscription plan deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting subscription plan:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}