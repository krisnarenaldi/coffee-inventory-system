import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../../lib/auth';
import { prisma } from '../../../../../../lib/prisma';

// GET /api/admin/analytics/overview - Get platform analytics overview
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'PLATFORM_ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get current date ranges
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Fetch all required data in parallel
    const [
      allTenants,
      activeTenants,
      allUsers,
      allIngredients,
      allBatches,
      allSubscriptions,
      recentTenants,
      oldTenants
    ] = await Promise.all([
      // All tenants
      prisma.tenant.findMany({
        select: {
          id: true,
          status: true,
          createdAt: true
        }
      }),
      
      // Active tenants
      prisma.tenant.findMany({
        where: {
          status: 'ACTIVE'
        },
        select: {
          id: true,
          createdAt: true
        }
      }),
      
      // All users
      prisma.user.findMany({
        where: {
          isActive: true
        },
        select: {
          tenantId: true
        }
      }),
      
      // All ingredients
      prisma.ingredient.findMany({
        where: {
          isActive: true
        },
        select: {
          tenantId: true
        }
      }),
      
      // All batches
      prisma.batch.findMany({
        select: {
          tenantId: true
        }
      }),
      
      // All subscriptions with plans
      prisma.subscription.findMany({
        include: {
          plan: {
            select: {
              price: true,
              name: true
            }
          },
          tenant: {
            select: {
              name: true,
              status: true
            }
          }
        }
      }),
      
      // Recent tenants (last month)
      prisma.tenant.findMany({
        where: {
          createdAt: {
            gte: lastMonth
          }
        }
      }),
      
      // Older tenants for churn calculation
      prisma.tenant.findMany({
        where: {
          createdAt: {
            lt: lastMonth
          }
        }
      })
    ]);

    // Calculate tenant metrics
    const totalTenants = allTenants.length;
    const activeTenantsCount = activeTenants.length;
    const inactiveTenants = allTenants.filter(t => t.status !== 'ACTIVE').length;
    const churnRate = totalTenants > 0 ? Math.round((inactiveTenants / totalTenants) * 100 * 100) / 100 : 0;
    
    // Calculate average tenant lifetime (simplified)
    const averageLifetime = Math.round(
      allTenants.reduce((sum, tenant) => {
        const months = Math.max(1, Math.floor((now.getTime() - tenant.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30)));
        return sum + months;
      }, 0) / totalTenants
    );

    // Calculate usage metrics
    const totalUsers = allUsers.length;
    const totalIngredients = allIngredients.length;
    const totalBatches = allBatches.length;
    
    const averageUsagePerTenant = {
      users: activeTenantsCount > 0 ? Math.round(totalUsers / activeTenantsCount) : 0,
      ingredients: activeTenantsCount > 0 ? Math.round(totalIngredients / activeTenantsCount) : 0,
      batches: activeTenantsCount > 0 ? Math.round(totalBatches / activeTenantsCount) : 0
    };

    // Calculate revenue metrics
    const activeSubscriptions = allSubscriptions.filter(sub => sub.status === 'ACTIVE');
    const monthlyRecurringRevenue = activeSubscriptions.reduce((total, sub) => {
      return total + (sub.plan.price ? Number(sub.plan.price) : 0);
    }, 0);
    
    const totalRevenue = allSubscriptions.reduce((total, sub) => {
      const price = sub.plan.price ? Number(sub.plan.price) : 0;
      const months = sub.status === 'ACTIVE' ? 12 : 6; // Simplified estimate
      return total + (price * months);
    }, 0);
    
    const averageRevenuePerUser = totalUsers > 0 ? Math.round((monthlyRecurringRevenue / totalUsers) * 100) / 100 : 0;
    
    // Calculate growth rate (simplified)
    const revenueGrowthRate = Math.round(Math.random() * 20 + 5); // Mock data: 5-25% growth

    // Calculate feature usage (mock data for demo)
    const featureUsage = [
      {
        feature: 'Advanced Analytics',
        usageCount: Math.floor(totalUsers * 0.3),
        tenantCount: Math.floor(activeTenantsCount * 0.4),
        adoptionRate: 40
      },
      {
        feature: 'Custom Reports',
        usageCount: Math.floor(totalUsers * 0.2),
        tenantCount: Math.floor(activeTenantsCount * 0.25),
        adoptionRate: 25
      },
      {
        feature: 'API Access',
        usageCount: Math.floor(totalUsers * 0.15),
        tenantCount: Math.floor(activeTenantsCount * 0.2),
        adoptionRate: 20
      },
      {
        feature: 'Bulk Operations',
        usageCount: Math.floor(totalUsers * 0.4),
        tenantCount: Math.floor(activeTenantsCount * 0.6),
        adoptionRate: 60
      },
      {
        feature: 'Multi-location',
        usageCount: Math.floor(totalUsers * 0.1),
        tenantCount: Math.floor(activeTenantsCount * 0.15),
        adoptionRate: 15
      },
      {
        feature: 'Priority Support',
        usageCount: Math.floor(totalUsers * 0.25),
        tenantCount: Math.floor(activeTenantsCount * 0.35),
        adoptionRate: 35
      }
    ];

    // Get top tenants by revenue
    const topTenants = activeSubscriptions
      .map(sub => ({
        id: sub.tenantId,
        name: sub.tenant.name,
        users: allUsers.filter(u => u.tenantId === sub.tenantId).length,
        revenue: sub.plan.price ? Number(sub.plan.price) : 0,
        planName: sub.plan.name,
        status: sub.tenant.status
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const analytics = {
      tenantMetrics: {
        totalTenants,
        activeTenants: activeTenantsCount,
        churnRate,
        averageLifetime
      },
      usageMetrics: {
        totalUsers,
        totalIngredients,
        totalBatches,
        averageUsagePerTenant
      },
      revenueMetrics: {
        totalRevenue,
        monthlyRecurringRevenue,
        averageRevenuePerUser,
        revenueGrowthRate
      },
      featureUsage,
      topTenants
    };

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics overview:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}