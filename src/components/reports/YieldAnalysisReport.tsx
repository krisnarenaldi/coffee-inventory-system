"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface YieldAnalysisData {
  summary: {
    totalBatches: number;
    averageYieldEfficiency: number;
    averageYieldLoss: number;
    totalYieldLoss: number;
    bestYieldEfficiency: number;
    worstYieldEfficiency: number;
    yieldConsistency: number;
  };
  trends: Array<{
    week: string;
    batchCount: number;
    averageEfficiency: number;
    totalYieldLoss: number;
  }>;
  byRecipe: Array<{
    recipeName: string;
    batchCount: number;
    averageYieldEfficiency: number;
    totalYieldLoss: number;
    consistency: number;
  }>;
  byRoaster: Array<{
    roasterName: string;
    batchCount: number;
    averageYieldEfficiency: number;
    totalYieldLoss: number;
    consistency: number;
  }>;
  recommendations: Array<{
    type: string;
    priority: string;
    title: string;
    message: string;
    impact: string;
  }>;
  batches: Array<{
    batchId: string;
    batchNumber: string;
    recipeName: string;
    roasterName: string;
    actualYield: number;
    expectedYield: number;
    yieldEfficiency: number;
    yieldLoss: number;
  }>;
}

interface YieldAnalysisReportProps {
  period: string;
}

export function YieldAnalysisReport({ period }: YieldAnalysisReportProps) {
  const { data: session } = useSession();
  const [data, setData] = useState<YieldAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (session?.user?.tenantId) {
      fetchYieldAnalysis();
    }
  }, [session, period]);

  const fetchYieldAnalysis = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/reports/yield-analysis?period=${period}`, {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch yield analysis");
      }

      const yieldData = await response.json();
      setData(yieldData);
    } catch (error) {
      console.error("Error fetching yield analysis:", error);
      setError("Failed to load yield analysis report");
    } finally {
      setLoading(false);
    }
  };

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 95) return "text-green-600";
    if (efficiency >= 85) return "text-blue-600";
    if (efficiency >= 75) return "text-yellow-600";
    return "text-red-600";
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

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading yield analysis...</p>
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
            onClick={fetchYieldAnalysis}
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
            <div className="text-2xl mr-3">📊</div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Batches</p>
              <p className="text-2xl font-bold text-gray-900">{data.summary.totalBatches}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="text-2xl mr-3">⚡</div>
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Efficiency</p>
              <p className={`text-2xl font-bold ${getEfficiencyColor(data.summary.averageYieldEfficiency)}`}>
                {data.summary.averageYieldEfficiency.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="text-2xl mr-3">📉</div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Loss</p>
              <p className="text-2xl font-bold text-gray-900">
                {data.summary.totalYieldLoss.toFixed(1)}kg
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="text-2xl mr-3">📏</div>
            <div>
              <p className="text-sm font-medium text-gray-600">Consistency</p>
              <p className="text-2xl font-bold text-gray-900">
                ±{data.summary.yieldConsistency.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Efficiency Range */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Efficiency Range</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                {data.summary.bestYieldEfficiency.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-600">Best Efficiency</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">
                {data.summary.worstYieldEfficiency.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-600">Worst Efficiency</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recommendations</h2>
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

      {/* Performance Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recipe Performance */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recipe Performance</h2>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {data.byRecipe.slice(0, 5).map((recipe, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">{recipe.recipeName}</p>
                    <p className="text-sm text-gray-600">{recipe.batchCount} batches</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${getEfficiencyColor(recipe.averageYieldEfficiency)}`}>
                      {recipe.averageYieldEfficiency.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500">
                      -{recipe.totalYieldLoss.toFixed(1)}kg loss
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Roaster Performance */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Roaster Performance</h2>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {data.byRoaster.slice(0, 5).map((roaster, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">{roaster.roasterName}</p>
                    <p className="text-sm text-gray-600">{roaster.batchCount} batches</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${getEfficiencyColor(roaster.averageYieldEfficiency)}`}>
                      {roaster.averageYieldEfficiency.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500">
                      ±{roaster.consistency.toFixed(1)}% variance
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Batches */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Batch Performance</h2>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Batch
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recipe
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Roaster
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Yield
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Efficiency
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Loss
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.batches.slice(0, 10).map((batch, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {batch.batchNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {batch.recipeName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {batch.roasterName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {batch.actualYield.toFixed(1)} / {batch.expectedYield.toFixed(1)} kg
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${getEfficiencyColor(batch.yieldEfficiency)}`}>
                        {batch.yieldEfficiency.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {batch.yieldLoss.toFixed(1)} kg
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}