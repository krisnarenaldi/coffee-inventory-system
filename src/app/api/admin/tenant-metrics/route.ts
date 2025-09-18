import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';

interface TenantMetrics {
  tenantId: string;
  tenantName: string;
  status: string;
  createdAt: string;
  subscription: {
    planName: string;
    status: string;
    price: number;
  };
  usage: {
    users: number;
    ingredients: number;
    batches: number;
    storage: number; // in MB
  };
  performance: {
    avgResponseTime: number;
    errorRate: number;
    uptime: number;
    apiCalls: number;
  };
  limits: {
    maxUsers: number;
    maxIngredients: number;
    maxBatches: number;
  };
  utilization: {
    users: number; // percentage
    ingredients: number; // percentage
    batches: number; // percentage
  };
}

// GET /api/admin/tenant-metrics - Get tenant usage and performance metrics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'PLATFORM_ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const sortBy = searchParams.get('sortBy') || 'usage';
    const order = searchParams.get('order') || 'desc';

    // If specific tenant requested
    if (tenantId) {
      const tenantMetrics = await getTenantMetrics(tenantId);
      if (!tenantMetrics) {
        return NextResponse.json(
          { error: 'Tenant not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(tenantMetrics);
    }

    // Get all tenants with their metrics
    const tenants = await prisma.tenant.findMany({
      include: {
        subscription: {
          include: {
            plan: {
              select: {
                name: true,
                price: true,
                maxUsers: true,
                maxIngredients: true,
                maxBatches: true
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
      },
      take: limit
    });

    // Get usage data for all tenants
    const [ingredientsData, batchesData, usageData] = await Promise.all([
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
      }),
      prisma.usage.groupBy({
        by: ['tenantId', 'metric'],
        _sum: {
          value: true
        },
        where: {
          date: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      })
    ]);

    // Create lookup maps
    const ingredientsMap = new Map(
      ingredientsData.map((item: { tenantId: string; _count: { id: number } }) => [item.tenantId, item._count.id])
    );
    const batchesMap = new Map(
      batchesData.map((item: { tenantId: string; _count: { id: number } }) => [item.tenantId, item._count.id])
    );
    const usageMap = new Map<string, Map<string, number>>();
    
    usageData.forEach((item: { tenantId: string; metric: string; _sum: { value: number | null } }) => {
      if (!usageMap.has(item.tenantId)) {
        usageMap.set(item.tenantId, new Map());
      }
      usageMap.get(item.tenantId)?.set(item.metric, item._sum.value || 0);
    });

    // Calculate metrics for each tenant
    const tenantMetrics: TenantMetrics[] = tenants.map(tenant => {
      const users = tenant.users.length;
      const ingredients = ingredientsMap.get(tenant.id) || 0;
      const batches = batchesMap.get(tenant.id) || 0;
      const tenantUsage = usageMap.get(tenant.id) || new Map();
      
      const subscription = tenant.subscription;
      const plan = subscription?.plan;
      
      const maxUsers = plan?.maxUsers || 0;
      const maxIngredients = plan?.maxIngredients || 0;
      const maxBatches = plan?.maxBatches || 0;
      
      // Calculate utilization percentages
      const userUtilization = maxUsers > 0 ? Math.round((users / maxUsers) * 100) : 0;
      const ingredientUtilization = maxIngredients > 0 ? Math.round((ingredients / maxIngredients) * 100) : 0;
      const batchUtilization = maxBatches > 0 ? Math.round((batches / maxBatches) * 100) : 0;
      
      // Mock performance data (in real implementation, this would come from monitoring systems)
      const performance = {
        avgResponseTime: Math.floor(Math.random() * 200) + 50, // 50-250ms
        errorRate: Math.random() * 2, // 0-2%
        uptime: 99.5 + Math.random() * 0.5, // 99.5-100%
        apiCalls: tenantUsage.get('api_calls') || Math.floor(Math.random() * 10000)
      };
      
      return {
        tenantId: tenant.id,
        tenantName: tenant.name,
        status: tenant.status,
        createdAt: tenant.createdAt.toISOString(),
        subscription: {
          planName: plan?.name || 'No Plan',
          status: subscription?.status || 'INACTIVE',
          price: plan?.price ? Number(plan.price) : 0
        },
        usage: {
          users,
          ingredients,
          batches,
          storage: tenantUsage.get('storage') || Math.floor(Math.random() * 1000) // Mock storage in MB
        },
        performance,
        limits: {
          maxUsers,
          maxIngredients,
          maxBatches
        },
        utilization: {
          users: userUtilization,
          ingredients: ingredientUtilization,
          batches: batchUtilization
        }
      };
    });

    // Sort metrics based on request
    const sortedMetrics = tenantMetrics.sort((a, b) => {
      let aValue: number, bValue: number;
      
      switch (sortBy) {
        case 'users':
          aValue = a.usage.users;
          bValue = b.usage.users;
          break;
        case 'revenue':
          aValue = a.subscription.price;
          bValue = b.subscription.price;
          break;
        case 'performance':
          aValue = a.performance.avgResponseTime;
          bValue = b.performance.avgResponseTime;
          break;
        case 'utilization':
          aValue = (a.utilization.users + a.utilization.ingredients + a.utilization.batches) / 3;
          bValue = (b.utilization.users + b.utilization.ingredients + b.utilization.batches) / 3;
          break;
        default:
          aValue = a.usage.users + a.usage.ingredients + a.usage.batches;
          bValue = b.usage.users + b.usage.ingredients + b.usage.batches;
      }
      
      return order === 'desc' ? bValue - aValue : aValue - bValue;
    });

    // Calculate summary statistics
    const summary = {
      totalTenants: tenantMetrics.length,
      averageUtilization: {
        users: Math.round(tenantMetrics.reduce((sum, t) => sum + t.utilization.users, 0) / tenantMetrics.length),
        ingredients: Math.round(tenantMetrics.reduce((sum, t) => sum + t.utilization.ingredients, 0) / tenantMetrics.length),
        batches: Math.round(tenantMetrics.reduce((sum, t) => sum + t.utilization.batches, 0) / tenantMetrics.length)
      },
      averagePerformance: {
        responseTime: Math.round(tenantMetrics.reduce((sum, t) => sum + t.performance.avgResponseTime, 0) / tenantMetrics.length),
        errorRate: Math.round((tenantMetrics.reduce((sum, t) => sum + t.performance.errorRate, 0) / tenantMetrics.length) * 100) / 100,
        uptime: Math.round((tenantMetrics.reduce((sum, t) => sum + t.performance.uptime, 0) / tenantMetrics.length) * 100) / 100
      },
      highUtilizationTenants: tenantMetrics.filter(t => 
        t.utilization.users > 80 || t.utilization.ingredients > 80 || t.utilization.batches > 80
      ).length
    };

    return NextResponse.json({
      metrics: sortedMetrics,
      summary
    });
  } catch (error) {
    console.error('Error fetching tenant metrics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to get metrics for a specific tenant
async function getTenantMetrics(tenantId: string): Promise<TenantMetrics | null> {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscription: {
          include: {
            plan: {
              select: {
                name: true,
                price: true,
                maxUsers: true,
                maxIngredients: true,
                maxBatches: true
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

    if (!tenant) {
      return null;
    }

    // Get usage data for this tenant
    const [ingredients, batches, usage] = await Promise.all([
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
      }),
      prisma.usage.findMany({
        where: {
          tenantId,
          date: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      })
    ]);

    const users = tenant.users.length;
    const subscription = tenant.subscription;
    const plan = subscription?.plan;
    
    const maxUsers = plan?.maxUsers || 0;
    const maxIngredients = plan?.maxIngredients || 0;
    const maxBatches = plan?.maxBatches || 0;
    
    // Calculate utilization percentages
    const userUtilization = maxUsers > 0 ? Math.round((users / maxUsers) * 100) : 0;
    const ingredientUtilization = maxIngredients > 0 ? Math.round((ingredients / maxIngredients) * 100) : 0;
    const batchUtilization = maxBatches > 0 ? Math.round((batches / maxBatches) * 100) : 0;
    
    // Aggregate usage data
    const usageMap = new Map<string, number>();
    usage.forEach(u => {
      const current = usageMap.get(u.metric) || 0;
      usageMap.set(u.metric, current + u.value);
    });
    
    // Mock performance data
    const performance = {
      avgResponseTime: Math.floor(Math.random() * 200) + 50,
      errorRate: Math.random() * 2,
      uptime: 99.5 + Math.random() * 0.5,
      apiCalls: usageMap.get('api_calls') || Math.floor(Math.random() * 10000)
    };
    
    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      status: tenant.status,
      createdAt: tenant.createdAt.toISOString(),
      subscription: {
        planName: plan?.name || 'No Plan',
        status: subscription?.status || 'INACTIVE',
        price: plan?.price ? Number(plan.price) : 0
      },
      usage: {
        users,
        ingredients,
        batches,
        storage: usageMap.get('storage') || Math.floor(Math.random() * 1000)
      },
      performance,
      limits: {
        maxUsers,
        maxIngredients,
        maxBatches
      },
      utilization: {
        users: userUtilization,
        ingredients: ingredientUtilization,
        batches: batchUtilization
      }
    };
  } catch (error) {
    console.error('Error fetching tenant metrics:', error);
    return null;
  }
}