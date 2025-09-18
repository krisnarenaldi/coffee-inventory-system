import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';

// GET /api/admin/subscription-plans - Get all subscription plans
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'PLATFORM_ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Platform admin access required' },
        { status: 403 }
      );
    }

    const plans = await prisma.subscriptionPlan.findMany({
      orderBy: { price: 'asc' },
      include: {
        _count: {
          select: {
            subscriptions: true
          }
        }
      }
    });

    // Convert Decimal price to number for frontend compatibility
    const plansWithNumberPrice = plans.map(plan => ({
      ...plan,
      price: Number(plan.price)
    }));

    return NextResponse.json(plansWithNumberPrice);
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/subscription-plans - Create new subscription plan
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !['PLATFORM_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized - Platform admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, price, interval, features, maxUsers, maxIngredients, maxBatches, maxStorageLocations, maxRecipes, maxProducts, isActive } = body;

    // Validate required fields
    if (!name || !description || price === undefined || !interval) {
      return NextResponse.json(
        { error: 'Missing required fields: name, description, price, interval' },
        { status: 400 }
      );
    }

    // Validate interval
    if (!['MONTHLY', 'YEARLY'].includes(interval)) {
      return NextResponse.json(
        { error: 'Invalid interval. Must be MONTHLY or YEARLY' },
        { status: 400 }
      );
    }

    // Validate price is a positive number
    if (typeof price !== 'number' || price < 0) {
      return NextResponse.json(
        { error: 'Price must be a positive number' },
        { status: 400 }
      );
    }

    // Check if plan name already exists
    const existingPlan = await prisma.subscriptionPlan.findFirst({
      where: { name }
    });

    if (existingPlan) {
      return NextResponse.json(
        { error: 'Plan name already exists' },
        { status: 409 }
      );
    }

    const plan = await prisma.subscriptionPlan.create({
      data: {
        name,
        description,
        price,
        interval,
        features: features || [],
        maxUsers: maxUsers || null,
        maxIngredients: maxIngredients || null,
        maxBatches: maxBatches || null,
        maxStorageLocations: maxStorageLocations || null,
        maxRecipes: maxRecipes || null,
        maxProducts: maxProducts || null,
        isActive: isActive !== undefined ? isActive : true
      }
    });

    return NextResponse.json({
      message: 'Subscription plan created successfully',
      plan
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating subscription plan:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}