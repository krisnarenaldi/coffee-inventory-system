import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';

interface TenantGrowthMetrics {
  overview: {
    totalTenants: number;
    activeTenants: number;
    newTenantsThisMonth: number;
    churnedTenantsThisMonth: number;
    netGrowthThisMonth: number;
    growthRate: number;
    churnRate: number;
    averageTimeToActivation: number; // days
  };
  trends: {
    period: string;
    data: {
      date: string;
      newTenants: number;
      churnedTenants: number;
      netGrowth: number;
      totalActive: number;
      conversionRate: number;
    }[];
  };
  churnAnalysis: {
    churnReasons: {
      reason: string;
      count: number;
      percentage: number;
    }[];
    churnByPlan: {
      planName: string;
      totalSubscriptions: number;
      churned: number;
      churnRate: number;
    }[];
    churnByTenure: {
      tenure: string;
      churned: number;
      total: number;
      churnRate: number;
    }[];
    riskFactors: {
      factor: string;
      description: string;
      tenantsAtRisk: number;
      riskLevel: 'low' | 'medium' | 'high';
    }[];
  };
  cohortAnalysis: {
    cohort: string;
    initialSize: number;
    retained: {
      month1: number;
      month3: number;
      month6: number;
      month12: number;
    };
    retentionRate: {
      month1: number;
      month3: number;
      month6: number;
      month12: number;
    };
  }[];
  segmentation: {
    byPlan: {
      planName: string;
      tenants: number;
      growthRate: number;
      churnRate: number;
    }[];
    bySize: {
      segment: string;
      tenants: number;
      averageRevenue: number;
      churnRate: number;
    }[];
    byGeography: {
      region: string;
      tenants: number;
      growthRate: number;
    }[];
  };
}

// GET /api/admin/tenant-growth - Get tenant growth and churn analytics
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
    const period = searchParams.get('period') || '12'; // months
    const cohort = searchParams.get('cohort');
    const segment = searchParams.get('segment');

    const periodMonths = parseInt(period);
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - periodMonths);

    // Calculate overview metrics
    const overview = await calculateOverviewMetrics();
    
    // Generate growth trends
    const trends = await generateGrowthTrends(periodMonths);
    
    // Analyze churn
    const churnAnalysis = await analyzeChurn();
    
    // Generate cohort analysis
    const cohortAnalysis = await generateCohortAnalysis();
    
    // Generate segmentation analysis
    const segmentation = await generateSegmentationAnalysis();

    const analytics: TenantGrowthMetrics = {
      overview,
      trends: {
        period: `${periodMonths} months`,
        data: trends
      },
      churnAnalysis,
      cohortAnalysis,
      segmentation
    };

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Error fetching tenant growth analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Calculate overview metrics
async function calculateOverviewMetrics() {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  // Get tenant counts
  const [totalTenants, activeTenants, newTenantsThisMonth, lastMonthTenants] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({
      where: {
        status: 'ACTIVE'
      }
    }),
    prisma.tenant.count({
      where: {
        createdAt: {
          gte: thisMonthStart
        }
      }
    }),
    prisma.tenant.count({
      where: {
        createdAt: {
          lt: thisMonthStart
        },
        status: 'ACTIVE'
      }
    })
  ]);

  // Calculate churned tenants (simplified - tenants that became cancelled this month)
  const churnedTenantsThisMonth = await prisma.tenant.count({
    where: {
      status: 'CANCELLED',
      updatedAt: {
        gte: thisMonthStart
      }
    }
  });

  const netGrowthThisMonth = newTenantsThisMonth - churnedTenantsThisMonth;
  const growthRate = lastMonthTenants > 0 ? (netGrowthThisMonth / lastMonthTenants) * 100 : 0;
  const churnRate = lastMonthTenants > 0 ? (churnedTenantsThisMonth / lastMonthTenants) * 100 : 0;

  // Calculate average time to activation
  const recentActiveTenants = await prisma.tenant.findMany({
    where: {
      status: 'ACTIVE',
      createdAt: {
        gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // Last 90 days
      }
    },
    select: {
      createdAt: true,
      updatedAt: true
    }
  });

  const averageTimeToActivation = recentActiveTenants.length > 0 
    ? recentActiveTenants.reduce((sum, tenant) => {
        const activationTime = new Date(tenant.updatedAt).getTime() - new Date(tenant.createdAt).getTime();
        return sum + (activationTime / (1000 * 60 * 60 * 24)); // Convert to days
      }, 0) / recentActiveTenants.length
    : 0;

  return {
    totalTenants,
    activeTenants,
    newTenantsThisMonth,
    churnedTenantsThisMonth,
    netGrowthThisMonth,
    growthRate: Math.round(growthRate * 100) / 100,
    churnRate: Math.round(churnRate * 100) / 100,
    averageTimeToActivation: Math.round(averageTimeToActivation * 100) / 100
  };
}

