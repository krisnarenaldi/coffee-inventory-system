"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import ProtectedPage from "@/components/ProtectedPage";
import AnimatedTooltip from "@/components/AnimatedTooltip";
import { SimpleReports } from "@/components/SimpleReports";

interface InventoryValuation {
  summary: {
    totalItems: number;
    totalValue: number;
    minimumRequiredValue: number;
    excessValue: number;
    averageValue: number;
  };
  byCategory: Array<{
    category: string;
    totalValue: number;
    count: number;
  }>;
  riskAnalysis: {
    highRisk: { count: number; value: number };
    mediumRisk: { count: number; value: number };
    lowRisk: { count: number; value: number };
  };
  topValueItems: Array<{
    name: string;
    totalValue: number;
    stockQuantity: number;
    unitOfMeasure: string;
  }>;
  attentionItems: Array<{
    name: string;
    riskLevel: string;
    totalValue: number;
    stockQuantity: number;
    minimumThreshold: number;
    unitOfMeasure: string;
  }>;
}

interface RoastConsistency {
  summary: {
    totalBatches: number;
    averageYield: number;
    averageLoss: number;
    averageYieldVariance: number;
    averageLossPercentage: number;
    averageCuppingScore: number;
  };
  consistency: {
    yield: { stdDev: number; rating: string };
    loss: { stdDev: number; rating: string };
    time: { stdDev: number; rating: string };
    temperature: { stdDev: number; rating: string };
  };
  recommendations: Array<{
    type: string;
    priority: string;
    message: string;
  }>;
  byRecipe: Array<{
    recipeName: string;
    count: number;
    averageYield: number;
    yieldConsistency: number;
  }>;
  byRoaster: Array<{
    roasterName: string;
    count: number;
    averageYield: number;
    consistency: number;
    averageCuppingScore: number;
  }>;
}

