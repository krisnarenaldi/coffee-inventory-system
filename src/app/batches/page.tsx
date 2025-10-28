"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navigation from "../../components/Navigation";
import DeleteConfirmModal from "../../components/DeleteConfirmModal";

interface Recipe {
  id: string;
  name: string;
  style?: string;
  expectedYield: number;
}

interface User {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  quantity: number;
  packagingType: string;
}

interface Batch {
  id: string;
  batchNumber: string;
  status: string;
  startDate?: string;
  endDate?: string;
  actualYield?: number;
  notes?: string;
  measurements?: Record<string, any>;
  createdAt: string;
  recipe: Recipe;
  createdBy: User;
  products: Product[];
}

interface BatchFormData {
  recipeId: string;
  batchNumber: string;
  startDate: string;
  notes: string;
  measurements: Record<string, any>;
  actualYield: number;
  status: string;
}

const statusColors = {
  PLANNED: "bg-gray-100 text-gray-800",
  GREEN_BEANS: "bg-green-100 text-green-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-gray-100 text-gray-800",
  CANCELLED: "bg-red-100 text-red-800",
};

const statusLabels = {
  PLANNED: "Planned",
  GREEN_BEANS: "Green Beans Ready",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

// Helper function to format date as dd-MM-yyyy
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

export default function BatchesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState<Batch | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filters and pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [recipeFilter, setRecipeFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");

  const [formData, setFormData] = useState<BatchFormData>({
    recipeId: "",
    batchNumber: "",
    startDate: "",
    notes: "",
    measurements: {},
    actualYield: 0,
    status: "PLANNED",
  });

  // Add Escape key listener for modals
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (showDeleteModal) {
          setShowDeleteModal(false);
          setBatchToDelete(null);
          setIsDeleting(false);
        } else if (showForm) {
          setShowForm(false);
          setEditingBatch(null);
          setFormData({
            recipeId: "",
            batchNumber: "",
            startDate: "",
            notes: "",
            measurements: {},
            actualYield: 0,
            status: "PLANNED",
          });
        }
      }
    };

    document.addEventListener("keydown", handleEscapeKey);
    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [showDeleteModal, showForm]);

  // Redirect if subscription is expired
  useEffect(() => {
    if (status === "loading") return;
    if (!session) return;
    if (session.user?.subscriptionExpired) {
      router.push("/subscription?expired=true");
    }
  }, [status, session, router]);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/auth/signin");
      return;
    }
    fetchBatches();
    fetchRecipes();
  }, [
    session,
    status,
    router,
    currentPage,
    searchTerm,
    statusFilter,
    recipeFilter,
    sortBy,
    sortOrder,
  ]);

  const fetchBatches = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10",
        sortBy,
        sortOrder,
      });

      if (searchTerm) params.append("search", searchTerm);
      if (statusFilter) params.append("status", statusFilter);
      if (recipeFilter) params.append("recipeId", recipeFilter);

      const response = await fetch(`/api/batches?${params}`);
      if (response.ok) {
        const data = await response.json();
        setBatches(data.batches);
        setTotalPages(data.pagination.pages);
        setTotalCount(data.pagination.total || 0);
      } else {
        setError("Failed to fetch batches");
      }
    } catch (err) {
      setError("Failed to fetch batches");
    } finally {
      setLoading(false);
    }
  };

  const fetchRecipes = async () => {
    try {
      const response = await fetch("/api/recipes?limit=100"); // Get all recipes for dropdown
      if (response.ok) {
        const data = await response.json();
        setRecipes(data.recipes || []);
      }
    } catch (err) {
      console.error("Failed to fetch recipes:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const url = editingBatch
        ? `/api/batches/${editingBatch.id}`
        : "/api/batches";
      const method = editingBatch ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSuccess(
          editingBatch
            ? "Batch updated successfully"
            : "Batch created successfully"
        );

        // Clear success message after 2 seconds
        setTimeout(() => setSuccess(""), 2000);

        setShowForm(false);
        setEditingBatch(null);
        resetForm();
        fetchBatches();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to save batch");
      }
    } catch (err) {
      setError("Failed to save batch");
    }
  };

  const handleStartBatch = async (batchId: string) => {
    try {
      const response = await fetch(`/api/batches/${batchId}/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        setSuccess("Roast batch started successfully");

        // Clear success message after 2 seconds
        setTimeout(() => setSuccess(""), 2000);

        fetchBatches();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to start batch");
      }
    } catch (err) {
      setError("Failed to start batch");
    }
  };

  const handleStatusUpdate = async (batchId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/batches/${batchId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setSuccess("Batch status updated successfully");

        // Clear success message after 2 seconds
        setTimeout(() => setSuccess(""), 2000);

        fetchBatches();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to update batch status");
      }
    } catch (err) {
      setError("Failed to update batch status");
    }
  };

  const handleDelete = (batch: Batch) => {
    setBatchToDelete(batch);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!batchToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/batches/${batchToDelete.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setSuccess("Batch deleted successfully");

        // Clear success message after 2 seconds
        setTimeout(() => setSuccess(""), 2000);

        fetchBatches();
        setShowDeleteModal(false);
        setBatchToDelete(null);
      } else {
        const data = await response.json();
        setError(data.error || "Failed to delete batch");
      }
    } catch (err) {
      setError("Failed to delete batch");
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setBatchToDelete(null);
  };

  const resetForm = () => {
    setFormData({
      recipeId: "",
      batchNumber: "",
      startDate: "",
      notes: "",
      measurements: {},
      actualYield: 0,
      status: "PLANNED",
    });
    setError("");
  };

  const generateBatchNumber = () => {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
    const timeStr = date.toTimeString().slice(0, 5).replace(":", "");
    return `ROAST-${dateStr}-${timeStr}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading roast batches...</p>
          <p className="mt-2 text-sm text-gray-500">
            Session: {status}, Batches: {batches.length}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation
        title="Roast Batches"
        subtitle="Track and manage your coffee roasting batches"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-4">
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={() => {
              setEditingBatch(null);
              resetForm();
              setFormData((prev) => ({
                ...prev,
                batchNumber: generateBatchNumber(),
              }));
              fetchRecipes(); // Refresh recipes list
              setShowForm(true);
            }}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Start New Roast Batch
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Batches
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by batch number or notes..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="">All Statuses</option>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Roast Profile
              </label>
              <select
                value={recipeFilter}
                onChange={(e) => setRecipeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="">All Profiles</option>
                {recipes.map((recipe) => (
                  <option key={recipe.id} value={recipe.id}>
                    {recipe.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort By
              </label>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split("-");
                  setSortBy(field);
                  setSortOrder(order);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="createdAt-desc">Newest First</option>
                <option value="createdAt-asc">Oldest First</option>
                <option value="batchNumber-asc">Batch Number A-Z</option>
                <option value="batchNumber-desc">Batch Number Z-A</option>
                <option value="status-asc">Status A-Z</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            {success}
          </div>
        )}

        {/* Batches Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Batch Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Roast Profile
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Start Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Yield
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {batches.map((batch) => (
                <tr key={batch.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {batch.batchNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>
                      <div className="font-medium">{batch.recipe.name}</div>
                      {batch.recipe.style && (
                        <div className="text-xs text-gray-400">
                          {batch.recipe.style}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        statusColors[
                          batch.status as keyof typeof statusColors
                        ] || "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {statusLabels[
                        batch.status as keyof typeof statusLabels
                      ] || batch.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {batch.startDate ? formatDate(batch.startDate) : "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>
                      <div>
                        {batch.status === "COMPLETED" 
                          ? batch.actualYield 
                            ? `${batch.actualYield} kg`
                            : `Expected: ${batch.recipe.expectedYield} kg`
                          : batch.actualYield 
                            ? `${batch.actualYield} kg` 
                            : "-"
                        }
                      </div>
                      {batch.status === "COMPLETED" && batch.actualYield && (
                        <div className="text-xs text-gray-400">
                          Expected: {batch.recipe.expectedYield} kg
                        </div>
                      )}
                      {batch.status !== "COMPLETED" && (
                        <div className="text-xs text-gray-400">
                          Expected: {batch.recipe.expectedYield} kg
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    {batch.status === "PLANNED" && (
                      <button
                        onClick={() => handleStartBatch(batch.id)}
                        className="text-green-600 hover:text-green-900 cursor-pointer"
                      >
                        Start Roast
                      </button>
                    )}
                    {batch.status !== "COMPLETED" &&
                      batch.status !== "CANCELLED" && (
                        <select
                          value={batch.status}
                          onChange={(e) =>
                            handleStatusUpdate(batch.id, e.target.value)
                          }
                          className="text-sm border border-gray-300 rounded px-2 py-1"
                        >
                          {Object.entries(statusLabels).map(
                            ([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            )
                          )}
                        </select>
                      )}
                    <button
                      onClick={() => {
                        setEditingBatch(batch);
                        setFormData({
                          recipeId: batch.recipe.id,
                          batchNumber: batch.batchNumber,
                          startDate: batch.startDate
                            ? batch.startDate.split("T")[0]
                            : "",
                          notes: batch.notes || "",
                          measurements: batch.measurements || {},
                          actualYield: batch.actualYield || 0,
                          status: batch.status,
                        });
                        fetchRecipes(); // Refresh recipes list
                        setShowForm(true);
                      }}
                      className="text-blue-600 hover:text-blue-900 cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(batch)}
                      className="text-red-600 hover:text-red-900 cursor-pointer"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {batches.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No roast batches found.</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Previous
                </button>
                <button
                  onClick={() =>
                    setCurrentPage(Math.min(totalPages, currentPage + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing{" "}
                    <span className="font-medium">
                      {(currentPage - 1) * 10 + 1}
                    </span>{" "}
                    to{" "}
                    <span className="font-medium">
                      {Math.min(currentPage * 10, totalCount)}
                    </span>{" "}
                    of <span className="font-medium">{totalCount}</span> results
                  </p>
                </div>
                <div>
                  <nav
                    className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                    aria-label="Pagination"
                  >
                    <button
                      onClick={() =>
                        setCurrentPage(Math.max(1, currentPage - 1))
                      }
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <span className="sr-only">Previous</span>
                      <svg
                        className="h-5 w-5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium cursor-pointer ${
                            pageNum === currentPage
                              ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                              : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    <button
                      onClick={() =>
                        setCurrentPage(Math.min(totalPages, currentPage + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <span className="sr-only">Next</span>
                      <svg
                        className="h-5 w-5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Batch Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingBatch ? "Edit Roast Batch" : "Create New Roast Batch"}
              </h3>

              {/* Error Message Display */}
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-center">
                    <svg
                      className="h-5 w-5 text-red-400 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-red-800 font-medium">{error}</span>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Roast Profile *
                    </label>
                    <select
                      value={formData.recipeId}
                      onChange={(e) =>
                        setFormData({ ...formData, recipeId: e.target.value })
                      }
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a roast profile</option>
                      {recipes.map((recipe) => (
                        <option key={recipe.id} value={recipe.id}>
                          {recipe.name} {recipe.style && `(${recipe.style})`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Batch Number *
                    </label>
                    <input
                      type="text"
                      value={formData.batchNumber}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          batchNumber: e.target.value,
                        })
                      }
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Scheduled Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value.length <= 191) {
                        setFormData({ ...formData, notes: value });
                      }
                    }}
                    rows={3}
                    maxLength={191}
                    placeholder="Roasting notes, special instructions, etc."
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                      formData.notes.length > 191
                        ? "border-red-300 focus:ring-red-500"
                        : "border-gray-300 focus:ring-blue-500"
                    }`}
                  />
                  <div className="mt-1 text-sm text-gray-500 text-right">
                    {formData.notes.length}/191 characters
                  </div>
                </div>

                {/* Actual Yield field - only show for completed batches */}
                {editingBatch && formData.status === "COMPLETED" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Actual Yield (kg) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.actualYield}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          actualYield: parseFloat(e.target.value) || 0,
                        })
                      }
                      required
                      placeholder="Enter actual yield in kg"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="mt-1 text-sm text-gray-500">
                      Expected: {recipes.find(r => r.id === formData.recipeId)?.expectedYield || 0} kg
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingBatch(null);
                      resetForm();
                      setError("");
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 cursor-pointer"
                  >
                    {editingBatch ? "Update Batch" : "Create Batch"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title="Delete Batch"
        message="Are you sure you want to delete this batch?"
        itemName={batchToDelete?.batchNumber}
        isDeleting={isDeleting}
      />
    </div>
  );
}
