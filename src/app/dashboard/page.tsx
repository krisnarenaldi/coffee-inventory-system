"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navigation from "../../components/Navigation";
import SubscriptionWarningToast from "../../components/SubscriptionWarningToast";

interface DashboardStats {
  totalIngredients: number;
  lowStockIngredients: number;
  activeBatches: number;
  totalProducts: number;
}

interface RecentBatch {
  id: string;
  name: string;
  status: string;
  createdAt: string;
}

interface LowStockIngredient {
  id: string;
  name: string;
  stockQuantity: number;
  minimumThreshold: number;
  unitOfMeasure: string;
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentBatches, setRecentBatches] = useState<RecentBatch[]>([]);
  const [lowStockIngredients, setLowStockIngredients] = useState<
    LowStockIngredient[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [subscriptionWarning, setSubscriptionWarning] = useState<{
    shouldWarn: boolean;
    daysRemaining: number;
  } | null>(null);
  const [showWarningToast, setShowWarningToast] = useState(false);
  const [pendingCheckout, setPendingCheckout] = useState<{
    hasPendingCheckout: boolean;
    intendedPlan?: string;
  } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    if (status === "authenticated") {
      // Redirect PLATFORM_ADMIN users to admin dashboard
      if (session?.user?.role === "PLATFORM_ADMIN") {
        const hostname = window.location.hostname;
        let adminUrl;

        if (hostname.includes("localhost")) {
          adminUrl = "http://admin.localhost:3000/admin/dashboard";
        } else if (hostname.includes("coffeelogica.com")) {
          adminUrl = "https://admin.coffeelogica.com/admin/dashboard";
        } else {
          adminUrl = `https://admin.${hostname
            .split(".")
            .slice(1)
            .join(".")}/admin/dashboard`;
        }
        window.location.href = adminUrl;
        return;
      }

      fetchDashboardData();
    }
  }, [status, router, session]);

  const checkSubscriptionWarning = async () => {
    try {
      const response = await fetch("/api/subscription/warning");
      if (response.ok) {
        const warningData = await response.json();
        setSubscriptionWarning(warningData);
        if (warningData.shouldWarn) {
          setShowWarningToast(true);
        }
      }
    } catch (error) {
      console.error("Failed to check subscription warning:", error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      // Parallel API calls for better performance
      const [dashboardResponse, warningResponse, checkoutResponse] = await Promise.all([
        fetch("/api/dashboard"),
        fetch("/api/subscription/warning").catch(() => null), // Don't fail if warning fails
        fetch("/api/subscription/pending-checkout").catch(() => null), // Don't fail if checkout check fails
      ]);

      if (!dashboardResponse.ok) {
        throw new Error("Failed to fetch dashboard data");
      }

      const data = await dashboardResponse.json();
      setStats(data.stats);
      setRecentBatches(data.recentBatches || []);
      setLowStockIngredients(data.lowStockIngredients || []);

      // Handle subscription warning if successful
      if (warningResponse && warningResponse.ok) {
        const warningData = await warningResponse.json();
        setSubscriptionWarning(warningData);
        if (warningData.shouldWarn) {
          setShowWarningToast(true);
        }
      }

      // Handle pending checkout check if successful
      if (checkoutResponse && checkoutResponse.ok) {
        const checkoutData = await checkoutResponse.json();
        setPendingCheckout(checkoutData);
      }
    } catch (error) {
      setError("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">
            Error Loading Dashboard
          </h2>
          <p className="text-gray-600 mt-2">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="mt-4 bg-amber-600 text-white px-4 py-2 rounded-md hover:bg-amber-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation
        title="Dashboard"
        subtitle={`Welcome back, ${session?.user?.name}`}
      />

      {/* Pending Checkout Warning */}
      {pendingCheckout?.hasPendingCheckout && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-yellow-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Complete Your Subscription
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    You have an incomplete checkout for the{" "}
                    <span className="font-semibold capitalize">
                      {pendingCheckout.intendedPlan}
                    </span>{" "}
                    plan. Complete your payment to activate your subscription.
                  </p>
                </div>
                <div className="mt-4">
                  <div className="-mx-2 -my-1.5 flex">
                    <Link
                      href={`/checkout?plan=${pendingCheckout.intendedPlan}`}
                      className="bg-yellow-50 px-2 py-1.5 rounded-md text-sm font-medium text-yellow-800 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-yellow-50 focus:ring-yellow-600"
                    >
                      Complete Payment
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                      />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Ingredients
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats?.totalIngredients || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                      />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Low Stock Items
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats?.lowStockIngredients || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Active Batches
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats?.activeBatches || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-amber-500 rounded-md flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                      />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Products
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats?.totalProducts || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Batches */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Recent Batches
              </h3>
              {recentBatches.length > 0 ? (
                <div className="space-y-3">
                  {recentBatches.map((batch) => (
                    <div
                      key={batch.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {batch.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(batch.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          batch.status === "IN_PROGRESS"
                            ? "bg-blue-100 text-blue-800"
                            : batch.status === "FERMENTING"
                            ? "bg-yellow-100 text-yellow-800"
                            : batch.status === "READY"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {batch.status.replace("_", " ")}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">
                  No recent batches found.
                </p>
              )}
            </div>
          </div>

          {/* Low Stock Alerts */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Low Stock Alerts
              </h3>
              {lowStockIngredients.length > 0 ? (
                <div className="space-y-3">
                  {lowStockIngredients.map((ingredient) => (
                    <div
                      key={ingredient.id}
                      className="flex items-center justify-between p-3 bg-red-50 rounded-md border border-red-200"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {ingredient.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {ingredient.stockQuantity} {ingredient.unitOfMeasure}{" "}
                          remaining
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-red-600 font-medium">
                          Below {ingredient.minimumThreshold}{" "}
                          {ingredient.unitOfMeasure}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">
                  All ingredients are well stocked.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              href="/ingredients"
              className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow text-center"
            >
              <div className="w-8 h-8 bg-blue-500 rounded-md mx-auto mb-2 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-900">
                Manage Ingredients
              </p>
            </Link>

            <Link
              href="/suppliers"
              className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow text-center"
            >
              <div className="w-8 h-8 bg-green-500 rounded-md mx-auto mb-2 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-900">
                Manage Suppliers
              </p>
            </Link>

            <Link
              href="/recipes"
              className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow text-center"
            >
              <div className="w-8 h-8 bg-purple-500 rounded-md mx-auto mb-2 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-900">
                Manage Roast Profiles
              </p>
            </Link>

            <Link
              href="/batches"
              className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow text-center"
            >
              <div className="w-8 h-8 bg-amber-500 rounded-md mx-auto mb-2 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-900">
                Manage Roast Batches
              </p>
            </Link>

            <Link
              href="/products"
              className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow text-center"
            >
              <div className="w-8 h-8 bg-purple-500 rounded-md mx-auto mb-2 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-900">
                Manage Coffee Products
              </p>
            </Link>

            <Link
              href="/alerts"
              className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow text-center"
            >
              <div className="w-8 h-8 bg-red-500 rounded-md mx-auto mb-2 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-900">View Alerts</p>
            </Link>
          </div>
        </div>
      </div>

      {/* Subscription Warning Toast */}
      <SubscriptionWarningToast
        show={showWarningToast}
        daysRemaining={subscriptionWarning?.daysRemaining || 0}
        onClose={() => setShowWarningToast(false)}
      />
    </div>
  );
}
