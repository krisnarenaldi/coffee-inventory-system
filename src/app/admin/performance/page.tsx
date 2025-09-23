"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface PerformanceData {
  performance: {
    stats: {
      count: number;
      avgDuration: number;
      minDuration: number;
      maxDuration: number;
      totalDuration: number;
    };
    slowOperations: Array<{
      name: string;
      duration: number;
      timestamp: string;
      metadata?: Record<string, any>;
    }>;
    metricNames: string[];
  };
  cache: {
    size: number;
    keys: string[];
  };
  system: {
    memory: {
      used: number;
      total: number;
      external: number;
    };
    uptime: number;
    nodeVersion: string;
    platform: string;
    arch: string;
  };
  timestamp: string;
}

export default function PerformanceDashboard() {
  const { data: session } = useSession();
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<string>("");
  const [activeTab, setActiveTab] = useState("overview");

  const fetchData = async (metric?: string) => {
    try {
      setLoading(true);
      const url = metric
        ? `/api/admin/performance?metric=${encodeURIComponent(metric)}`
        : "/api/admin/performance";

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch performance data"
      );
    } finally {
      setLoading(false);
    }
  };

  const clearMetrics = async () => {
    try {
      const response = await fetch("/api/admin/performance", {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to clear metrics");
      }

      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear metrics");
    }
  };

  useEffect(() => {
    fetchData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => fetchData(selectedMetric), 30000);
    return () => clearInterval(interval);
  }, [selectedMetric]);

  if (session?.user?.role !== "PLATFORM_ADMIN") {
    return (
      <div className="container mx-auto py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">
            Access denied. This page is only available to platform
            administrators.
          </p>
        </div>
      </div>
    );
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const getPerformanceColor = (avgDuration: number) => {
    if (avgDuration < 100) return "text-green-600";
    if (avgDuration < 500) return "text-yellow-600";
    if (avgDuration < 1000) return "text-orange-600";
    return "text-red-600";
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Performance Dashboard</h1>
          <p className="text-gray-600">
            Monitor application performance and system metrics
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchData(selectedMetric)}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <span className={loading ? "animate-spin" : ""}>🔄</span>
            Refresh
          </button>
          <button
            onClick={clearMetrics}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
          >
            🗑️ Clear Metrics
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && !data && (
        <div className="text-center py-8">
          <div className="animate-spin text-4xl">⏳</div>
          <p className="mt-2 text-gray-600">Loading performance data...</p>
        </div>
      )}

      {/* Main Content */}
      {data && (
        <div className="space-y-6">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {["overview", "performance", "cache", "system"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                    activeTab === tab
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-lg shadow border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Total Operations
                      </p>
                      <p className="text-2xl font-bold">
                        {data.performance.stats.count}
                      </p>
                    </div>
                    <div className="text-2xl">📊</div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Avg Response Time
                      </p>
                      <p
                        className={`text-2xl font-bold ${getPerformanceColor(
                          data.performance.stats.avgDuration
                        )}`}
                      >
                        {formatDuration(data.performance.stats.avgDuration)}
                      </p>
                    </div>
                    <div className="text-2xl">⏱️</div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Cache Size
                      </p>
                      <p className="text-2xl font-bold">{data.cache.size}</p>
                    </div>
                    <div className="text-2xl">💾</div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Memory Usage
                      </p>
                      <p className="text-2xl font-bold">
                        {data.system.memory.used}MB
                      </p>
                      <p className="text-xs text-gray-500">
                        of {data.system.memory.total}MB
                      </p>
                    </div>
                    <div className="text-2xl">🖥️</div>
                  </div>
                </div>
              </div>

              {/* Slow Operations */}
              {data.performance.slowOperations.length > 0 && (
                <div className="bg-white p-6 rounded-lg shadow border">
                  <h3 className="text-lg font-semibold mb-4">
                    Recent Slow Operations
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Operations taking longer than 1 second
                  </p>
                  <div className="space-y-2">
                    {data.performance.slowOperations
                      .slice(0, 5)
                      .map((op, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center p-3 bg-gray-50 rounded"
                        >
                          <div>
                            <span className="font-medium">{op.name}</span>
                            {op.metadata && (
                              <div className="text-xs text-gray-500 mt-1">
                                {JSON.stringify(op.metadata)}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-sm">
                              {formatDuration(op.duration)}
                            </span>
                            <div className="text-xs text-gray-500 mt-1">
                              {new Date(op.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Performance Tab */}
          {activeTab === "performance" && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-lg shadow border">
                <h3 className="text-lg font-semibold mb-4">
                  Performance Metrics
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Detailed performance statistics by operation type
                </p>

                {/* Metric Filter Buttons */}
                <div className="flex gap-2 flex-wrap mb-6">
                  <button
                    onClick={() => {
                      setSelectedMetric("");
                      fetchData();
                    }}
                    className={`px-3 py-1 rounded text-sm ${
                      selectedMetric === ""
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    All Operations
                  </button>
                  {data.performance.metricNames.map((name) => (
                    <button
                      key={name}
                      onClick={() => {
                        setSelectedMetric(name);
                        fetchData(name);
                      }}
                      className={`px-3 py-1 rounded text-sm ${
                        selectedMetric === name
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>

                {/* Performance Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded">
                    <div className="text-2xl font-bold text-green-600">
                      {formatDuration(data.performance.stats.minDuration)}
                    </div>
                    <div className="text-sm text-gray-600">Fastest</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded">
                    <div className="text-2xl font-bold text-blue-600">
                      {formatDuration(data.performance.stats.avgDuration)}
                    </div>
                    <div className="text-sm text-gray-600">Average</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded">
                    <div className="text-2xl font-bold text-red-600">
                      {formatDuration(data.performance.stats.maxDuration)}
                    </div>
                    <div className="text-sm text-gray-600">Slowest</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Cache Tab */}
          {activeTab === "cache" && (
            <div className="bg-white p-6 rounded-lg shadow border">
              <h3 className="text-lg font-semibold mb-4">Cache Statistics</h3>
              <p className="text-sm text-gray-600 mb-4">
                Current cache status and stored keys
              </p>

              <div className="space-y-4">
                <div className="text-lg">
                  <strong>{data.cache.size}</strong> cached entries
                </div>

                {data.cache.keys.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Cache Keys:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {data.cache.keys.map((key, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm"
                        >
                          {key}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* System Tab */}
          {activeTab === "system" && (
            <div className="bg-white p-6 rounded-lg shadow border">
              <h3 className="text-lg font-semibold mb-4">System Information</h3>
              <p className="text-sm text-gray-600 mb-4">
                Server system metrics and information
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h4 className="font-medium">Memory Usage</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Heap Used:</span>
                      <span>{data.system.memory.used}MB</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Heap Total:</span>
                      <span>{data.system.memory.total}MB</span>
                    </div>
                    <div className="flex justify-between">
                      <span>External:</span>
                      <span>{data.system.memory.external}MB</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">System Info</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Uptime:</span>
                      <span>{formatUptime(data.system.uptime)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Node Version:</span>
                      <span>{data.system.nodeVersion}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Platform:</span>
                      <span>{data.system.platform}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Architecture:</span>
                      <span>{data.system.arch}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="text-xs text-gray-500 text-center">
        Last updated:{" "}
        {data ? new Date(data.timestamp).toLocaleString() : "Never"}
      </div>
    </div>
  );
}
