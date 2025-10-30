"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface WasteTrackingData {
  summary: {
    totalWasteVolume: number;
    totalWasteCost: number;
    wasteItemCount: number;
    averageWastePerItem: number;
    unitBreakdown?: Array<{
      unit: string;
      volume: number;
      count: number;
    }>;
  };
  categories: Array<{
    category: string;
    name: string;
    volume: number;
    cost: number;
    itemCount: number;
    percentage: number;
  }>;
  trends: Array<{
    week: string;
    volume: number;
    cost: number;
    itemCount: number;
  }>;
  bySources: Array<{
    source: string;
    volume: number;
    cost: number;
    itemCount: number;
    percentage: number;
  }>;
  topWasteItems: Array<{
    id: string;
    ingredientName: string;
    volume: number;
    cost: number;
    date: string;
    reason: string;
    type: string;
  }>;
  recommendations: Array<{
    type: string;
    priority: string;
    title: string;
    message: string;
    impact: string;
  }>;
}

interface WasteTrackingReportProps {
  period: string;
}

export function WasteTrackingReport({ period }: WasteTrackingReportProps) {
  const { data: session } = useSession();
  const [data, setData] = useState<WasteTrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (session?.user?.tenantId) {
      fetchWasteTracking();
    }
  }, [session, period]);

  const fetchWasteTracking = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/reports/waste-tracking?period=${period}`, {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch waste tracking data");
      }

      const wasteData = await response.json();
      setData(wasteData);
    } catch (error) {
      console.error("Error fetching waste tracking:", error);
      setError("Failed to load waste tracking report");
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

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case "production":
        return "bg-blue-100 text-blue-800";
      case "quality":
        return "bg-red-100 text-red-800";
      case "expiration":
        return "bg-yellow-100 text-yellow-800";
      case "process":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "high":
        return "bg-red-50 border-red-200 text-red-800";
      case "medium":
        return "bg-yellow-50 border-yellow-200 text-yellow-800";
      case "low":
        return "bg-blue-50 border-blue-200 text-blue-800";
      default:
        return "bg-gray-50 border-gray-200 text-gray-800";
    }
  };

  const getWasteTypeIcon = (type: string) => {
    switch (type) {
      case "direct_waste":
        return "🗑️";
      case "yield_loss":
        return "📉";
      case "expiration":
        return "⏰";
      default:
        return "❓";
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading waste tracking...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-lg shadow p-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Report</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchWasteTracking}
            className="bg-amber-600 text-white px-4 py-2 rounded-md hover:bg-amber-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="text-2xl mr-3">🗑️</div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Volume</p>
              <p className="text-2xl font-bold text-gray-900">
                {data.summary.totalWasteVolume.toFixed(1)}
              </p>
              {data.summary.unitBreakdown && data.summary.unitBreakdown.length > 0 && (
                <div className="text-xs text-gray-500 space-y-1">
                  {data.summary.unitBreakdown.map((unit) => (
                    <div key={unit.unit}>
                      {unit.volume.toFixed(1)} {unit.unit} ({unit.count} items)
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="text-2xl mr-3">💰</div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Cost</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(data.summary.totalWasteCost)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="text-2xl mr-3">📊</div>
            <div>
              <p className="text-sm font-medium text-gray-600">Waste Items</p>
              <p className="text-2xl font-bold text-gray-900">
                {data.summary.wasteItemCount}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="text-2xl mr-3">📏</div>
            <div>
              <p className="text-sm font-medium text-gray-600">Avg per Item</p>
              <p className="text-2xl font-bold text-gray-900">
                {data.summary.averageWastePerItem.toFixed(1)}
              </p>
              <p className="text-xs text-gray-500">
                Mixed units average
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Unit Breakdown */}
      {data.summary.unitBreakdown && data.summary.unitBreakdown.length > 1 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Volume by Unit Type</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {data.summary.unitBreakdown.map((unit) => (
                <div key={unit.unit} className="text-center p-4 border rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">
                    {unit.volume.toFixed(1)}
                  </p>
                  <p className="text-sm font-medium text-gray-600">
                    {unit.unit}
                  </p>
                  <p className="text-xs text-gray-500">
                    {unit.count} items
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Waste Categories */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Waste by Category</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {data.categories.map((category, index) => (
              <div key={index} className="text-center p-4 border rounded-lg">
                <div className="mb-2">
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${getCategoryColor(category.category)}`}>
                    {category.name}
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {category.volume.toFixed(1)}
                </p>
                <p className="text-xs text-gray-500">
                  Mixed units
                </p>
                <p className="text-sm text-gray-600">
                  {formatCurrency(category.cost)}
                </p>
                <p className="text-xs text-gray-500">
                  {category.percentage.toFixed(1)}% of total
                </p>
                <p className="text-xs text-gray-500">
                  {category.itemCount} items
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Waste Reduction Recommendations</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {data.recommendations.map((rec, index) => (
                <div
                  key={index}
                  className={`p-4 border rounded-lg ${getPriorityColor(rec.priority)}`}
                >
                  <div className="flex items-start">
                    <div className="mr-3 mt-1">
                      {rec.priority === "high" && "🔴"}
                      {rec.priority === "medium" && "🟡"}
                      {rec.priority === "low" && "🔵"}
                    </div>
                    <div>
                      <p className="font-medium">{rec.title}</p>
                      <p className="text-sm mt-1">{rec.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Waste Sources Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* By Source */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Waste by Source</h2>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {data.bySources.map((source, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center p-3 border rounded-lg"
                >
                  <div className="flex items-center">
                    <span className="text-lg mr-2">{getWasteTypeIcon(source.source)}</span>
                    <div>
                      <p className="font-medium text-gray-900 capitalize">
                        {source.source.replace("_", " ")}
                      </p>
                      <p className="text-sm text-gray-600">{source.itemCount} items</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {source.volume.toFixed(1)} mixed units
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatCurrency(source.cost)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {source.percentage.toFixed(1)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Waste Items */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Highest Cost Waste Items</h2>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {data.topWasteItems.slice(0, 5).map((item, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center p-3 border rounded-lg"
                >
                  <div className="flex items-center">
                    <span className="text-lg mr-2">{getWasteTypeIcon(item.type)}</span>
                    <div>
                      <p className="font-medium text-gray-900">{item.ingredientName}</p>
                      <p className="text-sm text-gray-600">{item.reason}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(item.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {formatCurrency(item.cost)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {item.volume.toFixed(1)} mixed units
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Trends Chart Placeholder */}
      {data.trends.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Waste Trends (Last 12 Weeks)</h2>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Week
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Volume
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cost
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Items
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.trends.slice(-8).map((trend, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {new Date(trend.week).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {trend.volume.toFixed(1)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(trend.cost)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {trend.itemCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}