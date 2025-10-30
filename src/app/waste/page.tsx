"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import ProtectedPage from "@/components/ProtectedPage";

interface Ingredient {
  id: string;
  name: string;
  type: string;
  stockQuantity: number;
  unitOfMeasure: string;
  costPerUnit: number;
}

interface WasteEntry {
  ingredientId: string;
  quantity: number;
  reason: string;
  category: "production" | "quality" | "expiration" | "process";
  notes?: string;
}

interface RecentWasteEntry {
  id: string;
  ingredientName: string;
  quantity: number;
  unitOfMeasure: string;
  costImpact: number;
  reason: string;
  createdBy: string;
  createdAt: string;
}

export default function WasteRecordingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recentWaste, setRecentWaste] = useState<RecentWasteEntry[]>([]);
  const [wasteEntry, setWasteEntry] = useState<WasteEntry>({
    ingredientId: "",
    quantity: 0,
    reason: "",
    category: "production",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchIngredients();
    fetchRecentWaste();
  }, []);

  const fetchIngredients = async () => {
    try {
      const response = await fetch("/api/ingredients");
      if (response.ok) {
        const data = await response.json();
        setIngredients(data.ingredients || []);
      }
    } catch (error) {
      console.error("Error fetching ingredients:", error);
    }
  };

  const fetchRecentWaste = async () => {
    try {
      const response = await fetch("/api/inventory/waste?limit=10");
      if (response.ok) {
        const data = await response.json();
        setRecentWaste(data.wasteMovements || []);
      }
    } catch (error) {
      console.error("Error fetching recent waste:", error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!wasteEntry.ingredientId || wasteEntry.quantity <= 0 || !wasteEntry.reason) {
      setError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/inventory/waste", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(wasteEntry),
      });

      if (response.ok) {
        setSuccess("Waste entry recorded successfully");
        setWasteEntry({
          ingredientId: "",
          quantity: 0,
          reason: "",
          category: "production",
          notes: "",
        });
        // Refresh data
        fetchIngredients();
        fetchRecentWaste();
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to record waste");
      }
    } catch (error) {
      setError("Failed to record waste");
    } finally {
      setLoading(false);
    }
  };

  const selectedIngredient = ingredients.find(ing => ing.id === wasteEntry.ingredientId);

  const wasteCategories = [
    { value: "production", label: "Production Waste", description: "Spillage, handling losses" },
    { value: "quality", label: "Quality Control", description: "Defective or rejected items" },
    { value: "expiration", label: "Expiration", description: "Expired or spoiled inventory" },
    { value: "process", label: "Process Loss", description: "Roasting losses, over-processing" },
  ];

  const commonReasons = {
    production: [
      "Spillage during transfer",
      "Equipment malfunction",
      "Handling accident",
      "Packaging damage",
    ],
    quality: [
      "Defective beans detected",
      "Contamination found",
      "Quality standards not met",
      "Customer complaint return",
    ],
    expiration: [
      "Past expiration date",
      "Spoilage detected",
      "Storage conditions compromised",
      "Inventory rotation failure",
    ],
    process: [
      "Over-roasted batch",
      "Temperature control issue",
      "Timing error",
      "Equipment calibration problem",
    ],
  };

  return (
    <ProtectedPage requiredPermission="inventory">
      <div className="min-h-screen bg-gray-50">
        <Navigation />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Record Waste</h1>
            <p className="mt-2 text-gray-600">
              Log waste incidents to track and analyze waste patterns
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Waste Entry Form */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Waste Entry Form</h2>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                    {success}
                  </div>
                )}

                {/* Ingredient Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ingredient *
                  </label>
                  <select
                    value={wasteEntry.ingredientId}
                    onChange={(e) => setWasteEntry({ ...wasteEntry, ingredientId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
                    required
                  >
                    <option value="">Select an ingredient</option>
                    {ingredients.map((ingredient) => (
                      <option key={ingredient.id} value={ingredient.id}>
                        {ingredient.name} - {ingredient.stockQuantity} {ingredient.unitOfMeasure} available
                      </option>
                    ))}
                  </select>
                </div>

                {/* Waste Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Waste Category *
                  </label>
                  <div className="grid grid-cols-1 gap-3">
                    {wasteCategories.map((category) => (
                      <label
                        key={category.value}
                        className={`relative flex cursor-pointer rounded-lg border p-3 focus:outline-none ${
                          wasteEntry.category === category.value
                            ? "border-amber-500 bg-amber-50"
                            : "border-gray-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="category"
                          value={category.value}
                          checked={wasteEntry.category === category.value}
                          onChange={(e) => setWasteEntry({ ...wasteEntry, category: e.target.value as any })}
                          className="sr-only"
                        />
                        <div className="flex flex-1">
                          <div className="flex flex-col">
                            <span className="block text-sm font-medium text-gray-900">
                              {category.label}
                            </span>
                            <span className="mt-1 flex items-center text-sm text-gray-500">
                              {category.description}
                            </span>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Waste Quantity *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={selectedIngredient?.stockQuantity || 999999}
                      value={wasteEntry.quantity}
                      onChange={(e) => setWasteEntry({ ...wasteEntry, quantity: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
                      placeholder="0.00"
                      required
                    />
                    {selectedIngredient && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 text-sm">{selectedIngredient.unitOfMeasure}</span>
                      </div>
                    )}
                  </div>
                  {selectedIngredient && (
                    <p className="mt-1 text-sm text-gray-500">
                      Available: {selectedIngredient.stockQuantity} {selectedIngredient.unitOfMeasure}
                    </p>
                  )}
                </div>

                {/* Cost Impact */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estimated Cost Impact
                  </label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md">
                    <span className="text-lg font-medium text-red-600">
                      {selectedIngredient ? formatCurrency(wasteEntry.quantity * selectedIngredient.costPerUnit) : formatCurrency(0)}
                    </span>
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason *
                  </label>
                  <select
                    value={wasteEntry.reason}
                    onChange={(e) => setWasteEntry({ ...wasteEntry, reason: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500 mb-2"
                    required
                  >
                    <option value="">Select a reason</option>
                    {commonReasons[wasteEntry.category]?.map((reason) => (
                      <option key={reason} value={reason}>
                        {reason}
                      </option>
                    ))}
                    <option value="other">Other (specify in notes)</option>
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Notes
                  </label>
                  <textarea
                    value={wasteEntry.notes}
                    onChange={(e) => setWasteEntry({ ...wasteEntry, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
                    placeholder="Additional details about the waste incident..."
                  />
                </div>

                {/* Submit Button */}
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-amber-600 text-white rounded-md text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
                  >
                    {loading ? "Recording..." : "Record Waste"}
                  </button>
                </div>
              </form>
            </div>

            {/* Recent Waste Entries */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Recent Waste Entries</h2>
              </div>
              <div className="p-6">
                {recentWaste.length > 0 ? (
                  <div className="space-y-4">
                    {recentWaste.map((waste) => (
                      <div key={waste.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-gray-900">{waste.ingredientName}</h4>
                            <p className="text-sm text-gray-600">{waste.reason}</p>
                            <p className="text-xs text-gray-500">
                              By {waste.createdBy} • {new Date(waste.createdAt).toLocaleDateString('id-ID')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">
                              {waste.quantity} {waste.unitOfMeasure}
                            </p>
                            <p className="text-sm font-medium text-red-600">
                              {formatCurrency(waste.costImpact)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No waste entries recorded yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-8 bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => router.push("/reports")}
                className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                📊 View Waste Reports
              </button>
              <button
                onClick={() => router.push("/ingredients")}
                className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                📦 Manage Ingredients
              </button>
              <button
                onClick={() => router.push("/alerts")}
                className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                🚨 View Alerts
              </button>
            </div>
          </div>
        </div>
      </div>
    </ProtectedPage>
  );
}