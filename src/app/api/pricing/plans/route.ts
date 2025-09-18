import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';

// GET /api/pricing/plans - Get available subscription plans for pricing page (public)
export async function GET(request: NextRequest) {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        interval: true,
        maxUsers: true,
        maxIngredients: true,
        maxBatches: true,
        maxStorageLocations: true,
        maxRecipes: true,
        maxProducts: true,
        features: true
      },
      orderBy: {
        price: 'asc'
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