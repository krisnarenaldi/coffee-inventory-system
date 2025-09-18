"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Navigation from "../../components/Navigation";
import ProtectedPage from "../../components/ProtectedPage";
import DeleteConfirmModal from "../../components/DeleteConfirmModal";

interface StorageLocation {
  id: string;
  name: string;
  description: string | null;
  capacity: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface StorageLocationFormData {
  name: string;
  description: string;
  capacity: string;
  isActive: boolean;
}

export default function StorageLocationsPage() {
  const { data: session } = useSession();
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] =
    useState<StorageLocation | null>(null);
  const [formData, setFormData] = useState<StorageLocationFormData>({
    name: "",
    description: "",
    capacity: "",
    isActive: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLocationId, setDeleteLocationId] = useState<string | null>(null);
  const [deleteLocationName, setDeleteLocationName] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  // Add Escape key listener for modals
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (showDeleteModal) {
          setShowDeleteModal(false);
          setDeleteLocationId(null);
          setDeleteLocationName("");
          setIsDeleting(false);
        } else if (isModalOpen) {
          setIsModalOpen(false);
          setEditingLocation(null);
          setFormData({
            name: "",
            description: "",
            capacity: "",
            isActive: true,
          });
          setFormErrors({});
          setError("");
          setSuccess("");
        }
      }
    };

    document.addEventListener("keydown", handleEscapeKey);
    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [showDeleteModal, isModalOpen]);

  useEffect(() => {
    fetchStorageLocations();
  }, [showInactive]);

  const fetchStorageLocations = async () => {
    try {
      setLoading(true);
      const url = showInactive 
        ? "/api/storage-locations?includeInactive=true" 
        : "/api/storage-locations";
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch storage locations");
      }
      const data = await response.json();
      setStorageLocations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = "Name is required";
    }

    if (formData.capacity && isNaN(Number(formData.capacity))) {
      errors.capacity = "Capacity must be a valid number";
    }

    if (formData.capacity && Number(formData.capacity) < 0) {
      errors.capacity = "Capacity cannot be negative";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        capacity: formData.capacity ? Number(formData.capacity) : null,
        isActive: formData.isActive,
      };

      const url = editingLocation
        ? `/api/storage-locations/${editingLocation.id}`
        : "/api/storage-locations";
      const method = editingLocation ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save storage location");
      }

      await fetchStorageLocations();
      handleCloseModal();
      setSuccess(
        editingLocation
          ? "Storage location updated successfully!"
          : "Storage location created successfully!"
      );
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
    setDeleteLocationId(id);
    setDeleteLocationName(name);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteLocationId) return;

    setIsDeleting(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/storage-locations/${deleteLocationId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete storage location");
      }

      await fetchStorageLocations();
      setSuccess("Storage location deleted successfully!");
      setShowDeleteModal(false);
      setDeleteLocationId(null);
      setDeleteLocationName("");

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
    setDeleteLocationId(null);
    setDeleteLocationName("");
    setIsDeleting(false);
  };

  const handleEdit = (location: StorageLocation) => {
    setError("");
    setSuccess("");
    setEditingLocation(location);
    setFormData({
      name: location.name,
      description: location.description || "",
      capacity: location.capacity?.toString() || "",
      isActive: location.isActive,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingLocation(null);
    setFormData({
      name: "",
      description: "",
      capacity: "",
      isActive: true,
    });
    setFormErrors({});
    setError("");
    setSuccess("");
  };

  return (
    <>
      <Navigation
        title="Storage Locations"
        subtitle="Manage your storage locations and capacity"
      />

      <ProtectedPage requiredPermission="inventory">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-end items-center gap-4 mt-2.5">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="showInactive"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="showInactive" className="text-sm text-gray-700">
                Show inactive
              </label>
            </div>
            <button
              onClick={() => {
                setError("");
                setSuccess("");
                setIsModalOpen(true);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors cursor-pointer"
            >
              Add Storage Location
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {/* Success Message */}
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

          {/* Storage Locations Table */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">
                  Loading storage locations...
                </p>
              </div>
            ) : storageLocations.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500">No storage locations found.</p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="mt-2 text-blue-600 hover:text-blue-800 cursor-pointer"
                >
                  Create your first storage location
                </button>
              </div>
            ) : (
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
                      Capacity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {storageLocations.map((location) => (
                    <tr key={location.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {location.name}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {location.description || "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {location.capacity
                            ? `${location.capacity} units`
                            : "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            location.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {location.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleEdit(location)}
                          className="text-blue-600 hover:text-blue-900 cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() =>
                            handleDelete(location.id, location.name)
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
            )}
          </div>

          {/* Modal */}
          {isModalOpen && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
              <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div className="mt-3">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    {editingLocation
                      ? "Edit Storage Location"
                      : "Add Storage Location"}
                  </h3>

                  {/* Error Message within Modal */}
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          formErrors.name ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="Enter storage location name"
                      />
                      {formErrors.name && (
                        <p className="mt-1 text-sm text-red-600">
                          {formErrors.name}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            description: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter description (optional)"
                        rows={3}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Capacity
                      </label>
                      <input
                        type="number"
                        value={formData.capacity}
                        onChange={(e) =>
                          setFormData({ ...formData, capacity: e.target.value })
                        }
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          formErrors.capacity
                            ? "border-red-500"
                            : "border-gray-300"
                        }`}
                        placeholder="Enter capacity (optional)"
                        min="0"
                      />
                      {formErrors.capacity && (
                        <p className="mt-1 text-sm text-red-600">
                          {formErrors.capacity}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="isActive"
                        checked={formData.isActive}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            isActive: e.target.checked,
                          })
                        }
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label
                        htmlFor="isActive"
                        className="ml-2 block text-sm text-gray-900"
                      >
                        Active
                      </label>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={handleCloseModal}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 cursor-pointer"
                      >
                        {submitting
                          ? "Saving..."
                          : editingLocation
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
        title="Delete Storage Location"
        message={`Are you sure you want to delete "${deleteLocationName}"? This action cannot be undone.`}
        itemName={deleteLocationName}
        isDeleting={isDeleting}
        error={error || undefined}
      />
    </>
  );
}
