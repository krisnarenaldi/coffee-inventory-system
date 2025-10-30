"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navigation from "../../components/Navigation";
import QrScanner from "../../components/QrScanner";
import QrGenerator from "../../components/QrGenerator";
import DeleteConfirmModal from "../../components/DeleteConfirmModal";
import { QrCodeService } from "../../../lib/services/QrCodeService";

interface Ingredient {
  id: string;
  name: string;
  type: string;
  stockQuantity: number;
  unitOfMeasure: string;
  minimumThreshold: number;
  costPerUnit: number;
  location?: string;
  batchNumber?: string;
  expirationDate?: string;
  supplier?: {
    id: string;
    name: string;
  };
  isActive: boolean;
}

interface Supplier {
  id: string;
  name: string;
}

interface Batch {
  id: string;
  batchNumber: string;
  status: string;
  recipe: {
    id: string;
    name: string;
  };
}

interface StorageLocation {
  id: string;
  name: string;
  description?: string;
  capacity?: number;
  isActive: boolean;
}

export default function IngredientsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [showLowStock, setShowLowStock] = useState(false);
  const [showExpiring, setShowExpiring] = useState(false);
  const [expiringDays, setExpiringDays] = useState("30");
  const [minStock, setMinStock] = useState("");
  const [maxStock, setMaxStock] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteIngredientId, setDeleteIngredientId] = useState<string | null>(
    null
  );
  const [deleteIngredientName, setDeleteIngredientName] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(
    null
  );
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [showQrGenerator, setShowQrGenerator] = useState(false);
  const [selectedIngredientForQr, setSelectedIngredientForQr] =
    useState<Ingredient | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    type: "COFFEE_BEANS",
    stockQuantity: 0,
    unitOfMeasure: "",
    minimumThreshold: 0,
    costPerUnit: 0,
    location: "",
    batchNumber: "",
    expirationDate: "",
    supplierId: "",
  });

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/auth/signin");
      return;
    }
    // If subscription is expired, redirect to renewal page
    if (session.user?.subscriptionExpired) {
      router.push("/subscription?expired=true");
      return;
    }
    fetchIngredients();
    fetchSuppliers();
    fetchBatches();
    fetchStorageLocations();
  }, [
    session,
    status,
    router,
    searchTerm,
    typeFilter,
    supplierFilter,
    locationFilter,
    showLowStock,
    showExpiring,
    expiringDays,
    minStock,
    maxStock,
    sortBy,
    sortOrder,
    currentPage,
  ]);

  const fetchIngredients = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (typeFilter) params.append("type", typeFilter);
      if (supplierFilter) params.append("supplier", supplierFilter);
      if (locationFilter) params.append("location", locationFilter);
      if (showLowStock) params.append("lowStock", "true");
      if (showExpiring) params.append("expiringDays", expiringDays);
      if (minStock) params.append("minStock", minStock);
      if (maxStock) params.append("maxStock", maxStock);
      params.append("sortBy", sortBy);
      params.append("sortOrder", sortOrder);
      params.append("page", currentPage.toString());
      params.append("limit", "10");

      const response = await fetch(`/api/ingredients?${params}`);
      if (response.ok) {
        const data = await response.json();
        setIngredients(data.ingredients);
        setTotalPages(data.pagination.pages);
        setTotalCount(data.pagination.total);
      } else {
        setError("Failed to fetch ingredients");
      }
    } catch (err) {
      setError("Failed to fetch ingredients");
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await fetch("/api/suppliers");
      if (response.ok) {
        const data = await response.json();
        setSuppliers(data.suppliers);
      }
    } catch (err) {
      console.error("Failed to fetch suppliers:", err);
    }
  };

  const fetchBatches = async () => {
    try {
      const response = await fetch("/api/batches?limit=100");
      if (response.ok) {
        const data = await response.json();
        setBatches(data.batches);
      }
    } catch (err) {
      console.error("Failed to fetch batches:", err);
    }
  };

  const fetchStorageLocations = async () => {
    try {
      const response = await fetch("/api/storage-locations");
      if (response.ok) {
        const data = await response.json();
        setStorageLocations(
          data.filter((location: StorageLocation) => location.isActive)
        );
      }
    } catch (err) {
      console.error("Failed to fetch storage locations:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted!", { editingIngredient, formData });
    setError("");
    setSuccess("");

    try {
      const url = editingIngredient
        ? `/api/ingredients/${editingIngredient.id}`
        : "/api/ingredients";
      const method = editingIngredient ? "PUT" : "POST";

      const requestBody = {
        ...formData,
        stockQuantity: Number(formData.stockQuantity),
        minimumThreshold: Number(formData.minimumThreshold),
        costPerUnit: Number(formData.costPerUnit),
        supplierId: formData.supplierId || null,
        expirationDate: formData.expirationDate || null,
      };

      console.log("Making request:", { url, method, requestBody });

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      console.log("Response status:", response.status);

      if (response.ok) {
        const responseData = await response.json();
        console.log("Success response:", responseData);
        const successMessage = editingIngredient
          ? "Ingredient updated successfully!"
          : "Ingredient added successfully!";
        setSuccess(successMessage);
        setShowAddForm(false);
        setEditingIngredient(null);
        resetForm();
        fetchIngredients();

        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(""), 3000);
      } else {
        const data = await response.json();
        console.log("Error response:", data);
        setError(data.error || "Failed to save ingredient");
      }
    } catch (err) {
      console.error("Submit error:", err);
      setError("Failed to save ingredient");
    }
  };

  const handleEdit = (ingredient: Ingredient) => {
    setError("");
    setSuccess("");
    setEditingIngredient(ingredient);
    setFormData({
      name: ingredient.name,
      type: ingredient.type,
      stockQuantity: ingredient.stockQuantity,
      unitOfMeasure: ingredient.unitOfMeasure,
      minimumThreshold: ingredient.minimumThreshold,
      costPerUnit: ingredient.costPerUnit,
      location: ingredient.location || "",
      batchNumber: ingredient.batchNumber || "",
      expirationDate: ingredient.expirationDate
        ? ingredient.expirationDate.split("T")[0]
        : "",
      supplierId: ingredient.supplier?.id || "",
    });
    setShowAddForm(true);

    // Scroll to the form after a brief delay to ensure it's rendered
    setTimeout(() => {
      const formElement = document.querySelector(
        ".bg-white.p-6.rounded-lg.shadow.mb-6"
      );
      if (formElement) {
        formElement.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  };

  const handleDelete = (id: string, name: string) => {
    setDeleteIngredientId(id);
    setDeleteIngredientName(name);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteIngredientId) return;

    setIsDeleting(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/ingredients/${deleteIngredientId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setSuccess("Ingredient deleted successfully!");
        fetchIngredients();
        setShowDeleteModal(false);
        setDeleteIngredientId(null);
        setDeleteIngredientName("");

        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError("Failed to delete ingredient");
      }
    } catch (err) {
      setError("Failed to delete ingredient");
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setDeleteIngredientId(null);
    setDeleteIngredientName("");
    setIsDeleting(false);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      type: "COFFEE_BEANS",
      stockQuantity: 0,
      unitOfMeasure: "",
      minimumThreshold: 0,
      costPerUnit: 0,
      location: "",
      batchNumber: "",
      expirationDate: "",
      supplierId: "",
    });
  };

  const getStockStatus = (ingredient: Ingredient) => {
    if (ingredient.stockQuantity <= ingredient.minimumThreshold) {
      return {
        status: "Low Stock",
        color: "text-red-600 bg-red-50",
        badge: "bg-red-100 text-red-800",
      };
    } else if (ingredient.stockQuantity <= ingredient.minimumThreshold * 1.5) {
      return {
        status: "Medium Stock",
        color: "text-yellow-600 bg-yellow-50",
        badge: "bg-yellow-100 text-yellow-800",
      };
    } else {
      return {
        status: "Good Stock",
        color: "text-green-600 bg-green-50",
        badge: "bg-green-100 text-green-800",
      };
    }
  };

  const getExpirationStatus = (expirationDate?: string) => {
    if (!expirationDate) return null;

    const expDate = new Date(expirationDate);
    const today = new Date();
    const daysUntilExpiry = Math.ceil(
      (expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiry < 0) {
      return {
        status: "Expired",
        color: "bg-red-100 text-red-800",
        days: daysUntilExpiry,
      };
    } else if (daysUntilExpiry <= 7) {
      return {
        status: "Expires Soon",
        color: "bg-red-100 text-red-800",
        days: daysUntilExpiry,
      };
    } else if (daysUntilExpiry <= 30) {
      return {
        status: "Expiring",
        color: "bg-yellow-100 text-yellow-800",
        days: daysUntilExpiry,
      };
    } else {
      return {
        status: "Fresh",
        color: "bg-green-100 text-green-800",
        days: daysUntilExpiry,
      };
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setTypeFilter("");
    setSupplierFilter("");
    setLocationFilter("");
    setShowLowStock(false);
    setShowExpiring(false);
    setExpiringDays("30");
    setMinStock("");
    setMaxStock("");
    setSortBy("name");
    setSortOrder("asc");
    setCurrentPage(1);
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    typeFilter,
    supplierFilter,
    locationFilter,
    showLowStock,
    showExpiring,
    expiringDays,
    minStock,
    maxStock,
    sortBy,
    sortOrder,
  ]);

  const handleQrScan = (result: { text: string; format: string }) => {
    setScanResult(result.text);

    // Parse the scanned data
    const parsedData = QrCodeService.parseIngredientData(result.text);

    if (parsedData.id) {
      // If scanned data contains an ID, try to find and edit existing ingredient
      const existingIngredient = ingredients.find(
        (ing) => ing.id === parsedData.id
      );
      if (existingIngredient) {
        handleEdit(existingIngredient);
        return;
      }
    }

    // If scanned data contains ingredient information, pre-fill the form
    if (parsedData.name || parsedData.batchNumber) {
      setFormData((prev) => ({
        ...prev,
        name: parsedData.name || prev.name,
        batchNumber: parsedData.batchNumber || prev.batchNumber,
        type: parsedData.type || prev.type,
        stockQuantity: parsedData.stockQuantity || prev.stockQuantity,
        unitOfMeasure: parsedData.unitOfMeasure || prev.unitOfMeasure,
        minimumThreshold: parsedData.minimumThreshold || prev.minimumThreshold,
        costPerUnit: parsedData.costPerUnit || prev.costPerUnit,
        location: parsedData.location || prev.location,
        expirationDate: parsedData.expirationDate || prev.expirationDate,
      }));
      setShowAddForm(true);
      setEditingIngredient(null);
    } else {
      // For simple barcodes, use as batch number or name
      setFormData((prev) => ({
        ...prev,
        batchNumber: result.text,
      }));
      setShowAddForm(true);
      setEditingIngredient(null);
    }
  };

  const handleQrError = (error: { message: string; code?: string }) => {
    setError(`Scan error: ${error.message}`);
  };

  const handleGenerateQr = (ingredient: Ingredient) => {
    setSelectedIngredientForQr(ingredient);
    setShowQrGenerator(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading ingredients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation
        title="Ingredients"
        subtitle="Manage your raw materials and ingredients"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-4">
        {/* Filters and Actions */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          {/* Basic Filters Row */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-4">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by name, batch, or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500 w-full sm:w-64"
                />
                <svg
                  className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500 cursor-pointer"
              >
                <option value="">All Types</option>
                <option value="COFFEE_BEANS">Coffee Beans</option>
                <option value="MILK">Milk</option>
                <option value="SUGAR">Sugar</option>
                <option value="SYRUP">Syrup</option>
                <option value="PASTRY">Pastry</option>
                <option value="PACKAGING">Packaging</option>
                <option value="OTHER">Other</option>
              </select>
              <select
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500 cursor-pointer"
              >
                <option value="">All Suppliers</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 flex items-center gap-2 cursor-pointer"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                  />
                </svg>
                Filters
              </button>
              <button
                onClick={() => {
                  setError("");
                  setSuccess("");
                  setShowAddForm(true);
                  setEditingIngredient(null);
                  resetForm();

                  // Scroll to the form after a brief delay to ensure it's rendered
                  setTimeout(() => {
                    const formElement = document.querySelector(
                      ".bg-white.p-6.rounded-lg.shadow.mb-6"
                    );
                    if (formElement) {
                      formElement.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      });
                    }
                  }, 100);
                }}
                className="bg-amber-600 text-white px-4 py-2 rounded-md hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
              >
                Add Ingredient
              </button>
              <button
                onClick={() => router.push("/waste")}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer flex items-center gap-2"
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
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Record Waste
              </button>
              {/* TODO: Uncomment for next version
              <button
                onClick={() => setShowQrScanner(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center gap-2 cursor-pointer"
                title="Scan QR Code or Barcode"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M12 12h4.01M12 12v4.01M12 12v4.01"
                  />
                </svg>
                Scan Code
              </button>
              */}
            </div>
          </div>

          {/* Quick Filter Checkboxes */}
          <div className="flex flex-wrap gap-4 mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showLowStock}
                onChange={(e) => setShowLowStock(e.target.checked)}
                className="mr-2 h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
              />
              Low Stock Only
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showExpiring}
                onChange={(e) => setShowExpiring(e.target.checked)}
                className="mr-2 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
              />
              Expiring Soon
            </label>
            {showExpiring && (
              <select
                value={expiringDays}
                onChange={(e) => setExpiringDays(e.target.value)}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="7">Next 7 days</option>
                <option value="14">Next 14 days</option>
                <option value="30">Next 30 days</option>
                <option value="60">Next 60 days</option>
              </select>
            )}
          </div>

          {/* Advanced Filters Panel */}
          {showAdvancedFilters && (
            <div className="border-t pt-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Advanced Filters
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Location Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    placeholder="Filter by location..."
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>

                {/* Stock Quantity Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Stock
                  </label>
                  <input
                    type="number"
                    placeholder="Minimum quantity"
                    value={minStock}
                    onChange={(e) => setMinStock(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Stock
                  </label>
                  <input
                    type="number"
                    placeholder="Maximum quantity"
                    value={maxStock}
                    onChange={(e) => setMaxStock(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>

                {/* Sort Options */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sort By
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
                    >
                      <option value="name">Name</option>
                      <option value="stockQuantity">Stock Quantity</option>
                      <option value="minimumThreshold">Min Threshold</option>
                      <option value="costPerUnit">Cost per Unit</option>
                      <option value="supplier">Supplier</option>
                      <option value="expirationDate">Expiration Date</option>
                    </select>
                    <button
                      onClick={() =>
                        setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                      }
                      className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      title={`Sort ${
                        sortOrder === "asc" ? "Descending" : "Ascending"
                      }`}
                    >
                      <svg
                        className={`w-4 h-4 transform ${
                          sortOrder === "desc" ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 15l7-7 7 7"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Clear Filters Button */}
              <div className="mt-4 flex justify-end">
                <button
                  onClick={clearAllFilters}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 focus:outline-none cursor-pointer"
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

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

        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-xl font-semibold mb-4">
              {editingIngredient ? "Edit Ingredient" : "Add New Ingredient"}
            </h2>
            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type *
                </label>
                <select
                  required
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500 cursor-pointer"
                >
                  <option value="COFFEE_BEANS">Coffee Beans</option>
                  <option value="MILK">Milk</option>
                  <option value="SUGAR">Sugar</option>
                  <option value="SYRUP">Syrup</option>
                  <option value="PASTRY">Pastry</option>
                  <option value="PACKAGING">Packaging</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stock Quantity *
                </label>
                <input
                  type="number"
                  step="1"
                  required
                  value={formData.stockQuantity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      stockQuantity:
                        e.target.value === "" ? 0 : Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit of Measure *
                </label>
                <input
                  type="text"
                  required
                  value={formData.unitOfMeasure}
                  onChange={(e) =>
                    setFormData({ ...formData, unitOfMeasure: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
                  placeholder="e.g., lbs, kg, gallons"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Threshold *
                </label>
                <input
                  type="number"
                  step="1"
                  required
                  value={formData.minimumThreshold}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      minimumThreshold:
                        e.target.value === "" ? 0 : Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cost per Unit *
                </label>
                <input
                  type="number"
                  step="1000"
                  required
                  value={formData.costPerUnit}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      costPerUnit:
                        e.target.value === "" ? 0 : Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supplier
                </label>
                <select
                  value={formData.supplierId}
                  onChange={(e) =>
                    setFormData({ ...formData, supplierId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500 cursor-pointer"
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <select
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500 cursor-pointer"
                >
                  <option value="">Select storage location</option>
                  {storageLocations.map((location) => (
                    <option key={location.id} value={location.name}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Batch Number
                </label>
                <select
                  value={formData.batchNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, batchNumber: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500 cursor-pointer"
                >
                  <option value="">Select Batch</option>
                  {batches.map((batch) => (
                    <option key={batch.id} value={batch.batchNumber}>
                      {batch.batchNumber} - {batch.recipe.name} ({batch.status})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiration Date
                </label>
                <input
                  type="date"
                  value={formData.expirationDate}
                  onChange={(e) =>
                    setFormData({ ...formData, expirationDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
              <div className="md:col-span-2 lg:col-span-3 flex gap-4">
                <button
                  type="submit"
                  className="bg-amber-600 text-white px-4 py-2 rounded-md hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                >
                  {editingIngredient ? "Update" : "Add"} Ingredient
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingIngredient(null);
                    resetForm();
                  }}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Results Summary */}
        <div className="bg-white p-4 rounded-lg shadow mb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="text-sm text-gray-600">
              {totalCount > 0 ? (
                <>
                  Showing{" "}
                  <span className="font-medium text-gray-900">
                    {(currentPage - 1) * 10 + 1}
                  </span>{" "}
                  -{" "}
                  <span className="font-medium text-gray-900">
                    {Math.min(currentPage * 10, totalCount)}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-gray-900">
                    {totalCount}
                  </span>{" "}
                  ingredients
                  {(searchTerm ||
                    typeFilter ||
                    supplierFilter ||
                    locationFilter ||
                    showLowStock ||
                    showExpiring ||
                    minStock ||
                    maxStock) && <span> matching your filters</span>}
                </>
              ) : (
                "No ingredients found"
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {searchTerm && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Search: "{searchTerm}"
                  <button
                    onClick={() => setSearchTerm("")}
                    className="ml-1 text-blue-600 hover:text-blue-800 cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              )}
              {typeFilter && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  Type: {typeFilter.replace("_", " ")}
                  <button
                    onClick={() => setTypeFilter("")}
                    className="ml-1 text-purple-600 hover:text-purple-800 cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              )}
              {supplierFilter && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Supplier:{" "}
                  {suppliers.find((s) => s.id === supplierFilter)?.name}
                  <button
                    onClick={() => setSupplierFilter("")}
                    className="ml-1 text-green-600 hover:text-green-800 cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              )}
              {showLowStock && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  Low Stock Only
                  <button
                    onClick={() => setShowLowStock(false)}
                    className="ml-1 text-red-600 hover:text-red-800 cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              )}
              {showExpiring && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                  Expiring in {expiringDays} days
                  <button
                    onClick={() => setShowExpiring(false)}
                    className="ml-1 text-orange-600 hover:text-orange-800 cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Ingredients Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => {
                      if (sortBy === "name") {
                        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                      } else {
                        setSortBy("name");
                        setSortOrder("asc");
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      Name
                      {sortBy === "name" && (
                        <svg
                          className={`w-4 h-4 transform ${
                            sortOrder === "desc" ? "rotate-180" : ""
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 15l7-7 7 7"
                          />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => {
                      if (sortBy === "stockQuantity") {
                        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                      } else {
                        setSortBy("stockQuantity");
                        setSortOrder("desc");
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      Stock
                      {sortBy === "stockQuantity" && (
                        <svg
                          className={`w-4 h-4 transform ${
                            sortOrder === "desc" ? "rotate-180" : ""
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 15l7-7 7 7"
                          />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => {
                      if (sortBy === "minimumThreshold") {
                        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                      } else {
                        setSortBy("minimumThreshold");
                        setSortOrder("desc");
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      Threshold
                      {sortBy === "minimumThreshold" && (
                        <svg
                          className={`w-4 h-4 transform ${
                            sortOrder === "desc" ? "rotate-180" : ""
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 15l7-7 7 7"
                          />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => {
                      if (sortBy === "costPerUnit") {
                        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                      } else {
                        setSortBy("costPerUnit");
                        setSortOrder("desc");
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      Cost/Unit
                      {sortBy === "costPerUnit" && (
                        <svg
                          className={`w-4 h-4 transform ${
                            sortOrder === "desc" ? "rotate-180" : ""
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 15l7-7 7 7"
                          />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => {
                      if (sortBy === "supplier") {
                        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                      } else {
                        setSortBy("supplier");
                        setSortOrder("asc");
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      Supplier
                      {sortBy === "supplier" && (
                        <svg
                          className={`w-4 h-4 transform ${
                            sortOrder === "desc" ? "rotate-180" : ""
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 15l7-7 7 7"
                          />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {ingredients.map((ingredient) => {
                  const stockStatus = getStockStatus(ingredient);
                  const expirationStatus = getExpirationStatus(
                    ingredient.expirationDate
                  );
                  return (
                    <tr
                      key={ingredient.id}
                      className={
                        stockStatus.status === "Low Stock" ? "bg-red-50" : ""
                      }
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {ingredient.name}
                        </div>
                        {ingredient.batchNumber && (
                          <div className="text-sm text-gray-500">
                            Batch: {ingredient.batchNumber}
                          </div>
                        )}
                        {ingredient.expirationDate && (
                          <div className="text-sm text-gray-500">
                            Exp: {formatDate(ingredient.expirationDate)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {ingredient.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {ingredient.stockQuantity} {ingredient.unitOfMeasure}
                        </div>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${stockStatus.badge}`}
                        >
                          {stockStatus.status}
                        </span>
                        {expirationStatus && (
                          <div className="mt-1">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${expirationStatus.color}`}
                            >
                              {expirationStatus.status}
                              {expirationStatus.days >= 0 &&
                                ` (${expirationStatus.days}d)`}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {ingredient.minimumThreshold} {ingredient.unitOfMeasure}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        Rp {Number(ingredient.costPerUnit).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {ingredient.supplier?.name || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {ingredient.location || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleEdit(ingredient)}
                          className="text-amber-600 hover:text-amber-900 mr-3 cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleGenerateQr(ingredient)}
                          className="text-blue-600 hover:text-blue-900 mr-3 cursor-pointer"
                          title="Generate QR Code"
                        >
                          QR
                        </button>
                        <button
                          onClick={() =>
                            handleDelete(ingredient.id, ingredient.name)
                          }
                          className="text-red-600 hover:text-red-900 cursor-pointer"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {ingredients.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No ingredients found.</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-4 rounded-lg shadow">
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
                  Showing page{" "}
                  <span className="font-medium">{currentPage}</span> of{" "}
                  <span className="font-medium">{totalPages}</span>
                </p>
              </div>
              <div>
                <nav
                  className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                  aria-label="Pagination"
                >
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
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
                            ? "z-10 bg-amber-50 border-amber-500 text-amber-600"
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
        )}
      </div>

      {/* QR Scanner Modal */}
      <QrScanner
        isOpen={showQrScanner}
        onClose={() => setShowQrScanner(false)}
        onScan={handleQrScan}
        onError={handleQrError}
        title="Scan Ingredient Code"
      />

      {/* QR Generator Modal */}
      <QrGenerator
        isOpen={showQrGenerator}
        onClose={() => {
          setShowQrGenerator(false);
          setSelectedIngredientForQr(null);
        }}
        data={selectedIngredientForQr}
        title="Generate QR Code for Ingredient"
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title="Delete Ingredient"
        message="Are you sure you want to delete this ingredient?"
        itemName={deleteIngredientName}
        isDeleting={isDeleting}
      />
    </div>
  );
}
