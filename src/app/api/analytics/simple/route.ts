import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';
import { checkFeatureAccess } from '../../../../../lib/subscription-limits';

// GET /api/analytics/simple - Get basic analytics for starter plan users
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

    // Check if user has access to basic analytics
    const hasBasicReports = await checkFeatureAccess(tenantId, 'basicReports');
    if (!hasBasicReports) {
      return NextResponse.json(
        { error: 'Feature not available in your plan' },
        { status: 403 }
      );
    }

    // Get basic overview data
    const [totalIngredients, totalProducts, totalBatches, activeBatches] = await Promise.all([
      prisma.ingredient.count({
        where: { tenantId, isActive: true }
      }),
      prisma.product.count({
        where: { tenantId }
      }),
      prisma.batch.count({
        where: { tenantId }
      }),
      prisma.batch.count({
        where: { 
          tenantId,
          status: { in: ['ROASTING', 'COOLING', 'PACKAGING'] }
        }
      })
    ]);

    // Get basic inventory data
    const ingredients = await prisma.ingredient.findMany({
      where: { tenantId, isActive: true },
      select: {
        stockQuantity: true,
        costPerUnit: true,
        minimumThreshold: true
      }
    });

    const totalValue = ingredients.reduce((sum, ingredient) => {
      return sum + (Number(ingredient.stockQuantity) * Number(ingredient.costPerUnit));
    }, 0);

    const lowStockCount = ingredients.filter(ingredient => 
      Number(ingredient.stockQuantity) <= Number(ingredient.minimumThreshold)
    ).length;

    // Get basic production data (current and previous month)
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const [thisMonthBatches, lastMonthBatches] = await Promise.all([
      prisma.batch.count({
        where: {
          tenantId,
          createdAt: {
            gte: currentMonthStart
          }
        }
      }),
      prisma.batch.count({
        where: {
          tenantId,
          createdAt: {
            gte: previousMonthStart,
            lte: previousMonthEnd
          }
        }
      })
    ]);

    const analyticsData = {
      overview: {
        totalIngredients,
        totalProducts,
        totalBatches,
        activeBatches
      },
      inventory: {
        totalValue,
        lowStockCount
      },
      production: {
        thisMonth: thisMonthBatches,
        lastMonth: lastMonthBatches
      }
    };

    return NextResponse.json(analyticsData);
  } catch (error) {
    console.error('Error fetching simple analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}