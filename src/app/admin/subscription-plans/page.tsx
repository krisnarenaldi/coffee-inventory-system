"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import AdminNavigation from "@/components/AdminNavigation";

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  interval: "MONTHLY" | "YEARLY";
  features: string[] | any;
  maxUsers: number | null;
  maxIngredients: number | null;
  maxBatches: number | null;
  maxStorageLocations: number | null;
  maxRecipes: number | null;
  maxProducts: number | null;
  isActive: boolean;
  _count: {
    subscriptions: number;
  };
}

interface NewPlan {
  name: string;
  description: string;
  price: number;
  interval: "MONTHLY" | "YEARLY";
  features: string[];
  maxUsers: number | null;
  maxIngredients: number | null;
  maxBatches: number | null;
  maxStorageLocations: number | null;
  maxRecipes: number | null;
  maxProducts: number | null;
  isActive: boolean;
}

export default function SubscriptionPlansPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [newPlan, setNewPlan] = useState<NewPlan>({
    name: "",
    description: "",
    price: 0,
    interval: "MONTHLY",
    features: [],
    maxUsers: null,
    maxIngredients: null,
    maxBatches: null,
    maxStorageLocations: null,
    maxRecipes: null,
    maxProducts: null,
    isActive: true,
  });
  const [editPlan, setEditPlan] = useState<NewPlan>({
    name: "",
    description: "",
    price: 0,
    interval: "MONTHLY",
    features: [],
    maxUsers: null,
    maxIngredients: null,
    maxBatches: null,
    maxStorageLocations: null,
    maxRecipes: null,
    maxProducts: null,
    isActive: true,
  });
  const [newFeature, setNewFeature] = useState("");
  const [editFeature, setEditFeature] = useState("");
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: "success" | "error";
  }>({ show: false, message: "", type: "success" });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<SubscriptionPlan | null>(
    null
  );
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    if (status === "loading") return;

    if (!session || session.user.role !== "PLATFORM_ADMIN") {
      router.push("/dashboard");
      return;
    }

    fetchPlans();
  }, [session, status, router]);

  // Auto-hide toast after 3 seconds
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast((prev) => ({ ...prev, show: false }));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  const showToast = (
    message: string,
    type: "success" | "error" = "success"
  ) => {
    setToast({ show: true, message, type });
  };

  const fetchPlans = async () => {
    try {
      const response = await fetch("/api/admin/subscription-plans");
      if (!response.ok) {
        throw new Error("Failed to fetch subscription plans");
      }
      const data = await response.json();
      setPlans(data);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError("");

    try {
      const response = await fetch("/api/admin/subscription-plans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newPlan),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to create subscription plan"
        );
      }

      await fetchPlans();
      setShowCreateForm(false);
      resetNewPlan();
      showToast("Subscription plan created successfully!", "success");
    } catch (error: any) {
      setError(error.message);
    } finally {
      setCreating(false);
    }
  };

  const handleUpdatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    setUpdating(true);
    setError("");

    try {
      const response = await fetch(
        `/api/admin/subscription-plans/${editingPlan.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(editPlan),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to update subscription plan"
        );
      }

      await fetchPlans();
      setShowEditForm(false);
      setEditingPlan(null);
      resetEditPlan();
      showToast("Subscription plan updated successfully!", "success");
    } catch (error: any) {
      setError(error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeletePlan = (plan: SubscriptionPlan) => {
    setPlanToDelete(plan);
    setDeleteError(""); // Clear any previous error
    setShowDeleteModal(true);
  };

  const confirmDeletePlan = async () => {
    if (!planToDelete) return;

    setDeleting(planToDelete.id);
    setDeleteError(""); // Clear any previous error

    try {
      const response = await fetch(
        `/api/admin/subscription-plans/${planToDelete.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to delete subscription plan"
        );
      }

      await fetchPlans();
      showToast("Subscription plan deleted successfully!", "success");
      setShowDeleteModal(false);
      setPlanToDelete(null);
      setDeleteError("");
    } catch (error: any) {
      setDeleteError(error.message); // Set error in modal instead of page error
    } finally {
      setDeleting(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setPlanToDelete(null);
    setDeleteError(""); // Clear error when closing modal
  };

  const openEditForm = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setEditPlan({
      name: plan.name,
      description: plan.description,
      price: plan.price,
      interval: plan.interval,
      features: Array.isArray(plan.features) ? [...plan.features] : [],
      maxUsers: plan.maxUsers,
      maxIngredients: plan.maxIngredients,
      maxBatches: plan.maxBatches,
      maxStorageLocations: plan.maxStorageLocations,
      maxRecipes: plan.maxRecipes,
      maxProducts: plan.maxProducts,
      isActive: plan.isActive,
    });
    setShowEditForm(true);
  };

  const resetNewPlan = () => {
    setNewPlan({
      name: "",
      description: "",
      price: 0,
      interval: "MONTHLY",
      features: [],
      maxUsers: null,
      maxIngredients: null,
      maxBatches: null,
      maxStorageLocations: null,
      maxRecipes: null,
      maxProducts: null,
      isActive: true,
    });
    setNewFeature("");
  };

  const resetEditPlan = () => {
    setEditPlan({
      name: "",
      description: "",
      price: 0,
      interval: "MONTHLY",
      features: [],
      maxUsers: null,
      maxIngredients: null,
      maxBatches: null,
      maxStorageLocations: null,
      maxRecipes: null,
      maxProducts: null,
      isActive: true,
    });
    setEditFeature("");
  };

  const addFeature = () => {
    if (newFeature.trim() && !newPlan.features.includes(newFeature.trim())) {
      setNewPlan({
        ...newPlan,
        features: [...newPlan.features, newFeature.trim()],
      });
      setNewFeature("");
    }
  };

  const removeFeature = (index: number) => {
    setNewPlan({
      ...newPlan,
      features: newPlan.features.filter((_, i) => i !== index),
    });
  };

  const addEditFeature = () => {
    if (editFeature.trim() && !editPlan.features.includes(editFeature.trim())) {
      setEditPlan({
        ...editPlan,
        features: [...editPlan.features, editFeature.trim()],
      });
      setEditFeature("");
    }
  };

  const removeEditFeature = (index: number) => {
    setEditPlan({
      ...editPlan,
      features: editPlan.features.filter((_, i) => i !== index),
    });
  };

  const formatPrice = (price: number, interval: string) => {
    return `Rp ${price.toLocaleString("id-ID", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}/${interval.toLowerCase()}`;
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session || !["PLATFORM_ADMIN", "SUPPORT"].includes(session.user.role)) {
    return null;
  }

  return (
    <div>
      <AdminNavigation
        title="Subscription Plans"
        subtitle="Manage subscription plans for tenants"
      />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-end items-center mb-8">
          {session.user.role === "PLATFORM_ADMIN" && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
            >
              Create New Plan
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Toast Notification */}
        {toast.show && (
          <div
            className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg transition-all duration-300 ${
              toast.type === "success"
                ? "bg-green-50 border border-green-200 text-green-800"
                : "bg-red-50 border border-red-200 text-red-800"
            }`}
          >
            <div className="flex items-center">
              <span
                className={`mr-2 ${
                  toast.type === "success" ? "text-green-500" : "text-red-500"
                }`}
              >
                {toast.type === "success" ? "✓" : "✕"}
              </span>
              {toast.message}
              <button
                onClick={() => setToast((prev) => ({ ...prev, show: false }))}
                className="ml-4 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Create Plan Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">
                  Create New Subscription Plan
                </h2>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    resetNewPlan();
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreatePlan} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Plan Name
                  </label>
                  <input
                    type="text"
                    value={newPlan.name}
                    onChange={(e) =>
                      setNewPlan({ ...newPlan, name: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newPlan.description}
                    onChange={(e) =>
                      setNewPlan({ ...newPlan, description: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price (IDR)
                    </label>
                    <input
                      type="number"
                      value={newPlan.price}
                      onChange={(e) =>
                        setNewPlan({
                          ...newPlan,
                          price: Number(e.target.value),
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                      step="100"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Billing Interval
                    </label>
                    <select
                      value={newPlan.interval}
                      onChange={(e) =>
                        setNewPlan({
                          ...newPlan,
                          interval: e.target.value as "MONTHLY" | "YEARLY",
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="MONTHLY">Monthly</option>
                      <option value="YEARLY">Yearly</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Users
                    </label>
                    <input
                      type="number"
                      value={newPlan.maxUsers || ""}
                      onChange={(e) =>
                        setNewPlan({
                          ...newPlan,
                          maxUsers: e.target.value
                            ? Number(e.target.value)
                            : null,
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                      placeholder="Unlimited"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Ingredients
                    </label>
                    <input
                      type="number"
                      value={newPlan.maxIngredients || ""}
                      onChange={(e) =>
                        setNewPlan({
                          ...newPlan,
                          maxIngredients: e.target.value
                            ? Number(e.target.value)
                            : null,
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                      placeholder="Unlimited"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Batches
                    </label>
                    <input
                      type="number"
                      value={newPlan.maxBatches || ""}
                      onChange={(e) =>
                        setNewPlan({
                          ...newPlan,
                          maxBatches: e.target.value
                            ? Number(e.target.value)
                            : null,
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                      placeholder="Unlimited"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Storage Locations
                    </label>
                    <input
                      type="number"
                      value={newPlan.maxStorageLocations || ""}
                      onChange={(e) =>
                        setNewPlan({
                          ...newPlan,
                          maxStorageLocations: e.target.value
                            ? Number(e.target.value)
                            : null,
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                      placeholder="Unlimited"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Recipes
                    </label>
                    <input
                      type="number"
                      value={newPlan.maxRecipes || ""}
                      onChange={(e) =>
                        setNewPlan({
                          ...newPlan,
                          maxRecipes: e.target.value
                            ? Number(e.target.value)
                            : null,
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                      placeholder="Unlimited"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Products
                    </label>
                    <input
                      type="number"
                      value={newPlan.maxProducts || ""}
                      onChange={(e) =>
                        setNewPlan({
                          ...newPlan,
                          maxProducts: e.target.value
                            ? Number(e.target.value)
                            : null,
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                      placeholder="Unlimited"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Features
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newFeature}
                      onChange={(e) => setNewFeature(e.target.value)}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Add a feature"
                      onKeyPress={(e) =>
                        e.key === "Enter" && (e.preventDefault(), addFeature())
                      }
                    />
                    <button
                      type="button"
                      onClick={addFeature}
                      className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                  <div className="space-y-1">
                    {newPlan.features.map((feature, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded"
                      >
                        <span>{feature}</span>
                        <button
                          type="button"
                          onClick={() => removeFeature(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={newPlan.isActive}
                    onChange={(e) =>
                      setNewPlan({ ...newPlan, isActive: e.target.checked })
                    }
                    className="mr-2"
                  />
                  <label
                    htmlFor="isActive"
                    className="text-sm font-medium text-gray-700"
                  >
                    Active Plan
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      resetNewPlan();
                    }}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                  >
                    {creating ? "Creating..." : "Create Plan"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Plan Modal */}
        {showEditForm && editingPlan && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Edit Subscription Plan</h2>
                <button
                  onClick={() => {
                    setShowEditForm(false);
                    setEditingPlan(null);
                    resetEditPlan();
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleUpdatePlan} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Plan Name
                  </label>
                  <input
                    type="text"
                    value={editPlan.name}
                    onChange={(e) =>
                      setEditPlan({ ...editPlan, name: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={editPlan.description}
                    onChange={(e) =>
                      setEditPlan({ ...editPlan, description: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price (IDR)
                    </label>
                    <input
                      type="number"
                      value={editPlan.price}
                      onChange={(e) =>
                        setEditPlan({
                          ...editPlan,
                          price: Number(e.target.value),
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                      step="100"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Billing Interval
                    </label>
                    <select
                      value={editPlan.interval}
                      onChange={(e) =>
                        setEditPlan({
                          ...editPlan,
                          interval: e.target.value as "MONTHLY" | "YEARLY",
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="MONTHLY">Monthly</option>
                      <option value="YEARLY">Yearly</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Users
                    </label>
                    <input
                      type="number"
                      value={editPlan.maxUsers || ""}
                      onChange={(e) =>
                        setEditPlan({
                          ...editPlan,
                          maxUsers: e.target.value
                            ? Number(e.target.value)
                            : null,
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                      placeholder="Unlimited"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Ingredients
                    </label>
                    <input
                      type="number"
                      value={editPlan.maxIngredients || ""}
                      onChange={(e) =>
                        setEditPlan({
                          ...editPlan,
                          maxIngredients: e.target.value
                            ? Number(e.target.value)
                            : null,
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                      placeholder="Unlimited"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Batches
                    </label>
                    <input
                      type="number"
                      value={editPlan.maxBatches || ""}
                      onChange={(e) =>
                        setEditPlan({
                          ...editPlan,
                          maxBatches: e.target.value
                            ? Number(e.target.value)
                            : null,
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                      placeholder="Unlimited"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Storage Locations
                    </label>
                    <input
                      type="number"
                      value={editPlan.maxStorageLocations || ""}
                      onChange={(e) =>
                        setEditPlan({
                          ...editPlan,
                          maxStorageLocations: e.target.value
                            ? Number(e.target.value)
                            : null,
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                      placeholder="Unlimited"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Recipes
                    </label>
                    <input
                      type="number"
                      value={editPlan.maxRecipes || ""}
                      onChange={(e) =>
                        setEditPlan({
                          ...editPlan,
                          maxRecipes: e.target.value
                            ? Number(e.target.value)
                            : null,
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                      placeholder="Unlimited"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Products
                    </label>
                    <input
                      type="number"
                      value={editPlan.maxProducts || ""}
                      onChange={(e) =>
                        setEditPlan({
                          ...editPlan,
                          maxProducts: e.target.value
                            ? Number(e.target.value)
                            : null,
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                      placeholder="Unlimited"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Features
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={editFeature}
                      onChange={(e) => setEditFeature(e.target.value)}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Add a feature"
                      onKeyPress={(e) =>
                        e.key === "Enter" &&
                        (e.preventDefault(), addEditFeature())
                      }
                    />
                    <button
                      type="button"
                      onClick={addEditFeature}
                      className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                    >
                      Add
                    </button>
                  </div>
                  <div className="space-y-1">
                    {editPlan.features.map((feature, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded"
                      >
                        <span>{feature}</span>
                        <button
                          type="button"
                          onClick={() => removeEditFeature(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="editIsActive"
                    checked={editPlan.isActive}
                    onChange={(e) =>
                      setEditPlan({ ...editPlan, isActive: e.target.checked })
                    }
                    className="mr-2"
                  />
                  <label
                    htmlFor="editIsActive"
                    className="text-sm font-medium text-gray-700"
                  >
                    Active Plan
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditForm(false);
                      setEditingPlan(null);
                      resetEditPlan();
                    }}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updating}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                  >
                    {updating ? "Updating..." : "Update Plan"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {plan.name}
                  </h3>
                  <p className="text-gray-600 text-sm mt-1">
                    {plan.description}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      plan.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {plan.isActive ? "Active" : "Inactive"}
                  </span>
                  {session.user.role === "PLATFORM_ADMIN" && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEditForm(plan)}
                        className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded cursor-pointer"
                        title="Edit plan"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeletePlan(plan)}
                        disabled={deleting === plan.id}
                        className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded disabled:opacity-50 cursor-pointer"
                        title="Delete plan"
                      >
                        {deleting === plan.id ? (
                          <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <div className="text-3xl font-bold text-blue-600">
                  {formatPrice(plan.price, plan.interval)}
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="text-sm text-gray-600">
                  <strong>Limits:</strong>
                </div>
                <div className="text-sm text-gray-700">
                  • Users: {plan.maxUsers || "Unlimited"}
                </div>
                <div className="text-sm text-gray-700">
                  • Ingredients: {plan.maxIngredients || "Unlimited"}
                </div>
                <div className="text-sm text-gray-700">
                  • Batches: {plan.maxBatches || "Unlimited"}
                </div>
                <div className="text-sm text-gray-700">
                  • Storage Locations: {plan.maxStorageLocations || "Unlimited"}
                </div>
                <div className="text-sm text-gray-700">
                  • Recipes: {plan.maxRecipes || "Unlimited"}
                </div>
                <div className="text-sm text-gray-700">
                  • Products: {plan.maxProducts || "Unlimited"}
                </div>
              </div>

              {Array.isArray(plan.features) && plan.features.length > 0 && (
                <div className="mb-4">
                  <div className="text-sm text-gray-600 mb-2">
                    <strong>Features:</strong>
                  </div>
                  <ul className="text-sm text-gray-700 space-y-1">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <span className="text-green-500 mr-2">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  <strong>{plan._count.subscriptions}</strong> active
                  subscription
                  {plan._count.subscriptions !== 1 ? "s" : ""}
                </div>
              </div>
            </div>
          ))}
        </div>

        {plans.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg">
              No subscription plans found
            </div>
            <p className="text-gray-400 mt-2">
              Create your first subscription plan to get started
            </p>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <DeleteConfirmModal
          isOpen={showDeleteModal}
          onClose={cancelDelete}
          onConfirm={confirmDeletePlan}
          title="Delete Subscription Plan"
          message="Are you sure you want to delete this subscription plan?"
          itemName={planToDelete?.name}
          isDeleting={deleting === planToDelete?.id}
          error={deleteError}
        />
      </div>
    </div>
  );
}
