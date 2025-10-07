"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AdminNavigation from "../../../components/AdminNavigation";

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  domain?: string;
  status: "ACTIVE" | "SUSPENDED" | "CANCELLED";
  createdAt: string;
  updatedAt: string;
  subscription?: {
    id: string;
    status: string;
    plan: {
      name: string;
      price: number;
    };
    currentPeriodEnd: string;
  };
  _count: {
    users: number;
    ingredients: number;
    batches: number;
  };
}

interface NewTenant {
  name: string;
  subdomain: string;
  domain?: string;
  adminEmail: string;
  adminName: string;
  planId: string;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  description: string;
}

export default function TenantsAdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdTenantInfo, setCreatedTenantInfo] = useState<{
    tenant: any;
    adminUser: any;
    defaultPassword: string;
  } | null>(null);
  const [validationErrors, setValidationErrors] = useState<{
    subdomain?: string;
    email?: string;
  }>({});
  const [isValidating, setIsValidating] = useState(false);
  const [newTenant, setNewTenant] = useState<NewTenant>({
    name: "",
    subdomain: "",
    domain: "",
    adminEmail: "",
    adminName: "",
    planId: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);
  const [confirmDeleteName, setConfirmDeleteName] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

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
    fetchTenants();
    fetchPlans();
  }, [session, status, router]);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/tenants");
      if (!response.ok) {
        throw new Error("Failed to fetch tenants");
      }
      const data = await response.json();
      setTenants(data.tenants || []);
    } catch (error) {
      console.error("Error fetching tenants:", error);
      setError("Failed to load tenants");
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const response = await fetch("/api/admin/subscription-plans");
      if (!response.ok) {
        throw new Error("Failed to fetch plans");
      }
      const data = await response.json();
      setPlans(data || []);
    } catch (error) {
      console.error("Error fetching plans:", error);
    }
  };

  const validateSubdomain = async (subdomain: string) => {
    if (!subdomain) {
      setValidationErrors((prev) => ({ ...prev, subdomain: undefined }));
      return;
    }

    // Basic format validation
    const subdomainRegex = /^[a-z0-9-]+$/;
    if (!subdomainRegex.test(subdomain)) {
      setValidationErrors((prev) => ({
        ...prev,
        subdomain:
          "Invalid format. Use only lowercase letters, numbers, and hyphens.",
      }));
      return;
    }

    try {
      setIsValidating(true);
      const response = await fetch(
        `/api/admin/tenants/validate?subdomain=${encodeURIComponent(subdomain)}`
      );
      const data = await response.json();

      if (data.exists) {
        setValidationErrors((prev) => ({
          ...prev,
          subdomain: "This subdomain is already taken.",
        }));
      } else {
        setValidationErrors((prev) => ({ ...prev, subdomain: undefined }));
      }
    } catch (error) {
      console.error("Error validating subdomain:", error);
    } finally {
      setIsValidating(false);
    }
  };

  const validateEmail = async (email: string) => {
    if (!email) {
      setValidationErrors((prev) => ({ ...prev, email: undefined }));
      return;
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setValidationErrors((prev) => ({
        ...prev,
        email: "Please enter a valid email address.",
      }));
      return;
    }

    try {
      setIsValidating(true);
      const response = await fetch(
        `/api/admin/tenants/validate?email=${encodeURIComponent(email)}`
      );
      const data = await response.json();

      if (data.exists) {
        setValidationErrors((prev) => ({
          ...prev,
          email: "This email is already registered.",
        }));
      } else {
        setValidationErrors((prev) => ({ ...prev, email: undefined }));
      }
    } catch (error) {
      console.error("Error validating email:", error);
    } finally {
      setIsValidating(false);
    }
  };

  // Debounced validation
  const debounceValidation = (fn: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn.apply(null, args), delay);
    };
  };

  const debouncedValidateSubdomain = debounceValidation(validateSubdomain, 500);
  const debouncedValidateEmail = debounceValidation(validateEmail, 500);

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check for validation errors
    if (validationErrors.subdomain || validationErrors.email) {
      setError("Please fix the validation errors before submitting.");
      return;
    }

    try {
      const response = await fetch("/api/admin/tenants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newTenant),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create tenant");
      }

      const data = await response.json();
      setCreatedTenantInfo({
        tenant: data.tenant,
        adminUser: data.adminUser,
        defaultPassword: data.defaultPassword,
      });

      setShowCreateModal(false);
      setShowSuccessModal(true);
      setNewTenant({
        name: "",
        subdomain: "",
        domain: "",
        adminEmail: "",
        adminName: "",
        planId: "",
      });
      // Clear validation errors
      setValidationErrors({});
      fetchTenants();
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleStatusChange = async (tenantId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/tenants/${tenantId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update tenant status");
      }

      fetchTenants();
    } catch (error: any) {
      setError(error.message);
    }
  };

  const openDeleteModal = (tenant: Tenant) => {
    setTenantToDelete(tenant);
    setConfirmDeleteName("");
  };

  const closeDeleteModal = () => {
    setTenantToDelete(null);
    setConfirmDeleteName("");
  };

  const handleConfirmDelete = async () => {
    if (!tenantToDelete) return;
    if (confirmDeleteName !== tenantToDelete.name) {
      setError("Type the tenant name to confirm deletion.");
      return;
    }
    try {
      setIsDeleting(true);
      const response = await fetch(
        `/api/admin/tenants/${tenantToDelete.id}?force=true`,
        {
          method: "DELETE",
        }
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete tenant");
      }
      closeDeleteModal();
      await fetchTenants();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsDeleting(false);
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
  const getEffectiveStatus = (tenant: Tenant) => {
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

  const filteredTenants = tenants.filter((tenant) => {
    const matchesSearch =
      tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.subdomain.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "ALL" || tenant.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading && tenants.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading tenants...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavigation
        title="Tenant Management"
        subtitle="Manage all tenants across the platform"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Tenant Management
              </h1>
              <p className="mt-2 text-gray-600">
                Manage all brewery tenants and their subscriptions
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-amber-600 text-white px-4 py-2 rounded-md hover:bg-amber-700 flex items-center cursor-pointer"
            >
              <span className="mr-2">+</span>
              Create Tenant
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or subdomain..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <div className="flex items-end">
              <div className="text-sm text-gray-600">
                Showing {filteredTenants.length} of {tenants.length} tenants
              </div>
            </div>
          </div>
        </div>

        {/* Tenants Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tenant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subscription
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {tenant.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {tenant.subdomain}.coffeelogica.com
                          {tenant.domain && (
                            <span className="ml-2 text-blue-600">
                              ({tenant.domain})
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {tenant.subscription ? (
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {tenant.subscription.plan.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            Rp {tenant.subscription.plan.price}/month
                          </div>
                          <div className="text-xs text-gray-400">
                            Expires:{" "}
                            {new Date(
                              tenant.subscription.currentPeriodEnd
                            ).toLocaleDateString()}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">
                          No subscription
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div>{tenant._count.users} users</div>
                        <div>{tenant._count.ingredients} ingredients</div>
                        <div>{tenant._count.batches} batches</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                          getEffectiveStatus(tenant)
                        )}`}
                      >
                        {getEffectiveStatus(tenant)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(tenant.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <select
                          value={tenant.status}
                          onChange={(e) =>
                            handleStatusChange(tenant.id, e.target.value)
                          }
                          className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-amber-500 focus:border-amber-500"
                        >
                          <option value="ACTIVE">Active</option>
                          <option value="SUSPENDED">Suspended</option>
                          <option value="CANCELLED">Cancelled</option>
                        </select>
                        <button
                          onClick={() =>
                            router.push(`/admin/tenants/${tenant.id}`)
                          }
                          className="text-amber-600 hover:text-amber-900 cursor-pointer"
                        >
                          View
                        </button>
                        {session?.user?.role === "PLATFORM_ADMIN" && (
                          <button
                            onClick={() => openDeleteModal(tenant)}
                            className="text-red-600 hover:text-red-800 cursor-pointer"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {tenantToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Delete Tenant
              </h2>
              <p className="mt-2 text-gray-700">
                This will permanently delete tenant{" "}
                <span className="font-semibold">{tenantToDelete.name}</span> and
                all associated data (users, ingredients, batches, subscriptions,
                etc.). This action cannot be undone.
              </p>
              <p className="mt-3 text-gray-700">
                To confirm, type the tenant name exactly:{" "}
                <span className="font-semibold">{tenantToDelete.name}</span>
              </p>
              <input
                type="text"
                value={confirmDeleteName}
                onChange={(e) => setConfirmDeleteName(e.target.value)}
                className="mt-3 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
                placeholder="Type tenant name to confirm"
              />
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={closeDeleteModal}
                  className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                  disabled={
                    isDeleting || confirmDeleteName !== tenantToDelete.name
                  }
                >
                  {isDeleting ? "Deleting..." : "Delete Permanently"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Success Modal */}
        {showSuccessModal && createdTenantInfo && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center mb-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-green-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-medium text-gray-900">
                      Tenant Created Successfully!
                    </h3>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-md">
                    <h4 className="font-medium text-gray-900 mb-2">
                      Tenant Details
                    </h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>
                        <span className="font-medium">Name:</span>{" "}
                        {createdTenantInfo.tenant.name}
                      </p>
                      <p>
                        <span className="font-medium">Subdomain:</span>{" "}
                        {createdTenantInfo.tenant.subdomain}.coffeelogica.com
                      </p>
                      {createdTenantInfo.tenant.domain && (
                        <p>
                          <span className="font-medium">Custom Domain:</span>{" "}
                          {createdTenantInfo.tenant.domain}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="bg-amber-50 p-4 rounded-md border border-amber-200">
                    <h4 className="font-medium text-amber-900 mb-2">
                      Admin User Credentials
                    </h4>
                    <div className="text-sm text-amber-800 space-y-1">
                      <p>
                        <span className="font-medium">Email:</span>{" "}
                        {createdTenantInfo.adminUser.email}
                      </p>
                      <p>
                        <span className="font-medium">Name:</span>{" "}
                        {createdTenantInfo.adminUser.name}
                      </p>
                      <p>
                        <span className="font-medium">Temporary Password:</span>
                        <span className="font-mono bg-amber-100 px-2 py-1 rounded ml-2">
                          {createdTenantInfo.defaultPassword}
                        </span>
                      </p>
                    </div>
                    <div className="mt-3 p-3 bg-amber-100 rounded border border-amber-300">
                      <p className="text-xs text-amber-800">
                        <strong>Important:</strong> Please share these
                        credentials with the tenant admin. They should change
                        the password on first login for security.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSuccessModal(false);
                      setCreatedTenantInfo(null);
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-amber-600 border border-transparent rounded-md hover:bg-amber-700 cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Tenant Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Create New Tenant
                </h3>
                <form onSubmit={handleCreateTenant} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Brewery Name
                    </label>
                    <input
                      type="text"
                      value={newTenant.name}
                      onChange={(e) =>
                        setNewTenant({ ...newTenant, name: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subdomain
                    </label>
                    <div className="flex">
                      <input
                        type="text"
                        value={newTenant.subdomain}
                        onChange={(e) => {
                          const value = e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9-]/g, "");
                          setNewTenant({ ...newTenant, subdomain: value });
                          debouncedValidateSubdomain(value);
                        }}
                        className={`flex-1 px-3 py-2 border rounded-l-md focus:ring-amber-500 focus:border-amber-500 ${
                          validationErrors.subdomain
                            ? "border-red-300"
                            : "border-gray-300"
                        }`}
                        required
                      />
                      <span className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 bg-gray-50 text-gray-500 text-sm rounded-r-md">
                        .coffeelogica.com
                      </span>
                    </div>
                    {validationErrors.subdomain && (
                      <p className="mt-1 text-sm text-red-600">
                        {validationErrors.subdomain}
                      </p>
                    )}
                    {isValidating && newTenant.subdomain && (
                      <p className="mt-1 text-sm text-gray-500">
                        Checking availability...
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Custom Domain (Optional)
                    </label>
                    <input
                      type="text"
                      value={newTenant.domain}
                      onChange={(e) =>
                        setNewTenant({ ...newTenant, domain: e.target.value })
                      }
                      placeholder="brewery.coffeelogica.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Admin Name
                    </label>
                    <input
                      type="text"
                      value={newTenant.adminName}
                      onChange={(e) =>
                        setNewTenant({
                          ...newTenant,
                          adminName: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Admin Email
                    </label>
                    <input
                      type="email"
                      value={newTenant.adminEmail}
                      onChange={(e) => {
                        const value = e.target.value;
                        setNewTenant({ ...newTenant, adminEmail: value });
                        debouncedValidateEmail(value);
                      }}
                      className={`w-full px-3 py-2 border rounded-md focus:ring-amber-500 focus:border-amber-500 ${
                        validationErrors.email
                          ? "border-red-300"
                          : "border-gray-300"
                      }`}
                      required
                    />
                    {validationErrors.email && (
                      <p className="mt-1 text-sm text-red-600">
                        {validationErrors.email}
                      </p>
                    )}
                    {isValidating && newTenant.adminEmail && (
                      <p className="mt-1 text-sm text-gray-500">
                        Checking availability...
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subscription Plan
                    </label>
                    <select
                      value={newTenant.planId}
                      onChange={(e) =>
                        setNewTenant({ ...newTenant, planId: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500 cursor-pointer"
                      required
                    >
                      <option value="">Select a plan</option>
                      {plans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name} - ${plan.price}/month
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateModal(false);
                        setValidationErrors({});
                        setError("");
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={
                        loading ||
                        isValidating ||
                        !!validationErrors.subdomain ||
                        !!validationErrors.email
                      }
                      className={`px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md cursor-pointer ${
                        loading ||
                        isValidating ||
                        validationErrors.subdomain ||
                        validationErrors.email
                          ? "bg-gray-400 cursor-not-allowed"
                          : "bg-amber-600 hover:bg-amber-700"
                      }`}
                    >
                      {loading ? "Creating..." : "Create Tenant"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
