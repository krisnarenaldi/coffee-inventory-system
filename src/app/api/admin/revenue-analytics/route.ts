import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';

interface RevenueMetrics {
  totalRevenue: number;
  monthlyRecurringRevenue: number;
  annualRecurringRevenue: number;
  averageRevenuePerUser: number;
  averageRevenuePerTenant: number;
  revenueGrowthRate: number;
  churnRate: number;
  customerLifetimeValue: number;
}

interface SubscriptionMetrics {
  totalSubscriptions: number;
  activeSubscriptions: number;
  cancelledSubscriptions: number;
  trialSubscriptions: number;
  pastDueSubscriptions: number;
  subscriptionsByPlan: {
    planName: string;
    count: number;
    revenue: number;
    percentage: number;
  }[];
  conversionRate: number;
}

interface RevenueAnalytics {
  overview: RevenueMetrics;
  subscriptions: SubscriptionMetrics;
  trends: {
    revenue: {
      period: string;
      data: {
        date: string;
        revenue: number;
        newRevenue: number;
        churnedRevenue: number;
        netRevenue: number;
      }[];
    };
    subscriptions: {
      period: string;
      data: {
        date: string;
        new: number;
        cancelled: number;
        net: number;
        total: number;
      }[];
    };
  };
  cohortAnalysis: {
    cohort: string;
    size: number;
    revenue: {
      month1: number;
      month3: number;
      month6: number;
      month12: number;
    };
    retention: {
      month1: number;
      month3: number;
      month6: number;
      month12: number;
    };
  }[];
  topTenants: {
    tenantId: string;
    tenantName: string;
    planName: string;
    monthlyRevenue: number;
    totalRevenue: number;
    subscriptionStart: string;
    status: string;
  }[];
}

