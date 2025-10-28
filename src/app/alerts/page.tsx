"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navigation from "../../components/Navigation";
import DeleteConfirmModal from "../../components/DeleteConfirmModal";

interface Alert {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  isRead: boolean;
  isResolved: boolean;
  resolvedBy?: {
    id: string;
    name: string;
    email: string;
  };
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface LowStockItem {
  type: "ingredient" | "product";
  id?: string;
  name: string;
  currentStock: number;
  threshold: number;
  unit: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

export default function AlertsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("alerts");
  const [filterType, setFilterType] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("");
  const [showResolved, setShowResolved] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteAlertId, setDeleteAlertId] = useState<string | null>(null);
  const [deleteAlertTitle, setDeleteAlertTitle] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    if (status === "authenticated") {
      fetchAlerts();
      fetchLowStockStatus();
    }
  }, [status, router, filterType, filterSeverity, showResolved]);

  const fetchAlerts = async () => {
    try {
      const params = new URLSearchParams();
      if (filterType) params.append("type", filterType);
      if (filterSeverity) params.append("severity", filterSeverity);
      params.append("isResolved", showResolved.toString());

      const response = await fetch(`/api/alerts?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch alerts");
      }
      const data = await response.json();
      setAlerts(data.alerts);
    } catch (error) {
      setError("Failed to load alerts");
    }
  };

  const fetchLowStockStatus = async () => {
    try {
      const response = await fetch("/api/alerts/check-low-stock");
      if (!response.ok) {
        throw new Error("Failed to fetch low stock status");
      }
      const data = await response.json();
      setLowStockItems(data.lowStockItems);
    } catch (error) {
      console.error("Failed to load low stock status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkLowStock = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/alerts/check-low-stock", {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Failed to check low stock");
      }
      const data = await response.json();
      await fetchAlerts();
      await fetchLowStockStatus();
      setError("");
    } catch (error) {
      setError("Failed to check low stock");
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (alertId: string) => {
    try {
      const response = await fetch(`/api/alerts/${alertId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isRead: true }),
      });
      if (!response.ok) {
        throw new Error("Failed to mark alert as read");
      }
      await fetchAlerts();
    } catch (error) {
      setError("Failed to mark alert as read");
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/alerts/${alertId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isResolved: true }),
      });
      if (!response.ok) {
        throw new Error("Failed to resolve alert");
      }
      await fetchAlerts();
    } catch (error) {
      setError("Failed to resolve alert");
    }
  };

  const deleteAlert = (alertId: string, alertTitle: string) => {
    setDeleteAlertId(alertId);
    setDeleteAlertTitle(alertTitle);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteAlertId) return;

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/alerts/${deleteAlertId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete alert");
      }
      await fetchAlerts();
      setShowDeleteModal(false);
      setDeleteAlertId(null);
      setDeleteAlertTitle("");
    } catch (error) {
      setError("Failed to delete alert");
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setDeleteAlertId(null);
    setDeleteAlertTitle("");
    setIsDeleting(false);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return "bg-red-100 text-red-800 border-red-200";
      case "HIGH":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "LOW":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "LOW_STOCK":
        return "📦";
      case "EXPIRATION":
        return "⏰";
      case "REORDER":
        return "🔄";
      case "BATCH_READY":
        return "✅";
      case "MAINTENANCE":
        return "🔧";
      case "SYSTEM":
        return "⚙️";
      default:
        return "📋";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading alerts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Alerts & Notifications
            </h1>
            <p className="mt-2 text-gray-600">
              Monitor inventory alerts and system notifications
            </p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab("alerts")}
                className={`py-2 px-1 border-b-2 font-medium text-sm cursor-pointer ${
                  activeTab === "alerts"
                    ? "border-amber-500 text-amber-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Active Alerts ({alerts.filter((a) => !a.isResolved).length})
              </button>
              <button
                onClick={() => setActiveTab("lowstock")}
                className={`py-2 px-1 border-b-2 font-medium text-sm cursor-pointer ${
                  activeTab === "lowstock"
                    ? "border-amber-500 text-amber-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Low Stock Status ({lowStockItems.length})
              </button>
            </nav>
          </div>

          {activeTab === "alerts" && (
            <div>
              {/* Filters and Actions */}
              <div className="bg-white p-4 rounded-lg shadow mb-6">
                <div className="flex flex-wrap gap-4 items-center justify-between">
                  <div className="flex flex-wrap gap-4">
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="border border-gray-300 rounded-md px-3 py-2 text-sm cursor-pointer"
                    >
                      <option value="">All Types</option>
                      <option value="LOW_STOCK">Low Stock</option>
                      <option value="EXPIRATION">Expiration</option>
                      <option value="REORDER">Reorder</option>
                      <option value="BATCH_READY">Batch Ready</option>
                      <option value="MAINTENANCE">Maintenance</option>
                      <option value="SYSTEM">System</option>
                    </select>

                    <select
                      value={filterSeverity}
                      onChange={(e) => setFilterSeverity(e.target.value)}
                      className="border border-gray-300 rounded-md px-3 py-2 text-sm cursor-pointer"
                    >
                      <option value="">All Severities</option>
                      <option value="CRITICAL">Critical</option>
                      <option value="HIGH">High</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="LOW">Low</option>
                    </select>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={showResolved}
                        onChange={(e) => setShowResolved(e.target.checked)}
                        className="mr-2 cursor-pointer"
                      />
                      Show Resolved
                    </label>
                  </div>

                  <button
                    onClick={checkLowStock}
                    disabled={isLoading}
                    className="bg-amber-600 text-white px-4 py-2 rounded-md hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 cursor-pointer"
                  >
                    {isLoading ? "Checking..." : "Check Low Stock"}
                  </button>
                </div>
              </div>

              {/* Alerts List */}
              <div className="space-y-4">
                {alerts.length === 0 ? (
                  <div className="bg-white p-8 rounded-lg shadow text-center">
                    <p className="text-gray-500">No alerts found.</p>
                  </div>
                ) : (
                  alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`bg-white p-6 rounded-lg shadow border-l-4 ${
                        alert.isResolved
                          ? "border-green-400 opacity-75"
                          : alert.severity === "CRITICAL"
                          ? "border-red-400"
                          : alert.severity === "HIGH"
                          ? "border-orange-400"
                          : alert.severity === "MEDIUM"
                          ? "border-yellow-400"
                          : "border-blue-400"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-2xl">
                              {getTypeIcon(alert.type)}
                            </span>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {alert.title}
                            </h3>
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full border ${getSeverityColor(
                                alert.severity
                              )}`}
                            >
                              {alert.severity}
                            </span>
                            {!alert.isRead && (
                              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            )}
                          </div>
                          <p className="text-gray-700 mb-3">{alert.message}</p>
                          <div className="text-sm text-gray-500">
                            <p>
                              Created:{" "}
                              {new Date(alert.createdAt).toLocaleString()}
                            </p>
                            {alert.isResolved && alert.resolvedBy && (
                              <p>
                                Resolved by {alert.resolvedBy.name} on{" "}
                                {new Date(alert.resolvedAt!).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          {!alert.isRead && (
                            <button
                              onClick={() => markAsRead(alert.id)}
                              className="text-blue-600 hover:text-blue-800 text-sm cursor-pointer"
                            >
                              Mark Read
                            </button>
                          )}
                          {!alert.isResolved && (
                            <button
                              onClick={() => resolveAlert(alert.id)}
                              className="text-green-600 hover:text-green-800 text-sm cursor-pointer"
                            >
                              Resolve
                            </button>
                          )}
                          <button
                            onClick={() => deleteAlert(alert.id, alert.title)}
                            className="text-red-600 hover:text-red-800 text-sm cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === "lowstock" && (
            <div>
              <div className="bg-white p-4 rounded-lg shadow mb-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Current Low Stock Items
                  </h2>
                  <button
                    onClick={checkLowStock}
                    disabled={isLoading}
                    className="bg-amber-600 text-white px-4 py-2 rounded-md hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 cursor-pointer"
                  >
                    {isLoading ? "Refreshing..." : "Refresh"}
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {lowStockItems.length === 0 ? (
                  <div className="bg-white p-8 rounded-lg shadow text-center">
                    <p className="text-gray-500">No low stock items found.</p>
                  </div>
                ) : (
                  lowStockItems.map((item, index) => (
                    <div
                      key={`${item.type}-${item.name}-${index}`}
                      className={`bg-white p-6 rounded-lg shadow border-l-4 ${
                        item.severity === "CRITICAL"
                          ? "border-red-400"
                          : item.severity === "HIGH"
                          ? "border-orange-400"
                          : "border-yellow-400"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-2xl">
                              {item.type === "ingredient" ? "🌱" : "☕"}
                            </span>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {item.name}
                            </h3>
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full border ${getSeverityColor(
                                item.severity
                              )}`}
                            >
                              {item.severity}
                            </span>
                          </div>
                          <p className="text-gray-700">
                            Current Stock: {item.currentStock} {item.unit} |
                            Threshold: {item.threshold} {item.unit}
                          </p>
                          <p className="text-sm text-gray-500 capitalize">
                            Type: {item.type}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          <DeleteConfirmModal
            isOpen={showDeleteModal}
            onClose={cancelDelete}
            onConfirm={confirmDelete}
            title="Delete Alert"
            message="Are you sure you want to delete this alert?"
            itemName={deleteAlertTitle}
            isDeleting={isDeleting}
          />
        </div>
      </div>
    </div>
  );
}
