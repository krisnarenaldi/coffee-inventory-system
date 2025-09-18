import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';
import { checkFeatureAccess } from '../../../../../lib/subscription-limits';

// GET /api/reports/simple - Get basic reports for starter plan users
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

    // Check if user has access to basic reports
    const hasBasicReports = await checkFeatureAccess(tenantId, 'basicReports');
    if (!hasBasicReports) {
      return NextResponse.json(
        { error: 'Feature not available in your plan' },
        { status: 403 }
      );
    }

    // Get inventory data
    const ingredients = await prisma.ingredient.findMany({
      where: { tenantId, isActive: true },
      select: {
        name: true,
        stockQuantity: true,
        costPerUnit: true,
        minimumThreshold: true,
        unitOfMeasure: true
      }
    });

    const totalItems = ingredients.length;
    const totalValue = ingredients.reduce((sum, ingredient) => {
      return sum + (Number(ingredient.stockQuantity) * Number(ingredient.costPerUnit));
    }, 0);

    // Get low stock items
    const lowStockItems = ingredients
      .filter(ingredient => Number(ingredient.stockQuantity) <= Number(ingredient.minimumThreshold))
      .map(ingredient => ({
        name: ingredient.name,
        stockQuantity: Number(ingredient.stockQuantity),
        minimumThreshold: Number(ingredient.minimumThreshold),
        unitOfMeasure: ingredient.unitOfMeasure
      }));

    // Get top value items
    const topValueItems = ingredients
      .map(ingredient => ({
        name: ingredient.name,
        totalValue: Number(ingredient.stockQuantity) * Number(ingredient.costPerUnit),
        stockQuantity: Number(ingredient.stockQuantity),
        unitOfMeasure: ingredient.unitOfMeasure
      }))
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 10);

    // Get production data
    const [totalBatches, completedBatches] = await Promise.all([
      prisma.batch.count({
        where: { tenantId }
      }),
      prisma.batch.count({
        where: { 
          tenantId,
          status: 'COMPLETED'
        }
      })
    ]);

    // Get average yield from completed batches
    const completedBatchesWithYield = await prisma.batch.findMany({
      where: {
        tenantId,
        status: 'COMPLETED',
        actualYield: { not: null }
      },
      select: {
        actualYield: true
      }
    });

    const averageYield = completedBatchesWithYield.length > 0
      ? completedBatchesWithYield.reduce((sum, batch) => sum + Number(batch.actualYield), 0) / completedBatchesWithYield.length
      : 0;

    // Get recent batches
    const recentBatches = await prisma.batch.findMany({
      where: { tenantId },
      include: {
        recipe: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    const recentBatchesFormatted = recentBatches.map(batch => ({
      id: batch.id,
      recipeName: batch.recipe?.name || 'Unknown Recipe',
      status: batch.status,
      createdAt: batch.createdAt.toISOString(),
      actualYield: batch.actualYield ? Number(batch.actualYield) : undefined
    }));

    const reportsData = {
      inventory: {
        totalItems,
        totalValue,
        lowStockItems,
        topValueItems
      },
      production: {
        totalBatches,
        completedBatches,
        averageYield,
        recentBatches: recentBatchesFormatted
      }
    };

    return NextResponse.json(reportsData);
  } catch (error) {
    console.error('Error fetching simple reports:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}