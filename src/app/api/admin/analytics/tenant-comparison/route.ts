import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../../lib/auth';
import { prisma } from '../../../../../../lib/prisma';

// GET /api/admin/analytics/tenant-comparison - Get tenant comparison data
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'PLATFORM_ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get all active tenants with their subscriptions
    const tenants = await prisma.tenant.findMany({
      where: {
        status: 'ACTIVE'
      },
      include: {
        subscription: {
          include: {
            plan: {
              select: {
                name: true,
                price: true
              }
            }
          }
        },
        users: {
          where: {
            isActive: true
          },
          select: {
            id: true
          }
        }
      }
    });

    // Get usage data for all tenants
    const [ingredientsData, batchesData] = await Promise.all([
      prisma.ingredient.groupBy({
        by: ['tenantId'],
        where: {
          isActive: true
        },
        _count: {
          id: true
        }
      }),
      prisma.batch.groupBy({
        by: ['tenantId'],
        _count: {
          id: true
        }
      })
    ]);

    // Create lookup maps for efficient data access
    const ingredientsMap = new Map(
      ingredientsData.map((item: { tenantId: string; _count: { id: number } }) => [item.tenantId, item._count.id])
    );
    const batchesMap = new Map(
      batchesData.map((item: { tenantId: string; _count: { id: number } }) => [item.tenantId, item._count.id])
    );

    // Calculate comparison data for each tenant
    const tenantComparison = tenants.map((tenant: any) => {
      const users = tenant.users.length;
      const ingredients = ingredientsMap.get(tenant.id) || 0;
      const batches = batchesMap.get(tenant.id) || 0;
      const revenue = tenant.subscription?.plan.price ? Number(tenant.subscription.plan.price) : 0;
      const planName = tenant.subscription?.plan.name || 'No Plan';
      
      // Calculate efficiency score (simplified metric)
      // Based on batches per user and ingredients utilization
      let efficiency = 0;
      if (users > 0 && ingredients > 0) {
        const batchesPerUser = Number(batches) / Number(users);
        const ingredientUtilization = Math.min(Number(batches) / Number(ingredients), 1); // Cap at 1
        efficiency = Math.round((batchesPerUser * 20 + ingredientUtilization * 80) * 100) / 100;
      }
      
      return {
        tenantId: tenant.id,
        tenantName: tenant.name,
        users,
        ingredients,
        batches,
        revenue,
        planName,
        efficiency: Math.min(100, efficiency) // Cap at 100%
      };
    });

    return NextResponse.json(tenantComparison);
  } catch (error) {
    console.error('Error fetching tenant comparison data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}