import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';

// GET /api/subscription/usage - Get current tenant's usage statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const tenantId = session.user.tenantId;

    // Get current usage counts
    const [userCount, ingredientCount, batchCount] = await Promise.all([
      prisma.user.count({
        where: {
          tenantId,
          isActive: true
        }
      }),
      prisma.ingredient.count({
        where: {
          tenantId,
          isActive: true
        }
      }),
      prisma.batch.count({
        where: {
          tenantId
        }
      })
    ]);

    // Note: Avoid writing on GET to prevent FK errors when tenant records are missing.
    // Historical tracking should be handled by a scheduled job or explicit POST.

    const usage = {
      users: userCount,
      ingredients: ingredientCount,
      batches: batchCount,
      lastUpdated: new Date().toISOString()
    };

    return NextResponse.json(usage);
  } catch (error) {
    console.error('Error fetching usage statistics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/subscription/usage - Manually record usage metric
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { metric, value, date } = body;

    if (!metric || value === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: metric, value' },
        { status: 400 }
      );
    }

    const validMetrics = ['users', 'ingredients', 'batches', 'storage', 'api_calls'];
    if (!validMetrics.includes(metric)) {
      return NextResponse.json(
        { error: `Invalid metric. Must be one of: ${validMetrics.join(', ')}` },
        { status: 400 }
      );
    }

    const usageDate = date ? new Date(date) : new Date();
    usageDate.setHours(0, 0, 0, 0);

    const usage = await prisma.usage.create({
      data: {
        tenantId: session.user.tenantId,
        metric,
        value: parseInt(value),
        date: usageDate
      }
    });

    return NextResponse.json({
      message: 'Usage recorded successfully',
      usage
    }, { status: 201 });
  } catch (error) {
    console.error('Error recording usage:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}