"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navigation from "../../components/Navigation";
import DeleteConfirmModal from "../../components/DeleteConfirmModal";

interface Ingredient {
  id: string;
  name: string;
  type: string;
  unitOfMeasure: string;
  stockQuantity: number;
}

interface RecipeIngredient {
  id: string;
  ingredientId: string;
  quantity: number;
  unit: string;
  notes?: string;
  ingredient: Ingredient;
}

interface Batch {
  id: string;
  batchNumber: string;
  status: string;
  startDate: string;
  endDate?: string;
  actualYield?: number;
}

interface Recipe {
  id: string;
  name: string;
  style?: string;
  description?: string;
  expectedYield: number;
  processInstructions?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  ingredients: RecipeIngredient[];
  batches: Batch[];
}

interface RecipeFormData {
  name: string;
  style: string;
  description: string;
  expectedYield: number;
  processInstructions: string;
  ingredients: {
    ingredientId: string;
    quantity: number | string;
    unit: string;
    notes: string;
  }[];
}

export default function RecipesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [availableIngredients, setAvailableIngredients] = useState<
    Ingredient[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [styleFilter, setStyleFilter] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteRecipeData, setDeleteRecipeData] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState<RecipeFormData>({
    name: "",
    style: "",
    description: "",
    expectedYield: 0,
    processInstructions: "",
    ingredients: [],
  });

  // Add Escape key listener for modals
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (showDeleteModal) {
          setShowDeleteModal(false);
          setDeleteRecipeData(null);
          setIsDeleting(false);
        } else if (showForm) {
          setError("");
          setSuccess("");
          setShowForm(false);
          setEditingRecipe(null);
        }
      }
    };

    document.addEventListener("keydown", handleEscapeKey);
    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [showDeleteModal, showForm]);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  // Redirect if subscription is expired
  useEffect(() => {
    if (status === "loading") return;
    if (session?.user?.subscriptionExpired) {
      router.push("/subscription?expired=true");
    }
  }, [status, session, router]);

  // Fetch recipes
  const fetchRecipes = async () => {
    try {
      const params = new URLSearchParams({
        search: searchTerm,
        style: styleFilter,
        sortBy,
        sortOrder,
        page: currentPage.toString(),
        limit: "10",
      });

      const response = await fetch(`/api/recipes?${params}`);
      if (response.ok) {
        const data = await response.json();
        setRecipes(data.recipes);
        setTotalPages(data.pagination.pages);
      }
    } catch (error) {
      console.error("Error fetching recipes:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch available ingredients
  const fetchIngredients = async () => {
    try {
      const response = await fetch("/api/ingredients?limit=1000");
      if (response.ok) {
        const data = await response.json();
        setAvailableIngredients(data.ingredients);
      }
    } catch (error) {
      console.error("Error fetching ingredients:", error);
    }
  };

  useEffect(() => {
    if (session) {
      fetchRecipes();
      fetchIngredients();
    }
  }, [session, searchTerm, styleFilter, sortBy, sortOrder, currentPage]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validate ingredients before submission
    const validIngredients = formData.ingredients
      .filter(
        (ing) =>
          ing.ingredientId &&
          ing.quantity &&
          (typeof ing.quantity === "number"
            ? ing.quantity > 0
            : parseFloat(ing.quantity) > 0) &&
          ing.unit
      )
      .map((ing) => ({
        ...ing,
        quantity:
          typeof ing.quantity === "number"
            ? ing.quantity
            : parseFloat(ing.quantity),
      }));

    if (formData.ingredients.length > 0 && validIngredients.length === 0) {
      setError(
        "Please ensure all ingredients have valid quantities greater than 0 and units specified."
      );
      return;
    }

    try {
      const url = editingRecipe
        ? `/api/recipes/${editingRecipe.id}`
        : "/api/recipes";
      const method = editingRecipe ? "PUT" : "POST";

      const submitData = {
        ...formData,
        expectedYield:
          typeof formData.expectedYield === "number"
            ? formData.expectedYield
            : parseFloat(formData.expectedYield) || 0,
        ingredients: validIngredients,
      };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        const successMessage = editingRecipe
          ? "Recipe updated successfully!"
          : "Recipe added successfully!";
        setSuccess(successMessage);
        setShowForm(false);
        setEditingRecipe(null);
        setFormData({
          name: "",
          style: "",
          description: "",
          expectedYield: 0,
          processInstructions: "",
          ingredients: [],
        });
        fetchRecipes();

        // Scroll to top to show success message
        window.scrollTo({ top: 0, behavior: "smooth" });

        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(""), 3000);
      } else {
        const errorData = await response.json();
        if (response.status === 403) {
          setError(
            "Recipe limit reached. You have reached the maximum number of recipes allowed for your subscription plan."
          );
        } else if (errorData.details) {
          const errorMessages = errorData.details
            .map((detail: any) => detail.message)
            .join(", ");
          setError(`Validation failed: ${errorMessages}`);
        } else {
          setError(errorData.error || "Failed to save recipe");
        }
      }
    } catch (error) {
      console.error("Error saving recipe:", error);
      setError("Failed to save recipe");
    }
  };

  // Handle edit
  const handleEdit = (recipe: Recipe) => {
    setError("");
    setSuccess("");
    setEditingRecipe(recipe);
    setFormData({
      name: recipe.name,
      style: recipe.style || "",
      description: recipe.description || "",
      expectedYield: recipe.expectedYield,
      processInstructions: recipe.processInstructions || "",
      ingredients: recipe.ingredients.map((ri) => ({
        ingredientId: ri.ingredientId,
        quantity: ri.quantity.toString(),
        unit: ri.unit,
        notes: ri.notes || "",
      })),
    });
    setShowForm(true);
  };

  // Handle delete
  const handleDelete = (id: string, name: string) => {
    setDeleteRecipeData({ id, name });
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteRecipeData) return;

    setIsDeleting(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/recipes/${deleteRecipeData.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setSuccess("Recipe deleted successfully!");
        fetchRecipes();
        setShowDeleteModal(false);
        setDeleteRecipeData(null);

        // Scroll to top to show success message
        window.scrollTo({ top: 0, behavior: "smooth" });

        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(""), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to delete recipe");
      }
    } catch (error) {
      console.error("Error deleting recipe:", error);
      setError("Failed to delete recipe");
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setDeleteRecipeData(null);
  };

  // Handle duplicate
  const handleDuplicate = async (id: string) => {
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/recipes/${id}/duplicate`, {
        method: "POST",
      });

      if (response.ok) {
        setSuccess("Recipe duplicated successfully!");
        fetchRecipes();

        // Scroll to top to show success message
        window.scrollTo({ top: 0, behavior: "smooth" });

        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(""), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to duplicate recipe");
      }
    } catch (error) {
      console.error("Error duplicating recipe:", error);
      setError("Failed to duplicate recipe");
    }
  };

  // Add ingredient to recipe
  const addIngredient = () => {
    setFormData({
      ...formData,
      ingredients: [
        ...formData.ingredients,
        { ingredientId: "", quantity: "", unit: "", notes: "" },
      ],
    });
  };

  // Remove ingredient from recipe
  const removeIngredient = (index: number) => {
    setFormData({
      ...formData,
      ingredients: formData.ingredients.filter((_, i) => i !== index),
    });
  };

  // Update ingredient in recipe
  const updateIngredient = (index: number, field: string, value: any) => {
    const updatedIngredients = [...formData.ingredients];
    updatedIngredients[index] = {
      ...updatedIngredients[index],
      [field]: value,
    };
    setFormData({ ...formData, ingredients: updatedIngredients });
  };

  // Handle sorting
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  // Get unique styles for filter
  const uniqueStyles = [
    ...new Set(recipes.map((r) => r.style).filter(Boolean)),
  ];

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading recipes...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation
        title="Roast Profiles"
        subtitle="Manage your coffee roasting profiles and formulations"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-4">
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={() => {
              setError("");
              setSuccess("");
              setEditingRecipe(null);
              setFormData({
                name: "",
                style: "",
                description: "",
                expectedYield: 0,
                processInstructions: "",
                ingredients: [],
              });
              setShowForm(true);
            }}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Add Roast Profile
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Roast Profiles
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, description, or style..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Style
              </label>
              <select
                value={styleFilter}
                onChange={(e) => setStyleFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="">All Styles</option>
                {uniqueStyles.map((style) => (
                  <option key={style} value={style}>
                    {style}
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
                  setSortOrder(order as "asc" | "desc");
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="style-asc">Style (A-Z)</option>
                <option value="expectedYield-desc">Yield (High-Low)</option>
                <option value="createdAt-desc">Newest First</option>
                <option value="createdAt-asc">Oldest First</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error/Success Messages */}
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

        {/* Recipes Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("name")}
                  >
                    Name
                    {sortBy === "name" && (
                      <span className="ml-1">
                        {sortOrder === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Style
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("expectedYield")}
                  >
                    Expected Yield
                    {sortBy === "expectedYield" && (
                      <span className="ml-1">
                        {sortOrder === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ingredients
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Batches
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Version
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recipes.map((recipe) => (
                  <tr key={recipe.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {recipe.name}
                        </div>
                        {recipe.description && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {recipe.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {recipe.style || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {recipe.expectedYield} kg
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {recipe.ingredients.length} ingredients
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {recipe.batches.length} batches
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      v{recipe.version}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleEdit(recipe)}
                        className="text-blue-600 hover:text-blue-900 cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDuplicate(recipe.id)}
                        className="text-green-600 hover:text-green-900 cursor-pointer"
                      >
                        Duplicate
                      </button>
                      <button
                        onClick={() => handleDelete(recipe.id, recipe.name)}
                        className="text-red-600 hover:text-red-900 cursor-pointer"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
                >
                  Previous
                </button>
                <button
                  onClick={() =>
                    setCurrentPage(Math.min(totalPages, currentPage + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Page <span className="font-medium">{currentPage}</span> of{" "}
                    <span className="font-medium">{totalPages}</span>
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium cursor-pointer ${
                            page === currentPage
                              ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                              : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                          }`}
                        >
                          {page}
                        </button>
                      )
                    )}
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Add/Edit Recipe Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingRecipe
                    ? "Edit Roast Profile"
                    : "Add New Roast Profile"}
                </h3>

                {/* Error Message in Modal */}
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Roast Profile Name *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Roast Level
                      </label>
                      <input
                        type="text"
                        value={formData.style}
                        onChange={(e) =>
                          setFormData({ ...formData, style: e.target.value })
                        }
                        placeholder="e.g., Light, Medium, Dark, French"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Expected Yield (kg) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.expectedYield}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          expectedYield: parseFloat(e.target.value) || 0,
                        })
                      }
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Roasting Instructions
                    </label>
                    <textarea
                      value={formData.processInstructions}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          processInstructions: e.target.value,
                        })
                      }
                      rows={4}
                      placeholder="Detailed roasting instructions (temperature, time, etc.)..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Ingredients Section */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <label className="block text-sm font-medium text-gray-700">
                        &nbsp;
                      </label>
                      <button
                        type="button"
                        onClick={addIngredient}
                        className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 cursor-pointer"
                      >
                        Add Ingredient
                      </button>
                    </div>

                    {formData.ingredients.map((ingredient, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-3 p-3 border border-gray-200 rounded"
                      >
                        <div>
                          <select
                            value={ingredient.ingredientId}
                            onChange={(e) =>
                              updateIngredient(
                                index,
                                "ingredientId",
                                e.target.value
                              )
                            }
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="">Select Ingredient</option>
                            {availableIngredients.map((ing) => (
                              <option key={ing.id} value={ing.id}>
                                {ing.name} ({ing.type})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={ingredient.quantity || ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              const numValue =
                                value === "" ? "" : parseFloat(value);
                              updateIngredient(index, "quantity", numValue);
                            }}
                            placeholder="Quantity"
                            required
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            value={ingredient.unit}
                            onChange={(e) =>
                              updateIngredient(index, "unit", e.target.value)
                            }
                            placeholder="Unit (kg, L, etc.)"
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            value={ingredient.notes}
                            onChange={(e) =>
                              updateIngredient(index, "notes", e.target.value)
                            }
                            placeholder="Notes (optional)"
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <button
                            type="button"
                            onClick={() => removeIngredient(index)}
                            className="w-full bg-red-600 text-white px-2 py-1 rounded text-sm hover:bg-red-700 cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end space-x-3 pt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setError("");
                        setSuccess("");
                        setShowForm(false);
                        setEditingRecipe(null);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer"
                    >
                      {editingRecipe ? "Update Recipe" : "Add Recipe"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title="Delete Recipe"
        message="Are you sure you want to delete this recipe?"
        itemName={deleteRecipeData?.name}
        isDeleting={isDeleting}
      />
    </div>
  );
}
