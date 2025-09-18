import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import { getSubscriptionLimits, checkUserLimit, checkIngredientLimit, checkBatchLimit } from '../../../../../lib/subscription-limits';

// GET /api/subscription/limits - Get subscription limits and current usage
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || !session?.user?.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const tenantId = session.user.tenantId;

    // Get subscription limits (returns default limits if no active subscription)
    const limits = await getSubscriptionLimits(tenantId);
    
    if (!limits) {
      return NextResponse.json(
        { error: 'Unable to fetch subscription limits' },
        { status: 500 }
      );
    }

    // Get current usage for each resource
    const [userCheck, ingredientCheck, batchCheck] = await Promise.all([
      checkUserLimit(tenantId),
      checkIngredientLimit(tenantId),
      checkBatchLimit(tenantId)
    ]);

    return NextResponse.json({
      limits,
      usage: {
        users: userCheck,
        ingredients: ingredientCheck,
        batches: batchCheck
      }
    });
  } catch (error) {
    console.error('Error fetching subscription limits:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}