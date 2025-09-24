"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navigation from "../../components/Navigation";
import ProtectedPage from "../../components/ProtectedPage";
import DeleteConfirmModal from "../../components/DeleteConfirmModal";

interface Batch {
  id: string;
  batchNumber: string;
  recipe: {
    id: string;
    name: string;
    style?: string;
  };
}

interface PackagingType {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

interface StorageLocation {
  id: string;
  name: string;
  description?: string;
  capacity?: number;
  isActive: boolean;
}

interface Product {
  id: string;
  name: string;
  packagingType?: {
    id: string;
    name: string;
  };
  packagingDate?: string;
  lotNumber?: string;
  quantity: number;
  shelfLife?: number;
  storageLocation?: string;
  status: string;
  createdAt: string;
  batch?: Batch;
}

interface ProductFormData {
  batchId: string;
  name: string;
  packagingTypeId: string;
  packagingDate: string;
  lotNumber: string;
  quantity: number;
  shelfLife: number | "";
  storageLocation: string;
  status: string;
}

// Packaging types are now fetched from the API

const statusColors = {
  IN_STOCK: "bg-green-100 text-green-800",
  LOW_STOCK: "bg-yellow-100 text-yellow-800",
  OUT_OF_STOCK: "bg-red-100 text-red-800",
  EXPIRED: "bg-gray-100 text-gray-800",
  RECALLED: "bg-red-100 text-red-800",
};

const statusLabels = {
  IN_STOCK: "In Stock",
  LOW_STOCK: "Low Stock",
  OUT_OF_STOCK: "Out of Stock",
  EXPIRED: "Expired",
  RECALLED: "Recalled",
};

export default function ProductsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [packagingTypes, setPackagingTypes] = useState<PackagingType[]>([]);
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Filters and pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [packagingFilter, setPackagingFilter] = useState("");
  const [batchFilter, setBatchFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [deleteProductName, setDeleteProductName] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<ProductFormData>({
    batchId: "",
    name: "",
    packagingTypeId: "",
    packagingDate: "",
    lotNumber: "",
    quantity: 0,
    shelfLife: "",
    storageLocation: "",
    status: "IN_STOCK",
  });

  // Add Escape key listener for modals
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showDeleteModal) {
          setShowDeleteModal(false);
          setDeleteProductId(null);
          setDeleteProductName("");
          setIsDeleting(false);
        } else if (showForm) {
          setShowForm(false);
          setEditingProduct(null);
          setFormData({
            batchId: "",
            name: "",
            packagingTypeId: "",
            packagingDate: "",
            lotNumber: "",
            quantity: 0,
            shelfLife: "",
            storageLocation: "",
            status: "IN_STOCK",
          });
        }
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [showDeleteModal, showForm]);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/auth/signin");
      return;
    }
    fetchProducts();
    fetchBatches();
    fetchPackagingTypes();
    fetchStorageLocations();
  }, [
    session,
    status,
    router,
    currentPage,
    searchTerm,
    statusFilter,
    packagingFilter,
    batchFilter,
    sortBy,
    sortOrder,
  ]);

  const fetchProducts = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10",
        sortBy,
        sortOrder,
      });

      if (searchTerm) params.append("search", searchTerm);
      if (statusFilter) params.append("status", statusFilter);
      if (packagingFilter) params.append("packagingType", packagingFilter);
      if (batchFilter) params.append("batchId", batchFilter);

      const response = await fetch(`/api/products?${params}`);
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products);
        setTotalPages(data.pagination.pages);
      } else {
        setError("Failed to fetch products");
      }
    } catch (err) {
      setError("Failed to fetch products");
    } finally {
      setLoading(false);
    }
  };

  const fetchBatches = async () => {
    try {
      const response = await fetch("/api/batches?limit=100");
      if (response.ok) {
        const data = await response.json();
        setBatches(data.batches || []);
      }
    } catch (err) {
      console.error("Failed to fetch batches:", err);
    }
  };

  const fetchPackagingTypes = async () => {
    try {
      const response = await fetch("/api/packaging-types");
      if (response.ok) {
        const data = await response.json();
        setPackagingTypes(data.filter((type: PackagingType) => type.isActive));
      }
    } catch (err) {
      console.error("Failed to fetch packaging types:", err);
    }
  };

  const fetchStorageLocations = async () => {
    try {
      const response = await fetch("/api/storage-locations");
      if (response.ok) {
        const data = await response.json();
        setStorageLocations(data.filter((location: StorageLocation) => location.isActive));
      }
    } catch (err) {
      console.error("Failed to fetch storage locations:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent duplicate submissions
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const url = editingProduct
        ? `/api/products/${editingProduct.id}`
        : "/api/products";
      const method = editingProduct ? "PUT" : "POST";

      const submitData = {
        ...formData,
        batchId: formData.batchId === "" ? undefined : formData.batchId,
        packagingDate: formData.packagingDate === "" ? undefined : formData.packagingDate,
        lotNumber: formData.lotNumber === "" ? undefined : formData.lotNumber,
        storageLocation: formData.storageLocation === "" ? undefined : formData.storageLocation,
        quantity: Number(formData.quantity),
        shelfLife:
          formData.shelfLife === "" ? undefined : Number(formData.shelfLife),
      };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        setSuccess(
          editingProduct
            ? "Product updated successfully"
            : "Product created successfully"
        );
        setShowForm(false);
        setEditingProduct(null);
        resetForm();
        fetchProducts();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to save product");
      }
    } catch (err) {
      setError("Failed to save product");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (productId: string, productName: string) => {
    setDeleteProductId(productId);
    setDeleteProductName(productName);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteProductId) return;

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/products/${deleteProductId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setSuccess("Product deleted successfully");
        fetchProducts();
        setShowDeleteModal(false);
        setDeleteProductId(null);
        setDeleteProductName("");
      } else {
        const data = await response.json();
        setError(data.error || "Failed to delete product");
      }
    } catch (err) {
      setError("Failed to delete product");
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setDeleteProductId(null);
    setDeleteProductName("");
    setIsDeleting(false);
  };

  const resetForm = () => {
    setFormData({
      batchId: "",
      name: "",
      packagingTypeId: "",
      packagingDate: "",
      lotNumber: "",
      quantity: 0,
      shelfLife: "",
      storageLocation: "",
      status: "IN_STOCK",
    });
  };

  const generateLotNumber = () => {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
    const timeStr = date.toTimeString().slice(0, 5).replace(":", "");
    return `LOT-${dateStr}-${timeStr}`;
  };

  const calculateExpiryDate = (packagingDate: string, shelfLife: number) => {
    if (!packagingDate || !shelfLife) return null;
    const date = new Date(packagingDate);
    date.setDate(date.getDate() + shelfLife);
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading coffee products...</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedPage requiredPermission="products">
      <div className="min-h-screen bg-gray-50">
        <Navigation
          title="Coffee Products"
          subtitle="Manage your finished coffee products inventory"
        />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-4">
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={() => {
              setEditingProduct(null);
              resetForm();
              setFormData((prev) => ({
                ...prev,
                lotNumber: generateLotNumber(),
                packagingDate: new Date().toISOString().split("T")[0],
              }));
              setShowForm(true);
            }}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Add Coffee Product
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Products
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, lot number..."
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
                Packaging
              </label>
              <select
                value={packagingFilter}
                onChange={(e) => setPackagingFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="">All Packaging</option>
                {packagingTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Roast Batch
              </label>
              <select
                value={batchFilter}
                onChange={(e) => setBatchFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="">All Batches</option>
                {batches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.batchNumber} - {batch.recipe.name}
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
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
                <option value="packagingDate-desc">Latest Packaging</option>
                <option value="quantity-desc">Highest Quantity</option>
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

        {/* Products Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Roast Batch
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Packaging
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lot Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {product.name}
                      </div>
                      {product.storageLocation && (
                        <div className="text-xs text-gray-500">
                          📍 {product.storageLocation}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {product.batch ? (
                      <div>
                        <div className="font-medium">
                          {product.batch.batchNumber}
                        </div>
                        <div className="text-xs text-gray-400">
                          {product.batch.recipe.name}
                          {product.batch.recipe.style &&
                            ` (${product.batch.recipe.style})`}
                        </div>
                      </div>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm text-gray-900">
                        {product.packagingType?.name || "N/A"}
                      </div>
                      {product.packagingDate && (
                        <div className="text-xs text-gray-500">
                          Packaged:{" "}
                          {new Date(product.packagingDate).toLocaleDateString()}
                        </div>
                      )}
                      {product.shelfLife && product.packagingDate && (
                        <div className="text-xs text-gray-500">
                          Expires:{" "}
                          {calculateExpiryDate(
                            product.packagingDate,
                            product.shelfLife
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.quantity} kg
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        statusColors[
                          product.status as keyof typeof statusColors
                        ] || "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {statusLabels[
                        product.status as keyof typeof statusLabels
                      ] || product.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {product.lotNumber || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => {
                          setEditingProduct(product);
                          setFormData({
                            batchId: product.batch?.id || "",
                            name: product.name,
                            packagingTypeId: product.packagingType?.id || "",
                            packagingDate: product.packagingDate
                              ? product.packagingDate.split("T")[0]
                              : "",
                            lotNumber: product.lotNumber || "",
                            quantity: product.quantity,
                            shelfLife: product.shelfLife || "",
                            storageLocation: product.storageLocation || "",
                            status: product.status,
                          });
                          setShowForm(true);
                        }}
                        className="text-blue-600 hover:text-blue-900 transition-colors cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(product.id, product.name)}
                        className="text-red-600 hover:text-red-900 transition-colors cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {products.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No coffee products found.</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex justify-center">
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-2 border text-sm font-medium rounded-md cursor-pointer ${
                      page === currentPage
                        ? "bg-blue-500 text-white border-blue-500"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {page}
                  </button>
                )
              )}
              <button
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Product Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-3xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingProduct
                  ? "Edit Coffee Product"
                  : "Add New Coffee Product"}
              </h3>
              
              {/* Error Message Display */}
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Product Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                      placeholder="e.g., Ethiopian Single Origin - Light Roast"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Roast Batch
                    </label>
                    <select
                      value={formData.batchId}
                      onChange={(e) =>
                        setFormData({ ...formData, batchId: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="">Select a roast batch (optional)</option>
                      {batches.map((batch) => (
                        <option key={batch.id} value={batch.id}>
                          {batch.batchNumber} - {batch.recipe.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Packaging Type *
                    </label>
                    <select
                      value={formData.packagingTypeId}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          packagingTypeId: e.target.value,
                        })
                      }
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="">Select packaging type...</option>
                      {packagingTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quantity (kg) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.quantity}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          quantity: parseFloat(e.target.value) || 0,
                        })
                      }
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Packaging Date
                    </label>
                    <input
                      type="date"
                      value={formData.packagingDate}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          packagingDate: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Shelf Life (days)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.shelfLife}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          shelfLife:
                            e.target.value === ""
                              ? ""
                              : parseInt(e.target.value),
                        })
                      }
                      placeholder="e.g., 365"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Lot Number
                    </label>
                    <input
                      type="text"
                      value={formData.lotNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, lotNumber: e.target.value })
                      }
                      placeholder="Auto-generated if empty"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Storage Location
                  </label>
                  <select
                    value={formData.storageLocation}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        storageLocation: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="">Select Storage Location</option>
                    {storageLocations.map((location) => (
                      <option key={location.id} value={location.name}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingProduct(null);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center min-w-[120px] ${
                      isSubmitting
                        ? "bg-blue-400 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700 cursor-pointer"
                    } text-white`}
                  >
                    {isSubmitting ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        {editingProduct ? "Updating..." : "Creating..."}
                      </>
                    ) : (
                      editingProduct ? "Update Product" : "Create Product"
                    )}
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
        title="Delete Product"
        message="Are you sure you want to delete this product?"
        itemName={deleteProductName}
        isDeleting={isDeleting}
      />
      </div>
    </ProtectedPage>
  );
}
