"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navigation from "../../components/Navigation";
import ProtectedPage from "../../components/ProtectedPage";
import AnimatedTooltip from "@/components/AnimatedTooltip";
import { SimpleAnalytics } from "@/components/SimpleAnalytics";

interface DashboardData {
  overview: {
    totalIngredients: number;
    totalProducts: number;
    totalBatches: number;
    activeBatches: number;
    inventoryValue: number;
    productionEfficiency: number;
  };
  trends: {
    batchTrend: number;
    period: number;
  };
  alerts: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  inventory: {
    lowStock: Array<{
      id: string;
      name: string;
      stockQuantity: number;
      minimumThreshold: number;
      unitOfMeasure: string;
    }>;
    expiring: Array<{
      id: string;
      name: string;
      expirationDate: string;
      stockQuantity: number;
      unitOfMeasure: string;
    }>;
  };
  production: {
    recentBatches: Array<{
      id: string;
      batchNumber: string;
      status: string;
      actualYield?: number;
      roastLoss?: number;
      createdAt: string;
      recipe?: {
        name: string;
        style: string;
      };
    }>;
    statusDistribution: Array<{
      status: string;
      _count: { id: number };
    }>;
    dailyTrend: Array<{
      date: string;
      batches: number;
      totalYield: number;
    }>;
    totalYield: number;
    totalLoss: number;
    averageYield: number;
    averageLoss: number;
  };
  schedule: {
    upcoming: Array<{
      id: string;
      title: string;
      type: string;
      startDate: string;
    }>;
  };
  period: {
    days: number;
    startDate: string;
    endDate: string;
  };
}

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("30");
  const [hasAdvancedAnalytics, setHasAdvancedAnalytics] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/auth/signin");
      return;
    }

    fetchDashboardData();
    checkAnalyticsAccess();
  }, [session, status, router, period]);

  const checkAnalyticsAccess = async () => {
    if (!session?.user?.tenantId) return;

    try {
      const response = await fetch(
        "/api/subscription/features?feature=advancedReports"
      );
      const data = await response.json();
      console.log("ANALYTICS ACCESS CHECK:", data);
      setHasAdvancedAnalytics(data.hasAccess || false);
    } catch (error) {
      console.error("Error checking analytics access:", error);
      setHasAdvancedAnalytics(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/dashboard/analytics?period=${period}`);
      if (!response.ok) {
        throw new Error("Failed to fetch dashboard data");
      }
      const dashboardData = await response.json();
      setData(dashboardData);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "roasting":
      case "cooling":
      case "packaging":
        return "bg-yellow-100 text-yellow-800";
      case "ready":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getAlertColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return "bg-red-500";
      case "high":
        return "bg-orange-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return "↗";
    if (trend < 0) return "↘";
    return "→";
  };

  const getTrendColor = (trend: number) => {
    if (trend > 0) return "text-green-600";
    if (trend < 0) return "text-red-600";
    return "text-gray-600";
  };

  const isDemoTenant = session?.user?.email === "admin@demo.coffeeshop";
  if (!hasAdvancedAnalytics && !isDemoTenant) {
    return (
      <SimpleAnalytics
        onUpgradeClick={() =>
          router.push("/subscription?src=feature_gate_analytics")
        }
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error || "Failed to load dashboard data"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <ProtectedPage requiredPermission="reports">
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Analytics Dashboard
                </h1>
                <p className="mt-2 text-gray-600">
                  Comprehensive insights into your coffee shop operations
                </p>
              </div>
              <div>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
                >
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                  <option value="365">Last year</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="text-2xl mr-3 flex-shrink-0">📦</div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-600">
                    Ingredients
                  </p>
                  <p className="text-2xl font-bold text-gray-900 break-words">
                    {data.overview.totalIngredients}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="text-2xl mr-3 flex-shrink-0">☕</div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-600">Products</p>
                  <p className="text-2xl font-bold text-gray-900 break-words">
                    {data.overview.totalProducts}
                  </p>
                </div>
              </div>
            </div>

            <AnimatedTooltip content="Total number of coffee roasting batches processed during the selected time period">
              <div className="bg-white rounded-lg shadow p-6 cursor-help hover:shadow-lg transition-shadow duration-200">
                <div className="flex items-center">
                  <div className="text-2xl mr-3 flex-shrink-0">🔥</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-600">
                      Total Batches
                    </p>
                    <p className="text-2xl font-bold text-gray-900 break-words">
                      {data.overview.totalBatches}
                    </p>
                    <div
                      className={`flex items-center text-sm ${getTrendColor(
                        data.trends.batchTrend
                      )}`}
                    >
                      <span className="mr-1">
                        {getTrendIcon(data.trends.batchTrend)}
                      </span>
                      <span>
                        {Math.abs(data.trends.batchTrend).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </AnimatedTooltip>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="text-2xl mr-3 flex-shrink-0">⚡</div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-600">
                    Active Batches
                  </p>
                  <p className="text-2xl font-bold text-gray-900 break-words">
                    {data.overview.activeBatches}
                  </p>
                </div>
              </div>
            </div>

            <AnimatedTooltip content="Total monetary value of all ingredients and materials currently in stock">
              <div className="bg-white rounded-lg shadow p-6 cursor-help hover:shadow-lg transition-shadow duration-200">
                <div className="flex items-center">
                  <div className="text-2xl mr-3 flex-shrink-0">💰</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-600">
                      Inventory Value
                    </p>
                    <p className="text-2xl font-bold text-gray-900 break-words">
                      {formatCurrency(data.overview.inventoryValue)}
                    </p>
                  </div>
                </div>
              </div>
            </AnimatedTooltip>

            <AnimatedTooltip content="Production efficiency percentage based on actual yield vs expected yield across all batches">
              <div className="bg-white rounded-lg shadow p-6 cursor-help hover:shadow-lg transition-shadow duration-200">
                <div className="flex items-center">
                  <div className="text-2xl mr-3 flex-shrink-0">📊</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-600">
                      Efficiency
                    </p>
                    <p className="text-2xl font-bold text-gray-900 break-words">
                      {data.overview.productionEfficiency}%
                    </p>
                  </div>
                </div>
              </div>
            </AnimatedTooltip>
          </div>

          {data.alerts.total > 0 && (
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Active Alerts
              </h2>
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <div
                    className={`w-3 h-3 rounded-full ${getAlertColor(
                      "critical"
                    )} mr-2`}
                  ></div>
                  <span className="text-sm text-gray-600">
                    Critical: {data.alerts.critical}
                  </span>
                </div>
                <div className="flex items-center">
                  <div
                    className={`w-3 h-3 rounded-full ${getAlertColor(
                      "high"
                    )} mr-2`}
                  ></div>
                  <span className="text-sm text-gray-600">
                    High: {data.alerts.high}
                  </span>
                </div>
                <div className="flex items-center">
                  <div
                    className={`w-3 h-3 rounded-full ${getAlertColor(
                      "medium"
                    )} mr-2`}
                  ></div>
                  <span className="text-sm text-gray-600">
                    Medium: {data.alerts.medium}
                  </span>
                </div>
                <div className="flex items-center">
                  <div
                    className={`w-3 h-3 rounded-full ${getAlertColor(
                      "low"
                    )} mr-2`}
                  ></div>
                  <span className="text-sm text-gray-600">
                    Low: {data.alerts.low}
                  </span>
                </div>
                <div className="ml-auto">
                  <span className="text-lg font-semibold text-gray-900">
                    Total: {data.alerts.total}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Low Stock Ingredients
                </h2>
              </div>
              <div className="p-6">
                {data.inventory.lowStock.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    No low stock items
                  </p>
                ) : (
                  <div className="space-y-3">
                    {data.inventory.lowStock.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between items-center p-3 bg-red-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-900">
                            {item.name}
                          </p>
                          <p className="text-sm text-gray-600">
                            Stock: {Number(item.stockQuantity)}{" "}
                            {item.unitOfMeasure}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-red-600 font-medium">
                            Min: {Number(item.minimumThreshold)}{" "}
                            {item.unitOfMeasure}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Expiring Soon
                </h2>
              </div>
              <div className="p-6">
                {data.inventory.expiring.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    No items expiring soon
                  </p>
                ) : (
                  <div className="space-y-3">
                    {data.inventory.expiring.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-900">
                            {item.name}
                          </p>
                          <p className="text-sm text-gray-600">
                            Stock: {Number(item.stockQuantity)}{" "}
                            {item.unitOfMeasure}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-yellow-600 font-medium">
                            Expires: {formatDate(item.expirationDate)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Recent Batches
                </h2>
              </div>
              <div className="p-6">
                {data.production.recentBatches.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    No recent batches
                  </p>
                ) : (
                  <div className="space-y-3">
                    {data.production.recentBatches.slice(0, 5).map((batch) => (
                      <div
                        key={batch.id}
                        className="flex justify-between items-center p-3 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-900">
                            {batch.batchNumber}
                          </p>
                          <p className="text-sm text-gray-600">
                            {batch.recipe?.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDateTime(batch.createdAt)}
                          </p>
                        </div>
                        <div className="text-right">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                              batch.status
                            )}`}
                          >
                            {batch.status}
                          </span>
                          {batch.actualYield && (
                            <p className="text-sm text-gray-600 mt-1">
                              Yield: {Number(batch.actualYield)}kg
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Production Summary
                </h2>
                <p className="text-sm text-gray-600">
                  Last {data.period.days} days
                </p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">
                      {data.production.totalYield.toFixed(1)}kg
                    </p>
                    <p className="text-sm text-gray-600">Total Yield</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <p className="text-2xl font-bold text-red-600">
                      {data.production.totalLoss.toFixed(1)}kg
                    </p>
                    <p className="text-sm text-gray-600">Total Loss</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">
                      {data.production.averageYield.toFixed(1)}kg
                    </p>
                    <p className="text-sm text-gray-600">Avg Yield per Batch</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <p className="text-2xl font-bold text-yellow-600">
                      {data.production.averageLoss.toFixed(1)}kg
                    </p>
                    <p className="text-sm text-gray-600">Avg Loss per Batch</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {data.schedule.upcoming.length > 0 && (
            <div className="bg-white rounded-lg shadow mb-8">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Upcoming Schedule
                </h2>
                <p className="text-sm text-gray-600">Next 7 days</p>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {data.schedule.upcoming.map((schedule) => (
                    <div
                      key={schedule.id}
                      className="flex justify-between items-center p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {schedule.title}
                        </p>
                        <p className="text-sm text-gray-600">
                          {schedule.type.replace("_", " ")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">
                          {formatDateTime(schedule.startDate)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Quick Actions
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button
                  onClick={() => router.push("/batches")}
                  className="p-4 text-center border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="text-2xl mb-2">🔥</div>
                  <p className="text-sm font-medium">New Batch</p>
                </button>
                <button
                  onClick={() => router.push("/ingredients")}
                  className="p-4 text-center border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="text-2xl mb-2">📦</div>
                  <p className="text-sm font-medium">Manage Inventory</p>
                </button>
                <button
                  onClick={() => router.push("/alerts")}
                  className="p-4 text-center border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="text-2xl mb-2">🚨</div>
                  <p className="text-sm font-medium">View Alerts</p>
                </button>
                <button
                  onClick={() => router.push("/schedules")}
                  className="p-4 text-center border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="text-2xl mb-2">📅</div>
                  <p className="text-sm font-medium">Schedule</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedPage>
  );
}