// GET /api/admin/revenue-analytics - Get revenue and subscription analytics
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
    const cohort = searchParams.get('cohort'); // specific cohort analysis

    const periodMonths = parseInt(period);
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - periodMonths);

    // Get all subscriptions with their plans and tenants
    const subscriptions = await prisma.subscription.findMany({
      include: {
        plan: {
          select: {
            name: true,
            price: true,
            interval: true
          }
        },
        tenant: {
          select: {
            id: true,
            name: true,
            createdAt: true,
            status: true
          }
        }
      },
      where: {
        createdAt: {
          gte: startDate
        }
      }
    });

    // Get all subscription plans for reference
    const plans = await prisma.subscriptionPlan.findMany();

    // Calculate revenue metrics
    const revenueMetrics = await calculateRevenueMetrics(subscriptions);
    
    // Calculate subscription metrics
    const subscriptionMetrics = await calculateSubscriptionMetrics(subscriptions, plans);
    
    // Generate trend data
    const revenueTrends = await generateRevenueTrends(periodMonths);
    const subscriptionTrends = await generateSubscriptionTrends(periodMonths);
    
    // Generate cohort analysis
    const cohortAnalysis = await generateCohortAnalysis();
    
    // Get top tenants by revenue
    const topTenants = await getTopTenantsByRevenue();

    const analytics: RevenueAnalytics = {
      overview: revenueMetrics,
      subscriptions: subscriptionMetrics,
      trends: {
        revenue: {
          period: `${periodMonths} months`,
          data: revenueTrends
        },
        subscriptions: {
          period: `${periodMonths} months`,
          data: subscriptionTrends
        }
      },
      cohortAnalysis,
      topTenants
    };

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Error fetching revenue analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Calculate revenue metrics
async function calculateRevenueMetrics(subscriptions: any[]): Promise<RevenueMetrics> {
  const activeSubscriptions = subscriptions.filter(sub => sub.status === 'ACTIVE');
  const cancelledSubscriptions = subscriptions.filter(sub => sub.status === 'CANCELLED');
  
  // Calculate MRR (Monthly Recurring Revenue)
  const mrr = activeSubscriptions.reduce((total, sub) => {
    const price = Number(sub.plan.price);
    if (sub.plan.interval === 'MONTHLY') {
      return total + price;
    } else if (sub.plan.interval === 'YEARLY') {
      return total + (price / 12);
    }
    return total;
  }, 0);
  
  // Calculate total revenue (simplified - in real implementation, use actual billing data)
  const totalRevenue = subscriptions.reduce((total, sub) => {
    const price = Number(sub.plan.price);
    const monthsActive = Math.max(1, Math.floor(
      (new Date().getTime() - new Date(sub.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30)
    ));
    
    if (sub.plan.interval === 'MONTHLY') {
      return total + (price * monthsActive);
    } else if (sub.plan.interval === 'YEARLY') {
      return total + (price * Math.ceil(monthsActive / 12));
    }
    return total;
  }, 0);
  
  // Get total user count
  const totalUsers = await prisma.user.count({
    where: {
      isActive: true
    }
  });
  
  const totalTenants = await prisma.tenant.count({
    where: {
      status: 'ACTIVE'
    }
  });
  
  // Calculate growth rate (simplified)
  const currentMonthRevenue = mrr;
  const lastMonthRevenue = mrr * 0.95; // Mock 5% growth
  const revenueGrowthRate = lastMonthRevenue > 0 
    ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
    : 0;
  
  // Calculate churn rate
  const totalSubscriptionsEver = subscriptions.length;
  const churnRate = totalSubscriptionsEver > 0 
    ? (cancelledSubscriptions.length / totalSubscriptionsEver) * 100 
    : 0;
  
  // Calculate CLV (simplified)
  const averageMonthlyRevenue = totalTenants > 0 ? mrr / totalTenants : 0;
  const averageLifetimeMonths = churnRate > 0 ? 100 / churnRate : 24; // months
  const customerLifetimeValue = averageMonthlyRevenue * averageLifetimeMonths;
  
  return {
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    monthlyRecurringRevenue: Math.round(mrr * 100) / 100,
    annualRecurringRevenue: Math.round(mrr * 12 * 100) / 100,
    averageRevenuePerUser: totalUsers > 0 ? Math.round((mrr / totalUsers) * 100) / 100 : 0,
    averageRevenuePerTenant: totalTenants > 0 ? Math.round((mrr / totalTenants) * 100) / 100 : 0,
    revenueGrowthRate: Math.round(revenueGrowthRate * 100) / 100,
    churnRate: Math.round(churnRate * 100) / 100,
    customerLifetimeValue: Math.round(customerLifetimeValue * 100) / 100
  };
}

// Calculate subscription metrics
async function calculateSubscriptionMetrics(subscriptions: any[], plans: any[]): Promise<SubscriptionMetrics> {
  const totalSubscriptions = subscriptions.length;
  const activeSubscriptions = subscriptions.filter(sub => sub.status === 'ACTIVE').length;
  const cancelledSubscriptions = subscriptions.filter(sub => sub.status === 'CANCELLED').length;
  const trialSubscriptions = subscriptions.filter(sub => sub.status === 'TRIALING').length;
  const pastDueSubscriptions = subscriptions.filter(sub => sub.status === 'PAST_DUE').length;
  
  // Calculate subscriptions by plan
  const planStats = new Map<string, { count: number; revenue: number }>();
  
  subscriptions.forEach(sub => {
    const planName = sub.plan.name;
    const current = planStats.get(planName) || { count: 0, revenue: 0 };
    current.count += 1;
    
    if (sub.status === 'ACTIVE') {
      const price = Number(sub.plan.price);
      if (sub.plan.interval === 'MONTHLY') {
        current.revenue += price;
      } else if (sub.plan.interval === 'YEARLY') {
        current.revenue += price / 12; // Convert to monthly
      }
    }
    
    planStats.set(planName, current);
  });
  
  const subscriptionsByPlan = Array.from(planStats.entries()).map(([planName, stats]) => ({
    planName,
    count: stats.count,
    revenue: Math.round(stats.revenue * 100) / 100,
    percentage: totalSubscriptions > 0 ? Math.round((stats.count / totalSubscriptions) * 100 * 100) / 100 : 0
  }));
  
  // Calculate conversion rate (trial to paid)
  const totalTrials = await prisma.subscription.count({
    where: {
      status: 'TRIALING'
    }
  });
  
  const convertedTrials = await prisma.subscription.count({
    where: {
      status: 'ACTIVE',
      // In real implementation, track trial history
    }
  });
  
  const conversionRate = totalTrials > 0 ? (convertedTrials / totalTrials) * 100 : 0;
  
  return {
    totalSubscriptions,
    activeSubscriptions,
    cancelledSubscriptions,
    trialSubscriptions,
    pastDueSubscriptions,
    subscriptionsByPlan,
    conversionRate: Math.round(conversionRate * 100) / 100
  };
}

// Generate revenue trends
async function generateRevenueTrends(periodMonths: number) {
  const trends = [];
  
  for (let i = periodMonths - 1; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const dateKey = date.toISOString().split('T')[0].substring(0, 7); // YYYY-MM
    
    // Mock trend data (in real implementation, calculate from actual billing data)
    const baseRevenue = 10000 + (periodMonths - i) * 500;
    const variance = Math.random() * 1000 - 500;
    const revenue = Math.max(0, baseRevenue + variance);
    const newRevenue = Math.max(0, 2000 + Math.random() * 1000);
    const churnedRevenue = Math.max(0, 500 + Math.random() * 500);
    
    trends.push({
      date: dateKey,
      revenue: Math.round(revenue * 100) / 100,
      newRevenue: Math.round(newRevenue * 100) / 100,
      churnedRevenue: Math.round(churnedRevenue * 100) / 100,
      netRevenue: Math.round((revenue + newRevenue - churnedRevenue) * 100) / 100
    });
  }
  
  return trends;
}

// Generate subscription trends
async function generateSubscriptionTrends(periodMonths: number) {
  const trends = [];
  let totalSubscriptions = 0;
  
  for (let i = periodMonths - 1; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const dateKey = date.toISOString().split('T')[0].substring(0, 7); // YYYY-MM
    
    // Mock trend data
    const newSubs = Math.floor(Math.random() * 20) + 5;
    const cancelledSubs = Math.floor(Math.random() * 5) + 1;
    const netSubs = newSubs - cancelledSubs;
    totalSubscriptions += netSubs;
    
    trends.push({
      date: dateKey,
      new: newSubs,
      cancelled: cancelledSubs,
      net: netSubs,
      total: Math.max(0, totalSubscriptions)
    });
  }
  
  return trends;
}

// Generate cohort analysis
async function generateCohortAnalysis() {
  // Mock cohort data (in real implementation, analyze actual subscription data)
  const cohorts = [];
  
  for (let i = 11; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const cohortName = date.toISOString().split('T')[0].substring(0, 7);
    
    const size = Math.floor(Math.random() * 50) + 10;
    const baseRetention = 0.9;
    
    cohorts.push({
      cohort: cohortName,
      size,
      revenue: {
        month1: Math.round(size * 50 * 100) / 100,
        month3: Math.round(size * 45 * 100) / 100,
        month6: Math.round(size * 40 * 100) / 100,
        month12: Math.round(size * 35 * 100) / 100
      },
      retention: {
        month1: Math.round(baseRetention * 100 * 100) / 100,
        month3: Math.round((baseRetention * 0.9) * 100 * 100) / 100,
        month6: Math.round((baseRetention * 0.8) * 100 * 100) / 100,
        month12: Math.round((baseRetention * 0.7) * 100 * 100) / 100
      }
    });
  }
  
  return cohorts;
}

// Get top tenants by revenue
async function getTopTenantsByRevenue() {
  const tenants = await prisma.tenant.findMany({
    include: {
      subscription: {
        include: {
          plan: {
            select: {
              name: true,
              price: true,
              interval: true
            }
          }
        }
      }
    },
    where: {
      status: 'ACTIVE',
      subscription: {
        status: 'ACTIVE'
      }
    },
    take: 10
  });
  
  return tenants.map(tenant => {
    const subscription = tenant.subscription;
    const plan = subscription?.plan;
    const monthlyRevenue = plan ? (
      plan.interval === 'MONTHLY' ? Number(plan.price) : Number(plan.price) / 12
    ) : 0;
    
    // Calculate total revenue (simplified)
    const monthsActive = Math.max(1, Math.floor(
      (new Date().getTime() - new Date(subscription?.createdAt || tenant.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30)
    ));
    
    const totalRevenue = monthlyRevenue * monthsActive;
    
    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      planName: plan?.name || 'No Plan',
      monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      subscriptionStart: subscription?.createdAt?.toISOString() || tenant.createdAt.toISOString(),
      status: subscription?.status || 'INACTIVE'
    };
  }).sort((a, b) => b.monthlyRevenue - a.monthlyRevenue);
}