export default function ReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("inventory");
  const [inventoryData, setInventoryData] = useState<InventoryValuation | null>(
    null
  );
  const [consistencyData, setConsistencyData] =
    useState<RoastConsistency | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("90");
  const [hasAdvancedReports, setHasAdvancedReports] = useState(false);
  const [hasBasicReports, setHasBasicReports] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/auth/signin");
      return;
    }
    checkReportsAccess();
    if (activeTab === "inventory") {
      fetchInventoryValuation();
    } else if (activeTab === "consistency") {
      fetchRoastConsistency();
    }
  }, [session, status, router, activeTab, period]);

  const checkReportsAccess = async () => {
    if (!session?.user?.tenantId) return;

    try {
      // Check for both basic and advanced reports access
      const [basicResponse, advancedResponse] = await Promise.all([
        fetch(
          `/api/subscription/features?feature=basicReports&t=${Date.now()}`,
          {
            credentials: "include",
            cache: "no-cache",
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-cache, no-store, must-revalidate",
              Pragma: "no-cache",
              Expires: "0",
            },
          }
        ),
        fetch(
          `/api/subscription/features?feature=advancedReports&t=${Date.now()}`,
          {
            credentials: "include",
            cache: "no-cache",
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-cache, no-store, must-revalidate",
              Pragma: "no-cache",
              Expires: "0",
            },
          }
        )
      ]);

      const [basicData, advancedData] = await Promise.all([
        basicResponse.json(),
        advancedResponse.json()
      ]);

      console.log("🔍 REPORTS: Basic reports check:", basicData);
      console.log("🔍 REPORTS: Advanced reports check:", advancedData);
      
      const hasBasicReportsAccess = basicData.hasAccess || false;
      const hasAdvancedReportsAccess = advancedData.hasAccess || false;
      
      setHasBasicReports(hasBasicReportsAccess);
      setHasAdvancedReports(hasAdvancedReportsAccess);
    } catch (error) {
      console.error("Error checking reports access:", error);
      setHasAdvancedReports(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/reports/export/pdf?tab=${activeTab}&period=${period}`,
        {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to export PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `${activeTab}-report-${
        new Date().toISOString().split("T")[0]
      }.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error exporting PDF:", error);
      setError("Failed to export PDF. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/reports/export/excel?tab=${activeTab}&period=${period}`,
        {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to export CSV");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `${activeTab}-report-${
        new Date().toISOString().split("T")[0]
      }.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error exporting CSV:", error);
      setError("Failed to export CSV. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchInventoryValuation = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/reports/inventory-valuation", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch inventory valuation");
      }
      const data = await response.json();
      setInventoryData(data);
    } catch (error) {
      console.error("Error fetching inventory valuation:", error);
      setError("Failed to load inventory valuation report");
    } finally {
      setLoading(false);
    }
  };

  const fetchRoastConsistency = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/reports/roast-consistency?period=${period}`,
        {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      if (!response.ok) {
        throw new Error("Failed to fetch roast consistency");
      }
      const data = await response.json();
      setConsistencyData(data);
    } catch (error) {
      console.error("Error fetching roast consistency:", error);
      setError("Failed to load roast consistency report");
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

  const getRiskColor = (level: string) => {
    switch (level.toLowerCase()) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getConsistencyColor = (rating: string) => {
    switch (rating.toLowerCase()) {
      case "excellent":
        return "text-green-600";
      case "good":
        return "text-blue-600";
      case "fair":
        return "text-yellow-600";
      case "poor":
        return "text-red-600";
      default:
        return "text-gray-600";
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

  // Show simple reports for users without advanced reports access
  // Only users with advancedReports should see the full reports page
  if (!hasAdvancedReports) {
    const handleUpgradeClick = () => {
      router.push("/subscription?src=feature_gate_reports");
    };

    return <SimpleReports onUpgradeClick={handleUpgradeClick} />;
  }

  if (loading && !inventoryData && !consistencyData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading reports...</p>
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
                  Reports & Analytics
                </h1>
                <p className="mt-2 text-gray-600">
                  Detailed insights and analysis for your coffee operations
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => handleExportPDF()}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 cursor-pointer"
                >
                  <svg
                    className="-ml-1 mr-2 h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Export PDF
                </button>
                <button
                  onClick={() => handleExportCSV()}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 cursor-pointer"
                >
                  <svg
                    className="-ml-1 mr-2 h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Export CSV
                </button>
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
                  📦 Inventory Valuation
                </button>
                <button
                  onClick={() => setActiveTab("consistency")}
                  className={`py-4 px-1 border-b-2 font-medium text-sm cursor-pointer ${
                    activeTab === "consistency"
                      ? "border-amber-500 text-amber-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  ☕ Roast Consistency
                </button>
                <button
                  onClick={() => setActiveTab("yield")}
                  className={`py-4 px-1 border-b-2 font-medium text-sm cursor-pointer ${
                    activeTab === "yield"
                      ? "border-amber-500 text-amber-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  📊 Yield Analysis
                </button>
                <button
                  onClick={() => setActiveTab("waste")}
                  className={`py-4 px-1 border-b-2 font-medium text-sm cursor-pointer ${
                    activeTab === "waste"
                      ? "border-amber-500 text-amber-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  🗑️ Waste Tracking
                </button>
              </nav>
            </div>

            {/* Period Selector for time-based reports */}
            {(activeTab === "consistency" ||
              activeTab === "yield" ||
              activeTab === "waste") && (
              <div className="px-6 py-4 bg-gray-50">
                <div className="flex items-center space-x-4">
                  <label className="text-sm font-medium text-gray-700">
                    Time Period:
                  </label>
                  <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500"
                  >
                    <option value="30">Last 30 days</option>
                    <option value="90">Last 90 days</option>
                    <option value="180">Last 6 months</option>
                    <option value="365">Last year</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {/* Inventory Valuation Report */}
          {activeTab === "inventory" && inventoryData && (
            <div className="space-y-8">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <AnimatedTooltip content="The total monetary value of all inventory items (stock quantity × cost per unit)">
                  <div className="bg-white rounded-lg shadow p-6 cursor-help hover:shadow-lg transition-shadow duration-200">
                    <div className="flex items-center">
                      <div className="text-2xl mr-3">💰</div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          Total Value
                        </p>
                        <p className="text-2xl font-bold text-gray-900">
                          {formatCurrency(inventoryData.summary.totalValue)}
                        </p>
                      </div>
                    </div>
                  </div>
                </AnimatedTooltip>

                <AnimatedTooltip content="The total number of different inventory items in stock">
                  <div className="bg-white rounded-lg shadow p-6 cursor-help hover:shadow-lg transition-shadow duration-200">
                    <div className="flex items-center">
                      <div className="text-2xl mr-3">📦</div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          Total Items
                        </p>
                        <p className="text-2xl font-bold text-gray-900">
                          {inventoryData.summary.totalItems}
                        </p>
                      </div>
                    </div>
                  </div>
                </AnimatedTooltip>

                <AnimatedTooltip content="The minimum monetary value needed to maintain safe stock levels (minimum threshold × cost per unit)">
                  <div className="bg-white rounded-lg shadow p-6 cursor-help hover:shadow-lg transition-shadow duration-200">
                    <div className="flex items-center">
                      <div className="text-2xl mr-3">⚠️</div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          Min Required
                        </p>
                        <p className="text-2xl font-bold text-gray-900">
                          {formatCurrency(
                            inventoryData.summary.minimumRequiredValue
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </AnimatedTooltip>

                <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow duration-200">
                  <div className="flex items-center">
                    <div className="text-2xl mr-3">📈</div>
                    <div>
                      <AnimatedTooltip content="The monetary value of inventory exceeding minimum stock requirements (excess stock × cost per unit)">
                        <p className="text-sm font-medium text-gray-600 cursor-help">
                          Excess Value
                        </p>
                      </AnimatedTooltip>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(inventoryData.summary.excessValue)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Risk Analysis */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Risk Analysis
                  </h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <p className="text-2xl font-bold text-red-600">
                        {inventoryData.riskAnalysis.highRisk.count}
                      </p>
                      <p className="text-sm text-gray-600">High Risk Items</p>
                      <p className="text-xs text-gray-500">
                        {formatCurrency(
                          inventoryData.riskAnalysis.highRisk.value
                        )}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <p className="text-2xl font-bold text-yellow-600">
                        {inventoryData.riskAnalysis.mediumRisk.count}
                      </p>
                      <p className="text-sm text-gray-600">Medium Risk Items</p>
                      <p className="text-xs text-gray-500">
                        {formatCurrency(
                          inventoryData.riskAnalysis.mediumRisk.value
                        )}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">
                        {inventoryData.riskAnalysis.lowRisk.count}
                      </p>
                      <p className="text-sm text-gray-600">Low Risk Items</p>
                      <p className="text-xs text-gray-500">
                        {formatCurrency(
                          inventoryData.riskAnalysis.lowRisk.value
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Value Items and Attention Items */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Top Value Items
                    </h2>
                  </div>
                  <div className="p-6">
                    <div className="space-y-3">
                      {inventoryData.topValueItems
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
                                {Number(item.stockQuantity)}{" "}
                                {item.unitOfMeasure}
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
                      Items Requiring Attention
                    </h2>
                  </div>
                  <div className="p-6">
                    <div className="space-y-3">
                      {inventoryData.attentionItems
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
                                Stock: {Number(item.stockQuantity)} / Min:{" "}
                                {Number(item.minimumThreshold)}{" "}
                                {item.unitOfMeasure}
                              </p>
                            </div>
                            <div className="text-right">
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full ${getRiskColor(
                                  item.riskLevel
                                )}`}
                              >
                                {item.riskLevel}
                              </span>
                              <p className="text-sm text-gray-600 mt-1">
                                {formatCurrency(item.totalValue)}
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Roast Consistency Report */}
          {activeTab === "consistency" &&
            consistencyData &&
            consistencyData.summary && (
              <div className="space-y-8">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">
                        {consistencyData.summary.totalBatches || 0}
                      </p>
                      <p className="text-sm text-gray-600">Total Batches</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">
                        {(consistencyData.summary.averageYield || 0).toFixed(1)}
                        kg
                      </p>
                      <p className="text-sm text-gray-600">Avg Yield</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">
                        {(consistencyData.summary.averageLoss || 0).toFixed(1)}
                        kg
                      </p>
                      <p className="text-sm text-gray-600">Avg Loss</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">
                        {(
                          consistencyData.summary.averageYieldVariance || 0
                        ).toFixed(1)}
                        %
                      </p>
                      <p className="text-sm text-gray-600">Yield Variance</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">
                        {(
                          consistencyData.summary.averageCuppingScore || 0
                        ).toFixed(1)}
                      </p>
                      <p className="text-sm text-gray-600">Avg Cupping</p>
                    </div>
                  </div>
                </div>

                {/* Consistency Ratings */}
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Consistency Analysis
                    </h2>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="text-center p-4 border rounded-lg">
                        <p
                          className={`text-xl font-bold ${getConsistencyColor(
                            consistencyData.consistency?.yield?.rating || "N/A"
                          )}`}
                        >
                          {consistencyData.consistency?.yield?.rating || "N/A"}
                        </p>
                        <p className="text-sm text-gray-600">
                          Yield Consistency
                        </p>
                        <p className="text-xs text-gray-500">
                          ±{consistencyData.consistency?.yield?.stdDev || 0}kg
                        </p>
                      </div>

                      <div className="text-center p-4 border rounded-lg">
                        <p
                          className={`text-xl font-bold ${getConsistencyColor(
                            consistencyData.consistency?.loss?.rating || "N/A"
                          )}`}
                        >
                          {consistencyData.consistency?.loss?.rating || "N/A"}
                        </p>
                        <p className="text-sm text-gray-600">
                          Loss Consistency
                        </p>
                        <p className="text-xs text-gray-500">
                          ±{consistencyData.consistency?.loss?.stdDev || 0}kg
                        </p>
                      </div>

                      <div className="text-center p-4 border rounded-lg">
                        <p
                          className={`text-xl font-bold ${getConsistencyColor(
                            consistencyData.consistency?.time?.rating || "N/A"
                          )}`}
                        >
                          {consistencyData.consistency?.time?.rating || "N/A"}
                        </p>
                        <p className="text-sm text-gray-600">
                          Time Consistency
                        </p>
                        <p className="text-xs text-gray-500">
                          ±{consistencyData.consistency?.time?.stdDev || 0}min
                        </p>
                      </div>

                      <div className="text-center p-4 border rounded-lg">
                        <p
                          className={`text-xl font-bold ${getConsistencyColor(
                            consistencyData.consistency?.temperature?.rating ||
                              "N/A"
                          )}`}
                        >
                          {consistencyData.consistency?.temperature?.rating ||
                            "N/A"}
                        </p>
                        <p className="text-sm text-gray-600">
                          Temp Consistency
                        </p>
                        <p className="text-xs text-gray-500">
                          ±
                          {consistencyData.consistency?.temperature?.stdDev ||
                            0}
                          °F
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recommendations */}
                {consistencyData.recommendations.length > 0 && (
                  <div className="bg-white rounded-lg shadow">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h2 className="text-lg font-semibold text-gray-900">
                        Recommendations
                      </h2>
                    </div>
                    <div className="p-6">
                      <div className="space-y-4">
                        {consistencyData.recommendations.map((rec, index) => (
                          <div
                            key={index}
                            className={`p-4 border rounded-lg ${getPriorityColor(
                              rec.priority
                            )}`}
                          >
                            <div className="flex items-start">
                              <div className="mr-3 mt-1">
                                {rec.priority === "high" && "🔴"}
                                {rec.priority === "medium" && "🟡"}
                                {rec.priority === "low" && "🔵"}
                              </div>
                              <div>
                                <p className="font-medium capitalize">
                                  {rec.priority} Priority
                                </p>
                                <p className="text-sm mt-1">{rec.message}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Performance by Recipe and Roaster */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white rounded-lg shadow">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h2 className="text-lg font-semibold text-gray-900">
                        Recipe Performance
                      </h2>
                    </div>
                    <div className="p-6">
                      <div className="space-y-3">
                        {consistencyData.byRecipe
                          .slice(0, 5)
                          .map((recipe, index) => (
                            <div
                              key={index}
                              className="flex justify-between items-center p-3 border rounded-lg"
                            >
                              <div>
                                <p className="font-medium text-gray-900">
                                  {recipe.recipeName}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {recipe.count} batches
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium text-gray-900">
                                  {recipe.averageYield.toFixed(1)}kg avg
                                </p>
                                <p className="text-xs text-gray-500">
                                  {recipe.yieldConsistency.toFixed(1)}% variance
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
                        Roaster Performance
                      </h2>
                    </div>
                    <div className="p-6">
                      <div className="space-y-3">
                        {consistencyData.byRoaster
                          .slice(0, 5)
                          .map((roaster, index) => (
                            <div
                              key={index}
                              className="flex justify-between items-center p-3 border rounded-lg"
                            >
                              <div>
                                <p className="font-medium text-gray-900">
                                  {roaster.roasterName}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {roaster.count} batches
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium text-gray-900">
                                  {roaster.averageYield.toFixed(1)}kg avg
                                </p>
                                <p className="text-xs text-gray-500">
                                  {roaster.consistency.toFixed(1)}% variance
                                </p>
                                {roaster.averageCuppingScore > 0 && (
                                  <p className="text-xs text-gray-500">
                                    ⭐ {roaster.averageCuppingScore.toFixed(1)}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

          {/* Placeholder for other report types */}
          {(activeTab === "yield" || activeTab === "waste") && (
            <div className="bg-white rounded-lg shadow p-8">
              <div className="text-center">
                <div className="text-4xl mb-4">
                  {activeTab === "yield" ? "📊" : "🗑️"}
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {activeTab === "yield" ? "Yield Analysis" : "Waste Tracking"}{" "}
                  Report
                </h2>
                <p className="text-gray-600 mb-4">
                  This report is coming soon. We're working on advanced
                  analytics for
                  {activeTab === "yield"
                    ? " production yield optimization"
                    : " waste reduction and tracking"}
                  .
                </p>
                <button
                  onClick={() => setActiveTab("inventory")}
                  className="bg-amber-600 text-white px-4 py-2 rounded-md hover:bg-amber-700 cursor-pointer"
                >
                  View Available Reports
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedPage>
  );
}
