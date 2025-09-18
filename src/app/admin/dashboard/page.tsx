"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { redirect } from "next/navigation";
import AdminNavigation from "../../../components/AdminNavigation";

interface DashboardStats {
  totalTenants: number;
  activeTenants: number;
  totalUsers: number;
  totalRevenue: number;
  monthlyRevenue: number;
  activeSubscriptions: number;
  cancelledSubscriptions: number;
  systemHealth: {
    status: "healthy" | "warning" | "critical";
    uptime: string;
    responseTime: number;
    errorRate: number;
  };
  recentActivity: Array<{
    id: string;
    type:
      | "tenant_created"
      | "subscription_upgraded"
      | "user_registered"
      | "payment_failed";
    description: string;
    timestamp: string;
    tenantName?: string;
  }>;
}

interface TenantGrowth {
  date: string;
  newTenants: number;
  totalTenants: number;
}

interface RevenueData {
  date: string;
  revenue: number;
  subscriptions: number;
}

export default function PlatformAdminDashboard() {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [tenantGrowth, setTenantGrowth] = useState<TenantGrowth[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state for Recent Activity
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);

  // Check if user is platform admin
  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user || session.user.role !== "PLATFORM_ADMIN") {
      redirect("/dashboard");
    }
  }, [session, status]);

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [statsRes, growthRes, revenueRes] = await Promise.all([
          fetch("/api/admin/dashboard/stats", {
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
          }),
          fetch("/api/admin/dashboard/tenant-growth", {
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
          }),
          fetch("/api/admin/dashboard/revenue", {
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
          }),
        ]);

        if (!statsRes.ok || !growthRes.ok || !revenueRes.ok) {
          throw new Error("Failed to fetch dashboard data");
        }

        const [statsData, growthData, revenueDataRes] = await Promise.all([
          statsRes.json(),
          growthRes.json(),
          revenueRes.json(),
        ]);

        setStats(statsData);
        setTenantGrowth(growthData);
        setRevenueData(revenueDataRes);
        setCurrentPage(1); // Reset to first page when data refreshes
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load dashboard"
        );
      } finally {
        setLoading(false);
      }
    };

    if (session?.user?.role === "PLATFORM_ADMIN") {
      fetchDashboardData();
    }
  }, [session]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading platform dashboard...</p>
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

  if (!stats) {
    return null;
  }

  const getSystemHealthColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "text-green-600 bg-green-100";
      case "warning":
        return "text-yellow-600 bg-yellow-100";
      case "critical":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "tenant_created":
        return "🏢";
      case "subscription_upgraded":
        return "⬆️";
      case "user_registered":
        return "👤";
      case "payment_failed":
        return "❌";
      default:
        return "📝";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavigation
        title="Platform Administration"
        subtitle="Monitor and manage your SaaS platform"
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* System Health Status */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                System Health
              </h2>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${getSystemHealthColor(
                  stats.systemHealth.status
                )}`}
              >
                {stats.systemHealth.status.toUpperCase()}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {stats.systemHealth.uptime}
                </div>
                <div className="text-sm text-gray-600">Uptime</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {stats.systemHealth.responseTime}ms
                </div>
                <div className="text-sm text-gray-600">Avg Response Time</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {stats.systemHealth.errorRate}%
                </div>
                <div className="text-sm text-gray-600">Error Rate</div>
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                  <span className="text-blue-600 font-semibold">🏢</span>
                </div>
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-500">
                  Total Tenants
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {stats.totalTenants}
                </div>
                <div className="text-sm text-green-600">
                  {stats.activeTenants} active
                </div>
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
                <div className="text-sm font-medium text-gray-500">
                  Total Users
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {stats.totalUsers.toLocaleString()}
                </div>
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
                <div className="text-sm font-medium text-gray-500">
                  Monthly Revenue
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  ${stats.monthlyRevenue.toLocaleString('en-US', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                </div>
                <div className="text-sm text-gray-600">
                  Total: ${stats.totalRevenue.toLocaleString('en-US', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
                  <span className="text-purple-600 font-semibold">📊</span>
                </div>
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-500">
                  Active Subscriptions
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {stats.activeSubscriptions}
                </div>
                <div className="text-sm text-red-600">
                  {stats.cancelledSubscriptions} cancelled
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts and Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Tenant Growth Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Tenant Growth
            </h3>
            <div className="h-64 flex items-end justify-between space-x-2">
              {tenantGrowth.slice(-7).map((data, index) => {
                const maxTenants = Math.max(
                  ...tenantGrowth.map((d) => d.totalTenants)
                );
                const height = (data.totalTenants / maxTenants) * 100;
                return (
                  <div
                    key={index}
                    className="flex-1 flex flex-col items-center"
                  >
                    <div
                      className="w-full bg-blue-500 rounded-t"
                      style={{ height: `${height}%` }}
                      title={`${data.totalTenants} tenants`}
                    ></div>
                    <div className="text-xs text-gray-600 mt-2">
                      {new Date(data.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Revenue Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Revenue Trend
            </h3>
            <div className="h-64 flex items-end justify-between space-x-2">
              {revenueData.slice(-7).map((data, index) => {
                const maxRevenue = Math.max(
                  ...revenueData.map((d) => d.revenue)
                );
                const height = (data.revenue / maxRevenue) * 100;
                return (
                  <div
                    key={index}
                    className="flex-1 flex flex-col items-center"
                  >
                    <div
                      className="w-full bg-green-500 rounded-t"
                      style={{ height: `${height}%` }}
                      title={`$${data.revenue.toLocaleString('en-US', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}`}
                    ></div>
                    <div className="text-xs text-gray-600 mt-2">
                      {new Date(data.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Recent Activity
              </h3>
              <div className="text-sm text-gray-500">
                Showing{" "}
                {Math.min(
                  (currentPage - 1) * itemsPerPage + 1,
                  stats.recentActivity.length
                )}{" "}
                -{" "}
                {Math.min(
                  currentPage * itemsPerPage,
                  stats.recentActivity.length
                )}{" "}
                of {stats.recentActivity.length}
              </div>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {stats.recentActivity
              .slice(
                (currentPage - 1) * itemsPerPage,
                currentPage * itemsPerPage
              )
              .map((activity) => (
                <div
                  key={activity.id}
                  className="px-6 py-4 flex items-center space-x-3"
                >
                  <div className="text-2xl">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">
                      {activity.description}
                    </p>
                    {activity.tenantName && (
                      <p className="text-xs text-gray-500">
                        Tenant: {activity.tenantName}
                      </p>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(activity.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            {stats.recentActivity.length === 0 && (
              <div className="px-6 py-8 text-center text-gray-500">
                <div className="text-4xl mb-2">📝</div>
                <p>No recent activity found</p>
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {stats.recentActivity.length > itemsPerPage && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-700">
                  Page {currentPage} of{" "}
                  {Math.ceil(stats.recentActivity.length / itemsPerPage)}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((prev) =>
                      Math.min(
                        prev + 1,
                        Math.ceil(stats.recentActivity.length / itemsPerPage)
                      )
                    )
                  }
                  disabled={
                    currentPage ===
                    Math.ceil(stats.recentActivity.length / itemsPerPage)
                  }
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Next
                </button>
              </div>

              {/* Page Numbers */}
              <div className="flex items-center space-x-1">
                {Array.from(
                  {
                    length: Math.ceil(
                      stats.recentActivity.length / itemsPerPage
                    ),
                  },
                  (_, i) => i + 1
                )
                  .filter((page) => {
                    const totalPages = Math.ceil(
                      stats.recentActivity.length / itemsPerPage
                    );
                    if (totalPages <= 7) return true;
                    if (page === 1 || page === totalPages) return true;
                    if (page >= currentPage - 1 && page <= currentPage + 1)
                      return true;
                    return false;
                  })
                  .map((page, index, array) => {
                    const prevPage = array[index - 1];
                    const showEllipsis = prevPage && page - prevPage > 1;

                    return (
                      <div key={page} className="flex items-center">
                        {showEllipsis && (
                          <span className="px-2 py-1 text-sm text-gray-500">
                            ...
                          </span>
                        )}
                        <button
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-1 text-sm rounded-md ${
                            currentPage === page
                              ? "bg-blue-600 text-white"
                              : "text-gray-700 hover:bg-gray-50 border border-gray-300 cursor-pointer"
                          }`}
                        >
                          {page}
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <a
            href="/admin/tenants"
            className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
          >
            <div className="text-center">
              <div className="text-3xl mb-2">🏢</div>
              <h4 className="font-semibold text-gray-900">Manage Tenants</h4>
              <p className="text-sm text-gray-600 mt-1">
                View and manage all tenants
              </p>
            </div>
          </a>

          <a
            href="/admin/subscription-plans"
            className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
          >
            <div className="text-center">
              <div className="text-3xl mb-2">💳</div>
              <h4 className="font-semibold text-gray-900">
                Subscription Plans
              </h4>
              <p className="text-sm text-gray-600 mt-1">
                Manage pricing and plans
              </p>
            </div>
          </a>

          <a
            href="/admin/analytics"
            className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
          >
            <div className="text-center">
              <div className="text-3xl mb-2">📊</div>
              <h4 className="font-semibold text-gray-900">Analytics</h4>
              <p className="text-sm text-gray-600 mt-1">
                View detailed analytics
              </p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
