"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Navigation from "./Navigation";

interface SimpleAnalyticsData {
  overview: {
    totalIngredients: number;
    totalProducts: number;
    totalBatches: number;
    activeBatches: number;
  };
  inventory: {
    totalValue: number;
    lowStockCount: number;
  };
  production: {
    thisMonth: number;
    lastMonth: number;
  };
}

interface SimpleAnalyticsProps {
  onUpgradeClick: () => void;
}

export function SimpleAnalytics({ onUpgradeClick }: SimpleAnalyticsProps) {
  const { data: session } = useSession();
  const [data, setData] = useState<SimpleAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user) {
      fetchSimpleAnalytics();
    }
  }, [session]);

  const fetchSimpleAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/analytics/simple");
      if (response.status === 403) {
        // User doesn't have access to basicReports feature
        setError("upgrade_required");
        return;
      }
      if (!response.ok) {
        throw new Error("Failed to fetch analytics");
      }
      const analyticsData = await response.json();
      setData(analyticsData);
    } catch (error) {
      console.error("Error fetching simple analytics:", error);
      setError("Failed to load analytics data");
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

  if (error) {
    if (error === "upgrade_required") {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto">
            <div className="text-amber-500 text-4xl mb-4">📊</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Analytics Not Available</h2>
            <p className="text-gray-600 mb-6">
              Analytics and reporting features are not included in your current plan. 
              Upgrade to access detailed insights about your brewery operations.
            </p>
            <button
              onClick={onUpgradeClick}
              className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium"
            >
              Upgrade Plan
            </button>
          </div>
        </div>
      );
    }
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={fetchSimpleAnalytics}
            className="mt-4 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
              <p className="mt-2 text-gray-600">
                Basic analytics for your coffee operations
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="text-amber-600 mr-3">⭐</div>
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    Starter Plan
                  </p>
                  <p className="text-xs text-amber-600">
                    Upgrade for advanced analytics
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="text-2xl mr-3">📦</div>
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Ingredients
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.overview.totalIngredients}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="text-2xl mr-3">☕</div>
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Products
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.overview.totalProducts}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="text-2xl mr-3">🔥</div>
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Batches
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.overview.totalBatches}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="text-2xl mr-3">⚡</div>
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Active Batches
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.overview.activeBatches}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Basic Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Inventory Summary
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Inventory Value</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(data.inventory.totalValue)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Low Stock Items</span>
                  <span className="font-semibold text-red-600">
                    {data.inventory.lowStockCount}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Production Summary
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">This Month</span>
                  <span className="font-semibold text-gray-900">
                    {data.production.thisMonth} batches
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Last Month</span>
                  <span className="font-semibold text-gray-900">
                    {data.production.lastMonth} batches
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Change</span>
                  <span className={`font-semibold ${
                    data.production.thisMonth >= data.production.lastMonth
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}>
                    {data.production.thisMonth >= data.production.lastMonth ? '+' : ''}
                    {data.production.thisMonth - data.production.lastMonth}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Upgrade Prompt */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="text-3xl mr-4">🚀</div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Unlock Advanced Analytics
                </h3>
                <p className="text-gray-600 mt-1">
                  Get detailed trends, alerts, advanced reports, and more insights
                </p>
                <ul className="text-sm text-gray-500 mt-2 space-y-1">
                  <li>• Detailed trend analysis and forecasting</li>
                  <li>• Real-time alerts and notifications</li>
                  <li>• Advanced inventory and production reports</li>
                  <li>• Roast consistency analysis</li>
                  <li>• Yield and waste tracking</li>
                </ul>
              </div>
            </div>
            <button
              onClick={onUpgradeClick}
              className="px-6 py-3 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 transition-colors"
            >
              Upgrade Plan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}