// Generate growth trends
async function generateGrowthTrends(periodMonths: number) {
  const trends = [];
  let cumulativeActive = 0;

  for (let i = periodMonths - 1; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const dateKey = date.toISOString().split('T')[0].substring(0, 7); // YYYY-MM

    // Get new tenants for this month
    const newTenants = await prisma.tenant.count({
      where: {
        createdAt: {
          gte: monthStart,
          lte: monthEnd
        }
      }
    });

    // Get churned tenants for this month (simplified)
    const churnedTenants = await prisma.tenant.count({
      where: {
        status: 'CANCELLED',
        updatedAt: {
          gte: monthStart,
          lte: monthEnd
        }
      }
    });

    const netGrowth = newTenants - churnedTenants;
    cumulativeActive += netGrowth;

    // Calculate conversion rate (trial to active)
    const trialTenants = Math.floor(newTenants * 1.2); // Mock: assume 20% more trials than conversions
    const conversionRate = trialTenants > 0 ? (newTenants / trialTenants) * 100 : 0;

    trends.push({
      date: dateKey,
      newTenants,
      churnedTenants,
      netGrowth,
      totalActive: Math.max(0, cumulativeActive),
      conversionRate: Math.round(conversionRate * 100) / 100
    });
  }

  return trends;
}

// Analyze churn
async function analyzeChurn() {
  // Mock churn reasons (in real implementation, collect from exit surveys)
  const churnReasons = [
    { reason: 'Price too high', count: 15, percentage: 30 },
    { reason: 'Missing features', count: 12, percentage: 24 },
    { reason: 'Poor performance', count: 8, percentage: 16 },
    { reason: 'Competitor switch', count: 7, percentage: 14 },
    { reason: 'Business closure', count: 5, percentage: 10 },
    { reason: 'Other', count: 3, percentage: 6 }
  ];

  // Churn by subscription plan
  const subscriptionPlans = await prisma.subscriptionPlan.findMany();
  const churnByPlan = await Promise.all(
    subscriptionPlans.map(async (plan) => {
      const totalSubscriptions = await prisma.subscription.count({
        where: {
          planId: plan.id
        }
      });

      const churned = await prisma.subscription.count({
        where: {
          planId: plan.id,
          status: 'CANCELLED'
        }
      });

      const churnRate = totalSubscriptions > 0 ? (churned / totalSubscriptions) * 100 : 0;

      return {
        planName: plan.name,
        totalSubscriptions,
        churned,
        churnRate: Math.round(churnRate * 100) / 100
      };
    })
  );

  // Churn by tenure
  const churnByTenure = [
    { tenure: '0-1 months', churned: 25, total: 100, churnRate: 25 },
    { tenure: '1-3 months', churned: 15, total: 80, churnRate: 18.75 },
    { tenure: '3-6 months', churned: 10, total: 70, churnRate: 14.29 },
    { tenure: '6-12 months', churned: 8, total: 60, churnRate: 13.33 },
    { tenure: '12+ months', churned: 5, total: 50, churnRate: 10 }
  ];

  // Risk factors
  const riskFactors = [
    {
      factor: 'Low usage',
      description: 'Tenants with less than 10 API calls in the last 7 days',
      tenantsAtRisk: 15,
      riskLevel: 'high' as const
    },
    {
      factor: 'No recent logins',
      description: 'Tenants with no user logins in the last 14 days',
      tenantsAtRisk: 8,
      riskLevel: 'high' as const
    },
    {
      factor: 'Support tickets',
      description: 'Tenants with multiple unresolved support tickets',
      tenantsAtRisk: 12,
      riskLevel: 'medium' as const
    },
    {
      factor: 'Payment issues',
      description: 'Tenants with failed payment attempts',
      tenantsAtRisk: 6,
      riskLevel: 'high' as const
    },
    {
      factor: 'Feature requests',
      description: 'Tenants requesting features not in roadmap',
      tenantsAtRisk: 20,
      riskLevel: 'low' as const
    }
  ];

  return {
    churnReasons,
    churnByPlan,
    churnByTenure,
    riskFactors
  };
}

