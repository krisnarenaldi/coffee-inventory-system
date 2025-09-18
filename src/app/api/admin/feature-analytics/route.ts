import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';

interface FeatureUsage {
  feature: string;
  category: string;
  totalUsage: number;
  uniqueUsers: number;
  uniqueTenants: number;
  averageUsagePerTenant: number;
  adoptionRate: number; // percentage of tenants using this feature
  trend: 'increasing' | 'decreasing' | 'stable';
  lastUsed: string;
}

interface FeatureAnalytics {
  overview: {
    totalFeatures: number;
    activeFeatures: number;
    mostUsedFeature: string;
    leastUsedFeature: string;
    averageAdoptionRate: number;
  };
  features: FeatureUsage[];
  categories: {
    [category: string]: {
      totalUsage: number;
      featureCount: number;
      adoptionRate: number;
    };
  };
  trends: {
    period: string;
    data: {
      date: string;
      [feature: string]: number | string;
    }[];
  };
}

// GET /api/admin/feature-analytics - Get feature usage analytics
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
    const period = searchParams.get('period') || '30'; // days
    const category = searchParams.get('category');
    const feature = searchParams.get('feature');

    const periodDays = parseInt(period);
    const startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

    // If specific feature requested
    if (feature) {
      const featureData = await getFeatureDetails(feature, startDate);
      return NextResponse.json(featureData);
    }

    // Get total tenant count for adoption rate calculation
    const totalTenants = await prisma.tenant.count({
      where: {
        status: 'ACTIVE'
      }
    });

    // Define feature categories and their features
    const featureCategories = {
      'Inventory Management': [
        'ingredient_create',
        'ingredient_update',
        'ingredient_delete',
        'inventory_search',
        'inventory_filter',
        'low_stock_alerts'
      ],
      'Batch Management': [
        'batch_create',
        'batch_update',
        'batch_complete',
        'batch_search',
        'batch_notes',
        'batch_quality_control'
      ],
      'Reporting': [
        'inventory_report',
        'batch_report',
        'cost_analysis',
        'export_data',
        'dashboard_view'
      ],
      'User Management': [
        'user_invite',
        'role_assignment',
        'permission_update',
        'user_activity_log'
      ],
      'Integration': [
        'api_usage',
        'webhook_setup',
        'data_import',
        'data_export'
      ]
    };

    // Get usage data from the database
    const usageData = await prisma.usage.findMany({
      where: {
        date: {
          gte: startDate
        },
        metric: {
          in: Object.values(featureCategories).flat()
        }
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            status: true
          }
        }
      }
    });

    // Process feature usage data
    const featureUsageMap = new Map<string, {
      totalUsage: number;
      tenants: Set<string>;
      users: Set<string>;
      lastUsed: Date;
      dailyUsage: Map<string, number>;
    }>();

    // Initialize all features
    Object.values(featureCategories).flat().forEach(feature => {
      featureUsageMap.set(feature, {
        totalUsage: 0,
        tenants: new Set(),
        users: new Set(),
        lastUsed: new Date(0),
        dailyUsage: new Map()
      });
    });

    // Process usage data
    usageData.forEach(usage => {
      const featureData = featureUsageMap.get(usage.metric);
      if (featureData) {
        featureData.totalUsage += usage.value;
        featureData.tenants.add(usage.tenantId);
        
        // Mock user data (in real implementation, you'd track actual users)
        const mockUserId = `user_${usage.tenantId}_${Math.floor(Math.random() * 5)}`;
        featureData.users.add(mockUserId);
        
        if (usage.date > featureData.lastUsed) {
          featureData.lastUsed = usage.date;
        }
        
        // Track daily usage for trends
        const dateKey = usage.date.toISOString().split('T')[0];
        const currentDaily = featureData.dailyUsage.get(dateKey) || 0;
        featureData.dailyUsage.set(dateKey, currentDaily + usage.value);
      }
    });

    // Calculate feature analytics
    const features: FeatureUsage[] = [];
    const categoryStats: { [category: string]: { totalUsage: number; featureCount: number; adoptionRate: number } } = {};

    Object.entries(featureCategories).forEach(([categoryName, categoryFeatures]) => {
      let categoryTotalUsage = 0;
      let categoryTotalTenants = new Set<string>();

      categoryFeatures.forEach(featureName => {
        const data = featureUsageMap.get(featureName);
        if (data) {
          const adoptionRate = totalTenants > 0 ? (data.tenants.size / totalTenants) * 100 : 0;
          const averageUsagePerTenant = data.tenants.size > 0 ? data.totalUsage / data.tenants.size : 0;
          
          // Calculate trend (simplified)
          const dailyUsageArray = Array.from(data.dailyUsage.values());
          let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
          if (dailyUsageArray.length >= 2) {
            const firstHalf = dailyUsageArray.slice(0, Math.floor(dailyUsageArray.length / 2));
            const secondHalf = dailyUsageArray.slice(Math.floor(dailyUsageArray.length / 2));
            const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
            const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
            
            if (secondAvg > firstAvg * 1.1) trend = 'increasing';
            else if (secondAvg < firstAvg * 0.9) trend = 'decreasing';
          }

          features.push({
            feature: featureName,
            category: categoryName,
            totalUsage: data.totalUsage,
            uniqueUsers: data.users.size,
            uniqueTenants: data.tenants.size,
            averageUsagePerTenant: Math.round(averageUsagePerTenant * 100) / 100,
            adoptionRate: Math.round(adoptionRate * 100) / 100,
            trend,
            lastUsed: data.lastUsed.toISOString()
          });

          categoryTotalUsage += data.totalUsage;
          data.tenants.forEach(tenant => categoryTotalTenants.add(tenant));
        }
      });

      categoryStats[categoryName] = {
        totalUsage: categoryTotalUsage,
        featureCount: categoryFeatures.length,
        adoptionRate: totalTenants > 0 ? Math.round((categoryTotalTenants.size / totalTenants) * 100 * 100) / 100 : 0
      };
    });

    // Filter by category if specified
    const filteredFeatures = category 
      ? features.filter(f => f.category === category)
      : features;

    // Sort by total usage
    filteredFeatures.sort((a, b) => b.totalUsage - a.totalUsage);

    // Calculate overview statistics
    const activeFeatures = filteredFeatures.filter(f => f.totalUsage > 0);
    const mostUsedFeature = filteredFeatures[0]?.feature || 'None';
    const leastUsedFeature = filteredFeatures[filteredFeatures.length - 1]?.feature || 'None';
    const averageAdoptionRate = filteredFeatures.length > 0 
      ? Math.round((filteredFeatures.reduce((sum, f) => sum + f.adoptionRate, 0) / filteredFeatures.length) * 100) / 100
      : 0;

    // Generate trend data for the last 30 days
    const trendData = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split('T')[0];
      
      const dayData: { date: string; [feature: string]: number | string } = {
        date: dateKey
      };
      
      // Add top 5 features to trend data
      filteredFeatures.slice(0, 5).forEach(feature => {
        const featureData = featureUsageMap.get(feature.feature);
        dayData[feature.feature] = featureData?.dailyUsage.get(dateKey) || 0;
      });
      
      trendData.push(dayData);
    }

    const analytics: FeatureAnalytics = {
      overview: {
        totalFeatures: filteredFeatures.length,
        activeFeatures: activeFeatures.length,
        mostUsedFeature,
        leastUsedFeature,
        averageAdoptionRate
      },
      features: filteredFeatures,
      categories: categoryStats,
      trends: {
        period: `${periodDays} days`,
        data: trendData
      }
    };

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Error fetching feature analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to get detailed analytics for a specific feature
async function getFeatureDetails(feature: string, startDate: Date) {
  try {
    const usageData = await prisma.usage.findMany({
      where: {
        metric: feature,
        date: {
          gte: startDate
        }
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            subscription: {
              include: {
                plan: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        date: 'asc'
      }
    });

    // Process data by tenant
    const tenantUsage = new Map<string, {
      tenantName: string;
      planName: string;
      totalUsage: number;
      dailyUsage: { date: string; usage: number }[];
    }>();

    usageData.forEach(usage => {
      const tenantId = usage.tenantId;
      const dateKey = usage.date.toISOString().split('T')[0];
      
      if (!tenantUsage.has(tenantId)) {
        tenantUsage.set(tenantId, {
          tenantName: usage.tenant.name,
          planName: usage.tenant.subscription?.plan?.name || 'No Plan',
          totalUsage: 0,
          dailyUsage: []
        });
      }
      
      const tenant = tenantUsage.get(tenantId)!;
      tenant.totalUsage += usage.value;
      tenant.dailyUsage.push({
        date: dateKey,
        usage: usage.value
      });
    });

    // Calculate daily totals
    const dailyTotals = new Map<string, number>();
    usageData.forEach(usage => {
      const dateKey = usage.date.toISOString().split('T')[0];
      const current = dailyTotals.get(dateKey) || 0;
      dailyTotals.set(dateKey, current + usage.value);
    });

    return {
      feature,
      totalUsage: usageData.reduce((sum, u) => sum + u.value, 0),
      uniqueTenants: tenantUsage.size,
      tenantBreakdown: Array.from(tenantUsage.entries()).map(([tenantId, data]) => ({
        tenantId,
        ...data
      })).sort((a, b) => b.totalUsage - a.totalUsage),
      dailyTrend: Array.from(dailyTotals.entries()).map(([date, usage]) => ({
        date,
        usage
      })).sort((a, b) => a.date.localeCompare(b.date))
    };
  } catch (error) {
    console.error('Error fetching feature details:', error);
    throw error;
  }
}