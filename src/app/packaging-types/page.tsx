"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Navigation from "../../components/Navigation";
import ProtectedPage from "../../components/ProtectedPage";
import DeleteConfirmModal from "../../components/DeleteConfirmModal";

interface PackagingType {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PackagingTypeFormData {
  name: string;
  description: string;
  isActive: boolean;
}

export default function PackagingTypesPage() {
  const { data: session } = useSession();
  const [packagingTypes, setPackagingTypes] = useState<PackagingType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingPackagingType, setEditingPackagingType] =
    useState<PackagingType | null>(null);
  const [formData, setFormData] = useState<PackagingTypeFormData>({
    name: "",
    description: "",
    isActive: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePackagingTypeId, setDeletePackagingTypeId] = useState<
    string | null
  >(null);
  const [deletePackagingTypeName, setDeletePackagingTypeName] =
    useState<string>("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  // Add Escape key listener for modals
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (showDeleteModal) {
          setShowDeleteModal(false);
          setDeletePackagingTypeId(null);
          setDeletePackagingTypeName("");
          setIsDeleting(false);
        } else if (showModal) {
          setError("");
          setSuccess("");
          setFormData({
            name: "",
            description: "",
            isActive: true,
          });
          setFormErrors({});
          setEditingPackagingType(null);
          setShowModal(false);
        }
      }
    };

    document.addEventListener("keydown", handleEscapeKey);
    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [showDeleteModal, showModal]);

  useEffect(() => {
    if (session?.user?.tenantId) {
      fetchPackagingTypes();
    }
  }, [session, showInactive]);

  const fetchPackagingTypes = async () => {
    try {
      setLoading(true);
      const url = showInactive ? "/api/packaging-types?includeInactive=true" : "/api/packaging-types";
      const response = await fetch(url, {
        // Add cache control for better performance
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      if (!response.ok) {
        throw new Error("Failed to fetch packaging types");
      }
      const data = await response.json();
      setPackagingTypes(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");
    setFormErrors({});

    // Client-side validation
    const errors: { [key: string]: string } = {};
    if (!formData.name.trim()) {
      errors.name = "Name is required";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setSubmitting(false);
      return;
    }

    try {
      const url = editingPackagingType
        ? `/api/packaging-types/${editingPackagingType.id}`
        : "/api/packaging-types";
      const method = editingPackagingType ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save packaging type");
      }

      // Optimized: Only fetch if we're not editing or if we need to refresh the list
      if (!editingPackagingType || showInactive) {
        await fetchPackagingTypes();
      } else {
        // For edits, update the local state directly for better performance
        const updatedPackagingType = await response.json();
        setPackagingTypes(prev => 
          prev.map(pt => pt.id === updatedPackagingType.id ? updatedPackagingType : pt)
        );
      }

      setSuccess(
        editingPackagingType
          ? "Packaging type updated successfully!"
          : "Packaging type created successfully!"
      );

      // Reset form
      setFormData({
        name: "",
        description: "",
        isActive: true,
      });
      setFormErrors({});
      setEditingPackagingType(null);
      setShowModal(false);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    setDeletePackagingTypeId(id);
    setDeletePackagingTypeName(name);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deletePackagingTypeId) return;

    setIsDeleting(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/packaging-types/${deletePackagingTypeId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete packaging type");
      }

      await fetchPackagingTypes();
      setSuccess("Packaging type deleted successfully!");
      setShowDeleteModal(false);
      setDeletePackagingTypeId(null);
      setDeletePackagingTypeName("");

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setDeletePackagingTypeId(null);
    setDeletePackagingTypeName("");
    setIsDeleting(false);
  };

  const handleEdit = (packagingType: PackagingType) => {
    setError("");
    setSuccess("");
    setEditingPackagingType(packagingType);
    setFormData({
      name: packagingType.name,
      description: packagingType.description || "",
      isActive: packagingType.isActive,
    });
    setShowModal(true);
  };

  const resetForm = (preserveMessages = false) => {
    if (!preserveMessages) {
      setError("");
      setSuccess("");
    }
    setFormData({
      name: "",
      description: "",
      isActive: true,
    });
    setFormErrors({});
    setEditingPackagingType(null);
    setShowModal(false);
  };

  const handleCancel = () => {
    resetForm();
  };

  if (loading) {
    return (
      <>
        <Navigation />
        <ProtectedPage requiredPermission="packaging-types">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center">Loading...</div>
          </div>
        </ProtectedPage>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <ProtectedPage requiredPermission="packaging-types">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">
              Packaging Types
            </h1>
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Show inactive</span>
              </label>
              <button
                onClick={() => {
                  setError("");
                  setSuccess("");
                  setShowModal(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded cursor-pointer"
              >
                Add Packaging Type
              </button>
            </div>
          </div>

          {/* Error Toast Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {/* Success Toast Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6 flex items-center">
              <svg
                className="w-5 h-5 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              {success}
            </div>
          )}

          {/* Packaging Types Table */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
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
                {packagingTypes.map((packagingType) => (
                  <tr key={packagingType.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {packagingType.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {packagingType.description || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          packagingType.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {packagingType.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(packagingType.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleEdit(packagingType)}
                        className="text-blue-600 hover:text-blue-900 cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() =>
                          handleDelete(packagingType.id, packagingType.name)
                        }
                        className="text-red-600 hover:text-red-900 cursor-pointer"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {packagingTypes.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No packaging types found. Create your first packaging type to
                get started.
              </div>
            )}
          </div>

          {/* Modal */}
          {showModal && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
              <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div className="mt-3">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    {editingPackagingType
                      ? "Edit Packaging Type"
                      : "Add New Packaging Type"}
                  </h3>
                  <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                      <label
                        htmlFor="name"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Name *
                      </label>
                      <input
                        type="text"
                        id="name"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                          formErrors.name ? "border-red-300" : "border-gray-300"
                        }`}
                        placeholder="Enter packaging type name"
                      />
                      {formErrors.name && (
                        <p className="mt-1 text-sm text-red-600">
                          {formErrors.name}
                        </p>
                      )}
                    </div>

                    <div className="mb-4">
                      <label
                        htmlFor="description"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Description
                      </label>
                      <textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            description: e.target.value,
                          })
                        }
                        rows={3}
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                          formErrors.description
                            ? "border-red-300"
                            : "border-gray-300"
                        }`}
                        placeholder="Enter description (optional)"
                      />
                      {formErrors.description && (
                        <p className="mt-1 text-sm text-red-600">
                          {formErrors.description}
                        </p>
                      )}
                    </div>

                    <div className="mb-6">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.isActive}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              isActive: e.target.checked,
                            })
                          }
                          className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          Active
                        </span>
                      </label>
                    </div>

                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={handleCancel}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 border border-gray-300 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 cursor-pointer"
                      >
                        {submitting
                          ? "Saving..."
                          : editingPackagingType
                          ? "Update"
                          : "Create"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </ProtectedPage>

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title="Delete Packaging Type"
        message={`Are you sure you want to delete "${deletePackagingTypeName}"? This action cannot be undone.`}
        itemName={deletePackagingTypeName}
        isDeleting={isDeleting}
        error={error || undefined}
      />
    </>
  );
}