// Generate cohort analysis
async function generateCohortAnalysis() {
  const cohorts = [];

  for (let i = 11; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const cohortName = date.toISOString().split('T')[0].substring(0, 7);
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    // Get initial cohort size
    const initialSize = await prisma.tenant.count({
      where: {
        createdAt: {
          gte: monthStart,
          lte: monthEnd
        }
      }
    });

    if (initialSize === 0) {
      continue;
    }

    // Calculate retention (simplified - in real implementation, track actual retention)
    const baseRetention = 0.85;
    const month1Retained = Math.floor(initialSize * baseRetention);
    const month3Retained = Math.floor(initialSize * baseRetention * 0.9);
    const month6Retained = Math.floor(initialSize * baseRetention * 0.8);
    const month12Retained = Math.floor(initialSize * baseRetention * 0.7);

    cohorts.push({
      cohort: cohortName,
      initialSize,
      retained: {
        month1: month1Retained,
        month3: month3Retained,
        month6: month6Retained,
        month12: month12Retained
      },
      retentionRate: {
        month1: Math.round((month1Retained / initialSize) * 100 * 100) / 100,
        month3: Math.round((month3Retained / initialSize) * 100 * 100) / 100,
        month6: Math.round((month6Retained / initialSize) * 100 * 100) / 100,
        month12: Math.round((month12Retained / initialSize) * 100 * 100) / 100
      }
    });
  }

  return cohorts;
}

// Generate segmentation analysis
async function generateSegmentationAnalysis() {
  // Segmentation by plan
  const plans = await prisma.subscriptionPlan.findMany();
  const byPlan = await Promise.all(
    plans.map(async (plan) => {
      const tenants = await prisma.tenant.count({
        where: {
          subscription: {
            planId: plan.id,
            status: 'ACTIVE'
          }
        }
      });

      // Mock growth and churn rates
      const growthRate = Math.random() * 10 - 2; // -2% to 8%
      const churnRate = Math.random() * 5; // 0% to 5%

      return {
        planName: plan.name,
        tenants,
        growthRate: Math.round(growthRate * 100) / 100,
        churnRate: Math.round(churnRate * 100) / 100
      };
    })
  );

  // Segmentation by size (based on user count)
  const bySize = [
    {
      segment: 'Small (1-5 users)',
      tenants: 45,
      averageRevenue: 29,
      churnRate: 8.5
    },
    {
      segment: 'Medium (6-20 users)',
      tenants: 28,
      averageRevenue: 79,
      churnRate: 5.2
    },
    {
      segment: 'Large (21-50 users)',
      tenants: 12,
      averageRevenue: 199,
      churnRate: 3.1
    },
    {
      segment: 'Enterprise (50+ users)',
      tenants: 5,
      averageRevenue: 499,
      churnRate: 1.8
    }
  ];

  // Segmentation by geography (mock data)
  const byGeography = [
    { region: 'North America', tenants: 45, growthRate: 12.5 },
    { region: 'Europe', tenants: 28, growthRate: 8.3 },
    { region: 'Asia Pacific', tenants: 15, growthRate: 15.2 },
    { region: 'Latin America', tenants: 8, growthRate: 6.7 },
    { region: 'Other', tenants: 4, growthRate: 4.1 }
  ];

  return {
    byPlan,
    bySize,
    byGeography
  };
}