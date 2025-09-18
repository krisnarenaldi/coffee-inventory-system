'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { redirect } from 'next/navigation';
import AdminNavigation from '../../../components/AdminNavigation';

interface AnalyticsData {
  tenantMetrics: {
    totalTenants: number;
    activeTenants: number;
    churnRate: number;
    averageLifetime: number;
  };
  usageMetrics: {
    totalUsers: number;
    totalIngredients: number;
    totalBatches: number;
    averageUsagePerTenant: {
      users: number;
      ingredients: number;
      batches: number;
    };
  };
  revenueMetrics: {
    totalRevenue: number;
    monthlyRecurringRevenue: number;
    averageRevenuePerUser: number;
    revenueGrowthRate: number;
  };
  featureUsage: Array<{
    feature: string;
    usageCount: number;
    tenantCount: number;
    adoptionRate: number;
  }>;
  topTenants: Array<{
    id: string;
    name: string;
    users: number;
    revenue: number;
    planName: string;
    status: string;
  }>;
}

interface TenantComparison {
  tenantId: string;
  tenantName: string;
  users: number;
  ingredients: number;
  batches: number;
  revenue: number;
  planName: string;
  efficiency: number;
}

export default function PlatformAnalytics() {
  const { data: session, status } = useSession();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [tenantComparison, setTenantComparison] = useState<TenantComparison[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<'users' | 'revenue' | 'efficiency'>('users');

  // Check if user is platform admin
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session?.user || session.user.role !== 'PLATFORM_ADMIN') {
      redirect('/dashboard');
    }
  }, [session, status]);

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const [analyticsRes, comparisonRes] = await Promise.all([
          fetch('/api/admin/analytics/overview'),
          fetch('/api/admin/analytics/tenant-comparison')
        ]);

        if (!analyticsRes.ok || !comparisonRes.ok) {
          throw new Error('Failed to fetch analytics data');
        }

        const [analyticsData, comparisonData] = await Promise.all([
          analyticsRes.json(),
          comparisonRes.json()
        ]);

        setAnalytics(analyticsData);
        setTenantComparison(comparisonData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };

    if (session?.user?.role === 'PLATFORM_ADMIN') {
      fetchAnalytics();
    }
  }, [session]);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️ Error</div>
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  const sortedTenants = [...tenantComparison].sort((a, b) => {
    switch (selectedMetric) {
      case 'users': return b.users - a.users;
      case 'revenue': return b.revenue - a.revenue;
      case 'efficiency': return b.efficiency - a.efficiency;
      default: return 0;
    }
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavigation 
        title="Platform Analytics"
        subtitle="Cross-tenant insights and performance metrics"
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Key Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                  <span className="text-blue-600 font-semibold">🏢</span>
                </div>
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-500">Active Tenants</div>
                <div className="text-2xl font-bold text-gray-900">{analytics.tenantMetrics.activeTenants}</div>
                <div className="text-sm text-gray-600">of {analytics.tenantMetrics.totalTenants} total</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                  <span className="text-green-600 font-semibold">👥</span>
                </div>
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-500">Total Users</div>
                <div className="text-2xl font-bold text-gray-900">{analytics.usageMetrics.totalUsers.toLocaleString()}</div>
                <div className="text-sm text-gray-600">Avg: {analytics.usageMetrics.averageUsagePerTenant.users}/tenant</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-md flex items-center justify-center">
                  <span className="text-yellow-600 font-semibold">💰</span>
                </div>
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-500">Monthly Revenue</div>
                <div className="text-2xl font-bold text-gray-900">${analytics.revenueMetrics.monthlyRecurringRevenue.toLocaleString('en-US', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}</div>
                <div className="text-sm text-green-600">+{analytics.revenueMetrics.revenueGrowthRate}% growth</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 rounded-md flex items-center justify-center">
                  <span className="text-red-600 font-semibold">📉</span>
                </div>
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-500">Churn Rate</div>
                <div className="text-2xl font-bold text-gray-900">{analytics.tenantMetrics.churnRate}%</div>
                <div className="text-sm text-gray-600">Avg lifetime: {analytics.tenantMetrics.averageLifetime} months</div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Usage Analytics */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Feature Adoption</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {analytics.featureUsage.map((feature, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-gray-900">{feature.feature}</h4>
                    <span className="text-sm text-gray-500">{feature.adoptionRate}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${feature.adoptionRate}%` }}
                    ></div>
                  </div>
                  <div className="text-sm text-gray-600">
                    {feature.tenantCount} tenants, {feature.usageCount} total uses
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tenant Comparison */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Tenant Performance Comparison</h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => setSelectedMetric('users')}
                  className={`px-3 py-1 rounded text-sm ${
                    selectedMetric === 'users' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Users
                </button>
                <button
                  onClick={() => setSelectedMetric('revenue')}
                  className={`px-3 py-1 rounded text-sm ${
                    selectedMetric === 'revenue' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Revenue
                </button>
                <button
                  onClick={() => setSelectedMetric('efficiency')}
                  className={`px-3 py-1 rounded text-sm ${
                    selectedMetric === 'efficiency' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Efficiency
                </button>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tenant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Users
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ingredients
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Batches
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Efficiency
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedTenants.slice(0, 10).map((tenant, index) => (
                  <tr key={tenant.tenantId} className={index < 3 ? 'bg-blue-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {index < 3 && (
                          <span className="mr-2 text-lg">
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                          </span>
                        )}
                        <div className="text-sm font-medium text-gray-900">{tenant.tenantName}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {tenant.planName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {tenant.users}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {tenant.ingredients}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {tenant.batches}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${tenant.revenue.toLocaleString('en-US', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {tenant.efficiency}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Performing Tenants */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Top Performing Tenants</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {analytics.topTenants.slice(0, 6).map((tenant, index) => (
                <div key={tenant.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{tenant.name}</h4>
                    <span className={`px-2 py-1 rounded text-xs ${
                      tenant.status === 'ACTIVE' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {tenant.status}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div>Plan: {tenant.planName}</div>
                    <div>Users: {tenant.users}</div>
                    <div>Revenue: ${tenant.revenue.toLocaleString('en-US', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}