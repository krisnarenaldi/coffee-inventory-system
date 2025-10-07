"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import AdminNavigation from "../../../../components/AdminNavigation";

interface TenantDetails {
  id: string;
  name: string;
  subdomain: string;
  domain?: string;
  status: "ACTIVE" | "SUSPENDED" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
  subscription?: {
    id: string;
    status: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    plan: {
      name: string;
      price: number;
      interval: string;
      maxUsers?: number;
      maxIngredients?: number;
      maxBatches?: number;
    };
  };
  users: {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
    lastLogin?: string;
    emailVerified?: string;
  }[];
  settings: {
    id: string;
    key: string;
    value: string;
  }[];
  _count: {
    users: number;
    ingredients: number;
    batches: number;
    suppliers: number;
    recipes: number;
  };
}

interface Usage {
  recentBatches: number;
  recentUsers: number;
  estimatedStorageGB: number;
  lastUpdated: string;
}

export default function TenantDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const [tenant, setTenant] = useState<TenantDetails | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/auth/signin");
      return;
    }
    if (!["PLATFORM_ADMIN", "SUPPORT"].includes(session.user.role)) {
      router.push("/dashboard");
      return;
    }
    fetchTenantDetails();
  }, [session, status, router, params.tenantId]);

  const fetchTenantDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/tenants/${params.tenantId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch tenant details");
      }
      const data = await response.json();
      setTenant(data.tenant);
      setUsage(data.usage);
    } catch (error) {
      console.error("Error fetching tenant details:", error);
      setError("Failed to load tenant details");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      setUpdating(true);
      const response = await fetch(`/api/admin/tenants/${params.tenantId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update tenant status");
      }

      fetchTenantDetails();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteTenant = async () => {
    try {
      setUpdating(true);
      setError(""); // Clear any previous errors

      const response = await fetch(`/api/admin/tenants/${params.tenantId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Provide more helpful error messages for common scenarios
        if (
          response.status === 400 &&
          errorData.error?.includes("existing users or batches")
        ) {
          const userCount = tenant?._count?.users || 0;
          const batchCount = tenant?._count?.batches || 0;

          let helpfulMessage = "Cannot delete tenant with existing data:\n";
          if (userCount > 0) {
            helpfulMessage += `• ${userCount} user(s) - Remove or transfer users first\n`;
          }
          if (batchCount > 0) {
            helpfulMessage += `• ${batchCount} batch(es) - Complete or archive batches first\n`;
          }
          helpfulMessage +=
            "\nConsider using the tenant offboarding API for a more graceful cleanup process.";

          throw new Error(helpfulMessage);
        }

        throw new Error(errorData.error || "Failed to delete tenant");
      }

      router.push("/admin/tenants");
    } catch (error: any) {
      setError(error.message);
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800";
      case "TRIALING":
        return "bg-blue-100 text-blue-800";
      case "PAST_DUE":
        return "bg-yellow-100 text-yellow-800";
      case "SUSPENDED":
        return "bg-orange-100 text-orange-800";
      case "CANCELLED":
      case "INACTIVE":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Get effective status - prioritize subscription status over tenant status
  const getEffectiveStatus = (tenant: any) => {
    // If tenant is suspended or cancelled, that takes priority
    if (tenant.status === "SUSPENDED" || tenant.status === "CANCELLED") {
      return tenant.status;
    }

    // If tenant is active, show subscription status if available
    if (tenant.subscription && tenant.subscription.status) {
      return tenant.subscription.status;
    }

    // Fallback to tenant status
    return tenant.status;
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-purple-100 text-purple-800";
      case "MANAGER":
        return "bg-blue-100 text-blue-800";
      case "BREWMASTER":
        return "bg-amber-100 text-amber-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading tenant details...</p>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Tenant Not Found
          </h2>
          <p className="text-gray-600 mb-4">
            The requested tenant could not be found.
          </p>
          <button
            onClick={() => router.push("/admin/tenants")}
            className="bg-amber-600 text-white px-4 py-2 rounded-md hover:bg-amber-700 cursor-pointer"
          >
            Back to Tenants
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavigation
        title={`Tenant Details - ${tenant?.name || "Loading..."}`}
        subtitle={`Manage ${tenant?.subdomain || ""}.coffeelogica.com`}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => router.push("/admin/tenants")}
                className="text-amber-600 hover:text-amber-700 mb-2 flex items-center cursor-pointer"
              >
                ← Back to Tenants
              </button>
              <h1 className="text-3xl font-bold text-gray-900">
                {tenant.name}
              </h1>
              <p className="mt-2 text-gray-600">
                {tenant.subdomain}.coffeelogica.com
                {tenant.domain && (
                  <span className="ml-2 text-blue-600">({tenant.domain})</span>
                )}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <span
                className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(
                  getEffectiveStatus(tenant)
                )}`}
              >
                {getEffectiveStatus(tenant)}
              </span>
              {session?.user.role === "PLATFORM_ADMIN" && (
                <div className="flex space-x-2">
                  <select
                    value={tenant.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    disabled={updating}
                    className="text-sm border border-gray-300 rounded px-3 py-1 focus:ring-amber-500 focus:border-amber-500 cursor-pointer"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    disabled={updating}
                    className="bg-red-600 text-white px-3 py-1 text-sm rounded hover:bg-red-700 disabled:opacity-50 cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            <pre className="whitespace-pre-wrap font-sans text-sm">{error}</pre>
            {error.includes("existing users or batches") && (
              <div className="mt-3 pt-3 border-t border-red-200">
                <p className="text-sm font-medium mb-2">Recommended actions:</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() =>
                      router.push(`/admin/tenants/${params.tenantId}/users`)
                    }
                    className="text-xs bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded transition-colors"
                  >
                    Manage Users
                  </button>
                  <button
                    onClick={() => {
                      const offboardingUrl = "/api/admin/tenants/offboard";
                      navigator.clipboard.writeText(
                        `POST ${window.location.origin}${offboardingUrl}`
                      );
                      alert("Offboarding API endpoint copied to clipboard!");
                    }}
                    className="text-xs bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded transition-colors"
                  >
                    Copy Offboarding API
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Overview Cards */}
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-sm font-medium text-gray-500">
                  Total Users
                </h3>
                <p className="text-2xl font-bold text-gray-900">
                  {tenant._count.users}
                </p>
                {usage && (
                  <p className="text-sm text-gray-600">
                    +{usage.recentUsers} this month
                  </p>
                )}
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-sm font-medium text-gray-500">
                  Ingredients
                </h3>
                <p className="text-2xl font-bold text-gray-900">
                  {tenant._count.ingredients}
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-sm font-medium text-gray-500">Batches</h3>
                <p className="text-2xl font-bold text-gray-900">
                  {tenant._count.batches}
                </p>
                {usage && (
                  <p className="text-sm text-gray-600">
                    +{usage.recentBatches} this month
                  </p>
                )}
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-sm font-medium text-gray-500">
                  Storage Usage
                </h3>
                <p className="text-2xl font-bold text-gray-900">
                  {usage ? `${usage.estimatedStorageGB}GB` : "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* Subscription Details */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">
                  Subscription Details
                </h2>
              </div>
              <div className="p-6">
                {tenant.subscription ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-500">
                          Plan
                        </label>
                        <p className="text-sm text-gray-900">
                          {tenant.subscription.plan.name}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">
                          Price
                        </label>
                        <p className="text-sm text-gray-900">
                          Rp {tenant.subscription.plan.price}/
                          {tenant.subscription.plan.interval.toLowerCase()}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">
                          Status
                        </label>
                        <p className="text-sm text-gray-900">
                          {tenant.subscription.status}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">
                          Current Period
                        </label>
                        <p className="text-sm text-gray-900">
                          {new Date(
                            tenant.subscription.currentPeriodStart
                          ).toLocaleDateString()}{" "}
                          -
                          {new Date(
                            tenant.subscription.currentPeriodEnd
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Plan Limits */}
                    <div className="mt-6">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">
                        Plan Limits
                      </h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-500">
                            Users
                          </label>
                          <p className="text-sm text-gray-900">
                            {tenant._count.users} /{" "}
                            {tenant.subscription.plan.maxUsers || "∞"}
                          </p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500">
                            Ingredients
                          </label>
                          <p className="text-sm text-gray-900">
                            {tenant._count.ingredients} /{" "}
                            {tenant.subscription.plan.maxIngredients || "∞"}
                          </p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500">
                            Batches
                          </label>
                          <p className="text-sm text-gray-900">
                            {tenant._count.batches} /{" "}
                            {tenant.subscription.plan.maxBatches || "∞"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">No active subscription</p>
                )}
              </div>
            </div>
          </div>

          {/* Tenant Settings */}
          <div>
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Settings</h2>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {tenant.settings.map((setting) => (
                    <div key={setting.id}>
                      <label className="block text-xs font-medium text-gray-500">
                        {setting.key.replace("_", " ")}
                      </label>
                      <p className="text-sm text-gray-900">{setting.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Users List */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">
                  Users ({tenant.users.length})
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Login
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {tenant.users.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {user.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.email}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(
                              user.role
                            )}`}
                          >
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              user.emailVerified
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {user.emailVerified ? "Verified" : "Pending"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.lastLogin
                            ? new Date(user.lastLogin).toLocaleDateString()
                            : "Never"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Delete Tenant
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Are you sure you want to delete <strong>{tenant.name}</strong>
                  ? This action cannot be undone.
                </p>
                <p className="text-sm text-red-600 mb-6">
                  This will permanently delete all tenant data including users,
                  batches, and inventory.
                </p>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    disabled={updating}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteTenant}
                    disabled={updating}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    {updating ? "Deleting..." : "Delete Tenant"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
