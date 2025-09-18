import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../../lib/auth';
import { prisma } from '../../../../../../lib/prisma';

// GET /api/admin/dashboard/stats - Get platform dashboard statistics
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
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Fetch all statistics in parallel
    const [totalTenants, activeTenants, totalUsers, subscriptions, monthlyUsage] = await Promise.all([
      // Total tenants
      prisma.tenant.count(),
      
      // Active tenants
      prisma.tenant.count({
        where: {
          status: 'ACTIVE'
        }
      }),
      
      // Total users across all tenants
      prisma.user.count({
        where: {
          isActive: true
        }
      }),
      
      // Subscription statistics
      prisma.subscription.findMany({
        include: {
          plan: {
            select: {
              price: true
            }
          }
        }
      }),
      
      // Monthly usage data
      prisma.usage.findMany({
        where: {
          date: {
            gte: startOfMonth
          }
        }
      })
    ]);

    // Calculate revenue metrics
    const activeSubscriptions = subscriptions.filter(sub => sub.status === 'ACTIVE');
    const cancelledSubscriptions = subscriptions.filter(sub => sub.status === 'CANCELLED');
    
    const monthlyRevenue = activeSubscriptions.reduce((total, sub) => {
      return total + (sub.plan.price ? Number(sub.plan.price) : 0);
    }, 0);
    
    const totalRevenue = subscriptions.reduce((total, sub) => {
      // Simplified calculation - in reality you'd track actual payments
      const monthsActive = sub.status === 'ACTIVE' ? 12 : 6; // Estimate
      const price = sub.plan.price ? Number(sub.plan.price) : 0;
      return total + (price * monthsActive);
    }, 0);

    // Generate recent activity (mock data for demo)
    const recentActivity = await generateRecentActivity();

    // System health metrics (mock data for demo)
    const systemHealth = {
      status: 'healthy' as const,
      uptime: '99.9%',
      responseTime: Math.floor(Math.random() * 100) + 50, // 50-150ms
      errorRate: Math.random() * 0.5 // 0-0.5%
    };

    const stats = {
      totalTenants,
      activeTenants,
      totalUsers,
      totalRevenue,
      monthlyRevenue,
      activeSubscriptions: activeSubscriptions.length,
      cancelledSubscriptions: cancelledSubscriptions.length,
      systemHealth,
      recentActivity
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to generate recent activity
async function generateRecentActivity() {
  try {
    // Get recent tenants
    const recentTenants = await prisma.tenant.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      take: 10,
      select: {
        id: true,
        name: true,
        createdAt: true
      }
    });

    // Get recent users
    const recentUsers = await prisma.user.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      take: 10,
      include: {
        tenant: {
          select: {
            name: true
          }
        }
      }
    });

    // Get recent subscription changes
    const recentSubscriptions = await prisma.subscription.findMany({
      orderBy: {
        updatedAt: 'desc'
      },
      take: 10,
      include: {
        tenant: {
          select: {
            name: true
          }
        },
        plan: {
          select: {
            name: true
          }
        }
      }
    });

    const activities: Array<{
      id: string;
      type: 'tenant_created' | 'subscription_upgraded' | 'user_registered' | 'payment_failed';
      description: string;
      timestamp: string;
      tenantName?: string;
    }> = [];

    // Add tenant creation activities
    recentTenants.forEach(tenant => {
      activities.push({
        id: `tenant_${tenant.id}`,
        type: 'tenant_created' as const,
        description: `New tenant "${tenant.name}" was created`,
        timestamp: tenant.createdAt.toISOString(),
        tenantName: tenant.name
      });
    });

    // Add user registration activities
    recentUsers.forEach(user => {
      activities.push({
        id: `user_${user.id}`,
        type: 'user_registered' as const,
        description: `New user registered: ${user.email}`,
        timestamp: user.createdAt.toISOString(),
        tenantName: user.tenant?.name
      });
    });

    // Add subscription activities
    recentSubscriptions.forEach(subscription => {
      activities.push({
        id: `subscription_${subscription.id}`,
        type: 'subscription_upgraded' as const,
        description: `Subscription updated to ${subscription.plan.name}`,
        timestamp: subscription.updatedAt.toISOString(),
        tenantName: subscription.tenant.name
      });
    });

    // Sort by timestamp and return latest 25
    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 25);
  } catch (error) {
    console.error('Error generating recent activity:', error);
    return [];
  }
}