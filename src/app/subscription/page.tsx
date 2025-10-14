"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import {
  CreditCard,
  Users,
  Package,
  BarChart3,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: string; // API returns price as string
  interval: "MONTHLY" | "YEARLY";
  maxUsers: number | null;
  maxIngredients: number | null;
  maxBatches: number | null;
  maxStorageLocations?: number | null;
  maxRecipes?: number | null;
  maxProducts?: number | null;
  features: Record<string, boolean> | string[];
  isActive?: boolean; // Optional since API only returns active plans
}

interface Subscription {
  id: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  plan: SubscriptionPlan;
}

interface UsageData {
  users: number;
  ingredients: number;
  batches: number;
}

// Helper function to format dates as dd-mm-yyyy
const formatDate = (date: Date | string | null | undefined) => {
  if (!date) return "N/A";
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "Invalid Date";
    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch (error) {
    return "Invalid Date";
  }
};

function SubscriptionContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([]);

  const [loading, setLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const [selectedPlan, setSelectedPlan] = useState<string>("");
  // Removed effectiveDate state - we only have immediate upgrades now
  const [upgradeCalculation, setUpgradeCalculation] = useState<any>(null);
  const [actionMessage, setActionMessage] = useState<null | {
    type: "success" | "error";
    text: string;
  }>(null);
  const [subscriptionMessage, setSubscriptionMessage] = useState<string | null>(
    null
  );

  // Check for expired or error parameters
  const isExpired = searchParams?.get("expired") === "true";
  const hasError = searchParams?.get("error") === "validation_failed";

  // Calculate upgrade pricing when plan or option changes
  useEffect(() => {
    if (selectedPlan && subscription) {
      calculateUpgradeOptions();
    }
  }, [selectedPlan, subscription, availablePlans]);

  // Debug modal state changes
  useEffect(() => {
    console.log("🔧 MODAL STATE CHANGED:", showUpgradeModal);
  }, [showUpgradeModal]);

  // Handle URL parameters for expired/error states
  useEffect(() => {
    console.log("🔍 CHECKING URL PARAMS:", { isExpired, hasError });
    if (isExpired || hasError) {
      console.log("🚨 OPENING MODAL DUE TO URL PARAMS");
      setShowUpgradeModal(true);
    }
  }, [isExpired, hasError]);

  // Check and reconcile pending checkout for current tenant (user-scoped)
  useEffect(() => {
    const checkPendingCheckout = async () => {
      if (!session?.user?.tenantId) return;

      try {
        const response = await fetch("/api/subscription/pending-checkout");
        if (response.ok) {
          const result = await response.json();
          // Only show success if activation happened for THIS tenant
          if (result.activated === true) {
            setActionMessage({
              type: "success",
              text: "🎉 Your scheduled upgrade has been activated!",
            });
            await fetchSubscriptionData();
          }
        }
      } catch (error) {
        console.error("Error checking pending checkout:", error);
      }
    };

    if (session?.user?.tenantId) {
      checkPendingCheckout();
    }
  }, [session?.user?.tenantId]);

  // Authentication protection
  useEffect(() => {
    if (status === "loading") return; // Still loading

    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }
  }, [status, router]);

  useEffect(() => {
    const loadData = async () => {
      try {
        if (session?.user) {
          // Use Promise.allSettled to handle individual API failures gracefully
          const results = await Promise.allSettled([
            fetchSubscriptionData(),
            fetchAvailablePlans(),
            fetchUsageData(),
            fetchSubscriptionMessage(),
          ]);

          // Log any failed API calls
          results.forEach((result, index) => {
            if (result.status === "rejected") {
              const apiNames = ["subscription", "plans", "usage", "status"];
              console.error(
                `Failed to fetch ${apiNames[index]}:`,
                result.reason
              );
            }
          });
        } else if (session === null) {
          // No session available (user not authenticated)
          // Still fetch available plans and subscription message for expired users
          const results = await Promise.allSettled([
            fetchAvailablePlans(),
            fetchSubscriptionMessage(),
          ]);

          // Log any failed API calls
          results.forEach((result, index) => {
            if (result.status === "rejected") {
              const apiNames = ["plans", "status"];
              console.error(
                `Failed to fetch ${apiNames[index]}:`,
                result.reason
              );
            }
          });
        }
        // If session is still undefined (loading), don't set loading to false yet
      } catch (error) {
        console.error("Error loading subscription data:", error);
      } finally {
        // Only set loading to false if session is not undefined (still loading)
        if (session !== undefined) {
          console.log("🔧 SUBSCRIPTION PAGE: Setting loading to false");
          setLoading(false);
        }
      }
    };

    // Only load data if session state is resolved (not undefined)
    if (session !== undefined) {
      loadData();
    }

    // Fallback: ensure loading is set to false after a timeout
    const timeout = setTimeout(() => {
      console.log(
        "⏰ SUBSCRIPTION PAGE: Timeout reached, forcing loading to false"
      );
      setLoading(false);
    }, 10000);

    return () => clearTimeout(timeout);
  }, [session]);

  const calculateUpgradeOptions = async () => {
    if (!selectedPlan || !subscription) return;

    const newPlan = availablePlans.find((p) => p.id === selectedPlan);
    if (!newPlan) return;

    // Check if this is a renewal case for expired subscription
    const now = new Date();
    const currentPeriodEnd = subscription.currentPeriodEnd
      ? new Date(subscription.currentPeriodEnd)
      : null;
    const remainingDays = currentPeriodEnd
      ? Math.ceil(
          (currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )
      : 0;
    const isExpired = remainingDays <= 0;
    const isSamePlan = newPlan.id === subscription.plan.id;

    // For same plan selection
    if (isSamePlan) {
      if (isExpired) {
        // Expired subscription renewal - show renewal calculation
        const renewalPrice = parseFloat(String(newPlan.price));
        setUpgradeCalculation({
          currentPlan: subscription.plan,
          newPlan: newPlan,
          remainingDays: 0,
          unusedCurrentValue: 0, // No unused value for expired subscription
          newPlanProratedCost: renewalPrice, // Full price for renewal
          additionalCharge: renewalPrice, // User pays full price
          isRenewal: true,
          isExpired: true,
          currentPeriodEnd: currentPeriodEnd,
          nextBillingDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        });
        return;
      } else {
        // Active subscription - no calculation needed (will be blocked anyway)
        setUpgradeCalculation(null);
        return;
      }
    }

    // Reuse the variables already declared above
    // For plan changes (not renewals), calculate proration
    if (!currentPeriodEnd) {
      // Handle case where currentPeriodEnd is null
      setUpgradeCalculation(null);
      return;
    }

    // Clamp remaining days to 0 to avoid negative values after expiry
    const rawRemainingDays = Math.ceil(
      (currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    const clampedRemainingDays = Math.max(0, rawRemainingDays);

    // Calculate current plan daily rate
    const currentPeriodStart = new Date(subscription.currentPeriodStart);
    const totalCurrentDays = Math.ceil(
      (currentPeriodEnd.getTime() - currentPeriodStart.getTime()) /
        (1000 * 60 * 60 * 24)
    );
    const currentDailyRate = Number(subscription.plan.price) / totalCurrentDays;

    // Calculate new plan daily rate (assume 30 days for monthly)
    const newDailyRate = Number(newPlan.price) / 30;

    // Calculate unused current plan value
    const unusedCurrentValue = currentDailyRate * clampedRemainingDays;

    // Calculate new plan cost for remaining period
    const newPlanProratedCost = newDailyRate * clampedRemainingDays;

    // Calculate additional charge for immediate upgrade
    const additionalCharge = Math.max(
      0,
      newPlanProratedCost - unusedCurrentValue
    );

    setUpgradeCalculation({
      currentPlan: subscription.plan,
      newPlan: newPlan,
      remainingDays: clampedRemainingDays,
      unusedCurrentValue: unusedCurrentValue,
      newPlanProratedCost: newPlanProratedCost,
      additionalCharge: additionalCharge,
      currentPeriodEnd: currentPeriodEnd,
      nextBillingDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    });
  };

  const fetchSubscriptionMessage = async () => {
    try {
      const response = await fetch("/api/subscription/status");
      if (response.ok) {
        const data = await response.json();
        setSubscriptionMessage(data.message);
      }
    } catch (error) {
      console.error("Error fetching subscription message:", error);
    }
  };

  const fetchSubscriptionData = async () => {
    try {
      const response = await fetch("/api/subscription");
      if (response.ok) {
        const data = await response.json();
        setSubscription(data);
      } else {
        console.error(
          "Failed to fetch subscription data:",
          response.status,
          response.statusText
        );
      }
    } catch (error) {
      console.error("Error fetching subscription:", error);
    }
  };

  const fetchAvailablePlans = async () => {
    try {
      const response = await fetch("/api/subscription/plans");
      if (response.ok) {
        const data = await response.json();
        setAvailablePlans(data);
      } else {
        console.error(
          "Failed to fetch plans:",
          response.status,
          response.statusText
        );
      }
    } catch (error) {
      console.error("Error fetching plans:", error);
    }
  };

  const fetchUsageData = async () => {
    try {
      const response = await fetch("/api/subscription/usage");
      if (response.ok) {
        const data = await response.json();
        setUsage(data);
      } else {
        console.error(
          "Failed to fetch usage data:",
          response.status,
          response.statusText
        );
      }
    } catch (error) {
      console.error("Error fetching usage:", error);
    }
  };

  const handleUpgrade = async () => {
    if (!selectedPlan) return;

    try {
      // Determine selected plan details and compare price
      const chosenPlan = availablePlans.find((p) => p.id === selectedPlan);
      if (!chosenPlan || !subscription) return;

      // Check if user can select this plan based on subscription status
      const now = new Date();
      const currentPeriodEnd = subscription.currentPeriodEnd
        ? new Date(subscription.currentPeriodEnd)
        : null;
      const remainingDays = currentPeriodEnd
        ? Math.ceil(
            (currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          )
        : 0;
      const isExpired = remainingDays <= 0;
      const isSamePlan = chosenPlan.id === subscription.plan.id;
      const isFreeplan =
        chosenPlan.name?.toLowerCase() === "free" ||
        chosenPlan.id === "free-plan";

      // Business logic for plan selection
      if (!isExpired && isSamePlan) {
        // Active subscription: cannot renew to same plan
        setActionMessage({
          type: "error",
          text: `You are already on the ${subscription.plan.name} plan. You can upgrade or downgrade to other plans, but cannot renew the same plan until it expires.`,
        });
        return;
      }

      if (isFreeplan) {
        // Never allow selection of Free plan through this interface
        setActionMessage({
          type: "error",
          text: "Free plan selection is not available through this interface.",
        });
        return;
      }

      // If expired and same plan: this is a renewal (allowed)
      // If expired and different plan: this is a plan change (allowed)
      // If active and different plan: this is an upgrade/downgrade (allowed)

      const currentPrice = parseFloat(String(subscription.plan.price));
      const newPrice = parseFloat(String(chosenPlan.price));
      const isUpgrade = newPrice > currentPrice;
      const isRenewal = isSamePlan && isExpired;

      // Route renewals and upgrades to the upgrade endpoint (requires payment)
      if (isUpgrade || isRenewal) {
        // Use upgrade endpoint for upgrades and renewals (will redirect to checkout)
        const upgradePayload = {
          planId: selectedPlan,
          upgradeOption: "immediate",
          calculatedAmount: upgradeCalculation
            ? Math.round(upgradeCalculation.additionalCharge)
            : newPrice,
        };

        const response = await fetch("/api/subscription/upgrade", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(upgradePayload),
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          setActionMessage({
            type: "error",
            text: data?.error || "Failed to start upgrade.",
          });
          return;
        }

        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
          return;
        }

        // No checkout URL returned; refresh and close modal
        await fetchSubscriptionData();
        setShowUpgradeModal(false);
        setActionMessage({ type: "success", text: "Upgrade initialized." });
        return;
      }

      // Downgrade or lateral change (not renewal): call change-plan endpoint
      const response = await fetch("/api/subscription/change-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscriptionId: subscription.id,
          newPlanId: selectedPlan,
          effectiveDate: "immediate",
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setActionMessage({
          type: "error",
          text: data?.error || "Failed to change plan.",
        });
        return;
      }

      if (data?.subscription) {
        setSubscription(data.subscription);
      } else {
        await fetchSubscriptionData();
      }
      setShowUpgradeModal(false);
      setActionMessage({
        type: "success",
        text: data?.message || "Plan updated successfully.",
      });
    } catch (error) {
      console.error("Error upgrading subscription:", error);
      setActionMessage({
        type: "error",
        text: "Unexpected error. Please try again.",
      });
    }
  };

  const handleCancelSubscription = async () => {
    if (
      !confirm(
        "Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your current billing period."
      )
    ) {
      return;
    }

    try {
      const response = await fetch("/api/subscription/cancel", {
        method: "POST",
      });

      if (response.ok) {
        await fetchSubscriptionData();
      }
    } catch (error) {
      console.error("Error canceling subscription:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "text-green-600 bg-green-100";
      case "TRIALING":
        return "text-blue-600 bg-blue-100";
      case "PAST_DUE":
        return "text-yellow-600 bg-yellow-100";
      case "CANCELLED":
        return "text-red-600 bg-red-100";
      case "EXPIRED":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getUsagePercentage = (current: number, max: number | null) => {
    if (max === null) return 0; // Unlimited
    return Math.min((current / max) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 75) return "bg-yellow-500";
    return "bg-green-500";
  };

  // Show loading spinner while checking authentication
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  // Redirect will happen in useEffect, but return null to prevent flash
  if (status === "unauthenticated") {
    return null;
  }

  if (loading) {
    console.log("🔄 SUBSCRIPTION PAGE: Still loading...", { session, loading });
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  console.log("✅ SUBSCRIPTION PAGE: Rendering page", {
    session: !!session,
    loading,
    availablePlans: availablePlans.length,
    subscription: !!subscription,
    isExpired,
    hasError,
    showUpgradeModal,
    subscriptionMessage,
  });

  // DEBUG: Log subscription object structure to find object rendering issues
  if (subscription) {
    console.log("🔍 DEBUG: Subscription object:", {
      id: subscription.id,
      status: typeof subscription.status,
      statusValue: subscription.status,
      planName: typeof subscription.plan?.name,
      planNameValue: subscription.plan?.name,
      planPrice: typeof subscription.plan?.price,
      planPriceValue: subscription.plan?.price,
      currentPeriodStart: typeof subscription.currentPeriodStart,
      currentPeriodEnd: typeof subscription.currentPeriodEnd,
    });
  }

  // DEBUG: Log upgradeCalculation if it exists
  if (upgradeCalculation) {
    console.log("🔍 DEBUG: UpgradeCalculation object:", {
      hasNewPlan: !!upgradeCalculation.newPlan,
      hasCurrentPlan: !!upgradeCalculation.currentPlan,
      newPlanName: typeof upgradeCalculation.newPlan?.name,
      newPlanPrice: typeof upgradeCalculation.newPlan?.price,
      additionalCharge: typeof upgradeCalculation.additionalCharge,
      nextBillingDate: typeof upgradeCalculation.nextBillingDate,
    });
  }

  // DEBUG: Wrap return in try-catch to isolate object rendering
  try {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Home Page Link with Logo */}
          <div className="mb-6">
            <a
              href="/dashboard"
              className="inline-flex items-center space-x-3 text-gray-700 hover:text-amber-600 transition-colors duration-200"
            >
              <img
                src="/logo-polos.png"
                alt="Coffee Logica Logo"
                width={80}
                height={80}
              />
              <span className="text-xl font-semibold">Coffee Logica</span>
            </a>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Subscription Management
            </h1>
            <p className="mt-2 text-gray-600">
              Manage your subscription plan and monitor usage
            </p>
          </div>

          {/* Expired Subscription Alert */}
          {(isExpired || hasError || subscriptionMessage) && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-600 mr-3" />
                <div>
                  <h3 className="text-sm font-medium text-red-800">
                    {isExpired
                      ? "Subscription Expired"
                      : hasError
                      ? "Subscription Validation Error"
                      : "Subscription Issue"}
                  </h3>
                  <p className="mt-1 text-sm text-red-700">
                    {isExpired
                      ? "Your subscription has expired. Please renew to continue using the service."
                      : hasError
                      ? "There was an error validating your subscription. Please contact support if this persists."
                      : subscriptionMessage}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Feedback (hidden while modal open; shown on main page) */}
          {actionMessage && !showUpgradeModal && (
            <div
              className={`${
                actionMessage.type === "success"
                  ? "bg-green-50 border-green-200"
                  : "bg-red-50 border-red-200"
              } border rounded-lg p-4 mb-6`}
            >
              <div className="flex items-center">
                {actionMessage.type === "success" ? (
                  <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-600 mr-3" />
                )}
                <p
                  className={`text-sm ${
                    actionMessage.type === "success"
                      ? "text-green-800"
                      : "text-red-800"
                  }`}
                >
                  {actionMessage.text}
                </p>
              </div>
            </div>
          )}

          {/* Current Subscription */}
          {subscription && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">
                  Current Subscription
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <div className="flex items-center space-x-3">
                      <CreditCard className="h-8 w-8 text-amber-600" />
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">
                          {subscription.plan.name}
                        </h3>
                        <p className="text-gray-600">
                          Rp{" "}
                          {parseFloat(
                            String(subscription.plan.price)
                          ).toLocaleString()}
                          /{subscription.plan.interval.toLowerCase()}
                        </p>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                      {subscription.plan.description}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Status
                    </label>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                        subscription.status
                      )}`}
                    >
                      {subscription.status}
                    </span>
                    {subscription.cancelAtPeriodEnd &&
                      subscription.currentPeriodEnd && (
                        <p className="mt-2 text-sm text-red-600 flex items-center">
                          <AlertTriangle className="h-4 w-4 mr-1" />
                          Cancels on {formatDate(subscription.currentPeriodEnd)}
                        </p>
                      )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Billing Period
                    </label>
                    <p className="text-sm text-gray-900">
                      {formatDate(subscription.currentPeriodStart)} -{" "}
                      {formatDate(subscription.currentPeriodEnd)}
                    </p>
                    <div className="mt-4 space-y-2">
                      {!subscription.cancelAtPeriodEnd ? (
                        <>
                          <button
                            onClick={() => {
                              console.log("🔘 UPGRADE BUTTON CLICKED");
                              setShowUpgradeModal(true);
                            }}
                            className="w-full px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 text-sm font-medium cursor-pointer"
                          >
                            Upgrade Plan
                          </button>
                          {subscription.plan?.id !== "free-plan" &&
                            (subscription.plan?.name?.toLowerCase() || "") !==
                              "free" && (
                              <button
                                onClick={handleCancelSubscription}
                                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium"
                              >
                                Cancel Subscription
                              </button>
                            )}
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            console.log("🔘 REACTIVATE BUTTON CLICKED");
                            setShowUpgradeModal(true);
                          }}
                          className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
                        >
                          Reactivate Subscription
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Usage Statistics */}
          {usage && subscription && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">
                  Usage Statistics
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Users */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Users className="h-5 w-5 text-gray-600" />
                        <span className="text-sm font-medium text-gray-900">
                          Users
                        </span>
                      </div>
                      <span className="text-sm text-gray-600">
                        {usage.users} / {subscription.plan.maxUsers || "∞"}
                      </span>
                    </div>
                    {subscription.plan.maxUsers && (
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${getUsageColor(
                            getUsagePercentage(
                              usage.users,
                              subscription.plan.maxUsers
                            )
                          )}`}
                          style={{
                            width: `${getUsagePercentage(
                              usage.users,
                              subscription.plan.maxUsers
                            )}%`,
                          }}
                        ></div>
                      </div>
                    )}
                  </div>

                  {/* Ingredients */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Package className="h-5 w-5 text-gray-600" />
                        <span className="text-sm font-medium text-gray-900">
                          Ingredients
                        </span>
                      </div>
                      <span className="text-sm text-gray-600">
                        {usage.ingredients} /{" "}
                        {subscription.plan.maxIngredients || "∞"}
                      </span>
                    </div>
                    {subscription.plan.maxIngredients && (
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${getUsageColor(
                            getUsagePercentage(
                              usage.ingredients,
                              subscription.plan.maxIngredients
                            )
                          )}`}
                          style={{
                            width: `${getUsagePercentage(
                              usage.ingredients,
                              subscription.plan.maxIngredients
                            )}%`,
                          }}
                        ></div>
                      </div>
                    )}
                  </div>

                  {/* Batches */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <BarChart3 className="h-5 w-5 text-gray-600" />
                        <span className="text-sm font-medium text-gray-900">
                          Batches
                        </span>
                      </div>
                      <span className="text-sm text-gray-600">
                        {usage.batches} / {subscription.plan.maxBatches || "∞"}
                      </span>
                    </div>
                    {subscription.plan.maxBatches && (
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${getUsageColor(
                            getUsagePercentage(
                              usage.batches,
                              subscription.plan.maxBatches
                            )
                          )}`}
                          style={{
                            width: `${getUsagePercentage(
                              usage.batches,
                              subscription.plan.maxBatches
                            )}%`,
                          }}
                        ></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Plan Features */}
          {subscription && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">
                  Plan Features
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.isArray(subscription.plan.features)
                    ? // Handle array format
                      subscription.plan.features.map((feature, index) => (
                        <div
                          key={index}
                          className="flex items-center space-x-2"
                        >
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <span className="text-sm text-gray-900">
                            {feature}
                          </span>
                        </div>
                      ))
                    : // Handle object format
                      Object.entries(subscription.plan.features).map(
                        ([feature, enabled]) => (
                          <div
                            key={feature}
                            className="flex items-center space-x-2"
                          >
                            {enabled ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-gray-400" />
                            )}
                            <span
                              className={`text-sm ${
                                enabled ? "text-gray-900" : "text-gray-400"
                              }`}
                            >
                              {feature
                                .replace(/([A-Z])/g, " $1")
                                .replace(/^./, (str) => str.toUpperCase())}
                            </span>
                          </div>
                        )
                      )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Upgrade Modal - TEMPORARILY DISABLED FOR DEBUGGING */}
        {false && showUpgradeModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Choose a Plan
                </h3>
                {/* Modal-specific feedback */}
                {actionMessage && (
                  <div
                    className={`${
                      actionMessage.type === "success"
                        ? "bg-green-50 border-green-200"
                        : "bg-red-50 border-red-200"
                    } border rounded-lg p-3 mb-4`}
                  >
                    <div className="flex items-center">
                      {actionMessage.type === "success" ? (
                        <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                      )}
                      <p
                        className={`text-sm ${
                          actionMessage.type === "success"
                            ? "text-green-800"
                            : "text-red-800"
                        }`}
                      >
                        {actionMessage.text}
                      </p>
                    </div>
                  </div>
                )}
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {availablePlans.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No plans available
                    </div>
                  ) : (
                    availablePlans.map((plan) => (
                      <div
                        key={plan.id}
                        className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                          selectedPlan === plan.id
                            ? "border-amber-500 bg-amber-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                        onClick={() => setSelectedPlan(plan.id)}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-lg font-medium text-gray-900">
                              {plan.name}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">
                              {plan.description}
                            </p>
                            <div className="mt-2 text-sm text-gray-500">
                              <p>Users: {plan.maxUsers || "Unlimited"}</p>
                              <p>
                                Ingredients:{" "}
                                {plan.maxIngredients || "Unlimited"}
                              </p>
                              <p>Batches: {plan.maxBatches || "Unlimited"}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-gray-900">
                              Rp{" "}
                              {parseFloat(String(plan.price)).toLocaleString()}
                            </p>
                            <p className="text-sm text-gray-600">
                              /{plan.interval.toLowerCase()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {/* Enhanced Upgrade Options */}
                {selectedPlan &&
                  upgradeCalculation &&
                  upgradeCalculation.newPlan &&
                  upgradeCalculation.currentPlan && (
                    <div className="mt-6 border-t pt-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-4">
                        Choose when to upgrade:
                      </h4>

                      <div className="space-y-4">
                        {/* Immediate Upgrade Option */}
                        <div className="flex items-start space-x-3 p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
                          <div className="text-blue-600 mt-1">✅</div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div className="font-medium text-gray-900">
                                🚀 Upgrade Now
                              </div>
                              <div className="text-lg font-bold text-amber-600">
                                {(upgradeCalculation.additionalCharge || 0) > 0
                                  ? `Rp ${Math.round(
                                      upgradeCalculation.additionalCharge || 0
                                    ).toLocaleString()}`
                                  : "Free"}
                              </div>
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              Get {upgradeCalculation.newPlan.name} features
                              immediately
                            </div>
                            <div className="text-xs text-gray-500 mt-2 space-y-1">
                              <div>
                                • Unused{" "}
                                {upgradeCalculation.currentPlan.name ||
                                  "Current"}{" "}
                                value: Rp{" "}
                                {Math.round(
                                  upgradeCalculation.unusedCurrentValue || 0
                                ).toLocaleString()}
                              </div>
                              <div>
                                • {upgradeCalculation.newPlan.name || "New"}{" "}
                                cost for {upgradeCalculation.remainingDays || 0}{" "}
                                days: Rp{" "}
                                {Math.round(
                                  upgradeCalculation.newPlanProratedCost || 0
                                ).toLocaleString()}
                              </div>
                              <div>
                                • Next billing: Rp{" "}
                                {parseFloat(
                                  String(upgradeCalculation.newPlan.price)
                                ).toLocaleString()}{" "}
                                on{" "}
                                {formatDate(upgradeCalculation.nextBillingDate)}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Fair Pricing Information */}
                        <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
                          <div className="flex items-start space-x-3">
                            <div className="text-blue-600 mt-0.5">💡</div>
                            <div className="flex-1">
                              <div className="font-medium text-blue-900">
                                Fair Pricing Guarantee
                              </div>
                              <div className="text-sm text-blue-700 mt-1">
                                We calculate the exact value of your unused{" "}
                                {upgradeCalculation.currentPlan.name ||
                                  "current"}{" "}
                                time and only charge the difference. You never
                                lose money when upgrading!
                              </div>
                              <div className="text-xs text-blue-600 mt-2">
                                • Unused time value: Rp{" "}
                                {Math.round(
                                  upgradeCalculation.unusedCurrentValue || 0
                                ).toLocaleString()}
                                • {upgradeCalculation.newPlan.name || "New"}{" "}
                                cost for remaining period: Rp{" "}
                                {Math.round(
                                  upgradeCalculation.newPlanProratedCost || 0
                                ).toLocaleString()}
                                • You only pay the difference: Rp{" "}
                                {Math.round(
                                  upgradeCalculation.additionalCharge || 0
                                ).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Summary */}
                      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="text-sm text-green-800">
                          <strong>✅ Ready to Upgrade:</strong> Pay{" "}
                          {(upgradeCalculation.additionalCharge || 0) > 0
                            ? `Rp ${Math.round(
                                upgradeCalculation.additionalCharge || 0
                              ).toLocaleString()}`
                            : "nothing"}{" "}
                          now for immediate access to{" "}
                          {upgradeCalculation.newPlan.name || "new"} features.
                          Your next billing will be Rp{" "}
                          {parseFloat(
                            String(upgradeCalculation.newPlan.price || 0)
                          ).toLocaleString()}{" "}
                          on {formatDate(upgradeCalculation.nextBillingDate)}.
                        </div>
                      </div>
                    </div>
                  )}
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowUpgradeModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpgrade}
                    disabled={!selectedPlan}
                    className="px-4 py-2 text-sm font-medium text-white bg-amber-600 border border-transparent rounded-md hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {subscription?.cancelAtPeriodEnd ? "Reactivate" : "Upgrade"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error("🚨 DEBUG: Object rendering error caught:", error);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-red-600 mb-4">
            Rendering Error
          </h1>
          <p className="text-gray-600">Check console for details</p>
        </div>
      </div>
    );
  }
}

export default function SubscriptionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
        </div>
      }
    >
      <SubscriptionContent />
    </Suspense>
  );
}
