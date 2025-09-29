"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Navigation from "./Navigation";

interface SimpleReportsData {
  inventory: {
    totalItems: number;
    totalValue: number;
    lowStockItems: Array<{
      name: string;
      stockQuantity: number;
      minimumThreshold: number;
      unitOfMeasure: string;
    }>;
    topValueItems: Array<{
      name: string;
      totalValue: number;
      stockQuantity: number;
      unitOfMeasure: string;
    }>;
  };
  production: {
    totalBatches: number;
    completedBatches: number;
    averageYield: number;
    recentBatches: Array<{
      id: string;
      recipeName: string;
      status: string;
      createdAt: string;
      yieldPercentage?: number;
    }>;
  };
}

interface SimpleReportsProps {
  onUpgradeClick: () => void;
}

export function SimpleReports({ onUpgradeClick }: SimpleReportsProps) {
  const { data: session } = useSession();
  const [data, setData] = useState<SimpleReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("inventory");

  useEffect(() => {
    if (session?.user) {
      fetchSimpleReports();
    }
  }, [session]);

  const fetchSimpleReports = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/reports/simple");
      if (response.status === 403) {
        // User doesn't have access to basicReports feature
        setError("upgrade_required");
        return;
      }
      if (!response.ok) {
        throw new Error("Failed to fetch reports");
      }
      const reportsData = await response.json();
      setData(reportsData);
    } catch (error) {
      console.error("Error fetching simple reports:", error);
      setError("Failed to load reports data");
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
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "green_beans":
        return "bg-green-100 text-green-800";
      case "planned":
        return "bg-gray-100 text-gray-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    if (error === "upgrade_required") {
      return (
        <div className="min-h-screen bg-gray-50">
          <Navigation />
          <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
            <div className="text-center max-w-md mx-auto">
              <div className="text-amber-500 text-4xl mb-4">📊</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Reports Not Available
              </h2>
              <p className="text-gray-600 mb-6">
                Reporting features are not included in your current plan.
                Upgrade to access detailed reports about your brewery
                operations.
              </p>
              <button
                onClick={onUpgradeClick}
                className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium"
              >
                Upgrade Plan
              </button>
            </div>
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
            onClick={fetchSimpleReports}
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
              <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
              <p className="mt-2 text-gray-600">
                Basic reports for your coffee operations
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
                    Upgrade for advanced reports
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab("inventory")}
                className={`py-4 px-1 border-b-2 font-medium text-sm cursor-pointer ${
                  activeTab === "inventory"
                    ? "border-amber-500 text-amber-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                📦 Inventory Summary
              </button>
              <button
                onClick={() => setActiveTab("production")}
                className={`py-4 px-1 border-b-2 font-medium text-sm cursor-pointer ${
                  activeTab === "production"
                    ? "border-amber-500 text-amber-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                🔥 Production Summary
              </button>
              <button
                className="py-4 px-1 border-b-2 border-transparent text-gray-400 cursor-not-allowed"
                disabled
              >
                📊 Advanced Reports 🔒
              </button>
            </nav>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Inventory Report */}
        {activeTab === "inventory" && (
          <div className="space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="text-2xl mr-3">💰</div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Total Inventory Value
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(data.inventory.totalValue)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="text-2xl mr-3">📦</div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Total Items
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {data.inventory.totalItems}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Value Items and Low Stock */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Top Value Items
                  </h2>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {data.inventory.topValueItems
                      .slice(0, 5)
                      .map((item, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center p-3 border rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-gray-900">
                              {item.name}
                            </p>
                            <p className="text-sm text-gray-600">
                              {Number(item.stockQuantity)} {item.unitOfMeasure}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">
                              {formatCurrency(item.totalValue)}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Low Stock Items
                  </h2>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {data.inventory.lowStockItems
                      .slice(0, 5)
                      .map((item, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center p-3 border rounded-lg bg-red-50"
                        >
                          <div>
                            <p className="font-medium text-gray-900">
                              {item.name}
                            </p>
                            <p className="text-sm text-gray-600">
                              Stock: {Number(item.stockQuantity)} / Min:{" "}
                              {Number(item.minimumThreshold)}{" "}
                              {item.unitOfMeasure}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                              Low Stock
                            </span>
                          </div>
                        </div>
                      ))}
                    {data.inventory.lowStockItems.length === 0 && (
                      <p className="text-gray-500 text-center py-4">
                        No low stock items
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Production Report */}
        {activeTab === "production" && (
          <div className="space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="text-2xl mr-3">🔥</div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Total Batches
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {data.production.totalBatches}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="text-2xl mr-3">✅</div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Completed Batches
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {data.production.completedBatches}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="text-2xl mr-3">📈</div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Average Yield
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {data.production.averageYield.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Batches */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Recent Batches
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {data.production.recentBatches.map((batch) => (
                    <div
                      key={batch.id}
                      className="flex justify-between items-center p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {batch.recipeName}
                        </p>
                        <p className="text-sm text-gray-600">
                          {formatDate(batch.createdAt)}
                        </p>
                      </div>
                      <div className="text-right flex items-center space-x-3">
                        {batch.yieldPercentage && (
                          <span className="text-sm text-gray-600">
                            {batch.yieldPercentage.toFixed(1)}% yield
                          </span>
                        )}
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                            batch.status
                          )}`}
                        >
                          {batch.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Upgrade Prompt */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-6 mt-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="text-3xl mr-4">📊</div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Unlock Advanced Reports
                </h3>
                <p className="text-gray-600 mt-1">
                  Get detailed analytics, risk analysis, and comprehensive
                  reporting
                </p>
                <ul className="text-sm text-gray-500 mt-2 space-y-1">
                  <li>• Detailed inventory valuation and risk analysis</li>
                  <li>• Roast consistency and quality reports</li>
                  <li>• Yield analysis and waste tracking</li>
                  <li>• Historical trends and forecasting</li>
                  <li>• Export reports to PDF and Excel</li>
                </ul>
              </div>
            </div>
            <button
              onClick={onUpgradeClick}
              className="px-6 py-3 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 transition-colors cursor-pointer"
            >
              Upgrade Plan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
